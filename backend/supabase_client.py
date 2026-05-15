"""Thin async client around the Supabase REST (PostgREST) API.

We use the service-role secret key so RLS is bypassed and the backend can
freely read/write all rows. This lives behind the existing /api/* endpoints —
no client ever sees the secret key.
"""
from __future__ import annotations

import os
from typing import Any, Optional

import httpx

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_SECRET = os.environ["SUPABASE_SECRET"]

_REST_BASE = f"{SUPABASE_URL}/rest/v1"
_DEFAULT_HEADERS = {
    "apikey": SUPABASE_SECRET,
    "Authorization": f"Bearer {SUPABASE_SECRET}",
    "Content-Type": "application/json",
}


class SupabaseError(RuntimeError):
    def __init__(self, status: int, body: Any):
        super().__init__(f"Supabase {status}: {body}")
        self.status = status
        self.body = body


class SupabaseClient:
    def __init__(self) -> None:
        self._client = httpx.AsyncClient(
            base_url=_REST_BASE,
            headers=_DEFAULT_HEADERS,
            timeout=15.0,
        )

    async def close(self) -> None:
        await self._client.aclose()

    async def _request(
        self,
        method: str,
        table: str,
        *,
        params: Optional[dict] = None,
        json: Any = None,
        extra_headers: Optional[dict] = None,
    ) -> Any:
        headers = dict(extra_headers or {})
        resp = await self._client.request(
            method,
            f"/{table}",
            params=params,
            json=json,
            headers=headers,
        )
        if resp.status_code >= 400:
            try:
                body = resp.json()
            except Exception:
                body = resp.text
            raise SupabaseError(resp.status_code, body)
        if resp.status_code == 204 or not resp.content:
            return None
        return resp.json()

    # ---- High level helpers ----
    async def select(
        self,
        table: str,
        *,
        eq: Optional[dict] = None,
        select: str = "*",
        order: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> list[dict]:
        params: dict[str, Any] = {"select": select}
        if eq:
            for k, v in eq.items():
                params[k] = f"eq.{v}"
        if order:
            params["order"] = order
        if limit:
            params["limit"] = str(limit)
        data = await self._request("GET", table, params=params)
        return data or []

    async def first(self, table: str, **kwargs) -> Optional[dict]:
        rows = await self.select(table, limit=1, **kwargs)
        return rows[0] if rows else None

    async def insert(self, table: str, row: dict) -> dict:
        data = await self._request(
            "POST", table, json=row, extra_headers={"Prefer": "return=representation"}
        )
        return data[0] if isinstance(data, list) else data

    async def upsert(self, table: str, row: dict, *, on_conflict: str) -> dict:
        data = await self._request(
            "POST",
            table,
            json=row,
            params={"on_conflict": on_conflict},
            extra_headers={
                "Prefer": "resolution=merge-duplicates,return=representation",
            },
        )
        return data[0] if isinstance(data, list) else data

    async def update(self, table: str, eq: dict, patch: dict) -> dict | None:
        params: dict[str, Any] = {}
        for k, v in eq.items():
            params[k] = f"eq.{v}"
        data = await self._request(
            "PATCH",
            table,
            json=patch,
            params=params,
            extra_headers={"Prefer": "return=representation"},
        )
        if isinstance(data, list) and data:
            return data[0]
        return None

    async def delete(self, table: str, eq: dict) -> None:
        params: dict[str, Any] = {}
        for k, v in eq.items():
            params[k] = f"eq.{v}"
        await self._request("DELETE", table, params=params)


supabase = SupabaseClient()

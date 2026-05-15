"""Shared fixtures for backend tests."""
import os
import uuid
import asyncio
from datetime import datetime, timezone, timedelta
import pytest
import requests
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/") if os.environ.get("EXPO_PUBLIC_BACKEND_URL") else None
if not BASE_URL:
    # Read from frontend env as fallback
    from pathlib import Path
    env_path = Path("/app/frontend/.env")
    for line in env_path.read_text().splitlines():
        if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
            break

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]


def _seed_user_session_sync(email: str, name: str = "Test Hero"):
    async def _seed():
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        existing = await db.users.find_one({"email": email}, {"_id": 0})
        if existing:
            user_id = existing["user_id"]
        else:
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            await db.users.insert_one({
                "user_id": user_id,
                "email": email,
                "name": name,
                "picture": None,
                "created_at": datetime.now(timezone.utc),
                "last_login": datetime.now(timezone.utc),
            })
        # Fresh game state
        await db.game_states.update_one(
            {"user_id": user_id},
            {"$set": {
                "user_id": user_id,
                "name": name,
                "picture": None,
                "ki": 0.0,
                "total_ki_earned": 0.0,
                "tap_count": 0,
                "character_level": 1,
                "buildings": {"training_dojo": 0, "spirit_generator": 0, "crystal_mine": 0, "energy_reactor": 0, "power_temple": 0},
                "last_sync": datetime.now(timezone.utc),
            }},
            upsert=True,
        )
        token = f"test_token_{uuid.uuid4().hex}"
        await db.user_sessions.update_one(
            {"session_token": token},
            {"$set": {
                "session_token": token,
                "user_id": user_id,
                "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
                "created_at": datetime.now(timezone.utc),
            }},
            upsert=True,
        )
        client.close()
        return user_id, token
    return asyncio.get_event_loop().run_until_complete(_seed()) if False else asyncio.run(_seed())


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def seeded_user():
    """Seed a fresh test user and session token."""
    user_id, token = _seed_user_session_sync("TEST_pytester@example.com", "TEST Hero")
    return {"user_id": user_id, "token": token}


@pytest.fixture(scope="session")
def auth_headers(seeded_user):
    return {"Authorization": f"Bearer {seeded_user['token']}", "Content-Type": "application/json"}


@pytest.fixture
def fresh_user():
    """Seed a brand new user per test (for tests that need isolation)."""
    email = f"TEST_{uuid.uuid4().hex[:8]}@example.com"
    user_id, token = _seed_user_session_sync(email)
    return {"user_id": user_id, "token": token, "email": email, "headers": {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}}


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s

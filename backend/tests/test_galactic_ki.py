"""Galactic Ki Empire — comprehensive backend test suite."""
import math
import time
import uuid
from datetime import datetime, timezone, timedelta
import asyncio

import pytest
import requests
from motor.motor_asyncio import AsyncIOMotorClient

import os
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

BUILDING_IDS = ["training_dojo", "spirit_generator", "crystal_mine", "energy_reactor", "power_temple"]
BASE_COSTS = {"training_dojo": 15, "spirit_generator": 120, "crystal_mine": 1500,
              "energy_reactor": 20000, "power_temple": 250000}
BASE_CPS = {"training_dojo": 0.2, "spirit_generator": 1.5, "crystal_mine": 12,
            "energy_reactor": 90, "power_temple": 750}


# -------------------- Health --------------------
class TestHealth:
    def test_root_health(self, api, base_url):
        r = api.get(f"{base_url}/api/")
        assert r.status_code == 200
        data = r.json()
        assert data.get("buildings") == 5
        assert "message" in data


# -------------------- Auth --------------------
class TestAuth:
    def test_auth_me_with_valid_token(self, api, base_url, auth_headers, seeded_user):
        r = api.get(f"{base_url}/api/auth/me", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["user_id"] == seeded_user["user_id"]
        assert data["email"] == "TEST_pytester@example.com"
        assert "_id" not in data

    def test_auth_me_without_token(self, api, base_url):
        r = api.get(f"{base_url}/api/auth/me")
        assert r.status_code == 401

    def test_auth_me_with_invalid_token(self, api, base_url):
        r = api.get(f"{base_url}/api/auth/me", headers={"Authorization": "Bearer not_a_real_token_xyz"})
        assert r.status_code == 401

    def test_auth_me_with_malformed_header(self, api, base_url):
        r = api.get(f"{base_url}/api/auth/me", headers={"Authorization": "NotBearer abc"})
        assert r.status_code == 401

    def test_logout_deletes_session(self, api, base_url, fresh_user):
        # logout
        r = api.post(f"{base_url}/api/auth/logout", headers=fresh_user["headers"])
        assert r.status_code == 200
        assert r.json().get("ok") is True
        # subsequent /auth/me should 401
        r2 = api.get(f"{base_url}/api/auth/me", headers=fresh_user["headers"])
        assert r2.status_code == 401


# -------------------- Bearer enforcement --------------------
class TestBearerEnforcement:
    @pytest.mark.parametrize("method,path,body", [
        ("get", "/api/game/state", None),
        ("post", "/api/game/tap", {"taps": 1}),
        ("post", "/api/game/buy-building", {"building_id": "training_dojo"}),
        ("get", "/api/game/leaderboard", None),
    ])
    def test_endpoints_require_auth(self, api, base_url, method, path, body):
        fn = getattr(api, method)
        kwargs = {}
        if body is not None:
            kwargs["json"] = body
        r = fn(f"{base_url}{path}", **kwargs)
        assert r.status_code == 401, f"{method.upper()} {path} should require auth, got {r.status_code}"


# -------------------- Game State --------------------
class TestGameState:
    def test_initial_state_structure(self, api, base_url, fresh_user):
        r = api.get(f"{base_url}/api/game/state", headers=fresh_user["headers"])
        assert r.status_code == 200
        d = r.json()
        # No _id leakage
        assert "_id" not in d
        # All 5 buildings present
        bids = [b["id"] for b in d["buildings"]]
        assert sorted(bids) == sorted(BUILDING_IDS)
        # Required fields
        for f in ["user_id", "ki", "total_ki_earned", "tap_count", "character_level",
                  "tap_power", "ki_per_sec", "next_level_xp", "power_level", "last_sync"]:
            assert f in d, f"missing {f}"
        # Initial values
        assert d["character_level"] == 1
        assert d["tap_power"] == 1.0
        assert d["ki_per_sec"] == 0
        assert d["next_level_xp"] == 1000
        # Each building: level 0, cps 0, next_cost = base_cost (since level=0 → 1500 * 1.15^0 = base)
        for b in d["buildings"]:
            assert b["level"] == 0
            assert b["cps"] == 0.0
            assert b["next_cost"] == BASE_COSTS[b["id"]]


# -------------------- Tap --------------------
class TestTap:
    def test_tap_single(self, api, base_url, fresh_user):
        r = api.post(f"{base_url}/api/game/tap", headers=fresh_user["headers"], json={"taps": 1})
        assert r.status_code == 200
        d = r.json()
        assert d["ki"] == 1.0
        assert d["total_ki_earned"] == 1.0
        assert d["tap_count"] == 1

    def test_tap_multiple(self, api, base_url, fresh_user):
        r = api.post(f"{base_url}/api/game/tap", headers=fresh_user["headers"], json={"taps": 10})
        assert r.status_code == 200
        d = r.json()
        # tap_power=1 at level 1, so 10 * 1 = 10
        assert d["ki"] == 10.0
        assert d["tap_count"] == 10

    def test_tap_clamp_max(self, api, base_url, fresh_user):
        r = api.post(f"{base_url}/api/game/tap", headers=fresh_user["headers"], json={"taps": 5000})
        assert r.status_code == 200
        d = r.json()
        # clamped to 200
        assert d["tap_count"] == 200
        assert d["ki"] == 200.0

    def test_tap_clamp_min(self, api, base_url, fresh_user):
        r = api.post(f"{base_url}/api/game/tap", headers=fresh_user["headers"], json={"taps": 0})
        assert r.status_code == 200
        d = r.json()
        # clamped to 1
        assert d["tap_count"] == 1


# -------------------- Buildings --------------------
class TestBuildings:
    def test_buy_insufficient_ki(self, api, base_url, fresh_user):
        r = api.post(f"{base_url}/api/game/buy-building", headers=fresh_user["headers"],
                     json={"building_id": "training_dojo", "quantity": 1})
        assert r.status_code == 400
        assert "ki" in r.json().get("detail", "").lower()

    def test_buy_unknown_building(self, api, base_url, fresh_user):
        r = api.post(f"{base_url}/api/game/buy-building", headers=fresh_user["headers"],
                     json={"building_id": "nonexistent", "quantity": 1})
        assert r.status_code == 400

    def test_buy_single_training_dojo(self, api, base_url, fresh_user):
        # Earn 50 ki by tapping 50 times (50 * 1.0 tap_power = 50 ki)
        api.post(f"{base_url}/api/game/tap", headers=fresh_user["headers"], json={"taps": 50})
        r = api.post(f"{base_url}/api/game/buy-building", headers=fresh_user["headers"],
                     json={"building_id": "training_dojo", "quantity": 1})
        assert r.status_code == 200
        d = r.json()
        assert d["purchased"] == 1
        assert d["spent"] == 15.0  # base_cost
        assert d["ki"] == 35.0
        td = next(b for b in d["buildings"] if b["id"] == "training_dojo")
        assert td["level"] == 1
        assert td["cps"] == 0.2  # base_cps * level 1
        # next cost = floor(15 * 1.15^1) = floor(17.25) = 17
        assert td["next_cost"] == 17
        assert d["ki_per_sec"] == 0.2

    def test_buy_bulk_quantity(self, api, base_url, fresh_user):
        # Tap enough to buy several. cost levels: 15, 17, 19, 22, 26 => sum 99
        api.post(f"{base_url}/api/game/tap", headers=fresh_user["headers"], json={"taps": 100})
        api.post(f"{base_url}/api/game/tap", headers=fresh_user["headers"], json={"taps": 100})  # 200 ki
        r = api.post(f"{base_url}/api/game/buy-building", headers=fresh_user["headers"],
                     json={"building_id": "training_dojo", "quantity": 5})
        assert r.status_code == 200
        d = r.json()
        assert d["purchased"] == 5
        # 15+17+19+22+26 = 99
        assert d["spent"] == 99.0
        td = next(b for b in d["buildings"] if b["id"] == "training_dojo")
        assert td["level"] == 5

    def test_buy_partial_bulk(self, api, base_url, fresh_user):
        # 30 ki: can buy 1 (15) + 1 (17) = 32 > 30, so only 1
        api.post(f"{base_url}/api/game/tap", headers=fresh_user["headers"], json={"taps": 30})
        r = api.post(f"{base_url}/api/game/buy-building", headers=fresh_user["headers"],
                     json={"building_id": "training_dojo", "quantity": 10})
        assert r.status_code == 200
        d = r.json()
        # Should buy 1 at 15 ki since 15 + 17 = 32 > 30
        assert d["purchased"] == 1
        assert d["spent"] == 15

    def test_cost_scales_1_15x(self, api, base_url, fresh_user):
        """Verify 1.15x scaling matches floor(base * 1.15^level)."""
        api.post(f"{base_url}/api/game/tap", headers=fresh_user["headers"], json={"taps": 100})
        api.post(f"{base_url}/api/game/tap", headers=fresh_user["headers"], json={"taps": 100})
        r = api.post(f"{base_url}/api/game/buy-building", headers=fresh_user["headers"],
                     json={"building_id": "training_dojo", "quantity": 3})
        d = r.json()
        td = next(b for b in d["buildings"] if b["id"] == "training_dojo")
        # Next cost after level 3 = floor(15 * 1.15^3) = floor(22.81) = 22
        expected = math.floor(15 * (1.15 ** 3))
        assert td["next_cost"] == expected


# -------------------- Character Level --------------------
class TestCharacterLevel:
    def test_level_up_at_1000_ki(self, api, base_url, fresh_user):
        """LEVEL_BASE_XP=1000 → reach level 2 at 1000 total ki."""
        # Tap 5x with taps=200 to get 1000 ki
        for _ in range(5):
            api.post(f"{base_url}/api/game/tap", headers=fresh_user["headers"], json={"taps": 200})
        r = api.get(f"{base_url}/api/game/state", headers=fresh_user["headers"])
        d = r.json()
        assert d["total_ki_earned"] >= 1000
        assert d["character_level"] >= 2
        # tap_power at level 2 = 1 + (2-1) * 0.5 = 1.5
        assert d["tap_power"] == 1.5
        # next_level_xp = floor(1000 * 1.5^0) = 1500 (for level 3)
        assert d["next_level_xp"] == 1500


# -------------------- Idle Earnings --------------------
class TestIdleEarnings:
    def test_idle_earnings_credited(self, api, base_url, fresh_user):
        # Buy a dojo, then manipulate last_sync to past
        api.post(f"{base_url}/api/game/tap", headers=fresh_user["headers"], json={"taps": 50})
        api.post(f"{base_url}/api/game/buy-building", headers=fresh_user["headers"],
                 json={"building_id": "training_dojo", "quantity": 1})
        # Now ki_per_sec=0.2. Set last_sync to 100 seconds ago directly in DB.
        async def patch():
            client = AsyncIOMotorClient(MONGO_URL)
            db = client[DB_NAME]
            past = datetime.now(timezone.utc) - timedelta(seconds=100)
            await db.game_states.update_one(
                {"user_id": fresh_user["user_id"]},
                {"$set": {"last_sync": past}},
            )
            client.close()
        asyncio.run(patch())
        r = api.get(f"{base_url}/api/game/state", headers=fresh_user["headers"])
        d = r.json()
        # 0.2 * 100 = 20 ki gained
        assert d["idle_seconds"] >= 99
        assert d["idle_gain"] == pytest.approx(20.0, abs=0.5)
        # Verify ki increased by ~20
        assert d["ki"] >= 35 + 19.0  # 35 leftover after buying + idle gain


# -------------------- Leaderboard --------------------
class TestLeaderboard:
    def test_leaderboard_structure(self, api, base_url, auth_headers):
        r = api.get(f"{base_url}/api/game/leaderboard", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert "top" in d and "me" in d
        assert isinstance(d["top"], list)
        assert len(d["top"]) <= 100
        # Sorted by power_level desc
        pls = [e["power_level"] for e in d["top"]]
        assert pls == sorted(pls, reverse=True)
        # No _id leak
        for e in d["top"]:
            assert "_id" not in e
            assert "rank" in e
        # me entry has rank
        if d["me"]:
            assert "rank" in d["me"]
            assert "_id" not in d["me"]


# -------------------- MongoDB _id leakage --------------------
class TestNoIdLeakage:
    def test_no_id_in_state(self, api, base_url, auth_headers):
        r = api.get(f"{base_url}/api/game/state", headers=auth_headers)
        text = r.text
        assert '"_id"' not in text

    def test_no_id_in_leaderboard(self, api, base_url, auth_headers):
        r = api.get(f"{base_url}/api/game/leaderboard", headers=auth_headers)
        assert '"_id"' not in r.text

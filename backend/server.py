"""Galactic Ki Empire — Anime MMORPG Idle Clicker Backend."""
from fastapi import FastAPI, APIRouter, HTTPException, Header, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING
import os
import uuid
import math
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Galactic Ki Empire API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Game configuration
# ---------------------------------------------------------------------------
SESSION_TTL_DAYS = 7
IDLE_EARNINGS_CAP_SECONDS = 8 * 60 * 60  # 8 hours
COST_GROWTH = 1.15
LEVEL_BASE_XP = 1000.0  # ki needed for level 2
LEVEL_GROWTH = 1.5

BUILDINGS_CATALOG = [
    {
        "id": "training_dojo",
        "name": "Training Dojo",
        "description": "Disciples train and channel ki for you.",
        "base_cost": 15,
        "base_cps": 0.2,
        "emoji": "🥋",
    },
    {
        "id": "spirit_generator",
        "name": "Spirit Bomb Generator",
        "description": "Condenses ambient energy into raw ki.",
        "base_cost": 120,
        "base_cps": 1.5,
        "emoji": "💫",
    },
    {
        "id": "crystal_mine",
        "name": "Ki Crystal Mine",
        "description": "Automated drills extract crystalized ki.",
        "base_cost": 1500,
        "base_cps": 12,
        "emoji": "💎",
    },
    {
        "id": "energy_reactor",
        "name": "Fusion Energy Reactor",
        "description": "Anime-grade reactors produce massive output.",
        "base_cost": 20000,
        "base_cps": 90,
        "emoji": "⚛️",
    },
    {
        "id": "power_temple",
        "name": "Power Temple",
        "description": "Ancient temple channels divine ki to your empire.",
        "base_cost": 250000,
        "base_cps": 750,
        "emoji": "⛩️",
    },
]
CATALOG_BY_ID = {b["id"]: b for b in BUILDINGS_CATALOG}


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class UserPublic(BaseModel):
    user_id: str
    name: str
    email: str
    picture: Optional[str] = None


class SessionTokenBody(BaseModel):
    session_token: str


class BuildingState(BaseModel):
    id: str
    level: int
    cps: float
    next_cost: float


class GameState(BaseModel):
    user_id: str
    name: str
    picture: Optional[str] = None
    ki: float
    total_ki_earned: float
    tap_count: int
    character_level: int
    tap_power: float
    ki_per_sec: float
    next_level_xp: float
    power_level: float
    buildings: List[BuildingState]
    last_sync: str
    idle_gain: float = 0.0
    idle_seconds: float = 0.0


class TapBody(BaseModel):
    taps: int = 1


class BuyBody(BaseModel):
    building_id: str
    quantity: int = 1


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    name: str
    picture: Optional[str] = None
    character_level: int
    power_level: float
    total_ki_earned: float


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def to_iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def parse_dt(value) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    return datetime.fromisoformat(str(value))


def building_cost(building_id: str, level: int) -> float:
    cat = CATALOG_BY_ID[building_id]
    return math.floor(cat["base_cost"] * (COST_GROWTH ** level))


def building_cps(building_id: str, level: int) -> float:
    cat = CATALOG_BY_ID[building_id]
    return round(cat["base_cps"] * level, 2)


def required_xp_for_level(level: int) -> float:
    """Total ki earned threshold required to reach `level` (level 1 = 0)."""
    if level <= 1:
        return 0.0
    return math.floor(LEVEL_BASE_XP * (LEVEL_GROWTH ** (level - 2)))


def compute_character_level(total_ki_earned: float) -> int:
    level = 1
    while total_ki_earned >= required_xp_for_level(level + 1):
        level += 1
        if level > 999:
            break
    return level


def compute_tap_power(character_level: int) -> float:
    return round(1 + (character_level - 1) * 0.5, 2)


def compute_total_cps(buildings: dict) -> float:
    total = 0.0
    for bid, level in buildings.items():
        if bid in CATALOG_BY_ID and level > 0:
            total += building_cps(bid, level)
    return round(total, 2)


def compute_power_level(state: dict) -> float:
    cps = compute_total_cps(state.get("buildings", {}))
    return round(state.get("character_level", 1) * 50 + cps * 10 + state.get("total_ki_earned", 0) * 0.01, 2)


def build_game_state_dict(state: dict, idle_gain: float = 0.0, idle_seconds: float = 0.0) -> dict:
    buildings = state.get("buildings", {})
    char_level = state.get("character_level", 1)
    next_level_xp = required_xp_for_level(char_level + 1)
    building_list = []
    for cat in BUILDINGS_CATALOG:
        bid = cat["id"]
        level = buildings.get(bid, 0)
        building_list.append({
            "id": bid,
            "level": level,
            "cps": building_cps(bid, level) if level > 0 else 0.0,
            "next_cost": building_cost(bid, level),
        })
    return {
        "user_id": state["user_id"],
        "name": state.get("name", "Hero"),
        "picture": state.get("picture"),
        "ki": round(state.get("ki", 0), 2),
        "total_ki_earned": round(state.get("total_ki_earned", 0), 2),
        "tap_count": state.get("tap_count", 0),
        "character_level": char_level,
        "tap_power": compute_tap_power(char_level),
        "ki_per_sec": compute_total_cps(buildings),
        "next_level_xp": next_level_xp,
        "power_level": compute_power_level(state),
        "buildings": building_list,
        "last_sync": to_iso(parse_dt(state["last_sync"])),
        "idle_gain": round(idle_gain, 2),
        "idle_seconds": round(idle_seconds, 1),
    }


async def apply_idle_earnings(state: dict) -> tuple[dict, float, float]:
    """Mutates state in memory: adds idle earnings since last_sync."""
    last_sync = parse_dt(state["last_sync"])
    elapsed = (now_utc() - last_sync).total_seconds()
    elapsed = max(0.0, min(elapsed, IDLE_EARNINGS_CAP_SECONDS))
    cps = compute_total_cps(state.get("buildings", {}))
    gained = round(cps * elapsed, 2)
    if gained > 0:
        state["ki"] = state.get("ki", 0) + gained
        state["total_ki_earned"] = state.get("total_ki_earned", 0) + gained
        state["character_level"] = compute_character_level(state["total_ki_earned"])
    state["last_sync"] = now_utc()
    return state, gained, elapsed


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------
async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = parse_dt(session["expires_at"])
    if expires_at < now_utc():
        await db.user_sessions.delete_one({"session_token": token})
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "Galactic Ki Empire API online", "buildings": len(BUILDINGS_CATALOG)}


@api_router.post("/auth/session")
async def auth_session(body: SessionTokenBody):
    """Exchange Emergent session_token for an app session, upsert user, init game state."""
    async with httpx.AsyncClient(timeout=15.0) as http:
        try:
            resp = await http.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": body.session_token},
            )
        except httpx.HTTPError as exc:
            logger.exception("Emergent auth call failed: %s", exc)
            raise HTTPException(status_code=502, detail="Auth provider unreachable")
    if resp.status_code != 200:
        logger.warning("Emergent auth rejected token: %s %s", resp.status_code, resp.text)
        raise HTTPException(status_code=401, detail="Invalid session token")
    data = resp.json()
    email = data.get("email")
    name = data.get("name") or (email.split("@")[0] if email else "Hero")
    picture = data.get("picture")
    session_token = data.get("session_token") or body.session_token
    if not email:
        raise HTTPException(status_code=400, detail="No email on session")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture, "last_login": now_utc()}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "created_at": now_utc(),
            "last_login": now_utc(),
        })

    # Ensure a fresh game state document exists
    game = await db.game_states.find_one({"user_id": user_id}, {"_id": 0})
    if not game:
        await db.game_states.insert_one({
            "user_id": user_id,
            "name": name,
            "picture": picture,
            "ki": 0.0,
            "total_ki_earned": 0.0,
            "tap_count": 0,
            "character_level": 1,
            "buildings": {b["id"]: 0 for b in BUILDINGS_CATALOG},
            "last_sync": now_utc(),
        })
    else:
        await db.game_states.update_one(
            {"user_id": user_id}, {"$set": {"name": name, "picture": picture}}
        )

    expires_at = now_utc() + timedelta(days=SESSION_TTL_DAYS)
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {
            "$set": {
                "session_token": session_token,
                "user_id": user_id,
                "expires_at": expires_at,
                "created_at": now_utc(),
            }
        },
        upsert=True,
    )
    return {
        "session_token": session_token,
        "user": {"user_id": user_id, "email": email, "name": name, "picture": picture},
    }


@api_router.get("/auth/me", response_model=UserPublic)
async def auth_me(authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    return UserPublic(
        user_id=user["user_id"],
        name=user["name"],
        email=user["email"],
        picture=user.get("picture"),
    )


@api_router.post("/auth/logout")
async def auth_logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}


@api_router.get("/game/state")
async def game_state(authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    state = await db.game_states.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not state:
        state = {
            "user_id": user["user_id"],
            "name": user["name"],
            "picture": user.get("picture"),
            "ki": 0.0,
            "total_ki_earned": 0.0,
            "tap_count": 0,
            "character_level": 1,
            "buildings": {b["id"]: 0 for b in BUILDINGS_CATALOG},
            "last_sync": now_utc(),
        }
        await db.game_states.insert_one(state.copy())
    state, gained, elapsed = await apply_idle_earnings(state)
    await db.game_states.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "ki": state["ki"],
            "total_ki_earned": state["total_ki_earned"],
            "character_level": state["character_level"],
            "last_sync": state["last_sync"],
        }},
    )
    return build_game_state_dict(state, gained, elapsed)


@api_router.post("/game/tap")
async def game_tap(body: TapBody, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    taps = max(1, min(int(body.taps), 200))  # anti-cheat clamp per request
    state = await db.game_states.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not state:
        raise HTTPException(status_code=404, detail="Game state missing")
    state, _, _ = await apply_idle_earnings(state)
    tap_power = compute_tap_power(state["character_level"])
    gain = round(tap_power * taps, 2)
    state["ki"] += gain
    state["total_ki_earned"] += gain
    state["tap_count"] = state.get("tap_count", 0) + taps
    state["character_level"] = compute_character_level(state["total_ki_earned"])
    await db.game_states.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "ki": state["ki"],
            "total_ki_earned": state["total_ki_earned"],
            "tap_count": state["tap_count"],
            "character_level": state["character_level"],
            "last_sync": state["last_sync"],
        }},
    )
    return build_game_state_dict(state)


@api_router.post("/game/buy-building")
async def game_buy_building(body: BuyBody, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    if body.building_id not in CATALOG_BY_ID:
        raise HTTPException(status_code=400, detail="Unknown building")
    qty = max(1, min(int(body.quantity), 25))
    state = await db.game_states.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not state:
        raise HTTPException(status_code=404, detail="Game state missing")
    state, _, _ = await apply_idle_earnings(state)
    current_level = state["buildings"].get(body.building_id, 0)
    total_cost = 0.0
    purchased = 0
    for i in range(qty):
        cost = building_cost(body.building_id, current_level + i)
        if state["ki"] < total_cost + cost:
            break
        total_cost += cost
        purchased += 1
    if purchased == 0:
        raise HTTPException(status_code=400, detail="Not enough ki")
    state["ki"] -= total_cost
    state["buildings"][body.building_id] = current_level + purchased
    await db.game_states.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "ki": state["ki"],
            "buildings": state["buildings"],
            "last_sync": state["last_sync"],
        }},
    )
    result = build_game_state_dict(state)
    result["purchased"] = purchased
    result["spent"] = round(total_cost, 2)
    return result


@api_router.get("/game/buildings/catalog")
async def buildings_catalog():
    return {"buildings": BUILDINGS_CATALOG}


@api_router.get("/game/leaderboard")
async def leaderboard(authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    cursor = db.game_states.find({}, {"_id": 0}).limit(500)
    rows: List[dict] = []
    async for doc in cursor:
        rows.append(doc)
    enriched = []
    me_entry = None
    for doc in rows:
        pl = compute_power_level(doc)
        entry = {
            "user_id": doc["user_id"],
            "name": doc.get("name", "Hero"),
            "picture": doc.get("picture"),
            "character_level": doc.get("character_level", 1),
            "power_level": pl,
            "total_ki_earned": round(doc.get("total_ki_earned", 0), 2),
        }
        enriched.append(entry)
    enriched.sort(key=lambda e: e["power_level"], reverse=True)
    top = []
    for idx, e in enumerate(enriched[:100], start=1):
        e2 = {"rank": idx, **e}
        top.append(e2)
        if e["user_id"] == user["user_id"]:
            me_entry = e2
    if me_entry is None:
        for idx, e in enumerate(enriched, start=1):
            if e["user_id"] == user["user_id"]:
                me_entry = {"rank": idx, **e}
                break
    return {"top": top, "me": me_entry, "total_players": len(enriched)}


# ---------------------------------------------------------------------------
# Startup hooks
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup_indexes():
    await db.users.create_index([("email", ASCENDING)], unique=True)
    await db.users.create_index([("user_id", ASCENDING)], unique=True)
    await db.user_sessions.create_index([("session_token", ASCENDING)], unique=True)
    await db.user_sessions.create_index([("user_id", ASCENDING)])
    await db.user_sessions.create_index([("expires_at", ASCENDING)], expireAfterSeconds=0)
    await db.game_states.create_index([("user_id", ASCENDING)], unique=True)
    await db.game_states.create_index([("total_ki_earned", DESCENDING)])


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

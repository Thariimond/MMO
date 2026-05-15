# Galactic Ki Empire — PRD

## Vision
A mobile-first anime MMORPG that fuses Cookie Clicker idle mechanics with shounen power-scaling fantasy (Dragon Ball / One Piece / Naruto vibes). Players tap a glowing ki orb to channel energy, build automated facilities, level up their commander, and compete with others on a global leaderboard. Future phases add alliances, raids, PvP, and trading.

## Phase 1 (MVP — shipped)
- Google sign-in via Emergent OAuth (mobile + web). Session token persisted in `expo-secure-store`.
- Tap-to-earn loop with optimistic UI + server validation (batched flush every 350 ms).
- 5 production buildings with exponential cost scaling (training_dojo, spirit_generator, crystal_mine, energy_reactor, power_temple).
- Idle earnings (capped 8 h) credited on next session sync, surfaced via "while you were away" banner.
- Character level auto-progression based on total ki earned. Tap power scales with level.
- Power Level metric used for global leaderboard ranking.
- Global leaderboard (top 100 + current player pin).
- Profile screen with stats grid, achievements teaser, sign out.
- "Coming Soon" Alliance tab teasing Phase 2.

## Phase 2 (next)
- Real-time alliance/guild chat (WebSockets) and shared raid bosses.
- PvP battles with risk/reward exchange.
- Player-to-player trading marketplace.
- Push notifications for raid invites and offline earnings.

## Tech stack
- Frontend: Expo SDK 54, React Native 0.81, expo-router file-based routing, react-native-reanimated for animations, expo-secure-store for token persistence, expo-haptics for tap feedback.
- Backend: FastAPI on `0.0.0.0:8001` (proxied via `/api`), Motor async MongoDB driver, httpx for Emergent OAuth verification.
- Storage: MongoDB collections — `users`, `user_sessions` (TTL index), `game_states` (one per user).
- Auth: Emergent-managed Google OAuth → app-issued bearer session token (7-day TTL).

## Key game endpoints
- `POST /api/auth/session` — exchange Emergent session for app session.
- `GET /api/auth/me` — validate token.
- `POST /api/auth/logout` — delete session.
- `GET /api/game/state` — fetch player state + idle earnings.
- `POST /api/game/tap` — batched taps.
- `POST /api/game/buy-building` — purchase / upgrade.
- `GET /api/game/leaderboard` — top 100 + current rank.

## Business angle
- **Retention loop**: idle earnings + daily login bait users back in.
- **Future monetization**: cosmetic avatars, ki multipliers, premium guild perks, ad-supported reward chests.
- **Virality**: leaderboard + alliance system makes players invite friends for shared raids.

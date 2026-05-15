// Lightweight wrapper around backend API calls. Always uses auth token.
import { getBackendUrl } from "@/src/auth/AuthContext";

export type Building = {
  id: string;
  level: number;
  cps: number;
  next_cost: number;
};

export type GameStateDTO = {
  user_id: string;
  name: string;
  picture?: string | null;
  ki: number;
  total_ki_earned: number;
  tap_count: number;
  character_level: number;
  tap_power: number;
  ki_per_sec: number;
  next_level_xp: number;
  power_level: number;
  buildings: Building[];
  last_sync: string;
  idle_gain: number;
  idle_seconds: number;
};

export type LeaderEntry = {
  rank: number;
  user_id: string;
  name: string;
  picture?: string | null;
  character_level: number;
  power_level: number;
  total_ki_earned: number;
};

export type LeaderboardDTO = {
  top: LeaderEntry[];
  me: LeaderEntry | null;
  total_players: number;
};

async function call<T>(path: string, token: string | null, options: RequestInit = {}): Promise<T> {
  const url = `${getBackendUrl()}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const resp = await fetch(url, { ...options, headers });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`API ${path} failed: ${resp.status} ${text}`);
  }
  return (await resp.json()) as T;
}

export const gameApi = {
  state: (token: string) => call<GameStateDTO>("/api/game/state", token),
  tap: (token: string, taps: number) =>
    call<GameStateDTO>("/api/game/tap", token, {
      method: "POST",
      body: JSON.stringify({ taps }),
    }),
  buy: (token: string, building_id: string, quantity = 1) =>
    call<GameStateDTO & { purchased: number; spent: number }>("/api/game/buy-building", token, {
      method: "POST",
      body: JSON.stringify({ building_id, quantity }),
    }),
  leaderboard: (token: string) => call<LeaderboardDTO>("/api/game/leaderboard", token),
};

// Centralized game state hook. Polls backend, batches taps, applies optimistic updates.
import { useCallback, useEffect, useRef, useState } from "react";
import { gameApi, GameStateDTO } from "@/src/api/game";
import { useAuth } from "@/src/auth/AuthContext";

const TAP_FLUSH_MS = 350;
const POLL_MS = 7000;

export function useGameState() {
  const { token } = useAuth();
  const [state, setState] = useState<GameStateDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pendingTapsRef = useRef(0);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncRef = useRef<number>(Date.now());
  const localRef = useRef<GameStateDTO | null>(null);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const setLocal = useCallback((next: GameStateDTO | null) => {
    localRef.current = next;
    setState(next);
  }, []);

  const refresh = useCallback(async () => {
    const t = tokenRef.current;
    if (!t) return;
    try {
      const next = await gameApi.state(t);
      setLocal(next);
      lastSyncRef.current = Date.now();
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load game");
    } finally {
      setLoading(false);
    }
  }, [setLocal]);

  // Initial load + polling
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    void refresh();
    const id = setInterval(() => {
      void refresh();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [token, refresh]);

  // Local ticker for ki/sec animation
  useEffect(() => {
    const id = setInterval(() => {
      const cur = localRef.current;
      if (!cur || cur.ki_per_sec <= 0) return;
      const dt = 0.5;
      const gain = cur.ki_per_sec * dt;
      const next = {
        ...cur,
        ki: cur.ki + gain,
        total_ki_earned: cur.total_ki_earned + gain,
      };
      setLocal(next);
    }, 500);
    return () => clearInterval(id);
  }, [setLocal]);

  const flushTaps = useCallback(async () => {
    const t = tokenRef.current;
    const taps = pendingTapsRef.current;
    if (!t || taps <= 0) return;
    pendingTapsRef.current = 0;
    flushTimerRef.current = null;
    try {
      const next = await gameApi.tap(t, taps);
      setLocal(next);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Tap sync failed");
    }
  }, [setLocal]);

  const tap = useCallback(() => {
    const cur = localRef.current;
    if (!cur) return;
    // Optimistic UI update
    const optimistic = {
      ...cur,
      ki: cur.ki + cur.tap_power,
      total_ki_earned: cur.total_ki_earned + cur.tap_power,
      tap_count: cur.tap_count + 1,
    };
    setLocal(optimistic);
    pendingTapsRef.current += 1;
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => {
      void flushTaps();
    }, TAP_FLUSH_MS);
  }, [flushTaps, setLocal]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
      }
      if (pendingTapsRef.current > 0 && tokenRef.current) {
        void gameApi.tap(tokenRef.current, pendingTapsRef.current).catch(() => {});
        pendingTapsRef.current = 0;
      }
    };
  }, []);

  const buy = useCallback(
    async (buildingId: string, quantity = 1) => {
      const t = tokenRef.current;
      if (!t) return;
      try {
        // Flush pending taps so we have correct ki on server
        if (pendingTapsRef.current > 0) await flushTaps();
        const next = await gameApi.buy(t, buildingId, quantity);
        setLocal(next);
      } catch (e: any) {
        setError(e?.message ?? "Purchase failed");
      }
    },
    [flushTaps, setLocal],
  );

  return { state, loading, error, refresh, tap, buy };
}

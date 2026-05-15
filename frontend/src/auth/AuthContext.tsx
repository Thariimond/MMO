// Auth context: provides current user, session token, login + logout helpers.
// Handles Emergent Google Auth flow on mobile + web.
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { storage } from "@/src/utils/storage";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";
const SESSION_KEY = "gki_session_token";

export type AuthUser = {
  user_id: string;
  name: string;
  email: string;
  picture?: string | null;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | null>(null);

function parseSessionIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const fragmentIdx = url.indexOf("#");
    if (fragmentIdx >= 0) {
      const frag = url.slice(fragmentIdx + 1);
      const params = new URLSearchParams(frag);
      const id = params.get("session_id");
      if (id) return id;
    }
    const queryIdx = url.indexOf("?");
    if (queryIdx >= 0) {
      const query = url.slice(queryIdx + 1).split("#")[0];
      const params = new URLSearchParams(query);
      const id = params.get("session_id");
      if (id) return id;
    }
  } catch (_e) {
    return null;
  }
  return null;
}

async function exchangeSessionToken(sessionId: string): Promise<{ token: string; user: AuthUser }> {
  // First hit Emergent session-data to retrieve persistent session_token
  const sessionResp = await fetch(
    "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
    { headers: { "X-Session-ID": sessionId } },
  );
  if (!sessionResp.ok) {
    throw new Error(`Auth provider error ${sessionResp.status}`);
  }
  const sessionData = await sessionResp.json();
  const sessionToken: string = sessionData.session_token;
  // Persist on our backend
  const backendResp = await fetch(`${BACKEND_URL}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_token: sessionToken }),
  });
  if (!backendResp.ok) {
    throw new Error(`Backend auth error ${backendResp.status}`);
  }
  const data = await backendResp.json();
  return { token: data.session_token as string, user: data.user as AuthUser };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const processedRef = useRef<Set<string>>(new Set());

  const persistSession = useCallback(async (sessionId: string) => {
    if (processedRef.current.has(sessionId)) return;
    processedRef.current.add(sessionId);
    try {
      const { token: bearer, user: u } = await exchangeSessionToken(sessionId);
      await storage.secureSet(SESSION_KEY, bearer);
      setToken(bearer);
      setUser(u);
    } catch (e) {
      console.warn("session exchange failed", e);
    }
  }, []);

  const checkExistingSession = useCallback(async (): Promise<boolean> => {
    const stored = await storage.secureGet(SESSION_KEY, "");
    if (!stored) return false;
    try {
      const resp = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${stored}` },
      });
      if (!resp.ok) {
        await storage.secureRemove(SESSION_KEY);
        return false;
      }
      const me = (await resp.json()) as AuthUser;
      setToken(String(stored));
      setUser(me);
      return true;
    } catch (e) {
      console.warn("session validate failed", e);
      return false;
    }
  }, []);

  // Web: detect session_id on mount; Native: handle cold-start deep links
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (Platform.OS === "web") {
          const url = typeof window !== "undefined" ? window.location.href : "";
          const id = parseSessionIdFromUrl(url);
          if (id) {
            await persistSession(id);
            if (typeof window !== "undefined") {
              window.history.replaceState(null, "", window.location.pathname);
            }
          } else {
            await checkExistingSession();
          }
        } else {
          const initialUrl = await Linking.getInitialURL();
          const id = parseSessionIdFromUrl(initialUrl);
          if (id) {
            await persistSession(id);
          } else {
            await checkExistingSession();
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [persistSession, checkExistingSession]);

  // Native hot link listener
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = Linking.addEventListener("url", (event) => {
      const id = parseSessionIdFromUrl(event.url);
      if (id) {
        void persistSession(id);
      }
    });
    return () => sub.remove();
  }, [persistSession]);

  const signIn = useCallback(async () => {
    setLoading(true);
    try {
      let redirectUrl: string;
      if (Platform.OS === "web") {
        redirectUrl = typeof window !== "undefined" ? window.location.origin + "/" : "";
      } else {
        redirectUrl = Linking.createURL("auth");
      }
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      if (Platform.OS === "web") {
        if (typeof window !== "undefined") {
          window.location.href = authUrl;
        }
      } else {
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
        if (result.type === "success" && result.url) {
          const id = parseSessionIdFromUrl(result.url);
          if (id) {
            await persistSession(id);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }, [persistSession]);

  const signOut = useCallback(async () => {
    const stored = token ?? (await storage.secureGet(SESSION_KEY, ""));
    if (stored) {
      try {
        await fetch(`${BACKEND_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${stored}` },
        });
      } catch (_e) {
        // ignore
      }
    }
    await storage.secureRemove(SESSION_KEY);
    setUser(null);
    setToken(null);
  }, [token]);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const resp = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const me = (await resp.json()) as AuthUser;
        setUser(me);
      } else if (resp.status === 401) {
        await signOut();
      }
    } catch (_e) {
      // network error - ignore
    }
  }, [token, signOut]);

  return (
    <AuthCtx.Provider value={{ user, token, loading, signIn, signOut, refreshUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function getBackendUrl(): string {
  return BACKEND_URL;
}

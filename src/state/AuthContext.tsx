import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createContext } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { fetchMe, loginRequest, logoutRequest } from "../api/auth";
import { clearAuthToken, getAuthToken, setAuthToken } from "../api/client";
import type { SessionUser } from "../shared/schemas/responses";

interface AuthContextValue {
  user: SessionUser | null;
  /** False while a stored token is being validated on first load. */
  isReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isReady, setIsReady] = useState(() => getAuthToken() === null);

  // Validate the stored token once on load (session restore).
  useEffect(() => {
    if (getAuthToken() === null) return;

    let cancelled = false;
    fetchMe()
      .then((sessionUser) => {
        if (!cancelled) setUser(sessionUser);
      })
      .catch(() => {
        clearAuthToken();
      })
      .finally(() => {
        if (!cancelled) setIsReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // The API client dispatches this when any request returns 401.
  useEffect(() => {
    function handleUnauthorized() {
      setUser(null);
      queryClient.clear();
    }
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () =>
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, [queryClient]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginRequest({ email, password });
    setAuthToken(response.token);
    setUser(response.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // The session is client-side; API errors must not block sign-out.
    }
    clearAuthToken();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isReady, login, logout }),
    [user, isReady, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}

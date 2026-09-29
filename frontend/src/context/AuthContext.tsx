import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getStoredUser, setAuthToken, setStoredUser, setUnauthorizedHandler } from "../api/client";
import { login as loginApi } from "../api/users";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function clearSession() {
  setAuthToken(null);
  setStoredUser(null);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("cf_token"));
  const [user, setUser] = useState<User | null>(() => getStoredUser<User>());

  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  // Any 401 from the API client logs the user out (expired/invalid token).
  useEffect(() => {
    setUnauthorizedHandler(() => logout());
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await loginApi(email, password);
      setAuthToken(response.access_token);
      setStoredUser(response.user);
      setToken(response.access_token);
      setUser(response.user);
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isAdmin: user?.role === "admin",
      login,
      logout,
    }),
    [user, token, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

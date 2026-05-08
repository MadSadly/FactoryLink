import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getRoleFromToken, isJwtExpired } from "./token";

const AuthContext = createContext(null);

const TOKEN_KEY = "factorylink_token";

function readStoredToken() {
  const t = localStorage.getItem(TOKEN_KEY);
  if (t && isJwtExpired(t)) {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
  return t;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readStoredToken);
  const role = token ? getRoleFromToken(token) : "GUEST";

  useEffect(() => {
    const onServerRejected = () => {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
    };
    window.addEventListener("factorylink-auth-expired", onServerRejected);
    return () => window.removeEventListener("factorylink-auth-expired", onServerRejected);
  }, []);

  useEffect(() => {
    if (!token) return undefined;
    const id = window.setInterval(() => {
      const t = localStorage.getItem(TOKEN_KEY);
      if (t && isJwtExpired(t)) {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      }
    }, 30_000);
    return () => window.clearInterval(id);
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      role,
      isAuthenticated: Boolean(token) && !isJwtExpired(token),
      setAuthToken: (nextToken) => {
        if (!nextToken) return;
        localStorage.setItem(TOKEN_KEY, nextToken);
        setToken(nextToken);
      },
      logout: () => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      },
    }),
    [role, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

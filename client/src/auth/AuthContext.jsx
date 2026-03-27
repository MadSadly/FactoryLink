import { createContext, useContext, useMemo, useState } from "react";
import { getRoleFromToken } from "./token";

const AuthContext = createContext(null);

const TOKEN_KEY = "factorylink_token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY));
  const role = token ? getRoleFromToken(token) : "GUEST";

  const value = useMemo(
    () => ({
      token,
      role,
      isAuthenticated: Boolean(token),
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

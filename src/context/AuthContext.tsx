import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { User, AuthResponse, UserRole } from "../types";
import { authApi, setAuthErrorHandler } from "../api/client";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (tenantCode: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function persistSession(data: AuthResponse, setToken: (token: string) => void, setUser: (user: User) => void) {
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  setToken(data.token);
  setUser(data.user);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initializingRef = useRef(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("authMethod");
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setAuthErrorHandler(() => {
      if (initializingRef.current) return;
      clearSession();
    });
  }, [clearSession]);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }

    setIsLoading(false);
    initializingRef.current = false;
  }, []);

  const login = async (tenantCode: string, username: string, password: string) => {
    const res = await authApi.login({ tenantCode, username, password });
    const data = res.data as AuthResponse;

    if (!data.token || !data.user) {
      throw new Error("Login failed");
    }

    persistSession(data, setToken, setUser);
  };

  const logout = () => {
    clearSession();
  };

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isLoading,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

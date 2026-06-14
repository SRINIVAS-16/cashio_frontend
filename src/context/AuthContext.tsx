import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { PublicClientApplication, InteractionRequiredAuthError, AccountInfo } from "@azure/msal-browser";
import { User, AuthResponse, UserRole } from "../types";
import { authApi, setAuthErrorHandler } from "../api/client";
import { msalConfig, loginRequest, apiTokenRequest, isOAuthEnabled } from "../config/authConfig";

let msalInstance: PublicClientApplication | null = null;
let msalReady: Promise<void> | null = null;
if (isOAuthEnabled) {
  msalInstance = new PublicClientApplication(msalConfig);
  msalReady = msalInstance.initialize();
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string, tenantSlug?: string) => Promise<void>;
  loginWithOAuth: () => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  hasRole: (...roles: UserRole[]) => boolean;
  isOAuthAvailable: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function persistLocalSession(data: AuthResponse, setToken: (token: string) => void, setUser: (user: User) => void) {
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  localStorage.setItem("authMethod", "local");
  setToken(data.token);
  setUser(data.user);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initializingRef = useRef(true);

  useEffect(() => {
    setAuthErrorHandler(() => {
      if (initializingRef.current) return;
      setToken(null);
      setUser(null);
    });
  }, []);

  const mapAzureAccountToUser = useCallback((account: AccountInfo, role?: UserRole): User => {
    return {
      id: 0,
      username: account.username,
      name: account.name || account.username,
      email: account.username,
      role: role || (account.idTokenClaims?.roles?.[0] as UserRole) || "viewer",
      tenantId: "",
    };
  }, []);

  const acquireToken = useCallback(async (): Promise<string | null> => {
    if (!msalInstance) return null;
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length === 0) return null;
    try {
      const response = await msalInstance.acquireTokenSilent({
        ...apiTokenRequest,
        account: accounts[0],
      });
      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        await msalInstance.acquireTokenRedirect(apiTokenRequest);
        return null;
      }
      return null;
    }
  }, []);

  const resolveUserFromBackend = useCallback(async (accessToken: string, account: AccountInfo) => {
    const appUser = mapAzureAccountToUser(account);
    localStorage.setItem("token", accessToken);
    localStorage.setItem("authMethod", "oauth");
    try {
      const profileRes = await authApi.getProfile();
      const backendUser = profileRes.data as User;
      appUser.role = backendUser.role;
      appUser.id = backendUser.id;
      appUser.tenantId = backendUser.tenantId;
    } catch {
      // Backend unreachable or user not provisioned — use role from token claims.
    }
    setToken(accessToken);
    setUser(appUser);
    localStorage.setItem("user", JSON.stringify(appUser));
  }, [mapAzureAccountToUser]);

  useEffect(() => {
    const init = async () => {
      if (msalInstance && msalReady) {
        try {
          await msalReady;
          const response = await msalInstance.handleRedirectPromise();
          if (response?.account && response.accessToken) {
            await resolveUserFromBackend(response.accessToken, response.account);
            setIsLoading(false);
            initializingRef.current = false;
            return;
          }

          const accounts = msalInstance.getAllAccounts();
          if (accounts.length > 0) {
            const accessToken = await acquireToken();
            if (accessToken) {
              await resolveUserFromBackend(accessToken, accounts[0]);
              setIsLoading(false);
              initializingRef.current = false;
              return;
            }
          }

          const justLoggedOut = sessionStorage.getItem("justLoggedOut") === "1";
          sessionStorage.removeItem("justLoggedOut");
          if (!justLoggedOut) {
            try {
              const sso = await msalInstance.ssoSilent(loginRequest);
              if (sso?.account && sso.accessToken) {
                await resolveUserFromBackend(sso.accessToken, sso.account);
                setIsLoading(false);
                initializingRef.current = false;
                return;
              }
            } catch {
              // No active Microsoft session — user must click login.
            }
          }
        } catch (err) {
          console.error("MSAL initialization error:", err);
        }
      }

      const savedToken = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");
      const authMethod = localStorage.getItem("authMethod");
      if (authMethod !== "oauth" && savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
      setIsLoading(false);
      initializingRef.current = false;
    };

    init();
  }, [acquireToken, resolveUserFromBackend]);

  const login = async (username: string, password: string, tenantSlug?: string) => {
    const res = await authApi.login({ username, password, tenantSlug });
    const data = res.data as AuthResponse;

    if (!data.token || !data.user) {
      throw new Error("Login failed");
    }

    persistLocalSession(data, setToken, setUser);
  };

  const loginWithOAuth = async () => {
    if (!msalInstance || !msalReady) {
      throw new Error("OAuth is not configured. Set VITE_AZURE_CLIENT_ID in .env");
    }
    await msalReady;
    await msalInstance.loginRedirect(loginRequest);
  };

  const logout = () => {
    const authMethod = localStorage.getItem("authMethod");

    if (authMethod === "oauth" && msalInstance) {
      sessionStorage.setItem("justLoggedOut", "1");
      setIsLoading(true);
      msalInstance
        .logoutRedirect({ postLogoutRedirectUri: window.location.origin })
        .catch((err) => {
          console.error(err);
          setToken(null);
          setUser(null);
          setIsLoading(false);
        });
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("authMethod");
      return;
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("authMethod");
    setToken(null);
    setUser(null);
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
        loginWithOAuth,
        logout,
        isLoading,
        hasRole,
        isOAuthAvailable: isOAuthEnabled,
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

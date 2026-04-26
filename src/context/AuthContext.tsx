// ─── Auth Context (OAuth 2.0 + Username/Password + Role-Based) ──
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { PublicClientApplication, InteractionRequiredAuthError, AccountInfo } from "@azure/msal-browser";
import { User, AuthResponse, UserRole } from "../types";
import { authApi, setAuthErrorHandler } from "../api/client";
import { msalConfig, loginRequest, apiTokenRequest, isOAuthEnabled } from "../config/authConfig";

// Initialize MSAL instance once at module load (only if OAuth is configured)
let msalInstance: PublicClientApplication | null = null;
let msalReady: Promise<void> | null = null;
if (isOAuthEnabled) {
  msalInstance = new PublicClientApplication(msalConfig);
  msalReady = msalInstance.initialize();
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  loginWithOAuth: () => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  hasRole: (...roles: UserRole[]) => boolean;
  isOAuthAvailable: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Guard: ignore 401 interceptor during initial auth flow
  const initializingRef = useRef(true);

  // Register the global 401 handler — clears React state so ProtectedRoute navigates to /login
  useEffect(() => {
    setAuthErrorHandler(() => {
      if (initializingRef.current) return; // Don't interrupt initial auth
      setToken(null);
      setUser(null);
    });
  }, []);

  // Map Azure AD account to app User (role comes from token claims or API)
  const mapAzureAccountToUser = useCallback((account: AccountInfo, role?: UserRole): User => {
    return {
      id: 0,
      username: account.username,
      name: account.name || account.username,
      email: account.username,
      role: role || (account.idTokenClaims?.roles?.[0] as UserRole) || "viewer",
    };
  }, []);

  // Get access token silently (refresh if needed)
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
        // Fall back to redirect for re-consent
        await msalInstance.acquireTokenRedirect(apiTokenRequest);
        return null;
      }
      return null;
    }
  }, []);

  // Resolve user role from backend (needs token in localStorage for Axios interceptor)
  const resolveUserFromBackend = useCallback(async (accessToken: string, account: AccountInfo) => {
    const appUser = mapAzureAccountToUser(account);
    // Store token BEFORE making API calls so Axios interceptor can attach it
    localStorage.setItem("token", accessToken);
    localStorage.setItem("authMethod", "oauth");
    try {
      const profileRes = await authApi.getProfile();
      const backendUser = profileRes.data as User;
      appUser.role = backendUser.role;
      appUser.id = backendUser.id;
    } catch {
      // Backend unreachable or user not provisioned — use role from token claims
    }
    setToken(accessToken);
    setUser(appUser);
    localStorage.setItem("user", JSON.stringify(appUser));
  }, [mapAzureAccountToUser]);

  // Initialize: check for existing session (OAuth redirect result or local)
  useEffect(() => {
    const init = async () => {
      if (msalInstance && msalReady) {
        try {
          await msalReady;

          // 1. Process redirect callback (returns null if this isn't a redirect)
          const response = await msalInstance.handleRedirectPromise();
          if (response?.account && response.accessToken) {
            await resolveUserFromBackend(response.accessToken, response.account);
            setIsLoading(false);
            initializingRef.current = false;
            return;
          }

          // 2. Check for existing MSAL session (cached tokens)
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
        } catch (err) {
          console.error("MSAL initialization error:", err);
        }
      }

      // 3. Fall back to local token-based auth
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

  // Username/Password login (existing flow)
  const login = async (username: string, password: string) => {
    const res = await authApi.login({ username, password });
    const data: AuthResponse = res.data;
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("authMethod", "local");
    setToken(data.token);
    setUser(data.user);
  };

  // OAuth 2.0 login via Azure AD (redirect flow — page navigates away)
  const loginWithOAuth = async () => {
    if (!msalInstance || !msalReady) {
      throw new Error("OAuth is not configured. Set VITE_AZURE_CLIENT_ID in .env");
    }
    await msalReady;
    // This navigates the browser to Microsoft login — does not return
    await msalInstance.loginRedirect(loginRequest);
  };

  // Logout (both OAuth and local)
  const logout = () => {
    const authMethod = localStorage.getItem("authMethod");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("authMethod");
    setToken(null);
    setUser(null);

    if (authMethod === "oauth" && msalInstance) {
      msalInstance.logoutRedirect({
        postLogoutRedirectUri: window.location.origin,
      }).catch(console.error);
    }
  };

  // Role check helper
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

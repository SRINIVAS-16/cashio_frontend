import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "../../types";

const mockUser: User = {
  id: 1,
  username: "alice",
  name: "Alice",
  email: "alice@example.com",
  role: "admin",
  tenantId: "00000000-0000-0000-0000-000000000001",
};

type AuthTestOptions = {
  oauthEnabled?: boolean;
};

async function loadAuthContext(options: AuthTestOptions = {}) {
  vi.resetModules();

  const loginMock = vi.fn();
  const getProfileMock = vi.fn();
  let authErrorHandler: (() => void) | undefined;
  const setAuthErrorHandlerMock = vi.fn((handler: () => void) => {
    authErrorHandler = handler;
  });

  const msalInstance = {
    initialize: vi.fn().mockResolvedValue(undefined),
    handleRedirectPromise: vi.fn().mockResolvedValue(null),
    getAllAccounts: vi.fn().mockReturnValue([]),
    acquireTokenSilent: vi.fn().mockResolvedValue({ accessToken: "oauth-token" }),
    acquireTokenRedirect: vi.fn().mockResolvedValue(undefined),
    ssoSilent: vi.fn().mockResolvedValue(null),
    loginRedirect: vi.fn().mockResolvedValue(undefined),
    logoutRedirect: vi.fn().mockResolvedValue(undefined),
  };

  const PublicClientApplicationMock = vi.fn();
  class PublicClientApplicationClass {
    constructor(config: unknown) {
      PublicClientApplicationMock(config);
      return msalInstance as never;
    }
  }
  class InteractionRequiredAuthErrorMock extends Error {}

  vi.doMock("../../api/client", () => ({
    authApi: {
      login: loginMock,
      getProfile: getProfileMock,
    },
    setAuthErrorHandler: setAuthErrorHandlerMock,
  }));

  vi.doMock("../../config/authConfig", () => ({
    msalConfig: { auth: {} },
    loginRequest: { scopes: ["scope.read"] },
    apiTokenRequest: { scopes: ["scope.read"] },
    isOAuthEnabled: options.oauthEnabled ?? false,
  }));

  vi.doMock("@azure/msal-browser", () => ({
    PublicClientApplication: PublicClientApplicationClass,
    InteractionRequiredAuthError: InteractionRequiredAuthErrorMock,
  }));

  const module = await import("../../context/AuthContext");

  return {
    ...module,
    loginMock,
    getProfileMock,
    setAuthErrorHandlerMock,
    getAuthErrorHandler: () => authErrorHandler,
    msalInstance,
    PublicClientApplicationMock,
  };
}

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("renders children and restores a saved local session", async () => {
    localStorage.setItem("token", "saved-token");
    localStorage.setItem("user", JSON.stringify(mockUser));
    localStorage.setItem("authMethod", "local");

    const authModule = await loadAuthContext();

    function Consumer() {
      const { user, token, isLoading, hasRole, isOAuthAvailable } = authModule.useAuth();
      return (
        <div>
          <div data-testid="loading">{String(isLoading)}</div>
          <div data-testid="user">{user?.username ?? "none"}</div>
          <div data-testid="token">{token ?? "none"}</div>
          <div data-testid="role">{String(hasRole("admin"))}</div>
          <div data-testid="oauth">{String(isOAuthAvailable)}</div>
        </div>
      );
    }

    render(
      <authModule.AuthProvider>
        <div>child</div>
        <Consumer />
      </authModule.AuthProvider>
    );

    expect(screen.getByText("child")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("user")).toHaveTextContent("alice");
    expect(screen.getByTestId("token")).toHaveTextContent("saved-token");
    expect(screen.getByTestId("role")).toHaveTextContent("true");
    expect(screen.getByTestId("oauth")).toHaveTextContent("false");
    expect(authModule.setAuthErrorHandlerMock).toHaveBeenCalledTimes(1);
  });

  it("logs in with username/password and persists the session", async () => {
    const authModule = await loadAuthContext();
    authModule.loginMock.mockResolvedValue({ data: { token: "jwt-token", user: mockUser } });

    function Consumer() {
      const { user, token, login, isLoading } = authModule.useAuth();
      return (
        <div>
          <div data-testid="loading">{String(isLoading)}</div>
          <div data-testid="user">{user?.username ?? "none"}</div>
          <div data-testid="token">{token ?? "none"}</div>
          <button onClick={() => login("alice", "secret", "tenant-one")}>login</button>
        </div>
      );
    }

    render(
      <authModule.AuthProvider>
        <Consumer />
      </authModule.AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    fireEvent.click(screen.getByRole("button", { name: "login" }));

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("alice"));
    expect(screen.getByTestId("token")).toHaveTextContent("jwt-token");
    expect(authModule.loginMock).toHaveBeenCalledWith({ username: "alice", password: "secret", tenantSlug: "tenant-one" });
    expect(localStorage.getItem("token")).toBe("jwt-token");
    expect(localStorage.getItem("user")).toBe(JSON.stringify(mockUser));
    expect(localStorage.getItem("authMethod")).toBe("local");
  });

  it("clears auth state on logout and when the global auth error handler fires", async () => {
    localStorage.setItem("token", "saved-token");
    localStorage.setItem("user", JSON.stringify(mockUser));
    localStorage.setItem("authMethod", "local");

    const authModule = await loadAuthContext();

    function Consumer() {
      const { user, token, logout, isLoading } = authModule.useAuth();
      return (
        <div>
          <div data-testid="loading">{String(isLoading)}</div>
          <div data-testid="user">{user?.username ?? "none"}</div>
          <div data-testid="token">{token ?? "none"}</div>
          <button onClick={logout}>logout</button>
        </div>
      );
    }

    render(
      <authModule.AuthProvider>
        <Consumer />
      </authModule.AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("alice"));

    await act(async () => {
      authModule.getAuthErrorHandler()?.();
    });
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("none"));
    expect(screen.getByTestId("token")).toHaveTextContent("none");

    localStorage.setItem("token", "saved-token");
    localStorage.setItem("user", JSON.stringify(mockUser));
    localStorage.setItem("authMethod", "local");
    fireEvent.click(screen.getByRole("button", { name: "logout" }));

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("none"));
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(localStorage.getItem("authMethod")).toBeNull();
  });

  it("starts the OAuth redirect flow when OAuth is configured", async () => {
    const authModule = await loadAuthContext({ oauthEnabled: true });

    function Consumer() {
      const { loginWithOAuth, isLoading, isOAuthAvailable } = authModule.useAuth();
      return (
        <div>
          <div data-testid="loading">{String(isLoading)}</div>
          <div data-testid="oauth">{String(isOAuthAvailable)}</div>
          <button onClick={() => loginWithOAuth()}>oauth-login</button>
        </div>
      );
    }

    render(
      <authModule.AuthProvider>
        <Consumer />
      </authModule.AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("oauth")).toHaveTextContent("true");

    fireEvent.click(screen.getByRole("button", { name: "oauth-login" }));

    await waitFor(() => expect(authModule.msalInstance.loginRedirect).toHaveBeenCalledWith({ scopes: ["scope.read"] }));
    expect(authModule.PublicClientApplicationMock).toHaveBeenCalledTimes(1);
  });

  it("throws when useAuth is used outside the provider", async () => {
    const authModule = await loadAuthContext();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const Broken = () => {
      authModule.useAuth();
      return null;
    };

    expect(() => render(<Broken />)).toThrow("useAuth must be used within AuthProvider");
    errorSpy.mockRestore();
  });
});

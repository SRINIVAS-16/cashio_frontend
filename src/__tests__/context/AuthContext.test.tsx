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

async function loadAuthContext() {
  vi.resetModules();

  const loginMock = vi.fn();
  let authErrorHandler: (() => void) | undefined;
  const setAuthErrorHandlerMock = vi.fn((handler: () => void) => {
    authErrorHandler = handler;
  });

  vi.doMock("../../api/client", () => ({
    authApi: {
      login: loginMock,
    },
    setAuthErrorHandler: setAuthErrorHandlerMock,
  }));

  const module = await import("../../context/AuthContext");

  return {
    ...module,
    loginMock,
    setAuthErrorHandlerMock,
    getAuthErrorHandler: () => authErrorHandler,
  };
}

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders children and restores a saved local session", async () => {
    localStorage.setItem("token", "saved-token");
    localStorage.setItem("user", JSON.stringify(mockUser));

    const authModule = await loadAuthContext();

    function Consumer() {
      const { user, token, isLoading, hasRole } = authModule.useAuth();
      return (
        <div>
          <div data-testid="loading">{String(isLoading)}</div>
          <div data-testid="user">{user?.username ?? "none"}</div>
          <div data-testid="token">{token ?? "none"}</div>
          <div data-testid="role">{String(hasRole("admin"))}</div>
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
  });

  it("logs in with tenant code and persists the session", async () => {
    const authModule = await loadAuthContext();
    authModule.loginMock.mockResolvedValue({ data: { token: "jwt-token", user: mockUser } });

    function Consumer() {
      const { user, token, login, isLoading } = authModule.useAuth();
      return (
        <div>
          <div data-testid="loading">{String(isLoading)}</div>
          <div data-testid="user">{user?.username ?? "none"}</div>
          <div data-testid="token">{token ?? "none"}</div>
          <button onClick={() => login("tenant-one", "alice", "secret")}>login</button>
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
    expect(authModule.loginMock).toHaveBeenCalledWith({ tenantCode: "tenant-one", username: "alice", password: "secret" });
  });

  it("clears auth state on logout and when the global auth error handler fires", async () => {
    localStorage.setItem("token", "saved-token");
    localStorage.setItem("user", JSON.stringify(mockUser));

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

    localStorage.setItem("token", "saved-token");
    localStorage.setItem("user", JSON.stringify(mockUser));
    fireEvent.click(screen.getByRole("button", { name: "logout" }));

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("none"));
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

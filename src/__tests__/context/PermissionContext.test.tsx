import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const permissionState = vi.hoisted(() => ({
  auth: {
    user: null as null | { id: number; username: string; name: string; role: string },
    token: null as string | null,
  },
  getMyPermissions: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => permissionState.auth,
}));

vi.mock("../../api/client", () => ({
  permissionApi: {
    getMyPermissions: permissionState.getMyPermissions,
  },
}));

import { PermissionProvider, usePermissions } from "../../context/PermissionContext";

describe("PermissionContext", () => {
  beforeEach(() => {
    permissionState.auth.user = null;
    permissionState.auth.token = null;
    permissionState.getMyPermissions.mockReset();
  });

  it("returns an empty permission set when the user is not authenticated", async () => {
    function Consumer() {
      const { permissions, hasPermission, isLoading } = usePermissions();
      return (
        <div>
          <div data-testid="size">{permissions.size}</div>
          <div data-testid="loading">{String(isLoading)}</div>
          <div data-testid="can-dashboard">{String(hasPermission("dashboard"))}</div>
        </div>
      );
    }

    render(
      <PermissionProvider>
        <Consumer />
      </PermissionProvider>
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("size")).toHaveTextContent("0");
    expect(screen.getByTestId("can-dashboard")).toHaveTextContent("false");
    expect(permissionState.getMyPermissions).not.toHaveBeenCalled();
  });

  it("loads permissions and supports exact and code-only lookups", async () => {
    permissionState.auth.user = { id: 1, username: "alice", name: "Alice", role: "admin" };
    permissionState.auth.token = "jwt-token";
    permissionState.getMyPermissions.mockResolvedValue({
      data: { permissions: ["dashboard:access", "products:read", "products:create"] },
    });

    function Consumer() {
      const { permissions, hasPermission, isLoading } = usePermissions();
      return (
        <div>
          <div data-testid="size">{permissions.size}</div>
          <div data-testid="loading">{String(isLoading)}</div>
          <div data-testid="dashboard">{String(hasPermission("dashboard"))}</div>
          <div data-testid="products">{String(hasPermission("products"))}</div>
          <div data-testid="create">{String(hasPermission("products", "create"))}</div>
          <div data-testid="delete">{String(hasPermission("products", "delete"))}</div>
          <div data-testid="inline">{String(hasPermission("products:read"))}</div>
        </div>
      );
    }

    render(
      <PermissionProvider>
        <Consumer />
      </PermissionProvider>
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("size")).toHaveTextContent("3");
    expect(screen.getByTestId("dashboard")).toHaveTextContent("true");
    expect(screen.getByTestId("products")).toHaveTextContent("true");
    expect(screen.getByTestId("create")).toHaveTextContent("true");
    expect(screen.getByTestId("delete")).toHaveTextContent("false");
    expect(screen.getByTestId("inline")).toHaveTextContent("true");
  });

  it("recovers from permission fetch errors and supports refresh", async () => {
    permissionState.auth.user = { id: 1, username: "alice", name: "Alice", role: "admin" };
    permissionState.auth.token = "jwt-token";
    permissionState.getMyPermissions
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ data: { permissions: ["orders:read"] } });

    function Consumer() {
      const { permissions, hasPermission, isLoading, refresh } = usePermissions();
      return (
        <div>
          <div data-testid="size">{permissions.size}</div>
          <div data-testid="loading">{String(isLoading)}</div>
          <div data-testid="orders">{String(hasPermission("orders"))}</div>
          <button onClick={() => refresh()}>refresh</button>
        </div>
      );
    }

    render(
      <PermissionProvider>
        <Consumer />
      </PermissionProvider>
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("size")).toHaveTextContent("0");
    expect(screen.getByTestId("orders")).toHaveTextContent("false");

    fireEvent.click(screen.getByRole("button", { name: "refresh" }));

    await waitFor(() => expect(screen.getByTestId("orders")).toHaveTextContent("true"));
    expect(screen.getByTestId("size")).toHaveTextContent("1");
  });

  it("throws when usePermissions is used outside the provider", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const Broken = () => {
      usePermissions();
      return null;
    };

    expect(() => render(<Broken />)).toThrow("usePermissions must be used within PermissionProvider");
    errorSpy.mockRestore();
  });
});

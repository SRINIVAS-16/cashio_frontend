import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const routeState = vi.hoisted(() => ({
  auth: {
    user: null as null | { role: string },
    isLoading: false,
  },
  permissions: {
    hasPermission: vi.fn(),
    isLoading: false,
  },
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => routeState.auth,
}));

vi.mock("../../context/PermissionContext", () => ({
  usePermissions: () => routeState.permissions,
}));

import ProtectedRoute from "../../components/ProtectedRoute";

function renderRoute(element: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={["/protected"]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/protected" element={element} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    routeState.auth.user = null;
    routeState.auth.isLoading = false;
    routeState.permissions.isLoading = false;
    routeState.permissions.hasPermission.mockReset();
    routeState.permissions.hasPermission.mockReturnValue(true);
  });

  it("shows a loading spinner while auth or permission checks are in progress", () => {
    routeState.auth.isLoading = true;
    const { container } = renderRoute(
      <ProtectedRoute permission="dashboard">
        <div>Secret</div>
      </ProtectedRoute>
    );

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("redirects unauthenticated users to the login page", () => {
    renderRoute(
      <ProtectedRoute permission="dashboard">
        <div>Secret</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });

  it("renders protected content for authenticated users with permission", () => {
    routeState.auth.user = { role: "admin" };
    routeState.permissions.hasPermission.mockReturnValue(true);

    renderRoute(
      <ProtectedRoute permission="dashboard">
        <div>Secret</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("Secret")).toBeInTheDocument();
  });

  it("shows an access denied state when the user lacks permission", () => {
    routeState.auth.user = { role: "viewer" };
    routeState.permissions.hasPermission.mockReturnValue(false);

    renderRoute(
      <ProtectedRoute permission="products">
        <div>Secret</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    expect(screen.getByText(/your role:/i)).toHaveTextContent("viewer");
    expect(screen.queryByText("Secret")).not.toBeInTheDocument();
  });
});

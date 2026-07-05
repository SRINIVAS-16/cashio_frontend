import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

const sidebarState = vi.hoisted(() => ({
  allowed: new Set<string>(),
  auth: {
    user: { id: 1, username: "alice", name: "Alice", role: "admin" },
    logout: vi.fn(),
  },
  permissions: {
    hasPermission: vi.fn(),
  },
  lang: {
    t: {
      dashboard: "Dashboard",
      profitLoss: "Profit & Loss",
      billing: "Billing",      orders: "Orders",
      customers: "Customers",
      products: "Products",
      logout: "Logout",
      customFields: "Custom Fields",
      settings: "Settings",
      stockBook: "Stock Book",
      purchases: "Purchases",
      dealers: "Dealers",
    },
    lang: "en",
    setLang: vi.fn(),
    languages: [
      { code: "en", name: "English", nameEn: "English", script: "A" },
      { code: "te", name: "తెలుగు", nameEn: "Telugu", script: "తె" },
    ],
  },
  shop: {
    shop: {
      name: "Cashio Shop",
      nameLocal: "క్యాషియో షాప్",
      phone: "9999999999",
      logo: "/logo.svg",
    },
  },
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => sidebarState.auth,
}));

vi.mock("../../context/PermissionContext", () => ({
  usePermissions: () => ({ hasPermission: sidebarState.permissions.hasPermission }),
}));

vi.mock("../../context/LanguageContext", () => ({
  useLang: () => sidebarState.lang,
}));

vi.mock("../../context/ShopConfigContext", () => ({
  useShopConfig: () => sidebarState.shop,
}));

import Sidebar from "../../components/Sidebar";

function renderSidebar(open = true, pathname = "/") {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <Sidebar open={open} onClose={vi.fn()} />
    </MemoryRouter>
  );
}

describe("Sidebar", () => {
  beforeEach(() => {
    sidebarState.allowed.clear();
    [
      "dashboard",
      "billing",
      "customers",
      "products",
      "custom-fields",
      "users",
    ].forEach((permission) => sidebarState.allowed.add(permission));
    sidebarState.auth.logout.mockReset();
    sidebarState.lang.setLang.mockReset();
    sidebarState.lang.lang = "en";
    sidebarState.permissions.hasPermission.mockReset();
    sidebarState.permissions.hasPermission.mockImplementation((permission: string) => sidebarState.allowed.has(permission));
  });

  it("renders branding and only shows permitted navigation items", () => {
    renderSidebar(true, "/");

    expect(screen.getByText("Cashio Shop")).toBeInTheDocument();
    expect(screen.getByText("9999999999")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Billing" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Customers" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Orders" })).not.toBeInTheDocument();
  });

  it("shows Telugu branding and toggles the profile submenu based on permissions", async () => {
    sidebarState.lang.lang = "te";
    renderSidebar(true, "/users");

    expect(screen.getByText("క్యాషియో షాప్")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /alice/i }));

    expect(await screen.findByRole("link", { name: "Custom Fields" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Users" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Role Permissions" })).not.toBeInTheDocument();
  });

  it("lets the user change languages and log out", async () => {
    renderSidebar(true, "/");

    fireEvent.click(screen.getByRole("button", { name: "English" }));
    fireEvent.click(screen.getByRole("button", { name: /తెలుగు/i }));

    await waitFor(() => expect(sidebarState.lang.setLang).toHaveBeenCalledWith("te"));
    expect(screen.queryByRole("button", { name: /తెలుగు/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Logout" }));
    expect(sidebarState.auth.logout).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when a navigation link is clicked", () => {
    const onClose = vi.fn();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Sidebar open={true} onClose={onClose} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("link", { name: "Dashboard" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  login: vi.fn(),
  selectTenant: vi.fn(),
  loginWithOAuth: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  authState: {
    user: null as null | { id: number; name: string },
    isLoading: false,
    isOAuthAvailable: true,
    pendingLogin: null as null | {
      username: string;
      password: string;
      tenants: Array<{ tenantId: string; tenantName: string; tenantSlug: string; role: string }>;
    },
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    user: mocks.authState.user,
    isLoading: mocks.authState.isLoading,
    pendingLogin: mocks.authState.pendingLogin,
    login: mocks.login,
    selectTenant: mocks.selectTenant,
    loginWithOAuth: mocks.loginWithOAuth,
    isOAuthAvailable: mocks.authState.isOAuthAvailable,
  }),
}));

vi.mock("../../context/LanguageContext", () => ({
  useLang: () => ({ t: new Proxy({}, { get: (_, key) => String(key) }), lang: "en", setLang: vi.fn() }),
}));

vi.mock("../../context/ShopConfigContext", () => ({
  useShopConfig: () => ({
    shop: {
      name: "Test Shop",
      nameLocal: "టెస్ట్ షాప్",
      tagline: "Best inputs",
      taglineLocal: "బెస్ట్ ఇన్‌పుట్స్",
      address: "Main road",
      addressLocal: "",
      district: "East Godavari",
      districtLocal: "",
      phone: "9999999999",
      altPhone: "",
      gst: "GST123",
      email: "shop@example.com",
      logo: "/logo.svg",
    },
    updateShop: vi.fn(),
  }),
}));

vi.mock("../../config/authConfig", () => ({ isLocalAuthEnabled: true }));

vi.mock("react-hot-toast", () => ({
  default: { success: mocks.toastSuccess, error: mocks.toastError },
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

import Login from "../../pages/Login";
import { renderWithRouter } from "./testUtils";

describe("Login page", () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.login.mockReset();
    mocks.selectTenant.mockReset();
    mocks.loginWithOAuth.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
    mocks.authState.user = null;
    mocks.authState.isLoading = false;
    mocks.authState.isOAuthAvailable = true;
    mocks.authState.pendingLogin = null;
  });

  it("renders the login form and shop details", () => {
    const { container } = renderWithRouter(<Login />);

    expect(screen.getByRole("heading", { name: "Test Shop" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("admin")).toBeRequired();
    expect(container.querySelector('input[type="password"]')).toBeRequired();
    expect(screen.getByRole("button", { name: "loginButton" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login with Microsoft" })).toBeInTheDocument();
    expect(screen.getByText("Default: admin / admin123")).toBeInTheDocument();
  });

  it("submits credentials and navigates on success", async () => {
    mocks.login.mockImplementation(async () => {
      mocks.authState.user = { id: 1, name: "Admin" } as any;
    });

    const { container, rerender } = renderWithRouter(<Login />);

    fireEvent.change(screen.getByPlaceholderText("admin"), { target: { value: "admin" } });
    fireEvent.change(container.querySelector('input[type="password"]')!, { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "loginButton" }));

    await waitFor(() => {
      expect(mocks.login).toHaveBeenCalledWith("admin", "secret123");
    });

    rerender(<Login />);

    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalledWith("welcomeBack");
      expect(mocks.navigate).toHaveBeenCalledWith("/", { replace: true });
    });
  });

  it("redirects super admins to the super admin console after login", async () => {
    mocks.authState.user = { id: 99, name: "Platform Admin", role: "superadmin" } as any;

    renderWithRouter(<Login />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith("/super-admin", { replace: true });
    });
  });

  it("shows tenant selection and calls selectTenant", async () => {
    mocks.authState.pendingLogin = {
      username: "admin",
      password: "secret123",
      tenants: [
        { tenantId: "t1", tenantName: "Tenant One", tenantSlug: "tenant-one", role: "admin" },
        { tenantId: "t2", tenantName: "Tenant Two", tenantSlug: "tenant-two", role: "viewer" },
      ],
    };

    renderWithRouter(<Login />);

    expect(screen.getByText("Select your tenant")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Tenant One/i }));

    await waitFor(() => {
      expect(mocks.selectTenant).toHaveBeenCalledWith("t1");
    });
  });

  it("shows a friendly inline error and clears it after input changes", async () => {
    mocks.login.mockRejectedValue({
      response: { status: 401, data: { error: "Invalid credentials" } },
    });

    const { container } = renderWithRouter(<Login />);

    fireEvent.change(screen.getByPlaceholderText("admin"), { target: { value: "admin" } });
    fireEvent.change(container.querySelector('input[type="password"]')!, { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "loginButton" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Incorrect username or password. Please try again.",
    );

    fireEvent.change(screen.getByPlaceholderText("admin"), { target: { value: "admin2" } });

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  it("shows a loading spinner while auth is being resolved", () => {
    mocks.authState.isLoading = true;

    const { container } = renderWithRouter(<Login />);

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("admin")).not.toBeInTheDocument();
  });
});

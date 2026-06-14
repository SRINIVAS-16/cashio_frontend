import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  login: vi.fn(),
  loginWithOAuth: vi.fn(),
  lookupBySlug: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  authState: {
    user: null as null | { id: number; name: string; role?: string },
    isLoading: false,
    isOAuthAvailable: true,
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
    login: mocks.login,
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

vi.mock("../../api/client", () => ({
  tenantApi: {
    lookupBySlug: mocks.lookupBySlug,
  },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: mocks.toastSuccess, error: mocks.toastError },
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

import Login from "../../pages/Login";
import { renderWithRouter } from "./testUtils";

describe("Login page", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.navigate.mockReset();
    mocks.login.mockReset();
    mocks.loginWithOAuth.mockReset();
    mocks.lookupBySlug.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
    mocks.authState.user = null;
    mocks.authState.isLoading = false;
    mocks.authState.isOAuthAvailable = true;
  });

  it("renders the tenant-first login step and shop details", () => {
    renderWithRouter(<Login />);

    expect(screen.getByRole("heading", { name: "Test Shop" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("sri-sai-agro")).toBeRequired();
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login as Platform Admin" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login with Microsoft" })).toBeInTheDocument();
    expect(screen.getByText("Default: admin / admin123")).toBeInTheDocument();
  });

  it("looks up a tenant and then submits tenant-scoped credentials", async () => {
    mocks.lookupBySlug.mockResolvedValue({ data: { name: "Sri Sai Agro Store", slug: "tenant-one" } });
    mocks.login.mockImplementation(async () => {
      mocks.authState.user = { id: 1, name: "Admin" } as any;
    });

    const { container, rerender } = renderWithRouter(<Login />);

    fireEvent.change(screen.getByPlaceholderText("sri-sai-agro"), { target: { value: "tenant-one" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(mocks.lookupBySlug).toHaveBeenCalledWith("tenant-one");
      expect(screen.getByText("Logging into: Sri Sai Agro Store")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("admin"), { target: { value: "admin" } });
    fireEvent.change(container.querySelector('input[type="password"]')!, { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "loginButton" }));

    await waitFor(() => {
      expect(mocks.login).toHaveBeenCalledWith("admin", "secret123", "tenant-one");
    });
    expect(localStorage.getItem("cashio-recent-tenants")).toBe(JSON.stringify(["tenant-one"]));

    rerender(<Login />);

    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalledWith("welcomeBack");
      expect(mocks.navigate).toHaveBeenCalledWith("/", { replace: true });
    });
  });

  it("shows recent tenants and allows quick selection", async () => {
    localStorage.setItem("cashio-recent-tenants", JSON.stringify(["tenant-one", "tenant-two"]));
    mocks.lookupBySlug.mockResolvedValue({ data: { name: "Tenant One", slug: "tenant-one" } });

    renderWithRouter(<Login />);

    fireEvent.click(screen.getByRole("button", { name: "tenant-one" }));

    await waitFor(() => {
      expect(mocks.lookupBySlug).toHaveBeenCalledWith("tenant-one");
      expect(screen.getByText("Logging into: Tenant One")).toBeInTheDocument();
    });
  });

  it("lets platform admins skip tenant selection", async () => {
    renderWithRouter(<Login />);

    fireEvent.click(screen.getByRole("button", { name: "Login as Platform Admin" }));
    expect(screen.getByText("Platform Admin Login")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("admin"), { target: { value: "platform-admin" } });
    fireEvent.change(document.querySelector('input[type="password"]')!, { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "loginButton" }));

    await waitFor(() => {
      expect(mocks.login).toHaveBeenCalledWith("platform-admin", "secret123", undefined);
    });
  });

  it("shows a friendly inline error and clears it after input changes", async () => {
    mocks.login.mockRejectedValue({
      response: { status: 401, data: { error: "Invalid credentials" } },
    });

    const { container } = renderWithRouter(<Login />);

    fireEvent.click(screen.getByRole("button", { name: "Login as Platform Admin" }));
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
    expect(screen.queryByPlaceholderText("sri-sai-agro")).not.toBeInTheDocument();
  });
});

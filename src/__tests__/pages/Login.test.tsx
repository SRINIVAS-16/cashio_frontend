import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  login: vi.fn(),
  toastSuccess: vi.fn(),
  authState: {
    user: null as null | { id: number; name: string; role?: string },
    isLoading: false,
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

vi.mock("react-hot-toast", () => ({
  default: { success: mocks.toastSuccess },
  toast: { success: mocks.toastSuccess },
}));

import Login from "../../pages/Login";
import { renderWithRouter } from "./testUtils";

describe.skip("Login page", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.navigate.mockReset();
    mocks.login.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.authState.user = null;
    mocks.authState.isLoading = false;
  });

  it("renders the single-step login form and shop details", () => {
    renderWithRouter(<Login />);

    expect(screen.getByRole("heading", { name: "Test Shop" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Tenant Code")).toBeRequired();
    expect(screen.getByPlaceholderText("Username")).toBeRequired();
    expect(screen.getByPlaceholderText("Password")).toBeRequired();
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByText("Platform admin? Use code: PLATFORM")).toBeInTheDocument();
  });

  it("submits tenant code credentials and stores recent codes", async () => {
    mocks.login.mockImplementation(async () => {
      mocks.authState.user = { id: 1, name: "Admin" } as any;
    });

    const { rerender } = renderWithRouter(<Login />);

    fireEvent.change(screen.getByPlaceholderText("Tenant Code"), { target: { value: "tenant-one" } });
    fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "admin" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(mocks.login).toHaveBeenCalledWith("tenant-one", "admin", "secret123");
    });
    expect(localStorage.getItem("cashio-recent-tenant-codes")).toBe(JSON.stringify(["tenant-one"]));

    rerender(<Login />);

    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalledWith("welcomeBack");
      expect(mocks.navigate).toHaveBeenCalledWith("/", { replace: true });
    });
  });

  it("shows recent codes and allows quick selection", () => {
    localStorage.setItem("cashio-recent-tenant-codes", JSON.stringify(["tenant-one", "tenant-two"]));

    renderWithRouter(<Login />);

    fireEvent.click(screen.getByRole("button", { name: "tenant-one" }));

    expect(screen.getByPlaceholderText("Tenant Code")).toHaveValue("tenant-one");
  });

  it("normalizes PLATFORM tenant code for super admin logins", async () => {
    renderWithRouter(<Login />);

    fireEvent.change(screen.getByPlaceholderText("Tenant Code"), { target: { value: "platform" } });
    fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "platform-admin" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(mocks.login).toHaveBeenCalledWith("PLATFORM", "platform-admin", "secret123");
    });
  });

  it("shows a friendly inline error and clears it after input changes", async () => {
    mocks.login.mockRejectedValue({
      response: { status: 401, data: { error: "Invalid credentials" } },
    });

    renderWithRouter(<Login />);

    fireEvent.change(screen.getByPlaceholderText("Tenant Code"), { target: { value: "tenant-one" } });
    fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "admin" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Incorrect tenant code, username, or password. Please try again."
    );

    fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "admin2" } });

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});


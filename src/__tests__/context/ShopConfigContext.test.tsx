import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const tenantApiMocks = vi.hoisted(() => ({
  getShopDetails: vi.fn(),
  getSettings: vi.fn(),
  updateShopDetails: vi.fn(),
  updateSettings: vi.fn(),
}));

vi.mock("../../api/client", () => ({
  tenantApi: tenantApiMocks,
}));

import { ShopConfigProvider, useShopConfig } from "../../context/ShopConfigContext";

function Consumer() {
  const { shop, localLanguage, themeColor, updateShop, updateLocalLanguage, updateThemeColor, loading, reload } = useShopConfig();

  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="name">{shop.name}</div>
      <div data-testid="phone">{shop.phone}</div>
      <div data-testid="email">{shop.email}</div>
      <div data-testid="lang">{localLanguage}</div>
      <div data-testid="theme">{themeColor}</div>
      <button onClick={() => void updateShop({ name: "Updated Shop", phone: "1234567890", gst: "GST999" })}>update</button>
      <button onClick={() => void updateLocalLanguage("hi")}>update-language</button>
      <button onClick={() => void updateThemeColor("emerald")}>update-theme</button>
      <button onClick={() => void reload()}>reload</button>
    </div>
  );
}

describe("ShopConfigContext", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    tenantApiMocks.getShopDetails.mockResolvedValue({
      data: {
        name: "Test Shop",
        nameLocal: "టెస్ట్ షాప్",
        tagline: "Best inputs",
        taglineLocal: "బెస్ట్",
        phone: "9999999999",
        altPhone: "8888888888",
        gstNo: "GST123",
        address: "Main road",
        addressLocal: "మెయిన్ రోడ్",
        district: "East Godavari",
        districtLocal: "ఈస్ట్ గోదావరి",
        email: "shop@example.com",
        logo: "/logo.svg",
      },
    });
    tenantApiMocks.getSettings.mockResolvedValue({
      data: { localLanguage: "te", themeColor: "blue" },
    });
    tenantApiMocks.updateShopDetails.mockResolvedValue({
      data: {
        name: "Updated Shop",
        nameLocal: "టెస్ట్ షాప్",
        tagline: "Best inputs",
        taglineLocal: "బెస్ట్",
        phone: "1234567890",
        altPhone: "8888888888",
        gstNo: "GST999",
        address: "Main road",
        addressLocal: "మెయిన్ రోడ్",
        district: "East Godavari",
        districtLocal: "ఈస్ట్ గోదావరి",
        email: "shop@example.com",
        logo: "/logo.svg",
      },
    });
    tenantApiMocks.updateSettings.mockImplementation(async (updates: { localLanguage?: string; themeColor?: string }) => ({
      data: {
        localLanguage: updates.localLanguage ?? "te",
        themeColor: updates.themeColor ?? "blue",
      },
    }));
  });

  it("provides the default shop config when no tenant session is available", async () => {
    render(
      <ShopConfigProvider>
        <Consumer />
      </ShopConfigProvider>
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

    expect(tenantApiMocks.getShopDetails).not.toHaveBeenCalled();
    expect(tenantApiMocks.getSettings).not.toHaveBeenCalled();
    expect(screen.getByTestId("name")).toBeEmptyDOMElement();
    expect(screen.getByTestId("phone")).toBeEmptyDOMElement();
    expect(screen.getByTestId("email")).toBeEmptyDOMElement();
    expect(screen.getByTestId("lang")).toHaveTextContent("te");
    expect(screen.getByTestId("theme")).toHaveTextContent("blue");
  });

  it("loads shop config and tenant settings from the API", async () => {
    localStorage.setItem("token", "fake-token");
    localStorage.setItem("user", JSON.stringify({ id: 1, role: "admin", tenantId: "tenant-1" }));

    render(
      <ShopConfigProvider>
        <Consumer />
      </ShopConfigProvider>
    );

    await waitFor(() => expect(screen.getByTestId("name")).toHaveTextContent("Test Shop"));

    expect(tenantApiMocks.getShopDetails).toHaveBeenCalledTimes(1);
    expect(tenantApiMocks.getSettings).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("phone")).toHaveTextContent("9999999999");
    expect(screen.getByTestId("email")).toHaveTextContent("shop@example.com");
    expect(screen.getByTestId("lang")).toHaveTextContent("te");
    expect(screen.getByTestId("theme")).toHaveTextContent("blue");
  });

  it("falls back to defaults when API loading fails", async () => {
    localStorage.setItem("token", "fake-token");
    localStorage.setItem("user", JSON.stringify({ id: 1, role: "admin", tenantId: "tenant-1" }));
    tenantApiMocks.getShopDetails.mockRejectedValueOnce(new Error("fail"));

    render(
      <ShopConfigProvider>
        <Consumer />
      </ShopConfigProvider>
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

    expect(screen.getByTestId("name")).toBeEmptyDOMElement();
    expect(screen.getByTestId("lang")).toHaveTextContent("te");
    expect(screen.getByTestId("theme")).toHaveTextContent("blue");
  });

  it("updates shop details, tenant settings, and can reload from the API", async () => {
    localStorage.setItem("token", "fake-token");
    localStorage.setItem("user", JSON.stringify({ id: 1, role: "admin", tenantId: "tenant-1" }));

    render(
      <ShopConfigProvider>
        <Consumer />
      </ShopConfigProvider>
    );

    await waitFor(() => expect(screen.getByTestId("name")).toHaveTextContent("Test Shop"));

    fireEvent.click(screen.getByRole("button", { name: "update" }));
    await waitFor(() => {
      expect(tenantApiMocks.updateShopDetails).toHaveBeenCalledWith({
        name: "Updated Shop",
        phone: "1234567890",
        gstNo: "GST999",
      });
    });
    expect(screen.getByTestId("name")).toHaveTextContent("Updated Shop");
    expect(screen.getByTestId("phone")).toHaveTextContent("1234567890");

    fireEvent.click(screen.getByRole("button", { name: "update-language" }));
    await waitFor(() => expect(tenantApiMocks.updateSettings).toHaveBeenCalledWith({ localLanguage: "hi" }));
    expect(screen.getByTestId("lang")).toHaveTextContent("hi");

    fireEvent.click(screen.getByRole("button", { name: "update-theme" }));
    await waitFor(() => expect(tenantApiMocks.updateSettings).toHaveBeenCalledWith({ themeColor: "emerald" }));
    expect(screen.getByTestId("theme")).toHaveTextContent("emerald");

    fireEvent.click(screen.getByRole("button", { name: "reload" }));
    await waitFor(() => expect(tenantApiMocks.getShopDetails).toHaveBeenCalledTimes(2));
    expect(tenantApiMocks.getSettings).toHaveBeenCalledTimes(2);
  });
});

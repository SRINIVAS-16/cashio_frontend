import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { ShopConfigProvider, useShopConfig } from "../../context/ShopConfigContext";
import { defaultShopConfig } from "../../config/shopConfig";

function Consumer() {
  const { shop, updateShop } = useShopConfig();

  return (
    <div>
      <div data-testid="name">{shop.name}</div>
      <div data-testid="phone">{shop.phone}</div>
      <div data-testid="email">{shop.email}</div>
      <button onClick={() => updateShop({ name: "Updated Shop", phone: "1234567890" })}>update</button>
    </div>
  );
}

describe("ShopConfigContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("provides the default shop config when nothing is stored", () => {
    render(
      <ShopConfigProvider>
        <Consumer />
      </ShopConfigProvider>
    );

    expect(screen.getByTestId("name")).toHaveTextContent(defaultShopConfig.name);
    expect(screen.getByTestId("phone")).toHaveTextContent(defaultShopConfig.phone);
    expect(screen.getByTestId("email")).toHaveTextContent(defaultShopConfig.email);
  });

  it("merges stored config values with defaults", () => {
    localStorage.setItem("cashio-shop-config", JSON.stringify({ name: "Stored Shop", phone: "9999999999" }));

    render(
      <ShopConfigProvider>
        <Consumer />
      </ShopConfigProvider>
    );

    expect(screen.getByTestId("name")).toHaveTextContent("Stored Shop");
    expect(screen.getByTestId("phone")).toHaveTextContent("9999999999");
    expect(screen.getByTestId("email")).toHaveTextContent(defaultShopConfig.email);
  });

  it("falls back to defaults when local storage contains invalid JSON", () => {
    localStorage.setItem("cashio-shop-config", "not-json");

    render(
      <ShopConfigProvider>
        <Consumer />
      </ShopConfigProvider>
    );

    expect(screen.getByTestId("name")).toHaveTextContent(defaultShopConfig.name);
  });

  it("updates the shop config and persists the merged value", () => {
    render(
      <ShopConfigProvider>
        <Consumer />
      </ShopConfigProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "update" }));

    expect(screen.getByTestId("name")).toHaveTextContent("Updated Shop");
    expect(screen.getByTestId("phone")).toHaveTextContent("1234567890");
    expect(JSON.parse(localStorage.getItem("cashio-shop-config") || "{}")).toMatchObject({
      name: "Updated Shop",
      phone: "1234567890",
      email: defaultShopConfig.email,
    });
  });
});

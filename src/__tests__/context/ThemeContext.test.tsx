import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";

const shopConfigMock = vi.hoisted(() => ({
  themeColor: "blue",
  updateThemeColor: vi.fn(),
}));

vi.mock("../../context/ShopConfigContext", () => ({
  useShopConfig: () => ({
    themeColor: shopConfigMock.themeColor,
    updateThemeColor: shopConfigMock.updateThemeColor,
  }),
}));

import { ThemeProvider, useTheme, themes } from "../../context/ThemeContext";

function Consumer() {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <div data-testid="theme">{theme}</div>
      <button onClick={() => setTheme("emerald")}>set-emerald</button>
    </div>
  );
}

describe("ThemeContext", () => {
  beforeEach(() => {
    shopConfigMock.themeColor = "blue";
    shopConfigMock.updateThemeColor.mockReset().mockResolvedValue(undefined);
    document.documentElement.removeAttribute("data-theme");
  });

  it("exports theme metadata and defaults to blue", () => {
    shopConfigMock.themeColor = "invalid-theme";

    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    expect(themes.map((theme) => theme.key)).toEqual(["blue", "emerald", "purple", "orange", "rose"]);
    expect(screen.getByTestId("theme")).toHaveTextContent("blue");
    expect(document.documentElement).toHaveAttribute("data-theme", "blue");
  });

  it("uses the theme color from shop config when it is valid", () => {
    shopConfigMock.themeColor = "purple";

    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("purple");
    expect(document.documentElement).toHaveAttribute("data-theme", "purple");
  });

  it("switches theme colors and persists the selection through shop config", () => {
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "set-emerald" }));

    expect(screen.getByTestId("theme")).toHaveTextContent("emerald");
    expect(document.documentElement).toHaveAttribute("data-theme", "emerald");
    expect(shopConfigMock.updateThemeColor).toHaveBeenCalledWith("emerald");
  });
});

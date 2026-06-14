import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
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

describe.skip("ThemeContext", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("exports theme metadata and defaults to blue", () => {
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    expect(themes.map((theme) => theme.key)).toEqual(["blue", "emerald", "purple", "orange", "rose"]);
    expect(screen.getByTestId("theme")).toHaveTextContent("blue");
    expect(document.documentElement).toHaveAttribute("data-theme", "blue");
    expect(localStorage.getItem("cashio-theme")).toBe("blue");
  });

  it("restores a saved valid theme and ignores invalid values", () => {
    localStorage.setItem("cashio-theme", "purple");

    const { unmount } = render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("purple");
    expect(document.documentElement).toHaveAttribute("data-theme", "purple");
    unmount();

    localStorage.setItem("cashio-theme", "invalid-theme");
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("blue");
    expect(document.documentElement).toHaveAttribute("data-theme", "blue");
  });

  it("switches theme colors and persists the selection", () => {
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "set-emerald" }));

    expect(screen.getByTestId("theme")).toHaveTextContent("emerald");
    expect(document.documentElement).toHaveAttribute("data-theme", "emerald");
    expect(localStorage.getItem("cashio-theme")).toBe("emerald");
  });
});


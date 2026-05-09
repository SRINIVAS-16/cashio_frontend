import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LanguageProvider, useLang } from "../../context/LanguageContext";
import hi from "../../i18n/hi";

function Consumer() {
  const { lang, t, setLang, languages } = useLang();

  return (
    <div>
      <div data-testid="lang">{lang}</div>
      <div data-testid="dashboard">{t.dashboard}</div>
      <div data-testid="count">{languages.length}</div>
      <button onClick={() => setLang("te")}>switch-telugu</button>
      <button onClick={() => setLang("hi")}>switch-hindi</button>
    </div>
  );
}

describe("LanguageContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders children with the saved language and translations", async () => {
    localStorage.setItem("lang", "te");

    render(
      <LanguageProvider>
        <div>child</div>
        <Consumer />
      </LanguageProvider>
    );

    expect(screen.getByText("child")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("dashboard")).toHaveTextContent("డాష్‌బోర్డ్"));
    expect(screen.getByTestId("lang")).toHaveTextContent("te");
    expect(screen.getByTestId("count")).toHaveTextContent("11");
  });

  it("switches languages and persists a bundled translation", async () => {
    render(
      <LanguageProvider>
        <Consumer />
      </LanguageProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "switch-telugu" }));

    await waitFor(() => expect(screen.getByTestId("dashboard")).toHaveTextContent("డాష్‌బోర్డ్"));
    expect(screen.getByTestId("lang")).toHaveTextContent("te");
    expect(localStorage.getItem("lang")).toBe("te");
  });

  it("loads lazy translations when switching to a non-bundled language", async () => {
    render(
      <LanguageProvider>
        <Consumer />
      </LanguageProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "switch-hindi" }));

    await waitFor(() => expect(screen.getByTestId("dashboard")).toHaveTextContent(hi.dashboard));
    expect(screen.getByTestId("lang")).toHaveTextContent("hi");
    expect(localStorage.getItem("lang")).toBe("hi");
  });

  it("throws when useLang is used outside the provider", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const Broken = () => {
      useLang();
      return null;
    };

    expect(() => render(<Broken />)).toThrow("useLang must be used within LanguageProvider");
    errorSpy.mockRestore();
  });
});

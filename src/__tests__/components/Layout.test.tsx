import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";

vi.mock("../../components/Sidebar", () => ({
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) => (
    <div data-testid="sidebar" data-open={String(open)}>
      <button onClick={onClose}>close-sidebar</button>
    </div>
  ),
}));

import Layout from "../../components/Layout";

describe.skip("Layout", () => {
  it("renders the sidebar shell and outlet content", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<div>Dashboard page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId("sidebar")).toHaveAttribute("data-open", "false");
    expect(screen.getByText("Amrutha Lakshmi Fertilisers")).toBeInTheDocument();
    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
  });

  it("opens the sidebar from the mobile menu button and closes it again", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<div>Dashboard page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    const menuButton = container.querySelector("header button") as HTMLButtonElement;
    fireEvent.click(menuButton);
    expect(screen.getByTestId("sidebar")).toHaveAttribute("data-open", "true");

    fireEvent.click(screen.getByRole("button", { name: "close-sidebar" }));
    expect(screen.getByTestId("sidebar")).toHaveAttribute("data-open", "false");
  });
});


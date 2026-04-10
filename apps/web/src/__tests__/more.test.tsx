import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MorePage from "../app/(app)/more/page";

describe("MorePage", () => {
  describe("header", () => {
    it("renders page title", () => {
      render(<MorePage />);
      expect(screen.getByRole("heading", { level: 1, name: "More" })).toBeInTheDocument();
    });
  });

  describe("menu items", () => {
    const menuItems = [
      { label: "Inbox", description: "Unprocessed captures" },
      { label: "Weekly Review", description: "Review and plan your week" },
      { label: "Analytics", description: "Time tracking insights" },
      { label: "Projects", description: "Manage your projects" },
      { label: "Habits", description: "Configure habits and routines" },
      { label: "Settings", description: "Preferences and account" },
    ];

    it("renders all six menu items", () => {
      render(<MorePage />);
      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(6);
    });

    it.each(menuItems)(
      "renders $label menu item",
      ({ label }) => {
        render(<MorePage />);
        expect(screen.getByText(label)).toBeInTheDocument();
      }
    );

    it.each(menuItems)(
      "shows description for $label",
      ({ description }) => {
        render(<MorePage />);
        expect(screen.getByText(description)).toBeInTheDocument();
      }
    );
  });

  describe("badge count", () => {
    it("shows badge with count 4 on Inbox", () => {
      render(<MorePage />);
      expect(screen.getByText("4")).toBeInTheDocument();
    });

    it("only shows badge on items with count > 0", () => {
      render(<MorePage />);
      // Only the Inbox has a count badge (4)
      // There should be exactly 1 badge element
      const badges = screen.getAllByText(/^\d+$/).filter(
        (el) => el.className.includes("rounded-full") && el.className.includes("bg-[var(--atlas-accent)]")
      );
      expect(badges).toHaveLength(1);
    });
  });

  describe("chevron icons", () => {
    it("renders a chevron icon for each menu item", () => {
      const { container } = render(<MorePage />);
      const chevronSvgs = container.querySelectorAll('svg[width="16"][height="16"]');
      expect(chevronSvgs).toHaveLength(6);
    });
  });

  describe("menu item structure", () => {
    it("each item is a button element", () => {
      render(<MorePage />);
      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(6);
      for (const button of buttons) {
        expect(button.tagName).toBe("BUTTON");
      }
    });

    it("each item has text-left alignment", () => {
      render(<MorePage />);
      const buttons = screen.getAllByRole("button");
      for (const button of buttons) {
        expect(button.className).toContain("text-left");
      }
    });
  });
});

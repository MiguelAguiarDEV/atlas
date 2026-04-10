import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PriorityBadge } from "./priority-badge";

describe("PriorityBadge", () => {
  describe("rendering", () => {
    it("renders as an inline element", () => {
      const { container } = render(<PriorityBadge priority={0} />);
      expect(container.querySelector("span")).toBeInTheDocument();
    });
  });

  describe("priority labels", () => {
    const labelCases = [
      { priority: 0 as const, label: "P0" },
      { priority: 1 as const, label: "P1" },
      { priority: 2 as const, label: "P2" },
      { priority: 3 as const, label: "P3" },
    ];

    it.each(labelCases)(
      "renders $label for priority $priority",
      ({ priority, label }) => {
        render(<PriorityBadge priority={priority} />);
        expect(screen.getByText(label)).toBeInTheDocument();
      }
    );
  });

  describe("priority colors", () => {
    const colorCases = [
      { priority: 0 as const, textColor: "text-red-400", bgColor: "bg-red-400/15", dotColor: "bg-red-400" },
      { priority: 1 as const, textColor: "text-orange-400", bgColor: "bg-orange-400/15", dotColor: "bg-orange-400" },
      { priority: 2 as const, textColor: "text-blue-400", bgColor: "bg-blue-400/15", dotColor: "bg-blue-400" },
      { priority: 3 as const, textColor: "text-zinc-400", bgColor: "bg-zinc-400/15", dotColor: "bg-zinc-400" },
    ];

    it.each(colorCases)(
      "applies $textColor text for priority $priority",
      ({ priority, textColor }) => {
        render(<PriorityBadge priority={priority} />);
        const badge = screen.getByText(`P${priority}`).closest("span");
        expect(badge?.className).toContain(textColor);
      }
    );

    it.each(colorCases)(
      "applies $bgColor background for priority $priority",
      ({ priority, bgColor }) => {
        render(<PriorityBadge priority={priority} />);
        const badge = screen.getByText(`P${priority}`).closest("span");
        expect(badge?.className).toContain(bgColor);
      }
    );

    it.each(colorCases)(
      "renders colored dot with $dotColor for priority $priority",
      ({ priority, dotColor }) => {
        const { container } = render(<PriorityBadge priority={priority} />);
        const dot = container.querySelector("span > span:first-child");
        expect(dot?.className).toContain(dotColor);
      }
    );
  });

  describe("dot indicator", () => {
    it("renders a small circular dot", () => {
      const { container } = render(<PriorityBadge priority={0} />);
      const dot = container.querySelector("span > span:first-child");
      expect(dot?.className).toContain("h-1.5");
      expect(dot?.className).toContain("w-1.5");
      expect(dot?.className).toContain("rounded-full");
    });
  });

  describe("custom className", () => {
    it("appends custom className", () => {
      render(<PriorityBadge priority={0} className="custom-class" />);
      const badge = screen.getByText("P0").closest("span");
      expect(badge?.className).toContain("custom-class");
    });

    it("preserves base classes alongside custom className", () => {
      render(<PriorityBadge priority={0} className="extra" />);
      const badge = screen.getByText("P0").closest("span");
      expect(badge?.className).toContain("rounded-md");
      expect(badge?.className).toContain("extra");
    });
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HabitCheck } from "./habit-check";

describe("HabitCheck", () => {
  const defaultProps = {
    id: "habit-1",
    label: "Morning exercise",
  };

  describe("rendering", () => {
    it("renders the label", () => {
      render(<HabitCheck {...defaultProps} />);
      expect(screen.getByText("Morning exercise")).toBeInTheDocument();
    });

    it("renders as a button", () => {
      render(<HabitCheck {...defaultProps} />);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("renders unchecked by default", () => {
      const { container } = render(<HabitCheck {...defaultProps} />);
      // Unchecked state: no CheckIcon SVG inside the circle
      const circle = container.querySelector(".rounded-full");
      expect(circle?.className).toContain("border-[var(--atlas-border)]");
    });
  });

  describe("checked state", () => {
    it("renders checked when defaultChecked is true", () => {
      const { container } = render(<HabitCheck {...defaultProps} defaultChecked />);
      const circle = container.querySelector(".rounded-full");
      expect(circle?.className).toContain("border-[var(--atlas-success)]");
      expect(circle?.className).toContain("bg-[var(--atlas-success)]");
    });

    it("shows check icon when checked", () => {
      const { container } = render(<HabitCheck {...defaultProps} defaultChecked />);
      const circle = container.querySelector(".rounded-full");
      expect(circle?.querySelector("svg")).toBeInTheDocument();
    });

    it("does not show check icon when unchecked", () => {
      const { container } = render(<HabitCheck {...defaultProps} />);
      const circle = container.querySelector(".rounded-full");
      expect(circle?.querySelector("svg")).not.toBeInTheDocument();
    });

    it("applies success text color to label when checked", () => {
      render(<HabitCheck {...defaultProps} defaultChecked />);
      const label = screen.getByText("Morning exercise");
      expect(label.className).toContain("text-[var(--atlas-success)]");
    });

    it("applies success background to container when checked", () => {
      render(<HabitCheck {...defaultProps} defaultChecked />);
      const button = screen.getByRole("button");
      expect(button.className).toContain("bg-[var(--atlas-success)]/10");
    });

    it("applies surface background when unchecked", () => {
      render(<HabitCheck {...defaultProps} />);
      const button = screen.getByRole("button");
      expect(button.className).toContain("bg-[var(--atlas-surface)]");
    });
  });

  describe("toggle behavior", () => {
    it("toggles to checked on click", () => {
      const { container } = render(<HabitCheck {...defaultProps} />);
      fireEvent.click(screen.getByRole("button"));
      const circle = container.querySelector(".rounded-full");
      expect(circle?.className).toContain("bg-[var(--atlas-success)]");
    });

    it("toggles back to unchecked on second click", () => {
      const { container } = render(<HabitCheck {...defaultProps} />);
      fireEvent.click(screen.getByRole("button"));
      fireEvent.click(screen.getByRole("button"));
      const circle = container.querySelector(".rounded-full");
      expect(circle?.className).toContain("border-[var(--atlas-border)]");
    });

    it("calls onToggle with id and new checked state", () => {
      const onToggle = vi.fn();
      render(<HabitCheck {...defaultProps} onToggle={onToggle} />);
      fireEvent.click(screen.getByRole("button"));
      expect(onToggle).toHaveBeenCalledWith("habit-1", true);
    });

    it("calls onToggle with false when unchecking", () => {
      const onToggle = vi.fn();
      render(<HabitCheck {...defaultProps} defaultChecked onToggle={onToggle} />);
      fireEvent.click(screen.getByRole("button"));
      expect(onToggle).toHaveBeenCalledWith("habit-1", false);
    });

    it("works without onToggle prop", () => {
      render(<HabitCheck {...defaultProps} />);
      expect(() => fireEvent.click(screen.getByRole("button"))).not.toThrow();
    });
  });

  describe("streak display", () => {
    it("shows streak count when streak > 0", () => {
      render(<HabitCheck {...defaultProps} streak={12} />);
      expect(screen.getByText("12d")).toBeInTheDocument();
    });

    it("does not show streak when streak is 0", () => {
      render(<HabitCheck {...defaultProps} streak={0} />);
      expect(screen.queryByText("0d")).not.toBeInTheDocument();
    });

    it("does not show streak when streak is not provided", () => {
      render(<HabitCheck {...defaultProps} />);
      expect(screen.queryByText(/\dd$/)).not.toBeInTheDocument();
    });

    it("shows correct streak for various values", () => {
      const { rerender } = render(<HabitCheck {...defaultProps} streak={1} />);
      expect(screen.getByText("1d")).toBeInTheDocument();

      rerender(<HabitCheck {...defaultProps} streak={365} />);
      expect(screen.getByText("365d")).toBeInTheDocument();
    });
  });

  describe("custom className", () => {
    it("appends custom className to button", () => {
      render(<HabitCheck {...defaultProps} className="custom-class" />);
      expect(screen.getByRole("button")).toHaveClass("custom-class");
    });
  });
});

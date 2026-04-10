import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EnergySelector } from "./energy-selector";

describe("EnergySelector", () => {
  describe("rendering", () => {
    it("renders three energy level options", () => {
      render(<EnergySelector />);
      expect(screen.getByText("High")).toBeInTheDocument();
      expect(screen.getByText("Medium")).toBeInTheDocument();
      expect(screen.getByText("Low")).toBeInTheDocument();
    });

    it("renders three buttons", () => {
      render(<EnergySelector />);
      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(3);
    });

    it("all options are unselected by default", () => {
      render(<EnergySelector />);
      const buttons = screen.getAllByRole("button");
      for (const button of buttons) {
        expect(button.className).toContain("border-[var(--atlas-border)]");
      }
    });
  });

  describe("default value", () => {
    it("shows high as selected when defaultValue is high", () => {
      render(<EnergySelector defaultValue="high" />);
      const highButton = screen.getByText("High").closest("button");
      expect(highButton?.className).toContain("bg-green-500/20");
    });

    it("shows medium as selected when defaultValue is medium", () => {
      render(<EnergySelector defaultValue="medium" />);
      const mediumButton = screen.getByText("Medium").closest("button");
      expect(mediumButton?.className).toContain("bg-yellow-500/20");
    });

    it("shows low as selected when defaultValue is low", () => {
      render(<EnergySelector defaultValue="low" />);
      const lowButton = screen.getByText("Low").closest("button");
      expect(lowButton?.className).toContain("bg-zinc-500/20");
    });
  });

  describe("selection behavior", () => {
    it("selects an option on click", () => {
      render(<EnergySelector />);
      fireEvent.click(screen.getByText("High"));
      const highButton = screen.getByText("High").closest("button");
      expect(highButton?.className).toContain("bg-green-500/20");
    });

    it("deselects previous option when new one is clicked", () => {
      render(<EnergySelector />);
      fireEvent.click(screen.getByText("High"));
      fireEvent.click(screen.getByText("Low"));

      const highButton = screen.getByText("High").closest("button");
      const lowButton = screen.getByText("Low").closest("button");
      expect(highButton?.className).toContain("border-[var(--atlas-border)]");
      expect(lowButton?.className).toContain("bg-zinc-500/20");
    });

    it("applies green active color when high is selected", () => {
      render(<EnergySelector />);
      fireEvent.click(screen.getByText("High"));
      expect(screen.getByText("High").closest("button")?.className).toContain("text-green-400");
    });

    it("applies yellow active color when medium is selected", () => {
      render(<EnergySelector />);
      fireEvent.click(screen.getByText("Medium"));
      expect(screen.getByText("Medium").closest("button")?.className).toContain("text-yellow-400");
    });

    it("applies zinc active color when low is selected", () => {
      render(<EnergySelector />);
      fireEvent.click(screen.getByText("Low"));
      expect(screen.getByText("Low").closest("button")?.className).toContain("text-zinc-400");
    });
  });

  describe("onChange callback", () => {
    it("calls onChange with selected level", () => {
      const onChange = vi.fn();
      render(<EnergySelector onChange={onChange} />);
      fireEvent.click(screen.getByText("Medium"));
      expect(onChange).toHaveBeenCalledWith("medium");
    });

    it("calls onChange each time a level is selected", () => {
      const onChange = vi.fn();
      render(<EnergySelector onChange={onChange} />);
      fireEvent.click(screen.getByText("High"));
      fireEvent.click(screen.getByText("Low"));
      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onChange).toHaveBeenNthCalledWith(1, "high");
      expect(onChange).toHaveBeenNthCalledWith(2, "low");
    });

    it("works without onChange prop", () => {
      render(<EnergySelector />);
      // Should not throw
      expect(() => fireEvent.click(screen.getByText("High"))).not.toThrow();
    });
  });

  describe("custom className", () => {
    it("appends custom className to container", () => {
      const { container } = render(<EnergySelector className="custom-class" />);
      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("icons", () => {
    it("renders an SVG icon for each option", () => {
      const { container } = render(<EnergySelector />);
      const svgs = container.querySelectorAll("svg");
      expect(svgs.length).toBe(3);
    });
  });
});

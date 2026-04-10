import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuickCapture } from "./quick-capture";

describe("QuickCapture", () => {
  describe("rendering", () => {
    it("renders an input field", () => {
      render(<QuickCapture />);
      expect(screen.getByPlaceholderText("Quick capture...")).toBeInTheDocument();
    });

    it("renders a submit button", () => {
      render(<QuickCapture />);
      expect(screen.getByRole("button", { name: "Add task" })).toBeInTheDocument();
    });

    it("input starts empty", () => {
      render(<QuickCapture />);
      expect(screen.getByPlaceholderText("Quick capture...")).toHaveValue("");
    });

    it("submit button is disabled when input is empty", () => {
      render(<QuickCapture />);
      expect(screen.getByRole("button", { name: "Add task" })).toBeDisabled();
    });
  });

  describe("input behavior", () => {
    it("updates value as user types", () => {
      render(<QuickCapture />);
      const input = screen.getByPlaceholderText("Quick capture...");
      fireEvent.change(input, { target: { value: "New task" } });
      expect(input).toHaveValue("New task");
    });

    it("enables submit button when input has value", () => {
      render(<QuickCapture />);
      const input = screen.getByPlaceholderText("Quick capture...");
      fireEvent.change(input, { target: { value: "Something" } });
      expect(screen.getByRole("button", { name: "Add task" })).not.toBeDisabled();
    });

    it("keeps submit button disabled for whitespace-only input", () => {
      render(<QuickCapture />);
      const input = screen.getByPlaceholderText("Quick capture...");
      fireEvent.change(input, { target: { value: "   " } });
      expect(screen.getByRole("button", { name: "Add task" })).toBeDisabled();
    });
  });

  describe("submit via button click", () => {
    it("calls onCapture with trimmed value on button click", () => {
      const onCapture = vi.fn();
      render(<QuickCapture onCapture={onCapture} />);
      const input = screen.getByPlaceholderText("Quick capture...");
      fireEvent.change(input, { target: { value: "  New task  " } });
      fireEvent.click(screen.getByRole("button", { name: "Add task" }));
      expect(onCapture).toHaveBeenCalledWith("New task");
    });

    it("clears input after submit", () => {
      const onCapture = vi.fn();
      render(<QuickCapture onCapture={onCapture} />);
      const input = screen.getByPlaceholderText("Quick capture...");
      fireEvent.change(input, { target: { value: "Task to add" } });
      fireEvent.click(screen.getByRole("button", { name: "Add task" }));
      expect(input).toHaveValue("");
    });

    it("does not call onCapture when input is empty", () => {
      const onCapture = vi.fn();
      render(<QuickCapture onCapture={onCapture} />);
      fireEvent.click(screen.getByRole("button", { name: "Add task" }));
      expect(onCapture).not.toHaveBeenCalled();
    });

    it("does not call onCapture when input is only whitespace", () => {
      const onCapture = vi.fn();
      render(<QuickCapture onCapture={onCapture} />);
      const input = screen.getByPlaceholderText("Quick capture...");
      fireEvent.change(input, { target: { value: "   " } });
      // The button is disabled but let's also verify the handler guards
      fireEvent.click(screen.getByRole("button", { name: "Add task" }));
      expect(onCapture).not.toHaveBeenCalled();
    });
  });

  describe("submit via Enter key", () => {
    it("calls onCapture when Enter is pressed", () => {
      const onCapture = vi.fn();
      render(<QuickCapture onCapture={onCapture} />);
      const input = screen.getByPlaceholderText("Quick capture...");
      fireEvent.change(input, { target: { value: "Enter task" } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(onCapture).toHaveBeenCalledWith("Enter task");
    });

    it("clears input after Enter submit", () => {
      const onCapture = vi.fn();
      render(<QuickCapture onCapture={onCapture} />);
      const input = screen.getByPlaceholderText("Quick capture...");
      fireEvent.change(input, { target: { value: "Task" } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(input).toHaveValue("");
    });

    it("does not submit on other keys", () => {
      const onCapture = vi.fn();
      render(<QuickCapture onCapture={onCapture} />);
      const input = screen.getByPlaceholderText("Quick capture...");
      fireEvent.change(input, { target: { value: "Task" } });
      fireEvent.keyDown(input, { key: "Escape" });
      expect(onCapture).not.toHaveBeenCalled();
    });
  });

  describe("without onCapture prop", () => {
    it("does not throw when submitted without onCapture", () => {
      render(<QuickCapture />);
      const input = screen.getByPlaceholderText("Quick capture...");
      fireEvent.change(input, { target: { value: "Task" } });
      expect(() => fireEvent.keyDown(input, { key: "Enter" })).not.toThrow();
    });
  });

  describe("custom className", () => {
    it("appends custom className to container", () => {
      const { container } = render(<QuickCapture className="custom-class" />);
      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("submit button icon", () => {
    it("renders an SVG icon in the submit button", () => {
      render(<QuickCapture />);
      const button = screen.getByRole("button", { name: "Add task" });
      expect(button.querySelector("svg")).toBeInTheDocument();
    });
  });
});

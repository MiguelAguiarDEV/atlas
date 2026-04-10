import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TodayPage from "../app/(app)/today/page";

// Mock the date to control greeting
const mockDate = (hour: number) => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 3, 9, hour, 0, 0));
};

describe("TodayPage", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  describe("greeting", () => {
    it("shows 'Good morning' before noon", () => {
      mockDate(9);
      render(<TodayPage />);
      expect(screen.getByText("Good morning")).toBeInTheDocument();
      vi.useRealTimers();
    });

    it("shows 'Good afternoon' between noon and 5pm", () => {
      mockDate(14);
      render(<TodayPage />);
      expect(screen.getByText("Good afternoon")).toBeInTheDocument();
      vi.useRealTimers();
    });

    it("shows 'Good evening' after 5pm", () => {
      mockDate(20);
      render(<TodayPage />);
      expect(screen.getByText("Good evening")).toBeInTheDocument();
      vi.useRealTimers();
    });

    it("renders greeting as an h1 heading", () => {
      render(<TodayPage />);
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toBeInTheDocument();
    });
  });

  describe("task summary", () => {
    it("shows task count", () => {
      render(<TodayPage />);
      expect(screen.getByText(/0\/5 tasks/)).toBeInTheDocument();
    });

    it("shows estimated time", () => {
      render(<TodayPage />);
      expect(screen.getByText(/~5h estimated/)).toBeInTheDocument();
    });
  });

  describe("energy selector", () => {
    it("renders energy level section heading", () => {
      render(<TodayPage />);
      expect(screen.getByText("Energy Level")).toBeInTheDocument();
    });

    it("renders three energy options", () => {
      render(<TodayPage />);
      expect(screen.getByText("High")).toBeInTheDocument();
      expect(screen.getByText("Medium")).toBeInTheDocument();
      expect(screen.getByText("Low")).toBeInTheDocument();
    });
  });

  describe("task list", () => {
    it("renders section heading", () => {
      render(<TodayPage />);
      expect(screen.getByText("Today's Tasks")).toBeInTheDocument();
    });

    it("renders all mock tasks", () => {
      render(<TodayPage />);
      expect(screen.getByText("Fix authentication middleware bug")).toBeInTheDocument();
      expect(screen.getByText("Design onboarding flow wireframes")).toBeInTheDocument();
      expect(screen.getByText("Write API documentation for /tasks endpoint")).toBeInTheDocument();
      expect(screen.getByText("Review pull request #42")).toBeInTheDocument();
      expect(screen.getByText("Update dependencies to latest versions")).toBeInTheDocument();
    });

    it("renders priority badges on tasks", () => {
      render(<TodayPage />);
      expect(screen.getByText("P0")).toBeInTheDocument();
      expect(screen.getAllByText("P1")).toHaveLength(2);
      expect(screen.getByText("P2")).toBeInTheDocument();
      expect(screen.getByText("P3")).toBeInTheDocument();
    });

    it("toggles task completion on click", () => {
      render(<TodayPage />);
      const checkboxButtons = screen.getAllByRole("button", { name: "Mark complete" });
      fireEvent.click(checkboxButtons[0]);
      expect(screen.getByRole("button", { name: "Mark incomplete" })).toBeInTheDocument();
    });
  });

  describe("habits section", () => {
    it("renders habits heading", () => {
      render(<TodayPage />);
      expect(screen.getByText("Habits")).toBeInTheDocument();
    });

    it("renders all mock habits", () => {
      render(<TodayPage />);
      expect(screen.getByText("Morning exercise")).toBeInTheDocument();
      expect(screen.getByText("Read 30 minutes")).toBeInTheDocument();
      expect(screen.getByText("Review inbox zero")).toBeInTheDocument();
    });

    it("shows streak counts", () => {
      render(<TodayPage />);
      expect(screen.getByText("12d")).toBeInTheDocument();
      expect(screen.getByText("5d")).toBeInTheDocument();
      expect(screen.getByText("3d")).toBeInTheDocument();
    });
  });

  describe("quick capture", () => {
    it("renders quick capture input", () => {
      render(<TodayPage />);
      expect(screen.getByPlaceholderText("Quick capture...")).toBeInTheDocument();
    });

    it("renders add task button", () => {
      render(<TodayPage />);
      expect(screen.getByRole("button", { name: "Add task" })).toBeInTheDocument();
    });

    it("adds a new task when captured", () => {
      render(<TodayPage />);
      const input = screen.getByPlaceholderText("Quick capture...");
      fireEvent.change(input, { target: { value: "New captured task" } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(screen.getByText("New captured task")).toBeInTheDocument();
    });

    it("updates task count after capture", () => {
      render(<TodayPage />);
      const input = screen.getByPlaceholderText("Quick capture...");
      fireEvent.change(input, { target: { value: "Extra task" } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(screen.getByText(/0\/6 tasks/)).toBeInTheDocument();
    });
  });
});

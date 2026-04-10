import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import TimerPage from "../app/(app)/timer/page";

describe("TimerPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("header", () => {
    it("renders page title", () => {
      render(<TimerPage />);
      expect(screen.getByRole("heading", { level: 1, name: "Timer" })).toBeInTheDocument();
    });

    it("shows subtitle", () => {
      render(<TimerPage />);
      expect(screen.getByText("Track your focus time")).toBeInTheDocument();
    });
  });

  describe("timer display", () => {
    it("renders the timer at 00:00:00", () => {
      render(<TimerPage />);
      expect(screen.getByText("00:00:00")).toBeInTheDocument();
    });

    it("renders start button", () => {
      render(<TimerPage />);
      expect(screen.getByRole("button", { name: "Start timer" })).toBeInTheDocument();
    });

    it("shows task name on timer", () => {
      render(<TimerPage />);
      expect(screen.getByText("Fix authentication middleware bug")).toBeInTheDocument();
    });

    it("starts counting when start is clicked", () => {
      render(<TimerPage />);
      fireEvent.click(screen.getByRole("button", { name: "Start timer" }));
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(screen.getByText("00:00:05")).toBeInTheDocument();
    });

    it("shows stop button while running", () => {
      render(<TimerPage />);
      fireEvent.click(screen.getByRole("button", { name: "Start timer" }));
      expect(screen.getByRole("button", { name: "Stop timer" })).toBeInTheDocument();
    });

    it("stops counting when stop is clicked", () => {
      render(<TimerPage />);
      fireEvent.click(screen.getByRole("button", { name: "Start timer" }));
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      fireEvent.click(screen.getByRole("button", { name: "Stop timer" }));
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.getByText("00:00:03")).toBeInTheDocument();
    });
  });

  describe("focus summary", () => {
    it("shows today focus time label", () => {
      render(<TimerPage />);
      expect(screen.getByText("Today's focus time")).toBeInTheDocument();
    });

    it("shows total focus time", () => {
      render(<TimerPage />);
      expect(screen.getByText("2h 30m")).toBeInTheDocument();
    });

    it("shows session count label", () => {
      render(<TimerPage />);
      expect(screen.getByText("Sessions")).toBeInTheDocument();
    });

    it("shows session count", () => {
      render(<TimerPage />);
      expect(screen.getByText("3")).toBeInTheDocument();
    });
  });

  describe("recent sessions", () => {
    it("renders section heading", () => {
      render(<TimerPage />);
      expect(screen.getByText("Recent Sessions")).toBeInTheDocument();
    });

    it("renders all three recent sessions", () => {
      render(<TimerPage />);
      expect(screen.getByText("Fix auth middleware")).toBeInTheDocument();
      expect(screen.getByText("Design wireframes")).toBeInTheDocument();
      expect(screen.getByText("Code review PR #42")).toBeInTheDocument();
    });

    it("shows session durations", () => {
      render(<TimerPage />);
      expect(screen.getByText("1h 23m")).toBeInTheDocument();
      expect(screen.getByText("45m")).toBeInTheDocument();
      expect(screen.getByText("22m")).toBeInTheDocument();
    });

    it("shows session times", () => {
      render(<TimerPage />);
      expect(screen.getByText("2:30 PM")).toBeInTheDocument();
      expect(screen.getByText("11:00 AM")).toBeInTheDocument();
      expect(screen.getByText("9:15 AM")).toBeInTheDocument();
    });
  });
});

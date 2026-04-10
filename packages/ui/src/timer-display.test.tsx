import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { TimerDisplay } from "./timer-display";

describe("TimerDisplay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("rendering", () => {
    it("displays initial time as 00:00:00", () => {
      render(<TimerDisplay />);
      expect(screen.getByText("00:00:00")).toBeInTheDocument();
    });

    it("renders start button initially", () => {
      render(<TimerDisplay />);
      expect(screen.getByRole("button", { name: "Start timer" })).toBeInTheDocument();
    });

    it("does not render reset button initially", () => {
      render(<TimerDisplay />);
      expect(screen.queryByText("Reset")).not.toBeInTheDocument();
    });

    it("renders the SVG progress ring", () => {
      const { container } = render(<TimerDisplay />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders two circle elements in the SVG", () => {
      const { container } = render(<TimerDisplay />);
      const circles = container.querySelectorAll("circle");
      expect(circles.length).toBe(2);
    });
  });

  describe("task name", () => {
    it("shows task name when provided", () => {
      render(<TimerDisplay taskName="Fix auth bug" />);
      expect(screen.getByText("Fix auth bug")).toBeInTheDocument();
    });

    it("does not render task name element when not provided", () => {
      const { container } = render(<TimerDisplay />);
      // There should be no <p> with text content for the task name
      const paragraphs = container.querySelectorAll("p");
      expect(paragraphs.length).toBe(0);
    });
  });

  describe("start/stop behavior", () => {
    it("shows stop button after clicking start", () => {
      render(<TimerDisplay />);
      fireEvent.click(screen.getByRole("button", { name: "Start timer" }));
      expect(screen.getByRole("button", { name: "Stop timer" })).toBeInTheDocument();
    });

    it("shows start button after clicking stop", () => {
      render(<TimerDisplay />);
      fireEvent.click(screen.getByRole("button", { name: "Start timer" }));
      fireEvent.click(screen.getByRole("button", { name: "Stop timer" }));
      expect(screen.getByRole("button", { name: "Start timer" })).toBeInTheDocument();
    });

    it("increments time while running", () => {
      render(<TimerDisplay />);
      fireEvent.click(screen.getByRole("button", { name: "Start timer" }));

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(screen.getByText("00:00:03")).toBeInTheDocument();
    });

    it("stops incrementing after stop is clicked", () => {
      render(<TimerDisplay />);
      fireEvent.click(screen.getByRole("button", { name: "Start timer" }));

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      fireEvent.click(screen.getByRole("button", { name: "Stop timer" }));

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(screen.getByText("00:00:05")).toBeInTheDocument();
    });
  });

  describe("reset behavior", () => {
    it("shows reset button when stopped with time > 0", () => {
      render(<TimerDisplay />);
      fireEvent.click(screen.getByRole("button", { name: "Start timer" }));

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      fireEvent.click(screen.getByRole("button", { name: "Stop timer" }));
      expect(screen.getByText("Reset")).toBeInTheDocument();
    });

    it("does not show reset button while running", () => {
      render(<TimerDisplay />);
      fireEvent.click(screen.getByRole("button", { name: "Start timer" }));

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.queryByText("Reset")).not.toBeInTheDocument();
    });

    it("resets time to 00:00:00 when reset is clicked", () => {
      render(<TimerDisplay />);
      fireEvent.click(screen.getByRole("button", { name: "Start timer" }));

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      fireEvent.click(screen.getByRole("button", { name: "Stop timer" }));
      fireEvent.click(screen.getByText("Reset"));

      expect(screen.getByText("00:00:00")).toBeInTheDocument();
    });

    it("hides reset button after reset", () => {
      render(<TimerDisplay />);
      fireEvent.click(screen.getByRole("button", { name: "Start timer" }));

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      fireEvent.click(screen.getByRole("button", { name: "Stop timer" }));
      fireEvent.click(screen.getByText("Reset"));

      expect(screen.queryByText("Reset")).not.toBeInTheDocument();
    });
  });

  describe("time formatting", () => {
    const formatCases = [
      { seconds: 0, expected: "00:00:00" },
      { seconds: 59, expected: "00:00:59" },
      { seconds: 60, expected: "00:01:00" },
      { seconds: 3599, expected: "00:59:59" },
      { seconds: 3600, expected: "01:00:00" },
      { seconds: 3661, expected: "01:01:01" },
    ];

    it.each(formatCases)(
      "formats $seconds seconds as $expected",
      ({ seconds, expected }) => {
        render(<TimerDisplay />);
        fireEvent.click(screen.getByRole("button", { name: "Start timer" }));

        act(() => {
          vi.advanceTimersByTime(seconds * 1000);
        });

        expect(screen.getByText(expected)).toBeInTheDocument();
      }
    );
  });

  describe("custom className", () => {
    it("appends custom className to container", () => {
      const { container } = render(<TimerDisplay className="custom-class" />);
      expect(container.firstChild).toHaveClass("custom-class");
    });
  });
});

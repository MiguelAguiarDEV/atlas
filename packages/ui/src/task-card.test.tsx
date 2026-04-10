import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TaskCard, type TaskData } from "./task-card";

const baseTask: TaskData = {
  id: "task-1",
  title: "Fix authentication bug",
  priority: 0,
  estimatedMinutes: 60,
  project: "Atlas",
  dueDate: "Today",
  status: "ready",
};

describe("TaskCard", () => {
  describe("rendering", () => {
    it("renders the task title", () => {
      render(<TaskCard task={baseTask} />);
      expect(screen.getByText("Fix authentication bug")).toBeInTheDocument();
    });

    it("renders a toggle button", () => {
      render(<TaskCard task={baseTask} />);
      expect(screen.getByRole("button", { name: "Mark complete" })).toBeInTheDocument();
    });

    it("renders the priority badge", () => {
      render(<TaskCard task={baseTask} />);
      expect(screen.getByText("P0")).toBeInTheDocument();
    });

    it("renders time estimate when provided", () => {
      render(<TaskCard task={baseTask} />);
      expect(screen.getByText("1h")).toBeInTheDocument();
    });

    it("does not render time estimate when not provided", () => {
      const task: TaskData = { ...baseTask, estimatedMinutes: undefined };
      render(<TaskCard task={task} />);
      expect(screen.queryByText(/\dm$/)).not.toBeInTheDocument();
    });
  });

  describe("time format", () => {
    const timeCases = [
      { minutes: 15, expected: "15m" },
      { minutes: 60, expected: "1h" },
      { minutes: 90, expected: "1h 30m" },
      { minutes: 120, expected: "2h" },
      { minutes: 150, expected: "2h 30m" },
    ];

    it.each(timeCases)(
      "formats $minutes minutes as $expected",
      ({ minutes, expected }) => {
        const task: TaskData = { ...baseTask, estimatedMinutes: minutes };
        render(<TaskCard task={task} />);
        expect(screen.getByText(expected)).toBeInTheDocument();
      }
    );
  });

  describe("checkbox toggle", () => {
    it("starts unchecked when status is not done", () => {
      render(<TaskCard task={baseTask} />);
      expect(screen.getByRole("button", { name: "Mark complete" })).toBeInTheDocument();
    });

    it("starts checked when status is done", () => {
      const task: TaskData = { ...baseTask, status: "done" };
      render(<TaskCard task={task} />);
      expect(screen.getByRole("button", { name: "Mark incomplete" })).toBeInTheDocument();
    });

    it("toggles to checked on click", () => {
      render(<TaskCard task={baseTask} />);
      fireEvent.click(screen.getByRole("button", { name: "Mark complete" }));
      expect(screen.getByRole("button", { name: "Mark incomplete" })).toBeInTheDocument();
    });

    it("toggles back to unchecked on second click", () => {
      render(<TaskCard task={baseTask} />);
      const button = screen.getByRole("button", { name: "Mark complete" });
      fireEvent.click(button);
      fireEvent.click(screen.getByRole("button", { name: "Mark incomplete" }));
      expect(screen.getByRole("button", { name: "Mark complete" })).toBeInTheDocument();
    });

    it("calls onToggle with task id when clicked", () => {
      const onToggle = vi.fn();
      render(<TaskCard task={baseTask} onToggle={onToggle} />);
      fireEvent.click(screen.getByRole("button", { name: "Mark complete" }));
      expect(onToggle).toHaveBeenCalledWith("task-1");
    });

    it("applies opacity when checked", () => {
      const task: TaskData = { ...baseTask, status: "done" };
      const { container } = render(<TaskCard task={task} />);
      expect(container.firstChild).toHaveClass("opacity-50");
    });

    it("applies line-through on title when checked", () => {
      const task: TaskData = { ...baseTask, status: "done" };
      render(<TaskCard task={task} />);
      expect(screen.getByText("Fix authentication bug").className).toContain("line-through");
    });
  });

  describe("optional fields", () => {
    it("shows project when showProject is true and project exists", () => {
      render(<TaskCard task={baseTask} showProject />);
      expect(screen.getByText("Atlas")).toBeInTheDocument();
    });

    it("does not show project when showProject is false", () => {
      render(<TaskCard task={baseTask} showProject={false} />);
      expect(screen.queryByText("Atlas")).not.toBeInTheDocument();
    });

    it("does not show project when task has no project", () => {
      const task: TaskData = { ...baseTask, project: undefined };
      render(<TaskCard task={task} showProject />);
      // Only the title and badge text should be present
      expect(screen.queryByText("Atlas")).not.toBeInTheDocument();
    });

    it("shows due date when showDueDate is true and dueDate exists", () => {
      render(<TaskCard task={baseTask} showDueDate />);
      expect(screen.getByText("Today")).toBeInTheDocument();
    });

    it("does not show due date when showDueDate is false", () => {
      render(<TaskCard task={baseTask} showDueDate={false} />);
      // "Today" should not appear as a due date label (it might appear in other contexts)
      const dueDateSpans = screen.queryAllByText("Today");
      expect(dueDateSpans.length).toBe(0);
    });

    it("does not show due date when task has no dueDate", () => {
      const task: TaskData = { ...baseTask, dueDate: undefined };
      render(<TaskCard task={task} showDueDate />);
      expect(screen.queryByText("Today")).not.toBeInTheDocument();
    });
  });

  describe("priority levels", () => {
    const priorityCases = [
      { priority: 0 as const, label: "P0" },
      { priority: 1 as const, label: "P1" },
      { priority: 2 as const, label: "P2" },
      { priority: 3 as const, label: "P3" },
    ];

    it.each(priorityCases)(
      "shows $label badge for priority $priority",
      ({ priority, label }) => {
        const task: TaskData = { ...baseTask, priority };
        render(<TaskCard task={task} />);
        expect(screen.getByText(label)).toBeInTheDocument();
      }
    );
  });

  describe("custom className", () => {
    it("applies custom className to root element", () => {
      const { container } = render(<TaskCard task={baseTask} className="custom-class" />);
      expect(container.firstChild).toHaveClass("custom-class");
    });
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TasksPage from "../app/(app)/tasks/page";

describe("TasksPage", () => {
  describe("header", () => {
    it("renders page title", () => {
      render(<TasksPage />);
      expect(screen.getByRole("heading", { level: 1, name: "Tasks" })).toBeInTheDocument();
    });

    it("shows total task count", () => {
      render(<TasksPage />);
      expect(screen.getByText(/10 total/)).toBeInTheDocument();
    });

    it("shows completed count", () => {
      render(<TasksPage />);
      expect(screen.getByText(/2 completed/)).toBeInTheDocument();
    });
  });

  describe("filter pills", () => {
    it("renders all four filter buttons", () => {
      render(<TasksPage />);
      expect(screen.getByText("All")).toBeInTheDocument();
      expect(screen.getByText("Inbox")).toBeInTheDocument();
      expect(screen.getByText("In Progress")).toBeInTheDocument();
      expect(screen.getByText("Done")).toBeInTheDocument();
    });

    it("All filter is active by default", () => {
      render(<TasksPage />);
      const allButton = screen.getByText("All").closest("button");
      expect(allButton?.className).toContain("bg-[var(--atlas-accent)]");
    });

    it("shows count next to each filter", () => {
      render(<TasksPage />);
      // All=10, Inbox=3, In Progress=4 (in_progress + ready), Done=2
      const allButton = screen.getByText("All").closest("button");
      expect(allButton?.textContent).toContain("10");
    });

    it("changes active filter on click", () => {
      render(<TasksPage />);
      fireEvent.click(screen.getByText("Inbox"));
      const inboxButton = screen.getByText("Inbox").closest("button");
      expect(inboxButton?.className).toContain("bg-[var(--atlas-accent)]");
    });

    it("deactivates previous filter when new one is clicked", () => {
      render(<TasksPage />);
      fireEvent.click(screen.getByText("Inbox"));
      const allButton = screen.getByText("All").closest("button");
      expect(allButton?.className).toContain("bg-[var(--atlas-surface)]");
    });
  });

  describe("task cards", () => {
    it("renders all 10 tasks when All filter is active", () => {
      render(<TasksPage />);
      const markCompleteButtons = screen.getAllByRole("button", { name: /Mark complete|Mark incomplete/ });
      expect(markCompleteButtons).toHaveLength(10);
    });

    it("shows task titles", () => {
      render(<TasksPage />);
      expect(screen.getByText("Fix authentication middleware bug")).toBeInTheDocument();
      expect(screen.getByText("Design onboarding flow wireframes")).toBeInTheDocument();
      expect(screen.getByText("Migrate user data to new schema")).toBeInTheDocument();
    });

    it("shows project names", () => {
      render(<TasksPage />);
      expect(screen.getAllByText("Atlas").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Backend").length).toBeGreaterThan(0);
      expect(screen.getByText("DevOps")).toBeInTheDocument();
    });

    it("shows due dates", () => {
      render(<TasksPage />);
      expect(screen.getAllByText("Today").length).toBeGreaterThan(0);
      expect(screen.getByText("Tomorrow")).toBeInTheDocument();
    });

    it("shows priority badges", () => {
      render(<TasksPage />);
      expect(screen.getAllByText("P0").length).toBe(2);
      expect(screen.getAllByText("P1").length).toBe(3);
    });
  });

  describe("filtering behavior", () => {
    it("shows only inbox tasks when Inbox is selected", () => {
      render(<TasksPage />);
      fireEvent.click(screen.getByText("Inbox"));
      const toggleButtons = screen.getAllByRole("button", { name: /Mark complete|Mark incomplete/ });
      expect(toggleButtons).toHaveLength(3);
    });

    it("shows in_progress and ready tasks when In Progress is selected", () => {
      render(<TasksPage />);
      fireEvent.click(screen.getByText("In Progress"));
      // in_progress: t1, t6 (2) + ready: t2, t3, t10 (3) = 5
      const toggleButtons = screen.getAllByRole("button", { name: /Mark complete|Mark incomplete/ });
      expect(toggleButtons).toHaveLength(5);
    });

    it("shows only done tasks when Done is selected", () => {
      render(<TasksPage />);
      fireEvent.click(screen.getByText("Done"));
      const toggleButtons = screen.getAllByRole("button", { name: /Mark complete|Mark incomplete/ });
      expect(toggleButtons).toHaveLength(2);
    });

    it("shows all tasks when switching back to All", () => {
      render(<TasksPage />);
      fireEvent.click(screen.getByText("Inbox"));
      fireEvent.click(screen.getByText("All"));
      const toggleButtons = screen.getAllByRole("button", { name: /Mark complete|Mark incomplete/ });
      expect(toggleButtons).toHaveLength(10);
    });
  });

  describe("empty state", () => {
    it("shows empty state message when no tasks match filter", () => {
      render(<TasksPage />);
      // Toggle all done tasks to "ready" first, then check Done filter
      // Actually, just check if the empty state structure exists in the component
      // We need to make the done filter empty by toggling done tasks
      fireEvent.click(screen.getByText("Done"));
      // There are 2 done tasks, toggle them both
      const incompleteButtons = screen.getAllByRole("button", { name: "Mark incomplete" });
      for (const btn of incompleteButtons) {
        fireEvent.click(btn);
      }
      // Now re-click Done filter (it should show empty)
      fireEvent.click(screen.getByText("All")); // reset
      fireEvent.click(screen.getByText("Done"));
      expect(screen.getByText("No tasks here")).toBeInTheDocument();
    });
  });

  describe("task toggle", () => {
    it("toggles task status on checkbox click", () => {
      render(<TasksPage />);
      const initialIncomplete = screen.getAllByRole("button", { name: "Mark incomplete" }).length;
      const firstCompleteButton = screen.getAllByRole("button", { name: "Mark complete" })[0];
      fireEvent.click(firstCompleteButton);
      // One more task should now be "Mark incomplete"
      const afterIncomplete = screen.getAllByRole("button", { name: "Mark incomplete" }).length;
      expect(afterIncomplete).toBe(initialIncomplete + 1);
    });
  });
});

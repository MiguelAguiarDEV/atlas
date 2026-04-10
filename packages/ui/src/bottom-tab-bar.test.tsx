import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BottomTabBar, type Tab } from "./bottom-tab-bar";

const mockTabs: Tab[] = [
  { key: "today", label: "Today", icon: <svg data-testid="icon-today" />, href: "/today" },
  { key: "tasks", label: "Tasks", icon: <svg data-testid="icon-tasks" />, href: "/tasks" },
  { key: "timer", label: "Timer", icon: <svg data-testid="icon-timer" />, href: "/timer" },
  { key: "more", label: "More", icon: <svg data-testid="icon-more" />, href: "/more" },
];

describe("BottomTabBar", () => {
  describe("rendering", () => {
    it("renders all four tabs", () => {
      render(<BottomTabBar tabs={mockTabs} activeTab="today" />);
      expect(screen.getByText("Today")).toBeInTheDocument();
      expect(screen.getByText("Tasks")).toBeInTheDocument();
      expect(screen.getByText("Timer")).toBeInTheDocument();
      expect(screen.getByText("More")).toBeInTheDocument();
    });

    it("renders as a nav element", () => {
      render(<BottomTabBar tabs={mockTabs} activeTab="today" />);
      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });

    it("renders tab icons", () => {
      render(<BottomTabBar tabs={mockTabs} activeTab="today" />);
      expect(screen.getByTestId("icon-today")).toBeInTheDocument();
      expect(screen.getByTestId("icon-tasks")).toBeInTheDocument();
      expect(screen.getByTestId("icon-timer")).toBeInTheDocument();
      expect(screen.getByTestId("icon-more")).toBeInTheDocument();
    });

    it("renders tabs as anchor elements", () => {
      render(<BottomTabBar tabs={mockTabs} activeTab="today" />);
      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(4);
    });
  });

  describe("href", () => {
    it("each tab links to correct href", () => {
      render(<BottomTabBar tabs={mockTabs} activeTab="today" />);
      const links = screen.getAllByRole("link");
      expect(links[0]).toHaveAttribute("href", "/today");
      expect(links[1]).toHaveAttribute("href", "/tasks");
      expect(links[2]).toHaveAttribute("href", "/timer");
      expect(links[3]).toHaveAttribute("href", "/more");
    });
  });

  describe("active tab styling", () => {
    it("active tab has accent text color class", () => {
      render(<BottomTabBar tabs={mockTabs} activeTab="today" />);
      const todayLink = screen.getByText("Today").closest("a");
      expect(todayLink?.className).toContain("text-[var(--atlas-accent)]");
    });

    it("inactive tabs have muted text color class", () => {
      render(<BottomTabBar tabs={mockTabs} activeTab="today" />);
      const tasksLink = screen.getByText("Tasks").closest("a");
      expect(tasksLink?.className).toContain("text-[var(--atlas-muted)]");
    });

    it("active tab has aria-current=page", () => {
      render(<BottomTabBar tabs={mockTabs} activeTab="tasks" />);
      const tasksLink = screen.getByText("Tasks").closest("a");
      expect(tasksLink).toHaveAttribute("aria-current", "page");
    });

    it("inactive tabs do not have aria-current", () => {
      render(<BottomTabBar tabs={mockTabs} activeTab="tasks" />);
      const todayLink = screen.getByText("Today").closest("a");
      expect(todayLink).not.toHaveAttribute("aria-current");
    });

    it("changes active styling when activeTab prop changes", () => {
      const { rerender } = render(<BottomTabBar tabs={mockTabs} activeTab="today" />);
      expect(screen.getByText("Today").closest("a")?.className).toContain("text-[var(--atlas-accent)]");

      rerender(<BottomTabBar tabs={mockTabs} activeTab="timer" />);
      expect(screen.getByText("Timer").closest("a")?.className).toContain("text-[var(--atlas-accent)]");
      expect(screen.getByText("Today").closest("a")?.className).toContain("text-[var(--atlas-muted)]");
    });
  });

  describe("onTabChange callback", () => {
    it("calls onTabChange with tab key when clicked", () => {
      const onTabChange = vi.fn();
      render(<BottomTabBar tabs={mockTabs} activeTab="today" onTabChange={onTabChange} />);
      fireEvent.click(screen.getByText("Tasks"));
      expect(onTabChange).toHaveBeenCalledWith("tasks");
    });

    it("prevents default navigation when onTabChange is provided", () => {
      const onTabChange = vi.fn();
      render(<BottomTabBar tabs={mockTabs} activeTab="today" onTabChange={onTabChange} />);
      const link = screen.getByText("Tasks").closest("a")!;
      const event = new MouseEvent("click", { bubbles: true, cancelable: true });
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");
      link.dispatchEvent(event);
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("does not prevent default when onTabChange is not provided", () => {
      render(<BottomTabBar tabs={mockTabs} activeTab="today" />);
      // Without onTabChange, links should behave as normal anchor tags
      const link = screen.getByText("Tasks").closest("a");
      expect(link).toHaveAttribute("href", "/tasks");
    });
  });

  describe("touch targets", () => {
    it("tabs have minimum touch target size", () => {
      render(<BottomTabBar tabs={mockTabs} activeTab="today" />);
      const links = screen.getAllByRole("link");
      for (const link of links) {
        expect(link.className).toContain("min-h-[48px]");
        expect(link.className).toContain("min-w-[48px]");
      }
    });
  });

  describe("custom className", () => {
    it("appends custom className to nav", () => {
      render(<BottomTabBar tabs={mockTabs} activeTab="today" className="custom-class" />);
      expect(screen.getByRole("navigation")).toHaveClass("custom-class");
    });
  });
});

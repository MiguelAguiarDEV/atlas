import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  HomeIcon,
  ListIcon,
  ClockIcon,
  MenuIcon,
  PlusIcon,
  CheckIcon,
  PlayIcon,
  StopIcon,
  SunIcon,
  MoonIcon,
  FireIcon,
  ZapIcon,
  BatteryIcon,
  FilterIcon,
  CalendarIcon,
  TagIcon,
} from "./index";

const allIcons = [
  { name: "HomeIcon", Component: HomeIcon },
  { name: "ListIcon", Component: ListIcon },
  { name: "ClockIcon", Component: ClockIcon },
  { name: "MenuIcon", Component: MenuIcon },
  { name: "PlusIcon", Component: PlusIcon },
  { name: "CheckIcon", Component: CheckIcon },
  { name: "PlayIcon", Component: PlayIcon },
  { name: "StopIcon", Component: StopIcon },
  { name: "SunIcon", Component: SunIcon },
  { name: "MoonIcon", Component: MoonIcon },
  { name: "FireIcon", Component: FireIcon },
  { name: "ZapIcon", Component: ZapIcon },
  { name: "BatteryIcon", Component: BatteryIcon },
  { name: "FilterIcon", Component: FilterIcon },
  { name: "CalendarIcon", Component: CalendarIcon },
  { name: "TagIcon", Component: TagIcon },
];

describe("Icons", () => {
  describe("renders as SVG", () => {
    it.each(allIcons)("$name renders as an SVG element", ({ Component }) => {
      const { container } = render(<Component />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(svg?.tagName).toBe("svg");
    });
  });

  describe("default size", () => {
    it.each(allIcons)("$name defaults to 24x24", ({ Component }) => {
      const { container } = render(<Component />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "24");
      expect(svg).toHaveAttribute("height", "24");
    });
  });

  describe("custom size", () => {
    it.each(allIcons)("$name respects custom size prop", ({ Component }) => {
      const { container } = render(<Component size={16} />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "16");
      expect(svg).toHaveAttribute("height", "16");
    });
  });

  describe("viewBox", () => {
    it.each(allIcons)("$name has 0 0 24 24 viewBox", ({ Component }) => {
      const { container } = render(<Component />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
    });
  });

  describe("stroke properties", () => {
    it.each(allIcons)("$name has currentColor stroke", ({ Component }) => {
      const { container } = render(<Component />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("stroke", "currentColor");
    });

    it.each(allIcons)("$name has strokeWidth 2", ({ Component }) => {
      const { container } = render(<Component />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("stroke-width", "2");
    });
  });

  describe("fill property", () => {
    it.each(allIcons)("$name has fill none by default", ({ Component }) => {
      const { container } = render(<Component />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("fill", "none");
    });
  });

  describe("custom props passthrough", () => {
    it.each(allIcons)("$name passes className", ({ Component }) => {
      const { container } = render(<Component className="text-red-500" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("text-red-500");
    });

    it.each(allIcons)("$name passes data-testid", ({ Component }) => {
      const { container } = render(<Component data-testid="custom-icon" />);
      const svg = container.querySelector('[data-testid="custom-icon"]');
      expect(svg).toBeInTheDocument();
    });
  });

  describe("contains child elements", () => {
    it.each(allIcons)("$name has child path/circle/rect elements", ({ Component }) => {
      const { container } = render(<Component />);
      const svg = container.querySelector("svg");
      const children = svg?.querySelectorAll("path, circle, rect, polygon, line");
      expect(children?.length).toBeGreaterThan(0);
    });
  });
});

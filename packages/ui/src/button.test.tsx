import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "./button";

describe("Button", () => {
  describe("rendering", () => {
    it("renders children text", () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
    });

    it("renders as a button element", () => {
      render(<Button>Test</Button>);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("forwards ref correctly", () => {
      const ref = { current: null } as React.RefObject<HTMLButtonElement | null>;
      render(<Button ref={ref}>Ref</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it("has correct displayName", () => {
      expect(Button.displayName).toBe("Button");
    });
  });

  describe("click handling", () => {
    it("calls onClick when clicked", () => {
      const onClick = vi.fn();
      render(<Button onClick={onClick}>Click</Button>);
      fireEvent.click(screen.getByRole("button"));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("does not call onClick when disabled", () => {
      const onClick = vi.fn();
      render(<Button onClick={onClick} disabled>Click</Button>);
      fireEvent.click(screen.getByRole("button"));
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe("disabled state", () => {
    it("applies disabled attribute", () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("applies disabled opacity class", () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole("button").className).toContain("disabled:opacity-50");
    });

    it("applies pointer-events-none class when disabled", () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole("button").className).toContain("disabled:pointer-events-none");
    });
  });

  describe("variants", () => {
    const variantCases = [
      { variant: "primary" as const, expectedClass: "bg-[var(--atlas-accent)]" },
      { variant: "secondary" as const, expectedClass: "bg-[var(--atlas-surface)]" },
      { variant: "ghost" as const, expectedClass: "hover:bg-[var(--atlas-surface-hover)]" },
      { variant: "danger" as const, expectedClass: "bg-[var(--atlas-danger)]" },
    ] as const;

    it.each(variantCases)(
      "applies correct class for $variant variant",
      ({ variant, expectedClass }) => {
        render(<Button variant={variant}>{variant}</Button>);
        expect(screen.getByRole("button").className).toContain(expectedClass);
      }
    );

    it("defaults to primary variant when none specified", () => {
      render(<Button>Default</Button>);
      expect(screen.getByRole("button").className).toContain("bg-[var(--atlas-accent)]");
    });

    it("primary variant has white text", () => {
      render(<Button variant="primary">Primary</Button>);
      expect(screen.getByRole("button").className).toContain("text-white");
    });

    it("danger variant has white text", () => {
      render(<Button variant="danger">Danger</Button>);
      expect(screen.getByRole("button").className).toContain("text-white");
    });

    it("secondary variant has border", () => {
      render(<Button variant="secondary">Secondary</Button>);
      expect(screen.getByRole("button").className).toContain("border");
    });
  });

  describe("sizes", () => {
    const sizeCases = [
      { size: "sm" as const, expectedClass: "px-3 py-1.5 text-sm" },
      { size: "md" as const, expectedClass: "px-4 py-2 text-sm" },
      { size: "lg" as const, expectedClass: "px-6 py-3 text-base" },
    ] as const;

    it.each(sizeCases)(
      "applies correct class for $size size",
      ({ size, expectedClass }) => {
        render(<Button size={size}>{size}</Button>);
        const button = screen.getByRole("button");
        for (const cls of expectedClass.split(" ")) {
          expect(button.className).toContain(cls);
        }
      }
    );

    it("defaults to md size when none specified", () => {
      render(<Button>Default</Button>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("px-4");
      expect(button.className).toContain("py-2");
    });
  });

  describe("custom className", () => {
    it("appends custom className", () => {
      render(<Button className="my-custom-class">Custom</Button>);
      expect(screen.getByRole("button").className).toContain("my-custom-class");
    });

    it("preserves base classes alongside custom className", () => {
      render(<Button className="extra">Custom</Button>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("rounded-lg");
      expect(button.className).toContain("extra");
    });
  });

  describe("HTML button props passthrough", () => {
    it("passes type attribute", () => {
      render(<Button type="submit">Submit</Button>);
      expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
    });

    it("passes aria-label attribute", () => {
      render(<Button aria-label="Close dialog">X</Button>);
      expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Close dialog");
    });

    it("passes data attributes", () => {
      render(<Button data-testid="my-button">Test</Button>);
      expect(screen.getByTestId("my-button")).toBeInTheDocument();
    });
  });
});

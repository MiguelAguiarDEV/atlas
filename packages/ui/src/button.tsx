import { type ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-[0_0_20px_var(--accent-glow),0_0_60px_rgba(94,106,210,0.08)]",
  secondary:
    "bg-[rgba(255,255,255,0.04)] backdrop-blur-xl hover:bg-[rgba(255,255,255,0.08)] border border-[var(--border)] hover:border-[var(--border-highlight)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]",
  ghost:
    "hover:bg-[rgba(255,255,255,0.06)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]",
  danger:
    "bg-[var(--danger)] hover:bg-red-600 text-white shadow-[0_0_20px_var(--danger-glow)]",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-[13px] min-h-[44px]",
  md: "px-4 py-2.5 text-[13px] min-h-[44px]",
  lg: "px-6 py-3 text-[15px] min-h-[48px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-[var(--radius)] font-medium transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] disabled:opacity-40 disabled:pointer-events-none active:scale-[0.97] ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

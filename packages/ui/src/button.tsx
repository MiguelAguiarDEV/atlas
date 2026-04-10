import { type ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: "var(--accent)",
    color: "white",
    boxShadow: "0 0 20px var(--accent-glow)",
  },
  secondary: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
  },
  ghost: {
    background: "transparent",
    color: "var(--text-secondary)",
  },
  danger: {
    background: "var(--destructive)",
    color: "white",
    boxShadow: "0 0 20px var(--destructive-glow)",
  },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: "6px 12px", fontSize: "13px", minHeight: "44px" },
  md: { padding: "10px 16px", fontSize: "13px", minHeight: "44px" },
  lg: { padding: "12px 24px", fontSize: "15px", minHeight: "48px" },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", style, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "10px",
          fontWeight: 500,
          border: "none",
          cursor: "pointer",
          transition: "all 200ms cubic-bezier(0.16,1,0.3,1)",
          ...variantStyles[variant],
          ...sizeStyles[size],
          ...style,
        }}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

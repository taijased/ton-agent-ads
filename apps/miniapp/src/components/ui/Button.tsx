import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "../../lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "default" | "small";

interface ButtonProps
  extends PropsWithChildren, ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

export const Button = ({
  children,
  className,
  fullWidth = false,
  size = "default",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) => {
  return (
    <button
      className={cn(
        "button",
        variant === "primary" ? "button--primary" : undefined,
        variant === "secondary" ? "button--secondary" : undefined,
        variant === "ghost" ? "button--ghost" : undefined,
        size === "small" ? "button--small" : undefined,
        fullWidth ? "button--full" : undefined,
        className,
      )}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
};

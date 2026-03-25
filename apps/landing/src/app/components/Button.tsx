import type { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary";
  onClick?: () => void;
  href?: string;
  target?: "_blank" | "_self" | "_parent" | "_top";
  rel?: string;
}

export function Button({
  children,
  variant = "primary",
  onClick,
  href,
  target,
  rel,
}: ButtonProps) {
  const className =
    variant === "primary"
      ? "border-2 border-black bg-black px-8 py-4 font-semibold text-white transition-colors duration-300 hover:bg-white hover:text-black"
      : "border-2 border-black bg-white px-8 py-4 font-semibold text-black transition-colors duration-300 hover:bg-black hover:text-white";

  if (href) {
    return (
      <a href={href} target={target} rel={rel} className={className}>
        {children}
      </a>
    );
  }

  if (variant === "primary") {
    return (
      <button type="button" onClick={onClick} className={className}>
        {children}
      </button>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

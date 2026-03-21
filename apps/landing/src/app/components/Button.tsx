import type { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary";
  onClick?: () => void;
}

export function Button({
  children,
  variant = "primary",
  onClick,
}: ButtonProps) {
  if (variant === "primary") {
    return (
      <button
        onClick={onClick}
        className="border-2 border-black bg-black px-8 py-4 font-semibold text-white transition-colors duration-300 hover:bg-white hover:text-black"
      >
        {children}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="border-2 border-black bg-white px-8 py-4 font-semibold text-black transition-colors duration-300 hover:bg-black hover:text-white"
    >
      {children}
    </button>
  );
}

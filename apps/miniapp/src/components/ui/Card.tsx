import type { HTMLAttributes, PropsWithChildren } from "react";
import { cn } from "../../lib/cn";

interface CardProps extends PropsWithChildren, HTMLAttributes<HTMLDivElement> {
  muted?: boolean;
}

export const Card = ({
  children,
  className,
  muted = false,
  ...props
}: CardProps) => {
  return (
    <div
      className={cn("card", muted ? "card--muted" : undefined, className)}
      {...props}
    >
      {children}
    </div>
  );
};

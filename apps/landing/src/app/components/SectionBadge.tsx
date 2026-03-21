interface SectionBadgeProps {
  children: string;
  variant?: "light" | "dark";
}

export function SectionBadge({
  children,
  variant = "light",
}: SectionBadgeProps) {
  if (variant === "dark") {
    return (
      <div className="relative mb-8 inline-block">
        <div className="bg-white px-5 py-2 text-sm font-bold tracking-wider text-black uppercase shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)]">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="relative mb-8 inline-block">
      <div className="bg-black px-5 py-2 text-sm font-bold tracking-wider text-white uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]">
        {children}
      </div>
    </div>
  );
}

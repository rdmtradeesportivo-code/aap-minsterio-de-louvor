import { cn } from "@/lib/utils";

type Color = "violet" | "amber" | "green" | "red" | "slate";

const colors: Record<Color, string> = {
  violet: "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-600/15",
  amber: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/15",
  green: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15",
  red: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/15",
  slate: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/10",
};

export function Badge({
  color = "slate",
  className,
  children,
}: {
  color?: Color;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        colors[color],
        className
      )}
    >
      {children}
    </span>
  );
}

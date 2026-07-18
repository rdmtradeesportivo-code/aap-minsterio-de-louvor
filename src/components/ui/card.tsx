import { cn } from "@/lib/utils";

export function Card({
  className,
  hover = false,
  children,
}: {
  className?: string;
  hover?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(30,27,46,0.04)]",
        hover &&
          "transition-all duration-150 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-[0_8px_24px_rgba(109,40,217,0.08)]",
        className
      )}
    >
      {children}
    </div>
  );
}

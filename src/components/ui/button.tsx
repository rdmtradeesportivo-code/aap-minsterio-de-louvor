import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm shadow-violet-600/25 hover:shadow-md hover:shadow-violet-600/30 hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98]",
  secondary:
    "bg-white text-slate-700 border border-slate-200 shadow-sm hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50/50 active:scale-[0.98]",
  outline:
    "bg-transparent text-slate-600 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 active:scale-[0.98]",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100 active:scale-[0.98]",
  danger:
    "bg-white text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 active:scale-[0.98]",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
};

export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant,
  size,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return <button className={buttonVariants({ variant, size, className })} {...props} />;
}

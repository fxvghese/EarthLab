import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "ghost";
type Size = "sm" | "md";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  default:
    "bg-zinc-100 text-zinc-900 hover:bg-white active:scale-[0.98] shadow-[0_2px_14px_rgba(255,255,255,0.12)]",
  outline:
    "border border-white/15 bg-white/5 text-zinc-100 hover:bg-white/10 hover:border-white/25 active:scale-[0.98]",
  ghost: "text-zinc-300 hover:text-white hover:bg-white/5",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
};

export function Button({ className, variant = "default", size = "md", ...props }: Props) {
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}

export default Button;

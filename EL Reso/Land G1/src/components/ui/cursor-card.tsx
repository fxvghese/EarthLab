"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Cursor Card — shadcn registry component (shadcn style, new-york v4).
 * A card with a radial gradient glow that follows the mouse position.
 *
 * Props:
 * - `glowColor` — rgb triplet used for the cursor-following glow.
 * - `spotOpacity` — max opacity of the cursor spotlight.
 */
interface CursorCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glowColor?: string;
  spotOpacity?: number;
}

function CursorCard({ className, glowColor = "52, 211, 153", spotOpacity = 0.09, ...props }: CursorCardProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    node.style.setProperty("--x", `${event.clientX - rect.left}px`);
    node.style.setProperty("--y", `${event.clientY - rect.top}px`);
  };

  const handleMouseEnter = () => {
    ref.current?.style.setProperty("--spot-opacity", `${spotOpacity}`);
  };

  const handleMouseLeave = () => {
    ref.current?.style.setProperty("--spot-opacity", "0");
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-colors duration-300 hover:border-white/20",
        className
      )}
      style={{ "--spot-opacity": "0" } as React.CSSProperties}
      {...props}
    />
  );
}

const CursorCardSpot = ({ className, glowColor = "52, 211, 153" }: { className?: string; glowColor?: string }) => (
  <div
    aria-hidden
    className={cn(
      "pointer-events-none absolute inset-0 opacity-[var(--spot-opacity)] transition-opacity duration-500",
      className
    )}
    style={{
      background: `radial-gradient(420px circle at var(--x, 50%) var(--y, 50%), rgb(${glowColor} / 0.55), transparent 65%)`,
    }}
  />
);

const CursorCardBorder = ({ glowColor = "52, 211, 153" }: { glowColor?: string }) => (
  <div
    aria-hidden
    className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
    style={{
      background: `radial-gradient(260px circle at var(--x, 50%) var(--y, 50%), rgb(${glowColor} / 0.35), transparent 70%)`,
      WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 1px), black calc(100% - 1px))",
      mask: "radial-gradient(farthest-side, transparent calc(100% - 1px), black calc(100% - 1px))",
    }}
  />
);

export { CursorCard, CursorCardSpot, CursorCardBorder };

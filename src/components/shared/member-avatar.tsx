"use client";

import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/avatars";

type Props = {
  name: string;
  color: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const sizes = {
  sm: "size-7 text-xs",
  md: "size-9 text-sm",
  lg: "size-12 text-base",
  xl: "size-16 text-xl",
};

export function MemberAvatar({ name, color, size = "md", className }: Props) {
  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white shadow-sm ring-2 ring-white",
        sizes[size],
        className
      )}
      style={{ backgroundColor: color }}
      title={name}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  );
}

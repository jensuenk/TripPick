"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: number | null | undefined;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: "size-3.5",
  md: "size-5",
  lg: "size-7",
};

export function StarRating({ value, onChange, size = "md", className }: Props) {
  const rating = value ?? 0;
  const interactive = Boolean(onChange);

  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      role={interactive ? "slider" : "img"}
      aria-label={rating ? `${rating} van 5 sterren` : "Geen beoordeling"}
      aria-valuenow={interactive ? rating : undefined}
      aria-valuemin={interactive ? 0 : undefined}
      aria-valuemax={interactive ? 5 : undefined}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const fill =
          rating >= star ? 1 : rating >= star - 0.5 ? 0.5 : 0;
        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            className={cn(
              "relative",
              interactive
                ? "cursor-pointer transition-transform hover:scale-110"
                : "cursor-default"
            )}
            onClick={() => {
              if (!onChange) return;
              // tap same star → half step down or clear
              if (rating === star) onChange(star - 0.5);
              else if (rating === star - 0.5) onChange(star - 1 < 0 ? 0 : star - 1);
              else onChange(star);
            }}
          >
            <Star
              className={cn(sizes[size], "text-amber-300/40")}
              strokeWidth={1.5}
            />
            {fill > 0 && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star
                  className={cn(sizes[size], "fill-amber-400 text-amber-400")}
                  strokeWidth={1.5}
                />
              </span>
            )}
          </button>
        );
      })}
      {rating > 0 && (
        <span className="ml-1 text-xs font-medium text-muted-foreground">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

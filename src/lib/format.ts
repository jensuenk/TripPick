import { format, formatDistanceToNow, parseISO } from "date-fns";
import type { BedConfig } from "@/db/schema";

export function formatDateRange(start: string, end: string): string {
  try {
    const s = parseISO(start);
    const e = parseISO(end);
    if (s.getFullYear() === e.getFullYear()) {
      if (s.getMonth() === e.getMonth()) {
        return `${format(s, "d")} – ${format(e, "d MMM yyyy")}`;
      }
      return `${format(s, "d MMM")} – ${format(e, "d MMM yyyy")}`;
    }
    return `${format(s, "d MMM yyyy")} – ${format(e, "d MMM yyyy")}`;
  } catch {
    return `${start} – ${end}`;
  }
}

export function formatPrice(cents: number | null | undefined): string | null {
  if (cents == null) return null;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatRelative(date: string | Date): string {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "";
  }
}

export function formatBeds(beds: BedConfig[]): string {
  if (!beds?.length) return "";
  return beds
    .map((b) => {
      const label =
        b.type === "double"
          ? "double"
          : b.type === "single"
            ? "single"
            : b.type === "bunk"
              ? "bunk"
              : "sofa";
      return `${b.count}× ${label}`;
    })
    .join(", ");
}

export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

export function centsToEuros(cents: number | null | undefined): number | "" {
  if (cents == null) return "";
  return cents / 100;
}

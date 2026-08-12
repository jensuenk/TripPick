import { format, formatDistanceToNow, parseISO } from "date-fns";
import type { BedConfig } from "@/db/schema";
import { BED_TYPES } from "@/lib/trip-types";

/** Average mountain-road drive speed used to estimate lift access time */
export const LIFT_DRIVE_KMH = 40;

export function estimateDriveMinutes(
  km: number | null | undefined,
): number | null {
  if (km == null || !Number.isFinite(km) || km < 0) return null;
  return Math.max(1, Math.round((km / LIFT_DRIVE_KMH) * 60));
}

export function formatKm(km: number | null | undefined): string | null {
  if (km == null || !Number.isFinite(km)) return null;
  const rounded = Number.isInteger(km) ? String(km) : km.toFixed(1);
  return `${rounded} km`;
}

export function getLiftAccess(
  typeDetails:
    | {
        kmToLift?: number;
        minutesToLift?: number;
      }
    | null
    | undefined,
) {
  const km = typeDetails?.kmToLift;
  if (km != null) {
    return {
      km,
      minutes: estimateDriveMinutes(km),
      fromDistance: true as const,
    };
  }
  // Legacy records that only stored minutes
  if (typeDetails?.minutesToLift != null) {
    return {
      km: null,
      minutes: typeDetails.minutesToLift,
      fromDistance: false as const,
    };
  }
  return { km: null, minutes: null, fromDistance: false as const };
}

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

export function bedTypeMeta(type: string) {
  return BED_TYPES.find((t) => t.id === type);
}

export function formatBeds(beds: BedConfig[]): string {
  if (!beds?.length) return "";
  return beds
    .map((b) => {
      const meta = bedTypeMeta(b.type);
      const label = meta?.label.toLowerCase() ?? b.type;
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

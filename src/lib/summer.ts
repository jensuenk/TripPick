import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import type { NearbyPlace } from "@/db/schema";
import { formatPriceRange } from "@/lib/format";

export const SUMMER_OVERVIEW_VERSION = 1;

export function nightsBetween(
  checkIn?: string | null,
  checkOut?: string | null
): number | null {
  if (!checkIn || !checkOut) return null;
  try {
    const nights = differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn));
    return nights > 0 ? nights : null;
  } catch {
    return null;
  }
}

export function nearestPlaceKm(
  places: NearbyPlace[] | null | undefined
): number | null {
  const valid = (places ?? []).filter(
    (p) => p.name.trim().length > 0 && Number.isFinite(p.km) && p.km >= 0
  );
  if (!valid.length) return null;
  return Math.min(...valid.map((p) => p.km));
}

export function nearestPlace(
  places: NearbyPlace[] | null | undefined
): NearbyPlace | null {
  const valid = (places ?? []).filter(
    (p) => p.name.trim().length > 0 && Number.isFinite(p.km) && p.km >= 0
  );
  if (!valid.length) return null;
  return [...valid].sort((a, b) => a.km - b.km)[0] ?? null;
}

export function formatStayRange(
  checkIn?: string | null,
  checkOut?: string | null
): string | null {
  if (!checkIn || !checkOut) return null;
  try {
    const s = parseISO(checkIn);
    const e = parseISO(checkOut);
    return `${format(s, "d MMM", { locale: nl })} – ${format(e, "d MMM yyyy", { locale: nl })}`;
  } catch {
    return `${checkIn} – ${checkOut}`;
  }
}

function yyMMdd(iso: string): string {
  return iso.replace(/-/g, "").slice(2);
}

export function estimateTransferMinutes(
  km: number | null | undefined
): number | null {
  if (km == null || !Number.isFinite(km) || km < 0) return null;
  return Math.max(5, Math.round((km / 70) * 60));
}

export function flightSearchLinks(input: {
  originCode: string;
  destCode?: string | null;
  destName?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
}): { google: string; skyscanner: string | null; kayak: string | null } {
  const origin = input.originCode.trim().toUpperCase() || "BRU";
  const dest = input.destCode?.trim().toUpperCase() || "";
  const destLabel = dest || input.destName?.trim() || "";
  const checkIn = input.checkIn || "";
  const checkOut = input.checkOut || "";

  const googleQ = [
    destLabel ? `Flights from ${origin} to ${destLabel}` : `Flights from ${origin}`,
    checkIn ? `on ${checkIn}` : "",
    checkOut ? `through ${checkOut}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const google = `https://www.google.com/travel/flights?q=${encodeURIComponent(googleQ)}`;

  if (!dest) {
    return { google, skyscanner: null, kayak: null };
  }

  const skyscanner =
    checkIn && checkOut
      ? `https://www.skyscanner.nl/transport/vluchten/${origin.toLowerCase()}/${dest.toLowerCase()}/${yyMMdd(checkIn)}/${yyMMdd(checkOut)}/`
      : `https://www.skyscanner.nl/transport/vluchten/${origin.toLowerCase()}/${dest.toLowerCase()}/`;

  const kayak =
    checkIn && checkOut
      ? `https://www.kayak.nl/flights/${origin}-${dest}/${checkIn}/${checkOut}`
      : `https://www.kayak.nl/flights/${origin}-${dest}`;

  return { google, skyscanner, kayak };
}

export function cleanPlaces(places: NearbyPlace[] | undefined): NearbyPlace[] {
  return (places ?? [])
    .filter((p) => p.name.trim() && Number.isFinite(p.km))
    .map((p) => ({
      name: p.name.trim(),
      km: p.km,
      ...(p.code?.trim() ? { code: p.code.trim().toUpperCase() } : {}),
    }));
}

export type CentsRange = { minCents: number; maxCents: number };

export function flightCostRange(
  hint:
    | { priceMinEuros?: number; priceMaxEuros?: number }
    | null
    | undefined,
  travelers: number
): CentsRange | null {
  if (!hint) return null;
  const min = hint.priceMinEuros;
  const max = hint.priceMaxEuros;
  if (min == null && max == null) return null;
  const lo = min ?? max!;
  const hi = max ?? min!;
  const count = Math.max(1, travelers);
  return {
    minCents: Math.round(Math.min(lo, hi) * 100) * count,
    maxCents: Math.round(Math.max(lo, hi) * 100) * count,
  };
}

export function addStayAndFlight(
  stayCents: number | null | undefined,
  flight: CentsRange | null
): CentsRange | null {
  if (stayCents == null && !flight) return null;
  const stay = stayCents ?? 0;
  if (!flight) return { minCents: stay, maxCents: stay };
  return {
    minCents: stay + flight.minCents,
    maxCents: stay + flight.maxCents,
  };
}

export function formatTripCostRange(range: CentsRange | null): string | null {
  if (!range) return null;
  return formatPriceRange(range.minCents, range.maxCents);
}

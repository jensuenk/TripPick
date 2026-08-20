"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, Sparkles, Sun, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrip } from "@/components/trip/trip-context";
import type { ApiDestination } from "@/lib/trip-data";
import { SUMMER_OVERVIEW_VERSION } from "@/lib/summer";
import { FlightSearch } from "@/components/destination/flight-search";

type OverviewPayload = {
  overview: string | null;
  climate: string | null;
  activities: string[];
  flightHint: ApiDestination["typeDetails"]["flightHint"] | null;
};

type Props = {
  destination: ApiDestination;
};

export function SummerOverview({ destination }: Props) {
  const { trip, setTrip } = useTrip();
  const details = destination.typeDetails ?? {};
  const cached: OverviewPayload = {
    overview: details.summerOverview?.trim() || null,
    climate: details.climate?.trim() || null,
    activities: details.activities ?? [],
    flightHint: details.flightHint ?? null,
  };
  const usable =
    cached.overview && details.summerOverviewVersion === SUMMER_OVERVIEW_VERSION
      ? cached
      : {
          overview: null,
          climate: null,
          activities: [] as string[],
          flightHint: null,
        };

  const hasContext =
    Boolean(destination.locationText?.trim()) ||
    Boolean(details.nearbyCities?.length) ||
    Boolean(details.nearbyBeaches?.length) ||
    Boolean(details.nearbyAirports?.length);

  const requestKey = [
    destination.id,
    destination.locationText,
    details.checkIn,
    details.checkOut,
    JSON.stringify(details.nearbyAirports ?? []),
    JSON.stringify(details.nearbyBeaches ?? []),
    JSON.stringify(details.nearbyCities ?? []),
    SUMMER_OVERVIEW_VERSION,
  ].join(":");

  const [data, setData] = useState<OverviewPayload>(usable);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestedFor = useRef<string | null>(null);

  useEffect(() => {
    setData(usable);
    setError(null);
  }, [usable.overview, destination.id]);

  useEffect(() => {
    if (!hasContext) return;
    if (data.overview) return;
    if (requestedFor.current === requestKey) return;
    requestedFor.current = requestKey;
    void generate(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, data.overview, hasContext]);

  async function generate(force: boolean) {
    if (!hasContext) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/trips/${trip.token}/destinations/${destination.id}/summer-summary`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force }),
        }
      );
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || "Kon overzicht niet genereren");

      const next: OverviewPayload = {
        overview: json.overview as string,
        climate: (json.climate as string) || null,
        activities: Array.isArray(json.activities) ? json.activities : [],
        flightHint: json.flightHint ?? null,
      };
      const generatedAt =
        (json.generatedAt as string) || new Date().toISOString();
      setData(next);

      setTrip({
        ...trip,
        destinations: trip.destinations.map((d) =>
          d.id === destination.id
            ? {
                ...d,
                typeDetails: {
                  ...d.typeDetails,
                  summerOverview: next.overview ?? undefined,
                  climate: next.climate ?? undefined,
                  activities: next.activities,
                  flightHint: next.flightHint ?? undefined,
                  summerOverviewGeneratedAt: generatedAt,
                  summerOverviewVersion: SUMMER_OVERVIEW_VERSION,
                },
              }
            : d
        ),
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Kon overzicht niet genereren"
      );
    } finally {
      setLoading(false);
    }
  }

  if (!hasContext) return null;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-teal-200/70 bg-gradient-to-br from-teal-50/90 to-sky-50/50 p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-teal-800 uppercase ring-1 ring-teal-200">
            <Sparkles className="size-3" />
            AI-gegenereerd
          </span>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="shrink-0"
            disabled={loading}
            onClick={() => {
              requestedFor.current = `${requestKey}:force`;
              void generate(true);
            }}
            aria-label="AI-overzicht opnieuw genereren"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
          </Button>
        </div>

        {loading && !data.overview && (
          <div className="space-y-2">
            <div className="h-3 animate-pulse rounded bg-teal-100/80" />
            <div className="h-3 w-11/12 animate-pulse rounded bg-teal-100/80" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-teal-100/70" />
          </div>
        )}

        {error && !data.overview && (
          <div className="space-y-2">
            <p className="text-sm text-rose-700">{error}</p>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => void generate(true)}
            >
              Opnieuw proberen
            </Button>
          </div>
        )}

        {data.overview && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
            {data.overview}
          </p>
        )}

        {data.climate && (
          <div className="mt-3 flex gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm ring-1 ring-teal-100">
            <Sun className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <p>{data.climate}</p>
          </div>
        )}

        {data.activities.length > 0 && (
          <div className="mt-3">
            <div className="mb-1.5 inline-flex items-center gap-1 text-xs font-semibold tracking-wide text-teal-800 uppercase">
              <Waves className="size-3.5" />
              Leuke activiteiten
            </div>
            <ul className="space-y-1 text-sm">
              {data.activities.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-teal-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-2 text-[11px] text-muted-foreground">
          AI-overzicht — controleer belangrijke feiten voor je boekt.
        </p>
      </div>

      <FlightSearch
        destination={destination}
        flightHint={data.flightHint ?? destination.typeDetails?.flightHint}
      />
    </div>
  );
}

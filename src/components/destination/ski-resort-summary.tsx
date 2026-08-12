"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrip } from "@/components/trip/trip-context";
import type { ApiDestination } from "@/lib/trip-data";
import { SKI_SUMMARY_VERSION } from "@/lib/ski-summary";

type Props = {
  destination: ApiDestination;
};

export function SkiResortSummary({ destination }: Props) {
  const { trip, setTrip } = useTrip();
  const skiArea = destination.typeDetails?.skiArea?.trim();
  const cached = destination.typeDetails?.skiResortSummary?.trim() || null;
  const cachedVersion = destination.typeDetails?.skiResortSummaryVersion;
  const usableCache =
    cached && cachedVersion === SKI_SUMMARY_VERSION ? cached : null;
  const requestKey = [
    destination.id,
    skiArea,
    destination.typeDetails?.kmToLift ?? "",
    JSON.stringify(destination.typeDetails?.nearbyLifts ?? []),
    SKI_SUMMARY_VERSION,
  ].join(":");

  const [summary, setSummary] = useState<string | null>(usableCache);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestedFor = useRef<string | null>(null);

  useEffect(() => {
    setSummary(usableCache);
    setError(null);
  }, [usableCache, destination.id]);

  useEffect(() => {
    if (!skiArea) return;
    if (summary) return;
    if (requestedFor.current === requestKey) return;
    requestedFor.current = requestKey;
    void generate(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, summary]);

  async function generate(force: boolean) {
    if (!skiArea) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/trips/${trip.token}/destinations/${destination.id}/ski-summary`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force }),
        }
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Kon samenvatting niet genereren");

      const nextSummary = data.summary as string;
      const generatedAt =
        (data.generatedAt as string) || new Date().toISOString();
      setSummary(nextSummary);

      setTrip({
        ...trip,
        destinations: trip.destinations.map((d) =>
          d.id === destination.id
            ? {
                ...d,
                typeDetails: {
                  ...d.typeDetails,
                  skiResortSummary: nextSummary,
                  skiResortSummaryGeneratedAt: generatedAt,
                  skiResortSummaryVersion: SKI_SUMMARY_VERSION,
                },
              }
            : d
        ),
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Kon samenvatting niet genereren"
      );
    } finally {
      setLoading(false);
    }
  }

  if (!skiArea) return null;

  return (
    <div className="rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50/80 to-sky-50/50 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-violet-700 uppercase ring-1 ring-violet-200">
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
          aria-label="AI-samenvatting opnieuw genereren"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
        </Button>
      </div>

      {loading && !summary && (
        <div className="space-y-2">
          <div className="h-3 animate-pulse rounded bg-violet-100/80" />
          <div className="h-3 w-11/12 animate-pulse rounded bg-violet-100/80" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-violet-100/70" />
        </div>
      )}

      {error && !summary && (
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

      {summary && (
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
          {summary}
        </p>
      )}

      <p className="mt-2 text-[11px] text-muted-foreground">
        AI-overzicht — controleer belangrijke feiten voor je boekt.
      </p>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Mountain,
  Palmtree,
  Plane,
  Route,
  Timer,
  Trophy,
} from "lucide-react";
import type { ApiDestination } from "@/lib/trip-data";
import { ReactionBar } from "@/components/destination/reaction-bar";
import { CommentThread } from "@/components/destination/comment-thread";
import { useTrip } from "@/components/trip/trip-context";
import {
  formatKm,
  formatPrice,
  formatPricePerNight,
  getLiftAccess,
} from "@/lib/format";
import {
  addStayAndFlight,
  flightCostRange,
  formatStayRange,
  formatTripCostRange,
  nearestPlace,
  nightsBetween,
  SUMMER_OVERVIEW_VERSION,
} from "@/lib/summer";
import { cn, imageReferrerPolicy, shouldUnoptimizeImage } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type Props = {
  destination: ApiDestination;
  onOpen: () => void;
  isWinner?: boolean;
};

export function DestinationCard({
  destination,
  onOpen,
  isWinner = false,
}: Props) {
  const { trip, setTrip } = useTrip();
  const isSummer = trip.type === "summer";
  const photos = destination.images
    .filter((i) => i.category !== "skimap")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const [index, setIndex] = useState(0);
  const current = photos[index];
  const skiArea = destination.typeDetails?.skiArea;
  const lift = getLiftAccess(destination.typeDetails);
  const checkIn = destination.typeDetails?.checkIn;
  const checkOut = destination.typeDetails?.checkOut;
  const nights =
    destination.typeDetails?.nights ?? nightsBetween(checkIn, checkOut);
  const stay = formatStayRange(checkIn, checkOut);
  const airport = nearestPlace(destination.typeDetails?.nearbyAirports);
  const beach = nearestPlace(destination.typeDetails?.nearbyBeaches);
  const city = nearestPlace(destination.typeDetails?.nearbyCities);
  const tags = destination.typeDetails?.tags ?? [];
  const visibleTags = tags.slice(0, 3);
  const extraTagCount = tags.length - visibleTags.length;
  const flightIncluded = Boolean(destination.typeDetails?.flightIncluded);
  const stayPrice = formatPrice(destination.priceTotalCents);
  const perNight = formatPricePerNight(destination.priceTotalCents, nights);
  const travelers = Math.max(1, trip.members.length);
  const flightHint = destination.typeDetails?.flightHint;
  const perPersonFlight = flightCostRange(flightHint, 1);
  const groupFlight = flightIncluded
    ? null
    : flightCostRange(flightHint, travelers);
  const combinedTotal =
    !flightIncluded && groupFlight
      ? addStayAndFlight(destination.priceTotalCents, groupFlight)
      : null;
  const stayTotal =
    destination.priceTotalCents != null
      ? {
          minCents: destination.priceTotalCents,
          maxCents: destination.priceTotalCents,
        }
      : null;
  const totalCost = flightIncluded ? stayTotal : combinedTotal;
  const totalLabel = formatTripCostRange(totalCost);
  const overlayPrice = totalLabel ?? stayPrice;

  const hasSummerContext =
    Boolean(destination.locationText?.trim()) ||
    Boolean(destination.typeDetails?.nearbyCities?.length) ||
    Boolean(destination.typeDetails?.nearbyBeaches?.length) ||
    Boolean(destination.typeDetails?.nearbyAirports?.length);
  const requestedFlight = useRef<string | null>(null);

  useEffect(() => {
    if (!isSummer || flightIncluded) return;
    if (perPersonFlight) return;
    if (!hasSummerContext) return;
    const key = `${destination.id}:${SUMMER_OVERVIEW_VERSION}`;
    if (requestedFlight.current === key) return;
    requestedFlight.current = key;

    void (async () => {
      try {
        const res = await fetch(
          `/api/trips/${trip.token}/destinations/${destination.id}/summer-summary`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ force: false }),
          }
        );
        const json = await res.json();
        if (!res.ok) return;
        setTrip((current) => ({
          ...current,
          destinations: current.destinations.map((d) =>
            d.id === destination.id
              ? {
                  ...d,
                  typeDetails: {
                    ...d.typeDetails,
                    summerOverview:
                      json.overview ?? d.typeDetails.summerOverview,
                    climate: json.climate ?? d.typeDetails.climate,
                    activities: json.activities ?? d.typeDetails.activities,
                    flightHint: json.flightHint ?? d.typeDetails.flightHint,
                    summerOverviewGeneratedAt:
                      json.generatedAt ??
                      d.typeDetails.summerOverviewGeneratedAt,
                    summerOverviewVersion: SUMMER_OVERVIEW_VERSION,
                  },
                }
              : d
          ),
        }));
      } catch {
        // Card can still show stay price only
      }
    })();
  }, [
    isSummer,
    flightIncluded,
    perPersonFlight,
    hasSummerContext,
    destination.id,
    trip.token,
    setTrip,
  ]);

  function prev(e: React.MouseEvent) {
    e.stopPropagation();
    setIndex((i) => (i - 1 + photos.length) % photos.length);
  }
  function next(e: React.MouseEvent) {
    e.stopPropagation();
    setIndex((i) => (i + 1) % photos.length);
  }

  return (
    <article
      className={cn(
        "overflow-hidden rounded-3xl bg-white shadow-lg transition-transform hover:-translate-y-0.5",
        isWinner
          ? "shadow-amber-500/20 ring-2 ring-amber-400"
          : "shadow-sky-900/5 ring-1 ring-sky-100/80"
      )}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen();
      }}
    >
      <div className="relative aspect-[16/10] bg-gradient-to-br from-sky-100 to-indigo-100">
        {current ? (
          <Image
            src={current.blobUrl}
            alt={destination.name}
            fill
            className="object-cover"
            sizes="(max-width:768px) 100vw, 400px"
            priority={index === 0}
            unoptimized={shouldUnoptimizeImage(current.blobUrl)}
            referrerPolicy={imageReferrerPolicy(current.blobUrl)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sky-400">
            <ImageIcon className="size-10" />
            <span className="text-sm font-medium">Nog geen foto&apos;s</span>
          </div>
        )}

        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute top-1/2 left-2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute top-1/2 right-2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
            >
              <ChevronRight className="size-4" />
            </button>
            <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1">
              {photos.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "size-1.5 rounded-full",
                    i === index ? "bg-white" : "bg-white/50"
                  )}
                />
              ))}
            </div>
          </>
        )}

        {isWinner && (
          <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-2.5 py-1 text-xs font-bold text-amber-950 shadow-sm">
            <Trophy className="size-3.5" />
            Huidige favoriet
          </div>
        )}

        {overlayPrice && (
          <div className="absolute top-3 right-3 z-10 rounded-full bg-white/95 px-3 py-1 text-right text-sm font-bold text-sky-700 shadow-sm">
            {isSummer && totalLabel && !flightIncluded ? "~" : ""}
            {overlayPrice}
            {isSummer && flightIncluded && (
              <div className="text-[10px] font-medium text-teal-700">
                incl. vlucht
              </div>
            )}
            {isSummer && totalLabel && !flightIncluded && (
              <div className="text-[10px] font-medium text-muted-foreground">
                geschat totaal
              </div>
            )}
            {isSummer && !totalLabel && perNight && (
              <div className="text-[10px] font-medium text-muted-foreground">
                {perNight}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="text-lg leading-tight font-bold">{destination.name}</h3>
          {destination.locationText && (
            <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
              {destination.locationText}
            </p>
          )}
        </div>

        {isSummer && (stayPrice || groupFlight || flightIncluded) && (
          <div className="space-y-1 rounded-2xl bg-sky-50/80 px-3 py-2.5 text-sm ring-1 ring-sky-100">
            {stayPrice && (
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground">Verblijf</span>
                <span className="font-medium">{stayPrice}</span>
              </div>
            )}
            {flightIncluded ? (
              <div className="flex items-baseline justify-between gap-3 text-teal-800">
                <span>Vlucht</span>
                <span className="font-medium">inbegrepen</span>
              </div>
            ) : groupFlight ? (
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 text-muted-foreground">
                  Vlucht
                  {perPersonFlight
                    ? ` · ~${formatTripCostRange(perPersonFlight)} p.p.`
                    : ""}
                  {` · ${travelers}p`}
                </span>
                <span className="shrink-0 font-medium">
                  ~{formatTripCostRange(groupFlight)}
                </span>
              </div>
            ) : hasSummerContext ? (
              <div className="flex items-baseline justify-between gap-3 text-muted-foreground">
                <span>Vlucht</span>
                <span>schatting laden…</span>
              </div>
            ) : null}
            {(stayPrice || groupFlight) && (
              <div className="flex items-baseline justify-between gap-3 border-t border-sky-100 pt-1.5 font-semibold text-sky-800">
                <span>Totaal</span>
                <span>
                  {!flightIncluded && groupFlight ? "~" : ""}
                  {totalLabel ?? stayPrice}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {isSummer ? (
            <>
              {stay && (
                <Badge variant="secondary" className="gap-1 rounded-full">
                  <CalendarDays className="size-3" />
                  {stay}
                  {nights != null ? ` · ${nights}n` : ""}
                </Badge>
              )}
              {flightIncluded && (
                <Badge className="gap-1 rounded-full bg-teal-600 text-white hover:bg-teal-600">
                  <Plane className="size-3" />
                  Vlucht inbegrepen
                </Badge>
              )}
              {airport && (
                <Badge variant="secondary" className="gap-1 rounded-full">
                  <Plane className="size-3" />
                  {formatKm(airport.km)} tot {airport.code || airport.name}
                </Badge>
              )}
              {beach && (
                <Badge variant="secondary" className="gap-1 rounded-full">
                  <Palmtree className="size-3" />
                  {formatKm(beach.km)} tot het strand
                </Badge>
              )}
              {city && (
                <Badge variant="secondary" className="gap-1 rounded-full">
                  <Building2 className="size-3" />
                  {formatKm(city.km)} tot {city.name}
                </Badge>
              )}
              {visibleTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="rounded-full">
                  {tag}
                </Badge>
              ))}
              {extraTagCount > 0 && (
                <Badge variant="secondary" className="rounded-full">
                  +{extraTagCount}
                </Badge>
              )}
            </>
          ) : (
            <>
              {skiArea && (
                <Badge variant="secondary" className="gap-1 rounded-full">
                  <Mountain className="size-3" />
                  {skiArea}
                </Badge>
              )}
              {lift.km != null && (
                <Badge variant="secondary" className="gap-1 rounded-full">
                  <Route className="size-3" />
                  {formatKm(lift.km)} tot de lift
                </Badge>
              )}
              {lift.km == null && lift.minutes != null && (
                <Badge variant="secondary" className="gap-1 rounded-full">
                  <Timer className="size-3" />
                  {lift.minutes} min tot de lift
                </Badge>
              )}
              {lift.km != null && lift.minutes != null && (
                <Badge variant="secondary" className="gap-1 rounded-full">
                  <Timer className="size-3" />~{lift.minutes} min
                </Badge>
              )}
            </>
          )}
        </div>

        <ReactionBar destination={destination} />
        <CommentThread destination={destination} />
      </div>
    </article>
  );
}

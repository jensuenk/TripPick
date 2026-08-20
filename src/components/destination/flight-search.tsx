"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ApiDestination } from "@/lib/trip-data";
import { HOME_AIRPORTS } from "@/lib/trip-types";
import {
  estimateTransferMinutes,
  flightSearchLinks,
  nearestPlace,
} from "@/lib/summer";
import { formatKm, formatPrice } from "@/lib/format";

const STORAGE_KEY = "trippick:home-airport";

type Props = {
  destination: ApiDestination;
  flightHint?: ApiDestination["typeDetails"]["flightHint"];
};

export function FlightSearch({ destination, flightHint }: Props) {
  const [origin, setOrigin] = useState("BRU");
  const [compareOpen, setCompareOpen] = useState(false);
  const flightIncluded = Boolean(destination.typeDetails?.flightIncluded);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && HOME_AIRPORTS.some((a) => a.code === stored)) {
        setOrigin(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  const airport = nearestPlace(destination.typeDetails?.nearbyAirports);
  const city = nearestPlace(destination.typeDetails?.nearbyCities);
  const checkIn = destination.typeDetails?.checkIn;
  const checkOut = destination.typeDetails?.checkOut;

  const links = useMemo(
    () =>
      flightSearchLinks({
        originCode: origin,
        destCode: airport?.code,
        destName: airport?.name || city?.name || destination.locationText,
        checkIn,
        checkOut,
      }),
    [origin, airport?.code, airport?.name, city?.name, destination.locationText, checkIn, checkOut]
  );

  const destLabel = airport
    ? `${airport.name}${airport.code ? ` (${airport.code})` : ""}`
    : city?.name || destination.locationText || "bestemming";

  const transferMin = estimateTransferMinutes(airport?.km ?? null);
  const hint = flightHint ?? destination.typeDetails?.flightHint;
  const priceRange =
    hint?.priceMinEuros != null && hint?.priceMaxEuros != null
      ? `${formatPrice(hint.priceMinEuros * 100)} – ${formatPrice(hint.priceMaxEuros * 100)}`
      : null;

  function onOriginChange(code: string) {
    setOrigin(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // ignore
    }
  }

  return (
    <div className="rounded-2xl border border-sky-200/80 bg-white p-4">
      {flightIncluded ? (
        <div className="mb-3 flex items-start gap-2 rounded-xl bg-teal-50 px-3 py-2.5 ring-1 ring-teal-100">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white">
            <Plane className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-teal-900">
              Vlucht al inbegrepen
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-teal-800/80">
              De prijs van deze accommodatie bevat de vliegtickets. Je hoeft
              geen aparte vlucht te boeken.
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-3 flex items-start gap-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
            <Plane className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">Goedkoopste vluchten zoeken</div>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              We linken naar Google Flights, Skyscanner en Kayak met jouw data.
              Live prijzen staan op die sites — TripPick toont alleen een
              indicatie.
            </p>
          </div>
        </div>
      )}

      {flightIncluded && !compareOpen ? (
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full rounded-xl"
          onClick={() => setCompareOpen(true)}
        >
          Toch vluchten vergelijken
        </Button>
      ) : (
        <>
          {flightIncluded && (
            <p className="mb-3 text-xs text-muted-foreground">
              Optioneel — vergelijk andere vluchten als je zelf wilt vliegen.
            </p>
          )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-medium">
          Van
          <select
            value={origin}
            onChange={(e) => onOriginChange(e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {HOME_AIRPORTS.map((a) => (
              <option key={a.code} value={a.code}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <div className="space-y-1 text-xs font-medium">
          Naar
          <div className="flex h-10 items-center rounded-lg border border-input px-3 text-sm font-normal">
            {destLabel}
          </div>
        </div>
      </div>

      {airport && (
        <p className="mt-2 text-xs text-muted-foreground">
          Dichtstbijzijnde luchthaven {formatKm(airport.km)}
          {transferMin != null ? ` · ~${transferMin} min transfer` : ""}
        </p>
      )}

      {(hint?.hours != null || priceRange) && (
        <div className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-sm ring-1 ring-sky-100">
          {hint?.hours != null && (
            <div>
              Typische vliegtijd:{" "}
              <span className="font-semibold">~{hint.hours} u</span> enkele reis
            </div>
          )}
          {priceRange && (
            <div>
              Indicatie retour p.p.:{" "}
              <span className="font-semibold">{priceRange}</span>
            </div>
          )}
          {hint?.note && (
            <p className="mt-1 text-xs text-muted-foreground">{hint.note}</p>
          )}
        </div>
      )}

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <a href={links.google} target="_blank" rel="noreferrer">
          <Button variant="outline" className="h-10 w-full rounded-xl">
            Google Flights
            <ExternalLink className="size-3.5" />
          </Button>
        </a>
        {links.skyscanner && (
          <a href={links.skyscanner} target="_blank" rel="noreferrer">
            <Button variant="outline" className="h-10 w-full rounded-xl">
              Skyscanner
              <ExternalLink className="size-3.5" />
            </Button>
          </a>
        )}
        {links.kayak && (
          <a href={links.kayak} target="_blank" rel="noreferrer">
            <Button variant="outline" className="h-10 w-full rounded-xl">
              Kayak
              <ExternalLink className="size-3.5" />
            </Button>
          </a>
        )}
      </div>
        </>
      )}
    </div>
  );
}

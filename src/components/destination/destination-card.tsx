"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Mountain,
  Route,
  Timer,
  Trophy,
} from "lucide-react";
import type { ApiDestination } from "@/lib/trip-data";
import { ReactionBar } from "@/components/destination/reaction-bar";
import { CommentThread } from "@/components/destination/comment-thread";
import { formatKm, formatPrice, getLiftAccess } from "@/lib/format";
import { cn } from "@/lib/utils";
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
  const photos = destination.images
    .filter((i) => i.category !== "skimap")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const [index, setIndex] = useState(0);
  const current = photos[index];
  const skiArea = destination.typeDetails?.skiArea;
  const lift = getLiftAccess(destination.typeDetails);
  const price = formatPrice(destination.priceTotalCents);

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
            unoptimized={current.blobUrl.startsWith("/")}
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

        {price && (
          <div className="absolute top-3 right-3 z-10 rounded-full bg-white/95 px-3 py-1 text-sm font-bold text-sky-700 shadow-sm">
            {price}
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

        <div className="flex flex-wrap gap-1.5">
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
        </div>

        <ReactionBar destination={destination} />
        <CommentThread destination={destination} />
      </div>
    </article>
  );
}

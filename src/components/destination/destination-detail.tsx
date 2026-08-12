"use client";

import { CommentThread } from "@/components/destination/comment-thread";
import { ReactionBar } from "@/components/destination/reaction-bar";
import { SkiResortSummary } from "@/components/destination/ski-resort-summary";
import { MapPreviewDynamic } from "@/components/shared/map-dynamic";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { useTrip } from "@/components/trip/trip-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  bedTypeMeta,
  formatKm,
  formatPrice,
  getLiftAccess,
} from "@/lib/format";
import type { ApiDestination } from "@/lib/trip-data";
import { cn } from "@/lib/utils";
import {
  Bath,
  BedDouble,
  ExternalLink,
  MapPin,
  Mountain,
  Pencil,
  Route,
  Timer,
  X,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type Props = {
  destination: ApiDestination | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
};

export function DestinationDetail({
  destination,
  open,
  onOpenChange,
  onEdit,
}: Props) {
  const { trip } = useTrip();
  const [lightbox, setLightbox] = useState<string | null>(null);
  if (!destination) return null;

  const photos = destination.images
    .filter((i) => i.category !== "skimap")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const skiMaps = destination.images.filter((i) => i.category === "skimap");
  const price = formatPrice(destination.priceTotalCents);
  const skiArea = destination.typeDetails?.skiArea;
  const lift = getLiftAccess(destination.typeDetails);
  const creator = trip.members.find(
    (m) => m.id === destination.createdByMemberId,
  );

  const byKind = {
    favorite: destination.reactions.filter((r) => r.kind === "favorite"),
    like: destination.reactions.filter((r) => r.kind === "like"),
    maybe: destination.reactions.filter((r) => r.kind === "maybe"),
    no: destination.reactions.filter((r) => r.kind === "no"),
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[94dvh] max-w-2xl flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-2xl">
          <div className="relative max-h-[40vh] overflow-hidden bg-gradient-to-br from-sky-100 to-indigo-100">
            {photos[0] ? (
              <button
                type="button"
                className="relative block aspect-[16/10] w-full"
                onClick={() => setLightbox(photos[0].blobUrl)}
              >
                <Image
                  src={photos[0].blobUrl}
                  alt={destination.name}
                  fill
                  className="object-cover"
                  unoptimized={photos[0].blobUrl.startsWith("/")}
                />
              </button>
            ) : (
              <div className="flex aspect-[16/10] items-center justify-center text-sky-400">
                <Mountain className="size-12" />
              </div>
            )}
            <DialogHeader className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent p-4 pt-16 text-left">
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-xl leading-tight text-white drop-shadow">
                    {destination.name}
                  </DialogTitle>
                  {destination.locationText && (
                    <p className="mt-1 flex items-center gap-1 text-sm text-white/85">
                      <MapPin className="size-3.5 shrink-0" />
                      <span className="line-clamp-1">
                        {destination.locationText}
                      </span>
                    </p>
                  )}
                </div>
                {price && (
                  <span className="shrink-0 rounded-full bg-white/95 px-3 py-1 text-sm font-bold text-sky-700 shadow-sm">
                    {price}
                  </span>
                )}
              </div>
            </DialogHeader>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
            <div className="flex items-center gap-3">
              {creator && (
                <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                  <MemberAvatar
                    name={creator.firstName}
                    color={creator.avatarColor}
                    size="sm"
                  />
                  <span className="truncate">
                    Toegevoegd door{" "}
                    <span className="font-medium text-foreground">
                      {creator.firstName}
                    </span>
                  </span>
                </div>
              )}
              <div className="ml-auto flex shrink-0 items-center gap-2">
                {destination.bookingUrl && (
                  <a
                    href={destination.bookingUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button size="sm" className="rounded-full">
                      <ExternalLink />
                      Website bezoeken
                    </Button>
                  </a>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={onEdit}
                >
                  <Pencil />
                  Bewerken
                </Button>
              </div>
            </div>

            <ReactionBar destination={destination} />

            <div className="flex flex-wrap gap-2">
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
              {lift.minutes != null && (
                <Badge variant="secondary" className="gap-1 rounded-full">
                  <Timer className="size-3" />
                  ~{lift.minutes} min rijden
                </Badge>
              )}
              {destination.bedrooms != null && (
                <Badge variant="secondary" className="gap-1 rounded-full">
                  <BedDouble className="size-3" />
                  {destination.bedrooms}{" "}
                  {destination.bedrooms === 1 ? "slaapkamer" : "slaapkamers"}
                </Badge>
              )}
              {destination.bathrooms != null && (
                <Badge variant="secondary" className="gap-1 rounded-full">
                  <Bath className="size-3" />
                  {destination.bathrooms}{" "}
                  {destination.bathrooms === 1 ? "badkamer" : "badkamers"}
                </Badge>
              )}
              {destination.beds.map((bed, i) => {
                const meta = bedTypeMeta(bed.type);
                const Icon = meta?.icon ?? BedDouble;
                return (
                  <Badge
                    key={`${bed.type}-${i}`}
                    variant="secondary"
                    className="gap-1 rounded-full"
                  >
                    <Icon className="size-3" />
                    {bed.count}× {meta?.label ?? bed.type}
                  </Badge>
                );
              })}
            </div>

            {destination.description && (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {destination.description}
              </p>
            )}

            {(destination.pros.length > 0 || destination.cons.length > 0) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {destination.pros.length > 0 && (
                  <div>
                    <div className="mb-2 text-xs font-semibold tracking-wide text-emerald-700 uppercase">
                      Pluspunten
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {destination.pros.map((p) => (
                        <span
                          key={p}
                          className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {destination.cons.length > 0 && (
                  <div>
                    <div className="mb-2 text-xs font-semibold tracking-wide text-rose-700 uppercase">
                      Minpunten
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {destination.cons.map((c) => (
                        <span
                          key={c}
                          className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-100"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {photos.length > 1 && (
              <div>
                <div className="mb-2 text-sm font-semibold">Galerij</div>
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      className="relative aspect-square overflow-hidden rounded-xl"
                      onClick={() => setLightbox(img.blobUrl)}
                    >
                      <Image
                        src={img.blobUrl}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized={img.blobUrl.startsWith("/")}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {destination.lat != null && destination.lng != null && (
              <div>
                <div className="mb-2 text-sm font-semibold">Locatie</div>
                <MapPreviewDynamic
                  lat={destination.lat}
                  lng={destination.lng}
                  className="h-48 w-full"
                />
              </div>
            )}

            {(skiMaps.length > 0 || Boolean(skiArea)) && (
              <div className="space-y-3">
                <div className="text-sm font-semibold">Over het skigebied</div>
                {skiMaps.length > 0 && (
                  <div className="grid gap-2">
                    {skiMaps.map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        className="relative aspect-[4/3] overflow-hidden rounded-2xl ring-1 ring-sky-100"
                        onClick={() => setLightbox(img.blobUrl)}
                      >
                        <Image
                          src={img.blobUrl}
                          alt="Skikaart"
                          fill
                          className="object-contain bg-white"
                          unoptimized={img.blobUrl.startsWith("/")}
                        />
                      </button>
                    ))}
                  </div>
                )}
                <SkiResortSummary destination={destination} />
              </div>
            )}

            <div>
              <div className="mb-2 text-sm font-semibold">Stemmen</div>
              <div className="space-y-2">
                {(
                  [
                    ["favorite", "❤️ Favorieten", byKind.favorite],
                    ["like", "👍 Leuk", byKind.like],
                    ["maybe", "🤔 Misschien", byKind.maybe],
                    ["no", "👎 Nee", byKind.no],
                  ] as const
                ).map(([key, label, list]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2"
                  >
                    <span className="text-sm font-medium">{label}</span>
                    <div className="flex -space-x-2">
                      {list.length === 0 && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                      {list.map((r) => (
                        <MemberAvatar
                          key={r.id}
                          name={r.member.firstName}
                          color={r.member.avatarColor}
                          size="sm"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />
            <CommentThread destination={destination} defaultExpanded />
          </div>
        </DialogContent>
      </Dialog>

      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white"
            onClick={() => setLightbox(null)}
          >
            <X />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt=""
            className={cn("max-h-full max-w-full object-contain")}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

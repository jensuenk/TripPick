"use client";

import { CommentThread } from "@/components/destination/comment-thread";
import { ReactionBar } from "@/components/destination/reaction-bar";
import { SkiResortSummary } from "@/components/destination/ski-resort-summary";
import { SummerOverview } from "@/components/destination/summer-overview";
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
  formatPricePerNight,
  getLiftAccess,
} from "@/lib/format";
import {
  estimateTransferMinutes,
  formatStayRange,
  nightsBetween,
} from "@/lib/summer";
import type { ApiDestination } from "@/lib/trip-data";
import { cn, imageReferrerPolicy, shouldUnoptimizeImage } from "@/lib/utils";
import {
  Bath,
  BedDouble,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  Mountain,
  Palmtree,
  Pencil,
  Plane,
  Route,
  Timer,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

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
  const isSummer = trip.type === "summer";
  const [lightbox, setLightbox] = useState<{
    source: "photos" | "skimaps";
    images: { id: string; blobUrl: string }[];
    index: number;
  } | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    setGalleryIndex(0);
    setLightbox(null);
  }, [destination?.id, open]);

  function stepLightbox(delta: number) {
    setLightbox((current) => {
      if (!current || current.images.length < 2) return current;
      const next =
        (current.index + delta + current.images.length) % current.images.length;
      if (current.source === "photos") setGalleryIndex(next);
      return { ...current, index: next };
    });
  }

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setLightbox(null);
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        stepLightbox(-1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        stepLightbox(1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  if (!destination) return null;

  const photos = destination.images
    .filter((i) => i.category !== "skimap")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const skiMaps = destination.images.filter((i) => i.category === "skimap");
  const price = formatPrice(destination.priceTotalCents);
  const skiArea = destination.typeDetails?.skiArea;
  const lift = getLiftAccess(destination.typeDetails);
  const nearbyLifts = Array.isArray(destination.typeDetails?.nearbyLifts)
    ? destination.typeDetails.nearbyLifts
    : [];
  const checkIn = destination.typeDetails?.checkIn;
  const checkOut = destination.typeDetails?.checkOut;
  const nights =
    destination.typeDetails?.nights ?? nightsBetween(checkIn, checkOut);
  const stay = formatStayRange(checkIn, checkOut);
  const perNight = formatPricePerNight(destination.priceTotalCents, nights);
  const tags = destination.typeDetails?.tags ?? [];
  const flightIncluded = Boolean(destination.typeDetails?.flightIncluded);
  const nearbyAirports = destination.typeDetails?.nearbyAirports ?? [];
  const nearbyBeaches = destination.typeDetails?.nearbyBeaches ?? [];
  const nearbyCities = destination.typeDetails?.nearbyCities ?? [];
  const creator = trip.members.find(
    (m) => m.id === destination.createdByMemberId,
  );

  const safeGalleryIndex =
    photos.length > 0 ? Math.min(galleryIndex, photos.length - 1) : 0;
  const galleryPhoto = photos[safeGalleryIndex] ?? null;

  function showPrevPhoto() {
    if (photos.length < 2) return;
    setGalleryIndex((i) => (i - 1 + photos.length) % photos.length);
  }

  function showNextPhoto() {
    if (photos.length < 2) return;
    setGalleryIndex((i) => (i + 1) % photos.length);
  }

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
          <div className="relative h-48 w-full shrink-0 overflow-hidden bg-gradient-to-br from-sky-100 to-indigo-100 sm:h-56">
            {photos[0] ? (
              <button
                type="button"
                className="absolute inset-0 block"
                onClick={() =>
                  setLightbox({
                    source: "photos",
                    images: photos,
                    index: 0,
                  })
                }
              >
                <Image
                  src={photos[0].blobUrl}
                  alt={destination.name}
                  fill
                  priority
                  sizes="(max-width:768px) 100vw, 672px"
                  className="object-cover"
                  unoptimized={shouldUnoptimizeImage(photos[0].blobUrl)}
                  referrerPolicy={imageReferrerPolicy(photos[0].blobUrl)}
                />
              </button>
            ) : (
              <div className="flex h-full items-center justify-center text-sky-400">
                <Mountain className="size-12" />
              </div>
            )}
            <DialogHeader className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent p-4 pt-12 text-left">
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
                  <span className="shrink-0 rounded-full bg-white/95 px-3 py-1 text-right text-sm font-bold text-sky-700 shadow-sm">
                    {price}
                    {isSummer && perNight && (
                      <span className="block text-[10px] font-medium text-muted-foreground">
                        {perNight}
                        {flightIncluded ? " · incl. vlucht" : ""}
                      </span>
                    )}
                    {isSummer && flightIncluded && !perNight && (
                      <span className="block text-[10px] font-medium text-teal-700">
                        incl. vlucht
                      </span>
                    )}
                  </span>
                )}
              </div>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
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
              {isSummer && stay && (
                <Badge variant="secondary" className="gap-1 rounded-full">
                  <CalendarDays className="size-3" />
                  {stay}
                  {nights != null
                    ? ` · ${nights} ${nights === 1 ? "nacht" : "nachten"}`
                    : ""}
                </Badge>
              )}
              {isSummer && flightIncluded && (
                <Badge className="gap-1 rounded-full bg-teal-600 text-white hover:bg-teal-600">
                  <Plane className="size-3" />
                  Vlucht inbegrepen
                </Badge>
              )}
              {!isSummer && skiArea && (
                <Badge variant="secondary" className="gap-1 rounded-full">
                  <Mountain className="size-3" />
                  {skiArea}
                </Badge>
              )}
              {!isSummer && lift.km != null && (
                <Badge variant="secondary" className="gap-1 rounded-full">
                  <Route className="size-3" />
                  {formatKm(lift.km)} tot de lift
                </Badge>
              )}
              {!isSummer && lift.minutes != null && (
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
              {isSummer &&
                tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="rounded-full">
                    {tag}
                  </Badge>
                ))}
            </div>

            {isSummer &&
              (nearbyAirports.length > 0 ||
                nearbyBeaches.length > 0 ||
                nearbyCities.length > 0) && (
                <div className="grid gap-3">
                  {nearbyAirports.length > 0 && (
                    <NearbyList
                      title="Luchthavens"
                      icon={Plane}
                      places={nearbyAirports}
                      extra={(p) =>
                        estimateTransferMinutes(p.km) != null
                          ? `~${estimateTransferMinutes(p.km)} min transfer`
                          : null
                      }
                    />
                  )}
                  {nearbyBeaches.length > 0 && (
                    <NearbyList
                      title="Stranden"
                      icon={Palmtree}
                      places={nearbyBeaches}
                    />
                  )}
                  {nearbyCities.length > 0 && (
                    <NearbyList
                      title="Steden"
                      icon={Building2}
                      places={nearbyCities}
                    />
                  )}
                </div>
              )}

            {!isSummer && nearbyLifts.length > 0 && (
              <div className="rounded-2xl bg-muted/40 px-3.5 py-3">
                <div className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Nabije skiliften
                </div>
                <ul className="space-y-1 text-sm">
                  {nearbyLifts.map((l, i) => (
                    <li
                      key={`${l.name}-${i}`}
                      className="flex items-center justify-between gap-3"
                    >
                      <span>{l.name}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {formatKm(l.km)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

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

            {photos.length > 1 && galleryPhoto && (
              <div>
                <div className="mb-2 text-sm font-semibold">Galerij</div>
                <div className="space-y-2">
                  <div className="relative overflow-hidden rounded-2xl bg-muted">
                    <button
                      type="button"
                      className="relative block aspect-[16/10] w-full"
                      onClick={() =>
                        setLightbox({
                          source: "photos",
                          images: photos,
                          index: safeGalleryIndex,
                        })
                      }
                    >
                      <Image
                        src={galleryPhoto.blobUrl}
                        alt=""
                        fill
                        sizes="(max-width:768px) 100vw, 672px"
                        className="object-cover"
                        unoptimized={shouldUnoptimizeImage(
                          galleryPhoto.blobUrl
                        )}
                        referrerPolicy={imageReferrerPolicy(
                          galleryPhoto.blobUrl
                        )}
                      />
                    </button>
                    <button
                      type="button"
                      aria-label="Vorige foto"
                      className="absolute top-1/2 left-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/60"
                      onClick={showPrevPhoto}
                    >
                      <ChevronLeft className="size-5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Volgende foto"
                      className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/60"
                      onClick={showNextPhoto}
                    >
                      <ChevronRight className="size-5" />
                    </button>
                    <div className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white">
                      {safeGalleryIndex + 1} / {photos.length}
                    </div>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                    {photos.map((img, index) => (
                      <button
                        key={img.id}
                        type="button"
                        aria-label={`Foto ${index + 1}`}
                        className={cn(
                          "relative h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-2 transition",
                          index === safeGalleryIndex
                            ? "ring-sky-500"
                            : "ring-transparent opacity-80 hover:opacity-100"
                        )}
                        onClick={() => setGalleryIndex(index)}
                      >
                        <Image
                          src={img.blobUrl}
                          alt=""
                          fill
                          sizes="56px"
                          className="object-cover"
                          unoptimized={shouldUnoptimizeImage(img.blobUrl)}
                          referrerPolicy={imageReferrerPolicy(img.blobUrl)}
                        />
                      </button>
                    ))}
                  </div>
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

            {isSummer && (
              <div className="space-y-3">
                <div className="text-sm font-semibold">Over de bestemming</div>
                <SummerOverview destination={destination} />
              </div>
            )}

            {!isSummer && (skiMaps.length > 0 || Boolean(skiArea)) && (
              <div className="space-y-3">
                <div className="text-sm font-semibold">Over het skigebied</div>
                {skiMaps.length > 0 && (
                  <div className="grid gap-2">
                    {skiMaps.map((img, mapIndex) => (
                      <button
                        key={img.id}
                        type="button"
                        className="relative aspect-[4/3] overflow-hidden rounded-2xl ring-1 ring-sky-100"
                        onClick={() =>
                          setLightbox({
                            source: "skimaps",
                            images: skiMaps,
                            index: mapIndex,
                          })
                        }
                      >
                        <Image
                          src={img.blobUrl}
                          alt="Skikaart"
                          fill
                          sizes="(max-width:768px) 100vw, 672px"
                          className="object-contain bg-white"
                          unoptimized={shouldUnoptimizeImage(img.blobUrl)}
                          referrerPolicy={imageReferrerPolicy(img.blobUrl)}
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

      {lightbox && lightbox.images[lightbox.index] && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            aria-label="Sluiten"
            className="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setLightbox(null)}
          >
            <X />
          </button>

          {lightbox.images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Vorige foto"
                className="absolute top-1/2 left-3 z-10 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm hover:bg-white/25 sm:left-6"
                onClick={(e) => {
                  e.stopPropagation();
                  stepLightbox(-1);
                }}
              >
                <ChevronLeft className="size-7" />
              </button>
              <button
                type="button"
                aria-label="Volgende foto"
                className="absolute top-1/2 right-3 z-10 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm hover:bg-white/25 sm:right-6"
                onClick={(e) => {
                  e.stopPropagation();
                  stepLightbox(1);
                }}
              >
                <ChevronRight className="size-7" />
              </button>
              <div className="pointer-events-none absolute bottom-5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm font-medium text-white">
                {lightbox.index + 1} / {lightbox.images.length}
              </div>
            </>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.images[lightbox.index].blobUrl}
            alt=""
            className={cn("max-h-full max-w-full object-contain")}
            referrerPolicy={imageReferrerPolicy(
              lightbox.images[lightbox.index].blobUrl
            )}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

function NearbyList({
  title,
  icon: Icon,
  places,
  extra,
}: {
  title: string;
  icon: typeof Plane;
  places: { name: string; km: number; code?: string }[];
  extra?: (place: { name: string; km: number; code?: string }) => string | null;
}) {
  return (
    <div className="rounded-2xl bg-muted/40 px-3.5 py-3">
      <div className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <Icon className="size-3.5" />
        {title}
      </div>
      <ul className="space-y-1 text-sm">
        {places.map((p, i) => (
          <li
            key={`${p.name}-${i}`}
            className="flex items-center justify-between gap-3"
          >
            <span>
              {p.name}
              {p.code ? ` (${p.code})` : ""}
              {extra?.(p) ? (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {extra(p)}
                </span>
              ) : null}
            </span>
            <span className="shrink-0 text-muted-foreground">
              {formatKm(p.km)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPreviewDynamic } from "@/components/shared/map-dynamic";
import { useTrip } from "@/components/trip/trip-context";
import type { ApiDestination } from "@/lib/trip-data";
import type { BedConfig } from "@/db/schema";
import { BED_TYPES, IMAGE_CATEGORIES, type ImageCategory } from "@/lib/trip-types";
import { geocodeLocation } from "@/lib/geocoding";
import { uploadImage } from "@/lib/upload";
import {
  bedTypeMeta,
  centsToEuros,
  estimateDriveMinutes,
  eurosToCents,
  LIFT_DRIVE_KMH,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type ImageDraft = {
  blobUrl: string;
  category: ImageCategory;
  sortOrder: number;
  localId: string;
};

type FormState = {
  name: string;
  locationText: string;
  lat: number | null;
  lng: number | null;
  bookingUrl: string;
  priceEuros: string;
  bedrooms: string;
  bathrooms: string;
  beds: BedConfig[];
  skiArea: string;
  kmToLift: string;
  description: string;
  pros: string[];
  cons: string[];
  images: ImageDraft[];
};

function fromDestination(d?: ApiDestination | null): FormState {
  return {
    name: d?.name ?? "",
    locationText: d?.locationText ?? "",
    lat: d?.lat ?? null,
    lng: d?.lng ?? null,
    bookingUrl: d?.bookingUrl ?? "",
    priceEuros:
      d?.priceTotalCents != null ? String(centsToEuros(d.priceTotalCents)) : "",
    bedrooms: d?.bedrooms != null ? String(d.bedrooms) : "",
    bathrooms: d?.bathrooms != null ? String(d.bathrooms) : "",
    beds: d?.beds?.length ? d.beds : [],
    skiArea: d?.typeDetails?.skiArea ?? "",
    kmToLift:
      d?.typeDetails?.kmToLift != null
        ? String(d.typeDetails.kmToLift)
        : "",
    description: d?.description ?? "",
    pros: d?.pros ?? [],
    cons: d?.cons ?? [],
    images:
      d?.images.map((img, i) => ({
        blobUrl: img.blobUrl,
        category: img.category as ImageCategory,
        sortOrder: img.sortOrder ?? i,
        localId: img.id,
      })) ?? [],
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destination?: ApiDestination | null;
};

const STEPS = ["Basis", "Verblijf", "Ski", "Verhaal", "Foto's"] as const;

export function DestinationWizard({ open, onOpenChange, destination }: Props) {
  const { trip, currentMember, setTrip } = useTrip();
  const isEdit = Boolean(destination);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(() => fromDestination(destination));
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [uploading, setUploading] = useState<ImageCategory | null>(null);
  const [proInput, setProInput] = useState("");
  const [conInput, setConInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Reset when opening for a different destination
  useEffect(() => {
    if (open) {
      setForm(fromDestination(destination));
      setStep(0);
    }
  }, [open, destination]);

  const canNext = step === 0 ? form.name.trim().length > 0 : true;

  async function handleGeocode() {
    if (!form.locationText.trim()) return;
    setGeocoding(true);
    try {
      const result = await geocodeLocation(form.locationText);
      if (!result) {
        toast.error("Kon die locatie niet vinden");
        return;
      }
      setForm((f) => ({
        ...f,
        lat: result.lat,
        lng: result.lng,
        locationText: result.displayName,
      }));
      toast.success("Locatie gevonden");
    } finally {
      setGeocoding(false);
    }
  }

  async function handleUpload(category: ImageCategory, files: FileList | null) {
    if (!files?.length) return;
    setUploading(category);
    try {
      const uploaded: ImageDraft[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadImage(file);
        uploaded.push({
          blobUrl: url,
          category,
          sortOrder: form.images.filter((i) => i.category === category).length,
          localId: crypto.randomUUID(),
        });
      }
      setForm((f) => ({ ...f, images: [...f.images, ...uploaded] }));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload mislukt"
      );
    } finally {
      setUploading(null);
    }
  }

  async function save() {
    if (!currentMember) {
      toast.message("Kies eerst wie je bent");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        memberId: currentMember.id,
        name: form.name.trim(),
        locationText: form.locationText || null,
        lat: form.lat,
        lng: form.lng,
        bookingUrl: form.bookingUrl || null,
        priceTotalCents: form.priceEuros
          ? eurosToCents(Number(form.priceEuros))
          : null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        beds: form.beds,
        description: form.description || null,
        pros: form.pros,
        cons: form.cons,
        typeDetails: {
          skiArea: form.skiArea || undefined,
          kmToLift: form.kmToLift ? Number(form.kmToLift) : undefined,
        },
        images: form.images.map((img, index) => ({
          blobUrl: img.blobUrl,
          category: img.category,
          sortOrder: index,
        })),
      };

      const url = isEdit
        ? `/api/trips/${trip.token}/destinations/${destination!.id}`
        : `/api/trips/${trip.token}/destinations`;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Opslaan mislukt");

      const tripRes = await fetch(`/api/trips/${trip.token}`);
      if (tripRes.ok) setTrip(await tripRes.json());

      toast.success(
        isEdit ? "Bestemming bijgewerkt" : "Bestemming toegevoegd"
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Opslaan mislukt"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!isEdit || !destination || !currentMember) {
      toast.message("Kies eerst wie je bent");
      return;
    }
    const ok = window.confirm(
      `Bestemming “${destination.name}” verwijderen? Dit kan niet ongedaan worden gemaakt.`
    );
    if (!ok) return;

    setDeleting(true);
    try {
      const res = await fetch(
        `/api/trips/${trip.token}/destinations/${destination.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId: currentMember.id }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Verwijderen mislukt");

      setTrip({
        ...trip,
        destinations: trip.destinations.filter((d) => d.id !== destination.id),
      });
      toast.success("Bestemming verwijderd");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Verwijderen mislukt"
      );
    } finally {
      setDeleting(false);
    }
  }

  const categories = IMAGE_CATEGORIES.filter(
    (c) => !("skiOnly" in c && c.skiOnly) || trip.type === "ski"
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[92dvh] max-w-lg flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-lg"
        showCloseButton
      >
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>
            {isEdit ? "Bestemming bewerken" : "Bestemming toevoegen"}
          </DialogTitle>
          <div className="mt-3 flex gap-1.5">
            {STEPS.map((label, i) => (
              <div
                key={label}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  i <= step ? "bg-sky-500" : "bg-sky-100"
                )}
              />
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              {step === 0 && (
                <>
                  <button
                    type="button"
                    disabled
                    className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-sky-200 bg-sky-50/50 p-3 text-left opacity-70"
                  >
                    <div className="flex size-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                      <Sparkles className="size-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">
                        Importeren van boekingssite
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Binnenkort — plak Airbnb/Booking-URL
                      </div>
                    </div>
                  </button>

                  <div className="space-y-2">
                    <Label>Naam *</Label>
                    <Input
                      className="h-11"
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                      placeholder="Chalet Alpine Glow"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Locatie</Label>
                    <div className="flex gap-2">
                      <Input
                        className="h-11"
                        value={form.locationText}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            locationText: e.target.value,
                            lat: null,
                            lng: null,
                          }))
                        }
                        onBlur={() => void handleGeocode()}
                        placeholder="Les Gets, Frankrijk"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11"
                        disabled={geocoding}
                        onClick={() => void handleGeocode()}
                      >
                        {geocoding ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          "Zoeken"
                        )}
                      </Button>
                    </div>
                    {form.lat != null && form.lng != null && (
                      <MapPreviewDynamic
                        lat={form.lat}
                        lng={form.lng}
                        className="mt-2 h-40 w-full"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Boekings-URL</Label>
                    <Input
                      className="h-11"
                      value={form.bookingUrl}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, bookingUrl: e.target.value }))
                      }
                      placeholder="https://…"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Totale prijs (€)</Label>
                    <Input
                      className="h-11"
                      type="number"
                      min={0}
                      value={form.priceEuros}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, priceEuros: e.target.value }))
                      }
                    />
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Slaapkamers</Label>
                      <Input
                        className="h-11"
                        type="number"
                        min={0}
                        value={form.bedrooms}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, bedrooms: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Badkamers</Label>
                      <Input
                        className="h-11"
                        type="number"
                        min={0}
                        value={form.bathrooms}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, bathrooms: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Bedden</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            beds: [...f.beds, { type: "double", count: 1 }],
                          }))
                        }
                      >
                        <Plus />
                        Toevoegen
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {form.beds.map((bed, index) => {
                        const meta = bedTypeMeta(bed.type);
                        const Icon = meta?.icon ?? BED_TYPES[0].icon;
                        return (
                          <div key={index} className="flex items-center gap-2">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground">
                              <Icon className="size-4" />
                            </span>
                            <select
                              value={bed.type}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  beds: f.beds.map((b, i) =>
                                    i === index
                                      ? {
                                          ...b,
                                          type: e.target
                                            .value as BedConfig["type"],
                                        }
                                      : b
                                  ),
                                }))
                              }
                              className="h-10 flex-1 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                            >
                              {BED_TYPES.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                            <Input
                              className="h-10 w-20"
                              type="number"
                              min={1}
                              value={bed.count}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  beds: f.beds.map((b, i) =>
                                    i === index
                                      ? {
                                          ...b,
                                          count: Math.max(
                                            1,
                                            Number(e.target.value) || 1
                                          ),
                                        }
                                      : b
                                  ),
                                }))
                              }
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                setForm((f) => ({
                                  ...f,
                                  beds: f.beds.filter((_, i) => i !== index),
                                }))
                              }
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        );
                      })}
                      {form.beds.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          Optioneel — voeg bedtypes en aantallen toe.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="space-y-2">
                    <Label>Skigebied in de buurt</Label>
                    <Input
                      className="h-11"
                      value={form.skiArea}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, skiArea: e.target.value }))
                      }
                      placeholder="Portes du Soleil"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Afstand tot dichtstbijzijnde lift (km)</Label>
                    <Input
                      className="h-11"
                      type="number"
                      min={0}
                      step="0.1"
                      value={form.kmToLift}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          kmToLift: e.target.value,
                        }))
                      }
                      placeholder="1.5"
                    />
                    {form.kmToLift &&
                      estimateDriveMinutes(Number(form.kmToLift)) != null && (
                        <p className="text-xs text-muted-foreground">
                          Geschatte rijtijd: ~
                          {estimateDriveMinutes(Number(form.kmToLift))} min
                          (gem. {LIFT_DRIVE_KMH} km/u op bergwegen)
                        </p>
                      )}
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="space-y-2">
                    <Label>Beschrijving</Label>
                    <Textarea
                      rows={4}
                      value={form.description}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, description: e.target.value }))
                      }
                      placeholder="Wat maakt deze plek bijzonder?"
                    />
                  </div>
                  <ChipList
                    label="Pluspunten"
                    tone="positive"
                    values={form.pros}
                    input={proInput}
                    setInput={setProInput}
                    onAdd={() => {
                      const v = proInput.trim();
                      if (!v) return;
                      setForm((f) => ({ ...f, pros: [...f.pros, v] }));
                      setProInput("");
                    }}
                    onRemove={(i) =>
                      setForm((f) => ({
                        ...f,
                        pros: f.pros.filter((_, idx) => idx !== i),
                      }))
                    }
                  />
                  <ChipList
                    label="Minpunten"
                    tone="negative"
                    values={form.cons}
                    input={conInput}
                    setInput={setConInput}
                    onAdd={() => {
                      const v = conInput.trim();
                      if (!v) return;
                      setForm((f) => ({ ...f, cons: [...f.cons, v] }));
                      setConInput("");
                    }}
                    onRemove={(i) =>
                      setForm((f) => ({
                        ...f,
                        cons: f.cons.filter((_, idx) => idx !== i),
                      }))
                    }
                  />
                </>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  {categories.map((cat) => {
                    const imgs = form.images.filter(
                      (i) => i.category === cat.id
                    );
                    return (
                      <div key={cat.id} className="space-y-2">
                        <div>
                          <div className="font-semibold">{cat.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {cat.hint}
                          </div>
                        </div>
                        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-sky-200 bg-sky-50/40 px-4 py-6 text-sky-700 hover:bg-sky-50">
                          {uploading === cat.id ? (
                            <Loader2 className="size-6 animate-spin" />
                          ) : (
                            <Upload className="size-6" />
                          )}
                          <span className="text-sm font-medium">
                            Foto&apos;s uploaden
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              void handleUpload(cat.id, e.target.files);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        {imgs.length > 0 && (
                          <div className="grid grid-cols-3 gap-2">
                            {imgs.map((img) => (
                              <div
                                key={img.localId}
                                className="relative aspect-square overflow-hidden rounded-xl"
                              >
                                <Image
                                  src={img.blobUrl}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  unoptimized={img.blobUrl.startsWith("/")}
                                />
                                <button
                                  type="button"
                                  className="absolute top-1 right-1 rounded-full bg-black/50 p-1 text-white"
                                  onClick={() =>
                                    setForm((f) => ({
                                      ...f,
                                      images: f.images.filter(
                                        (x) => x.localId !== img.localId
                                      ),
                                    }))
                                  }
                                >
                                  <X className="size-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex gap-2 border-t px-5 py-4 safe-pb">
          {isEdit && (
            <Button
              variant="destructive"
              className="h-11"
              disabled={saving || deleting}
              onClick={() => void handleDelete()}
            >
              <Trash2 />
              {deleting ? "Verwijderen…" : "Verwijderen"}
            </Button>
          )}
          {step > 0 && (
            <Button
              variant="outline"
              className="h-11"
              disabled={deleting}
              onClick={() => setStep((s) => s - 1)}
            >
              <ArrowLeft />
              Terug
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button
              className="h-11 flex-1 bg-gradient-to-r from-sky-500 to-indigo-600 text-white"
              disabled={!canNext || deleting}
              onClick={() => setStep((s) => s + 1)}
            >
              Verder
              <ArrowRight />
            </Button>
          ) : (
            <Button
              className="h-11 flex-1 bg-gradient-to-r from-sky-500 to-indigo-600 text-white"
              disabled={saving || deleting || !canNext}
              onClick={() => void save()}
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" />
                  Opslaan…
                </>
              ) : (
                <>
                  {isEdit ? "Wijzigingen opslaan" : "Bestemming toevoegen"}
                  <Check />
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChipList({
  label,
  tone,
  values,
  input,
  setInput,
  onAdd,
  onRemove,
}: {
  label: string;
  tone: "positive" | "negative";
  values: string[];
  input: string;
  setInput: (v: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          className="h-10"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
          placeholder="Voeg een punt toe…"
        />
        <Button type="button" variant="secondary" onClick={onAdd}>
          <Plus />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v, i) => (
          <span
            key={`${v}-${i}`}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
              tone === "positive"
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                : "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
            )}
          >
            {v}
            <button type="button" onClick={() => onRemove(i)}>
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

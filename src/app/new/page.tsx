"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Loader2,
  Mountain,
  Plus,
  Share2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { TRIP_TYPES } from "@/lib/trip-types";
import { pickAvatarColor } from "@/lib/avatars";
import { cn } from "@/lib/utils";

const STEPS = ["Type", "Details", "Travelers", "Share"] as const;

export default function NewTripPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [tripType, setTripType] = useState("ski");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [travelerInput, setTravelerInput] = useState("");
  const [travelers, setTravelers] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [createdToken, setCreatedToken] = useState("");

  const canNext = useMemo(() => {
    if (step === 0) return tripType === "ski";
    if (step === 1) return name.trim().length > 0 && !!startDate && !!endDate;
    if (step === 2) return travelers.length > 0;
    return true;
  }, [step, tripType, name, startDate, endDate, travelers]);

  function addTraveler() {
    const value = travelerInput.trim();
    if (!value) return;
    if (travelers.some((t) => t.toLowerCase() === value.toLowerCase())) {
      toast.error("That name is already added");
      return;
    }
    setTravelers((prev) => [...prev, value]);
    setTravelerInput("");
  }

  async function createTrip() {
    setCreating(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type: tripType,
          startDate,
          endDate,
          members: travelers,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create trip");
      const url = `${window.location.origin}/trip/${data.token}`;
      setShareUrl(url);
      setCreatedToken(data.token);
      setStep(3);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied!");
  }

  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: name || "TripPick",
          text: `Join our trip on TripPick: ${name}`,
          url: shareUrl,
        });
      } catch {
        // user cancelled
      }
    } else {
      await copyLink();
    }
  }

  return (
    <main className="gradient-hero min-h-dvh">
      <div className="mx-auto flex w-full max-w-lg flex-col px-4 pb-10 pt-4">
        <div className="mb-6 flex items-center gap-3">
          {step < 3 ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => (step === 0 ? router.push("/") : setStep((s) => s - 1))}
            >
              <ArrowLeft />
            </Button>
          ) : (
            <div className="size-8" />
          )}
          <div className="flex-1">
            <div className="text-sm font-semibold">Create a trip</div>
            <div className="mt-2 flex gap-1.5">
              {STEPS.map((label, i) => (
                <div
                  key={label}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    i <= step ? "bg-sky-500" : "bg-sky-100"
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
            className="rounded-3xl bg-white/80 p-5 shadow-xl shadow-sky-900/5 ring-1 ring-white backdrop-blur"
          >
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-bold">What kind of trip?</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ski trips are ready. More types coming soon.
                  </p>
                </div>
                <div className="grid gap-3">
                  {TRIP_TYPES.map((type) => {
                    const Icon = type.icon;
                    const selected = tripType === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        disabled={!type.available}
                        onClick={() => type.available && setTripType(type.id)}
                        className={cn(
                          "relative flex items-start gap-3 rounded-2xl border p-4 text-left transition-all",
                          type.available
                            ? selected
                              ? "border-sky-400 bg-sky-50 shadow-md shadow-sky-500/10"
                              : "border-transparent bg-muted/60 hover:bg-muted"
                            : "cursor-not-allowed border-transparent bg-muted/40 opacity-60"
                        )}
                      >
                        <div
                          className={cn(
                            "flex size-11 items-center justify-center rounded-xl bg-gradient-to-br text-white",
                            type.accent
                          )}
                        >
                          <Icon className="size-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 font-semibold">
                            {type.label}
                            {!type.available && (
                              <Badge variant="secondary" className="text-[10px]">
                                Coming soon
                              </Badge>
                            )}
                          </div>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {type.description}
                          </p>
                        </div>
                        {selected && type.available && (
                          <Check className="size-5 text-sky-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-bold">Trip details</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Give it a name and set the dates.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trip-name">Trip name</Label>
                  <Input
                    id="trip-name"
                    placeholder="e.g. Alps 2027"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="start">Start</Label>
                    <Input
                      id="start"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end">End</Label>
                    <Input
                      id="end"
                      type="date"
                      value={endDate}
                      min={startDate || undefined}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-11"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-bold">Who&apos;s coming?</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add first names — used for comments and votes.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="First name"
                    value={travelerInput}
                    onChange={(e) => setTravelerInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTraveler();
                      }
                    }}
                    className="h-11"
                  />
                  <Button type="button" size="lg" className="h-11" onClick={addTraveler}>
                    <Plus />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {travelers.map((t, i) => (
                    <div
                      key={t}
                      className="inline-flex items-center gap-2 rounded-full bg-sky-50 py-1 pr-2 pl-1 ring-1 ring-sky-100"
                    >
                      <MemberAvatar name={t} color={pickAvatarColor(i)} size="sm" />
                      <span className="text-sm font-medium">{t}</span>
                      <button
                        type="button"
                        className="rounded-full p-0.5 text-muted-foreground hover:bg-sky-100 hover:text-foreground"
                        onClick={() =>
                          setTravelers((prev) => prev.filter((x) => x !== t))
                        }
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                  {travelers.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Add at least one traveler to continue.
                    </p>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/30">
                  <Mountain className="size-7" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Your trip is ready!</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Share this private link with your crew.
                  </p>
                </div>
                <div className="rounded-2xl bg-muted/70 p-3 text-left">
                  <div className="mb-1 text-xs font-medium text-muted-foreground">
                    Share link
                  </div>
                  <div className="break-all text-sm font-medium">{shareUrl}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="h-11" onClick={copyLink}>
                    <Copy />
                    Copy
                  </Button>
                  <Button variant="outline" className="h-11" onClick={shareLink}>
                    <Share2 />
                    Share
                  </Button>
                </div>
                <Link href={`/trip/${createdToken}`} className="block">
                  <Button className="h-12 w-full rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white hover:from-sky-600 hover:to-indigo-700">
                    Open trip
                    <ArrowRight />
                  </Button>
                </Link>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {step < 3 && (
          <div className="mt-5">
            <Button
              className="h-12 w-full rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 text-base text-white hover:from-sky-600 hover:to-indigo-700"
              disabled={!canNext || creating}
              onClick={() => {
                if (step === 2) void createTrip();
                else setStep((s) => s + 1);
              }}
            >
              {creating ? (
                <>
                  <Loader2 className="animate-spin" />
                  Creating…
                </>
              ) : step === 2 ? (
                <>
                  Create trip
                  <Check />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}

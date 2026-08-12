"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Loader2,
  Mountain,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { MemberPicker } from "@/components/trip/member-picker";
import { TripContext } from "@/components/trip/trip-context";
import { DestinationCard } from "@/components/destination/destination-card";
import { DestinationWizard } from "@/components/destination/destination-wizard";
import { DestinationDetail } from "@/components/destination/destination-detail";
import type { ApiDestination, ApiMember, ApiTrip } from "@/lib/trip-data";
import {
  getStoredMemberId,
  setStoredMemberId,
} from "@/lib/member-storage";
import { formatDateRange } from "@/lib/format";

type Props = {
  token: string;
  initialDestinationId?: string | null;
};

function syncTripUrl(token: string, destinationId: string | null) {
  const path = destinationId
    ? `/trip/${token}/d/${destinationId}`
    : `/trip/${token}`;
  if (typeof window === "undefined") return;
  if (window.location.pathname === path) return;
  window.history.replaceState(window.history.state, "", path);
}

/** Destination with the most ❤️ favorites (ties broken by likes, then earliest). */
function getWinnerId(destinations: ApiTrip["destinations"]): string | null {
  if (destinations.length === 0) return null;
  const ranked = [...destinations].sort((a, b) => {
    if (b.counts.favorite !== a.counts.favorite) {
      return b.counts.favorite - a.counts.favorite;
    }
    if (b.counts.like !== a.counts.like) {
      return b.counts.like - a.counts.like;
    }
    return a.createdAt.localeCompare(b.createdAt);
  });
  const top = ranked[0];
  if (!top || top.counts.favorite < 1) return null;
  return top.id;
}

export function TripDashboard({ token, initialDestinationId }: Props) {
  const [trip, setTrip] = useState<ApiTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMember, setCurrentMemberState] = useState<ApiMember | null>(
    null
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<ApiDestination | null>(null);
  const [detailId, setDetailId] = useState<string | null>(
    initialDestinationId ?? null
  );

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/trips/${token}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Reis niet gevonden");
    }
    const data = (await res.json()) as ApiTrip;
    setTrip(data);
    return data;
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await refresh();
        if (cancelled) return;
        const stored = getStoredMemberId(token);
        const member = data.members.find((m) => m.id === stored) ?? null;
        if (member) setCurrentMemberState(member);
        else setPickerOpen(true);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Kon niet laden"
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh, token]);

  // Browser back/forward without remounting
  useEffect(() => {
    function onPopState() {
      const match = window.location.pathname.match(
        /\/trip\/[^/]+\/d\/([^/]+)/
      );
      setDetailId(match?.[1] ?? null);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function setCurrentMember(member: ApiMember | null) {
    setCurrentMemberState(member);
    if (member) {
      setStoredMemberId(token, member.id);
      setPickerOpen(false);
    }
  }

  function openDetail(id: string) {
    setDetailId(id);
    syncTripUrl(token, id);
  }

  function closeDetail() {
    setDetailId(null);
    syncTripUrl(token, null);
  }

  function openEdit(destination: ApiDestination) {
    setEditing(destination);
    setDetailId(null);
    syncTripUrl(token, null);
    // Open wizard on next tick so detail dialog can close cleanly first
    requestAnimationFrame(() => setWizardOpen(true));
  }

  const detail =
    trip?.destinations.find((d) => d.id === detailId) ?? null;
  const winnerId = trip ? getWinnerId(trip.destinations) : null;

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center gradient-hero">
        <Loader2 className="size-8 animate-spin text-sky-600" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center gradient-hero">
        <Mountain className="size-12 text-sky-400" />
        <h1 className="text-xl font-bold">Reis niet gevonden</h1>
        <p className="text-sm text-muted-foreground">
          Deze link is ongeldig of de reis is verwijderd.
        </p>
        <Link href="/">
          <Button>Terug naar home</Button>
        </Link>
      </div>
    );
  }

  return (
    <TripContext.Provider
      value={{
        trip,
        currentMember,
        setCurrentMember,
        refresh: async () => {
          await refresh();
        },
        setTrip,
      }}
    >
      <main className="min-h-dvh bg-[oklch(0.975_0.012_230)] pb-28">
        <header className="sticky top-0 z-30 border-b border-sky-100/80 bg-white/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-start gap-3 px-4 py-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/25">
              <Mountain className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold">{trip.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="size-3.5" />
                  {formatDateRange(trip.startDate, trip.endDate)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" />
                  {trip.members.length} reisgenoten
                </span>
                <span>
                  {trip.destinations.length}{" "}
                  {trip.destinations.length === 1
                    ? "bestemming"
                    : "bestemmingen"}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex -space-x-2">
                  {trip.members.map((m) => (
                    <MemberAvatar
                      key={m.id}
                      name={m.firstName}
                      color={m.avatarColor}
                      size="sm"
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="ml-auto inline-flex items-center gap-2 rounded-full bg-sky-50 py-1 pr-3 pl-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-100"
                >
                  {currentMember ? (
                    <>
                      <MemberAvatar
                        name={currentMember.firstName}
                        color={currentMember.avatarColor}
                        size="sm"
                      />
                      {currentMember.firstName}
                    </>
                  ) : (
                    "Kies wie je bent"
                  )}
                </button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() =>
                    void refresh().then(() => toast.success("Vernieuwd"))
                  }
                >
                  <RefreshCw />
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 py-5">
          {trip.destinations.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center rounded-3xl bg-white/80 px-6 py-16 text-center shadow-sm ring-1 ring-sky-100"
            >
              <div className="mb-4 flex size-16 items-center justify-center rounded-3xl bg-sky-50 text-sky-500">
                <Mountain className="size-8" />
              </div>
              <h2 className="text-xl font-bold">Nog geen bestemmingen</h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Voeg de eerste chalet-, appartement- of hoteloptie toe zodat
                iedereen kan beginnen stemmen.
              </p>
              <Button
                className="mt-6 h-11 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white"
                onClick={() => {
                  if (!currentMember) {
                    setPickerOpen(true);
                    return;
                  }
                  setEditing(null);
                  setWizardOpen(true);
                }}
              >
                <Plus />
                Bestemming toevoegen
              </Button>
            </motion.div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {trip.destinations.map((dest, i) => (
                <motion.div
                  key={dest.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <DestinationCard
                    destination={dest}
                    isWinner={dest.id === winnerId}
                    onOpen={() => openDetail(dest.id)}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="fixed right-4 bottom-4 z-40 safe-pb">
          <Button
            size="lg"
            className="h-14 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 px-5 text-base text-white shadow-xl shadow-sky-500/35"
            onClick={() => {
              if (!currentMember) {
                setPickerOpen(true);
                return;
              }
              setEditing(null);
              setWizardOpen(true);
            }}
          >
            <Plus className="size-5" />
            Bestemming toevoegen
          </Button>
        </div>

        <MemberPicker
          open={pickerOpen}
          members={trip.members}
          allowDismiss={Boolean(currentMember)}
          onOpenChange={setPickerOpen}
          onSelect={setCurrentMember}
          title={currentMember ? "Wissel van persoon" : "Wie ben jij?"}
        />

        <DestinationWizard
          open={wizardOpen}
          onOpenChange={(open) => {
            setWizardOpen(open);
            if (!open) setEditing(null);
          }}
          destination={editing}
        />

        <DestinationDetail
          destination={detail}
          open={Boolean(detail)}
          onOpenChange={(open) => {
            if (!open) closeDetail();
          }}
          onEdit={() => {
            if (!detail) return;
            openEdit(detail);
          }}
        />
      </main>
    </TripContext.Provider>
  );
}

"use client";

import { useOptimistic, useTransition } from "react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import type { ApiDestination } from "@/lib/trip-data";
import { useTrip } from "@/components/trip/trip-context";
import { cn } from "@/lib/utils";

type Props = {
  destination: ApiDestination;
  compact?: boolean;
};

type OptimisticState = {
  counts: ApiDestination["counts"];
  myFavorite: boolean;
  myVote: "like" | "maybe" | "no" | null;
};

export function ReactionBar({ destination, compact }: Props) {
  const { trip, currentMember, setTrip } = useTrip();
  const [, startTransition] = useTransition();

  const myFavorite = destination.reactions.some(
    (r) => r.memberId === currentMember?.id && r.kind === "favorite"
  );
  const myVote =
    (destination.reactions.find(
      (r) =>
        r.memberId === currentMember?.id &&
        (r.kind === "like" || r.kind === "maybe" || r.kind === "no")
    )?.kind as "like" | "maybe" | "no" | undefined) ?? null;

  const [optimistic, setOptimistic] = useOptimistic<
    OptimisticState,
    { kind: "favorite" | "like" | "maybe" | "no" }
  >(
    {
      counts: destination.counts,
      myFavorite,
      myVote,
    },
    (state, action) => {
      const next = {
        counts: { ...state.counts },
        myFavorite: state.myFavorite,
        myVote: state.myVote,
      };

      if (action.kind === "favorite") {
        next.myFavorite = !state.myFavorite;
        next.counts.favorite += next.myFavorite ? 1 : -1;
        return next;
      }

      if (state.myVote === action.kind) {
        next.counts[action.kind] -= 1;
        next.myVote = null;
        return next;
      }

      if (state.myVote) {
        next.counts[state.myVote] -= 1;
      }
      next.counts[action.kind] += 1;
      next.myVote = action.kind;
      return next;
    }
  );

  async function react(kind: "favorite" | "like" | "maybe" | "no") {
    if (!currentMember) {
      toast.message("Pick who you are first");
      return;
    }

    startTransition(async () => {
      setOptimistic({ kind });
      try {
        const res = await fetch(
          `/api/trips/${trip.token}/destinations/${destination.id}/reactions`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ memberId: currentMember.id, kind }),
          }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to react");
        }

        // Refresh local trip state for consistency
        const tripRes = await fetch(`/api/trips/${trip.token}`);
        if (tripRes.ok) {
          setTrip(await tripRes.json());
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed");
        const tripRes = await fetch(`/api/trips/${trip.token}`);
        if (tripRes.ok) setTrip(await tripRes.json());
      }
    });
  }

  const votes = [
    { kind: "like" as const, emoji: "👍", count: optimistic.counts.like },
    { kind: "maybe" as const, emoji: "🤔", count: optimistic.counts.maybe },
    { kind: "no" as const, emoji: "👎", count: optimistic.counts.no },
  ];

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", compact && "gap-1")}>
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.stopPropagation();
          void react("favorite");
        }}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors",
          optimistic.myFavorite
            ? "bg-rose-500 text-white shadow-md shadow-rose-500/30"
            : "bg-rose-50 text-rose-600 ring-1 ring-rose-100 hover:bg-rose-100"
        )}
      >
        <Heart
          className={cn("size-3.5", optimistic.myFavorite && "fill-current")}
        />
        {optimistic.counts.favorite}
      </motion.button>

      {votes.map((v) => (
        <motion.button
          key={v.kind}
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            void react(v.kind);
          }}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors",
            optimistic.myVote === v.kind
              ? "bg-sky-500 text-white shadow-md shadow-sky-500/30"
              : "bg-muted text-foreground/80 hover:bg-sky-50"
          )}
        >
          <span>{v.emoji}</span>
          {v.count}
        </motion.button>
      ))}
    </div>
  );
}

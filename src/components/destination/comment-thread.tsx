"use client";

import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { useTrip } from "@/components/trip/trip-context";
import type { ApiComment, ApiDestination } from "@/lib/trip-data";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  destination: ApiDestination;
  defaultExpanded?: boolean;
  className?: string;
};

export function CommentThread({
  destination,
  defaultExpanded = false,
  className,
}: Props) {
  const { trip, currentMember, setTrip } = useTrip();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const last = destination.comments[destination.comments.length - 1];

  async function send() {
    if (!currentMember) {
      toast.message("Pick who you are first");
      return;
    }
    const text = body.trim();
    if (!text) return;
    setSending(true);
    try {
      const res = await fetch(
        `/api/trips/${trip.token}/destinations/${destination.id}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId: currentMember.id, body: text }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to comment");

      const comment = data as ApiComment;
      setTrip({
        ...trip,
        destinations: trip.destinations.map((d) =>
          d.id === destination.id
            ? {
                ...d,
                comments: [...d.comments, comment],
                counts: {
                  ...d.counts,
                  comments: d.counts.comments + 1,
                },
              }
            : d
        ),
      });
      setBody("");
      setExpanded(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={cn("space-y-2", className)} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="flex w-full items-center gap-2 text-left text-sm text-muted-foreground hover:text-foreground"
        onClick={() => setExpanded((v) => !v)}
      >
        <MessageCircle className="size-4" />
        <span className="font-medium">
          {destination.counts.comments}{" "}
          {destination.counts.comments === 1 ? "comment" : "comments"}
        </span>
        {!expanded && last && (
          <span className="truncate text-xs">
            · {last.member.firstName}: {last.body}
          </span>
        )}
      </button>

      {expanded && (
        <div className="space-y-3 rounded-2xl bg-muted/40 p-3">
          {destination.comments.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Be the first to leave a thought.
            </p>
          )}
          {destination.comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <MemberAvatar
                name={c.member.firstName}
                color={c.member.avatarColor}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold">
                    {c.member.firstName}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatRelative(c.createdAt)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {c.body}
                </p>
              </div>
            </div>
          ))}

          <div className="flex gap-2 pt-1">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write a comment…"
              rows={2}
              className="min-h-0 resize-none"
            />
            <Button
              size="icon"
              className="shrink-0 self-end"
              disabled={sending || !body.trim()}
              onClick={() => void send()}
            >
              <Send />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

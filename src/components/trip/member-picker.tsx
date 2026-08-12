"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MemberAvatar } from "@/components/shared/member-avatar";
import type { ApiMember } from "@/lib/trip-data";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  members: ApiMember[];
  onSelect: (member: ApiMember) => void;
  allowDismiss?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
};

export function MemberPicker({
  open,
  members,
  onSelect,
  allowDismiss = false,
  onOpenChange,
  title = "Who are you?",
}: Props) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!allowDismiss && !next) return;
        onOpenChange?.(next);
      }}
    >
      <DialogContent
        showCloseButton={allowDismiss}
        className="max-w-md rounded-3xl sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription>
            Pick your name so we know who is voting and commenting.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {members.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => onSelect(member)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl bg-muted/50 p-4 transition-all hover:bg-sky-50 hover:ring-2 hover:ring-sky-300 active:scale-[0.98]"
              )}
            >
              <MemberAvatar
                name={member.firstName}
                color={member.avatarColor}
                size="lg"
              />
              <span className="text-sm font-semibold">{member.firstName}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

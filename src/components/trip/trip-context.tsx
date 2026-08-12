"use client";

import { createContext, useContext } from "react";
import type { ApiMember, ApiTrip } from "@/lib/trip-data";

export type TripContextValue = {
  trip: ApiTrip;
  currentMember: ApiMember | null;
  setCurrentMember: (member: ApiMember | null) => void;
  refresh: () => Promise<void>;
  setTrip: (trip: ApiTrip) => void;
};

export const TripContext = createContext<TripContextValue | null>(null);

export function useTrip() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrip must be used within TripProvider");
  return ctx;
}

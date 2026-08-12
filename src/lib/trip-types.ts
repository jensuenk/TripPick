import type { LucideIcon } from "lucide-react";
import { Car, Mountain, Palmtree, Building2 } from "lucide-react";

export type TripTypeId = "ski" | "roadtrip" | "beach" | "city";

export type TripTypeDefinition = {
  id: TripTypeId;
  label: string;
  description: string;
  icon: LucideIcon;
  available: boolean;
  accent: string;
};

export const TRIP_TYPES: TripTypeDefinition[] = [
  {
    id: "ski",
    label: "Ski trip",
    description: "Powder, chalets, and lift access",
    icon: Mountain,
    available: true,
    accent: "from-sky-500 to-indigo-600",
  },
  {
    id: "roadtrip",
    label: "Roadtrip",
    description: "Scenic drives and stopovers",
    icon: Car,
    available: false,
    accent: "from-amber-500 to-orange-600",
  },
  {
    id: "beach",
    label: "Beach",
    description: "Sun, sand, and sea views",
    icon: Palmtree,
    available: false,
    accent: "from-cyan-400 to-teal-600",
  },
  {
    id: "city",
    label: "City trip",
    description: "Culture, food, and nightlife",
    icon: Building2,
    available: false,
    accent: "from-violet-500 to-fuchsia-600",
  },
];

export function getTripType(id: string): TripTypeDefinition | undefined {
  return TRIP_TYPES.find((t) => t.id === id);
}

export const BED_TYPES = [
  { id: "double" as const, label: "Double", icon: "🛏️" },
  { id: "single" as const, label: "Single", icon: "🛌" },
  { id: "bunk" as const, label: "Bunk", icon: "🪜" },
  { id: "sofa" as const, label: "Sofa bed", icon: "🛋️" },
];

export const IMAGE_CATEGORIES = [
  {
    id: "accommodation" as const,
    label: "Accommodation",
    hint: "Rooms, kitchen, bathrooms",
  },
  {
    id: "surroundings" as const,
    label: "Surroundings",
    hint: "Village, mountain views",
  },
  {
    id: "skimap" as const,
    label: "Ski map",
    hint: "Piste map of the area",
    skiOnly: true,
  },
] as const;

export type ImageCategory = (typeof IMAGE_CATEGORIES)[number]["id"];

import type { LucideIcon } from "lucide-react";
import {
  Bed,
  BedDouble,
  Building2,
  Car,
  Layers,
  Mountain,
  Palmtree,
  Sofa,
} from "lucide-react";

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
    label: "Skireis",
    description: "Poedersneeuw, chalets en lifttoegang",
    icon: Mountain,
    available: true,
    accent: "from-sky-500 to-indigo-600",
  },
  {
    id: "roadtrip",
    label: "Roadtrip",
    description: "Prachtige routes en tussenstops",
    icon: Car,
    available: false,
    accent: "from-amber-500 to-orange-600",
  },
  {
    id: "beach",
    label: "Strand",
    description: "Zon, zand en zeezicht",
    icon: Palmtree,
    available: false,
    accent: "from-cyan-400 to-teal-600",
  },
  {
    id: "city",
    label: "Stedentrip",
    description: "Cultuur, eten en nachtleven",
    icon: Building2,
    available: false,
    accent: "from-violet-500 to-fuchsia-600",
  },
];

export function getTripType(id: string): TripTypeDefinition | undefined {
  return TRIP_TYPES.find((t) => t.id === id);
}

export const BED_TYPES = [
  { id: "double" as const, label: "Tweepersoons", icon: BedDouble },
  { id: "single" as const, label: "Eenpersoons", icon: Bed },
  { id: "bunk" as const, label: "Stapelbed", icon: Layers },
  { id: "sofa" as const, label: "Slaapbank", icon: Sofa },
];

export const IMAGE_CATEGORIES = [
  {
    id: "accommodation" as const,
    label: "Accommodatie",
    hint: "Kamers, keuken, badkamers",
  },
  {
    id: "surroundings" as const,
    label: "Omgeving",
    hint: "Dorp, bergzicht",
  },
  {
    id: "skimap" as const,
    label: "Skikaart",
    hint: "Pistekaart van het gebied",
    skiOnly: true,
  },
] as const;

export type ImageCategory = (typeof IMAGE_CATEGORIES)[number]["id"];

import { z } from "zod";
import type { DestinationTypeDetails, NearbyPlace } from "@/db/schema";
import { SUMMER_OVERVIEW_VERSION } from "@/lib/summer";

export { SUMMER_OVERVIEW_VERSION };

const summerOverviewSchema = z.object({
  overview: z.string().min(40).max(2000),
  climate: z.string().max(500).optional().default(""),
  activities: z.array(z.string().trim().min(1).max(160)).max(10).default([]),
  flightHint: z
    .object({
      hours: z.number().min(0).max(24).optional(),
      priceMinEuros: z.number().min(0).max(5000).optional(),
      priceMaxEuros: z.number().min(0).max(5000).optional(),
      note: z.string().max(300).optional(),
    })
    .optional(),
});

export type SummerOverviewResult = z.infer<typeof summerOverviewSchema>;

function formatPlaces(
  label: string,
  places?: NearbyPlace[] | null
): string {
  const list = (places ?? [])
    .filter((p) => p.name.trim() && Number.isFinite(p.km))
    .slice(0, 6)
    .map((p) =>
      p.code
        ? `${p.name.trim()} (${p.code.toUpperCase()}, ~${p.km} km)`
        : `${p.name.trim()} (~${p.km} km)`
    )
    .join("; ");
  return list ? ` ${label}: ${list}.` : "";
}

export async function generateSummerOverview(input: {
  name: string;
  locationText?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  nights?: number | null;
  nearbyAirports?: NearbyPlace[] | null;
  nearbyBeaches?: NearbyPlace[] | null;
  nearbyCities?: NearbyPlace[] | null;
  tags?: string[] | null;
}): Promise<SummerOverviewResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is niet ingesteld. Voeg die toe aan .env.local om AI-zomervakantie-overzichten te gebruiken."
    );
  }

  const stayHint =
    input.checkIn && input.checkOut
      ? ` Verblijf: ${input.checkIn} tot ${input.checkOut}${input.nights ? ` (${input.nights} nachten)` : ""}.`
      : "";
  const locationHint = input.locationText
    ? ` Locatie: ${input.locationText}.`
    : "";
  const tagsHint = input.tags?.length
    ? ` Faciliteiten/tags van de accommodatie: ${input.tags.join(", ")}.`
    : "";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "Je helpt een Belgisch/Nederlands gezin een zomervakantie kiezen.",
            "Antwoord ALLEEN met geldige JSON:",
            '{ "overview": string, "climate": string, "activities": string[], "flightHint": { "hours": number, "priceMinEuros": number, "priceMaxEuros": number, "note": string } }',
            "overview: 1 alinea van 80–120 woorden in het Nederlands. Geen opsommingen.",
            "Focus op: sfeer van de stad/streek, wat er in de buurt te doen is (strand, steden, natuur), of het kindvriendelijk is, en hoe praktisch de ligging is t.o.v. luchthaven/strand/stad als die afstanden gegeven zijn.",
            "climate: 1–2 zinnen over typisch weer in de verblijfsmaand (temperatuur, regen, zeewater indien kust). Geen exacte records verzinnen.",
            "activities: 4–8 concrete, gevarieerde ideeën voor een gezin (mix van strand, cultuur, natuur, eten). Korte zinnen, geen marketingtaal.",
            "flightHint: typische vlucht vanuit Brussel (BRU) naar de dichtstbijzijnde luchthaven. hours = vliegtijd enkele reis. priceMinEuros/priceMaxEuros = ruwe retourprijs per persoon in het hoogseizoen. note = korte disclaimer (bijv. 'indicatie, geen live prijs').",
            "Als een feit onzeker is, formuleer voorzichtig of laat het weg. Verzin geen exacte restaurant- of hotelnamen.",
            "Vermeld niet dat je een AI bent.",
          ].join(" "),
        },
        {
          role: "user",
          content: `Maak een zomeroverzicht voor "${input.name}".${locationHint}${stayHint}${tagsHint}${formatPlaces("Luchthavens", input.nearbyAirports)}${formatPlaces("Stranden", input.nearbyBeaches)}${formatPlaces("Steden", input.nearbyCities)}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("OpenAI summer overview error", res.status, err);
    throw new Error(
      "AI-overzicht mislukt. Controleer je OpenAI API-sleutel en probeer opnieuw."
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error("AI gaf een leeg overzicht terug");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI-antwoord was ongeldig. Probeer opnieuw.");
  }

  const result = summerOverviewSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("Kon geen bruikbaar zomeroverzicht maken.");
  }
  return result.data;
}

function placesKey(places?: NearbyPlace[] | null): string {
  return JSON.stringify(
    (places ?? [])
      .map((p) => `${p.name.trim().toLowerCase()}:${p.km}:${(p.code ?? "").toUpperCase()}`)
      .sort()
  );
}

/** Preserve cached AI summer overview when stay context + prompt version are unchanged. */
export function mergeSummerCache(
  prev: DestinationTypeDetails,
  next: DestinationTypeDetails
): void {
  const sameStay =
    (prev.checkIn ?? "") === (next.checkIn ?? "") &&
    (prev.checkOut ?? "") === (next.checkOut ?? "");
  const samePlaces =
    placesKey(prev.nearbyAirports) === placesKey(next.nearbyAirports) &&
    placesKey(prev.nearbyBeaches) === placesKey(next.nearbyBeaches) &&
    placesKey(prev.nearbyCities) === placesKey(next.nearbyCities);
  const sameVersion = prev.summerOverviewVersion === SUMMER_OVERVIEW_VERSION;

  if (sameStay && samePlaces && sameVersion && prev.summerOverview) {
    next.summerOverview = prev.summerOverview;
    next.summerOverviewGeneratedAt = prev.summerOverviewGeneratedAt;
    next.summerOverviewVersion = prev.summerOverviewVersion;
    next.climate = prev.climate;
    next.activities = prev.activities;
    next.flightHint = prev.flightHint;
  } else {
    delete next.summerOverview;
    delete next.summerOverviewGeneratedAt;
    delete next.summerOverviewVersion;
    delete next.climate;
    delete next.activities;
    delete next.flightHint;
  }
}

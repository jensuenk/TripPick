import type { DestinationTypeDetails, NearbyLift } from "@/db/schema";

/** Bump when the summary prompt changes so old caches refresh. */
export const SKI_SUMMARY_VERSION = 4;

function formatNearbyLifts(lifts?: NearbyLift[] | null): string {
  if (!lifts?.length) return "";
  const list = lifts
    .filter((l) => l.name.trim() && Number.isFinite(l.km))
    .slice(0, 6)
    .map((l) => `${l.name.trim()} (~${l.km} km)`)
    .join("; ");
  return list
    ? ` Nabije skiliften vanaf de accommodatie: ${list}. Verwerk deze afstanden natuurlijk in de samenvatting.`
    : "";
}

export async function generateSkiResortSummary(input: {
  skiArea: string;
  locationText?: string | null;
  kmToLift?: number | null;
  nearbyLifts?: NearbyLift[] | null;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is niet ingesteld. Voeg die toe aan .env.local om AI-skigebiedsamenvattingen te gebruiken."
    );
  }

  const locationHint = input.locationText
    ? ` Context van nabijgelegen dorp/locatie: ${input.locationText}.`
    : "";
  const nearestHint =
    input.kmToLift != null && Number.isFinite(input.kmToLift)
      ? ` Dichtstbijzijnde lift ongeveer ${input.kmToLift} km vanaf de accommodatie.`
      : "";
  const liftsHint = formatNearbyLifts(input.nearbyLifts);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 280,
      messages: [
        {
          role: "system",
          content: [
            "Je schrijft korte feitelijke samenvattingen van skigebieden voor een familie-vakantieplanner.",
            "Schrijf in het Nederlands (nl-BE/nl-NL), 1 kort alinea van ongeveer 60–95 woorden. Geen opsommingen.",
            "Focus op: gebiedsgrootte (piste-km indien bekend), hoogte/hoogtebereik, soort pistes (beginner/gevorderd/expert), drukte/populariteit, en snow/fun parks als die opvallend zijn.",
            "Als er info is over nabije skiliften en afstanden vanaf de accommodatie, noem die kort en natuurlijk in dezelfde alinea.",
            "Sla andere activiteiten over (spa, winkelen, wandelen, nachtleven, enz.).",
            "Als een feit onzeker is, zeg dat kort of laat het weg — verzin geen precieze cijfers.",
            "Vermeld niet dat je een AI bent. Houd het kort.",
          ].join(" "),
        },
        {
          role: "user",
          content: `Vat het skigebied "${input.skiArea}" samen.${locationHint}${nearestHint}${liftsHint}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("OpenAI ski summary error", res.status, err);
    throw new Error(
      "AI-samenvatting mislukt. Controleer je OpenAI API-sleutel en probeer opnieuw."
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("AI gaf een lege samenvatting terug");
  return text;
}

function nearbyLiftsKey(details: DestinationTypeDetails): string {
  const lifts = details.nearbyLifts ?? [];
  return JSON.stringify(
    lifts.map((l) => `${l.name.trim().toLowerCase()}:${l.km}`).sort()
  );
}

/** Preserve cached AI summary when ski context + prompt version are unchanged. */
export function mergeTypeDetails(
  existing: DestinationTypeDetails | null | undefined,
  incoming: DestinationTypeDetails
): DestinationTypeDetails {
  const prev = existing ?? {};
  const next: DestinationTypeDetails = { ...incoming };

  const sameArea =
    prev.skiArea &&
    next.skiArea &&
    prev.skiArea.trim().toLowerCase() === next.skiArea.trim().toLowerCase();

  const sameNearest = prev.kmToLift === next.kmToLift;
  const sameLifts = nearbyLiftsKey(prev) === nearbyLiftsKey(next);
  const sameVersion = prev.skiResortSummaryVersion === SKI_SUMMARY_VERSION;

  if (sameArea && sameNearest && sameLifts && sameVersion && prev.skiResortSummary) {
    next.skiResortSummary = prev.skiResortSummary;
    next.skiResortSummaryGeneratedAt = prev.skiResortSummaryGeneratedAt;
    next.skiResortSummaryVersion = prev.skiResortSummaryVersion;
  } else {
    delete next.skiResortSummary;
    delete next.skiResortSummaryGeneratedAt;
    delete next.skiResortSummaryVersion;
  }

  return next;
}

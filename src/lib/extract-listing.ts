import { z } from "zod";

const nearbyPlaceSchema = z.object({
  name: z.string().max(120),
  km: z.number().min(0).max(2000),
  code: z.string().max(8).optional(),
});

export const extractedListingSchema = z.object({
  name: z.string().min(1).max(160),
  locationText: z.string().max(300).nullable().optional(),
  priceTotalEuros: z.number().min(0).nullable().optional(),
  bedrooms: z.number().int().min(0).max(50).nullable().optional(),
  bathrooms: z.number().int().min(0).max(50).nullable().optional(),
  beds: z
    .array(
      z.object({
        type: z.enum(["double", "single", "bunk", "sofa"]),
        count: z.number().int().min(1).max(20),
      })
    )
    .default([]),
  description: z.string().max(5000).nullable().optional(),
  pros: z.array(z.string().max(200)).default([]),
  cons: z.array(z.string().max(200)).default([]),
  skiArea: z.string().max(200).nullable().optional(),
  nearbyLifts: z
    .array(
      z.object({
        name: z.string().max(120),
        km: z.number().min(0).max(500),
      })
    )
    .default([]),
  tags: z.array(z.string().max(40)).max(20).default([]),
  flightIncluded: z.boolean().optional().default(false),
  nearbyAirports: z.array(nearbyPlaceSchema).max(6).default([]),
  nearbyBeaches: z.array(nearbyPlaceSchema).max(8).default([]),
  nearbyCities: z.array(nearbyPlaceSchema).max(8).default([]),
  activities: z.array(z.string().max(160)).max(10).default([]),
  checkIn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  checkOut: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

export type ExtractedListing = z.infer<typeof extractedListingSchema> & {
  imageUrls: string[];
};

const SKI_SYSTEM = [
  "Je extraheert vakantieverblijf-gegevens uit een boekingspagina voor een skireis-planner.",
  "Antwoord ALLEEN met geldige JSON volgens dit schema:",
  '{ "name": string, "locationText": string|null, "priceTotalEuros": number|null, "bedrooms": number|null, "bathrooms": number|null, "beds": [{"type":"double"|"single"|"bunk"|"sofa","count":number}], "description": string|null, "pros": string[], "cons": string[], "skiArea": string|null, "nearbyLifts": [{"name":string,"km":number}] }',
  "Schrijf description/pros/cons in het Nederlands.",
  "priceTotalEuros = totale prijs voor het verblijf in euro (niet per nacht), of null als onbekend.",
  "skiArea = dichtstbijzijnde/passende skigebied-naam indien af te leiden uit locatie/tekst.",
  "nearbyLifts = 1–4 nabije skiliften/stationen met geschatte afstand in km vanaf de accommodatie.",
  "Belangrijk: liftnamen (nearbyLifts.name) NOOIT vertalen — gebruik de officiële lokale naam (DE/FR/IT/…), bv. 'Bergbahn Kappl' niet 'Kabelbaan Kappl'.",
  "beds: map naar double/single/bunk/sofa.",
  "Verzin geen exacte cijfers als die nergens te vinden zijn — gebruik null of weglaten.",
  "Negeer foto's — die worden apart toegevoegd.",
].join(" ");

const SUMMER_SYSTEM = [
  "Je extraheert vakantieverblijf-gegevens uit een boekingspagina voor een zomervakantie-planner.",
  "Antwoord ALLEEN met geldige JSON volgens dit schema:",
  '{ "name": string, "locationText": string|null, "priceTotalEuros": number|null, "bedrooms": number|null, "bathrooms": number|null, "beds": [{"type":"double"|"single"|"bunk"|"sofa","count":number}], "description": string|null, "pros": string[], "cons": string[], "tags": string[], "flightIncluded": boolean, "nearbyAirports": [{"name":string,"km":number,"code":string}], "nearbyBeaches": [{"name":string,"km":number}], "nearbyCities": [{"name":string,"km":number}], "activities": string[], "checkIn": string|null, "checkOut": string|null }',
  "Schrijf description/pros/cons/tags/activities in het Nederlands.",
  "priceTotalEuros = totale prijs voor het verblijf in euro (niet per nacht), of null als onbekend.",
  "flightIncluded = true als de advertentie vliegtickets/pakketreis/fly-and-stay in de prijs noemt, anders false.",
  "tags = faciliteiten zoals Ontbijt, Zwembad, Airco, Kinderclub, Parking, Wifi, Keuken, Strand nabij, All-inclusive. Alleen wat uit de advertentie volgt.",
  "nearbyAirports = 1–3 nabije luchthavens met IATA-code (bv. BCN) en geschatte afstand in km.",
  "nearbyBeaches = 1–4 nabije stranden met geschatte km. Gebruik de lokale naam.",
  "nearbyCities = 1–4 nabije steden/dorpen met geschatte km, inclusief het centrum als relevant.",
  "activities = 3–6 leuke dingen in de buurt die in of uit de advertentie/locatie volgen (strand, oude stad, pretpark, snorkelen, …).",
  "checkIn/checkOut = YYYY-MM-DD als de advertentie specifieke data noemt, anders null.",
  "beds: map naar double/single/bunk/sofa.",
  "Verzin geen exacte cijfers als die nergens te vinden zijn — gebruik null of weglaten.",
  "Negeer foto's — die worden apart toegevoegd.",
].join(" ");

export async function extractListingWithAi(input: {
  url: string;
  title: string | null;
  pageText: string;
  tripType?: string;
}): Promise<ExtractedListing> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is niet ingesteld. Voeg die toe aan .env.local om importeren te gebruiken."
    );
  }

  const isSummer = input.tripType === "summer";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: isSummer ? SUMMER_SYSTEM : SKI_SYSTEM,
        },
        {
          role: "user",
          content: JSON.stringify({
            url: input.url,
            title: input.title,
            pageText: input.pageText.slice(0, 24000),
          }),
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("OpenAI extract listing error", res.status, err);
    throw new Error(
      "AI kon de advertentie niet uitlezen. Probeer opnieuw of vul handmatig in."
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    throw new Error("AI gaf geen bruikbare gegevens terug.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI-antwoord was ongeldig. Probeer opnieuw.");
  }

  const result = extractedListingSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      "Kon geen duidelijke bestemmingsgegevens uit de pagina halen."
    );
  }

  return { ...result.data, imageUrls: [] };
}

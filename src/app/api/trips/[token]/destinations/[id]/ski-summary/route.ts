import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { destinations, trips, type DestinationTypeDetails } from "@/db/schema";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import {
  generateSkiResortSummary,
  SKI_SUMMARY_VERSION,
} from "@/lib/ski-summary";
import { getTripByToken } from "@/lib/trip-data";

type Params = { params: Promise<{ token: string; id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { token, id } = await params;
    const body = await request.json().catch(() => ({}));
    const force = Boolean(body?.force);

    const db = getDb();
    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.token, token))
      .limit(1);
    if (!trip) return jsonError("Reis niet gevonden", 404);

    const [dest] = await db
      .select()
      .from(destinations)
      .where(and(eq(destinations.id, id), eq(destinations.tripId, trip.id)))
      .limit(1);
    if (!dest) return jsonError("Bestemming niet gevonden", 404);

    const details = (dest.typeDetails ?? {}) as DestinationTypeDetails;
    const skiArea = details.skiArea?.trim();
    if (!skiArea) {
      return jsonError("Voeg eerst een skigebied toe om een samenvatting te genereren", 400);
    }

    const cacheValid =
      Boolean(details.skiResortSummary) &&
      details.skiResortSummaryVersion === SKI_SUMMARY_VERSION;

    if (!force && cacheValid) {
      return jsonOk({
        summary: details.skiResortSummary,
        generatedAt: details.skiResortSummaryGeneratedAt ?? null,
        cached: true,
      });
    }

    const summary = await generateSkiResortSummary({
      skiArea,
      locationText: dest.locationText,
      nearbyLifts: details.nearbyLifts ?? null,
    });
    const generatedAt = new Date().toISOString();

    await db
      .update(destinations)
      .set({
        typeDetails: {
          ...details,
          skiResortSummary: summary,
          skiResortSummaryGeneratedAt: generatedAt,
          skiResortSummaryVersion: SKI_SUMMARY_VERSION,
        },
      })
      .where(eq(destinations.id, id));

    await getTripByToken(token);

    return jsonOk({
      summary,
      generatedAt,
      cached: false,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

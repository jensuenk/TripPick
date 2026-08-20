import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { destinations, trips, type DestinationTypeDetails } from "@/db/schema";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { nightsBetween, SUMMER_OVERVIEW_VERSION } from "@/lib/summer";
import { generateSummerOverview } from "@/lib/summer-summary";
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
    if (trip.type !== "summer") {
      return jsonError("Dit overzicht is alleen voor zomervakanties", 400);
    }

    const [dest] = await db
      .select()
      .from(destinations)
      .where(and(eq(destinations.id, id), eq(destinations.tripId, trip.id)))
      .limit(1);
    if (!dest) return jsonError("Bestemming niet gevonden", 404);

    const details = (dest.typeDetails ?? {}) as DestinationTypeDetails;
    const hasContext =
      Boolean(dest.locationText?.trim()) ||
      Boolean(details.nearbyCities?.length) ||
      Boolean(details.nearbyBeaches?.length) ||
      Boolean(details.nearbyAirports?.length);
    if (!hasContext) {
      return jsonError(
        "Voeg eerst een locatie of nabije plaatsen toe om een overzicht te genereren",
        400
      );
    }

    const cacheValid =
      Boolean(details.summerOverview) &&
      details.summerOverviewVersion === SUMMER_OVERVIEW_VERSION;

    if (!force && cacheValid) {
      return jsonOk({
        overview: details.summerOverview,
        climate: details.climate ?? null,
        activities: details.activities ?? [],
        flightHint: details.flightHint ?? null,
        generatedAt: details.summerOverviewGeneratedAt ?? null,
        cached: true,
      });
    }

    const result = await generateSummerOverview({
      name: dest.name,
      locationText: dest.locationText,
      checkIn: details.checkIn ?? trip.startDate,
      checkOut: details.checkOut ?? trip.endDate,
      nights:
        details.nights ??
        nightsBetween(
          details.checkIn ?? trip.startDate,
          details.checkOut ?? trip.endDate
        ),
      nearbyAirports: details.nearbyAirports ?? null,
      nearbyBeaches: details.nearbyBeaches ?? null,
      nearbyCities: details.nearbyCities ?? null,
      tags: details.tags ?? null,
    });
    const generatedAt = new Date().toISOString();

    await db
      .update(destinations)
      .set({
        typeDetails: {
          ...details,
          summerOverview: result.overview,
          climate: result.climate || undefined,
          activities: result.activities,
          flightHint: result.flightHint,
          summerOverviewGeneratedAt: generatedAt,
          summerOverviewVersion: SUMMER_OVERVIEW_VERSION,
        },
      })
      .where(eq(destinations.id, id));

    await getTripByToken(token);

    return jsonOk({
      overview: result.overview,
      climate: result.climate || null,
      activities: result.activities,
      flightHint: result.flightHint ?? null,
      generatedAt,
      cached: false,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

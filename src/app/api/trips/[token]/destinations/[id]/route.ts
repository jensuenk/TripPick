import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { destinationImages, destinations, trips } from "@/db/schema";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { mergeTypeDetails } from "@/lib/ski-summary";
import { assertMemberOnTrip, getTripByToken } from "@/lib/trip-data";
import { destinationPayloadSchema } from "@/lib/validators";
import type { DestinationTypeDetails } from "@/db/schema";
import { z } from "zod";

type Params = { params: Promise<{ token: string; id: string }> };

const deleteSchema = z.object({
  memberId: z.string().uuid(),
});

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { token, id } = await params;
    const db = getDb();
    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.token, token))
      .limit(1);
    if (!trip) return jsonError("Reis niet gevonden", 404);

    const [existing] = await db
      .select()
      .from(destinations)
      .where(and(eq(destinations.id, id), eq(destinations.tripId, trip.id)))
      .limit(1);
    if (!existing) return jsonError("Bestemming niet gevonden", 404);

    const body = await request.json();
    const input = destinationPayloadSchema.parse(body);

    const member = await assertMemberOnTrip(trip.id, input.memberId);
    if (!member) return jsonError("Persoon niet gevonden op deze reis", 403);

    const bookingUrl =
      input.bookingUrl && input.bookingUrl.length > 0
        ? input.bookingUrl
        : null;

    await db
      .update(destinations)
      .set({
        name: input.name,
        locationText: input.locationText || null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        priceTotalCents: input.priceTotalCents ?? null,
        bookingUrl,
        bedrooms: input.bedrooms ?? null,
        beds: input.beds,
        bathrooms: input.bathrooms ?? null,
        description: input.description || null,
        pros: input.pros,
        cons: input.cons,
        stars: input.stars ?? null,
        typeDetails: mergeTypeDetails(
          existing.typeDetails as DestinationTypeDetails,
          input.typeDetails as DestinationTypeDetails
        ),
      })
      .where(eq(destinations.id, id));

    await db
      .delete(destinationImages)
      .where(eq(destinationImages.destinationId, id));

    if (input.images.length) {
      await db.insert(destinationImages).values(
        input.images.map((img, index) => ({
          destinationId: id,
          blobUrl: img.blobUrl,
          category: img.category,
          sortOrder: img.sortOrder ?? index,
        }))
      );
    }

    const full = await getTripByToken(token);
    const updated = full?.destinations.find((d) => d.id === id);
    return jsonOk(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { token, id } = await params;
    const db = getDb();
    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.token, token))
      .limit(1);
    if (!trip) return jsonError("Reis niet gevonden", 404);

    const body = await request.json().catch(() => ({}));
    const input = deleteSchema.parse(body);

    const member = await assertMemberOnTrip(trip.id, input.memberId);
    if (!member) return jsonError("Persoon niet gevonden op deze reis", 403);

    const [existing] = await db
      .select()
      .from(destinations)
      .where(and(eq(destinations.id, id), eq(destinations.tripId, trip.id)))
      .limit(1);
    if (!existing) return jsonError("Bestemming niet gevonden", 404);

    await db.delete(destinations).where(eq(destinations.id, id));

    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

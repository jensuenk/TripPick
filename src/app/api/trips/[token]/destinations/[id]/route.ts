import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { destinationImages, destinations, trips } from "@/db/schema";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { assertMemberOnTrip, getTripByToken } from "@/lib/trip-data";
import { destinationPayloadSchema } from "@/lib/validators";

type Params = { params: Promise<{ token: string; id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { token, id } = await params;
    const db = getDb();
    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.token, token))
      .limit(1);
    if (!trip) return jsonError("Trip not found", 404);

    const [existing] = await db
      .select()
      .from(destinations)
      .where(and(eq(destinations.id, id), eq(destinations.tripId, trip.id)))
      .limit(1);
    if (!existing) return jsonError("Destination not found", 404);

    const body = await request.json();
    const input = destinationPayloadSchema.parse(body);

    const member = await assertMemberOnTrip(trip.id, input.memberId);
    if (!member) return jsonError("Member not found on this trip", 403);

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
        typeDetails: input.typeDetails,
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

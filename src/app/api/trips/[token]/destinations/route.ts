import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { destinationImages, destinations, trips } from "@/db/schema";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { assertMemberOnTrip, getTripByToken } from "@/lib/trip-data";
import { destinationPayloadSchema } from "@/lib/validators";

type Params = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { token } = await params;
    const db = getDb();
    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.token, token))
      .limit(1);
    if (!trip) return jsonError("Trip not found", 404);

    const body = await request.json();
    const input = destinationPayloadSchema.parse(body);

    const member = await assertMemberOnTrip(trip.id, input.memberId);
    if (!member) return jsonError("Member not found on this trip", 403);

    const bookingUrl =
      input.bookingUrl && input.bookingUrl.length > 0
        ? input.bookingUrl
        : null;

    const [dest] = await db
      .insert(destinations)
      .values({
        tripId: trip.id,
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
        createdByMemberId: input.memberId,
      })
      .returning();

    if (input.images.length) {
      await db.insert(destinationImages).values(
        input.images.map((img, index) => ({
          destinationId: dest.id,
          blobUrl: img.blobUrl,
          category: img.category,
          sortOrder: img.sortOrder ?? index,
        }))
      );
    }

    const full = await getTripByToken(token);
    const created = full?.destinations.find((d) => d.id === dest.id);
    return jsonOk(created, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

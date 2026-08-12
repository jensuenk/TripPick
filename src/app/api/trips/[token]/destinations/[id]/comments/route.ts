import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { comments, destinations, trips } from "@/db/schema";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { assertMemberOnTrip } from "@/lib/trip-data";
import { commentSchema } from "@/lib/validators";

type Params = { params: Promise<{ token: string; id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { token, id } = await params;
    const db = getDb();
    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.token, token))
      .limit(1);
    if (!trip) return jsonError("Trip not found", 404);

    const [dest] = await db
      .select()
      .from(destinations)
      .where(and(eq(destinations.id, id), eq(destinations.tripId, trip.id)))
      .limit(1);
    if (!dest) return jsonError("Destination not found", 404);

    const body = await request.json();
    const input = commentSchema.parse(body);

    const member = await assertMemberOnTrip(trip.id, input.memberId);
    if (!member) return jsonError("Member not found on this trip", 403);

    const [comment] = await db
      .insert(comments)
      .values({
        destinationId: id,
        memberId: input.memberId,
        body: input.body,
      })
      .returning();

    return jsonOk(
      {
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
        member: {
          id: member.id,
          firstName: member.firstName,
          avatarColor: member.avatarColor,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { destinations, reactions, trips } from "@/db/schema";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { assertMemberOnTrip } from "@/lib/trip-data";
import { reactionSchema } from "@/lib/validators";

type Params = { params: Promise<{ token: string; id: string }> };

const VOTE_KINDS = ["like", "maybe", "no"] as const;

export async function PUT(request: Request, { params }: Params) {
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
    const input = reactionSchema.parse(body);

    const member = await assertMemberOnTrip(trip.id, input.memberId);
    if (!member) return jsonError("Member not found on this trip", 403);

    if (input.kind === "favorite") {
      const [existing] = await db
        .select()
        .from(reactions)
        .where(
          and(
            eq(reactions.destinationId, id),
            eq(reactions.memberId, input.memberId),
            eq(reactions.kind, "favorite")
          )
        )
        .limit(1);

      if (existing) {
        await db.delete(reactions).where(eq(reactions.id, existing.id));
        return jsonOk({ active: false, kind: "favorite" });
      }

      await db.insert(reactions).values({
        destinationId: id,
        memberId: input.memberId,
        kind: "favorite",
      });
      return jsonOk({ active: true, kind: "favorite" });
    }

    // Vote kinds are mutually exclusive
    const existingVotes = await db
      .select()
      .from(reactions)
      .where(
        and(
          eq(reactions.destinationId, id),
          eq(reactions.memberId, input.memberId),
          inArray(reactions.kind, [...VOTE_KINDS])
        )
      );

    const same = existingVotes.find((r) => r.kind === input.kind);
    if (same) {
      await db.delete(reactions).where(eq(reactions.id, same.id));
      return jsonOk({ active: false, kind: input.kind });
    }

    if (existingVotes.length) {
      await db
        .delete(reactions)
        .where(
          inArray(
            reactions.id,
            existingVotes.map((r) => r.id)
          )
        );
    }

    await db.insert(reactions).values({
      destinationId: id,
      memberId: input.memberId,
      kind: input.kind,
    });

    return jsonOk({ active: true, kind: input.kind });
  } catch (error) {
    return handleApiError(error);
  }
}

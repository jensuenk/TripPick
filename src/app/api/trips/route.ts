import { nanoid } from "nanoid";
import { getDb } from "@/db";
import { tripMembers, trips } from "@/db/schema";
import { pickAvatarColor } from "@/lib/avatars";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { createTripSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = createTripSchema.parse(body);

    if (new Date(input.endDate) < new Date(input.startDate)) {
      return jsonError("Einddatum moet op of na de begindatum liggen");
    }

    if (input.type !== "ski" && input.type !== "summer") {
      return jsonError("Momenteel zijn alleen ski- en zomereizen beschikbaar");
    }

    const db = getDb();
    const token = nanoid(12);

    const [trip] = await db
      .insert(trips)
      .values({
        token,
        name: input.name,
        type: input.type,
        startDate: input.startDate,
        endDate: input.endDate,
      })
      .returning();

    const members = await db
      .insert(tripMembers)
      .values(
        input.members.map((firstName, index) => ({
          tripId: trip.id,
          firstName,
          avatarColor: pickAvatarColor(index),
        }))
      )
      .returning();

    return jsonOk(
      {
        id: trip.id,
        token: trip.token,
        name: trip.name,
        type: trip.type,
        startDate: trip.startDate,
        endDate: trip.endDate,
        members: members.map((m) => ({
          id: m.id,
          firstName: m.firstName,
          avatarColor: m.avatarColor,
        })),
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

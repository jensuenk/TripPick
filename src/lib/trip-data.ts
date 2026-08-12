import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  comments,
  destinationImages,
  destinations,
  reactions,
  tripMembers,
  trips,
  type BedConfig,
  type DestinationTypeDetails,
} from "@/db/schema";

export type ApiMember = {
  id: string;
  firstName: string;
  avatarColor: string;
};

export type ApiImage = {
  id: string;
  blobUrl: string;
  category: string;
  sortOrder: number;
};

export type ApiComment = {
  id: string;
  body: string;
  createdAt: string;
  member: ApiMember;
};

export type ApiReaction = {
  id: string;
  kind: string;
  memberId: string;
  member: ApiMember;
};

export type ApiDestination = {
  id: string;
  name: string;
  locationText: string | null;
  lat: number | null;
  lng: number | null;
  priceTotalCents: number | null;
  bookingUrl: string | null;
  bedrooms: number | null;
  beds: BedConfig[];
  bathrooms: number | null;
  description: string | null;
  pros: string[];
  cons: string[];
  stars: number | null;
  typeDetails: DestinationTypeDetails;
  createdByMemberId: string | null;
  createdAt: string;
  images: ApiImage[];
  comments: ApiComment[];
  reactions: ApiReaction[];
  counts: {
    favorite: number;
    like: number;
    maybe: number;
    no: number;
    comments: number;
  };
};

export type ApiTrip = {
  id: string;
  token: string;
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  members: ApiMember[];
  destinations: ApiDestination[];
};

export async function getTripByToken(token: string): Promise<ApiTrip | null> {
  const db = getDb();
  const [trip] = await db.select().from(trips).where(eq(trips.token, token)).limit(1);
  if (!trip) return null;

  const members = await db
    .select()
    .from(tripMembers)
    .where(eq(tripMembers.tripId, trip.id))
    .orderBy(asc(tripMembers.firstName));

  const memberMap = new Map(members.map((m) => [m.id, m]));

  const destRows = await db
    .select()
    .from(destinations)
    .where(eq(destinations.tripId, trip.id))
    .orderBy(asc(destinations.createdAt));

  const destIds = destRows.map((d) => d.id);

  const [imageRows, commentRows, reactionRows] =
    destIds.length === 0
      ? [[], [], []]
      : await Promise.all([
          db
            .select()
            .from(destinationImages)
            .where(inArray(destinationImages.destinationId, destIds))
            .orderBy(asc(destinationImages.sortOrder)),
          db
            .select()
            .from(comments)
            .where(inArray(comments.destinationId, destIds))
            .orderBy(asc(comments.createdAt)),
          db
            .select()
            .from(reactions)
            .where(inArray(reactions.destinationId, destIds)),
        ]);

  const imagesByDest = groupBy(imageRows, (i) => i.destinationId);
  const commentsByDest = groupBy(commentRows, (c) => c.destinationId);
  const reactionsByDest = groupBy(reactionRows, (r) => r.destinationId);

  const apiDestinations: ApiDestination[] = destRows.map((d) => {
    const imgs = imagesByDest.get(d.id) ?? [];
    const cmts = commentsByDest.get(d.id) ?? [];
    const reacts = reactionsByDest.get(d.id) ?? [];

    const mappedReactions: ApiReaction[] = reacts
      .map((r) => {
        const member = memberMap.get(r.memberId);
        if (!member) return null;
        return {
          id: r.id,
          kind: r.kind,
          memberId: r.memberId,
          member: {
            id: member.id,
            firstName: member.firstName,
            avatarColor: member.avatarColor,
          },
        };
      })
      .filter(Boolean) as ApiReaction[];

    const mappedComments: ApiComment[] = cmts
      .map((c) => {
        const member = memberMap.get(c.memberId);
        if (!member) return null;
        return {
          id: c.id,
          body: c.body,
          createdAt: c.createdAt.toISOString(),
          member: {
            id: member.id,
            firstName: member.firstName,
            avatarColor: member.avatarColor,
          },
        };
      })
      .filter(Boolean) as ApiComment[];

    return {
      id: d.id,
      name: d.name,
      locationText: d.locationText,
      lat: d.lat,
      lng: d.lng,
      priceTotalCents: d.priceTotalCents,
      bookingUrl: d.bookingUrl,
      bedrooms: d.bedrooms,
      beds: (d.beds ?? []) as BedConfig[],
      bathrooms: d.bathrooms,
      description: d.description,
      pros: (d.pros ?? []) as string[],
      cons: (d.cons ?? []) as string[],
      stars: d.stars,
      typeDetails: (d.typeDetails ?? {}) as DestinationTypeDetails,
      createdByMemberId: d.createdByMemberId,
      createdAt: d.createdAt.toISOString(),
      images: imgs.map((i) => ({
        id: i.id,
        blobUrl: i.blobUrl,
        category: i.category,
        sortOrder: i.sortOrder,
      })),
      comments: mappedComments,
      reactions: mappedReactions,
      counts: {
        favorite: mappedReactions.filter((r) => r.kind === "favorite").length,
        like: mappedReactions.filter((r) => r.kind === "like").length,
        maybe: mappedReactions.filter((r) => r.kind === "maybe").length,
        no: mappedReactions.filter((r) => r.kind === "no").length,
        comments: mappedComments.length,
      },
    };
  });

  return {
    id: trip.id,
    token: trip.token,
    name: trip.name,
    type: trip.type,
    startDate: trip.startDate,
    endDate: trip.endDate,
    createdAt: trip.createdAt.toISOString(),
    members: members.map((m) => ({
      id: m.id,
      firstName: m.firstName,
      avatarColor: m.avatarColor,
    })),
    destinations: apiDestinations,
  };
}

export async function assertMemberOnTrip(tripId: string, memberId: string) {
  const db = getDb();
  const [member] = await db
    .select()
    .from(tripMembers)
    .where(and(eq(tripMembers.id, memberId), eq(tripMembers.tripId, tripId)))
    .limit(1);
  return member ?? null;
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

export { sql };

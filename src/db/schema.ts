import {
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export type BedConfig = {
  type: "double" | "single" | "bunk" | "sofa";
  count: number;
};

export type SkiTypeDetails = {
  skiArea?: string;
  minutesToLift?: number;
};

export type DestinationTypeDetails = SkiTypeDetails & Record<string, unknown>;

export const trips = pgTable("trips", {
  id: uuid("id").defaultRandom().primaryKey(),
  token: text("token").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull().default("ski"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const tripMembers = pgTable(
  "trip_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    avatarColor: text("avatar_color").notNull(),
  },
  (table) => [index("trip_members_trip_id_idx").on(table.tripId)]
);

export const destinations = pgTable(
  "destinations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    locationText: text("location_text"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    priceTotalCents: integer("price_total_cents"),
    bookingUrl: text("booking_url"),
    bedrooms: integer("bedrooms"),
    beds: jsonb("beds").$type<BedConfig[]>().default([]).notNull(),
    bathrooms: integer("bathrooms"),
    description: text("description"),
    pros: jsonb("pros").$type<string[]>().default([]).notNull(),
    cons: jsonb("cons").$type<string[]>().default([]).notNull(),
    stars: real("stars"),
    typeDetails: jsonb("type_details")
      .$type<DestinationTypeDetails>()
      .default({})
      .notNull(),
    createdByMemberId: uuid("created_by_member_id").references(
      () => tripMembers.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("destinations_trip_id_idx").on(table.tripId)]
);

export const destinationImages = pgTable(
  "destination_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    destinationId: uuid("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    blobUrl: text("blob_url").notNull(),
    category: text("category").notNull(), // accommodation | surroundings | skimap
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    index("destination_images_destination_id_idx").on(table.destinationId),
  ]
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    destinationId: uuid("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => tripMembers.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("comments_destination_id_idx").on(table.destinationId)]
);

export const reactions = pgTable(
  "reactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    destinationId: uuid("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => tripMembers.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // favorite | like | maybe | no
  },
  (table) => [
    index("reactions_destination_id_idx").on(table.destinationId),
    uniqueIndex("reactions_unique_member_kind").on(
      table.destinationId,
      table.memberId,
      table.kind
    ),
  ]
);

export type Trip = typeof trips.$inferSelect;
export type TripMember = typeof tripMembers.$inferSelect;
export type Destination = typeof destinations.$inferSelect;
export type DestinationImage = typeof destinationImages.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Reaction = typeof reactions.$inferSelect;

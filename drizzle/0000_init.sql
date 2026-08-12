CREATE TABLE IF NOT EXISTS "trips" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "token" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "type" text DEFAULT 'ski' NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "trip_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "trip_id" uuid NOT NULL REFERENCES "trips"("id") ON DELETE cascade,
  "first_name" text NOT NULL,
  "avatar_color" text NOT NULL
);

CREATE INDEX IF NOT EXISTS "trip_members_trip_id_idx" ON "trip_members" ("trip_id");

CREATE TABLE IF NOT EXISTS "destinations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "trip_id" uuid NOT NULL REFERENCES "trips"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "location_text" text,
  "lat" double precision,
  "lng" double precision,
  "price_total_cents" integer,
  "booking_url" text,
  "bedrooms" integer,
  "beds" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "bathrooms" integer,
  "description" text,
  "pros" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "cons" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "stars" real,
  "type_details" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_by_member_id" uuid REFERENCES "trip_members"("id") ON DELETE set null,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "destinations_trip_id_idx" ON "destinations" ("trip_id");

CREATE TABLE IF NOT EXISTS "destination_images" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "destination_id" uuid NOT NULL REFERENCES "destinations"("id") ON DELETE cascade,
  "blob_url" text NOT NULL,
  "category" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL
);

CREATE INDEX IF NOT EXISTS "destination_images_destination_id_idx" ON "destination_images" ("destination_id");

CREATE TABLE IF NOT EXISTS "comments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "destination_id" uuid NOT NULL REFERENCES "destinations"("id") ON DELETE cascade,
  "member_id" uuid NOT NULL REFERENCES "trip_members"("id") ON DELETE cascade,
  "body" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "comments_destination_id_idx" ON "comments" ("destination_id");

CREATE TABLE IF NOT EXISTS "reactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "destination_id" uuid NOT NULL REFERENCES "destinations"("id") ON DELETE cascade,
  "member_id" uuid NOT NULL REFERENCES "trip_members"("id") ON DELETE cascade,
  "kind" text NOT NULL
);

CREATE INDEX IF NOT EXISTS "reactions_destination_id_idx" ON "reactions" ("destination_id");
CREATE UNIQUE INDEX IF NOT EXISTS "reactions_unique_member_kind" ON "reactions" ("destination_id","member_id","kind");

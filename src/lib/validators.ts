import { z } from "zod";

export const bedSchema = z.object({
  type: z.enum(["double", "single", "bunk", "sofa"]),
  count: z.number().int().min(1).max(20),
});

export const imageInputSchema = z.object({
  blobUrl: z
    .string()
    .min(1)
    .refine(
      (v) => v.startsWith("/") || /^https?:\/\//.test(v),
      "Invalid image URL"
    ),
  category: z.enum(["accommodation", "surroundings", "skimap"]),
  sortOrder: z.number().int().min(0).default(0),
});

export const createTripSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(["ski", "roadtrip", "beach", "city"]).default("ski"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  members: z
    .array(z.string().trim().min(1).max(60))
    .min(1)
    .max(30),
});

export const destinationPayloadSchema = z.object({
  memberId: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  locationText: z.string().trim().max(300).optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  priceTotalCents: z.number().int().min(0).optional().nullable(),
  bookingUrl: z
    .union([z.string().url(), z.literal(""), z.null()])
    .optional(),
  bedrooms: z.number().int().min(0).max(50).optional().nullable(),
  beds: z.array(bedSchema).default([]),
  bathrooms: z.number().int().min(0).max(50).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  pros: z.array(z.string().trim().min(1).max(200)).default([]),
  cons: z.array(z.string().trim().min(1).max(200)).default([]),
  stars: z.number().min(0).max(5).optional().nullable(),
  typeDetails: z
    .object({
      skiArea: z.string().trim().max(200).optional(),
      minutesToLift: z.number().int().min(0).max(600).optional(),
    })
    .passthrough()
    .default({}),
  images: z.array(imageInputSchema).default([]),
});

export const commentSchema = z.object({
  memberId: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
});

export const reactionSchema = z.object({
  memberId: z.string().uuid(),
  kind: z.enum(["favorite", "like", "maybe", "no"]),
});

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type DestinationPayload = z.infer<typeof destinationPayloadSchema>;

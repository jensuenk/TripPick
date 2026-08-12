# TripPick

Mobile-first trip destination voting for families and friends. Create a ski trip, share a private link, add accommodation options, then vote, favorite, and chat until everyone agrees.

## Stack

- **Next.js** (App Router) + TypeScript
- **Neon Postgres** + **Drizzle ORM**
- **Vercel Blob** for photos (local `/public/uploads` fallback without a Blob token)
- **Tailwind CSS** + **shadcn/ui** + **Framer Motion**
- **Leaflet** + OpenStreetMap (no API key)

No login — trips are gated by an unguessable share token. Travelers pick their name once; it is remembered in `localStorage`.

## Setup

### 1. Install

```bash
npm install
```

### 2. Environment

```bash
cp .env.example .env.local
```

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Neon connection string |
| `BLOB_READ_WRITE_TOKEN` | Prod | From Vercel Blob store |
| `NEXT_PUBLIC_USE_BLOB` | Prod | Set `true` when using Blob client uploads |

### 3. Database

Create a free Neon project, copy the connection string into `.env.local`, then push the schema:

```bash
npm run db:push
```

Or run the SQL in [`drizzle/0000_init.sql`](drizzle/0000_init.sql) in the Neon SQL editor.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Local photo uploads go to `public/uploads` when Blob is not configured.

## Deploy on Vercel

1. Push this repo to GitHub.
2. Import the project in Vercel.
3. Add env vars: `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `NEXT_PUBLIC_USE_BLOB=true`.
4. Create a Blob store in the Vercel project (Storage → Blob).
5. Run `npm run db:push` once against production `DATABASE_URL` (or apply `drizzle/0000_init.sql`).
6. Deploy.

Hobby Vercel is free for non-commercial / family use.

## App flows

1. **Landing** → Create a trip
2. **Wizard** → type (ski) → name & dates → travelers → share link
3. **Trip dashboard** `/trip/[token]` → pick who you are → browse destination cards
4. **Add destination** → multi-step form (basics, beds, ski info, pros/cons, photos)
5. **Vote** with heart / like / maybe / no and comment under each card
6. **Detail** view with gallery, map, ski map, vote breakdown

## Extending later

- Trip types live in [`src/lib/trip-types.ts`](src/lib/trip-types.ts) — enable roadtrip/beach/city when ready.
- Ski-specific fields sit in `destinations.type_details` (jsonb).
- “Import from booking site” is stubbed for future AI extraction.

# TripPick

Trip destination collection and voting tool for families and friends. Create a **ski trip** or **summer holiday**, share a private link, add accommodation options, then vote, favorite, and comment until everyone agrees.

The UI is in Dutch (`nl-BE`).

## Disclaimer

This project is **fully vibe coded**. It was built in Cursor with an AI coding agent, not as a carefully engineered product. Treat it as a family experiment: fun, useful, and absolutely not a promise of correctness, security, or live travel prices. Double-check bookings, distances, and flight estimates before you pay for anything.

## Stack

- **Next.js** (App Router) + TypeScript
- **Neon Postgres** + **Drizzle ORM**
- **Vercel Blob** for photos (server-side upload via `/api/upload`; Blob store must be **Public**)
- **OpenAI** for listing import, ski-area overviews, and summer destination overviews / flight estimates
- **Tailwind CSS** + **shadcn/ui** + **Framer Motion**
- **Leaflet** + OpenStreetMap (no API key)

No login — trips are gated by an unguessable share token. Travelers pick their name once; it is remembered in `localStorage`.

## Setup

### 1. Install

```bash
npm install
```

### 2. Environment

Create `.env.local` in the project root:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Neon connection string |
| `BLOB_READ_WRITE_TOKEN` | For photo uploads | Static Blob token. Also set `BLOB_STORE_ID` if you use a Vercel Blob store. The store must be **Public**. |
| `OPENAI_API_KEY` | For AI features | Listing import, ski overviews, summer overviews, flight price hints |
| `OPENAI_MODEL` | Optional | Defaults to `gpt-4o-mini` |

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

## Deploy on Vercel

1. Push this repo to GitHub.
2. Import the project in Vercel.
3. Add env vars: `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN` (or link a Blob store so OIDC + `BLOB_STORE_ID` are set), `OPENAI_API_KEY`.
4. Create a Blob store in the Vercel project (Storage → Blob). Access should be **Public** so destination photos load in the browser.
5. Run `npm run db:push` once against production `DATABASE_URL` (or apply `drizzle/0000_init.sql`).
6. Deploy.

Hobby Vercel is fine for non-commercial / family use.

## App flows

1. **Landing** → Create a trip
2. **Wizard** → ski or summer → name & dates → travelers → share link
3. **Trip dashboard** `/trip/[token]` → pick who you are → browse destination cards
4. **Add destination** → paste an Airbnb/Booking URL to auto-fill, or enter details by hand
5. **Vote** with heart / like / maybe / no and comment under each card
6. **Detail** view with gallery, map, type-specific info, and votes

### Ski trips

Chalets and apartments with ski area, nearby lifts (official local names), distance / drive-time estimates, piste-map photos, and an AI ski-area overview.

### Summer holidays

Each stay can have its own check-in / check-out and night count. Add amenity tags (breakfast, pool, kids club, …), distances to airports, beaches, and cities, and mark whether **flights are already included**.

AI writes a destination overview (vibe of the area, climate, family activities) plus a rough flight duration and price from Brussels. Dashboard cards show stay price, estimated flights × number of travelers, and a combined total. The flights widget links out to Google Flights, Skyscanner, and Kayak — those sites have the live fares. TripPick only shows an indication.

## Extending later

- Trip types live in [`src/lib/trip-types.ts`](src/lib/trip-types.ts) — enable roadtrip / beach / city when ready.
- Type-specific fields sit in `destinations.type_details` (jsonb), so ski and summer data do not need extra migrations.

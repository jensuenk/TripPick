import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { extractListingWithAi } from "@/lib/extract-listing";
import { scrapeListingPage } from "@/lib/scrape-listing";

const bodySchema = z.object({
  url: z.string().trim().min(8).max(2000),
});

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return jsonError(
        "OPENAI_API_KEY is niet ingesteld. Voeg die toe aan .env.local om importeren te gebruiken.",
        503
      );
    }

    const json = await request.json();
    const { url } = bodySchema.parse(json);

    const scraped = await scrapeListingPage(url);
    const extracted = await extractListingWithAi({
      url: scraped.url,
      title: scraped.title,
      pageText: scraped.text,
    });

    return jsonOk({
      bookingUrl: scraped.url,
      ...extracted,
      // Always use scraped photos as accommodation images (no AI filtering)
      imageUrls: scraped.imageUrls,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError("Ongeldige URL.", 400);
    }
    // Surface scrape/AI messages to the client
    if (error instanceof Error) {
      const msg = error.message;
      if (
        msg.includes("OPENAI_API_KEY") ||
        msg.includes("Ongeldige") ||
        msg.includes("Kon ") ||
        msg.includes("Geen ") ||
        msg.includes("AI ") ||
        msg.includes("Alleen http") ||
        msg.includes("Deze URL")
      ) {
        return NextResponse.json({ error: msg }, { status: 422 });
      }
    }
    return handleApiError(error);
  }
}

import type { DestinationTypeDetails } from "@/db/schema";

/** Bump when the summary prompt changes so old caches refresh. */
export const SKI_SUMMARY_VERSION = 2;

export async function generateSkiResortSummary(input: {
  skiArea: string;
  locationText?: string | null;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env.local to enable AI ski resort summaries."
    );
  }

  const locationHint = input.locationText
    ? ` Nearby village/location context: ${input.locationText}.`
    : "";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 220,
      messages: [
        {
          role: "system",
          content: [
            "You write compact ski-area fact summaries for a family trip planner.",
            "Write 1 short paragraph, about 55–80 words. No bullet lists.",
            "Focus only on: resort size (piste km if known), altitude/height range, slope mix (beginner/intermediate/advanced), how busy or popular it typically is, and snow parks / fun parks if notable.",
            "Skip other activities (spas, shopping, hiking, nightlife, etc.).",
            "If a fact is uncertain, say so briefly or omit it — do not invent precise numbers.",
            "Do not mention that you are an AI.",
          ].join(" "),
        },
        {
          role: "user",
          content: `Summarize the ski area "${input.skiArea}".${locationHint}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("OpenAI ski summary error", res.status, err);
    throw new Error("AI summary failed. Check your OpenAI API key and try again.");
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("AI returned an empty summary");
  return text;
}

/** Preserve cached AI summary when ski area + prompt version are unchanged. */
export function mergeTypeDetails(
  existing: DestinationTypeDetails | null | undefined,
  incoming: DestinationTypeDetails
): DestinationTypeDetails {
  const prev = existing ?? {};
  const next: DestinationTypeDetails = { ...incoming };

  const sameArea =
    prev.skiArea &&
    next.skiArea &&
    prev.skiArea.trim().toLowerCase() === next.skiArea.trim().toLowerCase();

  const sameVersion = prev.skiResortSummaryVersion === SKI_SUMMARY_VERSION;

  if (sameArea && sameVersion && prev.skiResortSummary) {
    next.skiResortSummary = prev.skiResortSummary;
    next.skiResortSummaryGeneratedAt = prev.skiResortSummaryGeneratedAt;
    next.skiResortSummaryVersion = prev.skiResortSummaryVersion;
  } else {
    delete next.skiResortSummary;
    delete next.skiResortSummaryGeneratedAt;
    delete next.skiResortSummaryVersion;
  }

  return next;
}

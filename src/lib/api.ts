import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return jsonError(error.issues[0]?.message ?? "Invalid input", 400);
  }
  console.error(error);
  const message =
    error instanceof Error ? error.message : "Internal server error";
  if (message.includes("DATABASE_URL") || message.includes("OPENAI_API_KEY")) {
    return jsonError(message, 503);
  }
  if (message.includes("AI summary") || message.includes("AI returned")) {
    return jsonError(message, 502);
  }
  return jsonError("Internal server error", 500);
}

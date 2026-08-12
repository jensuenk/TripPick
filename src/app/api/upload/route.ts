import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";
import { handleApiError, jsonError } from "@/lib/api";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

function hasBlobAuth(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN)
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return jsonError("Verwacht multipart/form-data upload", 400);
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return jsonError("Bestand ontbreekt");
    }

    if (file.size > MAX_BYTES) {
      return jsonError("Bestand is te groot (max 8 MB)");
    }

    if (file.type && !ALLOWED_TYPES.has(file.type)) {
      return jsonError("Alleen afbeeldingen zijn toegestaan");
    }

    const ext = path.extname(file.name) || ".jpg";
    const filename = `${nanoid(16)}${ext}`;

    // Prefer Vercel Blob when configured (works on Vercel via OIDC or static token)
    if (hasBlobAuth()) {
      try {
        // Prefer the static RW token. Locally, VERCEL_OIDC_TOKEN often takes
        // precedence and fails with "Access denied".
        const token = process.env.BLOB_READ_WRITE_TOKEN || undefined;
        const blob = await put(filename, file, {
          access: "public",
          addRandomSuffix: false,
          contentType: file.type || "image/jpeg",
          ...(token ? { token } : {}),
        });
        return NextResponse.json({ url: blob.url });
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (/private store/i.test(message)) {
          return jsonError(
            "Je Vercel Blob-store staat op Private. Zet Access op Public in de Blob-store-instellingen (Storage → store → Settings), anders kunnen foto’s niet in de app geladen worden.",
            400
          );
        }
        if (/access denied|valid token/i.test(message)) {
          return jsonError(
            "Blob-token ongeldig of hoort niet bij deze store. Vernieuw BLOB_READ_WRITE_TOKEN via `npx vercel env pull .env.local` en herstart de dev server.",
            401
          );
        }
        throw error;
      }
    }

    // Local/dev fallback to public/uploads
    const bytes = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), bytes);

    return NextResponse.json({
      url: `/uploads/${filename}`,
    });
  } catch (error) {
    console.error("Upload failed", error);
    return handleApiError(error);
  }
}

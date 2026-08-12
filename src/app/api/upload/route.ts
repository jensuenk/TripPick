import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";
import { handleApiError, jsonError } from "@/lib/api";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const contentType = request.headers.get("content-type") || "";

    // Local/dev fallback: multipart upload to public/uploads when no Blob token
    if (contentType.includes("multipart/form-data")) {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        return jsonError("Use client upload with Blob token configured", 400);
      }

      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return jsonError("Missing file");
      }

      const bytes = Buffer.from(await file.arrayBuffer());
      const ext = path.extname(file.name) || ".jpg";
      const filename = `${nanoid(16)}${ext}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, filename), bytes);

      return NextResponse.json({
        url: `/uploads/${filename}`,
      });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return jsonError(
        "BLOB_READ_WRITE_TOKEN is not set. For local uploads use multipart /api/upload.",
        503
      );
    }

    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
          "image/heic",
          "image/heif",
        ],
        maximumSizeInBytes: 8 * 1024 * 1024,
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {
        // no-op; destination save happens separately
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return handleApiError(error);
  }
}

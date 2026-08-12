export async function compressImage(
  file: File,
  maxWidth = 1600,
  quality = 0.82
): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxWidth / Math.max(bitmap.width, bitmap.height));
    if (scale >= 1 && file.size < 400_000) {
      bitmap.close();
      return file;
    }

    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (!blob) return file;

    const name = file.name.replace(/\.\w+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export async function uploadImage(file: File): Promise<string> {
  const compressed = await compressImage(file);

  if (process.env.NEXT_PUBLIC_USE_BLOB === "true") {
    const { upload } = await import("@vercel/blob/client");
    const result = await upload(compressed.name, compressed, {
      access: "public",
      handleUploadUrl: "/api/upload",
    });
    return result.url;
  }

  // Local multipart fallback (no Blob token)
  const form = new FormData();
  form.append("file", compressed);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Upload failed");
  }
  const data = (await res.json()) as { url: string };
  return data.url;
}

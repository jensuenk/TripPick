import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Local uploads and arbitrary scraped hosts need unoptimized next/image. */
export function shouldUnoptimizeImage(src: string): boolean {
  if (src.startsWith("/")) return true
  try {
    const host = new URL(src).hostname
    return !host.endsWith("blob.vercel-storage.com")
  } catch {
    return true
  }
}

/** Booking CDN can reject hotlinks with a foreign Referer. */
export function imageReferrerPolicy(
  src: string
): "no-referrer" | undefined {
  try {
    if (new URL(src).hostname.endsWith("bstatic.com")) return "no-referrer"
  } catch {
    // ignore
  }
  return undefined
}

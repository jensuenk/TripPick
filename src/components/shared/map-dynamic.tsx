"use client";

import dynamic from "next/dynamic";

export const MapPreviewDynamic = dynamic(
  () => import("./map-preview").then((m) => m.MapPreview),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 w-full animate-pulse rounded-xl bg-sky-100" />
    ),
  }
);

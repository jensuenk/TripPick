"use client";

import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const pinIcon = L.divIcon({
  className: "",
  html: `<div style="width:28px;height:28px;border-radius:9999px;background:#0ea5e9;border:3px solid white;box-shadow:0 4px 12px rgba(14,165,233,.45)"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

type Props = {
  lat: number;
  lng: number;
  className?: string;
  zoom?: number;
};

export function MapPreview({ lat, lng, className, zoom = 13 }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div
        className={`animate-pulse rounded-xl bg-sky-100 ${className ?? "h-48 w-full"}`}
      />
    );
  }

  return (
    <div className={`overflow-hidden rounded-xl ${className ?? "h-48 w-full"}`}>
      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        scrollWheelZoom={false}
        className="h-full w-full"
        style={{ zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={pinIcon} />
        <Recenter lat={lat} lng={lng} />
      </MapContainer>
    </div>
  );
}

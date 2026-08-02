"use client";

import { useEffect, useState } from "react";

// Floating card shown when a stop marker is clicked. Fetches place details
// (category/address from OSM, photo/summary from Wikipedia) via /api/place.
export default function StopDetailsCard({ payload, onClose }) {
  const { stop, color, dayTitle, number } = payload;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setData(null);
    fetch(`/api/place?lat=${stop.lat}&lng=${stop.lng}&name=${encodeURIComponent(stop.name || "")}`)
      .then((r) => r.json())
      .then((d) => active && (setData(d), setLoading(false)))
      .catch(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [stop.id, stop.lat, stop.lng, stop.name]);

  const gmaps = `https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.lng}`;
  const showName = stop.label && stop.name && stop.name !== stop.label;

  return (
    <div className="absolute bottom-4 left-4 z-20 w-80 max-w-[calc(100%-2rem)] overflow-hidden rounded-2xl border border-base-border bg-base-card shadow-2xl">
      <div className="relative">
        {loading ? (
          <div className="h-32 animate-pulse bg-base-surface" />
        ) : data?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.image}
            alt={stop.name || "Place"}
            referrerPolicy="no-referrer"
            className="h-32 w-full object-cover"
          />
        ) : null}
        <button
          onClick={onClose}
          className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2">
          <span
            className="grid h-6 w-6 place-items-center rounded-full text-xs font-bold text-base-bg"
            style={{ background: color }}
          >
            {number}
          </span>
          <span className="truncate text-xs text-slate-400">{dayTitle}</span>
        </div>

        <h3 className="mt-1.5 text-lg font-bold leading-tight">
          {stop.label || stop.name}
        </h3>
        {showName && <p className="text-sm text-slate-400">{stop.name}</p>}

        {loading ? (
          <p className="mt-2 text-xs text-slate-500">Loading place details…</p>
        ) : (
          <>
            {data?.category && (
              <span className="mt-2 inline-block rounded-full bg-base-surface px-2 py-0.5 text-xs capitalize text-slate-300">
                {data.category}
              </span>
            )}
            {data?.address && (
              <p className="mt-2 text-sm text-slate-300">{data.address}</p>
            )}
            {data?.summary && (
              <p className="mt-2 text-sm leading-snug text-slate-400 line-clamp-4">
                {data.summary}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <a
                href={gmaps}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-accent px-2.5 py-1 font-medium text-base-bg hover:bg-accent-soft"
              >
                Directions
              </a>
              {data?.wikipediaUrl && (
                <a
                  href={data.wikipediaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-base-border px-2.5 py-1 text-slate-300 hover:text-slate-100"
                >
                  Wikipedia
                </a>
              )}
            </div>

            <p className="mt-2 text-[10px] text-slate-600">
              {stop.lat.toFixed(5)}, {stop.lng.toFixed(5)}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

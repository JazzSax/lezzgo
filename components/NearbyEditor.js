"use client";

import { useState } from "react";
import PlaceSearch from "@/components/PlaceSearch";
import { CATEGORY_COLORS } from "@/lib/geo";

const CATEGORIES = ["daily", "nightlife", "transport", "food", "general"];

// Manage the categorized nearby places shown around the base.
export default function NearbyEditor({ nearby, canEdit, onAdd, onDelete }) {
  const [category, setCategory] = useState("daily");
  const [adding, setAdding] = useState(false);

  return (
    <div>
      {canEdit && (
        <div className="mb-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs capitalize transition ${
                  category === c
                    ? "bg-base-surface text-slate-100"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: CATEGORY_COLORS[c] }}
                />
                {c}
              </button>
            ))}
          </div>
          <PlaceSearch
            placeholder={`Add a ${category} place…`}
            onSelect={async (r) => {
              setAdding(true);
              await onAdd({ ...r, category });
              setAdding(false);
            }}
          />
          {adding && <p className="text-xs text-slate-500">Adding…</p>}
        </div>
      )}

      {nearby.length === 0 ? (
        <p className="text-xs text-slate-500">No nearby places yet.</p>
      ) : (
        <ul className="space-y-1">
          {nearby.map((n) => (
            <li
              key={n.id}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-base-surface"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: CATEGORY_COLORS[n.category] || CATEGORY_COLORS.general }}
              />
              <span className="min-w-0 flex-1 truncate text-slate-200">{n.name}</span>
              {canEdit && (
                <button
                  onClick={() => onDelete(n.id)}
                  className="text-slate-600 hover:text-red-400"
                  aria-label="Remove"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

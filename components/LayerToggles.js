"use client";

import { CATEGORY_COLORS } from "@/lib/geo";

const RING_MARKS = [5, 10, 15];

// Controls the walking-distance rings and which nearby categories show.
export default function LayerToggles({
  rings,
  onRingsChange,
  categories,
  visibleCategories,
  onToggleCategory,
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Walking rings
          </span>
          <label className="flex items-center gap-1.5 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={rings.show}
              onChange={(e) => onRingsChange({ ...rings, show: e.target.checked })}
              className="accent-sea"
            />
            Show
          </label>
        </div>
        <div className="flex gap-1.5">
          {RING_MARKS.map((m) => {
            const on = rings.minutes.includes(m);
            return (
              <button
                key={m}
                onClick={() => {
                  const minutes = on
                    ? rings.minutes.filter((x) => x !== m)
                    : [...rings.minutes, m].sort((a, b) => a - b);
                  onRingsChange({ ...rings, minutes });
                }}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                  on
                    ? "border-sea/50 bg-sea/15 text-sea"
                    : "border-base-border text-slate-500 hover:text-slate-300"
                }`}
              >
                {m} min
              </button>
            );
          })}
        </div>
      </div>

      {categories.length > 0 && (
        <div>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Nearby places
          </span>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => {
              const on = visibleCategories.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => onToggleCategory(cat)}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs capitalize transition ${
                    on
                      ? "border-base-border text-slate-200"
                      : "border-base-border text-slate-600"
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      background: on
                        ? CATEGORY_COLORS[cat] || CATEGORY_COLORS.general
                        : "#334155",
                    }}
                  />
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

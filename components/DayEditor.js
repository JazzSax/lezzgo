"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import PlaceSearch from "@/components/PlaceSearch";

// Day list + ordered stop editor for the selected day.
export default function DayEditor({
  days,
  colorByDayId = {},
  selectedDayId,
  canEdit,
  onSelectDay,
  onAddDay,
  onRenameDay,
  onDeleteDay,
  onAddStop,
  onUpdateStopLabel,
  onMoveStop,
  onDeleteStop,
}) {
  return (
    <div className="space-y-2">
      {days.map((day) => {
        const selected = day.id === selectedDayId;
        const stops = [...day.stops].sort((a, b) => a.position - b.position);
        return (
          <div
            key={day.id}
            className={`rounded-xl border ${
              selected ? "border-accent/50 bg-base-surface" : "border-base-border"
            }`}
          >
            <button
              onClick={() => onSelectDay(day.id)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
            >
              <span
                className="grid h-6 w-6 place-items-center rounded-md text-xs font-bold text-base-bg"
                style={{
                  background: colorByDayId[day.id] || "#ff7a45",
                  opacity: selected ? 1 : 0.7,
                }}
              >
                {day.day_number}
              </span>
              <span className="flex-1 truncate text-sm font-semibold text-slate-100">
                {day.title || `Day ${day.day_number}`}
              </span>
              <span className="text-xs text-slate-500">{stops.length} stop{stops.length === 1 ? "" : "s"}</span>
            </button>

            {selected && (
              <div className="border-t border-base-border px-3 py-3">
                {canEdit && (
                  <DayHeaderControls
                    day={day}
                    onRename={onRenameDay}
                    onDelete={onDeleteDay}
                  />
                )}

                {stops.length === 0 && (
                  <p className="mb-2 text-xs text-slate-500">
                    Start from your base, then add the first stop.
                  </p>
                )}

                <ol className="space-y-1.5">
                  {stops.map((s, i) => (
                    <StopRow
                      key={s.id}
                      stop={s}
                      index={i + 1}
                      isFirst={i === 0}
                      isLast={i === stops.length - 1}
                      canEdit={canEdit}
                      onUpdateLabel={onUpdateStopLabel}
                      onMove={(dir) => onMoveStop(day.id, s.id, dir)}
                      onDelete={() => onDeleteStop(s.id)}
                    />
                  ))}
                </ol>

                {canEdit && (
                  <div className="mt-3">
                    <PlaceSearch
                      placeholder="Add a stop…"
                      onSelect={(r) => onAddStop(day.id, r)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {canEdit && (
        <button
          onClick={onAddDay}
          className="w-full rounded-xl border border-dashed border-base-border py-2.5 text-sm font-medium text-slate-400 transition hover:border-accent/50 hover:text-accent"
        >
          + Add day
        </button>
      )}
    </div>
  );
}

function DayHeaderControls({ day, onRename, onDelete }) {
  const [title, setTitle] = useState(day.title || "");
  return (
    <div className="mb-3 flex items-center gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => title !== (day.title || "") && onRename(day.id, title)}
        placeholder={`Day ${day.day_number}`}
        className="flex-1 rounded-lg border border-base-border bg-base-card px-2.5 py-1.5 text-sm focus:border-accent/60 focus:outline-none"
      />
      <button
        onClick={() => {
          if (confirm(`Delete "${day.title || `Day ${day.day_number}`}" and its stops?`)) {
            onDelete(day.id);
          }
        }}
        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:text-red-400"
        title="Delete day"
      >
        <Trash2 className="h-4 w-4" />
        <span className="hidden sm:inline">Delete</span>
      </button>
    </div>
  );
}

function StopRow({ stop, index, isFirst, isLast, canEdit, onUpdateLabel, onMove, onDelete }) {
  const [label, setLabel] = useState(stop.label || "");

  return (
    <li className="flex items-center gap-2 rounded-lg bg-base-card px-2 py-1.5">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-base-bg">
        {index}
      </span>
      <div className="min-w-0 flex-1">
        {canEdit ? (
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => label !== (stop.label || "") && onUpdateLabel(stop.id, label)}
            placeholder={stop.name}
            className="w-full bg-transparent text-sm font-medium text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
        ) : (
          <p className="truncate text-sm font-medium text-slate-100">
            {stop.label || stop.name}
          </p>
        )}
        <p className="truncate text-xs text-slate-500">{stop.name}</p>
      </div>
      {canEdit && (
        <div className="flex shrink-0 items-center">
          <button
            onClick={() => onMove("up")}
            disabled={isFirst}
            className="px-1 text-slate-500 hover:text-slate-200 disabled:opacity-30"
            aria-label="Move up"
          >
            ↑
          </button>
          <button
            onClick={() => onMove("down")}
            disabled={isLast}
            className="px-1 text-slate-500 hover:text-slate-200 disabled:opacity-30"
            aria-label="Move down"
          >
            ↓
          </button>
          <button
            onClick={onDelete}
            className="px-1 text-slate-500 hover:text-red-400"
            aria-label="Delete stop"
          >
            ✕
          </button>
        </div>
      )}
    </li>
  );
}

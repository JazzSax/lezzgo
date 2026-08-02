"use client";

const SPEEDS = [1, 2, 4];

// Playback controls overlaid on the map. State is owned by PlanWorkspace.
export default function PlaybackBar({
  playing,
  scope,
  speed,
  follow,
  progress = 0,
  label,
  onPlayPause,
  onRestart,
  onScope,
  onSpeed,
  onToggleFollow,
  onSeek,
}) {
  function seekFromEvent(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const f = (e.clientX - rect.left) / rect.width;
    onSeek?.(Math.max(0, Math.min(1, f)));
  }

  function cycleSpeed() {
    const i = SPEEDS.indexOf(speed);
    onSpeed?.(SPEEDS[(i + 1) % SPEEDS.length]);
  }

  return (
    <div className="absolute bottom-4 left-1/2 z-20 w-[min(30rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-base-border bg-base-card/95 p-2.5 shadow-2xl backdrop-blur">
      <div className="flex items-center gap-2">
        <button
          onClick={onPlayPause}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-base-bg transition hover:bg-accent-soft"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button
          onClick={onRestart}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-300 transition hover:bg-base-surface hover:text-slate-100"
          aria-label="Restart"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>

        {/* Progress (click to seek) */}
        <div className="min-w-0 flex-1">
          <div
            onClick={seekFromEvent}
            className="group relative h-2 cursor-pointer rounded-full bg-base-surface"
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-accent"
              style={{ width: `${progress * 100}%` }}
            />
            <div
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
              style={{ left: `${progress * 100}%` }}
            />
          </div>
          <p className="mt-1 truncate text-[11px] text-slate-400">
            {playing || progress > 0
              ? label
                ? `Heading to ${label}`
                : "Ride"
              : "Ready to play"}
          </p>
        </div>

        {/* Speed */}
        <button
          onClick={cycleSpeed}
          className="shrink-0 rounded-lg border border-base-border px-2 py-1 text-xs font-semibold text-slate-200 transition hover:border-accent/50"
          title="Playback speed"
        >
          {speed}×
        </button>
      </div>

      {/* Second row: scope + follow */}
      <div className="mt-2 flex items-center gap-2">
        <div className="flex rounded-lg border border-base-border p-0.5">
          {[
            ["day", "This day"],
            ["trip", "Whole trip"],
          ].map(([val, text]) => (
            <button
              key={val}
              onClick={() => onScope?.(val)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                scope === val ? "bg-base-surface text-slate-100" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {text}
            </button>
          ))}
        </div>

        <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={follow}
            onChange={(e) => onToggleFollow?.(e.target.checked)}
            className="accent-accent"
          />
          Follow camera
        </label>
      </div>
    </div>
  );
}

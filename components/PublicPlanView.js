"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { dayColor } from "@/lib/geo";
import { formatDateRange } from "@/lib/format";
import DayEditor from "@/components/DayEditor";
import NearbyEditor from "@/components/NearbyEditor";
import LayerToggles from "@/components/LayerToggles";
import PlaybackBar from "@/components/PlaybackBar";
import StopDetailsCard from "@/components/StopDetailsCard";
import SignInButtons from "@/components/SignInButtons";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-base-surface text-slate-500">
      Loading map…
    </div>
  ),
});

const noop = () => {};

// Read-only, unauthenticated-friendly plan view (the public share page).
// Shows only non-personal data: map, itinerary, nearby places, playback.
export default function PublicPlanView({ plan, initialDays, initialNearby, signedIn }) {
  const base =
    plan.base_lat != null && plan.base_lng != null
      ? { lat: plan.base_lat, lng: plan.base_lng, name: plan.base_name }
      : null;

  const days = initialDays || [];
  const nearby = initialNearby || [];

  const [selectedDayId, setSelectedDayId] = useState(days[0]?.id || null);
  const [rings, setRings] = useState({ show: true, minutes: [5, 10, 15], speedKmh: 4 });
  const [selectedStop, setSelectedStop] = useState(null);
  const [panelTab, setPanelTab] = useState("days");

  // playback
  const [pb, setPb] = useState({ playing: false, scope: "day", speed: 1, follow: true });
  const [pbProgress, setPbProgress] = useState(0);
  const [pbLabel, setPbLabel] = useState(null);
  const [seek, setSeek] = useState({ nonce: 0, fraction: 0 });
  const seekTo = (fraction) => setSeek((s) => ({ nonce: s.nonce + 1, fraction }));
  const restartPlayback = () => {
    seekTo(0);
    setPb((p) => ({ ...p, playing: true }));
  };
  const setScope = (scope) => {
    setPb((p) => ({ ...p, scope, playing: false }));
    seekTo(0);
  };

  const sortedDays = useMemo(
    () => [...days].sort((a, b) => a.day_number - b.day_number),
    [days]
  );
  const colorByDayId = useMemo(() => {
    const m = {};
    sortedDays.forEach((d, i) => (m[d.id] = dayColor(i)));
    return m;
  }, [sortedDays]);
  const hasAnyStops = sortedDays.some((d) => d.stops.length > 0);

  const categories = useMemo(() => [...new Set(nearby.map((n) => n.category))], [nearby]);
  const [hiddenCategories, setHiddenCategories] = useState([]);
  const visibleCategories = categories.filter((c) => !hiddenCategories.includes(c));
  const visibleNearby = nearby.filter((n) => visibleCategories.includes(n.category));

  const range = formatDateRange(plan.start_date, plan.end_date);

  return (
    <div className="flex h-screen flex-col">
      {/* Public header */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-base-border px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lezzgo_logo.svg" alt="Lezzgo" className="h-8 w-8 rounded-lg" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold leading-tight">{plan.title}</h1>
            <p className="truncate text-xs text-slate-500">
              {plan.base_name ? plan.base_name : "Itinerary"}
              {range ? ` · ${range}` : ""}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden rounded-full bg-sea/15 px-2.5 py-1 text-xs font-semibold text-sea sm:inline">
            Public view
          </span>
          <Link
            href={signedIn ? "/dashboard" : "/"}
            className="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-base-bg transition hover:bg-accent-soft"
          >
            {signedIn ? "Your trips" : "Sign in"}
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-full max-w-sm shrink-0 flex-col border-r border-base-border">
          <div className="flex gap-1 border-b border-base-border px-3 py-2">
            {["days", "nearby"].map((t) => (
              <button
                key={t}
                onClick={() => setPanelTab(t)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  panelTab === t
                    ? "bg-base-surface text-slate-100"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {t === "days" ? "Itinerary" : "Nearby"}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3 scrollbar-thin">
            {panelTab === "days" ? (
              days.length === 0 ? (
                <p className="text-sm text-slate-500">No days in this itinerary yet.</p>
              ) : (
                <DayEditor
                  days={sortedDays}
                  colorByDayId={colorByDayId}
                  selectedDayId={selectedDayId}
                  canEdit={false}
                  onSelectDay={setSelectedDayId}
                  onAddDay={noop}
                  onRenameDay={noop}
                  onDeleteDay={noop}
                  onAddStop={noop}
                  onUpdateStopLabel={noop}
                  onMoveStop={noop}
                  onDeleteStop={noop}
                />
              )
            ) : (
              <NearbyEditor nearby={nearby} canEdit={false} onAdd={noop} onDelete={noop} />
            )}
          </div>

          {/* Sign-in CTA (only when logged out) */}
          {!signedIn && (
            <div className="shrink-0 border-t border-base-border p-3">
              <p className="mb-2 text-xs text-slate-400">
                Plan and share your own trips with Lezzgo — free.
              </p>
              <SignInButtons />
            </div>
          )}

          <div className="shrink-0 border-t border-base-border p-3">
            <LayerToggles
              rings={rings}
              onRingsChange={setRings}
              categories={categories}
              visibleCategories={visibleCategories}
              onToggleCategory={(c) =>
                setHiddenCategories((h) =>
                  h.includes(c) ? h.filter((x) => x !== c) : [...h, c]
                )
              }
            />
          </div>
        </aside>

        <main className="relative min-h-0 flex-1">
          {base ? (
            <>
              <MapView
                base={base}
                days={days}
                selectedDayId={selectedDayId}
                nearby={visibleNearby}
                rings={rings}
                colorByDayId={colorByDayId}
                onStopClick={setSelectedStop}
                playback={{
                  playing: pb.playing,
                  scope: pb.scope,
                  speed: pb.speed,
                  followCam: pb.follow,
                  seekNonce: seek.nonce,
                  seekFraction: seek.fraction,
                }}
                onPlaybackProgress={(f, label) => {
                  setPbProgress(f);
                  setPbLabel(label);
                }}
                onPlaybackEnd={() => setPb((p) => ({ ...p, playing: false }))}
              />
              {selectedStop && (
                <StopDetailsCard
                  payload={selectedStop}
                  onClose={() => setSelectedStop(null)}
                />
              )}
              {hasAnyStops && (
                <PlaybackBar
                  playing={pb.playing}
                  scope={pb.scope}
                  speed={pb.speed}
                  follow={pb.follow}
                  progress={pbProgress}
                  label={pbLabel}
                  onPlayPause={() => setPb((p) => ({ ...p, playing: !p.playing }))}
                  onRestart={restartPlayback}
                  onScope={setScope}
                  onSpeed={(s) => setPb((p) => ({ ...p, speed: s }))}
                  onToggleFollow={(v) => setPb((p) => ({ ...p, follow: v }))}
                  onSeek={seekTo}
                />
              )}
            </>
          ) : (
            <div className="grid h-full place-items-center text-slate-500">
              This itinerary has no base location set.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

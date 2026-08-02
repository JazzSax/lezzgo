"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { formatDateRange } from "@/lib/format";
import { dayColor } from "@/lib/geo";
import DayEditor from "@/components/DayEditor";
import NearbyEditor from "@/components/NearbyEditor";
import LayerToggles from "@/components/LayerToggles";
import ShareDialog from "@/components/ShareDialog";
import MemberAvatars from "@/components/MemberAvatars";
import StopDetailsCard from "@/components/StopDetailsCard";
import PlaybackBar from "@/components/PlaybackBar";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-base-surface text-slate-500">
      Loading map…
    </div>
  ),
});

export default function PlanWorkspace({
  plan,
  owner,
  initialDays,
  initialNearby,
  initialShares,
  canEdit,
  currentUserId,
}) {
  const supabase = useMemo(() => createClient(), []);
  const base =
    plan.base_lat != null && plan.base_lng != null
      ? { lat: plan.base_lat, lng: plan.base_lng, name: plan.base_name }
      : null;

  const [days, setDays] = useState(initialDays || []);
  const [nearby, setNearby] = useState(initialNearby || []);
  const [selectedDayId, setSelectedDayId] = useState(initialDays?.[0]?.id || null);
  const [rings, setRings] = useState({ show: true, minutes: [5, 10, 15], speedKmh: 4 });
  const [shareOpen, setShareOpen] = useState(false);
  const [panelTab, setPanelTab] = useState("days"); // days | nearby
  const [selectedStop, setSelectedStop] = useState(null);

  // ---- playback state ----
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
  const hasAnyStops = sortedDays.some((d) => d.stops.length > 0);
  const colorByDayId = useMemo(() => {
    const m = {};
    sortedDays.forEach((d, i) => {
      m[d.id] = dayColor(i);
    });
    return m;
  }, [sortedDays]);

  const categories = useMemo(
    () => [...new Set(nearby.map((n) => n.category))],
    [nearby]
  );
  const [hiddenCategories, setHiddenCategories] = useState([]);
  const visibleCategories = categories.filter((c) => !hiddenCategories.includes(c));
  const visibleNearby = nearby.filter((n) => visibleCategories.includes(n.category));

  function fail(error) {
    if (error) alert(error.message || "Something went wrong.");
  }

  // ---------- day mutations ----------
  async function addDay() {
    const nextNum = days.reduce((m, d) => Math.max(m, d.day_number), 0) + 1;
    const { data, error } = await supabase
      .from("days")
      .insert({ plan_id: plan.id, day_number: nextNum, title: `Day ${nextNum}` })
      .select("*")
      .single();
    if (error) return fail(error);
    const day = { ...data, stops: [] };
    setDays((d) => [...d, day]);
    setSelectedDayId(day.id);
  }

  async function renameDay(id, title) {
    setDays((d) => d.map((x) => (x.id === id ? { ...x, title } : x)));
    fail((await supabase.from("days").update({ title }).eq("id", id)).error);
  }

  async function deleteDay(id) {
    setDays((d) => {
      const remaining = d.filter((x) => x.id !== id);
      if (selectedDayId === id) setSelectedDayId(remaining[0]?.id || null);
      return remaining;
    });
    fail((await supabase.from("days").delete().eq("id", id)).error);
  }

  // ---------- stop mutations ----------
  async function addStop(dayId, place) {
    const day = days.find((d) => d.id === dayId);
    const position = day.stops.reduce((m, s) => Math.max(m, s.position), -1) + 1;
    const { data, error } = await supabase
      .from("stops")
      .insert({
        day_id: dayId,
        position,
        name: place.name,
        label: "",
        lat: place.lat,
        lng: place.lng,
      })
      .select("*")
      .single();
    if (error) return fail(error);
    setDays((d) =>
      d.map((x) => (x.id === dayId ? { ...x, stops: [...x.stops, data] } : x))
    );
  }

  async function updateStopLabel(stopId, label) {
    setDays((d) =>
      d.map((x) => ({
        ...x,
        stops: x.stops.map((s) => (s.id === stopId ? { ...s, label } : s)),
      }))
    );
    fail((await supabase.from("stops").update({ label }).eq("id", stopId)).error);
  }

  async function deleteStop(stopId) {
    setDays((d) =>
      d.map((x) => ({ ...x, stops: x.stops.filter((s) => s.id !== stopId) }))
    );
    fail((await supabase.from("stops").delete().eq("id", stopId)).error);
  }

  async function moveStop(dayId, stopId, dir) {
    const day = days.find((d) => d.id === dayId);
    const sorted = [...day.stops].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex((s) => s.id === stopId);
    const swapWith = dir === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= sorted.length) return;

    const a = sorted[idx];
    const b = sorted[swapWith];
    const posA = a.position;
    const posB = b.position;

    setDays((d) =>
      d.map((x) =>
        x.id === dayId
          ? {
              ...x,
              stops: x.stops.map((s) =>
                s.id === a.id ? { ...s, position: posB } : s.id === b.id ? { ...s, position: posA } : s
              ),
            }
          : x
      )
    );
    const [r1, r2] = await Promise.all([
      supabase.from("stops").update({ position: posB }).eq("id", a.id),
      supabase.from("stops").update({ position: posA }).eq("id", b.id),
    ]);
    fail(r1.error || r2.error);
  }

  // ---------- nearby mutations ----------
  async function addNearby(place) {
    const { data, error } = await supabase
      .from("nearby_places")
      .insert({
        plan_id: plan.id,
        category: place.category || "general",
        name: place.name,
        lat: place.lat,
        lng: place.lng,
      })
      .select("*")
      .single();
    if (error) return fail(error);
    setNearby((n) => [...n, data]);
  }

  async function deleteNearby(id) {
    setNearby((n) => n.filter((x) => x.id !== id));
    fail((await supabase.from("nearby_places").delete().eq("id", id)).error);
  }

  const range = formatDateRange(plan.start_date, plan.end_date);
  const accepted = (initialShares || []).filter((s) => s.status === "accepted");

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-base-border px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/dashboard" className="shrink-0 text-sm text-slate-400 hover:text-slate-100">
            ←
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold leading-tight">{plan.title}</h1>
            <p className="truncate text-xs text-slate-500">
              {plan.base_name ? `Base: ${plan.base_name}` : "No base set"}
              {range ? ` · ${range}` : ""}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <MemberAvatars owner={owner} members={initialShares || []} />
          {canEdit ? (
            <button
              onClick={() => setShareOpen(true)}
              className="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-base-bg transition hover:bg-accent-soft"
            >
              Share
            </button>
          ) : (
            <span className="rounded-full bg-sea/15 px-2.5 py-1 text-xs font-semibold text-sea">
              View only
            </span>
          )}
        </div>
      </header>

      {/* Body: panel + map */}
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-full max-w-sm shrink-0 flex-col border-r border-base-border">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-base-border px-3 py-2">
            {["days", "nearby"].map((t) => (
              <button
                key={t}
                onClick={() => setPanelTab(t)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition ${
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
              days.length === 0 && !canEdit ? (
                <p className="text-sm text-slate-500">No days yet.</p>
              ) : (
                <DayEditor
                  days={sortedDays}
                  colorByDayId={colorByDayId}
                  selectedDayId={selectedDayId}
                  canEdit={canEdit}
                  onSelectDay={setSelectedDayId}
                  onAddDay={addDay}
                  onRenameDay={renameDay}
                  onDeleteDay={deleteDay}
                  onAddStop={addStop}
                  onUpdateStopLabel={updateStopLabel}
                  onMoveStop={moveStop}
                  onDeleteStop={deleteStop}
                />
              )
            ) : (
              <NearbyEditor
                nearby={nearby}
                canEdit={canEdit}
                onAdd={addNearby}
                onDelete={deleteNearby}
              />
            )}
          </div>

          {/* Layers footer */}
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
              This plan has no base location set.
            </div>
          )}
        </main>
      </div>

      {shareOpen && (
        <ShareDialog
          plan={plan}
          currentUserId={currentUserId}
          initialShares={initialShares || []}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}

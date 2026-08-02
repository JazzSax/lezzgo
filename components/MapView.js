"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  ringsFeatureCollection,
  routeCoords,
  boundsFor,
  categoryColor,
  pathSegments,
  pointAtDistance,
} from "@/lib/geo";

const STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
  "https://tiles.openfreemap.org/styles/liberty";

const EMPTY_FC = { type: "FeatureCollection", features: [] };
const DEFAULT_COLOR = "#ff7a45";

export default function MapView({
  base,
  days = [],
  selectedDayId,
  nearby = [],
  rings = { minutes: [5, 10, 15], speedKmh: 4, show: true },
  colorByDayId = {},
  onStopClick,
  playback = null,
  onPlaybackProgress,
  onPlaybackEnd,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const baseMarkerRef = useRef(null);
  const stopMarkersRef = useRef([]);
  const vehicleMarkerRef = useRef(null);
  const progressRef = useRef(0);
  const onStopClickRef = useRef(onStopClick);
  onStopClickRef.current = onStopClick;
  const onProgressRef = useRef(onPlaybackProgress);
  onProgressRef.current = onPlaybackProgress;
  const onEndRef = useRef(onPlaybackEnd);
  onEndRef.current = onPlaybackEnd;
  const [ready, setReady] = useState(false);

  // Ordered waypoints for playback: base first, then stops (selected day or
  // the whole trip in day order). Each entry has a label + cumulative distance.
  const scope = playback?.scope || "day";
  const playPoints = useMemo(() => {
    const pts = [];
    if (base && base.lat != null && base.lng != null) {
      pts.push({ lng: base.lng, lat: base.lat, label: base.name || "Base" });
    }
    const pushDay = (d) =>
      [...d.stops]
        .sort((a, b) => a.position - b.position)
        .forEach((s) => pts.push({ lng: s.lng, lat: s.lat, label: s.label || s.name }));
    if (scope === "trip") {
      [...days].sort((a, b) => a.day_number - b.day_number).forEach(pushDay);
    } else {
      const d = days.find((x) => x.id === selectedDayId);
      if (d) pushDay(d);
    }
    return pts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, selectedDayId, base?.lat, base?.lng, days]);

  const playPath = useMemo(
    () => pathSegments(playPoints.map((p) => [p.lng, p.lat])),
    [playPoints]
  );
  const pathRef = useRef(playPath);
  pathRef.current = playPath;
  const pointsRef = useRef(playPoints);
  pointsRef.current = playPoints;

  // Stable key so the routes/markers effect only re-runs on real changes.
  const dataKey =
    JSON.stringify(
      days.map((d) => ({
        id: d.id,
        sel: d.id === selectedDayId,
        color: colorByDayId[d.id],
        title: d.title,
        num: d.day_number,
        stops: [...d.stops]
          .sort((a, b) => a.position - b.position)
          .map((s) => [s.id, s.lat, s.lng, s.label, s.name]),
      }))
    ) + (base ? `|${base.lat},${base.lng}` : "|");

  // ---- init map once ----
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: base ? [base.lng, base.lat] : [0, 20],
      zoom: base ? 13 : 1.5,
      attributionControl: true,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("rings", { type: "geojson", data: EMPTY_FC });
      map.addSource("routes", { type: "geojson", data: EMPTY_FC });
      map.addSource("nearby", { type: "geojson", data: EMPTY_FC });

      // Walking rings (dashed)
      map.addLayer({
        id: "rings-line",
        type: "line",
        source: "rings",
        paint: {
          "line-color": "#2dd4bf",
          "line-width": 1.5,
          "line-opacity": 0.5,
          "line-dasharray": [2, 2],
        },
      });

      // One line per day, colored; selected day emphasized.
      map.addLayer({
        id: "routes-line",
        type: "line",
        source: "routes",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["case", ["boolean", ["get", "selected"], false], 4, 2.5],
          "line-opacity": ["case", ["boolean", ["get", "selected"], false], 0.95, 0.35],
        },
      });

      // Nearby categorized places
      map.addLayer({
        id: "nearby-dot",
        type: "circle",
        source: "nearby",
        paint: {
          "circle-radius": 6,
          "circle-color": ["get", "color"],
          "circle-stroke-color": "#0b1220",
          "circle-stroke-width": 2,
        },
      });
      map.addLayer({
        id: "nearby-label",
        type: "symbol",
        source: "nearby",
        layout: {
          "text-field": ["get", "name"],
          "text-size": 11,
          "text-offset": [0, 1.1],
          "text-anchor": "top",
          "text-optional": true,
        },
        paint: {
          "text-color": "#cbd5e1",
          "text-halo-color": "#0b1220",
          "text-halo-width": 1.5,
        },
      });

      const popup = new maplibregl.Popup({ closeButton: false, offset: 14 });
      map.on("mouseenter", "nearby-dot", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "nearby-dot", () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });
      map.on("click", "nearby-dot", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties || {};
        popup
          .setLngLat(f.geometry.coordinates)
          .setHTML(
            `<strong>${escapeHtml(p.name || "Place")}</strong><br/><span style="opacity:.7;text-transform:capitalize">${escapeHtml(p.category || "")}</span>`
          )
          .addTo(map);
      });

      setReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- base marker + rings ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    if (base && base.lat != null && base.lng != null) {
      if (!baseMarkerRef.current) {
        const el = document.createElement("div");
        el.innerHTML = `<div style="display:grid;place-items:center;width:34px;height:34px;border-radius:50% 50% 50% 0;background:#ff7a45;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,.4)"><span style="transform:rotate(45deg);font-size:16px">🏠</span></div>`;
        baseMarkerRef.current = new maplibregl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([base.lng, base.lat])
          .addTo(map);
      } else {
        baseMarkerRef.current.setLngLat([base.lng, base.lat]);
      }
    }

    const ringsData =
      rings.show && base
        ? ringsFeatureCollection({ lat: base.lat, lng: base.lng }, rings.minutes, rings.speedKmh)
        : EMPTY_FC;
    map.getSource("rings")?.setData(ringsData);
  }, [ready, base, rings.show, rings.minutes, rings.speedKmh]);

  // ---- nearby ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.getSource("nearby")?.setData({
      type: "FeatureCollection",
      features: nearby.map((n) => ({
        type: "Feature",
        properties: { name: n.name, category: n.category, color: categoryColor(n.category) },
        geometry: { type: "Point", coordinates: [n.lng, n.lat] },
      })),
    });
  }, [ready, nearby]);

  // ---- all-day routes + numbered stop markers ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    // Route lines (one feature per day)
    const features = [];
    for (const d of days) {
      const stops = [...d.stops].sort((a, b) => a.position - b.position);
      const coords = routeCoords(base, stops);
      if (coords.length >= 2) {
        features.push({
          type: "Feature",
          properties: {
            color: colorByDayId[d.id] || DEFAULT_COLOR,
            selected: d.id === selectedDayId,
          },
          geometry: { type: "LineString", coordinates: coords },
        });
      }
    }
    map.getSource("routes")?.setData({ type: "FeatureCollection", features });

    // Rebuild stop markers (numbered pins, colored per day)
    stopMarkersRef.current.forEach((m) => m.remove());
    stopMarkersRef.current = [];

    for (const d of days) {
      const color = colorByDayId[d.id] || DEFAULT_COLOR;
      const emphasized = d.id === selectedDayId;
      const stops = [...d.stops].sort((a, b) => a.position - b.position);
      stops.forEach((s, i) => {
        const el = makeStopEl(i + 1, color, emphasized);
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          onStopClickRef.current?.({
            stop: s,
            color,
            dayTitle: d.title || `Day ${d.day_number}`,
            number: i + 1,
          });
        });
        const marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([s.lng, s.lat])
          .addTo(map);
        stopMarkersRef.current.push(marker);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, dataKey]);

  // ---- fit to selected day when the selection changes ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const day = days.find((d) => d.id === selectedDayId);
    const stops = day ? [...day.stops].sort((a, b) => a.position - b.position) : [];
    const pts = [base, ...stops].filter(Boolean);
    const b = boundsFor(pts);
    if (b && pts.length > 1) {
      map.fitBounds(b, { padding: 90, maxZoom: 15, duration: 500 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, selectedDayId]);

  // ---- playback: seek (jump to a fraction) ----
  useEffect(() => {
    if (!ready) return;
    const frac = Math.max(0, Math.min(1, playback?.seekFraction ?? 0));
    progressRef.current = frac;
    positionVehicle(frac, playback?.playing);
    onProgressRef.current?.(frac, labelAt(frac));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, playback?.seekNonce]);

  // ---- playback: run the ride while playing ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    if (!playback?.playing) {
      positionVehicle(progressRef.current, false);
      return;
    }

    const length = pathRef.current.length;
    if (!length) {
      onEndRef.current?.();
      return;
    }

    const BASE_DURATION = 16; // seconds to traverse the whole path at 1x
    const effDur = Math.max(2, BASE_DURATION / (playback.speed || 1));
    let f0 = progressRef.current;
    if (f0 >= 1) f0 = 0; // at the end → restart from the beginning
    const t0 = performance.now();
    let raf;
    let lastReport = 0;

    const tick = (now) => {
      let f = f0 + (now - t0) / 1000 / effDur;
      if (f >= 1) f = 1;
      progressRef.current = f;
      positionVehicle(f, true); // every frame → smooth motion
      // Throttle React state updates (progress bar/label) to ~12fps.
      if (now - lastReport > 80 || f >= 1) {
        lastReport = now;
        onProgressRef.current?.(f, labelAt(f));
      }
      if (f < 1) raf = requestAnimationFrame(tick);
      else onEndRef.current?.();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, playback?.playing, playback?.speed, playback?.scope, playback?.followCam, playback?.seekNonce]);

  function positionVehicle(frac, playing) {
    const map = mapRef.current;
    const path = pathRef.current;
    if (!map || !path.length || (!playing && frac <= 0)) {
      removeVehicle();
      return;
    }
    const pt = pointAtDistance(path, frac * path.length);
    if (!pt) return;
    if (!vehicleMarkerRef.current) {
      vehicleMarkerRef.current = new maplibregl.Marker({
        element: makeVehicleEl(),
        anchor: "center",
      })
        .setLngLat([pt.lng, pt.lat])
        .addTo(map);
    } else {
      vehicleMarkerRef.current.setLngLat([pt.lng, pt.lat]);
    }
    if (playback?.followCam) map.setCenter([pt.lng, pt.lat]);
  }

  function removeVehicle() {
    if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.remove();
      vehicleMarkerRef.current = null;
    }
  }

  function labelAt(frac) {
    const pts = pointsRef.current;
    const path = pathRef.current;
    if (pts.length < 2 || !path.length) return null;
    const dist = frac * path.length;
    for (let i = 1; i < pts.length; i++) {
      if (dist < path.segments[i - 1].end - 1) return pts[i].label;
    }
    return pts[pts.length - 1].label;
  }

  return <div ref={containerRef} className="h-full w-full" />;
}

function makeVehicleEl() {
  const wrap = document.createElement("div");
  const pin = document.createElement("div");
  pin.style.cssText = `
    width:30px;height:30px;border-radius:50%;
    background:#0b1220;border:2px solid #ff7a45;
    display:grid;place-items:center;font-size:16px;line-height:1;
    box-shadow:0 2px 10px rgba(0,0,0,.6);`;
  pin.textContent = "🚗";
  wrap.appendChild(pin);
  return wrap;
}

function makeStopEl(number, color, emphasized) {
  // Outer element: MapLibre writes its positioning transform here — we must
  // NOT touch its `transform`, or the marker jumps out of place.
  const wrap = document.createElement("div");
  wrap.style.cursor = "pointer";

  // Inner element carries the visual + hover scale (its own transform).
  const size = emphasized ? 28 : 22;
  const pin = document.createElement("div");
  pin.style.cssText = `
    width:${size}px;height:${size}px;border-radius:50%;
    background:${color};color:#0b1220;font-weight:800;
    font-size:${emphasized ? 13 : 11}px;display:grid;place-items:center;
    border:2px solid #0b1220;box-shadow:0 2px 6px rgba(0,0,0,.5);
    opacity:${emphasized ? 1 : 0.78};transition:transform .1s ease;`;
  pin.textContent = number;
  wrap.appendChild(pin);

  wrap.addEventListener("mouseenter", () => (pin.style.transform = "scale(1.18)"));
  wrap.addEventListener("mouseleave", () => (pin.style.transform = "scale(1)"));
  return wrap;
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}

// Small geo helpers (no external dependency).

const EARTH_R = 6378137; // meters

// Walking distance in meters for a given number of minutes at speedKmh.
export function metersForMinutes(minutes, speedKmh = 4) {
  return (speedKmh * 1000 * minutes) / 60;
}

// Approximate circle polygon around [lng, lat] with the given radius (meters).
// Returns a GeoJSON Polygon coordinate ring.
export function circleRing(lng, lat, radiusMeters, steps = 64) {
  const coords = [];
  const latRad = (lat * Math.PI) / 180;
  const dLat = (radiusMeters / EARTH_R) * (180 / Math.PI);
  const dLng = ((radiusMeters / EARTH_R) * (180 / Math.PI)) / Math.cos(latRad);
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    coords.push([lng + dLng * Math.cos(theta), lat + dLat * Math.sin(theta)]);
  }
  return coords;
}

// FeatureCollection of ring circles for the given minute marks.
export function ringsFeatureCollection(center, minutes, speedKmh = 4) {
  if (!center) return { type: "FeatureCollection", features: [] };
  return {
    type: "FeatureCollection",
    features: minutes.map((m) => ({
      type: "Feature",
      properties: { minutes: m },
      geometry: {
        type: "Polygon",
        coordinates: [circleRing(center.lng, center.lat, metersForMinutes(m, speedKmh))],
      },
    })),
  };
}

// Haversine distance in meters between two {lat,lng} points.
export function distanceMeters(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(h));
}

// Initial bearing (degrees, 0=N) from point a to b, each [lng, lat].
export function bearing(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const dLng = toRad(b[0] - a[0]);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Build cumulative-distance segments from [[lng,lat], ...] for interpolation.
export function pathSegments(coords) {
  const segments = [];
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];
    const len = distanceMeters(
      { lng: a[0], lat: a[1] },
      { lng: b[0], lat: b[1] }
    );
    segments.push({ a, b, start: total, end: total + len, length: len });
    total += len;
  }
  return { segments, length: total };
}

// Position { lng, lat, bearing } at a distance (meters) along a built path.
export function pointAtDistance(path, dist) {
  const { segments, length } = path;
  if (!segments.length) return null;
  const d = Math.max(0, Math.min(dist, length));
  for (const s of segments) {
    if (d <= s.end || s === segments[segments.length - 1]) {
      const t = s.length > 0 ? (d - s.start) / s.length : 0;
      return {
        lng: s.a[0] + (s.b[0] - s.a[0]) * t,
        lat: s.a[1] + (s.b[1] - s.a[1]) * t,
        bearing: bearing(s.a, s.b),
      };
    }
  }
  const last = segments[segments.length - 1];
  return { lng: last.b[0], lat: last.b[1], bearing: bearing(last.a, last.b) };
}

// Ordered [ {lat,lng}, ... ] for a day: base first (if provided), then stops.
export function routeCoords(base, stops) {
  const pts = [];
  if (base && base.lat != null && base.lng != null) pts.push([base.lng, base.lat]);
  for (const s of stops) pts.push([s.lng, s.lat]);
  return pts;
}

// Fit-bounds array [[minLng,minLat],[maxLng,maxLat]] for a set of {lat,lng}.
export function boundsFor(points) {
  const valid = points.filter((p) => p && p.lat != null && p.lng != null);
  if (valid.length === 0) return null;
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;
  for (const p of valid) {
    minLng = Math.min(minLng, p.lng);
    minLat = Math.min(minLat, p.lat);
    maxLng = Math.max(maxLng, p.lng);
    maxLat = Math.max(maxLat, p.lat);
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

// Distinct colors for nearby-place categories.
export const CATEGORY_COLORS = {
  daily: "#2dd4bf",
  nightlife: "#c084fc",
  transport: "#60a5fa",
  food: "#f59e0b",
  general: "#94a3b8",
};

export function categoryColor(cat) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS.general;
}

// Distinct colors assigned to each day (by order) for routes + markers.
export const DAY_COLORS = [
  "#ff7a45", // orange
  "#2dd4bf", // teal
  "#c084fc", // purple
  "#60a5fa", // blue
  "#f59e0b", // amber
  "#f472b6", // pink
  "#4ade80", // green
  "#22d3ee", // cyan
  "#fb7185", // rose
  "#a3e635", // lime
];

export function dayColor(index) {
  return DAY_COLORS[((index % DAY_COLORS.length) + DAY_COLORS.length) % DAY_COLORS.length];
}

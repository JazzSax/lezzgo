import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PHOTON_BASE = process.env.PHOTON_BASE_URL || "https://photon.komoot.io";

// Build a readable label from a Photon feature's properties.
function labelFor(p) {
  const primary = p.name || p.street || p.city || "Unnamed place";
  const bits = [p.city, p.state, p.country].filter(Boolean);
  // Avoid repeating the primary name in the context line.
  const context = bits.filter((b) => b !== primary).join(", ");
  return context ? `${primary} — ${context}` : primary;
}

// GET /api/geocode?q=... -> [{ id, name, label, lat, lng }]
// Proxied server-side so we can add caching / swap providers without touching
// the client, and so Photon usage is centrally controlled.
export async function GET(request) {
  // Require an authenticated session (prevents the endpoint being used as an
  // open geocoding proxy).
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const q = (new URL(request.url).searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const url = `${PHOTON_BASE}/api/?q=${encodeURIComponent(q)}&limit=6&lang=en`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Lezzgo/0.1 (travel planner)" },
      // Cache identical queries briefly at the edge/runtime.
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return NextResponse.json({ results: [] }, { status: 200 });
    }
    const data = await res.json();
    const results = (data.features || [])
      .filter((f) => f.geometry?.coordinates?.length === 2)
      .map((f, i) => {
        const [lng, lat] = f.geometry.coordinates;
        return {
          id: `${f.properties?.osm_type || "p"}${f.properties?.osm_id || i}`,
          name: f.properties?.name || f.properties?.street || labelFor(f.properties),
          label: labelFor(f.properties),
          lat,
          lng,
        };
      });
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] }, { status: 200 });
  }
}

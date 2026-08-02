import { NextResponse } from "next/server";

const PHOTON = process.env.PHOTON_BASE_URL || "https://photon.komoot.io";
const UA = "Lezzgo/0.1 (travel planner; https://github.com)";

// GET /api/place?lat=&lng=&name=
// Combines OSM (category + address, via Photon reverse) with Wikipedia
// (photo + summary, via geosearch). Both are free, keyless, and NON-personal,
// so this endpoint is open (used on the public plan page too).
export async function GET(request) {
  const sp = new URL(request.url).searchParams;
  const lat = parseFloat(sp.get("lat"));
  const lng = parseFloat(sp.get("lng"));
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: "bad coords" }, { status: 400 });
  }

  const out = {
    category: null,
    address: null,
    image: null,
    summary: null,
    title: null,
    wikipediaUrl: null,
  };

  // OSM (category + address) via Photon reverse geocoding.
  try {
    const r = await fetch(
      `${PHOTON}/reverse?lat=${lat}&lon=${lng}&limit=1&lang=en`,
      { headers: { "User-Agent": UA }, next: { revalidate: 3600 } }
    );
    if (r.ok) {
      const d = await r.json();
      const p = d.features?.[0]?.properties;
      if (p) {
        out.category =
          [p.osm_key, p.osm_value].filter(Boolean).join(" · ") || null;
        const street =
          p.housenumber && p.street
            ? `${p.housenumber} ${p.street}`
            : p.street;
        out.address =
          [street, p.city, p.state, p.postcode, p.country]
            .filter(Boolean)
            .join(", ") || null;
      }
    }
  } catch {
    /* ignore */
  }

  // Wikipedia (photo + summary) via geosearch near the coordinates.
  try {
    const w =
      `https://en.wikipedia.org/w/api.php?action=query&format=json` +
      `&prop=pageimages|extracts|info&inprop=url&piprop=thumbnail&pithumbsize=600` +
      `&exintro=1&explaintext=1&generator=geosearch` +
      `&ggscoord=${lat}%7C${lng}&ggsradius=800&ggslimit=1`;
    const r = await fetch(w, {
      headers: { "User-Agent": UA },
      next: { revalidate: 86400 },
    });
    if (r.ok) {
      const d = await r.json();
      const pages = d.query?.pages;
      if (pages) {
        const page = Object.values(pages)[0];
        if (page) {
          out.image = page.thumbnail?.source || null;
          out.summary = page.extract ? page.extract.slice(0, 500) : null;
          out.title = page.title || null;
          out.wikipediaUrl = page.fullurl || null;
        }
      }
    }
  } catch {
    /* ignore */
  }

  return NextResponse.json(out);
}

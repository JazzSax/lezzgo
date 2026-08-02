function initials(name, email) {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

const SIZES = { sm: "h-7 w-7 text-[10px]", md: "h-9 w-9 text-xs", lg: "h-12 w-12 text-sm" };

// Renders an OAuth avatar image, falling back to initials.
export default function Avatar({ profile, size = "md", ring = false, title }) {
  const cls = SIZES[size] || SIZES.md;
  const label = title || profile?.display_name || profile?.email || "User";
  const ringCls = ring ? "ring-2 ring-base-bg" : "";

  if (profile?.avatar_url) {
    // Plain <img> (avoids next/image host config friction for arbitrary CDNs).
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={profile.avatar_url}
        alt={label}
        title={label}
        referrerPolicy="no-referrer"
        className={`${cls} ${ringCls} shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <span
      title={label}
      className={`${cls} ${ringCls} grid shrink-0 place-items-center rounded-full bg-sea/20 font-semibold text-sea`}
    >
      {initials(profile?.display_name, profile?.email)}
    </span>
  );
}

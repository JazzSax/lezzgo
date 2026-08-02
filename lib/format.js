// Format a start/end date range like "15–22 Oct 2026" or "15 Oct 2026".
export function formatDateRange(start, end) {
  if (!start && !end) return null;
  const opts = { day: "numeric", month: "short", year: "numeric" };
  const s = start ? new Date(start + "T00:00:00") : null;
  const e = end ? new Date(end + "T00:00:00") : null;

  if (s && e) {
    const sameMonth =
      s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
    if (sameMonth) {
      return `${s.getDate()}–${e.toLocaleDateString("en-GB", opts)}`;
    }
    return `${s.toLocaleDateString("en-GB", opts)} – ${e.toLocaleDateString(
      "en-GB",
      opts
    )}`;
  }
  return (s || e).toLocaleDateString("en-GB", opts);
}

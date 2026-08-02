"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import { formatDateRange } from "@/lib/format";

// An incoming, pending share. The user can accept or decline it.
export default function InviteCard({ invite }) {
  const router = useRouter();
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  async function respond(status) {
    setError(null);
    setBusy(status);
    const supabase = createClient();
    const { error } = await supabase
      .from("plan_shares")
      .update({ status })
      .eq("id", invite.share_id);
    if (error) {
      setError(error.message);
      setBusy(null);
      return;
    }
    if (status === "accepted") {
      router.push(`/plans/${invite.plan_id}`);
    } else {
      router.refresh();
    }
  }

  const range = formatDateRange(invite.start_date, invite.end_date);
  const owner = { display_name: invite.owner_name, avatar_url: invite.owner_avatar };

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-accent/30 bg-accent/5 p-4">
      <div className="flex items-center gap-3">
        <Avatar profile={owner} size="lg" />
        <div>
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-slate-100">
              {invite.owner_name || "Someone"}
            </span>{" "}
            invited you to
          </p>
          <p className="text-base font-bold text-slate-100">{invite.plan_title}</p>
          {range && <p className="text-xs text-slate-500">{range}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={() => respond("declined")}
          disabled={busy !== null}
          className="rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:text-slate-100 disabled:opacity-50"
        >
          Decline
        </button>
        <button
          onClick={() => respond("accepted")}
          disabled={busy !== null}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-base-bg transition hover:bg-accent-soft disabled:opacity-50"
        >
          {busy === "accepted" ? "Joining…" : "Accept"}
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

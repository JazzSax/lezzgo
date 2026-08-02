"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";

// Owner-only dialog to invite users (view-only) by email and manage shares.
export default function ShareDialog({ plan, currentUserId, initialShares, onClose }) {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [shares, setShares] = useState(initialShares || []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [isPublic, setIsPublic] = useState(!!plan.is_public);
  const [pubBusy, setPubBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const publicUrl =
    (typeof window !== "undefined" ? window.location.origin : "") + `/p/${plan.id}`;

  async function togglePublic(next) {
    setPubBusy(true);
    const { error } = await supabase
      .from("plans")
      .update({ is_public: next })
      .eq("id", plan.id);
    setPubBusy(false);
    if (error) setMsg({ type: "error", text: error.message });
    else setIsPublic(next);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function invite(e) {
    e.preventDefault();
    setMsg(null);
    const target = email.trim().toLowerCase();
    if (!target) return;
    setBusy(true);

    // Find the invitee's profile by email (they must have signed in once).
    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, email")
      .eq("email", target)
      .maybeSingle();

    if (profErr) {
      setMsg({ type: "error", text: profErr.message });
      setBusy(false);
      return;
    }
    if (!prof) {
      setMsg({
        type: "error",
        text: "No Lezzgo user with that email yet. They need to sign in once first.",
      });
      setBusy(false);
      return;
    }
    if (prof.id === currentUserId) {
      setMsg({ type: "error", text: "You can't invite yourself." });
      setBusy(false);
      return;
    }

    const { data: inserted, error: insErr } = await supabase
      .from("plan_shares")
      .insert({
        plan_id: plan.id,
        shared_with: prof.id,
        invited_by: currentUserId,
        role: "viewer",
        status: "pending",
      })
      .select("id, status, profile:profiles!plan_shares_shared_with_fkey ( id, display_name, avatar_url, email )")
      .single();

    if (insErr) {
      const dup = insErr.code === "23505";
      setMsg({
        type: "error",
        text: dup ? "That person is already invited." : insErr.message,
      });
      setBusy(false);
      return;
    }

    setShares((s) => [...s, inserted]);
    setEmail("");
    setMsg({ type: "ok", text: `Invited ${prof.display_name || target}.` });
    setBusy(false);
  }

  async function remove(shareId) {
    setShares((s) => s.filter((x) => x.id !== shareId));
    await supabase.from("plan_shares").delete().eq("id", shareId);
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-base-border bg-base-card p-4 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Share “{plan.title}”</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200">
            ✕
          </button>
        </div>
        {/* Public link */}
        <div className="mt-4 rounded-xl border border-base-border p-3">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => togglePublic(e.target.checked)}
              disabled={pubBusy}
              className="mt-0.5 accent-accent"
            />
            <span>
              <span className="block text-sm font-medium text-slate-100">
                Anyone with the link can view
              </span>
              <span className="block text-xs text-slate-400">
                Public map + itinerary, no sign-in needed — great for social media.
                Personal details and photo links stay private.
              </span>
            </span>
          </label>
          {isPublic && (
            <div className="mt-3 flex items-center gap-2">
              <input
                readOnly
                value={publicUrl}
                onFocus={(e) => e.target.select()}
                className="min-w-0 flex-1 truncate rounded-lg border border-base-border bg-base-surface px-2.5 py-1.5 text-xs text-slate-300"
              />
              <button
                onClick={copyLink}
                className="shrink-0 rounded-lg bg-base-surface px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          )}
        </div>

        <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Invite by email
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          Invited people sign in and get member access — everything you share with
          members, including private photo links (coming soon).
        </p>

        <form onSubmit={invite} className="mt-3 flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="their@email.com"
            className="min-w-0 flex-1 rounded-xl border border-base-border bg-base-surface px-3 py-2.5 text-sm focus:border-accent/60 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-base-bg transition hover:bg-accent-soft disabled:opacity-50"
          >
            Invite
          </button>
        </form>
        {msg && (
          <p className={`mt-2 text-sm ${msg.type === "error" ? "text-red-400" : "text-sea"}`}>
            {msg.text}
          </p>
        )}

        <div className="mt-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            People with access
          </h3>
          <ul className="space-y-1.5">
            {shares.length === 0 && (
              <li className="text-sm text-slate-500">No one invited yet.</li>
            )}
            {shares.map((sh) => (
              <li
                key={sh.id}
                className="flex items-center gap-3 rounded-lg px-1 py-1.5"
              >
                <Avatar profile={sh.profile} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-100">
                    {sh.profile?.display_name || sh.profile?.email}
                  </p>
                  <p className="text-xs capitalize text-slate-500">{sh.status}</p>
                </div>
                <button
                  onClick={() => remove(sh.id)}
                  className="text-xs text-slate-500 hover:text-red-400"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

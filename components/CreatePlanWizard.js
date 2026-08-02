"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PlaceSearch from "@/components/PlaceSearch";

const STEPS = ["Trip", "Base", "First day"];

export default function CreatePlanWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [base, setBase] = useState(null); // { name, label, lat, lng }
  const [dayTitle, setDayTitle] = useState("Day 1");

  const canNext =
    (step === 0 && title.trim().length > 0) ||
    (step === 1 && base) ||
    step === 2;

  async function createPlan() {
    setError(null);
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("You are not signed in.");
      setSaving(false);
      return;
    }

    const { data: plan, error: planErr } = await supabase
      .from("plans")
      .insert({
        owner_id: user.id,
        title: title.trim(),
        start_date: startDate || null,
        end_date: endDate || null,
        base_name: base?.name || null,
        base_lat: base?.lat ?? null,
        base_lng: base?.lng ?? null,
      })
      .select("id")
      .single();

    if (planErr) {
      setError(planErr.message);
      setSaving(false);
      return;
    }

    // Seed the first day.
    if (dayTitle.trim()) {
      await supabase.from("days").insert({
        plan_id: plan.id,
        day_number: 1,
        title: dayTitle.trim(),
      });
    }

    router.push(`/plans/${plan.id}`);
  }

  return (
    <div className="mx-auto max-w-lg">
      {/* Stepper */}
      <ol className="mb-8 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                i <= step
                  ? "bg-accent text-base-bg"
                  : "bg-base-card text-slate-500"
              }`}
            >
              {i + 1}
            </span>
            <span
              className={`text-xs font-medium ${
                i <= step ? "text-slate-100" : "text-slate-500"
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="mx-1 hidden h-px flex-1 bg-base-border sm:block" />
            )}
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-base-border bg-base-card p-6">
        {step === 0 && (
          <div className="space-y-4">
            <Field label="Trip name">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Osaka with the family"
                autoFocus
                className="w-full rounded-xl border border-base-border bg-base-surface px-3 py-2.5 text-sm focus:border-accent/60 focus:outline-none"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start date">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-base-border bg-base-surface px-3 py-2.5 text-sm focus:border-accent/60 focus:outline-none"
                />
              </Field>
              <Field label="End date">
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-base-border bg-base-surface px-3 py-2.5 text-sm focus:border-accent/60 focus:outline-none"
                />
              </Field>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Field label="Where are you staying? (your base)">
              <PlaceSearch
                autoFocus
                placeholder="Search hotel, address or area…"
                onSelect={(r) => setBase(r)}
              />
            </Field>
            {base && (
              <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 px-3 py-2.5 text-sm">
                <span className="text-accent">📍</span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-100">{base.name}</p>
                  <p className="truncate text-xs text-slate-400">{base.label}</p>
                </div>
                <button
                  onClick={() => setBase(null)}
                  className="ml-auto text-xs text-slate-500 hover:text-slate-200"
                >
                  Change
                </button>
              </div>
            )}
            <p className="text-xs text-slate-500">
              Your base is the start point for each day&apos;s route and the
              center of the walking-distance rings.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Field label="Name your first day (optional)">
              <input
                value={dayTitle}
                onChange={(e) => setDayTitle(e.target.value)}
                placeholder="Day 1"
                className="w-full rounded-xl border border-base-border bg-base-surface px-3 py-2.5 text-sm focus:border-accent/60 focus:outline-none"
              />
            </Field>
            <p className="text-xs text-slate-500">
              You&apos;ll add stops to this day (and create more days) on the
              next screen.
            </p>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => (step === 0 ? router.push("/dashboard") : setStep(step - 1))}
            className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-slate-100"
          >
            {step === 0 ? "Cancel" : "Back"}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => canNext && setStep(step + 1)}
              disabled={!canNext}
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-base-bg transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={createPlan}
              disabled={saving}
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-base-bg transition hover:bg-accent-soft disabled:opacity-50"
            >
              {saving ? "Creating…" : "Create plan"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-300">
        {label}
      </span>
      {children}
    </label>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PublicPlanView from "@/components/PublicPlanView";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const supabase = createClient();
  const { data: plan } = await supabase
    .from("plans")
    .select("title, base_name")
    .eq("id", params.id)
    .maybeSingle();
  if (!plan) return { title: "Itinerary — Lezzgo" };
  return {
    title: `${plan.title} — Lezzgo`,
    description: plan.base_name
      ? `A travel itinerary based in ${plan.base_name}, planned on Lezzgo.`
      : "A travel itinerary planned on Lezzgo.",
  };
}

export default async function PublicPlanPage({ params }) {
  const { id } = params;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS returns the plan only if it is public OR the viewer is owner/member.
  const { data: plan } = await supabase
    .from("plans")
    .select(
      "id, title, base_name, base_lat, base_lng, start_date, end_date, is_public, owner_id"
    )
    .eq("id", id)
    .maybeSingle();

  if (!plan) {
    return <PrivateNotice signedIn={!!user} />;
  }

  const [{ data: days }, { data: nearby }] = await Promise.all([
    supabase
      .from("days")
      .select("*, stops(*)")
      .eq("plan_id", id)
      .order("day_number", { ascending: true }),
    supabase.from("nearby_places").select("*").eq("plan_id", id),
  ]);

  return (
    <PublicPlanView
      plan={plan}
      initialDays={days || []}
      initialNearby={nearby || []}
      signedIn={!!user}
    />
  );
}

function PrivateNotice({ signedIn }) {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-base-card text-2xl">
          🔒
        </div>
        <h1 className="mt-4 text-xl font-bold">This itinerary is private</h1>
        <p className="mt-1 text-sm text-slate-400">
          The owner hasn&apos;t made this trip public, or the link is invalid.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href={signedIn ? "/dashboard" : "/"}
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-base-bg transition hover:bg-accent-soft"
          >
            {signedIn ? "Go to your trips" : "Sign in"}
          </Link>
        </div>
      </div>
    </main>
  );
}

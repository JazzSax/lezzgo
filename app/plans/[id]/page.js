import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PlanWorkspace from "@/components/PlanWorkspace";

export const dynamic = "force-dynamic";

export default async function PlanPage({ params }) {
  const { id } = params;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: plan } = await supabase
    .from("plans")
    .select(
      `*, owner:profiles!plans_owner_id_fkey ( id, display_name, avatar_url, email )`
    )
    .eq("id", id)
    .maybeSingle();

  // RLS returns nothing if the user can't view this plan.
  if (!plan) notFound();

  const canEdit = plan.owner_id === user.id;

  const [{ data: shares }, { data: days }, { data: nearby }] = await Promise.all([
    supabase
      .from("plan_shares")
      .select(
        `id, status, profile:profiles!plan_shares_shared_with_fkey ( id, display_name, avatar_url, email )`
      )
      .eq("plan_id", id),
    supabase
      .from("days")
      .select(`*, stops ( * )`)
      .eq("plan_id", id)
      .order("day_number", { ascending: true }),
    supabase.from("nearby_places").select("*").eq("plan_id", id),
  ]);

  return (
    <PlanWorkspace
      plan={plan}
      owner={plan.owner}
      initialDays={days || []}
      initialNearby={nearby || []}
      initialShares={shares || []}
      canEdit={canEdit}
      currentUserId={user.id}
    />
  );
}

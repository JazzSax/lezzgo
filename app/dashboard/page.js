import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/AppHeader";
import PlanCard from "@/components/PlanCard";
import InviteCard from "@/components/InviteCard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: profile }, { data: plans }, { data: invites }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("plans")
        .select(
          `id, title, description, base_name, start_date, end_date, owner_id, created_at,
           owner:profiles!plans_owner_id_fkey ( id, display_name, avatar_url, email ),
           members:plan_shares ( status, profile:profiles!plan_shares_shared_with_fkey ( id, display_name, avatar_url, email ) )`
        )
        .order("created_at", { ascending: false }),
      supabase.rpc("get_pending_invites"),
    ]);

  const owned = (plans || []).filter((p) => p.owner_id === user.id);
  const shared = (plans || []).filter((p) => p.owner_id !== user.id);

  return (
    <div className="min-h-screen">
      <AppHeader profile={profile} />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Your trips</h1>
            <p className="text-sm text-slate-400">
              {(plans || []).length} plan{(plans || []).length === 1 ? "" : "s"}
            </p>
          </div>
          <Link
            href="/plans/new"
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-base-bg transition hover:bg-accent-soft"
          >
            + New plan
          </Link>
        </div>

        {invites && invites.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Pending invites
            </h2>
            <div className="space-y-3">
              {invites.map((inv) => (
                <InviteCard key={inv.share_id} invite={inv} />
              ))}
            </div>
          </section>
        )}

        {(plans || []).length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {owned.length > 0 && (
              <Section title="Created by you">
                {owned.map((p) => (
                  <PlanCard key={p.id} plan={p} currentUserId={user.id} />
                ))}
              </Section>
            )}
            {shared.length > 0 && (
              <Section title="Shared with you">
                {shared.map((p) => (
                  <PlanCard key={p.id} plan={p} currentUserId={user.id} />
                ))}
              </Section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="mt-12 grid place-items-center rounded-2xl border border-dashed border-base-border py-16 text-center">
      <div className="max-w-sm px-6">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent/15 text-2xl">
          🧭
        </div>
        <h3 className="mt-4 text-lg font-bold">No trips yet</h3>
        <p className="mt-1 text-sm text-slate-400">
          Create your first travel plan: pick a base, then map out each day.
        </p>
        <Link
          href="/plans/new"
          className="mt-5 inline-block rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-base-bg transition hover:bg-accent-soft"
        >
          + New plan
        </Link>
      </div>
    </div>
  );
}

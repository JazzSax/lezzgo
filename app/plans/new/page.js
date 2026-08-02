import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CreatePlanWizard from "@/components/CreatePlanWizard";

export const dynamic = "force-dynamic";

export default async function NewPlanPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  return (
    <div className="min-h-screen">
      <header className="border-b border-base-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-slate-100">
            ← Back to trips
          </Link>
        </div>
      </header>
      <main className="px-4 py-10">
        <h1 className="mb-8 text-center text-2xl font-black tracking-tight">
          New travel plan
        </h1>
        <CreatePlanWizard />
      </main>
    </div>
  );
}

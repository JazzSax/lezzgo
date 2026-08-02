import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignInButtons from "@/components/SignInButtons";

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Decorative map-grid backdrop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(#2dd4bf 1px, transparent 1px), linear-gradient(90deg, #2dd4bf 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-accent/25 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16">
        <div className="mb-8 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lezzgo_logo.svg" alt="Lezzgo" className="h-10 w-10 rounded-xl" />
          <span className="text-2xl font-black tracking-tight">Lezzgo</span>
        </div>

        <h1 className="text-center text-4xl font-black leading-tight tracking-tight">
          Plan the trip.
          <br />
          <span className="text-accent">Map every day.</span>
        </h1>
        <p className="mt-4 text-center text-slate-400">
          Build day-by-day travel routes on an interactive map, add labels to
          every stop, and share the plan with the people coming along.
        </p>

        <div className="mt-10 w-full">
          <SignInButtons />
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          By continuing you agree to the Terms and acknowledge the Privacy
          Policy. Map data © OpenStreetMap contributors.
        </p>
      </div>
    </main>
  );
}

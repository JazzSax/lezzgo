import Link from "next/link";
import Avatar from "@/components/Avatar";

// Server component. `profile` is the current user's profiles row.
export default function AppHeader({ profile, children }) {
  return (
    <header className="sticky top-0 z-20 border-b border-base-border bg-base-bg/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lezzgo_logo.svg" alt="Lezzgo" className="h-8 w-8 rounded-lg" />
          <span className="text-lg font-black tracking-tight">Lezzgo</span>
        </Link>

        <div className="flex items-center gap-3">
          {children}
          <div className="flex items-center gap-2">
            <Avatar profile={profile} size="md" />
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-lg px-2 py-1 text-xs text-slate-400 transition hover:text-slate-100"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}

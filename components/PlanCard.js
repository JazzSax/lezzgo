import Link from "next/link";
import Avatar from "@/components/Avatar";
import { formatDateRange } from "@/lib/format";

// Renders a single plan tile on the dashboard.
export default function PlanCard({ plan, currentUserId }) {
  const isOwner = plan.owner_id === currentUserId;
  const range = formatDateRange(plan.start_date, plan.end_date);
  const members = (plan.members || []).filter((m) => m.status === "accepted");

  return (
    <Link
      href={`/plans/${plan.id}`}
      className="group flex flex-col rounded-2xl border border-base-border bg-base-card p-5 transition hover:border-accent/50 hover:bg-base-surface"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold leading-tight text-slate-100 group-hover:text-accent">
          {plan.title}
        </h3>
        {!isOwner && (
          <span className="shrink-0 rounded-full bg-sea/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sea">
            Shared
          </span>
        )}
      </div>

      {plan.base_name && (
        <p className="mt-1 flex items-center gap-1 text-sm text-slate-400">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-accent" fill="currentColor">
            <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
          </svg>
          {plan.base_name}
        </p>
      )}

      {range && <p className="mt-3 text-xs text-slate-500">{range}</p>}

      <div className="mt-4 flex items-center justify-between">
        <div className="flex -space-x-2">
          {plan.owner && <Avatar profile={plan.owner} size="sm" ring title={`${plan.owner.display_name || "Owner"} (owner)`} />}
          {members.slice(0, 4).map((m) => (
            <Avatar key={m.profile?.id} profile={m.profile} size="sm" ring />
          ))}
          {members.length > 4 && (
            <span className="grid h-7 w-7 place-items-center rounded-full bg-base-surface text-[10px] text-slate-400 ring-2 ring-base-bg">
              +{members.length - 4}
            </span>
          )}
        </div>
        <span className="text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-accent">
          →
        </span>
      </div>
    </Link>
  );
}

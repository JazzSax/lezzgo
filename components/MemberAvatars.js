import Avatar from "@/components/Avatar";

// Stacked avatars: owner first, then accepted members.
export default function MemberAvatars({ owner, members = [], max = 5 }) {
  const accepted = members.filter((m) => m.status === "accepted" && m.profile);
  const shown = accepted.slice(0, max);
  const extra = accepted.length - shown.length;

  return (
    <div className="flex -space-x-2">
      {owner && (
        <Avatar
          profile={owner}
          size="sm"
          ring
          title={`${owner.display_name || "Owner"} (owner)`}
        />
      )}
      {shown.map((m) => (
        <Avatar key={m.profile.id} profile={m.profile} size="sm" ring />
      ))}
      {extra > 0 && (
        <span className="grid h-7 w-7 place-items-center rounded-full bg-base-surface text-[10px] text-slate-400 ring-2 ring-base-bg">
          +{extra}
        </span>
      )}
    </div>
  );
}

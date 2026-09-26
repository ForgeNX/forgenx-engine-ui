import { useEffect, useState } from "react";

// Shown beside a panel heading when the latest poll failed, so figures kept
// from the last good read are not mistaken for live ones. Hidden while the
// data is fresh.
export function StaleBadge({ stale, updatedAt }: { stale: boolean; updatedAt: number | null }) {
  // Re-render every few seconds so "updated 40s ago" keeps counting.
  const [, tick] = useState(0);
  useEffect(() => {
    if (!stale) return;
    const t = setInterval(() => tick((n) => n + 1), 5_000);
    return () => clearInterval(t);
  }, [stale]);

  if (!stale) return null;

  const age = updatedAt ? Math.max(0, Math.floor((Date.now() - updatedAt) / 1000)) : null;
  const ageText =
    age === null ? "" : age < 60 ? `${age}s` : age < 3600 ? `${Math.floor(age / 60)}m` : `${Math.floor(age / 3600)}h`;

  return (
    <span
      role="status"
      className="ml-auto flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[0.65rem] font-semibold"
      style={{
        color: "var(--neon-gold)",
        borderColor: "color-mix(in oklab, var(--neon-gold) 55%, transparent)",
      }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ background: "var(--neon-gold)", animation: "pulse-glow 1.6s ease-in-out infinite" }}
      />
      Reconnecting…{ageText && <span className="font-normal text-foreground/90">updated {ageText} ago</span>}
    </span>
  );
}

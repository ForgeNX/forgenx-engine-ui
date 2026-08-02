import { FORGE_APPS, type ForgeApp } from "./nexus-data";

/**
 * Ring composed from the *installed* ForgeNX apps only.
 * One app installed -> the full ring takes that coin's colour;
 * two -> 50/50; three -> thirds, and so on.
 */
export function InstallRing({ apps, selectedId }: { apps: ForgeApp[]; selectedId: string }) {
  const installed = apps.filter((a) => a.installed);
  const total = FORGE_APPS.length;
  const online = installed.filter((a) => a.online).length;
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const slice = installed.length ? circumference / installed.length : 0;
  const gap = installed.length > 1 ? 2 : 0;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[150px]">
      <div
        className="absolute inset-[16%] rounded-full animate-pulse-glow"
        style={{
          background: `radial-gradient(circle, color-mix(in oklab, ${
            installed.find((a) => a.id === selectedId)?.color ?? "var(--neon-cyan)"
          } 26%, transparent), transparent 70%)`,
        }}
      />
      <svg viewBox="0 0 160 160" className="absolute inset-0 -rotate-90">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="var(--secondary)" strokeWidth="11" />
        {installed.map((app, i) => (
          <circle
            key={app.id}
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={app.color}
            strokeWidth={app.id === selectedId ? 14 : 11}
            strokeLinecap="butt"
            strokeDasharray={`${Math.max(0, slice - gap)} ${circumference - slice + gap}`}
            strokeDashoffset={-(i * slice) - circumference}
            style={{
              filter: `drop-shadow(0 0 8px color-mix(in oklab, ${app.color} 70%, transparent))`,
              opacity: app.online ? 1 : 0.45,
              transition: "stroke-width 400ms ease, opacity 400ms ease",
              animation: `ring-in 1.1s cubic-bezier(0.22,1,0.36,1) ${i * 110}ms both`,
            }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <p className="font-display text-2xl font-bold tabular-nums">
          {online}/{installed.length || 0}
        </p>
        <p className="text-xs font-semibold text-neon-green glow-text">Online</p>
        <p className="text-[0.52rem] leading-tight tracking-[0.14em] text-muted-foreground uppercase">
          {installed.length}/{total} installed
        </p>
      </div>
    </div>
  );
}
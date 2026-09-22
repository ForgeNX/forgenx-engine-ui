import { Activity } from "lucide-react";
import type { MeshOverview } from "@/lib/forge-api";
import type { ForgeApp } from "./nexus-data";

// A summary of the whole mesh since the engine last started: what is connected,
// what it is producing, and how its shares and switches have gone.

// 1207411 -> "1.21M": share difficulties run from thousands to trillions.
function compact(n: number): string {
  const units = ["", "K", "M", "G", "T", "P"];
  let i = 0;
  while (Math.abs(n) >= 1000 && i < units.length - 1) {
    n /= 1000;
    i++;
  }
  return `${n.toFixed(i === 0 ? 0 : 2)}${units[i]}`;
}

function uptime(since: string): string {
  const ms = Date.now() - new Date(since).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "";
  const m = Math.floor(ms / 60_000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="text-[0.6rem] tracking-[0.14em] text-foreground/90 uppercase">{label}</span>
      <span className="font-mono text-sm font-semibold" style={{ color: color ?? "var(--foreground)" }}>
        {value}
      </span>
    </div>
  );
}

export function MeshOverviewPill({ apps, overview }: { apps: ForgeApp[]; overview?: MeshOverview }) {
  if (!overview) return null;
  const appFor = (sym: string) => apps.find((a) => a.id.toUpperCase() === sym.toUpperCase());
  const up = uptime(overview.since);

  return (
    <div className="rounded-xl border border-border/70 p-4" style={{ background: "color-mix(in oklab, var(--secondary) 25%, transparent)" }}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <Activity className="size-4 text-neon-cyan" />
          <span className="font-display text-sm font-bold">Mesh Overview</span>
        </span>
        {up && <span className="font-mono text-[0.68rem] text-foreground/90">Session Uptime: {up}</span>}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-x-4 gap-y-3">
        <Stat label="Miners" value={String(overview.connected)} />
        <Stat label="Hashrate" value={`${overview.total_ths.toFixed(2)} TH/s`} color="var(--neon-cyan)" />
        <Stat label="Peak Hashrate" value={`${overview.peak_ths.toFixed(2)} TH/s`} />
        <Stat label="Best share" value={compact(overview.best_share)} />
        <Stat label="Blocks Found" value={String(overview.blocks)} color={overview.blocks > 0 ? "var(--neon-green)" : undefined} />
        <Stat label="Switches" value={String(overview.switches)} />
      </div>

      <div className="mt-3 flex flex-wrap items-baseline justify-center gap-2 font-mono text-[0.72rem]">
        <span className="text-[0.6rem] tracking-[0.14em] text-foreground/90 uppercase">Shares:</span>
        <span style={{ color: "var(--neon-green)" }}>{overview.accepted} accepted</span>
        <span className="text-foreground/50">/</span>
        <span style={{ color: overview.rejected > 0 ? "#ff0080" : "var(--foreground)" }}>{overview.rejected} rejected</span>
        <span className="text-foreground/50">/</span>
        <span style={{ color: overview.stale > 0 ? "var(--neon-gold)" : "var(--foreground)" }}>{overview.stale} stale</span>
      </div>

      {overview.nodes.length > 0 && (
        <div className="mt-3 flex flex-col gap-1 border-t border-border/60 pt-3">
          {overview.nodes.map((n) => {
            const app = appFor(n.coin);
            return (
              <span key={n.coin} className="flex items-center gap-2 font-mono text-[0.72rem]">
                <span className="size-1.5 rounded-full" style={{ background: app?.color ?? "var(--foreground)" }} />
                <span className="w-20 font-semibold" style={{ color: app?.color ?? "var(--foreground)" }}>
                  {app?.ticker ?? (n.coin || "none")}
                </span>
                <span className="text-foreground/90">
                  {n.miners} miner{n.miners === 1 ? "" : "s"} · {n.ths.toFixed(2)} TH/s
                </span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

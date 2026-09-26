import { Activity } from "lucide-react";
import { ShineBorder } from "./shine-border";
import { AuroraText } from "./aurora-text";
import { compactNumber, formatHashrate } from "./format";
import type { MeshOverview } from "@/lib/forge-api";
import type { ForgeApp } from "./nexus-data";

// A summary of the whole mesh since the engine last started: what is connected,
// what it is producing, and how its shares and switches have gone.

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
    <div
      className="relative overflow-hidden rounded-xl border border-border/70 p-4"
      style={{ background: "color-mix(in oklab, var(--secondary) 25%, transparent)" }}
    >
      <ShineBorder
        borderWidth={1.5}
        duration={14}
        shineColor={["var(--neon-cyan)", "var(--neon-pink)", "var(--neon-gold)"]}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <Activity className="size-4 text-neon-cyan" />
          <span className="font-display text-sm font-bold">Mesh Overview</span>
        </span>
        {up && <span className="font-mono text-[0.68rem] text-foreground/90">Session Uptime: {up}</span>}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-x-4 gap-y-3">
        <Stat label="Miners" value={String(overview.connected)} />
        <Stat label="Hashrate" value={formatHashrate(overview.total_ths)} color="var(--neon-cyan)" />
        <Stat label="Peak Hashrate" value={formatHashrate(overview.peak_ths)} />
        <Stat label="Best share" value={compactNumber(overview.best_share)} />
        <Stat
          label="Blocks Found"
          value={String(overview.blocks)}
          color={overview.blocks > 0 ? "var(--neon-green)" : undefined}
        />
        <Stat label="Switches" value={String(overview.switches)} />
      </div>

      <div className="mt-3 flex flex-wrap items-baseline justify-center gap-2 font-mono text-[0.72rem]">
        <span className="text-[0.6rem] tracking-[0.14em] text-foreground/90 uppercase">Shares:</span>
        <span style={{ color: "var(--neon-green)" }}>{overview.accepted} accepted</span>
        <span className="text-foreground/50">/</span>
        <span style={{ color: overview.rejected > 0 ? "#ff0080" : "var(--foreground)" }}>{overview.rejected} rejected</span>
        <span className="text-foreground/50">/</span>
        <span style={{ color: overview.stale > 0 ? "var(--neon-gold)" : "var(--foreground)" }}>{overview.stale} stale</span>
        {(overview.lost ?? 0) > 0 && (
          <>
            <span className="text-foreground/50">·</span>
            <span className="text-muted-foreground">{overview.lost} lost to reconnect</span>
          </>
        )}
      </div>

      {overview.nodes.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 border-t border-border/60 pt-3">
          {overview.nodes.map((n) => {
            const app = appFor(n.coin);
            return (
              // The title column runs down the left, the figures beside it, so the
              // chain name shares a line with the shares rather than costing one.
              <div key={n.coin} className="flex items-start gap-4 font-mono text-[0.7rem] text-foreground/90">
                <span className="flex shrink-0 items-start gap-2">
                  <span
                    className="mt-1 size-1.5 shrink-0 rounded-full"
                    style={{ background: app?.color ?? "var(--foreground)" }}
                  />
                  <span className="flex w-20 flex-col">
                    <span className="truncate text-[0.8rem] font-semibold" style={{ color: app?.color ?? "var(--foreground)" }}>
                      {app ? (
                        <AuroraText colors={[app.color, "#7928CA", "#38bdf8", app.color]}>{app.ticker}</AuroraText>
                      ) : (
                        n.coin || "none"
                      )}
                    </span>
                    <span className="truncate text-[0.55rem] leading-tight text-foreground/90">{app?.chain ?? ""}</span>
                  </span>
                </span>

                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="whitespace-pre-wrap">
                    {n.miners} miner{n.miners === 1 ? "" : "s"} ({n.fleet_miners} fleet / {n.assigned_miners} assigned)
                    {"  -  "}Hashrate: <span className="text-neon-cyan">{formatHashrate(n.ths)}</span>
                  </span>
                  <span className="whitespace-pre-wrap">
                    Shares: <span style={{ color: "var(--neon-green)" }}>{n.accepted} accepted</span>
                    {" / "}
                    <span style={{ color: n.rejected > 0 ? "#ff0080" : "var(--foreground)" }}>{n.rejected} rejected</span>
                    {" / "}
                    <span style={{ color: n.stale > 0 ? "var(--neon-gold)" : "var(--foreground)" }}>{n.stale} stale</span>
                    {"  -  "}Blocks Found:{" "}
                    <span style={{ color: n.blocks > 0 ? "var(--neon-green)" : "var(--foreground)" }}>{n.blocks}</span>
                  </span>
                  <span className="whitespace-pre-wrap">
                    Best share: {compactNumber(n.best_share)}
                    {n.best_share_worker && <span className="text-muted-foreground">  ({n.best_share_worker})</span>}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

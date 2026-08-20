import type { ReactElement, ReactNode } from "react";

import { BlockIcon, BoltIcon, ClockIcon, HeartIcon, SharesIcon, WorkersIcon } from "./animated-icons";
import type { ForgeApp } from "./nexus-data";
import type { FleetStats } from "@/lib/forge-api";

type Pill = {
  label: string;
  icon: (p: { color: string }) => ReactElement;
  color: string;
  value: ReactNode;
  valueClass?: string;
  badge?: { text: string; tone: "up" | "flat" };
  sub?: string;
  subAccent?: string;
  aside?: { value: string; label: string }[];
};

function parseHashrateToHs(display: string): number {
  const m = display.match(/^([\d.]+)\s*([KMGTPE]?H\/s)/i);
  if (!m) return 0;
  const val = parseFloat(m[1]);
  const unit = m[2].toUpperCase();
  const scale: Record<string, number> = {
    "H/S": 1, "KH/S": 1e3, "MH/S": 1e6, "GH/S": 1e9, "TH/S": 1e12, "PH/S": 1e15, "EH/S": 1e18,
  };
  return val * (scale[unit] ?? 1);
}

function fmtHs(h: number): string {
  if (!h || h <= 0) return "0 H/s";
  const units = ["H/s", "KH/s", "MH/s", "GH/s", "TH/s", "PH/s", "EH/s"];
  let i = 0;
  let v = h;
  while (v >= 1000 && i < units.length - 1) {
    v /= 1000;
    i++;
  }
  return `${v.toFixed(2)} ${units[i]}`;
}

function fmtUptime(sec: number): string {
  if (!sec || sec <= 0) return "\u2014";
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

export function StatPills({ apps, fleet }: { apps: ForgeApp[]; fleet: FleetStats | null }) {
  const online = apps.filter((a) => a.online);
  const totalHs = apps.reduce((sum, a) => sum + parseHashrateToHs(a.hashrate), 0);
  // fleet.totalWorkers counts distinct hardware; the per-app sum double-counts a
  // mesh worker bonded to several coins. Fall back to the sum if it is unavailable.
  const totalWorkers = fleet?.totalWorkers || apps.reduce((sum, a) => sum + a.miners, 0);
  const sharesAccepted = fleet?.totalSharesAccepted ?? 0;
  const sharesRejected = fleet?.totalSharesRejected ?? 0;
  const efficiency =
    sharesAccepted + sharesRejected > 0
      ? ((sharesAccepted / (sharesAccepted + sharesRejected)) * 100).toFixed(1)
      : "100";
  const allOnline = apps.length > 0 && online.length === apps.length;

  const PILLS: Pill[] = [
    { label: "Total hashrate", icon: BoltIcon, color: "var(--neon-cyan)", value: fmtHs(totalHs), sub: `${online.length} coin${online.length === 1 ? "" : "s"} active` },
    { label: "Workers online", icon: WorkersIcon, color: "var(--neon-violet)", value: String(totalWorkers), sub: `across ${online.length} coin${online.length === 1 ? "" : "s"}` },
    { label: "Blocks found / Orphaned", icon: BlockIcon, color: "var(--neon-gold)", value: (() => { const f = fleet?.totalBlocks ?? 0; const o = fleet?.totalOrphaned ?? 0; return (<span>{f} <span style={{ color: "var(--muted-foreground)" }}>/</span> <span style={{ color: o > 0 ? "#f87171" : "var(--muted-foreground)" }}>{o}</span></span>); })(), sub: "All time" },
    { label: "Total shares", icon: SharesIcon, color: "var(--neon-cyan)", value: sharesAccepted.toLocaleString(), aside: [{ value: sharesRejected.toLocaleString(), label: "Rejected" }, { value: `${efficiency}%`, label: "Efficiency" }] },
    { label: "Fleet health", icon: HeartIcon, color: allOnline ? "var(--neon-green)" : "var(--neon-gold)", value: apps.length === 0 ? "No coins" : allOnline ? "Excellent" : "Degraded", valueClass: `${allOnline ? "text-neon-green" : "text-neon-gold"} glow-text`, sub: allOnline ? "All systems operational" : `${online.length}/${apps.length} online` },
    { label: "ForgeNX uptime", icon: ClockIcon, color: "var(--neon-pink)", value: fmtUptime(fleet?.uptimeSeconds ?? 0), sub: "Since last restart", subAccent: "var(--neon-pink)" },
  ];

  return (
    <section aria-label="Fleet summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {PILLS.map((pill, i) => {
        const Icon = pill.icon;
        return (
          <article
            key={pill.label}
            className="panel-neon group relative p-4 transition-transform duration-500 hover:-translate-y-1"
            style={{
              animation: `rise 0.7s cubic-bezier(0.22,1,0.36,1) ${i * 70}ms both`,
              borderColor: `color-mix(in oklab, ${pill.color} 42%, transparent)`,
              boxShadow: `inset 0 0 46px -30px ${pill.color}`,
            }}
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70" style={{ background: `linear-gradient(90deg, transparent, ${pill.color}, transparent)` }} />
            <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: `linear-gradient(90deg, transparent, color-mix(in oklab, ${pill.color} 22%, transparent), transparent)`, animation: "scan 1.8s linear infinite" }} />
            <header className="flex items-center gap-2.5">
              <Icon color={pill.color} />
              <h3 className="text-[0.68rem] font-semibold tracking-[0.2em] text-white uppercase">{pill.label}</h3>
            </header>
            <div className="mt-3 flex items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-2.5">
                <p className={`font-display leading-none font-bold tabular-nums text-xl ${pill.valueClass ?? ""}`}>{pill.value}</p>
                {pill.sub ? (
                  <span className="text-xs whitespace-nowrap" style={{ color: pill.subAccent ?? "var(--muted-foreground)" }}>{pill.sub}</span>
                ) : null}
              </div>
              {pill.badge ? (
                <span className="rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold" style={{ color: "var(--neon-green)", background: "color-mix(in oklab, var(--neon-green) 14%, transparent)", animation: "pulse-glow 2.8s ease-in-out infinite" }}>{pill.badge.text}</span>
              ) : null}
              {pill.aside ? (
                <div className="flex items-end gap-3">
                  {pill.aside.map((a) => (
                    <p key={a.label + a.value} className="text-right leading-tight">
                      <span className="font-mono text-sm font-semibold tabular-nums text-neon-green">{a.value}</span>
                      {a.label ? (<span className="ml-1 text-[0.6rem] tracking-wider text-muted-foreground">{a.label}</span>) : null}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          </article>
        );
      })}
    </section>
  );
}

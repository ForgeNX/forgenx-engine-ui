import { Check } from "lucide-react";

import { Sparkline } from "@/components/mining/sparkline";
import { useLiveSeries } from "@/hooks/use-live-series";

import { MINING_STATUS, NETWORK_TILES, NODE_HEALTH, PORTS, READINESS_CHECKS } from "./forge-data";
import { SyncRing } from "./sync-ring";
import { TileVisual, type TileViz } from "./tile-visuals";

function PanelTitle({ title, color }: { title: string; color: string }) {
  return (
    <header className="flex items-center gap-3">
      <span
        className="h-4 w-1 rounded-full animate-pulse-glow"
        style={{ background: color, boxShadow: `0 0 12px ${color}` }}
      />
      <h2 className="text-xs font-semibold tracking-[0.26em] uppercase" style={{ color }}>
        {title}
      </h2>
    </header>
  );
}

type Row = { label: string; hint?: string; value: string; accent?: string };

function StatRows({ rows }: { rows: Row[] }) {
  return (
    <ul className="mt-4 divide-y divide-border/50">
      {rows.map((row, i) => (
        <li
          key={row.label}
          className="group flex items-center justify-between gap-4 py-2 text-sm transition-colors duration-300 hover:bg-secondary/40"
          style={{ animation: `rise 0.6s cubic-bezier(0.22,1,0.36,1) ${i * 50}ms both` }}
        >
          <span className="text-foreground/80">
            {row.label}
            {row.hint ? (
              <span className="ml-1.5 text-[0.65rem] tracking-wider text-muted-foreground uppercase">
                ({row.hint})
              </span>
            ) : null}
          </span>
          <span
            className="font-mono text-right font-semibold tabular-nums transition-all duration-300 group-hover:glow-text"
            style={{ color: row.accent ?? "var(--foreground)" }}
          >
            {row.value}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ReadinessChecks() {
  return (
    <section className="panel-neon animate-rise p-5">
      <PanelTitle title="Readiness checks" color="var(--neon-cyan)" />
      <div className="mt-5 flex items-center gap-4">
        <SyncRing />
        <div>
          <p className="font-display text-2xl font-semibold tracking-tight text-neon-cyan glow-text">Synced</p>
          <p className="mt-1 text-xs text-muted-foreground">DigiByteCore v9.26.5 · Mainnet</p>
        </div>
      </div>

      <ul className="mt-7 space-y-2.5">
        {READINESS_CHECKS.map((check, i) => (
          <li
            key={check}
            className="group flex items-center gap-2.5 text-sm"
            style={{ animation: `rise 0.6s cubic-bezier(0.22,1,0.36,1) ${i * 70}ms both` }}
          >
            <span
              className="flex size-5 items-center justify-center rounded-md border transition-all duration-300 group-hover:scale-110"
              style={{
                borderColor: "color-mix(in oklab, var(--neon-green) 60%, transparent)",
                background: "color-mix(in oklab, var(--neon-green) 14%, transparent)",
                boxShadow: "0 0 12px color-mix(in oklab, var(--neon-green) 40%, transparent)",
              }}
            >
              <Check className="size-3 text-neon-green" />
            </span>
            <span className="text-foreground/85 transition-colors duration-300 group-hover:text-neon-green">
              {check}
            </span>
          </li>
        ))}
      </ul>

      <ul className="mt-5 flex flex-wrap gap-2">
        {PORTS.map((port, i) => (
          <li
            key={port.label}
            className="flex flex-1 min-w-[7.5rem] items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-transform duration-300 hover:-translate-y-0.5"
            style={{
              borderColor: `color-mix(in oklab, ${port.color} 45%, transparent)`,
              background: `color-mix(in oklab, ${port.color} 8%, transparent)`,
              animation: `rise 0.6s cubic-bezier(0.22,1,0.36,1) ${i * 60}ms both`,
            }}
          >
            <span className="text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase">
              {port.label}
            </span>
            <span className="font-mono text-sm font-semibold tabular-nums" style={{ color: port.color }}>
              {port.value}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MiningStatus() {
  const series = useLiveSeries(63, 40, 1400, 1.1);
  return (
    <section className="panel-neon animate-rise p-5" style={{ animationDelay: "100ms" }}>
      <PanelTitle title="Mining status" color="var(--neon-pink)" />
      <div className="mt-4 -mx-1 opacity-80">
        <Sparkline values={series} color="var(--neon-pink)" height={56} grid={false} />
      </div>
      <StatRows rows={MINING_STATUS} />
    </section>
  );
}

export function NodeHealth() {
  return (
    <section className="panel-neon animate-rise p-5" style={{ animationDelay: "200ms" }}>
      <PanelTitle title="Node health" color="var(--neon-violet)" />
      <StatRows rows={NODE_HEALTH} />
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary">
        <span
          className="block h-full w-[89%]"
          style={{
            background: "linear-gradient(90deg, var(--neon-violet), var(--neon-cyan))",
            boxShadow: "0 0 14px var(--neon-violet)",
          }}
        />
      </div>
      <p className="mt-2 text-[0.65rem] tracking-[0.2em] text-muted-foreground uppercase">
        Prune current 1.78 GiB of 2 GiB
      </p>
    </section>
  );
}

function NetworkTile({
  label,
  value,
  color,
  viz,
  delay,
}: {
  label: string;
  value: string;
  color: string;
  viz: TileViz;
  delay: number;
}) {
  return (
    <article
      className="panel-neon group relative p-4 transition-transform duration-500 hover:-translate-y-1"
      style={{
        animation: `rise 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms both`,
        borderColor: `color-mix(in oklab, ${color} 45%, transparent)`,
      }}
    >
      <span
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `linear-gradient(90deg, transparent, color-mix(in oklab, ${color} 20%, transparent), transparent)`,
          animation: "scan 1.8s linear infinite",
        }}
      />
      <p className="text-[0.6rem] tracking-[0.22em] text-muted-foreground uppercase">{label}</p>
      <p
        className="font-display mt-2 text-xl font-semibold tracking-tight tabular-nums transition-all duration-300 group-hover:glow-text"
        style={{ color }}
      >
        {value}
      </p>
      <div className="mt-3 opacity-80">
        <TileVisual viz={viz} color={color} />
      </div>
    </article>
  );
}

export function NetworkStrip() {
  return (
    <section className="panel-neon grid-backdrop animate-rise p-5" style={{ animationDelay: "260ms" }}>
      <PanelTitle title="Network" color="var(--neon-gold)" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {NETWORK_TILES.map((tile, i) => (
          <NetworkTile key={tile.label} {...tile} delay={i * 70} />
        ))}
      </div>
    </section>
  );
}
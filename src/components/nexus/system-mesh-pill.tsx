import { useRef } from "react";
import { AnimatedBeam } from "./animated-beam";
import { parseAllocation, type MeshStatus } from "@/lib/forge-api";
import type { ForgeApp } from "./nexus-data";

// Fleet Balance, shown as a miner of its own at the top of the list: every
// included miner combined. Each node carries its target share beside the share
// it is actually getting, and a beam that is lit when miners are on that node
// and plain white when none are - so the fleet's shape reads at a glance while
// the numbers say how close the balancer has it.
//
// Unlike a miner split by hand, Fleet Balance puts each miner on one node and
// leaves it there; the target is met by moving whole miners between nodes, not
// by every miner rotating.
export const SYSTEM_ID = "__system__";

export function SystemMeshPill({
  apps,
  mesh,
  selected,
  onSelect,
}: {
  apps: ForgeApp[];
  mesh: MeshStatus;
  selected: boolean;
  onSelect: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fromRef = useRef<HTMLSpanElement>(null);
  // Beams need a ref per endpoint and hooks cannot be called in a loop, so the
  // refs are declared up front — more than any fleet is likely to carry coins.
  const nodeRefs = [
    useRef<HTMLSpanElement>(null),
    useRef<HTMLSpanElement>(null),
    useRef<HTMLSpanElement>(null),
    useRef<HTMLSpanElement>(null),
    useRef<HTMLSpanElement>(null),
    useRef<HTMLSpanElement>(null),
    useRef<HTMLSpanElement>(null),
    useRef<HTMLSpanElement>(null),
  ];

  const included = mesh.miners.filter((m) => m.assignment === "AUTO" && m.connected);
  const total = included.reduce((s, m) => s + (m.hashrate_15m || 0), 0);
  const target = parseAllocation(mesh.system_target ?? "");
  const actual: Record<string, number> = {};
  const minersOn: Record<string, number> = {};
  for (const m of included) {
    const c = m.active_coin.toUpperCase();
    actual[c] = (actual[c] ?? 0) + (m.hashrate_15m || 0);
    minersOn[c] = (minersOn[c] ?? 0) + 1;
  }
  const appFor = (sym: string) => apps.find((a) => a.id.toUpperCase() === sym);
  const coins = mesh.coins.map((c) => c.toUpperCase()).slice(0, nodeRefs.length);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="rounded-xl border p-4 text-left transition hover:-translate-y-0.5"
      style={{
        borderColor: selected ? "var(--neon-cyan)" : "color-mix(in oklab, var(--neon-cyan) 40%, var(--border))",
        background: selected
          ? "color-mix(in oklab, var(--neon-cyan) 9%, transparent)"
          : "color-mix(in oklab, var(--neon-cyan) 4%, transparent)",
      }}
    >
      <div ref={containerRef} className="relative flex items-start gap-4">
        <div className="z-10 min-w-0 flex-1">
          <span ref={fromRef} className="font-display block w-fit text-sm font-bold text-neon-cyan">
            Fleet Balance
          </span>
          <span className="mt-0.5 block font-mono text-[0.72rem] text-foreground/90">
            {included.length} miner{included.length === 1 ? "" : "s"}
          </span>
          <span className="mt-0.5 block font-mono text-[0.72rem] text-neon-cyan">{total.toFixed(2)} TH/s</span>
        </div>

        <div className="mt-0.5 flex shrink-0 flex-col items-start gap-2.5">
          {/* Headings sit above fixed-width columns, so the figures stay under
              them as they change. */}
          <span className="flex items-center gap-2 text-[0.62rem] tracking-[0.14em] text-foreground uppercase">
            <span className="size-1.5 shrink-0" />
            <span className="w-16" />
            <span className="w-20 text-center">Allocated</span>
            <span className="w-20 text-center">Current</span>
          </span>
          {coins.map((sym, i) => {
            const app = appFor(sym);
            const on = (minersOn[sym] ?? 0) > 0;
            const t = target[sym] ?? 0;
            const a = total > 0 ? ((actual[sym] ?? 0) / total) * 100 : 0;
            return (
              <span key={sym} className="z-10 flex items-center gap-2">
                <span
                  ref={nodeRefs[i]}
                  className="size-1.5 shrink-0 rounded-full"
                  style={{
                    background: on ? (app?.color ?? "var(--neon-cyan)") : "var(--foreground)",
                    boxShadow: on ? `0 0 8px ${app?.color ?? "var(--neon-cyan)"}` : undefined,
                    animation: on ? "pulse-glow 2.4s ease-in-out infinite" : undefined,
                  }}
                />
                <span
                  className="w-16 truncate text-[0.75rem] font-semibold"
                  style={{ color: on ? (app?.color ?? "var(--foreground)") : "var(--foreground)" }}
                >
                  {app?.ticker ?? sym}
                </span>
                <span className="w-20 text-center font-mono text-[0.7rem] text-foreground/90">
                  {Math.round(t)}%
                </span>
                <span className="w-20 text-center font-mono text-[0.7rem] text-neon-cyan">
                  {Math.round(a)}%
                </span>
              </span>
            );
          })}
        </div>

        {coins.map((sym, i) => {
          const app = appFor(sym);
          const on = (minersOn[sym] ?? 0) > 0;
          const colour = app?.color ?? "var(--neon-cyan)";
          return (
            <AnimatedBeam
              key={`fleet-beam-${sym}`}
              containerRef={containerRef}
              fromRef={fromRef}
              toRef={nodeRefs[i]}
              duration={3}
              pathColor={on ? "#4c566a" : "#ffffff"}
              pathOpacity={on ? 0.5 : 0.18}
              pathWidth={1.5}
              gradientStartColor={on ? colour : "#8b93a7"}
              gradientStopColor={on ? "var(--neon-cyan)" : "#8b93a7"}
              startXOffset={52}
              endXOffset={-8}
            />
          );
        })}
      </div>

      {!mesh.system_target && (
        <p className="mt-3 text-[0.7rem] text-foreground/90">No target set - select to choose a split.</p>
      )}
    </button>
  );
}

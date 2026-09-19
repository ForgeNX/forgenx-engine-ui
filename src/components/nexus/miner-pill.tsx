import { useRef } from "react";
import { Link2Off } from "lucide-react";
import { AnimatedBeam } from "./animated-beam";
import { parseAllocation, type MeshMiner } from "@/lib/forge-api";
import type { ForgeApp } from "./nexus-data";

// One miner, with a beam to each node it is allocated to. The node it is mining
// right now carries the travelling gradient in that coin's colour; the rest are
// plain white lines, so a glance tells you where the hashrate actually is rather
// than only where it is allowed to go.
//
// Its own component so each pill owns its refs — beams need a ref per endpoint,
// and hooks cannot be called in a loop.
export function MinerPill({
  apps,
  coins,
  miner,
  selected,
  onSelect,
}: {
  apps: ForgeApp[];
  coins: string[];
  miner: MeshMiner;
  selected: boolean;
  onSelect: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fromRef = useRef<HTMLSpanElement>(null);
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

  const appFor = (sym: string) => apps.find((a) => a.id.toUpperCase() === sym.toUpperCase());
  const alloc = parseAllocation(miner.assignment);
  const active = miner.active_coin.toUpperCase();

  // Nodes this miner actually routes to: its allocation, or the one it is mining
  // when it has no allocation of its own.
  const routed = coins
    .map((c) => c.toUpperCase())
    .filter((sym) => (miner.assigned ? (alloc[sym] ?? 0) > 0 : sym === active))
    .slice(0, nodeRefs.length);

  const hashrate = (th: number) =>
    th >= 1000 ? `${(th / 1000).toFixed(2)} PH/s` : `${th.toFixed(2)} TH/s`;

  // "bitaxe/BM1370/v2.15.1" reads better as "Bitaxe BM1370"; the firmware version
  // is noise at this size.
  const device = (raw: string) => {
    if (!raw) return "";
    const [name = "", chip = ""] = raw.split("/").filter(Boolean);
    const titled = name.charAt(0).toUpperCase() + name.slice(1);
    return chip ? `${titled} ${chip}` : titled;
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="rounded-xl border p-4 text-left transition hover:-translate-y-0.5"
      style={{
        borderColor: selected ? "var(--neon-cyan)" : "var(--border)",
        background: selected
          ? "color-mix(in oklab, var(--neon-cyan) 7%, transparent)"
          : "color-mix(in oklab, var(--secondary) 25%, transparent)",
      }}
    >
      <div ref={containerRef} className="relative flex items-center gap-4">
        {/* Left: who the miner is. The beam starts here, so it has to sit inside
            the same container the beams measure against. */}
        <div className="z-10 min-w-0 flex-1">
          <span ref={fromRef} className="font-display block w-fit truncate text-sm font-bold">
            {miner.worker}
          </span>
          <span className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            {miner.connected ? (
              <span className="font-mono text-[0.72rem] text-neon-cyan">
                {hashrate(miner.hashrate_15m)}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
                <Link2Off className="size-3" />
                offline
              </span>
            )}
            <span className="text-[0.7rem] text-foreground/90">{device(miner.device)}</span>
          </span>
          <span className="mt-0.5 block font-mono text-[0.7rem] text-muted-foreground">
            {miner.ip}
          </span>
        </div>

        {/* Right: the nodes it routes to. */}
        <div className="flex shrink-0 flex-col items-start gap-2.5">
          {routed.map((sym, i) => {
            const app = appFor(sym);
            const isActive = active === sym;
            return (
              <span key={sym} ref={nodeRefs[i]} className="z-10 flex items-center gap-2">
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{
                    background: isActive ? (app?.color ?? "var(--neon-cyan)") : "var(--foreground)",
                    boxShadow: isActive ? `0 0 8px ${app?.color ?? "var(--neon-cyan)"}` : undefined,
                    animation: isActive ? "pulse-glow 2.4s ease-in-out infinite" : undefined,
                  }}
                />
                <span
                  className="text-[0.75rem] font-semibold"
                  style={{ color: isActive ? (app?.color ?? "var(--foreground)") : "var(--foreground)" }}
                >
                  {app?.ticker ?? sym}
                </span>
                {miner.assigned && (
                  <span className="font-mono text-[0.7rem] text-foreground/90">
                    {alloc[sym] ?? 0}%
                  </span>
                )}
              </span>
            );
          })}
          {routed.length === 0 && (
            <span className="text-[0.7rem] text-muted-foreground">no node allocated</span>
          )}
        </div>

        {routed.map((sym, i) => {
          const app = appFor(sym);
          const isActive = active === sym;
          const colour = app?.color ?? "var(--neon-cyan)";
          return (
            <AnimatedBeam
              key={`beam-${miner.worker}-${sym}`}
              containerRef={containerRef}
              fromRef={fromRef}
              toRef={nodeRefs[i]}
              duration={3}
              pathColor={isActive ? "#4c566a" : "#ffffff"}
              pathOpacity={isActive ? 0.5 : 0.18}
              pathWidth={1.5}
              gradientStartColor={isActive ? colour : "#8b93a7"}
              gradientStopColor={isActive ? "var(--neon-cyan)" : "#8b93a7"}
              // A warm node is genuinely live — connected, authorized and taking
              // jobs — so its beam keeps moving rather than going dead. It runs
              // dimmer than the active one, in step with it, so the bright beam
              // reads as where the hashrate actually is.
              repeat={Infinity}
              // Measured from the node label's centre: stop in front of its
              // status dot instead of running through the ticker.
              // Both offsets are measured from the element's centre: start just past
              // the end of the worker name, stop in front of the node's status dot.
              startXOffset={46}
              endXOffset={-52}
            />
          );
        })}
      </div>
    </button>
  );
}

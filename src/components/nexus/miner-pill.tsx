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
// 115806 -> "115.8K".
function compactDiff(n: number): string {
  const units = ["", "K", "M", "G", "T"];
  let i = 0;
  while (n >= 1000 && i < units.length - 1) {
    n /= 1000;
    i++;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)}${units[i]}`;
}

// Which figure a miner's hashrate came from. The miner's own is exact from its
// first second; the relay's is inferred from the shares it has submitted; a
// coin's average is a last resort while the others are unavailable. Saying so
// explains why a number here can differ from the one on a coin's own screen.
const SOURCE_LABEL: Record<string, string> = {
  miner: "from miner",
  mesh: "at relay",
  coin: "coin avg",
};

export function MinerPill({
  apps,
  coins,
  miner,
  selected,
  onSelect,
  onToggleSystem,
}: {
  apps: ForgeApp[];
  coins: string[];
  miner: MeshMiner;
  selected: boolean;
  onSelect: () => void;
  onToggleSystem?: (on: boolean) => void;
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
  // A System Mesh miner's allocation is just "AUTO": the balancer decides the
  // coin, so the beam goes to wherever it has actually put the miner.
  const isAuto = miner.assignment === "AUTO";
  const routed = coins
    .map((c) => c.toUpperCase())
    .filter((sym) => (miner.assigned && !isAuto ? (alloc[sym] ?? 0) > 0 : sym === active))
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
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-pressed={selected}
      className="cursor-pointer rounded-xl border p-4 text-left transition hover:-translate-y-0.5"
      style={{
        borderColor: selected ? "var(--neon-cyan)" : "var(--border)",
        background: selected
          ? "color-mix(in oklab, var(--neon-cyan) 7%, transparent)"
          : "color-mix(in oklab, var(--secondary) 25%, transparent)",
      }}
    >
      <div ref={containerRef} className="relative flex items-start gap-4">
        {/* Left: who the miner is. The beam starts here, so it has to sit inside
            the same container the beams measure against. */}
        <div className="z-10 min-w-0 flex-1">
          <span ref={fromRef} className="font-display block w-fit truncate text-sm font-bold">
            {miner.worker}
          </span>
          <span className="mt-0.5 block whitespace-pre-wrap font-mono text-[0.7rem] text-foreground/90">
            Device: {miner.model || device(miner.device) || "unknown"}<span className="mx-3">-</span>IP:{" "}
            <span className="font-mono text-foreground">{miner.ip || "—"}</span>
          </span>
          <span className="mt-0.5 block whitespace-pre-wrap font-mono text-[0.7rem] text-foreground/90">
            Hashrate:{" "}
            {miner.connected ? (
              <>
                <span className="text-[0.72rem] text-neon-cyan">{hashrate(miner.hashrate_15m)}</span>
                {SOURCE_LABEL[miner.hashrate_source ?? ""] && (
                  <span className="text-muted-foreground">
                    {" "}
                    ({SOURCE_LABEL[miner.hashrate_source ?? ""]})
                  </span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">offline</span>
            )}
            {"  -  "}Asic: {(miner.asic_temp ?? 0) > 0 ? `${Math.round(miner.asic_temp ?? 0)}°` : "—"}
            {(miner.asic_temp_max ?? 0) > 0 && ` / ${Math.round(miner.asic_temp_max ?? 0)}° max`}
            {"  -  "}VR: {(miner.vr_temp ?? 0) > 0 ? `${Math.round(miner.vr_temp ?? 0)}°` : "—"}
          </span>
          {(miner.difficulty ?? 0) > 0 && (
            <span className="mt-0.5 block whitespace-pre-wrap font-mono text-[0.7rem] text-foreground/90">
              Difficulty (current): {compactDiff(miner.difficulty ?? 0)}
              {(miner.next_difficulty ?? 0) > 0 && (
                <>
                  {"  -  "}Next: <span className="text-neon-gold">{compactDiff(miner.next_difficulty ?? 0)}</span>
                </>
              )}
            </span>
          )}
          <span className="mt-1 flex flex-wrap items-baseline gap-2 font-mono text-[0.72rem]">
            <span className="text-[0.6rem] tracking-[0.14em] text-foreground/90 uppercase">Shares:</span>
            <span style={{ color: "var(--neon-green)" }}>{miner.shares_accepted ?? 0} accepted</span>
            <span className="text-foreground/50">/</span>
            <span style={{ color: (miner.shares_rejected ?? 0) > 0 ? "#ff0080" : "var(--foreground)" }}>
            {miner.shares_rejected ?? 0} rejected
            </span>
            <span className="text-foreground/50">/</span>
            <span style={{ color: (miner.shares_stale ?? 0) > 0 ? "var(--neon-gold)" : "var(--foreground)" }}>
            {miner.shares_stale ?? 0} stale
            </span>
            {(miner.shares_lost ?? 0) > 0 && (
              <>
                <span className="text-foreground/50">·</span>
                <span className="text-muted-foreground">{miner.shares_lost} lost to reconnect</span>
              </>
            )}
          </span>
        </div>

        {/* Right: the nodes it routes to. */}
        {/* Top-aligned, and nudged to sit level with the worker name: centring
            would move a node up or down depending on how many there are, so the
            beam's endpoint would shift as the allocation changed. */}
        <div className="mt-0.5 flex shrink-0 flex-col items-start gap-2.5">
          {routed.map((sym, i) => {
            const app = appFor(sym);
            const isActive = active === sym;
            return (
              <span key={sym} className="z-10 flex items-center gap-2">
                <span
                  ref={nodeRefs[i]}
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
                    {isAuto ? "Fleet" : `${alloc[sym] ?? 0}%`}
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
              // Offsets are from each element's centre. The end anchors on the
              // status dot rather than the whole label, because the label's width
              // moves with its ticker and percentage — an offset from that centre
              // drifts as the allocation changes.
              startXOffset={46}
              endXOffset={-8}
            />
          );
        })}
      </div>

      {onToggleSystem && (
        <span className="mt-2 flex items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={miner.assignment === "AUTO"}
            aria-label={`Include ${miner.worker} in Fleet Balance`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSystem(miner.assignment !== "AUTO");
            }}
            className="relative h-4 w-7 shrink-0 rounded-full border transition"
            style={{
              borderColor: miner.assignment === "AUTO" ? "var(--neon-cyan)" : "var(--border)",
              background:
                miner.assignment === "AUTO"
                  ? "color-mix(in oklab, var(--neon-cyan) 25%, transparent)"
                  : "var(--secondary)",
            }}
          >
            <span
              className="absolute top-1/2 size-2.5 -translate-y-1/2 rounded-full transition-all"
              style={{
                left: miner.assignment === "AUTO" ? "calc(100% - 0.8rem)" : "0.15rem",
                background: miner.assignment === "AUTO" ? "var(--neon-cyan)" : "var(--muted-foreground)",
              }}
            />
          </button>
          <span className="text-[0.75rem] text-foreground/90">Fleet Balance</span>
        </span>
      )}
    </div>
  );
}

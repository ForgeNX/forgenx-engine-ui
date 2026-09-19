import { useEffect, useState } from "react";
import { Lock, LockOpen } from "lucide-react";
import {
  assignMeshWorker,
  formatAllocation,
  parseAllocation,
  type MeshMiner,
  type MeshStatus,
} from "@/lib/forge-api";
import type { ForgeApp } from "./nexus-data";

// Allocating a miner across nodes. The percentages always total 100, so moving
// one slider has to take the difference from somewhere: it comes out of the
// unpinned nodes, in proportion to what they already hold. A node the user has
// pinned keeps its share and is excluded from that redistribution, which means a
// slider can only move as far as the unpinned nodes can absorb — with everything
// else pinned it cannot move at all, and unpinning is how you make room.
export function MeshAllocator({
  apps,
  mesh,
  miner,
  refresh,
}: {
  apps: ForgeApp[];
  mesh: MeshStatus | null;
  miner: MeshMiner | null;
  refresh: () => void;
}) {
  const coins = (mesh?.coins ?? []).map((c) => c.toUpperCase());
  const [pcts, setPcts] = useState<Record<string, number>>({});
  const [pinned, setPinned] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  // Re-seed when the selected miner changes. Pins are a working state for this
  // editing session, not something the engine stores, so they reset with it.
  useEffect(() => {
    if (!miner) return;
    const existing = parseAllocation(miner.assignment);
    const seeded: Record<string, number> = {};
    for (const c of coins) seeded[c] = existing[c] ?? 0;
    // An unassigned miner has nothing stored; show it as everything on the coin
    // it is actually mining rather than as a blank slate.
    if (!miner.assigned && miner.active_coin) {
      for (const c of coins) seeded[c] = c === miner.active_coin.toUpperCase() ? 100 : 0;
    }
    setPcts(seeded);
    setPinned({});
    setNote("");
  }, [miner?.worker, miner?.assignment, mesh?.coins.join(",")]);

  if (!miner) {
    return (
      <section className="panel-neon animate-rise flex min-h-[200px] flex-col items-center justify-center p-5 text-center">
        <p className="text-xs font-semibold tracking-[0.26em] text-muted-foreground uppercase">
          No miner selected
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a miner to set how its hashrate is shared across nodes.
        </p>
      </section>
    );
  }

  const appFor = (sym: string) => apps.find((a) => a.id.toUpperCase() === sym);
  const total = Object.values(pcts).reduce((s, n) => s + n, 0);

  // How much the unpinned, non-dragged nodes can give up or take on.
  const headroom = (coin: string) => {
    const others = coins.filter((c) => c !== coin && !pinned[c]);
    const givable = others.reduce((s, c) => s + (pcts[c] ?? 0), 0);
    const takeable = others.length * 100 - givable;
    return { max: (pcts[coin] ?? 0) + givable, min: Math.max(0, (pcts[coin] ?? 0) - takeable) };
  };

  const setCoin = (coin: string, value: number) => {
    const { min, max } = headroom(coin);
    const next = Math.max(min, Math.min(max, Math.round(value)));
    const delta = next - (pcts[coin] ?? 0);
    if (delta === 0) return;

    const others = coins.filter((c) => c !== coin && !pinned[c]);
    const pool = others.reduce((s, c) => s + (pcts[c] ?? 0), 0);
    const updated = { ...pcts, [coin]: next };

    // Take the difference proportionally, so a node already carrying more gives
    // up more. When they are all at zero and we are giving back, spread evenly.
    let remaining = -delta;
    others.forEach((c, i) => {
      const last = i === others.length - 1;
      const share = pool > 0 ? (pcts[c] ?? 0) / pool : 1 / others.length;
      const amount = last ? remaining : Math.round(-delta * share);
      updated[c] = Math.max(0, Math.min(100, (pcts[c] ?? 0) + amount));
      remaining -= amount;
    });
    setPcts(updated);
  };

  const solo = (coin: string) => {
    const next: Record<string, number> = {};
    for (const c of coins) next[c] = c === coin ? 100 : 0;
    setPcts(next);
    setPinned({});
    save(next);
  };

  const save = async (values?: Record<string, number>) => {
    const body = values ?? pcts;
    setBusy(true);
    const res = await assignMeshWorker(miner.worker, formatAllocation(body));
    setNote(res.applied ? "Applied" : res.note);
    setTimeout(() => setNote(""), 6000);
    setBusy(false);
    refresh();
  };

  return (
    <section className="panel-neon animate-rise flex flex-col p-5">
      <header className="flex items-center gap-3">
        <span
          className="h-4 w-1 animate-pulse-glow rounded-full"
          style={{ background: "var(--neon-cyan)", boxShadow: "0 0 12px var(--neon-cyan)" }}
        />
        <h2 className="text-xs font-semibold tracking-[0.26em] text-neon-cyan uppercase">
          {miner.worker}
        </h2>
      </header>

      <p className="mt-3 text-sm leading-relaxed text-foreground/90">
        How this miner's time is shared across nodes. Pin a node to hold its share while you adjust
        the others.
      </p>

      <div className="mt-4 flex flex-col gap-4">
        {coins.map((sym) => {
          const app = appFor(sym);
          const pct = pcts[sym] ?? 0;
          const isPinned = Boolean(pinned[sym]);
          const { min, max } = headroom(sym);
          const fixed = coins.length < 2 || min === max;
          return (
            <div key={sym} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md text-sm font-bold"
                  style={{ color: app?.color }}
                >
                  {app?.icon ? (
                    <img src={app.icon} alt={app.ticker} className="size-full object-contain" />
                  ) : (
                    sym
                  )}
                </span>
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{
                    background: app?.online ? "var(--neon-green)" : "var(--muted-foreground)",
                    boxShadow: app?.online ? "0 0 8px var(--neon-green)" : undefined,
                    animation: app?.online ? "pulse-glow 2.4s ease-in-out infinite" : undefined,
                  }}
                />
                <span className="min-w-0 flex-1">
                  <span className="font-display block truncate text-sm font-semibold tracking-wide">
                    {app?.ticker ?? sym}
                  </span>
                  <span className="block truncate text-[0.6rem] text-foreground/90">
                    {app?.chain ?? ""}
                  </span>
                </span>
                <span
                  className="w-10 shrink-0 text-right font-mono text-sm font-semibold"
                  style={{ color: pct > 0 ? app?.color : "var(--muted-foreground)" }}
                >
                  {pct}%
                </span>
                <button
                  type="button"
                  aria-pressed={isPinned}
                  disabled={busy}
                  onClick={() => setPinned((p) => ({ ...p, [sym]: !p[sym] }))}
                  className="flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[0.65rem] font-semibold transition disabled:opacity-40"
                  style={{
                    borderColor: isPinned ? "var(--neon-cyan)" : "var(--border)",
                    color: isPinned ? "var(--neon-cyan)" : "var(--foreground)",
                  }}
                >
                  {isPinned ? <Lock className="size-3" /> : <LockOpen className="size-3" />}
                  {isPinned ? "Pinned" : "Pin"}
                </button>
                <button
                  type="button"
                  aria-pressed={pct === 100}
                  disabled={busy || pct === 100}
                  onClick={() => solo(sym)}
                  className="shrink-0 rounded-lg border px-2 py-1 text-[0.65rem] font-semibold transition disabled:opacity-100"
                  style={
                    pct === 100
                      ? {
                          borderColor: app?.color,
                          color: "var(--foreground)",
                          background: `color-mix(in oklab, ${app?.color ?? "var(--neon-cyan)"} 15%, transparent)`,
                          boxShadow: `0 0 10px color-mix(in oklab, ${app?.color ?? "var(--neon-cyan)"} 45%, transparent)`,
                        }
                      : { borderColor: "var(--border)", color: "var(--foreground)" }
                  }
                >
                  Solo
                </button>
              </div>

              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={pct}
                disabled={busy || isPinned || fixed}
                onChange={(e) => setCoin(sym, Number(e.target.value))}
                onMouseUp={() => save()}
                onTouchEnd={() => save()}
                onKeyUp={() => save()}
                className="w-full accent-[var(--neon-cyan)] disabled:opacity-40"
                aria-label={`${app?.ticker ?? sym} share`}
              />
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[0.7rem] text-foreground/90">
        Total {Math.round(total)}%
        {note ? ` — ${note}` : ""}
      </p>
    </section>
  );
}

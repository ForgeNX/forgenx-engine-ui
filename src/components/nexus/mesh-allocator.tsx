import { useEffect, useState } from "react";
import { Lock, LockOpen } from "lucide-react";
import { AuroraText } from "./aurora-text";
import {
  assignMeshWorker,
  formatAllocation,
  parseAllocation,
  setMeshPins,
  setMeshSystemTarget,
  type MeshMiner,
  type MeshStatus,
} from "@/lib/forge-api";
import type { ForgeApp } from "./nexus-data";

// Allocating hashrate across nodes, for one miner or for the whole System Mesh.
// The percentages always total 100, so moving one slider takes the difference
// from the unpinned nodes in proportion to what they hold. A pinned node keeps
// its share and is left out of that, so a slider only moves as far as the rest
// can absorb - with everything else pinned it cannot move, and unpinning makes
// room.
//
// A miner in the System Mesh is locked here: the balancer places it, and
// editing it by hand would only be undone on the next round.
export function MeshAllocator({
  apps,
  mesh,
  miner,
  system = false,
  refresh,
}: {
  apps: ForgeApp[];
  mesh: MeshStatus | null;
  miner: MeshMiner | null;
  system?: boolean;
  refresh: () => void;
}) {
  const coins = (mesh?.coins ?? []).map((c) => c.toUpperCase());
  const [pcts, setPcts] = useState<Record<string, number>>({});
  const [pinned, setPinned] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const locked = !system && miner?.assignment === "AUTO";
  const source = system ? mesh?.system_target ?? "" : miner?.assignment ?? "";
  // Pins are saved on the engine, per miner and for Fleet Balance.
  const pinWorker = system ? "__system__" : miner?.worker ?? "";
  const pinSource = (system ? mesh?.system_pins : miner?.pins) ?? [];
  const pinKey = pinSource.join(",");
  const togglePin = (sym: string) => {
    const before = pinned;
    const next = { ...pinned, [sym]: !pinned[sym] };
    setPinned(next);
    if (pinWorker) {
      setMeshPins(pinWorker, Object.keys(next).filter((c) => next[c])).then((ok) => {
        // A pin the engine did not keep is put back, so what is shown is what holds.
        if (!ok) {
          setPinned(before);
          setNote("could not save the pin");
          setTimeout(() => setNote(""), 6000);
        }
        refresh();
      });
    }
  };
  // Only the keys that move a slider save it; Tab or Shift on the way past do not.
  const SLIDER_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"]);

  useEffect(() => {
    if (!system && !miner) return;
    const existing = parseAllocation(source);
    const seeded: Record<string, number> = {};
    for (const c of coins) seeded[c] = existing[c] ?? 0;
    const total = Object.values(seeded).reduce((s, n) => s + n, 0);
    if (total === 0) {
      if (system) {
        // No target yet: start from an even split.
        const even = Math.floor(100 / Math.max(coins.length, 1));
        coins.forEach((c, i) => (seeded[c] = i === 0 ? 100 - even * (coins.length - 1) : even));
      } else if (miner?.active_coin) {
        for (const c of coins) seeded[c] = c === miner.active_coin.toUpperCase() ? 100 : 0;
      }
    }
    setPcts(seeded);
    const seededPins: Record<string, boolean> = {};
    for (const c of pinSource) seededPins[c.toUpperCase()] = true;
    setPinned(seededPins);
    setNote("");
  }, [system, miner?.worker, source, pinKey, mesh?.coins.join(",")]);

  if (!system && !miner) {
    return (
      <section className="panel-neon animate-rise flex min-h-[200px] flex-col items-center justify-center p-5 text-center">
        <p className="text-xs font-semibold tracking-[0.26em] text-muted-foreground uppercase">No miner selected</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a miner, or Fleet Balance, to set how hashrate is shared across nodes.
        </p>
      </section>
    );
  }

  const appFor = (sym: string) => apps.find((a) => a.id.toUpperCase() === sym);
  const total = Object.values(pcts).reduce((s, n) => s + n, 0);

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

  const save = async (values?: Record<string, number>) => {
    const body = values ?? pcts;
    setBusy(true);
    if (system) {
      const res = await setMeshSystemTarget(formatAllocation(body));
      setNote(res.ok ? "Target saved - the balancer will move miners gradually" : res.error ?? "could not save");
    } else if (miner) {
      const res = await assignMeshWorker(miner.worker, formatAllocation(body));
      setNote(res.applied ? "Applied" : res.note);
    }
    setTimeout(() => setNote(""), 6000);
    setBusy(false);
    refresh();
  };

  const solo = (coin: string) => {
    const next: Record<string, number> = {};
    for (const c of coins) next[c] = c === coin ? 100 : 0;
    setPcts(next);
    setPinned({});
    if (pinWorker) setMeshPins(pinWorker, []);
    save(next);
  };

  return (
    <section className="panel-neon animate-rise flex flex-col p-5">
      <header className="flex items-center gap-3">
        <span
          className="h-4 w-1 animate-pulse-glow rounded-full"
          style={{ background: "var(--neon-cyan)", boxShadow: "0 0 12px var(--neon-cyan)" }}
        />
        <h2 className="text-xs font-semibold tracking-[0.26em] text-neon-cyan uppercase">
          {system ? "Fleet Balance" : miner?.worker}
        </h2>
      </header>

      <p className="mt-3 text-sm leading-relaxed text-foreground/90">
        {system
          ? "The share of the included miners' combined hashrate each node gets. Whole miners are moved between nodes to get close to it, a few at a time."
          : locked
            ? "This miner is in Fleet Balance, which decides where it mines. Take it out of Fleet Balance to set its allocation here."
            : "How this miner's time is shared across nodes. Pin a node to hold its share while you adjust the others."}
      </p>

      <div className="mt-4 flex flex-col gap-4" style={{ opacity: locked ? 0.45 : 1 }}>
        {coins.map((sym) => {
          const app = appFor(sym);
          const pct = pcts[sym] ?? 0;
          const isPinned = Boolean(pinned[sym]);
          const { min, max } = headroom(sym);
          const fixed = coins.length < 2 || min === max;
          const colour = app?.color ?? "var(--neon-cyan)";
          return (
            <div key={sym} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md text-sm font-bold"
                  style={{ color: colour }}
                >
                  {app?.icon ? <img src={app.icon} alt={app.ticker} className="size-full object-contain" /> : sym}
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
                    {app ? (
                      <AuroraText colors={[app.color, "#7928CA", "#38bdf8", app.color]}>
                        {app.ticker}
                      </AuroraText>
                    ) : (
                      sym
                    )}
                  </span>
                  <span className="block truncate text-[0.6rem] text-foreground/90">{app?.chain ?? ""}</span>
                </span>
                <span
                  className="w-10 shrink-0 text-right font-mono text-sm font-semibold"
                  style={{ color: pct > 0 ? colour : "var(--muted-foreground)" }}
                >
                  {pct}%
                </span>
                <button
                  type="button"
                  aria-pressed={isPinned}
                  disabled={busy || locked}
                  onClick={() => togglePin(sym)}
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
                  disabled={busy || locked || pct === 100}
                  onClick={() => solo(sym)}
                  className="shrink-0 rounded-lg border px-2 py-1 text-[0.65rem] font-semibold transition disabled:opacity-100"
                  style={
                    pct === 100
                      ? {
                          borderColor: colour,
                          color: "var(--foreground)",
                          background: `color-mix(in oklab, ${colour} 15%, transparent)`,
                          boxShadow: `0 0 10px color-mix(in oklab, ${colour} 45%, transparent)`,
                        }
                      : { borderColor: "var(--border)", color: "var(--foreground)", opacity: locked ? 0.4 : 1 }
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
                // A pinned slider is left enabled so the browser draws it in colour, and
                // refuses input instead: a disabled range input is always drawn grey.
                disabled={busy || locked || (fixed && !isPinned)}
                aria-disabled={isPinned || undefined}
                tabIndex={isPinned ? -1 : undefined}
                style={isPinned && !locked ? { pointerEvents: "none" } : undefined}
                onChange={(e) => {
                  if (!isPinned) setCoin(sym, Number(e.target.value));
                }}
                onMouseUp={() => save()}
                onTouchEnd={() => save()}
                onKeyUp={(e) => {
                  if (SLIDER_KEYS.has(e.key)) save();
                }}
                className="w-full accent-[var(--neon-cyan)] disabled:opacity-40"
                aria-label={`${app?.ticker ?? sym} share`}
              />
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[0.7rem] text-foreground/90">
        Total {Math.round(total)}%{note ? ` - ${note}` : ""}
      </p>
    </section>
  );
}

import { parseAllocation, type MeshStatus } from "@/lib/forge-api";
import type { ForgeApp } from "./nexus-data";

// The System Mesh, shown as a miner of its own at the top of the list: every
// included miner combined. Each node shows its target share beside the share it
// is actually getting, so it's visible how close the balancer has it.
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
  const included = mesh.miners.filter((m) => m.assignment === "AUTO" && m.connected);
  const total = included.reduce((s, m) => s + (m.hashrate_15m || 0), 0);
  const target = parseAllocation(mesh.system_target ?? "");
  const actual: Record<string, number> = {};
  for (const m of included) {
    const c = m.active_coin.toUpperCase();
    actual[c] = (actual[c] ?? 0) + (m.hashrate_15m || 0);
  }
  const appFor = (sym: string) => apps.find((a) => a.id.toUpperCase() === sym);

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
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-display text-sm font-bold text-neon-cyan">System Mesh</span>
        <span className="font-mono text-[0.72rem] text-foreground/90">
          {included.length} miner{included.length === 1 ? "" : "s"} · {total.toFixed(2)} TH/s
        </span>
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        {mesh.coins.map((c) => {
          const sym = c.toUpperCase();
          const app = appFor(sym);
          const t = target[sym] ?? 0;
          const a = total > 0 ? ((actual[sym] ?? 0) / total) * 100 : 0;
          return (
            <span key={sym} className="flex items-center gap-2 text-[0.75rem]">
              <span className="size-1.5 rounded-full" style={{ background: app?.color ?? "var(--foreground)" }} />
              <span className="w-24 font-semibold" style={{ color: app?.color ?? "var(--foreground)" }}>
                {app?.ticker ?? sym}
              </span>
              <span className="font-mono text-foreground/90">target {Math.round(t)}%</span>
              <span className="font-mono text-muted-foreground">· now {Math.round(a)}%</span>
            </span>
          );
        })}
      </div>
      {!mesh.system_target && (
        <p className="mt-3 text-[0.7rem] text-foreground/90">No target set - select to choose a split.</p>
      )}
    </button>
  );
}

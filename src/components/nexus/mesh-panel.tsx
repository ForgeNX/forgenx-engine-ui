import { Share2, Link2Off } from "lucide-react";
import { parseAllocation, type MeshStatus } from "@/lib/forge-api";
import type { ForgeApp } from "./nexus-data";

// One pill per meshed miner. Selecting a pill hands it to the allocator, so this
// panel only describes — it does not change anything itself.
export function MeshPanel({
  apps,
  mesh,
  loading,
  selected,
  onSelect,
}: {
  apps: ForgeApp[];
  mesh: MeshStatus | null;
  loading: boolean;
  selected: string | null;
  onSelect: (worker: string | null) => void;
}) {
  const appFor = (sym: string) => apps.find((a) => a.id.toUpperCase() === sym.toUpperCase());

  const hashrate = (th: number) =>
    th >= 1000 ? `${(th / 1000).toFixed(2)} PH/s` : `${th.toFixed(2)} TH/s`;

  // "bitaxe/BM1370/v2.15.1" reads better as "Bitaxe BM1370" — the firmware
  // version is noise at pill size.
  const device = (raw: string) => {
    if (!raw) return "";
    const parts = raw.split("/").filter(Boolean);
    const name = parts[0] ?? "";
    const chip = parts[1] ?? "";
    const titled = name.charAt(0).toUpperCase() + name.slice(1);
    return chip ? `${titled} ${chip}` : titled;
  };

  if (loading && !mesh) {
    return (
      <section className="panel-neon animate-rise flex min-h-[300px] flex-col items-center justify-center gap-3 p-5 text-center">
        <span className="size-2 rounded-full bg-neon-cyan" style={{ animation: "pulse-glow 2s ease-in-out infinite" }} />
        <p className="font-display text-2xl font-bold tracking-[0.12em] uppercase">Reading mesh</p>
      </section>
    );
  }

  if (!mesh?.enabled) {
    return (
      <section className="panel-neon animate-rise flex min-h-[300px] flex-col items-center justify-center gap-3 p-5 text-center">
        <p className="font-display text-2xl font-bold tracking-[0.12em] uppercase">Mesh disabled</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Set <span className="font-mono text-[0.78rem] text-neon-cyan">MESH_ENABLED=true</span> to bond one miner
          to several nodes at once, with automatic failover when a node goes offline.
        </p>
      </section>
    );
  }

  return (
    <section className="panel-neon animate-rise flex flex-col p-5">
      <header className="flex items-center gap-3">
        <Share2 className="size-4 text-neon-cyan" />
        <h2 className="text-xs font-semibold tracking-[0.26em] text-neon-cyan uppercase">Meshed miners</h2>
      </header>

      <p className="mt-3 text-sm leading-relaxed text-foreground/90">
        Point a miner at <span className="font-mono text-[0.78rem] text-neon-cyan">port {mesh.port}</span> and it
        bonds to {mesh.coins.join(", ")} together, mining one and holding the rest warm. Select a miner to set how
        its hashrate is shared.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {mesh.miners.length === 0 ? (
          <div className="py-6 text-sm text-muted-foreground">
            No miners on the mesh yet. Point one at port {mesh.port} to begin.
          </div>
        ) : (
          mesh.miners.map((m) => {
            const isSelected = selected === m.worker;
            const alloc = parseAllocation(m.assignment);
            const active = m.active_coin.toUpperCase();
            return (
              <button
                key={m.worker}
                type="button"
                onClick={() => onSelect(isSelected ? null : m.worker)}
                aria-pressed={isSelected}
                className="rounded-xl border p-4 text-left transition hover:-translate-y-0.5"
                style={{
                  borderColor: isSelected ? "var(--neon-cyan)" : "var(--border)",
                  background: isSelected
                    ? "color-mix(in oklab, var(--neon-cyan) 7%, transparent)"
                    : "color-mix(in oklab, var(--secondary) 25%, transparent)",
                }}
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-display text-sm font-bold">{m.worker}</span>
                  {m.connected ? (
                    <span className="font-mono text-[0.72rem] text-neon-cyan">
                      {hashrate(m.hashrate_15m)}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
                      <Link2Off className="size-3" />
                      offline
                    </span>
                  )}
                  <span className="text-[0.7rem] text-foreground/90">{device(m.device)}</span>
                  <span className="font-mono text-[0.7rem] text-muted-foreground">{m.ip}</span>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
                  {mesh.coins.map((c) => {
                    const sym = c.toUpperCase();
                    const app = appFor(sym);
                    const share = alloc[sym];
                    const isActive = active === sym;
                    return (
                      <span key={c} className="flex items-center gap-1.5">
                        <span
                          className="size-1.5 rounded-full"
                          style={{
                            background: isActive ? (app?.color ?? "var(--neon-cyan)") : "var(--muted-foreground)",
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
                        {m.assigned && share !== undefined && (
                          <span className="font-mono text-[0.7rem] text-muted-foreground">{share}%</span>
                        )}
                      </span>
                    );
                  })}
                  {!m.assigned && (
                    <span className="text-[0.7rem] text-muted-foreground">following default</span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}

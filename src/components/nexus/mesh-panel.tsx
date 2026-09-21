import { Share2, Link2Off } from "lucide-react";
import { assignMeshWorker, type MeshStatus } from "@/lib/forge-api";
import { MinerPill } from "./miner-pill";
import { SystemMeshPill, SYSTEM_ID } from "./system-mesh-pill";
import type { ForgeApp } from "./nexus-data";

// One pill per meshed miner. Selecting a pill hands it to the allocator, so this
// panel only describes — it does not change anything itself.
export function MeshPanel({
  apps,
  mesh,
  loading,
  selected,
  onSelect,
  refresh,
}: {
  apps: ForgeApp[];
  mesh: MeshStatus | null;
  loading: boolean;
  selected: string | null;
  onSelect: (worker: string | null) => void;
  refresh: () => void;
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
        <SystemMeshPill
          apps={apps}
          mesh={mesh}
          selected={selected === SYSTEM_ID}
          onSelect={() => onSelect(selected === SYSTEM_ID ? null : SYSTEM_ID)}
        />
        {mesh.miners.length === 0 ? (
          <div className="py-6 text-sm text-muted-foreground">
            No miners on the mesh yet. Point one at port {mesh.port} to begin.
          </div>
        ) : (
          mesh.miners.map((m) => (
            <MinerPill
              key={m.worker}
              apps={apps}
              coins={mesh.coins}
              miner={m}
              selected={selected === m.worker}
              onSelect={() => onSelect(selected === m.worker ? null : m.worker)}
              onToggleSystem={async (on) => {
                // Out of the System Mesh, a miner is pinned where it is rather
                // than jumping anywhere.
                const here = (m.active_coin || mesh.coins[0] || "").toUpperCase();
                await assignMeshWorker(m.worker, on ? "AUTO" : `${here}:100`);
                refresh();
              }}
            />
          ))
        )}
      </div>
    </section>
  );
}

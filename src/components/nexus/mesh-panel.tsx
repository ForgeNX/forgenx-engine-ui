import { Share2, Link2Off } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  assignMeshWorker,
  fetchMeshSettings,
  saveMeshSettings,
  type MeshMiner,
  type MeshStatus,
} from "@/lib/forge-api";
import { MinerPill } from "./miner-pill";
import { SystemMeshPill, SYSTEM_ID } from "./system-mesh-pill";
import { MeshOverviewPill } from "./mesh-overview-pill";
import type { ForgeApp } from "./nexus-data";

// One pill per meshed miner. Selecting a pill hands it to the allocator, so this
// panel only describes — it does not change anything itself.

type SortKey = "name" | "hashrate" | "device" | "node" | "fleet";

const SORTS: { key: SortKey; label: string; first: "asc" | "desc" }[] = [
  { key: "name", label: "Name", first: "asc" },
  { key: "hashrate", label: "Hashrate", first: "desc" },
  { key: "device", label: "Device", first: "asc" },
  { key: "node", label: "Node", first: "asc" },
  { key: "fleet", label: "Fleet", first: "desc" },
];

// Sorts by the chosen key, always falling back to the name so equal miners
// never swap places between polls. The direction applies to the key only.
function sortMiners(list: MeshMiner[], spec: string): MeshMiner[] {
  const [key, dir] = spec.split(":");
  const sign = dir === "desc" ? -1 : 1;
  const byName = (a: MeshMiner, b: MeshMiner) =>
    a.worker.localeCompare(b.worker, undefined, { numeric: true, sensitivity: "base" });
  const primary: Record<string, (a: MeshMiner, b: MeshMiner) => number> = {
    name: byName,
    hashrate: (a, b) => (a.hashrate_15m || 0) - (b.hashrate_15m || 0),
    device: (a, b) => (a.model || a.device || "~").localeCompare(b.model || b.device || "~"),
    node: (a, b) => (a.active_coin || "~").localeCompare(b.active_coin || "~"),
    fleet: (a, b) => Number(a.assignment === "AUTO") - Number(b.assignment === "AUTO"),
  };
  const cmp = primary[key] ?? byName;
  // Offline miners fall to the bottom whatever the sort, and return to their
  // place as soon as they reconnect - the list is sorted afresh on every poll.
  return [...list].sort(
    (a, b) => Number(!a.connected) - Number(!b.connected) || sign * cmp(a, b) || byName(a, b),
  );
}

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
  // How the miner list is sorted, saved on the engine like the other Nexus
  // settings so it holds across reloads, restarts and devices.
  const [sort, setSort] = useState("name:asc");
  // Set once the user picks a sort, so the saved one arriving late does not
  // overwrite their choice.
  const sortChosen = useRef(false);
  useEffect(() => {
    fetchMeshSettings().then((st) => {
      if (st?.miner_sort && !sortChosen.current) setSort(st.miner_sort);
    });
  }, []);
  const chooseSort = (key: SortKey, first: "asc" | "desc") => {
    const [cur, dir] = sort.split(":");
    const next = cur === key ? `${key}:${dir === "asc" ? "desc" : "asc"}` : `${key}:${first}`;
    sortChosen.current = true;
    setSort(next);
    saveMeshSettings({ miner_sort: next });
  };
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
        {mesh.coins.length < 2 && (
          <div className="rounded-xl border p-3" style={{ borderColor: "var(--neon-gold)", background: "color-mix(in oklab, var(--neon-gold) 6%, transparent)" }}>
            <p className="text-[0.75rem] leading-relaxed text-foreground">
              <span className="text-neon-gold">ⓘ Note:</span> The mesh is carrying one node, so there is
              nothing for it to do yet - no second node to fail over to, and nothing to allocate between.
              Install another node and miners on the mesh will be bonded to both.
            </p>
          </div>
        )}

        <MeshOverviewPill apps={apps} overview={mesh.overview} />
        <SystemMeshPill
          apps={apps}
          mesh={mesh}
          selected={selected === SYSTEM_ID}
          onSelect={() => onSelect(selected === SYSTEM_ID ? null : SYSTEM_ID)}
        />
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          <span className="mr-1 text-[0.6rem] font-semibold tracking-[0.18em] text-foreground/90 uppercase">Sort</span>
          {SORTS.map((o) => {
            const [cur, dir] = sort.split(":");
            const on = cur === o.key;
            return (
              <button
                key={o.key}
                type="button"
                aria-pressed={on}
                onClick={() => chooseSort(o.key, o.first)}
                className="rounded-md border px-2 py-0.5 text-[0.65rem] font-semibold transition"
                style={{
                  borderColor: on ? "var(--neon-cyan)" : "var(--border)",
                  color: on ? "var(--neon-cyan)" : "var(--foreground)",
                }}
              >
                {o.label}
                {on && (dir === "asc" ? " ↑" : " ↓")}
              </button>
            );
          })}
        </div>
        {mesh.miners.length === 0 ? (
          <div className="py-6 text-sm text-muted-foreground">
            No miners on the mesh yet. Point one at port {mesh.port} to begin.
          </div>
        ) : (
          sortMiners(mesh.miners, sort).map((m) => (
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
                const res = await assignMeshWorker(m.worker, on ? "AUTO" : `${here}:100`);
                refresh();
                return res.ok;
              }}
            />
          ))
        )}
      </div>
    </section>
  );
}

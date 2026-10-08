import { useMemo, useState } from "react";
import { Cpu, FileText, Home, Info, Network, Settings, Share2 } from "lucide-react";

import { HashrateChart } from "./hashrate-chart";
import { HashrateDistribution } from "./distribution";
import { NodeDetail } from "./node-detail";
import { NodeStatus } from "./node-status";
import { LogsPanel } from "./logs-panel";
import { InformationPanel } from "./information-panel";
import { MeshPanel } from "./mesh-panel";
import { MeshDefault } from "./mesh-default";
import { MeshSettings } from "./mesh-settings";
import { MeshRotation } from "./mesh-rotation";
import { MeshAllocator } from "./mesh-allocator";
import { MeshActivityPanel } from "./mesh-activity";
import { EngineControls } from "./engine-controls";
import { SettingsPanel } from "./settings-panel";
import { WorkersPanel } from "./workers-panel";
import { NodesPanel } from "./nodes-panel";
import { StatPills } from "./stat-pills";

// True when the page is shown inside another page (ForgeNX's engine window).
// Reading window.top from a different origin can throw, which also means embedded.
const EMBEDDED = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();
import { NEXUS_TABS, type NexusTab } from "./nexus-data";
import { useForgeApps } from "@/hooks/use-forge-apps";
import { useEngineInfo, useEngineStatus, useCoinSV2List } from "@/hooks/use-engine-meta";
import { useMeshStatus } from "@/hooks/use-mesh-status";
import { useFoundMiners, useHashrateView } from "@/hooks/use-miners-view";
import { buildWorkerRows } from "./workers-data";
import { FLEET_WORKER, type MeshActivity } from "@/lib/forge-api";

const TAB_ICONS: Record<NexusTab, typeof Home> = {
  Overview: Home,
  Miners: Cpu,
  Nodes: Network,
  Nexus: Share2,
  Settings: Settings,
  Information: Info,
  Logs: FileText,
};

export function NexusShell() {
  const [tab, setTab] = useState<NexusTab>("Overview");
  const { apps, fleet, loading } = useForgeApps();
  const engineInfo = useEngineInfo();
  const { mesh, loading: meshLoading, error: meshError, updatedAt: meshUpdatedAt, refresh: refreshMesh } = useMeshStatus();
  // Each miner's own readings and the Live / Avg choice, shared by the Miners
  // tab and the Overview's Total hashrate so the two always show the same figure.
  const found = useFoundMiners();
  const [minersView, setMinersView] = useHashrateView();
  const minerRows = useMemo(() => buildWorkerRows(apps, mesh, found, minersView), [apps, mesh, found, minersView]);
  const minersHashrate = minerRows.summary.hashrate;
  // Per node: the miners mining it now and their hashrate, from the same rows.
  // A meshed miner holds a session on every node it is bonded to, but mines only
  // one, so it is counted once, on that one.
  // A miner opened from the Nodes tab: the Miners tab selects it on arrival.
  const [minerFocus, setMinerFocus] = useState<{ key: string; n: number } | null>(null);
  const openMiner = (key: string) => {
    setMinerFocus((f) => ({ key, n: (f?.n ?? 0) + 1 }));
    setTab("Miners");
  };
  // A node opened from the Overview tab: the Nodes tab shows it on arrival.
  const [nodeFocus, setNodeFocus] = useState<string | null>(null);
  const openNode = (id: string) => {
    setNodeFocus(id);
    setTab("Nodes");
  };
  const perNode = useMemo(() => {
    const out: Record<string, { miners: number; ths: number }> = {};
    for (const r of minerRows.rows) {
      if (!r.online || !r.coin) continue;
      const n = (out[r.coin] ??= { miners: 0, ths: 0 });
      n.miners += 1;
      n.ths += r.hashrate;
    }
    return out;
  }, [minerRows]);
  // Found blocks join the mesh's own events, in time order, so the activity
  // record says when a block landed among the switches around it.
  const activity: MeshActivity[] = [
    ...(mesh?.activity ?? []),
    ...(mesh?.found_blocks ?? []).map((b) => ({
      at: b.at,
      kind: "block" as const,
      worker: b.worker,
      to: b.coin,
      detail: `#${b.height.toLocaleString()}`,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  // Which miner the allocator is editing. Held by name rather than by object so
  // it survives the status poll replacing the list.
  const [selectedMiner, setSelectedMiner] = useState<string | null>(null);
  const activeMiner = (mesh?.miners ?? []).find((m) => m.worker === selectedMiner) ?? null;
  // Selecting a miner narrows the activity panels to its history; Fleet Balance
  // is not a miner, so selecting it leaves them showing everything.
  const historyFor = selectedMiner && selectedMiner !== FLEET_WORKER ? selectedMiner : null;
  const { uptime: engineUptime, online: engineOnline } = useEngineStatus();
  // The header badge says what the engine is actually doing: checking until its
  // first answer, then online or offline from the 5s stats poll.
  const status =
    engineOnline === null
      ? { label: "Checking", color: "var(--muted-foreground)", pulse: false }
      : engineOnline
        ? { label: "Online", color: "var(--neon-green)", pulse: true }
        : { label: "Offline", color: "var(--neon-pink)", pulse: false };
  const { coins: sv2Coins, refresh: refreshSV2 } = useCoinSV2List();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Default the selection to the first coin once data arrives.
  const selected = apps.find((a) => a.id === selectedId) ?? apps[0] ?? null;

  return (
    // overflow: clip rather than the panel's hidden, so it still clips its corners
    // but is not a scroll container: a sticky panel inside (the Miners detail)
    // then holds its place as the page scrolls.
    <div
      className="panel-neon relative m-2 flex min-h-[calc(100vh-1rem)] flex-col md:m-4"
      style={{
        overflow: "clip",
        // A steady neon edge, only when the page is the whole window: inside
        // ForgeNX's engine window, the window draws it on its own outer edge.
        ...(EMBEDDED
          ? {}
          : {
              border: "1.5px solid color-mix(in oklab, var(--neon-cyan) 75%, transparent)",
              boxShadow:
                "0 24px 60px -30px oklch(0.05 0 0 / 0.9), 0 0 16px -4px color-mix(in oklab, var(--neon-cyan) 70%, transparent)",
            }),
      }}
    >
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--neon-cyan), var(--neon-pink), var(--neon-gold), transparent)",
        }}
      />

      <header className="flex flex-wrap items-center gap-3 border-b border-border/60 px-4 py-3">
        <span
          className="relative flex size-10 shrink-0 items-center justify-center rounded-xl border border-neon-cyan/50"
          style={{ boxShadow: "0 0 22px -6px var(--neon-cyan)" }}
        >
          <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
            <path
              d="M12 2.5 21 19.5H3L12 2.5Z"
              fill="none"
              stroke="var(--neon-cyan)"
              strokeWidth="1.6"
              strokeLinejoin="round"
              style={{ filter: "drop-shadow(0 0 6px var(--neon-cyan))" }}
            />
            <circle
              cx="12"
              cy="13"
              r="2.4"
              fill="var(--neon-cyan)"
              style={{ animation: "pulse-glow 2.6s ease-in-out infinite", transformOrigin: "12px 13px" }}
            />
          </svg>
        </span>
        <h1 className="sr-only">ForgeNX Nexus mining control centre</h1>

        <nav aria-label="Sections" className="mx-auto flex flex-1 items-center justify-center gap-1 overflow-x-auto">
          {NEXUS_TABS.map((item, i) => {
            const Icon = TAB_ICONS[item];
            const active = item === tab;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                aria-current={active ? "page" : undefined}
                className="group relative flex items-center gap-2 px-3.5 pt-2 pb-2.5 text-sm font-semibold whitespace-nowrap transition-colors duration-300 hover:text-foreground"
                style={{
                  color: active ? "var(--neon-cyan)" : "var(--foreground)",
                  animation: `rise 0.5s cubic-bezier(0.22,1,0.36,1) ${i * 45}ms both`,
                }}
              >
                <Icon className="size-4" />
                {item}
                {/* The open section is underlined (a faint line on hover). */}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-3 bottom-0 h-0.5 rounded-full transition-opacity duration-300 ${active ? "" : "opacity-0 group-hover:opacity-100"}`}
                  style={
                    active
                      ? { background: "var(--neon-cyan)", boxShadow: "0 0 10px var(--neon-cyan)" }
                      : { background: "color-mix(in oklab, var(--muted-foreground) 35%, transparent)" }
                  }
                />
              </button>
            );
          })}
        </nav>

        <span
          role="status"
          aria-label={`Engine ${status.label.toLowerCase()}`}
          className="flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.6rem] font-semibold tracking-[0.16em] uppercase"
          style={{
            color: status.color,
            borderColor: `color-mix(in oklab, ${status.color} 55%, transparent)`,
            boxShadow: `0 0 14px -4px ${status.color}`,
          }}
        >
          <span
            className="size-1.5 rounded-full"
            style={{
              background: status.color,
              animation: status.pulse ? "pulse-glow 2.2s ease-in-out infinite" : undefined,
            }}
          />
          {status.label}
        </span>
        <EngineControls />
      </header>

      <div className="grid-backdrop flex-1 space-y-4 p-3 md:p-4">
        {tab === "Overview" ? (
          loading && apps.length === 0 ? (
            <div className="panel-neon animate-rise flex min-h-[300px] flex-col items-center justify-center gap-3 p-10 text-center">
              <span
                className="size-2 rounded-full bg-neon-cyan"
                style={{ animation: "pulse-glow 2s ease-in-out infinite" }}
              />
              <p className="font-display text-2xl font-bold tracking-[0.12em] uppercase">Connecting</p>
              <p className="text-sm text-muted-foreground">Reading live engine telemetry…</p>
            </div>
          ) : selected ? (
            <>
              <StatPills apps={apps} fleet={fleet} hashrateThs={minersHashrate} />
              <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.2fr)_minmax(0,1.25fr)]">
                <NodeStatus apps={apps} selectedId={selected.id} onSelect={setSelectedId} onViewNode={openNode} />
                <NodeDetail app={selected} />
                <HashrateDistribution apps={apps} perNode={perNode} selectedId={selected.id} onSelect={setSelectedId} />
              </div>
              <HashrateChart app={selected} poolThs={perNode[selected.id.toUpperCase()]?.ths ?? 0} view={minersView} />
            </>
          ) : (
            <div className="panel-neon animate-rise flex min-h-[300px] flex-col items-center justify-center gap-3 p-10 text-center">
              <p className="font-display text-2xl font-bold tracking-[0.12em] uppercase">No coins installed</p>
              <p className="text-sm text-muted-foreground">Install a coin app to begin.</p>
            </div>
          )
        ) : tab === "Logs" ? (
          <div className="flex h-[calc(100vh-9rem)] flex-col">
            <LogsPanel />
          </div>
        ) : tab === "Information" ? (
          <InformationPanel coinCount={apps.length} info={engineInfo} uptime={engineUptime} />
        ) : tab === "Nexus" ? (
          // Three columns at 2xl: settings, miners, then activity and the allocator.
          // Narrower, the miners lead: at xl they take the wide left column with
          // the rest beside them, and in one column they come first, with the
          // allocator straight after so a selected miner's sliders are in view.
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)]">
            <div className="order-3 flex flex-col gap-4 xl:col-start-2 xl:row-start-2 xl:self-start 2xl:order-none 2xl:col-start-1 2xl:row-start-1 2xl:self-auto">
              <MeshDefault apps={apps} mesh={mesh} refresh={refreshMesh} />
              <MeshRotation apps={apps} mesh={mesh} refresh={refreshMesh} />
              <MeshSettings />
            </div>
            <div className="order-1 flex flex-col *:flex-1 xl:col-start-1 xl:row-span-2 xl:row-start-1 2xl:order-none 2xl:col-start-2 2xl:row-span-1">
              <MeshPanel
                apps={apps}
                refresh={refreshMesh}
                mesh={mesh}
                loading={meshLoading}
                stale={meshError !== null && mesh !== null}
                updatedAt={meshUpdatedAt}
                selected={selectedMiner}
                onSelect={setSelectedMiner}
              />
            </div>
            <div className="order-2 flex flex-col gap-4 xl:col-start-2 xl:row-start-1 xl:self-start 2xl:order-none 2xl:col-start-3 2xl:row-start-1 2xl:self-auto">
              <MeshActivityPanel apps={apps} activity={activity} worker={historyFor} />
              <MeshActivityPanel apps={apps} activity={activity} worker={historyFor} fleetOnly />
              <div className="order-first 2xl:order-none">
                <MeshAllocator apps={apps} mesh={mesh} miner={activeMiner} system={selectedMiner === FLEET_WORKER} refresh={refreshMesh} />
              </div>
            </div>
          </div>
        ) : tab === "Miners" ? (
          <WorkersPanel
            apps={apps}
            mesh={mesh}
            found={found}
            view={minersView}
            onViewChange={setMinersView}
            focus={minerFocus}
          />
        ) : tab === "Nodes" ? (
          <NodesPanel
            apps={apps}
            rows={minerRows.rows}
            view={minersView}
            onViewChange={setMinersView}
            onOpenMiner={openMiner}
            initialId={nodeFocus}
          />
        ) : tab === "Settings" ? (
          <SettingsPanel coins={sv2Coins} refresh={refreshSV2} />
        ) : (
          <div className="panel-neon animate-rise flex min-h-[300px] flex-col items-center justify-center gap-3 p-10 text-center">
            <span
              className="size-2 rounded-full bg-neon-pink"
              style={{ animation: "pulse-glow 2s ease-in-out infinite" }}
            />
            <p className="font-display text-2xl font-bold tracking-[0.12em] uppercase">{tab}</p>
            <p className="text-sm text-muted-foreground">Panel streaming — no data bound yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
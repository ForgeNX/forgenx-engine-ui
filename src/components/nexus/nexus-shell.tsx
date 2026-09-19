import { useState } from "react";
import { ChevronDown, FileText, Home, Info, Network, Settings, Share2, Users } from "lucide-react";

import { HashrateChart } from "./hashrate-chart";
import { HashrateDistribution } from "./distribution";
import { NodeDetail } from "./node-detail";
import { NodeStatus } from "./node-status";
import { LogsPanel } from "./logs-panel";
import { InformationPanel } from "./information-panel";
import { MeshPanel } from "./mesh-panel";
import { MeshDefault } from "./mesh-default";
import { MeshRotation } from "./mesh-rotation";
import { MeshAllocator } from "./mesh-allocator";
import { EngineControls } from "./engine-controls";
import { SettingsPanel } from "./settings-panel";
import { StatPills } from "./stat-pills";
import { NEXUS_TABS, type NexusTab } from "./nexus-data";
import { useForgeApps } from "@/hooks/use-forge-apps";
import { useEngineInfo, useEngineUptime, useCoinSV2List } from "@/hooks/use-engine-meta";
import { useMeshStatus } from "@/hooks/use-mesh-status";

const TAB_ICONS: Record<NexusTab, typeof Home> = {
  Overview: Home,
  Workers: Users,
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
  const { mesh, loading: meshLoading, refresh: refreshMesh } = useMeshStatus();
  // Which miner the allocator is editing. Held by name rather than by object so
  // it survives the status poll replacing the list.
  const [selectedMiner, setSelectedMiner] = useState<string | null>(null);
  const activeMiner = (mesh?.miners ?? []).find((m) => m.worker === selectedMiner) ?? null;
  const engineUptime = useEngineUptime();
  const { coins: sv2Coins, refresh: refreshSV2 } = useCoinSV2List();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Default the selection to the first coin once data arrives.
  const selected = apps.find((a) => a.id === selectedId) ?? apps[0] ?? null;

  return (
    <div className="panel-neon relative m-2 flex min-h-[calc(100vh-1rem)] flex-col md:m-4">
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
                className="relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition-all duration-300 hover:text-foreground"
                style={{
                  color: active ? "var(--neon-cyan)" : "var(--foreground)",
                  background: active ? "color-mix(in oklab, var(--neon-cyan) 14%, transparent)" : undefined,
                  border: `1px solid ${active ? "color-mix(in oklab, var(--neon-cyan) 55%, transparent)" : "transparent"}`,
                  boxShadow: active ? "0 0 22px -8px var(--neon-cyan)" : undefined,
                  animation: `rise 0.5s cubic-bezier(0.22,1,0.36,1) ${i * 45}ms both`,
                }}
              >
                <Icon className="size-4" />
                {item}
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold tracking-[0.14em] uppercase"
          style={{
            color: "var(--neon-green)",
            borderColor: "color-mix(in oklab, var(--neon-green) 50%, transparent)",
            boxShadow: "0 0 20px -8px var(--neon-green)",
          }}
        >
          <span
            className="size-1.5 rounded-full bg-neon-green"
            style={{ animation: "pulse-glow 2.2s ease-in-out infinite" }}
          />
          Online
          <ChevronDown className="size-3.5" />
        </button>
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
              <StatPills apps={apps} fleet={fleet} />
              <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.2fr)_minmax(0,1.25fr)]">
                <NodeStatus apps={apps} selectedId={selected.id} onSelect={setSelectedId} />
                <NodeDetail app={selected} />
                <HashrateDistribution apps={apps} selectedId={selected.id} onSelect={setSelectedId} />
              </div>
              <HashrateChart app={selected} />
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
          <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)]">
            <MeshDefault apps={apps} mesh={mesh} refresh={refreshMesh} />
            <MeshPanel
              apps={apps}
              mesh={mesh}
              loading={meshLoading}
              refresh={refreshMesh}
              selected={selectedMiner}
              onSelect={setSelectedMiner}
            />
            <div className="flex flex-col gap-4">
              <MeshAllocator apps={apps} mesh={mesh} miner={activeMiner} refresh={refreshMesh} />
              <MeshRotation mesh={mesh} refresh={refreshMesh} />
            </div>
          </div>
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
import { useState } from "react";
import { ChevronDown, FileText, Home, Info, Network, Settings, Share2, Users } from "lucide-react";

import { HashrateChart } from "./hashrate-chart";
import { HashrateDistribution } from "./distribution";
import { NodeDetail } from "./node-detail";
import { NodeStatus } from "./node-status";
import { StatPills } from "./stat-pills";
import { FORGE_APPS, NEXUS_TABS, type NexusTab } from "./nexus-data";

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
  const [selectedId, setSelectedId] = useState(FORGE_APPS[0]!.id);
  const selected = FORGE_APPS.find((a) => a.id === selectedId) ?? FORGE_APPS[0]!;

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
                  color: active ? "var(--neon-cyan)" : "var(--muted-foreground)",
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
      </header>

      <div className="grid-backdrop flex-1 space-y-4 p-3 md:p-4">
        {tab === "Overview" ? (
          <>
            <StatPills />
            <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.2fr)_minmax(0,1.25fr)]">
              <NodeStatus apps={FORGE_APPS} selectedId={selectedId} onSelect={setSelectedId} />
              <NodeDetail app={selected} />
              <HashrateDistribution apps={FORGE_APPS} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
            <HashrateChart />
          </>
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
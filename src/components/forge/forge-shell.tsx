import { useState } from "react";
import { MoreVertical, X } from "lucide-react";

import { FORGE_TABS } from "./forge-data";
import { MiningStatus, NetworkStrip, NodeHealth, ReadinessChecks } from "./forge-panels";

export function ForgeShell() {
  const [tab, setTab] = useState<string>("Overview");

  return (
    <div className="panel-neon relative m-3 md:m-6">
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--neon-cyan), var(--neon-pink), var(--neon-gold), transparent)",
        }}
      />

      <header className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
        <span
          className="flex size-9 items-center justify-center rounded-full border border-neon-cyan/60 font-display text-xs font-bold text-neon-cyan animate-pulse-glow"
          style={{ boxShadow: "0 0 18px color-mix(in oklab, var(--neon-cyan) 55%, transparent)" }}
        >
          DGB
        </span>
        <h1 className="font-display text-lg font-bold tracking-[0.14em] uppercase glow-text text-neon-cyan">
          ForgeDGB
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <span
            className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.18em] uppercase"
            style={{
              borderColor: "color-mix(in oklab, var(--neon-green) 60%, transparent)",
              color: "var(--neon-green)",
              boxShadow: "0 0 16px color-mix(in oklab, var(--neon-green) 35%, transparent)",
            }}
          >
            <span className="size-1.5 rounded-full bg-neon-green animate-pulse-glow" />
            Online
          </span>
          <button
            type="button"
            aria-label="More options"
            className="flex size-8 items-center justify-center rounded-lg border border-border/70 transition-colors duration-300 hover:border-neon-violet hover:text-neon-violet"
          >
            <MoreVertical className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-lg border border-border/70 transition-colors duration-300 hover:border-neon-pink hover:text-neon-pink"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-border/60 px-3">
        {FORGE_TABS.map((item, i) => {
          const active = item === tab;
          return (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              aria-current={active ? "page" : undefined}
              className="relative whitespace-nowrap px-3 py-3 text-sm font-semibold tracking-wide transition-colors duration-300"
              style={{
                color: active ? "var(--neon-cyan)" : "var(--muted-foreground)",
                animation: `rise 0.5s cubic-bezier(0.22,1,0.36,1) ${i * 45}ms both`,
              }}
            >
              {item}
              <span
                className="absolute inset-x-2 bottom-0 h-0.5 origin-left rounded-full transition-transform duration-300"
                style={{
                  background: "linear-gradient(90deg, var(--neon-cyan), var(--neon-pink))",
                  boxShadow: active ? "0 0 12px var(--neon-cyan)" : undefined,
                  transform: active ? "scaleX(1)" : "scaleX(0)",
                }}
              />
            </button>
          );
        })}
      </nav>

      <div className="grid-backdrop space-y-4 p-4">
        {tab === "Overview" ? (
          <>
            <div className="grid gap-4 xl:grid-cols-3">
              <ReadinessChecks />
              <MiningStatus />
              <NodeHealth />
            </div>
            <NetworkStrip />
          </>
        ) : (
          <div className="panel-neon animate-rise flex min-h-[240px] flex-col items-center justify-center gap-2 p-10 text-center">
            <span className="size-2 rounded-full bg-neon-pink animate-pulse-glow" />
            <p className="font-display text-2xl font-bold tracking-[0.12em] uppercase">{tab}</p>
            <p className="text-sm text-muted-foreground">Panel streaming — no data bound yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
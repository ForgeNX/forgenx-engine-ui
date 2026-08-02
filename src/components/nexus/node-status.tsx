import { ArrowRight, Boxes } from "lucide-react";

import { InstallRing } from "./install-ring";
import type { ForgeApp } from "./nexus-data";

export function NodeStatus({
  apps,
  selectedId,
  onSelect,
}: {
  apps: ForgeApp[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="panel-neon animate-rise flex flex-col p-5">
      <header className="flex items-center gap-3">
        <span
          className="h-4 w-1 rounded-full animate-pulse-glow"
          style={{ background: "var(--neon-cyan)", boxShadow: "0 0 12px var(--neon-cyan)" }}
        />
        <h2 className="text-xs font-semibold tracking-[0.26em] text-neon-cyan uppercase">Node status</h2>
      </header>

      <div className="mt-4 grid items-center gap-4 sm:grid-cols-[150px_minmax(0,1fr)]">
        <InstallRing apps={apps} selectedId={selectedId} />

        <ul className="space-y-2">
          {apps.map((app, i) => {
            const active = app.id === selectedId;
            return (
              <li key={app.id} style={{ animation: `rise 0.6s cubic-bezier(0.22,1,0.36,1) ${i * 55}ms both` }}>
                <button
                  type="button"
                  onClick={() => onSelect(app.id)}
                  aria-current={active ? "true" : undefined}
                  className="group flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-all duration-300 hover:-translate-y-0.5"
                  style={{
                    borderColor: active
                      ? `color-mix(in oklab, ${app.color} 70%, transparent)`
                      : "color-mix(in oklab, var(--border) 90%, transparent)",
                    background: active
                      ? `color-mix(in oklab, ${app.color} 12%, transparent)`
                      : "color-mix(in oklab, var(--secondary) 40%, transparent)",
                    boxShadow: active
                      ? `0 0 22px -6px color-mix(in oklab, ${app.color} 65%, transparent)`
                      : undefined,
                    opacity: app.installed ? 1 : 0.55,
                  }}
                >
                  <span
                    className="font-display flex size-8 shrink-0 items-center justify-center rounded-lg border text-sm font-bold transition-transform duration-300 group-hover:scale-110"
                    style={{
                      color: app.color,
                      borderColor: `color-mix(in oklab, ${app.color} 55%, transparent)`,
                      background: `color-mix(in oklab, ${app.color} 14%, transparent)`,
                      boxShadow: app.installed
                        ? `0 0 14px color-mix(in oklab, ${app.color} 45%, transparent)`
                        : undefined,
                    }}
                  >
                    {app.symbol}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="font-display block truncate text-sm font-semibold tracking-wide"
                      style={{
                        color: app.installed ? "var(--foreground)" : "var(--muted-foreground)",
                      }}
                    >
                      {app.ticker}
                    </span>
                    <span className="block truncate text-[0.66rem] text-muted-foreground">{app.chain}</span>
                  </span>
                  <span
                    className="flex shrink-0 items-center gap-1.5 text-[0.68rem] font-semibold"
                    style={{ color: app.installed ? "var(--neon-green)" : "var(--muted-foreground)" }}
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{
                        background: app.installed ? "var(--neon-green)" : "var(--muted-foreground)",
                        boxShadow: app.installed ? "0 0 8px var(--neon-green)" : undefined,
                        animation: app.installed ? "pulse-glow 2.4s ease-in-out infinite" : undefined,
                      }}
                    />
                    <span className="hidden 2xl:inline">{app.installed ? "Online" : "Not installed"}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <button
        type="button"
        className="group mt-5 flex items-center justify-center gap-2 rounded-xl border border-border/70 py-2.5 text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase transition-colors duration-300 hover:border-neon-cyan hover:text-neon-cyan"
      >
        <Boxes className="size-3.5" />
        View all nodes
        <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
      </button>
    </section>
  );
}
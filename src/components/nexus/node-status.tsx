import { ArrowRight, Boxes } from "lucide-react";
import { useRef } from "react";
import { InstallRing } from "./install-ring";
import { AnimatedBeam } from "./animated-beam";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<HTMLDivElement>(null);
  const r0 = useRef<HTMLButtonElement>(null);
  const r1 = useRef<HTMLButtonElement>(null);
  const r2 = useRef<HTMLButtonElement>(null);
  const r3 = useRef<HTMLButtonElement>(null);
  const r4 = useRef<HTMLButtonElement>(null);
  const r5 = useRef<HTMLButtonElement>(null);
  const r6 = useRef<HTMLButtonElement>(null);
  const r7 = useRef<HTMLButtonElement>(null);
  const rowRefs = [r0, r1, r2, r3, r4, r5, r6, r7];

  return (
    <section className="panel-neon animate-rise flex flex-col p-5">
      <header className="flex items-center gap-3">
        <span
          className="h-4 w-1 rounded-full animate-pulse-glow"
          style={{ background: "var(--neon-cyan)", boxShadow: "0 0 12px var(--neon-cyan)" }}
        />
        <h2 className="text-xs font-semibold tracking-[0.26em] text-neon-cyan uppercase">Node status</h2>
      </header>

      <div
        ref={containerRef}
        className="relative mt-4 flex items-stretch gap-2"
      >
        {/* Left: install ring (fixed width so it doesn't collapse as a flex child) */}
        <div className="flex w-[149px] shrink-0 flex-col justify-center">
          <InstallRing apps={apps} selectedId={selectedId} />
        </div>

        {/* Middle: ForgeNX Engine hub node */}
        <div className="ml-[5rem] flex flex-col justify-center">
          <div ref={engineRef} className="z-10 flex items-center gap-2">
            <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden">
              <img src="/Engine.png" alt="ForgeNX Engine" className="size-full object-contain" />
            </span>
            <span className="font-display text-left text-sm leading-tight font-semibold tracking-wide text-foreground">
              ForgeNX
              <br />
              Engine
            </span>
          </div>
        </div>

        {/* Right: compact coin nodes, stacked + right-aligned */}
        <div className="ml-auto flex flex-col justify-center gap-4">
          {apps.map((app, i) => {
            const active = app.id === selectedId;
            return (
              <button
                key={app.id}
                ref={rowRefs[i]}
                type="button"
                onClick={() => onSelect(app.id)}
                aria-current={active ? "true" : undefined}
                className="group z-10 flex items-center justify-start gap-2 text-left transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  opacity: app.installed ? 1 : 0.5,
                }}
              >
                <span
                  className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md text-sm font-bold transition-transform duration-300 group-hover:scale-110"
                  style={{ color: app.color }}
                >
                  {app.icon ? (
                    <img src={app.icon} alt={app.ticker} className="size-full object-contain" />
                  ) : (
                    app.symbol
                  )}
                </span>
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{
                    background: app.installed ? "var(--neon-green)" : "var(--muted-foreground)",
                    boxShadow: app.installed ? "0 0 8px var(--neon-green)" : undefined,
                    animation: app.installed ? "pulse-glow 2.4s ease-in-out infinite" : undefined,
                  }}
                />
                <span className="min-w-0">
                  <span
                    className="font-display block truncate text-sm font-semibold tracking-wide transition-colors duration-300"
                    style={{
                      color: active ? app.color : app.installed ? "var(--foreground)" : "var(--muted-foreground)",
                      textShadow: active ? `0 0 12px color-mix(in oklab, ${app.color} 60%, transparent)` : undefined,
                    }}
                  >
                    {app.ticker}
                  </span>
                  <span className="block truncate text-[0.6rem] text-foreground/90">{app.chain}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Beams: engine hub -> each coin node. No delay (all fire together, per demo). */}
        {apps.map((app, i) =>
          app.online ? (
          <AnimatedBeam
            key={`beam-${app.id}`}
            containerRef={containerRef}
            fromRef={engineRef}
            toRef={rowRefs[i]}
            duration={3}
            pathColor="#4c566a"
            pathOpacity={0.5}
            pathWidth={1.5}
            gradientStartColor={app.color}
            gradientStopColor="var(--neon-cyan)"
            startXOffset={-10}
            endXOffset={-56}
          />
          ) : null
        )}
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

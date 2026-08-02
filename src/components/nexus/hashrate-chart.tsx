import { useState } from "react";

import { useLiveSeries } from "@/hooks/use-live-series";

import { TIME_WINDOWS, type NexusWindow } from "./nexus-data";

const WIDTH = 900;
const HEIGHT = 220;
const Y_TICKS = [80, 60, 40, 20, 0];

function path(values: number[], min = 0.15, span = 0.7) {
  const step = WIDTH / Math.max(1, values.length - 1);
  return values.map((v, i) => {
    const y = HEIGHT - ((min + v * span) * HEIGHT);
    return `${(i * step).toFixed(1)},${y.toFixed(1)}`;
  });
}

export function HashrateChart() {
  const [window_, setWindow] = useState<NexusWindow>("15m");
  const current = useLiveSeries(21, 26, 1500, 0.7);
  const average = useLiveSeries(77, 26, 1500, 0.5);

  const series = [
    { id: "avg", label: "Average (5m)", color: "var(--neon-pink)", values: average, min: 0.42, span: 0.42, badge: "50.85 TH/s", value: "50.85 TH/s" },
    { id: "cur", label: `Current (${window_})`, color: "var(--neon-cyan)", values: current, min: 0.14, span: 0.34, badge: "36.79 TH/s", value: "36.79 TH/s" },
  ];

  return (
    <section className="panel-neon animate-rise p-5" style={{ animationDelay: "200ms" }}>
      <header className="flex flex-wrap items-center gap-4">
        <h2 className="text-xs font-semibold tracking-[0.26em] text-foreground/90 uppercase">Hashrate over time</h2>
        <div className="flex gap-1 rounded-xl border border-border/70 bg-secondary/40 p-1">
          {TIME_WINDOWS.map((w) => {
            const active = w === window_;
            return (
              <button
                key={w}
                type="button"
                onClick={() => setWindow(w)}
                className="rounded-lg px-3 py-1 text-xs font-semibold transition-all duration-300"
                style={{
                  color: active ? "var(--neon-cyan)" : "var(--muted-foreground)",
                  background: active ? "color-mix(in oklab, var(--neon-cyan) 16%, transparent)" : undefined,
                  boxShadow: active ? "0 0 18px -6px var(--neon-cyan)" : undefined,
                }}
              >
                {w}
              </button>
            );
          })}
        </div>
      </header>

      <div className="mt-5 grid gap-5 lg:grid-cols-[150px_minmax(0,1fr)]">
        <ul className="space-y-4">
          {[...series].reverse().map((s) => (
            <li key={s.id}>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <span
                  className="size-2 rounded-full"
                  style={{
                    background: s.color,
                    boxShadow: `0 0 10px ${s.color}`,
                    animation: "pulse-glow 2.4s ease-in-out infinite",
                  }}
                />
                {s.label}
              </p>
              <p className="font-display mt-1 text-xl font-bold tabular-nums" style={{ color: s.color }}>
                {s.value}
              </p>
            </li>
          ))}
        </ul>

        <div className="min-w-0">
          <div className="flex gap-2">
            <ul className="flex h-[220px] w-14 shrink-0 flex-col justify-between text-right font-mono text-[0.6rem] whitespace-nowrap text-muted-foreground">
              {Y_TICKS.map((t) => (
                <li key={t}>{t} TH/s</li>
              ))}
            </ul>
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              preserveAspectRatio="none"
              className="h-[220px] w-full rounded-lg border border-border/50 bg-secondary/15"
              aria-hidden="true"
            >
              <defs>
                {series.map((s) => (
                  <linearGradient key={s.id} id={`fill-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.color} stopOpacity="0.34" />
                    <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                  </linearGradient>
                ))}
              </defs>
              {Y_TICKS.map((t, i) => (
                <line
                  key={t}
                  x1="0"
                  x2={WIDTH}
                  y1={(HEIGHT / (Y_TICKS.length - 1)) * i}
                  y2={(HEIGHT / (Y_TICKS.length - 1)) * i}
                  stroke="var(--grid-line)"
                  strokeWidth="1"
                />
              ))}
              {series.map((s) => {
                const pts = path(s.values, s.min, s.span);
                const line = `M ${pts.join(" L ")}`;
                return (
                  <g key={s.id}>
                    <path d={`${line} L ${WIDTH},${HEIGHT} L 0,${HEIGHT} Z`} fill={`url(#fill-${s.id})`} />
                    <path
                      d={line}
                      fill="none"
                      stroke={s.color}
                      strokeWidth="2"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      style={{
                        filter: `drop-shadow(0 0 6px ${s.color})`,
                        strokeDasharray: 4000,
                        animation: "draw 2.2s ease-out forwards",
                      }}
                    />
                    {pts.map((p, i) => {
                      const [x, y] = p.split(",");
                      return (
                        <circle
                          key={i}
                          cx={x}
                          cy={y}
                          r="2.6"
                          fill={s.color}
                          style={{ animation: `rise 0.5s ease-out ${i * 28}ms both` }}
                        />
                      );
                    })}
                  </g>
                );
              })}
            </svg>
            <div className="flex h-[220px] flex-col justify-center gap-2">
              {series.map((s) => (
                <span
                  key={s.id}
                  className="rounded-md px-2 py-1 font-mono text-[0.68rem] font-semibold whitespace-nowrap"
                  style={{
                    color: "var(--background)",
                    background: s.color,
                    boxShadow: `0 0 18px -4px ${s.color}`,
                  }}
                >
                  {s.badge}
                </span>
              ))}
            </div>
          </div>
          <ul className="mt-2 flex justify-between pl-14 text-[0.6rem] tracking-wider text-muted-foreground">
            <li>{window_} ago</li>
            <li className="hidden sm:block">midpoint</li>
            <li>Now</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
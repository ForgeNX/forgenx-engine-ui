import { Users } from "lucide-react";

import type { ForgeApp } from "./nexus-data";

function DistributionDonut({ apps }: { apps: ForgeApp[] }) {
  const total = apps.reduce((sum, a) => sum + a.percentage, 0) || 1;
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[150px]">
      <svg viewBox="0 0 160 160" className="absolute inset-0 -rotate-90 animate-spin-slow">
        {apps.map((app, i) => {
          const length = (app.percentage / total) * circumference;
          const dash = `${Math.max(0, length - 1.5)} ${circumference - length + 1.5}`;
          const dashOffset = -offset - circumference;
          offset += length;
          return (
            <circle
              key={app.id}
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={app.color}
              strokeWidth="11"
              strokeDasharray={dash}
              strokeDashoffset={dashOffset}
              style={{
                animation: `ring-in 1.2s cubic-bezier(0.22,1,0.36,1) ${i * 90}ms both`,
              }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="font-display text-2xl font-bold tabular-nums">100%</p>
        <p className="text-[0.6rem] tracking-[0.24em] text-muted-foreground uppercase">Total</p>
      </div>
    </div>
  );
}

export function HashrateDistribution({
  apps,
  selectedId,
  onSelect,
}: {
  apps: ForgeApp[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const max = Math.max(...apps.map((a) => a.percentage), 1);

  return (
    <section className="panel-neon animate-rise p-5" style={{ animationDelay: "120ms" }}>
      <header className="flex items-center gap-3">
        <span
          className="h-4 w-1 rounded-full animate-pulse-glow"
          style={{ background: "var(--neon-gold)", boxShadow: "0 0 12px var(--neon-gold)" }}
        />
        <h2 className="text-xs font-semibold tracking-[0.26em] text-neon-gold uppercase">Hashrate distribution</h2>
      </header>

      <div className="mt-4 grid gap-4 xl:grid-cols-[186px_minmax(0,1fr)]">
        <DistributionDonut apps={apps} />

        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-[420px] border-separate border-spacing-y-1">
            <thead>
              <tr className="text-[0.58rem] tracking-[0.16em] text-white uppercase">
                <th className="pb-2 text-left font-semibold">Coin</th>
                <th className="pb-2 text-right font-semibold">Miners</th>
                <th className="pb-2 text-left font-semibold">Hashrate</th>
                <th className="hidden pb-2 text-left font-semibold 2xl:table-cell">Distribution</th>
                <th className="pb-2 text-right font-semibold">%</th>
                <th className="pb-2 text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app, i) => {
                const active = app.id === selectedId;
                return (
                  <tr
                    key={app.id}
                    onClick={() => onSelect(app.id)}
                    className="group cursor-pointer border-t border-border/50 transition-colors duration-300"
                    style={{
                      background: active ? `color-mix(in oklab, ${app.color} 10%, transparent)` : undefined,
                      animation: `rise 0.6s cubic-bezier(0.22,1,0.36,1) ${i * 55}ms both`,
                    }}
                  >
                    <td className="rounded-l-full py-2 pr-3 pl-3">
                      <span className="flex items-center gap-2">
                        <span
                          className="font-display flex size-10 items-center justify-center overflow-hidden rounded-md text-xs font-bold transition-transform duration-300 group-hover:scale-110"
                          style={{ color: app.color }}
                        >
                          {app.icon ? (
                            <img src={app.icon} alt={app.ticker} className="size-full object-contain" />
                          ) : (
                            app.symbol
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[0.8rem] font-semibold">{app.ticker}</span>
                          <span className="block truncate text-[0.62rem] text-muted-foreground">{app.chain}</span>
                        </span>
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[0.78rem] tabular-nums">
                        <Users className="size-3 text-muted-foreground" />
                        {app.miners}
                      </span>
                    </td>
                    <td className="py-2 pr-3 font-mono text-[0.78rem] font-semibold tabular-nums" style={{ color: `color-mix(in oklab, ${app.color} 55%, white)` }}>
                      {app.hashrate}
                    </td>
                    <td className="hidden py-2 pr-3 2xl:table-cell">
                      <span className="block h-1.5 w-full max-w-[110px] overflow-hidden rounded-full bg-secondary">
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${(app.percentage / max) * 100}%`,
                            background: `linear-gradient(90deg, ${app.color}, color-mix(in oklab, ${app.color} 55%, white))`,
                            boxShadow: `0 0 10px color-mix(in oklab, ${app.color} 65%, transparent)`,
                            animation: `grow-x 1.1s cubic-bezier(0.22,1,0.36,1) ${i * 70}ms both`,
                            transformOrigin: "left",
                          }}
                        />
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-[0.78rem] font-semibold tabular-nums">
                      {app.percentage.toFixed(1)}%
                    </td>
                    <td className="rounded-r-full py-2 pr-3 text-right">
                      <span
                        className="inline-flex items-center gap-1.5 text-[0.6rem] font-semibold tracking-[0.14em] uppercase"
                        style={{ color: app.installed ? "var(--neon-green)" : "var(--muted-foreground)" }}
                      >
                        <span
                          className="size-1.5 rounded-full"
                          style={{
                            background: app.installed ? "var(--neon-green)" : "var(--muted-foreground)",
                            animation: app.installed ? "pulse-glow 2.4s ease-in-out infinite" : undefined,
                          }}
                        />
                        {app.installed ? "Active" : "Idle"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
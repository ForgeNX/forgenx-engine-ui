import { Box, CheckCircle2, Clock, Copy, Droplet, Link2, Lock, Star, User, XCircle } from "lucide-react";

import type { ForgeApp } from "./nexus-data";

function MiniPanel({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={`rounded-xl border border-border/70 bg-secondary/25 p-3.5 transition-colors duration-300 hover:border-border ${className ?? ""}`}
      style={{ animation: `rise 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}
    >
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.62rem] font-semibold tracking-[0.2em] text-muted-foreground uppercase">{children}</p>
  );
}

export function NodeDetail({ app }: { app: ForgeApp }) {
  const n = app.node;
  const live = app.installed;

  return (
    <section key={app.id} className="panel-neon animate-rise flex flex-col p-5">
      <header className="flex flex-wrap items-center gap-3">
        <span
          className="font-display flex size-11 items-center justify-center rounded-full border text-lg font-bold"
          style={{
            color: app.color,
            borderColor: `color-mix(in oklab, ${app.color} 60%, transparent)`,
            background: `color-mix(in oklab, ${app.color} 16%, transparent)`,
            boxShadow: `0 0 22px color-mix(in oklab, ${app.color} 45%, transparent)`,
            animation: "pulse-glow 3.4s ease-in-out infinite",
          }}
        >
          {app.symbol}
        </span>
        <div className="min-w-0">
          <h2 className="font-display truncate text-2xl font-bold tracking-tight" style={{ color: app.color }}>
            {app.ticker}
          </h2>
          <p className="text-xs text-muted-foreground">{app.chain}</p>
        </div>
        <span
          className="ml-auto flex items-center gap-2 rounded-full border px-3 py-1 text-[0.68rem] font-semibold tracking-[0.16em] uppercase"
          style={{
            color: live ? "var(--neon-green)" : "var(--muted-foreground)",
            borderColor: live
              ? "color-mix(in oklab, var(--neon-green) 55%, transparent)"
              : "var(--border)",
            boxShadow: live ? "0 0 16px -4px var(--neon-green)" : undefined,
          }}
        >
          <span
            className="size-1.5 rounded-full"
            style={{
              background: live ? "var(--neon-green)" : "var(--muted-foreground)",
              animation: live ? "pulse-glow 2.2s ease-in-out infinite" : undefined,
            }}
          />
          {live ? "Online" : "Offline"}
        </span>
      </header>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <MiniPanel delay={40}>
          <Label>Sync status</Label>
          <div className="mt-2.5 flex items-center gap-3">
            <span className="relative flex size-9 items-center justify-center">
              <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="var(--secondary)" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke={live ? "var(--neon-green)" : "var(--muted-foreground)"}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 15}
                  strokeDashoffset={2 * Math.PI * 15 * (1 - n.syncPercent / 100)}
                  style={{
                    filter: live ? "drop-shadow(0 0 6px var(--neon-green))" : undefined,
                    animation: "ring-in 1.2s cubic-bezier(0.22,1,0.36,1) both",
                  }}
                />
              </svg>
              {live ? (
                <CheckCircle2 className="size-4 text-neon-green" />
              ) : (
                <XCircle className="size-4 text-muted-foreground" />
              )}
            </span>
            <div>
              <p className="text-sm font-semibold">{n.syncStatus}</p>
              <p className="text-xs text-muted-foreground">{n.syncNote}</p>
            </div>
          </div>
        </MiniPanel>

        <MiniPanel delay={90}>
          <Label>Readiness checks</Label>
          <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-2">
            {n.checks.map((check, i) => (
              <li
                key={check.label}
                className="flex items-center gap-1.5 text-[0.72rem] font-semibold tracking-wider"
                style={{ animation: `rise 0.5s ease-out ${120 + i * 60}ms both` }}
              >
                <span
                  className="flex size-4 items-center justify-center rounded-full border"
                  style={{
                    borderColor: check.ok
                      ? "color-mix(in oklab, var(--neon-green) 65%, transparent)"
                      : "color-mix(in oklab, var(--destructive) 65%, transparent)",
                    boxShadow: check.ok
                      ? "0 0 10px color-mix(in oklab, var(--neon-green) 45%, transparent)"
                      : undefined,
                  }}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{
                      background: check.ok ? "var(--neon-green)" : "var(--destructive)",
                      animation: check.ok ? "pulse-glow 2.6s ease-in-out infinite" : undefined,
                    }}
                  />
                </span>
                <span className={check.ok ? "text-foreground/85" : "text-muted-foreground"}>{check.label}</span>
              </li>
            ))}
          </ul>
        </MiniPanel>

        <MiniPanel delay={140}>
          <div className="flex items-center gap-2">
            <Box className="size-4 text-neon-cyan" style={{ animation: "float 6s ease-in-out infinite" }} />
            <Label>Block height</Label>
          </div>
          <p className="font-display mt-2 text-2xl font-bold tabular-nums">{n.blockHeight}</p>
          <p className="mt-0.5 font-mono text-xs text-neon-cyan">Best: {n.bestHeight}</p>
        </MiniPanel>

        <MiniPanel delay={190}>
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-neon-violet" style={{ animation: "spin 14s linear infinite" }} />
            <Label>Last block</Label>
          </div>
          <p className="mt-2 text-base font-semibold">{n.lastBlock}</p>
          <p className="mt-0.5 text-xs text-neon-green">{n.lastBlockAgo}</p>
        </MiniPanel>
      </div>

      <MiniPanel className="mt-3" delay={240}>
        <Label>Pool address</Label>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Link2, title: "Stratum V1", value: n.stratumV1 },
            { icon: Lock, title: "Stratum V2", value: n.stratumV2 },
          ].map((item) => (
            <div key={item.title} className="group min-w-0">
              <p className="flex items-center gap-1.5 text-[0.6rem] tracking-[0.18em] text-muted-foreground uppercase">
                <item.icon className="size-3" /> {item.title}
              </p>
              <p className="mt-1.5 flex items-start gap-1.5 font-mono text-[0.78rem] break-all text-foreground/90">
                {item.value}
                <Copy className="mt-0.5 size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </p>
              <p className="mt-1 text-[0.65rem] text-muted-foreground">Worker: {n.workerName}</p>
            </div>
          ))}
          <div className="min-w-0 sm:text-center">
            <p className="flex items-center gap-1.5 text-[0.6rem] tracking-[0.18em] text-muted-foreground uppercase sm:justify-center">
              <User className="size-3" /> Worker address / name
            </p>
            <p className="mt-1.5 text-sm font-semibold">{n.workerName}</p>
            <p className="mt-1 text-[0.65rem] text-muted-foreground">({n.workerHint})</p>
          </div>
        </div>
      </MiniPanel>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {[
          { icon: Droplet, label: "Network difficulty", value: n.networkDifficulty, color: "var(--neon-cyan)" },
          { icon: Droplet, label: "Network hashrate", value: n.networkHashrate, color: "var(--neon-violet)" },
          { icon: Star, label: "Best session difficulty", value: n.bestSessionDifficulty, color: "var(--neon-gold)" },
        ].map((tile, i) => (
          <MiniPanel key={tile.label} delay={280 + i * 50}>
            <div className="flex items-center gap-2">
              <tile.icon
                className="size-4"
                style={{ color: tile.color, animation: "float 5.5s ease-in-out infinite" }}
              />
              <Label>{tile.label}</Label>
            </div>
            <p className="font-display mt-1.5 text-xl font-bold tabular-nums" style={{ color: tile.color }}>
              {tile.value}
            </p>
          </MiniPanel>
        ))}
      </div>
    </section>
  );
}
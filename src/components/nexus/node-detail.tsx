import { useState } from "react";
import { Box, Boxes, Clock, Check, Copy, Droplet, Link2, Lock, Star, User } from "lucide-react";

import { ShineBorder } from "./shine-border";
import { AuroraText } from "./aurora-text";
import type { ForgeApp } from "./nexus-data";

// Low-level clipboard write with async API + legacy fallback. Returns success.
function writeClipboard(text: string): boolean {
  if (!text || text === "unavailable" || text === "—") return false;
  const clip = navigator.clipboard;
  if (clip && window.isSecureContext) {
    clip.writeText(text).catch(() => fallbackCopy(text));
    return true;
  }
  return fallbackCopy(text);
}

function fallbackCopy(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
}

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
    <p className="text-[0.62rem] font-semibold tracking-[0.2em] text-white uppercase">{children}</p>
  );
}

export function NodeDetail({ app }: { app: ForgeApp }) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copy = (key: string, text: string) => {
    if (writeClipboard(text)) {
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    }
  };
  const n = app.node;
  const live = app.installed;

  return (
    <section key={app.id} className="panel-neon animate-rise flex flex-col p-5">
      <ShineBorder borderWidth={1.5} duration={14} shineColor={[app.color, "var(--neon-cyan)", app.color]} />
      <header className="flex flex-wrap items-center gap-3">
        <span
          className="font-display flex size-14 items-center justify-center overflow-hidden rounded-md text-lg font-bold"
          style={{ color: app.color }}
        >
          {app.icon ? (
            <img src={app.icon} alt={app.ticker} className="size-full object-contain" />
          ) : (
            app.symbol
          )}
        </span>
        <div className="min-w-0">
          <h2 className="font-display truncate text-2xl font-bold tracking-tight">
            <AuroraText colors={[app.color, "#7928CA", "#38bdf8", app.color]}>{app.ticker}</AuroraText>
          </h2>
          <p className="text-xs text-white">{app.chain}</p>
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
          <div className="mt-2.5 flex items-center gap-4">
            <span className="relative flex size-20 items-center justify-center">
              <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="oklch(0.16 0.02 265)" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke={live ? "var(--neon-green)" : "var(--muted-foreground)"}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 15.5}
                  strokeDashoffset={2 * Math.PI * 15.5 * (1 - n.syncPercent / 100)}
                  style={{
                    animation: "ring-in 1.2s cubic-bezier(0.22,1,0.36,1) both",
                    transition: "stroke-dashoffset 0.6s ease",
                  }}
                />
              </svg>
              {/* Sync percentage centred inside the ring, like the coin apps */}
              <span
                className="font-display text-lg font-bold tabular-nums"
                style={{ color: live ? "var(--neon-green)" : "var(--muted-foreground)" }}
              >
                {n.syncPercent}%
              </span>
            </span>
            <div>
              <p className="text-lg font-semibold">{n.syncStatus}</p>
              <p className="text-sm text-muted-foreground">{n.syncNote}</p>
            </div>
          </div>
        </MiniPanel>

        <MiniPanel delay={90}>
          <Label>Readiness checks</Label>
          <ul className="mt-2.5 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
            {n.checks.map((check, i) => (
              <li
                key={check.label}
                className="flex items-center gap-1.5 text-[0.72rem] font-semibold tracking-wider"
                style={{ animation: `rise 0.5s ease-out ${120 + i * 50}ms both` }}
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

        <div className="grid gap-3 sm:grid-cols-3 lg:col-span-2">
        <MiniPanel delay={140}>
          <div className="flex items-center gap-2">
            <Box className="size-4 text-neon-cyan" style={{ animation: "float 6s ease-in-out infinite" }} />
            <Label>Block height</Label>
          </div>
          <p className="font-display mt-2 text-xl font-bold tabular-nums">{n.blockHeight}</p>
          <p className="mt-0.5 font-mono text-xs text-neon-cyan">Headers: {n.bestHeight}</p>
        </MiniPanel>
        <MiniPanel delay={165}>
          <div className="flex items-center gap-2">
            <Boxes className="size-4 text-neon-green" style={{ animation: "float 6s ease-in-out infinite" }} />
            <Label>Blocks found</Label>
          </div>
          <p className="font-display mt-2 text-xl font-bold tabular-nums">
            <span className="text-foreground/90">{n.blocksFound}</span>
            <span className="text-foreground/60"> / </span>
            <span className={n.blocksOrphaned > 0 ? "text-neon-pink" : "text-foreground/90"}>{n.blocksOrphaned}</span>
          </p>
          <p className="mt-0.5 font-mono text-xs text-foreground/90">found / orphaned</p>
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
      </div>

      <MiniPanel className="mt-3" delay={240}>
        <Label>Pool address</Label>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {[
            { key: "v1", icon: Link2, title: "Stratum V1", value: n.stratumV1, subtitle: n.stratumV1Subtitle, color: "var(--neon-cyan)" },
            { key: "v2", icon: Lock, title: "Stratum V2", value: n.stratumV2, subtitle: n.stratumV2Subtitle, color: "var(--neon-violet)" },
          ].map((item) => (
            <div key={item.title} className="group min-w-0">
              <p className="flex items-center gap-1.5 text-[0.6rem] tracking-[0.18em] text-white uppercase">
                <item.icon className="size-3" style={{ color: item.color }} /> {item.title}
              </p>
              <button
                type="button"
                onClick={() => copy(item.key, item.value)}
                className="mt-1.5 flex w-full items-start gap-1.5 text-left font-mono text-[0.78rem] break-all text-foreground/90 transition-colors hover:text-foreground"
                title="Click to copy"
              >
                {item.value}
                {copiedKey === item.key ? (
                  <span className="flex shrink-0 items-center gap-0.5 text-neon-green">
                    <Check className="size-3" /> Copied
                  </span>
                ) : (
                  <Copy className="mt-0.5 size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                )}
              </button>
              {item.subtitle ? (
                <button
                  type="button"
                  onClick={() => copy(`${item.key}-sub`, item.subtitle.replace(/^Authority:\s*/, ""))}
                  className="mt-1 flex items-start gap-1 text-left font-mono text-[0.6rem] break-all text-muted-foreground transition-colors hover:text-foreground/80"
                  title="Click to copy"
                >
                  {copiedKey === `${item.key}-sub` ? (
                    <span className="text-neon-green">Copied</span>
                  ) : (
                    item.subtitle
                  )}
                </button>
              ) : null}
            </div>
          ))}
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[0.6rem] tracking-[0.18em] text-white uppercase">
              <User className="size-3" style={{ color: "var(--neon-green)" }} /> Worker address / name
            </p>
            <button
              type="button"
              onClick={() => copy("worker", n.fullWorkerName)}
              className="group/w mt-1.5 flex w-full items-start justify-start gap-1 text-left font-mono text-[0.78rem] break-all text-foreground/90 transition-colors hover:text-foreground"
              title="Click to copy"
            >
              {n.fullWorkerName}
              {copiedKey === "worker" ? (
                <span className="flex shrink-0 items-center gap-0.5 text-neon-green">
                  <Check className="size-3" /> Copied
                </span>
              ) : (
                <Copy className="mt-0.5 size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-300 group-hover/w:opacity-100" />
              )}
            </button>
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
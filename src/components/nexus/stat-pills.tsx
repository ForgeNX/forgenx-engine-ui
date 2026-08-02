import type { ReactElement } from "react";

import { BlockIcon, BoltIcon, ClockIcon, HeartIcon, SharesIcon, WorkersIcon } from "./animated-icons";

type Pill = {
  label: string;
  icon: (p: { color: string }) => ReactElement;
  color: string;
  value: string;
  valueClass?: string;
  badge?: { text: string; tone: "up" | "flat" };
  sub?: string;
  subAccent?: string;
  aside?: { value: string; label: string }[];
};

const PILLS: Pill[] = [
  {
    label: "Total hashrate",
    icon: BoltIcon,
    color: "var(--neon-cyan)",
    value: "10.74 TH/s",
    badge: { text: "+5.2%", tone: "up" },
    sub: "10.24 TH/s (15m)",
  },
  {
    label: "Workers online",
    icon: WorkersIcon,
    color: "var(--neon-violet)",
    value: "2",
    sub: "of 2 total",
    aside: [{ value: "100%", label: "" }],
  },
  {
    label: "Blocks found",
    icon: BlockIcon,
    color: "var(--neon-gold)",
    value: "0",
    sub: "Today",
    aside: [{ value: "0", label: "This Week" }],
  },
  {
    label: "Total shares",
    icon: SharesIcon,
    color: "var(--neon-cyan)",
    value: "3,909",
    aside: [
      { value: "0", label: "Invalid" },
      { value: "100%", label: "Efficiency" },
    ],
  },
  {
    label: "Fleet health",
    icon: HeartIcon,
    color: "var(--neon-green)",
    value: "Excellent",
    valueClass: "text-neon-green glow-text text-2xl",
    sub: "All systems operational",
  },
  {
    label: "ForgeNX uptime",
    icon: ClockIcon,
    color: "var(--neon-pink)",
    value: "23d 14h 32m",
    sub: "99.98%",
    subAccent: "var(--neon-pink)",
  },
];

export function StatPills() {
  return (
    <section aria-label="Fleet summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {PILLS.map((pill, i) => {
        const Icon = pill.icon;
        return (
          <article
            key={pill.label}
            className="panel-neon group relative p-4 transition-transform duration-500 hover:-translate-y-1"
            style={{
              animation: `rise 0.7s cubic-bezier(0.22,1,0.36,1) ${i * 70}ms both`,
              borderColor: `color-mix(in oklab, ${pill.color} 42%, transparent)`,
              boxShadow: `inset 0 0 46px -30px ${pill.color}`,
            }}
          >
            <span
              className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
              style={{ background: `linear-gradient(90deg, transparent, ${pill.color}, transparent)` }}
            />
            <span
              className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{
                background: `linear-gradient(90deg, transparent, color-mix(in oklab, ${pill.color} 22%, transparent), transparent)`,
                animation: "scan 1.8s linear infinite",
              }}
            />
            <header className="flex items-center gap-2.5">
              <Icon color={pill.color} />
              <h3 className="text-[0.68rem] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                {pill.label}
              </h3>
            </header>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p
                className={`font-display leading-none font-bold tabular-nums ${pill.valueClass ?? "text-[1.7rem]"}`}
              >
                {pill.value}
              </p>
              {pill.badge ? (
                <span
                  className="rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold"
                  style={{
                    color: "var(--neon-green)",
                    background: "color-mix(in oklab, var(--neon-green) 14%, transparent)",
                    animation: "pulse-glow 2.8s ease-in-out infinite",
                  }}
                >
                  {pill.badge.text}
                </span>
              ) : null}
            </div>
            <div className="mt-2 flex items-end justify-between gap-3">
              {pill.sub ? (
                <p className="text-xs" style={{ color: pill.subAccent ?? "var(--muted-foreground)" }}>
                  {pill.sub}
                </p>
              ) : (
                <span />
              )}
              <div className="flex items-end gap-3">
                {pill.aside?.map((a) => (
                  <p key={a.label + a.value} className="text-right">
                    <span className="font-mono text-sm font-semibold tabular-nums text-neon-green">{a.value}</span>
                    {a.label ? (
                      <span className="block text-[0.6rem] tracking-wider text-muted-foreground">{a.label}</span>
                    ) : null}
                  </p>
                ))}
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
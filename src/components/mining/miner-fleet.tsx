import { Box, Rocket, ShieldCheck, Target } from "lucide-react";

import { OrbitGlobe } from "./orbit-globe";
import { StatCard } from "./stat-card";

export function MinerFleet() {
  return (
    <section className="panel-neon grid-backdrop relative p-6 md:p-9" id="fleet">
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--neon-cyan), var(--neon-pink), var(--neon-gold), transparent)",
        }}
      />
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="animate-rise">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.3em] text-neon-green uppercase">
            <span className="size-2 rounded-full bg-neon-green animate-pulse-glow" />
            Solo mining command
          </p>
          <h1 className="font-display mt-2 text-5xl leading-none font-bold tracking-tight md:text-7xl">
            MINER{" "}
            <span
              className="text-transparent glow-text"
              style={{ WebkitTextStroke: "1.5px var(--neon-pink)" }}
            >
              FLEET
            </span>
          </h1>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            Live proof pressure from every connected home miner.
          </p>
        </div>

        <div
          className="panel-neon animate-rise p-4 text-center"
          style={{ animationDelay: "120ms", borderColor: "color-mix(in oklab, var(--neon-violet) 55%, transparent)" }}
        >
          <p className="flex items-center justify-center gap-2 text-[0.65rem] tracking-[0.24em] text-muted-foreground uppercase">
            Stratum endpoint
            <span className="size-2 rounded-full bg-neon-pink animate-pulse-glow" />
          </p>
          <p className="font-mono mt-2 text-xl font-semibold text-neon-cyan glow-text">
            192.168.1.1:96:57557
          </p>
          <p className="mt-1 text-xs text-muted-foreground">SHA256d — direct solo payout</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <OrbitGlobe workers={0} />

        <div className="grid min-w-0 items-start gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Rocket}
            label="Local thrust"
            value="0"
            unit="H/s"
            caption="waiting confidence"
            subCaption="0 shares • 15 min window"
            color="var(--neon-violet)"
            seed={11}
            delay={80}
          />
          <StatCard
            icon={Target}
            label="Next target"
            value="292M"
            caption="active mining difficulty"
            color="var(--neon-cyan)"
            seed={22}
            delay={160}
          />
          <StatCard
            icon={ShieldCheck}
            label="Best proof"
            value="0"
            caption="since the last block"
            color="var(--neon-green)"
            seed={33}
            delay={240}
          />
          <StatCard
            icon={Box}
            label="Block ETA"
            value="--"
            caption="at current local power"
            color="var(--neon-gold)"
            seed={44}
            delay={320}
          />
        </div>
      </div>

      <div className="mt-8 animate-rise" style={{ animationDelay: "400ms" }}>
        <div className="relative h-1.5 rounded-full" style={{ background: "linear-gradient(90deg, var(--neon-cyan), var(--neon-pink), var(--neon-gold))" }}>
          <span
            className="absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-neon-pink bg-background animate-pulse-glow"
          />
        </div>
        <div className="mt-2 flex justify-between text-xs font-semibold tracking-[0.2em] uppercase">
          <span className="text-neon-cyan">Blue 1x</span>
          <span className="text-neon-pink">Pink 4x</span>
          <span className="text-neon-gold">Gold 12x</span>
        </div>
      </div>
    </section>
  );
}
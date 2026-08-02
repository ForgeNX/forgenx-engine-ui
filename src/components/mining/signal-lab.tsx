import { Activity, Globe, Hourglass, Target, Users, Zap } from "lucide-react";
import { useState } from "react";

import { COINS, TIME_WINDOWS, type TimeWindow } from "./data";
import { HashrateDonut } from "./donut";
import { HashrateSpectrum } from "./hashrate-spectrum";

const MINI_STATS = [
  { icon: Users, label: "Connected", value: "0", caption: "workers transmitting", color: "var(--neon-cyan)" },
  { icon: Zap, label: "Live thrust", value: "0", caption: "waiting confidence", sub: "0 shares • 15m", color: "var(--neon-pink)" },
  { icon: Activity, label: "Last pulse", value: "--", caption: "latest accepted share", color: "var(--neon-gold)" },
  { icon: Globe, label: "Network", value: "7.93 PH/s", caption: "estimated across", sub: "36 accepted blocks", color: "var(--neon-cyan)" },
  { icon: Target, label: "Next target", value: "292M", caption: "SHA256d", sub: "Next block 4065", color: "var(--neon-pink)" },
  { icon: Hourglass, label: "Block ETA", value: "--", caption: "at current pool power", color: "var(--neon-gold)" },
];

export function SignalLab() {
  const [window, setWindow] = useState<TimeWindow>("30M");

  return (
    <section className="panel-neon relative p-6 md:p-9" id="signal">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="animate-rise">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.3em] text-neon-green uppercase">
            <span className="size-2 rounded-full bg-neon-green animate-pulse-glow" />
            Live stratum analytics
          </p>
          <h2 className="font-display mt-2 text-5xl leading-none font-bold tracking-tight md:text-6xl">
            SIGNAL{" "}
            <span
              className="text-transparent glow-text"
              style={{ WebkitTextStroke: "1.5px var(--neon-cyan)" }}
            >
              LAB
            </span>
          </h2>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Read the pulse, isolate a time window and follow each smoothing layer through the pool.
          </p>
        </div>

        <div className="animate-rise flex items-center gap-2 rounded-full border border-border/70 bg-card/60 p-1.5 backdrop-blur-sm">
          <span className="px-3 text-xs tracking-[0.2em] text-muted-foreground uppercase">History</span>
          {TIME_WINDOWS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setWindow(option)}
              aria-pressed={window === option}
              className="rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-widest uppercase transition-all duration-300 hover:text-neon-pink"
              style={
                window === option
                  ? {
                      color: "var(--neon-pink)",
                      border: "1px solid var(--neon-pink)",
                      boxShadow: "0 0 18px color-mix(in oklab, var(--neon-pink) 55%, transparent)",
                    }
                  : { border: "1px solid transparent" }
              }
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid min-w-0 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {MINI_STATS.map(({ icon: Icon, label, value, caption, sub, color }, index) => (
          <article
            key={label}
            className="panel-neon animate-rise p-4 transition-transform duration-500 hover:-translate-y-1"
            style={{
              animationDelay: `${index * 70}ms`,
              borderColor: `color-mix(in oklab, ${color} 45%, transparent)`,
            }}
          >
            <header className="flex items-center gap-2">
              <Icon className="size-4" style={{ color, filter: `drop-shadow(0 0 8px ${color})` }} />
              <h3 className="text-[0.68rem] font-semibold tracking-[0.2em] uppercase" style={{ color }}>
                {label}
              </h3>
            </header>
            <p className="font-display mt-2 text-3xl font-bold tabular-nums">{value}</p>
            <p className="mt-1 text-xs text-foreground/75">{caption}</p>
            {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
          </article>
        ))}
      </div>

      <div className="mt-6 grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <HashrateSpectrum />

        <div className="panel-neon animate-rise grid min-w-0 gap-6 p-5 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
          <div>
            <h3 className="text-sm font-semibold tracking-[0.18em] uppercase">Hashrate distribution</h3>
            <div className="mt-4">
              <HashrateDonut />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[360px] border-collapse text-sm">
              <thead>
                <tr className="text-[0.62rem] tracking-[0.18em] text-muted-foreground uppercase">
                  <th className="py-2 text-left font-medium">Coin</th>
                  <th className="py-2 text-left font-medium">Distribution</th>
                  <th className="py-2 text-left font-medium">Status</th>
                  <th className="py-2 text-right font-medium">Miners</th>
                </tr>
              </thead>
              <tbody>
                {COINS.map((coin, index) => (
                  <tr
                    key={coin.id}
                    className="animate-rise border-t border-border/50 transition-colors duration-300 hover:bg-secondary/40"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <td className="py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex size-8 items-center justify-center rounded-lg border text-xs font-bold"
                          style={{
                            color: coin.color,
                            borderColor: coin.color,
                            boxShadow: `0 0 14px color-mix(in oklab, ${coin.color} 45%, transparent)`,
                          }}
                        >
                          {coin.symbol}
                        </span>
                        <span>
                          <span className="block font-semibold">{coin.ticker}</span>
                          <span className="block text-xs text-muted-foreground">{coin.name}</span>
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-12 font-semibold tabular-nums" style={{ color: coin.color }}>
                          {coin.share.toFixed(1)}%
                        </span>
                        <span className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-secondary sm:block">
                          <span
                            className="block h-full rounded-full transition-[width] duration-1000 ease-out"
                            style={{
                              width: `${coin.share * 4}%`,
                              background: coin.color,
                              boxShadow: `0 0 12px ${coin.color}`,
                            }}
                          />
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5">
                      <span className="flex items-center gap-1.5 text-xs font-semibold tracking-widest text-neon-green uppercase">
                        <span className="size-1.5 rounded-full bg-neon-green animate-pulse-glow" />
                        Active
                      </span>
                    </td>
                    <td className="py-2.5 text-right tabular-nums">{coin.miners}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
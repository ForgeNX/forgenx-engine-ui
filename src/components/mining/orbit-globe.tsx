import { COINS } from "./data";

/** Animated orbiting coin sphere used as the fleet hero visual. */
export function OrbitGlobe({ workers }: { workers: number }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[380px] animate-rise">
      <div
        className="absolute inset-[12%] rounded-full animate-pulse-glow"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, color-mix(in oklab, var(--neon-violet) 55%, transparent), transparent 68%)",
          filter: "blur(6px)",
        }}
      />
      <div
        className="absolute inset-[16%] rounded-full border animate-spin-slow"
        style={{
          borderColor: "color-mix(in oklab, var(--neon-cyan) 45%, transparent)",
          background:
            "conic-gradient(from 0deg, transparent, color-mix(in oklab, var(--neon-pink) 25%, transparent), transparent 60%)",
        }}
      />
      <div
        className="absolute inset-[24%] rounded-full border animate-spin-reverse"
        style={{ borderColor: "color-mix(in oklab, var(--neon-pink) 40%, transparent)" }}
      />
      <div
        className="absolute inset-[8%] rounded-full border animate-spin-slow"
        style={{
          borderColor: "color-mix(in oklab, var(--neon-violet) 35%, transparent)",
          transform: "rotateX(72deg)",
        }}
      />
      <div className="absolute inset-[30%] flex flex-col items-center justify-center rounded-full bg-background/80 text-center backdrop-blur-sm">
        <span className="font-display text-5xl font-bold tabular-nums animate-flicker">
          {workers}
        </span>
        <span className="text-[0.65rem] tracking-[0.3em] text-muted-foreground uppercase">
          Workers
        </span>
      </div>

      {COINS.map((coin, index) => {
        const angle = (index / COINS.length) * Math.PI * 2 - Math.PI / 2;
        const radius = 44;
        const left = 50 + Math.cos(angle) * radius;
        const top = 50 + Math.sin(angle) * radius;
        return (
          <span
            key={coin.id}
            className="absolute flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-sm font-bold animate-float transition-transform duration-300 hover:scale-125"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              color: coin.color,
              borderColor: coin.color,
              background: `radial-gradient(circle, color-mix(in oklab, ${coin.color} 18%, transparent), var(--background))`,
              boxShadow: `0 0 18px color-mix(in oklab, ${coin.color} 60%, transparent)`,
              animationDelay: `${index * 320}ms`,
            }}
            title={coin.name}
          >
            {coin.symbol}
          </span>
        );
      })}
    </div>
  );
}
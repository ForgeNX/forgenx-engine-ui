import { COINS } from "./data";

/** Hashrate distribution donut with animated stroke reveal. */
export function HashrateDonut() {
  const total = COINS.reduce((sum, c) => sum + c.share, 0);
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[320px]">
      <div
        className="absolute inset-[18%] rounded-full animate-pulse-glow"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--neon-violet) 40%, transparent), transparent 70%)",
        }}
      />
      <svg viewBox="0 0 160 160" className="absolute inset-0 -rotate-90">
        {COINS.map((coin) => {
          const length = (coin.share / total) * circumference;
          const dash = `${length - 2} ${circumference - length + 2}`;
          const strokeOffset = -offset;
          offset += length;
          return (
            <circle
              key={coin.id}
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={coin.color}
              strokeWidth="18"
              strokeDasharray={dash}
              strokeDashoffset={strokeOffset}
              className="origin-center transition-[stroke-width] duration-300 hover:stroke-[22]"
              style={{ filter: `drop-shadow(0 0 8px ${coin.color})` }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display text-3xl font-bold">100%</span>
        <span className="text-[0.6rem] tracking-[0.28em] text-muted-foreground uppercase">
          Total hashrate
        </span>
      </div>
    </div>
  );
}
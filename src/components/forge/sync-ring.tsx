/** Animated 100% sync ring. */
export function SyncRing({ percent = 100 }: { percent?: number }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const dash = (percent / 100) * circumference;

  return (
    <div className="relative size-20 shrink-0">
      <div
        className="absolute inset-1 rounded-full animate-pulse-glow"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--neon-cyan) 35%, transparent), transparent 70%)",
        }}
      />
      <svg viewBox="0 0 72 72" className="absolute inset-0 -rotate-90">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="var(--grid-line)" strokeWidth="5" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="var(--neon-cyan)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          strokeDashoffset={circumference}
          style={{
            filter: "drop-shadow(0 0 8px var(--neon-cyan))",
            animation: "ring-draw 2s cubic-bezier(0.22,1,0.36,1) forwards",
          }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-sm font-bold text-neon-cyan glow-text">
        {percent}%
      </span>
    </div>
  );
}
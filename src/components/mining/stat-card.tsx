import type { LucideIcon } from "lucide-react";

import { Sparkline } from "./sparkline";
import { useLiveSeries } from "@/hooks/use-live-series";
import { cn } from "@/lib/utils";

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  unit?: string;
  caption: string;
  subCaption?: string;
  color: string;
  seed: number;
  delay?: number;
  withChart?: boolean;
  className?: string;
};

export function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  caption,
  subCaption,
  color,
  seed,
  delay = 0,
  withChart = true,
  className,
}: StatCardProps) {
  const series = useLiveSeries(seed, 32, 1600);

  return (
    <article
      className={cn(
        "panel-neon group animate-rise p-5 transition-all duration-500 hover:-translate-y-1",
        className,
      )}
      style={{
        animationDelay: `${delay}ms`,
        borderColor: `color-mix(in oklab, ${color} 55%, transparent)`,
        boxShadow: `inset 0 0 40px -24px ${color}, 0 0 0 1px color-mix(in oklab, ${color} 22%, transparent)`,
      }}
    >
      <span
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `linear-gradient(90deg, transparent, color-mix(in oklab, ${color} 18%, transparent), transparent)`,
          animation: "scan 1.8s linear infinite",
        }}
      />
      <header className="flex items-center gap-2">
        <Icon
          className="size-4 transition-transform duration-500 group-hover:scale-125"
          style={{ color, filter: `drop-shadow(0 0 8px ${color})` }}
        />
        <h3
          className="text-xs font-semibold tracking-[0.22em] uppercase"
          style={{ color }}
        >
          {label}
        </h3>
      </header>
      <p className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-4xl leading-none font-bold tabular-nums">{value}</span>
        {unit ? <span className="text-lg text-muted-foreground">{unit}</span> : null}
      </p>
      <p className="mt-2 text-sm text-foreground/80">{caption}</p>
      {subCaption ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{subCaption}</p>
      ) : null}
      {withChart ? (
        <div className="mt-4">
          <Sparkline values={series} color={color} height={54} />
        </div>
      ) : null}
    </article>
  );
}
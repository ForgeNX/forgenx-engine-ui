import { Sparkline } from "./sparkline";
import { useLiveSeries } from "@/hooks/use-live-series";

const LAYERS = [
  { key: "LIVE", color: "var(--neon-pink)", seed: 7, drift: 1.2 },
  { key: "5M", color: "var(--neon-violet)", seed: 19, drift: 0.9 },
  { key: "15M", color: "var(--neon-cyan)", seed: 31, drift: 0.7 },
  { key: "1H", color: "var(--neon-green)", seed: 47, drift: 0.5 },
];

const Y_LABELS = ["100 PH/s", "10 PH/s", "1 PH/s", "100 TH/s", "10 TH/s"];
const X_LABELS = ["30m ago", "25m ago", "20m ago", "15m ago", "10m ago", "5m ago", "Now"];

export function HashrateSpectrum() {
  const live = useLiveSeries(7, 48, 1200, 1.2);
  const m5 = useLiveSeries(19, 48, 1200, 0.9);
  const m15 = useLiveSeries(31, 48, 1200, 0.7);
  const h1 = useLiveSeries(47, 48, 1200, 0.5);
  const series = [live, m5, m15, h1];

  return (
    <div className="panel-neon animate-rise p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold tracking-[0.18em] uppercase">Hashrate spectrum</h3>
          <p className="mt-1 text-xs text-muted-foreground">Pool velocity</p>
        </div>
        <ul className="flex flex-wrap gap-3 text-[0.7rem] font-semibold tracking-widest uppercase">
          {LAYERS.map((layer) => (
            <li key={layer.key} className="flex items-center gap-1.5">
              <span
                className="size-2 rounded-sm animate-pulse-glow"
                style={{ background: layer.color, boxShadow: `0 0 10px ${layer.color}` }}
              />
              {layer.key}
            </li>
          ))}
        </ul>
      </header>

      <div className="mt-4 flex gap-3">
        <ul className="flex flex-col justify-between py-1 text-[0.6rem] text-muted-foreground">
          {Y_LABELS.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
        <div className="grid-backdrop relative flex-1 rounded-lg border border-border/50">
          {LAYERS.map((layer, index) => (
            <div key={layer.key} className="absolute inset-0">
              <Sparkline values={series[index] ?? []} color={layer.color} height={220} grid={false} />
            </div>
          ))}
          <div className="h-[220px]" />
        </div>
      </div>
      <ul className="mt-2 flex justify-between pl-16 text-[0.6rem] text-muted-foreground">
        {X_LABELS.map((label) => (
          <li key={label}>{label}</li>
        ))}
      </ul>
    </div>
  );
}
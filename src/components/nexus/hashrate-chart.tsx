import { useEffect, useMemo, useRef, useState } from "react";

import { ChartLine } from "lucide-react";

import { fetchHistory, fetchMeshSettings, saveMeshSettings, coinIdForSymbol, HISTORY_TRAILS } from "@/lib/forge-api";
import type { ForgeApp } from "./nexus-data";
import { compactNumber } from "./format";

const WIDTH = 900;
const HEIGHT = 220;

// Trail labels the engine supports (see HISTORY_TRAILS).
const WINDOWS = Object.keys(HISTORY_TRAILS);

// Total real-time span (seconds) each trail covers — for axis time labels.
const TRAIL_SECONDS: Record<string, number> = {
  "30m": 30 * 60,
  "6h": 6 * 3600,
  "1d": 24 * 3600,
  "3d": 3 * 24 * 3600,
  "7d": 7 * 24 * 3600,
  "1mo": 30 * 24 * 3600,
  "6mo": 182 * 24 * 3600,
};

// The chart's lines: network hashrate, pool hashrate and network difficulty.
const ALL_SERIES = ["net", "pool", "diff"];

// Pool history samples are TH/s; network history samples are raw H/s.
const POOL_TO_HS = 1e12;
const NET_TO_HS = 1;

// Format a hashrate given in H/s (base units).
function fmtHsFromBase(h: number): string {
  if (!h || h <= 0) return "0 H/s";
  const units = ["H/s", "KH/s", "MH/s", "GH/s", "TH/s", "PH/s", "EH/s", "ZH/s"];
  let i = 0;
  let v = h;
  while (v >= 1000 && i < units.length - 1) {
    v /= 1000;
    i++;
  }
  return `${v.toFixed(2)} ${units[i]}`;
}

// A difficulty with a space before its unit: "551.05 G".
function fmtDiff(d: number): string {
  if (!d || d <= 0) return "—";
  const s = compactNumber(d);
  const unit = s.slice(-1);
  return "KMGTP".includes(unit) ? `${s.slice(0, -1)} ${unit}` : s;
}

function buildPath(values: number[], max: number) {
  if (values.length === 0 || max <= 0) return "";
  const step = WIDTH / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => {
    const y = HEIGHT - (v / max) * HEIGHT * 0.92 - HEIGHT * 0.04;
    return `${(i * step).toFixed(1)},${y.toFixed(1)}`;
  });
  return `M ${pts.join(" L ")}`;
}

// Build the axis time labels (oldest → now) for a trail. Angled, like the coin apps.
function axisLabels(trail: string, count = 6): string[] {
  const span = TRAIL_SECONDS[trail] ?? 6 * 3600;
  const now = Date.now();
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const t = now - span * 1000 * (1 - i / (count - 1));
    const d = new Date(t);
    if (span <= 24 * 3600) {
      out.push(d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }));
    } else {
      out.push(d.toLocaleDateString(undefined, { month: "short", day: "numeric" }));
    }
  }
  return out;
}

export function HashrateChart({
  app,
  poolThs,
  view,
}: {
  app: ForgeApp | null;
  // The node's hashrate now, TH/s, as the Miners and Nodes tabs count it.
  poolThs?: number;
  view?: "live" | "avg";
}) {
  // The time window and the lines shown, saved on the engine like the other
  // Nexus settings. Each is marked once the user picks, so a saved value
  // arriving late does not undo the pick.
  const [window_, setWindowState] = useState<string>("6h");
  const [visible, setVisible] = useState<Set<string>>(() => new Set(ALL_SERIES));
  const chosen = useRef({ window: false, series: false });
  useEffect(() => {
    fetchMeshSettings().then((st) => {
      if (!chosen.current.window && st?.chart_window && WINDOWS.includes(st.chart_window)) {
        setWindowState(st.chart_window);
      }
      if (!chosen.current.series && st?.chart_series) {
        setVisible(new Set(st.chart_series === "none" ? [] : st.chart_series.split(",").filter((id) => ALL_SERIES.includes(id))));
      }
    });
  }, []);
  const setWindow = (w: string) => {
    chosen.current.window = true;
    setWindowState(w);
    saveMeshSettings({ chart_window: w });
  };
  const toggleSeries = (id: string) => {
    const next = new Set(visible);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    chosen.current.series = true;
    setVisible(next);
    saveMeshSettings({ chart_series: next.size ? ALL_SERIES.filter((s) => next.has(s)).join(",") : "none" });
  };
  const [pool, setPool] = useState<number[]>([]);
  const [network, setNetwork] = useState<number[]>([]);
  const [difficulty, setDifficulty] = useState<number[]>([]);
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!app) return;
    let cancelled = false;
    const coinId = coinIdForSymbol(app.id);
    fetchHistory(coinId, window_, view).then((h) => {
      if (!cancelled) {
        setPool(h.pool);
        setNetwork(h.network);
        setDifficulty(h.difficulty);
        setHover(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [app, window_, view]);

  // Convert to base H/s for both series.
  const poolHs = useMemo(() => pool.map((v) => v * POOL_TO_HS), [pool]);
  const netHs = useMemo(() => network.map((v) => v * NET_TO_HS), [network]);

  const poolMax = Math.max(...poolHs, 1);
  const netMax = Math.max(...netHs, 1);
  const diffMax = Math.max(...difficulty, 1);

  // Each line is drawn against its own peak, so all three share the chart's
  // height; the figures beside it give the real values.
  const series = [
    { id: "net", label: "Network", color: "var(--neon-pink)", data: netHs, max: netMax, fmt: fmtHsFromBase },
    { id: "pool", label: `Pool (${app?.ticker ?? "—"})`, color: "var(--neon-gold)", data: poolHs, max: poolMax, fmt: fmtHsFromBase },
    { id: "diff", label: "Network difficulty", color: "var(--neon-cyan)", data: difficulty, max: diffMax, fmt: fmtDiff },
  ];

  const labels = axisLabels(window_);
  const pointCount = Math.max(poolHs.length, netHs.length, difficulty.length);

  // Map a mouse X position to the nearest data index.
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || pointCount < 2) return;
    const rect = svg.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    const idx = Math.round(frac * (pointCount - 1));
    setHover(Math.max(0, Math.min(pointCount - 1, idx)));
  };

  const hoverX = hover != null && pointCount > 1 ? (hover / (pointCount - 1)) * WIDTH : null;

  return (
    <section className="panel-neon animate-rise p-5" style={{ animationDelay: "200ms" }}>
      <header className="flex flex-wrap items-center gap-4">
        <h2 className="flex items-center gap-2 text-xs font-semibold tracking-[0.26em] text-neon-cyan uppercase">
          <ChartLine className="size-4" />
          Hashrate over time
        </h2>
        <div className="flex gap-1 rounded-xl border border-border/70 bg-secondary/40 p-1">
          {WINDOWS.map((w) => {
            const active = w === window_;
            return (
              <button
                key={w}
                type="button"
                onClick={() => setWindow(w)}
                className="rounded-lg px-3 py-1 text-xs font-semibold transition-all duration-300"
                style={{
                  color: active ? "var(--neon-cyan)" : "#ffffff",
                  background: active ? "color-mix(in oklab, var(--neon-cyan) 16%, transparent)" : undefined,
                  boxShadow: active ? "0 0 6px -3px var(--neon-cyan)" : undefined,
                }}
              >
                {w}
              </button>
            );
          })}
        </div>
      </header>

      <div className="mt-5 grid gap-5 lg:grid-cols-[150px_minmax(0,1fr)]">
        <ul className="space-y-4">
          {app && (
            <li className="font-display text-base font-bold" style={{ color: app.color }}>
              {app.chain}
            </li>
          )}
          {series.map((s) => {
            const now = s.data.length ? s.data[s.data.length - 1] : 0;
            // On hover show the point value; otherwise show the current headline.
            // For the pool series the headline is the app's 15m hashrate (matches
            // the Distribution panel exactly); network uses its latest history point.
            const headline =
              s.id === "pool" && poolThs !== undefined ? fmtHsFromBase(poolThs * POOL_TO_HS) : s.fmt(now);
            const shown = hover != null && s.data[hover] != null ? s.fmt(s.data[hover]) : headline;
            // Click a line's name to show or hide it.
            const on = visible.has(s.id);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => toggleSeries(s.id)}
                  aria-pressed={on}
                  className="text-left transition-opacity duration-300"
                  style={{ opacity: on ? 1 : 0.4 }}
                >
                  <span className="flex items-center gap-2 text-xs text-white">
                    <span
                      className="size-2 rounded-full border"
                      style={{
                        borderColor: s.color,
                        background: on ? s.color : "transparent",
                        boxShadow: on ? `0 0 10px ${s.color}` : undefined,
                        animation: on ? "pulse-glow 2.4s ease-in-out infinite" : undefined,
                      }}
                    />
                    {s.label}
                  </span>
                  <span className="font-display mt-1 block text-xl font-bold tabular-nums" style={{ color: s.color }}>
                    {shown}
                  </span>
                </button>
              </li>
            );
          })}
          <li className="text-[0.6rem] tracking-wider text-foreground/75">Click a name to show or hide its line</li>
          {hover != null ? (
            <li className="text-[0.6rem] tracking-wider text-muted-foreground">
              at {labels[Math.round((hover / Math.max(1, pointCount - 1)) * (labels.length - 1))]}
            </li>
          ) : null}
        </ul>

        <div className="min-w-0">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            preserveAspectRatio="none"
            className="h-[220px] w-full rounded-lg border border-border/50 bg-black/10"
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
          >
            <defs>
              {series.map((s) => (
                <linearGradient key={s.id} id={`fill-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.03" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                </linearGradient>
              ))}
            </defs>
            {[0, 1, 2, 3, 4].map((i) => (
              <line key={i} x1="0" x2={WIDTH} y1={(HEIGHT / 4) * i} y2={(HEIGHT / 4) * i} stroke="var(--grid-line)" strokeWidth="1" />
            ))}
            {series.filter((s) => visible.has(s.id)).map((s) => {
              const line = buildPath(s.data, s.max);
              if (!line) return null;
              return (
                <g key={s.id}>
                  <path d={`${line} L ${WIDTH},${HEIGHT} L 0,${HEIGHT} Z`} fill={`url(#fill-${s.id})`} />
                  <path
                    d={line}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    style={{ filter: "none" }}
                  />
                  {hover != null && s.data[hover] != null ? (
                    <circle
                      cx={(hover / Math.max(1, s.data.length - 1)) * WIDTH}
                      cy={HEIGHT - (s.data[hover] / s.max) * HEIGHT * 0.92 - HEIGHT * 0.04}
                      r="4"
                      fill={s.color}
                      style={{ filter: `drop-shadow(0 0 6px ${s.color})` }}
                    />
                  ) : null}
                </g>
              );
            })}
            {hoverX != null ? (
              <line x1={hoverX} x2={hoverX} y1="0" y2={HEIGHT} stroke="var(--muted-foreground)" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
            ) : null}
          </svg>
          {/* Angled time-axis labels, like the coin apps */}
          <div className="mt-1 flex justify-between">
            {labels.map((lbl, i) => (
              <span
                key={i}
                className="origin-top-left text-[0.58rem] tracking-wider text-white"
                style={{ transform: "rotate(-35deg)", whiteSpace: "nowrap" }}
              >
                {lbl}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

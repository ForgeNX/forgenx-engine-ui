import { useEffect, useState, type ReactElement } from "react";

type VizProps = { color: string };

/** Equalizer bars — steady rhythmic pulse. */
function EqualizerViz({ color }: VizProps) {
  const bars = [0.45, 0.8, 0.35, 0.95, 0.6, 0.75, 0.4, 0.85, 0.5, 0.7, 0.3, 0.6];
  return (
    <div className="flex h-7 items-end gap-[3px]">
      {bars.map((h, i) => (
        <span
          key={i}
          className="flex-1 rounded-sm"
          style={{
            height: `${h * 100}%`,
            background: `linear-gradient(180deg, ${color}, color-mix(in oklab, ${color} 25%, transparent))`,
            transformOrigin: "bottom",
            animation: `eq 1.6s ease-in-out ${i * 90}ms infinite`,
          }}
        />
      ))}
    </div>
  );
}

/** Continuous scrolling sine wave. */
function WaveViz({ color }: VizProps) {
  return (
    <div className="h-7 overflow-hidden">
      <svg viewBox="0 0 200 28" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
        <g style={{ animation: "wave-slide 3.2s linear infinite" }}>
          {[0, 100, 200].map((x) => (
            <path
              key={x}
              d={`M ${x} 14 q 12.5 -11 25 0 t 25 0 t 25 0 t 25 0`}
              fill="none"
              stroke={color}
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="0.9"
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

/** Sweeping arc gauge that fills and resets. */
function GaugeViz({ color }: VizProps) {
  return (
    <div className="flex h-7 items-center justify-center">
      <svg viewBox="0 0 64 34" className="h-full" aria-hidden="true">
        <path
          d="M 6 30 A 26 26 0 0 1 58 30"
          fill="none"
          stroke="var(--grid-line)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M 6 30 A 26 26 0 0 1 58 30"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="82"
          style={{ animation: "gauge-sweep 4s ease-in-out infinite" }}
        />
      </svg>
    </div>
  );
}

/** Concentric ripple rings radiating outward. */
function RippleViz({ color }: VizProps) {
  return (
    <div className="relative flex h-7 items-center justify-center">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="absolute size-6 rounded-full border"
          style={{
            borderColor: color,
            animation: `ripple 2.4s ease-out ${i * 800}ms infinite`,
          }}
        />
      ))}
      <span className="size-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
    </div>
  );
}

/** A packet travelling along a rail — block relay. */
function RelayViz({ color }: VizProps) {
  return (
    <div className="relative flex h-7 items-center">
      <span className="h-px w-full" style={{ background: "var(--grid-line)" }} />
      {[0, 1].map((i) => (
        <span
          key={i}
          className="absolute top-1/2 h-1.5 w-5 -translate-y-1/2 rounded-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${color})`,
            boxShadow: `0 0 10px ${color}`,
            animation: `relay 2.6s linear ${i * 1300}ms infinite`,
          }}
        />
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map((p) => (
        <span
          key={p}
          className="absolute top-1/2 size-1 -translate-y-1/2 rounded-full opacity-50"
          style={{ left: `calc(${p * 100}% - 2px)`, background: color }}
        />
      ))}
    </div>
  );
}

/** Bubbles rising — queue pressure. */
function BubbleViz({ color }: VizProps) {
  const bubbles = [
    { left: 8, size: 6, delay: 0 },
    { left: 26, size: 4, delay: 700 },
    { left: 44, size: 8, delay: 300 },
    { left: 62, size: 5, delay: 1100 },
    { left: 80, size: 6, delay: 500 },
  ];
  return (
    <div className="relative h-7 overflow-hidden">
      {bubbles.map((b) => (
        <span
          key={b.left}
          className="absolute bottom-0 rounded-full border"
          style={{
            left: `${b.left}%`,
            width: b.size,
            height: b.size,
            borderColor: color,
            background: `color-mix(in oklab, ${color} 25%, transparent)`,
            animation: `bubble 3s ease-in ${b.delay}ms infinite`,
          }}
        />
      ))}
    </div>
  );
}

/** Two-way packet flow — inbound / outbound peers. */
function FlowViz({ color }: VizProps) {
  return (
    <div className="flex h-7 flex-col justify-center gap-1.5">
      {[
        { anim: "flow-right", opacity: 0.9 },
        { anim: "flow-left", opacity: 0.5 },
      ].map((row, r) => (
        <div key={row.anim} className="relative h-2 overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full"
              style={{
                background: color,
                opacity: row.opacity,
                boxShadow: `0 0 8px ${color}`,
                animation: `${row.anim} 2.2s linear ${i * 550 + r * 260}ms infinite`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Digit reel that flickers through values — live counter feel. */
function ReelViz({ color }: VizProps) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 900);
    return () => window.clearInterval(id);
  }, []);
  const cells = 14;
  return (
    <div className="flex h-7 items-center gap-[3px]">
      {Array.from({ length: cells }).map((_, i) => {
        const on = (i + tick) % 3 === 0;
        return (
          <span
            key={i}
            className="h-2.5 flex-1 rounded-sm transition-all duration-500"
            style={{
              background: on ? color : `color-mix(in oklab, ${color} 16%, transparent)`,
              boxShadow: on ? `0 0 8px ${color}` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

export type TileViz = "equalizer" | "wave" | "gauge" | "ripple" | "relay" | "bubble" | "flow" | "reel";

const REGISTRY: Record<TileViz, (props: VizProps) => ReactElement> = {
  equalizer: EqualizerViz,
  wave: WaveViz,
  gauge: GaugeViz,
  ripple: RippleViz,
  relay: RelayViz,
  bubble: BubbleViz,
  flow: FlowViz,
  reel: ReelViz,
};

export function TileVisual({ viz, color }: { viz: TileViz; color: string }) {
  const Component = REGISTRY[viz];
  return <Component color={color} />;
}
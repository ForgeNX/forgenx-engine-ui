import { useEffect, useState } from "react";

import { seededSeries } from "@/components/mining/data";

/** Streams a rolling series that starts from a deterministic (SSR-safe) seed. */
export function useLiveSeries(seed: number, length = 40, intervalMs = 1400, drift = 1) {
  const [series, setSeries] = useState(() => seededSeries(seed, length, drift));

  useEffect(() => {
    const id = window.setInterval(() => {
      setSeries((prev) => {
        const last = prev[prev.length - 1] ?? 0.5;
        const next = Math.min(1, Math.max(0.08, last + (Math.random() - 0.5) * 0.4 * drift));
        return [...prev.slice(1), next];
      });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [drift, intervalMs]);

  return series;
}

/** Animates a number from 0 to `value` once the component is mounted. */
export function useCountUp(value: number, durationMs = 1600) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setDisplay(0);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return display;
}
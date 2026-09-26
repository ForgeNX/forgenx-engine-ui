// use-forge-apps.ts — React hook exposing live ForgeApp[] + fleet stats from the engine API.
// Polls every POLL_MS. Returns the current apps, fleet aggregates, plus loading/error state.

import { useEffect, useRef, useState } from "react";
import { fetchForgeApps, fetchFleetStats, type FleetStats } from "@/lib/forge-api";
import type { ForgeApp } from "@/components/nexus/nexus-data";

const POLL_MS = 15_000;

export function useForgeApps() {
  const [apps, setApps] = useState<ForgeApp[]>([]);
  const [fleet, setFleet] = useState<FleetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [nextApps, nextFleet] = await Promise.all([fetchForgeApps(), fetchFleetStats()]);
        if (!cancelled) {
          setApps(nextApps);
          setFleet(nextFleet);
          setError(null);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "failed to load");
          setLoading(false);
        }
      }
    };

    // Each poll waits for the previous one to finish before scheduling the next,
    // so a slow engine gets fewer requests rather than a growing queue of them.
    const tick = async () => {
      await load();
      if (!cancelled) timer.current = setTimeout(tick, POLL_MS);
    };
    tick();

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return { apps, fleet, loading, error };
}

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
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

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

    load();
    timer.current = setInterval(load, POLL_MS);

    return () => {
      cancelled = true;
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  return { apps, fleet, loading, error };
}

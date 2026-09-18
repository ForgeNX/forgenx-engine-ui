// use-mesh-status.ts — React hook exposing Nexus Mesh state from the engine API.
// Polls every POLL_MS and exposes refresh() so the panel can re-read immediately
// after an assignment instead of waiting out the interval — the user expects the
// row to change as soon as they change it.

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchMeshStatus, type MeshStatus } from "@/lib/forge-api";

const POLL_MS = 15_000;

export function useMeshStatus() {
  const [mesh, setMesh] = useState<MeshStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelled = useRef(false);

  const load = useCallback(async () => {
    try {
      const next = await fetchMeshStatus();
      if (cancelled.current) return;
      setMesh(next);
      setError(null);
    } catch (e) {
      if (!cancelled.current) setError(e instanceof Error ? e.message : "failed to load");
    } finally {
      if (!cancelled.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    cancelled.current = false;
    load();
    timer.current = setInterval(load, POLL_MS);
    return () => {
      cancelled.current = true;
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  return { mesh, loading, error, refresh: load };
}

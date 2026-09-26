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
  // When the last good read arrived, so a failed poll can say how old the
  // figures on screen are.
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelled = useRef(false);

  const load = useCallback(async () => {
    try {
      const next = await fetchMeshStatus();
      if (cancelled.current) return;
      // null means the engine could not be reached (it answers enabled:false
      // when the mesh is off). Keep the last good state rather than blanking
      // it, so a restart does not read as "Mesh disabled".
      if (!next) {
        setError("engine unreachable");
        return;
      }
      setMesh(next);
      setError(null);
      setUpdatedAt(Date.now());
      setLoading(false);
    } catch (e) {
      if (!cancelled.current) setError(e instanceof Error ? e.message : "failed to load");
    }
  }, []);

  useEffect(() => {
    cancelled.current = false;
    // The next poll is scheduled only once this one has answered, so a slow
    // engine is never sent a pile of overlapping requests.
    const tick = async () => {
      await load();
      if (!cancelled.current) timer.current = setTimeout(tick, POLL_MS);
    };
    tick();
    return () => {
      cancelled.current = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load]);

  return { mesh, loading, error, updatedAt, refresh: load };
}

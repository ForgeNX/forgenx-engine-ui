import { useEffect, useRef, useState } from "react";

import type { HashrateView } from "@/components/nexus/workers-data";
import { fetchFoundMiners, fetchMeshSettings, saveMeshSettings, type FoundMiner } from "@/lib/forge-api";

// Held above the tabs, so the Overview's total hashrate and the Miners tab are
// built from the same readings and follow the same Live / Avg choice.

// What the LAN scanner has read from each miner: model, temperatures, uptime,
// its real address and its own hashrate. Polled at the scanner's own pace.
export function useFoundMiners(): FoundMiner[] {
  const [found, setFound] = useState<FoundMiner[]>([]);
  useEffect(() => {
    let live = true;
    const load = async () => {
      const list = await fetchFoundMiners();
      if (live && list) setFound(list);
    };
    load();
    const t = setInterval(load, 30_000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, []);
  return found;
}

// Which of each miner's own figures to show, saved on the engine so it holds
// across reloads, restarts and devices. A saved value arriving after the user
// has already picked does not undo the pick.
export function useHashrateView(): [HashrateView, (v: HashrateView) => void] {
  const [view, setView] = useState<HashrateView>("avg");
  const chosen = useRef(false);
  useEffect(() => {
    fetchMeshSettings().then((st) => {
      if (!chosen.current && (st?.miners_hashrate === "live" || st?.miners_hashrate === "avg")) {
        setView(st.miners_hashrate);
      }
    });
  }, []);
  const choose = (v: HashrateView) => {
    chosen.current = true;
    setView(v);
    saveMeshSettings({ miners_hashrate: v });
  };
  return [view, choose];
}

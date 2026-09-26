// use-engine-meta.ts — hooks exposing engine-level metadata, lifted to the shell
// so the data persists across tab switches (panels receive it as props and never
// re-fetch on mount). Same API calls as before, just owned by the shell.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchEngineInfo,
  fetchEngineUptime,
  fetchCoinSV2List,
  type EngineInfo,
  type CoinSV2,
} from "@/lib/forge-api";

// Engine identity — fetched once (static for the engine's lifetime).
export function useEngineInfo() {
  const [info, setInfo] = useState<EngineInfo | null>(null);
  useEffect(() => {
    let alive = true;
    fetchEngineInfo().then((i) => alive && setInfo(i));
    return () => { alive = false; };
  }, []);
  return info;
}

// Engine uptime and whether it is answering — polled every 5s. online is null
// until the first answer, so the header can say "checking" rather than guess.
export function useEngineStatus() {
  const [uptime, setUptime] = useState<number>(0);
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    const tick = () =>
      fetchEngineUptime().then((u) => {
        if (!alive) return;
        setOnline(u !== null);
        setUptime(u ?? 0);
      });
    tick();
    const id = setInterval(tick, 5000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return { uptime, online };
}

// Per-coin SV2 authority keys — fetched once, with a refresh() the regenerate
// flow calls after regenerating so all consumers update.
export function useCoinSV2List() {
  const [coins, setCoins] = useState<CoinSV2[] | null>(null);
  const inflight = useRef(false);
  const refresh = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      const list = await fetchCoinSV2List();
      setCoins(list);
    } finally {
      inflight.current = false;
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { coins, refresh };
}

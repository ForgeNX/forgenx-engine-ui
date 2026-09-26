// workers-data.ts - one row per physical miner, built from three sources:
//   - each coin's worker sessions (shares, best share, difficulty, protocol)
//   - the mesh status (which miners are meshed, and offline ones with last seen)
//   - the LAN scanner (model, temperatures, the miner's own uptime)
// A meshed miner has a session on every coin it is bonded to, so sessions are
// grouped by the name after the last dot, which is the same across coins.
//
// The coin lists also carry workers that are not connected (online: false),
// with when they were last seen. Those make a miner an offline row rather than a
// live one, and names not seen for a week are left out as history.


import type { CoinWorker, FoundMiner, MeshStatus } from "@/lib/forge-api";
import type { ForgeApp } from "./nexus-data";

const OFFLINE_KEPT_MS = 7 * 24 * 60 * 60 * 1000;
const live = (w: CoinWorker) => w.online !== false;

export type WorkerCoin = {
  sym: string;
  standby: boolean;
  worker: CoinWorker;
};

export type WorkerRow = {
  key: string; // the name after the last dot
  name: string;
  online: boolean;
  viaMesh: boolean;
  coin: string | null; // the coin it is mining now
  coins: WorkerCoin[]; // every coin it has a session on, active first
  active: CoinWorker | null; // the session on the coin it is mining
  model: string;
  ip: string;
  hashrate: number; // TH/s
  hashrateSource: string; // where the figure came from: "miner", "mesh", "coin" or "scanner"
  asicTemp: number;
  asicTempMax: number;
  vrTemp: number;
  uptime: number; // seconds, the miner's own; 0 when unknown
  lastSeen: string | null; // for an offline miner, when it last submitted
};

export type WorkerSummary = {
  online: number;
  offline: number;
  hashrate: number;
  accepted48h: number;
  rejected48h: number;
  bestSession: number;
  bestSessionBy: string;
  bestAllTime: number;
  bestAllTimeBy: string;
};

export const suffix = (name: string) => {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1) : name;
};

export function buildWorkerRows(
  apps: ForgeApp[],
  mesh: MeshStatus | null,
  found: FoundMiner[],
): { rows: WorkerRow[]; summary: WorkerSummary } {
  // Sessions grouped by miner.
  const sessions = new Map<string, WorkerCoin[]>();
  for (const app of apps) {
    for (const w of app.workers ?? []) {
      if (!w.name) continue;
      if (!live(w)) {
        const seen = w.last_seen ? new Date(w.last_seen).getTime() : 0;
        if (!seen || Date.now() - seen > OFFLINE_KEPT_MS) continue;
      }
      const key = suffix(w.name);
      const list = sessions.get(key) ?? [];
      list.push({ sym: app.id.toUpperCase(), standby: Boolean(w.standby), worker: w });
      sessions.set(key, list);
    }
  }

  const meshByName = new Map((mesh?.miners ?? []).map((m) => [m.worker, m]));
  const foundByHost = new Map(found.map((f) => [f.host, f]));
  const foundByName = new Map(found.map((f) => [suffix(f.worker), f]));

  const keys = new Set<string>([...sessions.keys(), ...meshByName.keys()]);
  const rows: WorkerRow[] = [];

  for (const key of keys) {
    const coins = (sessions.get(key) ?? []).sort(
      (a, b) => Number(!live(a.worker)) - Number(!live(b.worker)) || Number(a.standby) - Number(b.standby),
    );
    const active = coins.find((c) => live(c.worker) && !c.standby) ?? null;
    const m = meshByName.get(key);
    const ip = m?.ip || active?.worker.ip || coins[0]?.worker.ip || "";
    const scan = (ip && foundByHost.get(ip)) || foundByName.get(key);

    // A meshed miner is online when the relay has it; a direct one when a coin
    // has a live session for it.
    const online = m ? m.connected : coins.some((c) => live(c.worker));
    const seenOffline = coins
      .map((c) => c.worker.last_seen ?? "")
      .filter(Boolean)
      .sort()
      .pop();

    // The mesh knows where its figure came from and prefers the miner's own;
    // for a direct miner the coin's 15-minute average is used, then the scanner.
    let hashrate = 0;
    let hashrateSource = "";
    if (m && m.hashrate_15m > 0) {
      hashrate = m.hashrate_15m;
      hashrateSource = m.hashrate_source || "mesh";
    } else if (active && (active.worker.hashrate_15m ?? 0) > 0) {
      hashrate = active.worker.hashrate_15m ?? 0;
      hashrateSource = "coin";
    } else if (scan && scan.hashrate_ths > 0) {
      hashrate = scan.hashrate_ths;
      hashrateSource = "scanner";
    }

    rows.push({
      key,
      name: key,
      online,
      viaMesh: Boolean(m),
      coin: (m?.active_coin || active?.sym || "").toUpperCase() || null,
      coins,
      active: active?.worker ?? null,
      model: m?.model || scan?.model || m?.device || active?.worker.device || "",
      ip,
      hashrate: online ? hashrate : 0,
      hashrateSource: online ? hashrateSource : "",
      asicTemp: m?.asic_temp || scan?.asic_temp || 0,
      asicTempMax: m?.asic_temp_max || scan?.asic_temp_max || 0,
      vrTemp: m?.vr_temp || scan?.vr_temp || 0,
      uptime: online ? scan?.uptime_s || 0 : 0,
      lastSeen: online ? null : (m?.last_seen ?? seenOffline ?? null),
    });
  }

  // Totals. Share counts come from every session, so a meshed miner's work on
  // each coin is counted once, where it was done.
  const summary: WorkerSummary = {
    online: rows.filter((r) => r.online).length,
    offline: rows.filter((r) => !r.online).length,
    hashrate: rows.reduce((s, r) => s + r.hashrate, 0),
    accepted48h: 0,
    rejected48h: 0,
    bestSession: 0,
    bestSessionBy: "",
    bestAllTime: 0,
    bestAllTimeBy: "",
  };
  for (const r of rows) {
    for (const c of r.coins) {
      summary.accepted48h += c.worker.shares_48h_valid ?? 0;
      summary.rejected48h += c.worker.shares_48h_invalid ?? 0;
      if ((c.worker.best_session ?? 0) > summary.bestSession) {
        summary.bestSession = c.worker.best_session ?? 0;
        summary.bestSessionBy = r.name;
      }
      if ((c.worker.best_all_time ?? 0) > summary.bestAllTime) {
        summary.bestAllTime = c.worker.best_all_time ?? 0;
        summary.bestAllTimeBy = r.name;
      }
    }
  }
  return { rows, summary };
}

// The miner's best share this session across its coins, with the network
// difficulty it was found against, so it can be read as a share of a block.
export function bestOf(r: WorkerRow): { best: number; netDiff: number; sym: string } {
  let out = { best: 0, netDiff: 0, sym: "" };
  for (const c of r.coins) {
    const b = c.worker.best_session ?? 0;
    if (b > out.best) out = { best: b, netDiff: c.worker.network_diff_at_best ?? 0, sym: c.sym };
  }
  return out;
}

// "3d 4h", "5h 12m", "42m".
export function formatUptime(seconds: number): string {
  if (!seconds || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

// workers-data.ts - one row per physical miner, built from three sources:
//   - each coin's worker sessions (shares, best share, difficulty, protocol)
//   - the mesh status (which miners are meshed, and offline ones with last seen)
//   - the LAN scanner (model, temperatures, the miner's own uptime, its real
//     address and its own hashrate)
// A meshed miner has a session on every coin it is bonded to, so sessions are
// grouped by the name after the last dot, which is the same across coins.
//
// The coin lists also carry workers that are not connected (online: false),
// with when they were last seen. Those make a miner an offline row rather than a
// live one, and names not seen for a week are left out as history.


import { FLEET_AUTO, parseAllocation, type CoinWorker, type FoundMiner, type MeshStatus } from "@/lib/forge-api";
import type { ForgeApp } from "./nexus-data";

const OFFLINE_KEPT_MS = 7 * 24 * 60 * 60 * 1000;
const live = (w: CoinWorker) => w.online !== false;

// Which of a miner's own hashrate figures to show: its most recent one, or its
// longer average. Miners the scanner cannot read show the same figure either way.
export type HashrateView = "live" | "avg";

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
  // The nodes a meshed miner is allocated to: its own split or solo node, or
  // Fleet Balance's nodes. The mesh keeps it bonded to the rest as warm
  // fallbacks, which are not shown as its nodes. null when it has no allocation.
  allocated: string[] | null;
  active: CoinWorker | null; // the session on the coin it is mining
  model: string;
  ip: string;
  hashrate: number; // TH/s
  hashrateSource: string; // where the figure came from: "miner", "mesh", "coin" or "scanner"
  hashrateWindow: string; // for the miner's own figure, the window it covers, e.g. "1m" or "10m"
  asicTemp: number;
  asicTempMax: number;
  vrTemp: number;
  boardTemp: number; // the hottest hash board, for miners with no VR sensor (Braiins OS); 0 when unknown
  uptime: number; // seconds, the miner's own; 0 when unknown
  lastSeen: string | null; // for an offline miner, when it last submitted
};

export type WorkerSummary = {
  online: number;
  offline: number;
  hashrate: number;
  accepted48h: number;
  rejected48h: number;
  stale48h: number;
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
  view: HashrateView = "avg",
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
    const allocationOf = (a: string) =>
      Object.entries(parseAllocation(a))
        .filter(([, pct]) => pct > 0)
        .map(([sym]) => sym);
    const fleetNodes = allocationOf(mesh?.system_target ?? "");
    const allocated =
      m && m.assigned
        ? m.assignment === FLEET_AUTO
          ? fleetNodes.length > 0
            ? fleetNodes
            : null
          : allocationOf(m.assignment)
        : null;
    // The scanner's reading, matched by the name the miner mines under, else by
    // the address the mesh or a coin saw it at.
    const seenAt = m?.ip || active?.worker.ip || coins[0]?.worker.ip || "";
    const scan = foundByName.get(key) || (seenAt ? foundByHost.get(seenAt) : undefined);
    // The address the scanner reached the miner on is its real LAN address. A
    // direct miner's session only knows the address it connected from, which
    // behind NAT is the gateway's.
    const ip = scan?.host || seenAt;

    // A meshed miner is online when the relay has it; a direct one when a coin
    // has a live session for it.
    const online = m ? m.connected : coins.some((c) => live(c.worker));
    const seenOffline = coins
      .map((c) => c.worker.last_seen ?? "")
      .filter(Boolean)
      .sort()
      .pop();

    // The miner's own figure first, live or averaged as chosen. The scanner
    // drops a miner it has not heard from in two minutes, so a reading here is
    // current. Without one, the mesh's figure, then the coin's 15-minute
    // average. An engine too old to send the average falls back to the live one.
    let hashrate = 0;
    let hashrateSource = "";
    let hashrateWindow = "";
    const own =
      view === "avg" && (scan?.hashrate10_ths ?? 0) > 0
        ? { ths: scan?.hashrate10_ths ?? 0, window: scan?.hashrate10_window ?? "" }
        : { ths: scan?.hashrate_ths ?? 0, window: scan?.hashrate_window ?? "" };
    if (own.ths > 0) {
      hashrate = own.ths;
      hashrateSource = "miner";
      hashrateWindow = own.window;
    } else if (m && m.hashrate_15m > 0) {
      hashrate = m.hashrate_15m;
      hashrateSource = m.hashrate_source || "mesh";
    } else if (active && (active.worker.hashrate_15m ?? 0) > 0) {
      hashrate = active.worker.hashrate_15m ?? 0;
      hashrateSource = "coin";
    }

    rows.push({
      key,
      name: key,
      online,
      viaMesh: Boolean(m),
      coin: (m?.active_coin || active?.sym || "").toUpperCase() || null,
      coins,
      allocated: allocated && allocated.length > 0 ? allocated : null,
      active: active?.worker ?? null,
      model: m?.model || scan?.model || m?.device || active?.worker.device || "",
      ip,
      hashrate: online ? hashrate : 0,
      hashrateSource: online ? hashrateSource : "",
      hashrateWindow: online ? hashrateWindow : "",
      asicTemp: m?.asic_temp || scan?.asic_temp || 0,
      asicTempMax: m?.asic_temp_max || scan?.asic_temp_max || 0,
      vrTemp: m?.vr_temp || scan?.vr_temp || 0,
      boardTemp: scan?.board_temp || 0,
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
    stale48h: 0,
    bestSession: 0,
    bestSessionBy: "",
    bestAllTime: 0,
    bestAllTimeBy: "",
  };
  for (const r of rows) {
    for (const c of r.coins) {
      summary.accepted48h += c.worker.shares_48h_valid ?? 0;
      summary.rejected48h += c.worker.shares_48h_invalid ?? 0;
      summary.stale48h += c.worker.shares_48h_stale ?? 0;
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
    if (b > out.best) out = { best: b, netDiff: c.worker.best_session_network_diff ?? 0, sym: c.sym };
  }
  return out;
}

// A best share's recorded time, or null when there is none: the engine sends
// Go's zero time ("0001-01-01...") for a best it has no time for.
export function realTime(iso?: string): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t > Date.UTC(2009, 0, 1) ? iso : null;
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

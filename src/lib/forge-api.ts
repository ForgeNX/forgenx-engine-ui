// forge-api.ts — live data layer for the ForgeNX Engine UI.
//
// Fetches the engine's real endpoints and maps them into the ForgeApp shape the
// Nexus components already consume (see components/nexus/nexus-data.ts for the type).
// The engine serves this UI from its own static/ dir, so these are same-origin calls.
//
// Endpoints used:
//   GET /api/engine/stats            → which coins exist (coins.{SYM})
//   GET /api/apps/{coinId}/status    → per-coin node + pool detail (the rich object)
//
// Metadata the API does NOT provide (display symbol, accent color, chain name) comes
// from COIN_META below, keyed by ticker symbol.

import type { ForgeApp, ForgeAppNode } from "@/components/nexus/nexus-data";

// ── Static per-coin display metadata ────────────────────────────────────────────
// The engine API returns runtime data but not branding. Keyed by uppercase symbol.
// color values map to the --coin-* CSS tokens defined in styles.css.
type CoinMeta = { ticker: string; chain: string; symbol: string; color: string; coinId: string; icon: string };

const COIN_META: Record<string, CoinMeta> = {
  BTC: { ticker: "ForgeBTC", chain: "Bitcoin Core", symbol: "₿", color: "var(--coin-btc)", coinId: "forgebtc", icon: "/coins/ForgeBTC.png" },
  BCH: { ticker: "ForgeBCH", chain: "Bitcoin Cash", symbol: "Ƀ", color: "var(--coin-bch)", coinId: "forgebch", icon: "/coins/ForgeBCH.png" },
  XEC: { ticker: "ForgeXEC", chain: "eCash", symbol: "ⓔ", color: "var(--coin-xec)", coinId: "forgexec", icon: "/coins/ForgeXEC.png" },
  FB: { ticker: "ForgeFB", chain: "Fractal Bitcoin", symbol: "FB", color: "var(--coin-fb)", coinId: "forgefb", icon: "/coins/ForgeFB.png" },
  DGB: { ticker: "ForgeDGB", chain: "DigiByte", symbol: "Ð", color: "var(--coin-dgb)", coinId: "forgedgb", icon: "/coins/ForgeDGB.png" },
  BC2: { ticker: "ForgeBC2", chain: "Bitcoin II", symbol: "B²", color: "var(--coin-bc2)", coinId: "forgebc2", icon: "/coins/ForgeBC2.png" },
  PPC: { ticker: "ForgePPC", chain: "Peercoin", symbol: "Ᵽ", color: "var(--coin-ppc)", coinId: "forgeppc", icon: "/coins/ForgePPC.png" },
};

// ── Raw API response shapes (only the fields we read) ───────────────────────────
type EngineStats = {
  coins: Record<
    string,
    { shares_accepted: number; shares_rejected?: number; blocks_found: number }
  >;
  uptime_seconds?: number;
};

// Fleet-wide aggregate stats derived from /api/engine/stats, for the StatPills row.
export type FleetStats = {
  totalSharesAccepted: number;
  totalSharesRejected: number;
  totalBlocks: number;
  totalOrphaned: number;
  uptimeSeconds: number;
  /** Distinct physical miners across all coins — see fetchFleetStats. */
  totalWorkers: number;
};

type CoinStatus = {
  engine_connected: boolean;
  node: {
    status: string;
    rpcOnline: boolean;
    synced: boolean;
    sync_pct: number;
    initial_block_download: boolean;
    blocks: number;
    headers: number;
    chain_tip: number;
    difficulty: number;
    network_hashrate: string;
    last_block_time: number; // unix seconds
    peers: number;
  };
  pool: {
    hashrate: number; // TH/s (formatted via fmtHashrate)
    worker_count: number;
    best_session_diff: number;
    best_session_worker: string;
    last_block_time: string; // RFC3339 or zero-time
    blocks_found: number;
    blocks_orphaned?: number;
  };
  stratum_port: number;
  stratum_v1_open: boolean;
  stratum_v2_open: boolean;
  zmq_connected: boolean;
};

type CoinSettings = {
  workerName?: string;
  stratum_port?: number;
  sv2Port?: number;
  sv2Enabled?: boolean;
  sv2AuthorityPubkey?: string;
  payoutAddress?: string;
};

type CoinWorker = {
  hashrate_15m?: number;
  hashrate?: number;
  online?: boolean;
};

type CoinWorkers = {
  workers?: CoinWorker[];
};

// ── Formatting helpers ──────────────────────────────────────────────────────────
// The engine reports hashrate values in TH/s (see old UI: raw * 1e12 → H/s).
function fmtHashrate(ths: number): string {
  if (!ths || ths <= 0) return "0 H/s";
  const h = ths * 1e12; // TH/s → H/s
  const units = ["H/s", "KH/s", "MH/s", "GH/s", "TH/s", "PH/s", "EH/s"];
  let i = 0;
  let v = h;
  while (v >= 1000 && i < units.length - 1) {
    v /= 1000;
    i++;
  }
  return `${v.toFixed(2)} ${units[i]}`;
}

function fmtDifficulty(d: number): string {
  if (!d || d <= 0) return "—";
  const units = ["", "K", "M", "G", "T", "P", "E"];
  let i = 0;
  let v = d;
  while (v >= 1000 && i < units.length - 1) {
    v /= 1000;
    i++;
  }
  return `${v.toFixed(2)} ${units[i]}`.trim();
}

function fmtCount(n: number): string {
  return typeof n === "number" ? n.toLocaleString() : "—";
}

function agoFromUnix(sec: number): string {
  if (!sec || sec <= 0) return "—";
  const diff = Date.now() / 1000 - sec;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

function ordinal(day: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = day % 100;
  return day + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function fmtBlockTime(rfc: string): string {
  if (!rfc || rfc.startsWith("0001")) return "No data";
  const d = new Date(rfc);
  if (isNaN(d.getTime())) return "No data";
  // Time first (locale decides 12h/24h), then "29th July 2026".
  const time = d
    .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" })
    .replace(/\s+(?=[ap]m\b)/i, ""); // "5:44:49 am" → "5:44:49am"
  const month = d.toLocaleDateString(undefined, { month: "long" });
  const day = ordinal(d.getDate());
  const year = d.getFullYear();
  return `${time} ${day} ${month} ${year}`;
}

// ── Mapping ─────────────────────────────────────────────────────────────────────
function mapNode(s: CoinStatus, settings: CoinSettings | null): ForgeAppNode {
  const n = s.node;
  const p = s.pool;
  const online = n?.rpcOnline ?? false;
  const syncPercent = Math.round(n?.sync_pct ?? 0);
  const synced = n?.synced ?? false;

  // Build stratum URLs from the browser host + real ports (matches old UI).
  const host = typeof window !== "undefined" ? window.location.hostname : "<host>";
  const v1Port = settings?.stratum_port ?? s.stratum_port;
  const v2Port = settings?.sv2Port ?? 4333;
  const workerName = settings?.workerName?.trim() || "—";
  const payoutAddress = settings?.payoutAddress?.trim() ?? "";
  const authorityKey = settings?.sv2AuthorityPubkey?.trim() ?? "";
  // Full worker name = payoutAddress.workerName (what miners actually authenticate with).
  const fullWorkerName =
    payoutAddress && workerName !== "—" ? `${payoutAddress}.${workerName}` : workerName;

  const payoutConfigured = payoutAddress.length > 0;
  const v1Open = s.stratum_v1_open ?? false;
  const v2Open = s.stratum_v2_open ?? false;
  const engineOnline = s.engine_connected ?? false;
  const zmqOk = s.zmq_connected ?? false;

  return {
    syncStatus: !online
      ? "Offline"
      : synced
        ? "Synced (100%)"
        : `Syncing… (${syncPercent}%)`,
    syncNote: !online
      ? "Node RPC unreachable"
      : synced
        ? "Fully up to date"
        : n?.initial_block_download
          ? "Initial block download"
          : "Catching up to tip",
    syncPercent,
    // Seven readiness checks, each wired to a real signal.
    checks: [
      { label: "Node RPC ready", ok: online },
      { label: "Blockchain synced", ok: online && synced },
      { label: "Payout address configured", ok: payoutConfigured },
      { label: "Stratum V1 port open", ok: v1Open },
      { label: "Stratum V2 port open", ok: v2Open },
      { label: "ForgeNX Engine online", ok: engineOnline },
      { label: "ZMQ connected", ok: zmqOk },
    ],
    blockHeight: String(n?.blocks ?? 0),
    bestHeight: String(n?.headers ?? n?.chain_tip ?? 0),
    blocksFound: p?.blocks_found ?? 0,
    blocksOrphaned: p?.blocks_orphaned ?? 0,
    lastBlock: fmtBlockTime(p?.last_block_time ?? ""),
    lastBlockAgo:
      p?.last_block_time && !p.last_block_time.startsWith("0001")
        ? agoFromUnix(new Date(p.last_block_time).getTime() / 1000)
        : "no blocks yet",
    stratumV1: v1Open ? `stratum+tcp://${host}:${v1Port}` : "unavailable",
    stratumV2: v2Open ? `stratum+tcp://${host}:${v2Port}` : "unavailable",
    stratumV1Subtitle: "",
    stratumV2Subtitle: authorityKey ? `Authority: ${authorityKey}` : "",
    workerName,
    fullWorkerName,
    workerHint: "set per coin in Settings",
    networkDifficulty: fmtDifficulty(n?.difficulty ?? 0),
    networkHashrate: n?.network_hashrate ?? "—",
    bestSessionDifficulty: fmtDifficulty(p?.best_session_diff ?? 0),
  };
}

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// fetchForgeApps: the main entry. Returns the live ForgeApp[] for the installed coins.
export async function fetchForgeApps(): Promise<ForgeApp[]> {
  const stats = await fetchJSON<EngineStats>("/api/engine/stats");
  const symbols = stats?.coins ? Object.keys(stats.coins) : [];
  if (symbols.length === 0) return [];

  // Fetch each coin's status in parallel
  const results = await Promise.all(
    symbols.map(async (sym) => {
      const meta = COIN_META[sym] ?? {
        ticker: `Forge${sym}`,
        chain: sym,
        symbol: sym.slice(0, 2),
        color: "var(--neon-cyan)",
        coinId: `forge${sym.toLowerCase()}`,
        icon: `/coins/Forge${sym}.png`,
      };
      const [status, settings, workers] = await Promise.all([
        fetchJSON<CoinStatus>(`/api/apps/${meta.coinId}/status`),
        fetchJSON<CoinSettings>(`/api/apps/${meta.coinId}/settings`),
        fetchJSON<CoinWorkers>(`/api/apps/${meta.coinId}/workers`),
      ]);
      // 15-minute average hashrate = sum of each worker's hashrate_15m (TH/s).
      // Pool-level status has only instantaneous hashrate, so we aggregate.
      const hashrate15m = (workers?.workers ?? []).reduce(
        (sum, w) => sum + (w.hashrate_15m ?? 0),
        0,
      );
      return { sym, meta, status, settings, hashrate15m };
    }),
  );

  // Total 15m hashrate across coins, for distribution percentages.
  const totalHashrate = results.reduce((sum, r) => sum + (r.hashrate15m ?? 0), 0);

  const apps: ForgeApp[] = results.map(({ sym, meta, status, settings, hashrate15m }) => {
    const online = status?.node?.rpcOnline ?? false;
    const installed = status?.engine_connected ?? status != null;
    const poolHash = hashrate15m;
    const percentage = totalHashrate > 0 ? (poolHash / totalHashrate) * 100 : 0;

    return {
      id: sym.toLowerCase(),
      ticker: meta.ticker,
      chain: meta.chain,
      symbol: meta.symbol,
      color: meta.color,
      icon: meta.icon,
      installed,
      online,
      hashrate: fmtHashrate(poolHash),
      percentage: Number(percentage.toFixed(1)),
      miners: status?.pool?.worker_count ?? 0,
      node: status
        ? mapNode(status, settings)
        : {
            syncStatus: "Not installed",
            syncNote: "Install to begin syncing",
            syncPercent: 0,
            checks: [
              { label: "Node RPC ready", ok: false },
              { label: "Blockchain synced", ok: false },
              { label: "Payout address configured", ok: false },
              { label: "Stratum V1 port open", ok: false },
              { label: "Stratum V2 port open", ok: false },
              { label: "ForgeNX Engine online", ok: false },
              { label: "ZMQ connected", ok: false },
            ],
            blockHeight: "—",
            bestHeight: "—",
            blocksFound: 0,
            blocksOrphaned: 0,
            lastBlock: "No data",
            lastBlockAgo: "awaiting install",
            stratumV1: "unavailable",
            stratumV2: "unavailable",
            stratumV1Subtitle: "",
            stratumV2Subtitle: "",
            workerName: "—",
            fullWorkerName: "—",
            workerHint: "",
            networkDifficulty: "—",
            networkHashrate: "—",
            bestSessionDifficulty: "—",
          },
    };
  });

  return apps;
}

// fetchFleetStats: fleet-wide totals for the top StatPills row.
// NOTE: /api/engine/stats reports blocks_found=0 (volatile counter); the durable
// count lives in each coin's /status pool.blocks_found, so we sum those instead.
export async function fetchFleetStats(): Promise<FleetStats | null> {
  const stats = await fetchJSON<EngineStats>("/api/engine/stats");
  if (!stats?.coins) return null;
  let totalSharesAccepted = 0;
  let totalSharesRejected = 0;
  for (const c of Object.values(stats.coins)) {
    totalSharesAccepted += c.shares_accepted ?? 0;
    totalSharesRejected += c.shares_rejected ?? 0;
  }
  // Sum durable blocks_found from each coin's status.
  const symbols = Object.keys(stats.coins);
  const statuses = await Promise.all(
    symbols.map((sym) => {
      const coinId = COIN_META[sym]?.coinId ?? `forge${sym.toLowerCase()}`;
      return fetchJSON<CoinStatus>(`/api/apps/${coinId}/status`);
    }),
  );
  let totalBlocks = 0;
  let totalOrphaned = 0;
  for (const s of statuses) {
    totalBlocks += s?.pool?.blocks_found ?? 0;
    totalOrphaned += s?.pool?.blocks_orphaned ?? 0;
  }
  // Distinct workers, not the sum of per-coin worker_count. A miner bonded to
  // several coins through Nexus Mesh holds a session on each — one active, the
  // rest warm standbys — so summing counts the same hardware once per coin. Each
  // session authorizes as <coin-payout-address>.<workerName>, so the suffix is
  // what identifies the machine. Per-coin counts stay as they are: a warm session
  // really is connected to that coin.
  let totalWorkers = 0;
  try {
    const minersResp = await fetchJSON<{ miners?: Record<string, Array<{ worker_name?: string }>> }>(
      "/api/engine/miners",
    );
    const names = new Set<string>();
    for (const list of Object.values(minersResp?.miners ?? {})) {
      for (const m of list ?? []) {
        const full = m?.worker_name ?? "";
        const short = full.includes(".") ? full.slice(full.lastIndexOf(".") + 1) : full;
        if (short) names.add(short);
      }
    }
    totalWorkers = names.size;
  } catch {
    /* leave at 0; the pill falls back to the per-coin sum */
  }

  return {
    totalSharesAccepted,
    totalSharesRejected,
    totalBlocks,
    totalOrphaned,
    uptimeSeconds: stats.uptime_seconds ?? 0,
    totalWorkers,
  };
}

// ── Hashrate history (for the over-time chart) ──────────────────────────────────
// Trails the engine actually supports (store.go historyTrails). Keyed by the label
// we show on the chart's time-window buttons.
export const HISTORY_TRAILS: Record<string, string> = {
  "30m": "30m",
  "6h": "6h",
  "1d": "1d",
  "3d": "3d",
  "7d": "7d",
};

export type HistorySeries = {
  pool: number[]; // GH/s samples, oldest → newest
  network: number[];
};

// fetchHistory: pool + network hashrate time-series for one coin over a trail window.
export async function fetchHistory(coinId: string, trail: string): Promise<HistorySeries> {
  const t = HISTORY_TRAILS[trail] ?? "6h";
  const [pool, network] = await Promise.all([
    fetchJSON<{ data: number[] }>(`/api/apps/${coinId}/history?metric=pool_hashrate_raw&trail=${t}`),
    fetchJSON<{ data: number[] }>(`/api/apps/${coinId}/history?metric=network_hashrate_raw&trail=${t}`),
  ]);
  return {
    pool: pool?.data ?? [],
    network: network?.data ?? [],
  };
}

// coinIdForSymbol: expose the coinId lookup for callers that have a symbol/id.
export function coinIdForSymbol(sym: string): string {
  return COIN_META[sym.toUpperCase()]?.coinId ?? `forge${sym.toLowerCase()}`;
}

// ── Engine logs ─────────────────────────────────────────────────────────────
// The engine serves recent log output as a single newline-joined text blob via
// /api/engine/logs?tail=N. Returns the raw text; the Logs panel splits + parses
// lines client-side (level, source, coin tag) for filtering and coloring.
export async function fetchEngineLogs(tail: number): Promise<string> {
  const res = await fetchJSON<{ success: boolean; logs?: string }>(
    `/api/engine/logs?tail=${tail}`,
  );
  return res?.success ? (res.logs || "No log output.") : "Failed to fetch logs.";
}

// ── Engine self-identity ────────────────────────────────────────────────────
// GET /api/engine/info returns the engine's own metadata (name, version, build
// date, developer, description, category, pool_name). Baked into the engine
// binary, so it populates on any host — ForgeNX, UmbrelOS, StratumOS, standalone.
export type EngineInfo = {
  name: string;
  version: string;
  build_date: string;
  developer: string;
  description: string;
  category: string;
  website: string;
  support: string;
  pool_name: string;
};

export async function fetchEngineInfo(): Promise<EngineInfo | null> {
  return fetchJSON<EngineInfo>("/api/engine/info");
}

// engineUptimeSeconds: live uptime from /api/engine/stats (0 if unreachable).
export async function fetchEngineUptime(): Promise<number> {
  const stats = await fetchJSON<{ uptime_seconds?: number; coins?: Record<string, unknown> }>(
    "/api/engine/stats",
  );
  return Math.floor(stats?.uptime_seconds ?? 0);
}

// engineAction: start | stop | restart the engine via forgenxd.
// POST /api/apps/forgenx-engine/{action}. Returns true on success.
export async function engineAction(action: "start" | "stop" | "restart"): Promise<boolean> {
  try {
    const res = await fetch(`/api/apps/forgenx-engine/${action}`, { method: "POST" });
    if (!res.ok) return false;
    const data = await res.json().catch(() => ({}));
    return Boolean(data?.success ?? data?.status ?? true);
  } catch {
    return false;
  }
}

// engineIsUp: quick liveness probe used by the action modal to detect when a
// stop/restart has completed. Resolves true if /api/engine/stats responds.
export async function engineIsUp(): Promise<boolean> {
  try {
    const res = await fetch("/api/engine/stats", { headers: { Accept: "application/json" } });
    return res.ok;
  } catch {
    return false;
  }
}

// ── SV2 authority key regeneration ──────────────────────────────────────────
// POST /api/apps/{coinId}/regenerate-sv2 generates a new SV2 authority keypair
// for the coin, persists it, and reloads the coin runner so it takes effect.
// DESTRUCTIVE: invalidates the current key (miners must update sv2_auth_pk) and
// briefly restarts the coin. Returns the new X-only authority public key.
export async function regenerateSV2(coinId: string): Promise<{ success: boolean; pubkey?: string; reloaded?: boolean; warning?: string }> {
  try {
    const res = await fetch(`/api/apps/${coinId}/regenerate-sv2`, { method: "POST" });
    if (!res.ok) return { success: false };
    return await res.json();
  } catch {
    return { success: false };
  }
}

// ── SV2 authority info (for the Settings tab) ───────────────────────────────
// Fetches each installed coin's SV2 authority key + status directly from its
// settings endpoint (the node/app data layer doesn't carry these fields).
export type CoinSV2 = {
  coinId: string;
  symbol: string;
  ticker: string;
  color: string;
  enabled: boolean;
  port: number | null;
  authorityPubkey: string;
};

export async function fetchCoinSV2List(): Promise<CoinSV2[]> {
  const stats = await fetchJSON<EngineStats>("/api/engine/stats");
  const symbols = stats?.coins ? Object.keys(stats.coins) : [];
  if (symbols.length === 0) return [];
  const results = await Promise.all(
    symbols.map(async (sym) => {
      const meta = COIN_META[sym.toUpperCase()];
      const coinId = meta?.coinId ?? `forge${sym.toLowerCase()}`;
      const s = await fetchJSON<CoinSettings>(`/api/apps/${coinId}/settings`);
      return {
        coinId,
        symbol: sym.toUpperCase(),
        ticker: meta?.ticker ?? sym.toUpperCase(),
        color: meta?.color ?? "var(--neon-cyan)",
        enabled: Boolean(s?.sv2Enabled),
        port: s?.sv2Port ?? null,
        authorityPubkey: s?.sv2AuthorityPubkey?.trim() ?? "",
      } as CoinSV2;
    }),
  );
  return results;
}

// ── Nexus Mesh ──────────────────────────────────────────────────────────────
// A meshed miner points at one port and the relay bonds it to every configured
// coin, keeping the ones it is not mining warm so it can be switched without
// reconnecting. /api/mesh/status describes the lot in one call: each worker's
// active coin, its assignment if the user set one, and assignments whose miner
// is currently offline — those still apply when it comes back.

export type MeshMiner = {
  worker: string;
  active_coin: string;
  assignment: string;
  assigned: boolean;
  connected: boolean;
  // The miner's own address and client string, not the relay's — the coin behind
  // the mesh only ever sees the relay's connection.
  ip: string;
  device: string;
  hashrate_15m: number;
  // Where hashrate_15m came from: "miner" (its own API), "mesh" (measured at the
  // relay from submitted shares) or "coin" (a coin's rolling average).
  hashrate_source?: string;
  // From the miner's own API when the LAN scanner has found it; empty/0 otherwise.
  model?: string;
  chip?: string;
  asic_temp?: number;
  asic_temp_max?: number; // hottest single chip, where the miner reports it
  vr_temp?: number; // 0 when the miner has no regulator sensor
  pins?: string[]; // coins pinned in the allocator, saved on the engine
  // Share outcomes this session, counted at the relay.
  shares_accepted?: number;
  shares_rejected?: number;
  shares_stale?: number;
  difficulty?: number; // current, on the coin it is mining
  next_difficulty?: number; // a change waiting for the next block; 0 when none
};

export type MeshSettings = {
  network_start: string;
  network_end: string;
  include_new: boolean;
  miners_found: number;
  miner_sort: string; // e.g. "hashrate:desc"
  discovered_sort: string;
};

export async function fetchMeshSettings(): Promise<MeshSettings | null> {
  return fetchJSON<MeshSettings>("/api/mesh/settings");
}

// Saves whichever settings are given. The engine validates the range and
// answers with the reason when it rejects one, which is passed back as error.
export async function saveMeshSettings(
  patch: Partial<Pick<MeshSettings, "network_start" | "network_end" | "include_new" | "miner_sort" | "discovered_sort">>,
): Promise<{ ok: boolean; settings?: MeshSettings; error?: string }> {
  try {
    const res = await fetch("/api/mesh/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: j.error ?? j.message ?? "request failed" };
    return { ok: true, settings: j as MeshSettings };
  } catch {
    return { ok: false, error: "request failed" };
  }
}

// Parses "DGB:50,BCH:50" into per-coin percentages. An allocation naming a coin
// the mesh no longer carries is ignored rather than failing the whole string.
export function parseAllocation(alloc: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const pair of (alloc ?? "").split(",")) {
    const [coin, pct] = pair.split(":");
    if (!coin) continue;
    const n = Number(pct);
    out[coin.trim().toUpperCase()] = Number.isFinite(n) ? n : 0;
  }
  return out;
}

// Renders percentages back into the allocation string the engine stores. Coins
// at zero are kept so the order and the set of coins stay explicit.
export function formatAllocation(pcts: Record<string, number>): string {
  // Largest share first, and coins at zero left out entirely. The engine reads a
  // multi-coin allocation as rotation, so keeping a 0% entry would make a miner
  // pinned to one node look like one rotating between two — and the order decides
  // where a rotation starts.
  return Object.entries(pcts)
    .filter(([, pct]) => Math.round(pct) > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([coin, pct]) => `${coin}:${Math.round(pct)}`)
    .join(",");
}

export type MeshStatus = {
  enabled: boolean;
  port: number;
  coins: string[];
  // The order a miner with no assignment of its own bonds its coins in: the first
  // is where it starts, the rest are fallbacks in preference order. Empty when the
  // user has not chosen, in which case the mesh uses its configured order.
  default_order: string[];
  // How long a full rotation cycle takes for miners split across coins, as a Go
  // duration string. Empty when unset, in which case the engine uses its default.
  rotate_interval: string;
  // The System Mesh's split, e.g. "DGB:60,BCH:40". Empty until set.
  system_target?: string;
  system_pins?: string[];
  overview?: MeshOverview;
  miners: MeshMiner[];
};

export async function fetchMeshStatus(): Promise<MeshStatus | null> {
  const s = await fetchJSON<MeshStatus>("/api/mesh/status");
  if (!s) return null;
  return {
    enabled: Boolean(s.enabled),
    port: s.port ?? 0,
    coins: s.coins ?? [],
    default_order: s.default_order ?? [],
    rotate_interval: s.rotate_interval ?? "",
    system_target: s.system_target ?? "",
    system_pins: s.system_pins ?? [],
    overview: s.overview,
    miners: s.miners ?? [],
  };
}

// Sets how long a full rotation cycle takes for miners split across coins. The
// engine clamps it to between fifteen minutes and six hours.
export async function setMeshInterval(
  interval: string,
): Promise<{ ok: boolean; note: string }> {
  try {
    const res = await fetch("/api/mesh/interval", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interval }),
    });
    if (!res.ok) return { ok: false, note: "request failed" };
    const j = await res.json();
    return { ok: Boolean(j.ok), note: j.note ?? "" };
  } catch {
    return { ok: false, note: "request failed" };
  }
}

// Sets the order unassigned miners bond their coins in. Miners already connected
// are left alone, so the note says this applies to new and reconnecting ones.
export async function setMeshDefault(
  coins: string[],
): Promise<{ ok: boolean; note: string }> {
  try {
    const res = await fetch("/api/mesh/default", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coins }),
    });
    if (!res.ok) return { ok: false, note: "request failed" };
    const j = await res.json();
    return { ok: Boolean(j.ok), note: j.note ?? "" };
  } catch {
    return { ok: false, note: "request failed" };
  }
}

// Assigning saves the allocation and, when the miner is connected and bonded to
// that coin, moves it straight away. `applied` distinguishes the two so the UI
// can say "done" rather than "when it next connects"; `note` carries the reason
// when it could not be applied now.
export async function assignMeshWorker(
  worker: string,
  allocation: string,
): Promise<{ ok: boolean; applied: boolean; note: string }> {
  try {
    const res = await fetch("/api/mesh/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ worker, allocation }),
    });
    if (!res.ok) return { ok: false, applied: false, note: "request failed" };
    const j = await res.json();
    return { ok: Boolean(j.ok), applied: Boolean(j.applied), note: j.note ?? "" };
  } catch {
    return { ok: false, applied: false, note: "request failed" };
  }
}

// Clearing returns the miner to the mesh default. It keeps mining whatever it is
// on until it reconnects, which the note says.
export async function unassignMeshWorker(
  worker: string,
): Promise<{ ok: boolean; note: string }> {
  try {
    const res = await fetch("/api/mesh/unassign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ worker }),
    });
    if (!res.ok) return { ok: false, note: "request failed" };
    const j = await res.json();
    return { ok: Boolean(j.ok), note: j.note ?? "" };
  } catch {
    return { ok: false, note: "request failed" };
  }
}

// Sets the System Mesh split. The balancer moves included miners towards it,
// gradually - it leaves each coin alone while it is within a few points.
export async function setMeshSystemTarget(target: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/mesh/system", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target }),
    });
    const j = await res.json().catch(() => ({}));
    return res.ok ? { ok: true } : { ok: false, error: j.error ?? "request failed" };
  } catch {
    return { ok: false, error: "request failed" };
  }
}

// Saves which coins are pinned in the allocator, for a worker or for Fleet
// Balance ("__system__"), so pins hold across reloads and devices.
export async function setMeshPins(worker: string, coins: string[]): Promise<boolean> {
  try {
    const res = await fetch("/api/mesh/pins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ worker, coins }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// A miner the LAN scanner found, with its own readings. on_mesh means it is
// mining through the mesh now; points_at_mesh means its pool setting is the
// mesh port - a miner can be one without the other.
export type FoundMiner = {
  worker: string;
  host: string;
  driver: string;
  model: string;
  chip: string;
  hashrate_ths: number;
  asic_temp: number;
  asic_temp_max: number;
  vr_temp: number;
  pool_url: string;
  on_mesh: boolean;
  mesh_coin: string;
  points_at_mesh: boolean;
};

export async function fetchFoundMiners(): Promise<FoundMiner[]> {
  const r = await fetchJSON<{ miners: FoundMiner[] }>("/api/mesh/miners");
  return r?.miners ?? [];
}

// Session totals for the mesh, since the engine last started.
export type MeshOverview = {
  since: string;
  connected: number;
  total_ths: number;
  peak_ths: number;
  best_share: number;
  blocks: number;
  accepted: number;
  rejected: number;
  stale: number;
  switches: number;
  nodes: { coin: string; miners: number; ths: number }[];
};

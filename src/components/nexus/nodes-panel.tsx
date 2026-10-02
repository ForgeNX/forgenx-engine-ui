import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Activity, ExternalLink, Network } from "lucide-react";

import { AuroraText } from "./aurora-text";
import { ShineBorder } from "./shine-border";
import { bestShare, bestShareContext, compactNumber, formatHashrate, timeAgo } from "./format";
import type { ForgeApp } from "./nexus-data";
import { Ars, HashrateToggle, SOURCE, windowText } from "./workers-panel";
import type { HashrateView, WorkerRow } from "./workers-data";
import { fetchAppLinks, fetchMeshSettings, saveMeshSettings } from "@/lib/forge-api";

// Every node the engine mines to: a list on the left, online first, and the
// selected node's detail on the right. The detail is a read-only summary of the
// node and of what the fleet is doing on it; settings, block history, charts and
// logs stay in the coin app, which the detail links to.
//
// Miner counts and hashrates come from the same rows as the Miners tab, so each
// miner is counted once, on the node it is mining, at the Live / Avg figure
// chosen there or here.

// Width at which the node list and the detail fit side by side: the 30rem list,
// a 1rem gap and at least 50rem of detail.
const SIDE_BY_SIDE_PX = 81 * 16;

// How the node list and the miners on a node are sorted. Both are saved on the
// engine, like the Miners tab's sort, so they hold across reloads, restarts and
// devices.
type Dir = "asc" | "desc";
type NodeSortKey = "name" | "hashrate" | "miners" | "status";
type MinerSortKey = "name" | "connection" | "hashrate" | "difficulty" | "best";
type Sort<K> = { key: K; dir: Dir };

const NODE_SORTS: { key: NodeSortKey; label: string; first: Dir }[] = [
  { key: "name", label: "Name", first: "asc" },
  { key: "hashrate", label: "Hashrate", first: "desc" },
  { key: "miners", label: "Miners", first: "desc" },
  { key: "status", label: "Status", first: "desc" },
];
// Miners on a node: miner, connection, hashrate, difficulty, best share.
const MINER_COLS =
  "grid-cols-[minmax(10rem,1.4fr)_minmax(6rem,0.8fr)_minmax(7rem,1fr)_minmax(5rem,0.7fr)_minmax(12rem,1.5fr)]";

const MINER_SORT_FIRST: Record<MinerSortKey, Dir> = {
  name: "asc",
  connection: "asc",
  hashrate: "desc",
  difficulty: "desc",
  best: "desc",
};

function parseSort<K extends string>(saved: string | undefined, keys: readonly K[]): Sort<K> | null {
  const [key, dir] = (saved ?? "").split(":");
  return keys.includes(key as K) && (dir === "asc" || dir === "desc") ? { key: key as K, dir } : null;
}

// The next sort after a click: the same key flips direction, a new key starts
// in its natural direction.
function nextSort<K>(cur: Sort<K>, key: K, first: Dir): Sort<K> {
  return cur.key === key ? { key, dir: cur.dir === "asc" ? "desc" : "asc" } : { key, dir: first };
}

const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

// Synced nodes rank above syncing ones, and a syncing node by how far along it is.
function statusRank(a: ForgeApp): number {
  if (!a.online) return -1;
  return a.node.syncStatus.startsWith("Synced") ? 101 : a.node.syncPercent;
}

// Per node: the miners mining it, and those on standby for it - allocated to it
// (their own split, or Fleet Balance's nodes) but mining another node right now.
// The mesh also keeps every miner warm on nodes it is not allocated to, as a
// failover; those are not counted.
type NodeMiners = { mining: WorkerRow[]; standby: number; ths: number };

function minersOn(sym: string, rows: WorkerRow[]): NodeMiners {
  const mining = rows.filter((r) => r.online && r.coin === sym);
  const standby = rows.filter((r) => r.online && r.coin !== sym && (r.allocated?.includes(sym) ?? false)).length;
  return { mining, standby, ths: mining.reduce((s, r) => s + r.hashrate, 0) };
}

// "3d 4h", "42m 10s", "just now" - to the second while recent.
function agoSeconds(iso?: string): string {
  if (!iso || iso.startsWith("0001")) return "—";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (!Number.isFinite(s)) return "—";
  if (s < 60) return `${Math.max(0, s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s ago`;
  return timeAgo(iso);
}

// Expected time for this node's miners to find a block at the current network
// difficulty: difficulty x 2^32 hashes, at their combined rate.
function timeToBlock(difficulty: number, ths: number): string {
  if (!difficulty || !ths) return "—";
  const secs = (difficulty * 2 ** 32) / (ths * 1e12);
  const days = secs / 86400;
  if (days >= 3650) return `${(days / 365).toFixed(1)} yrs`;
  if (days >= 1) return `${days.toFixed(1)}d`;
  const hours = secs / 3600;
  if (hours >= 1) return `${hours.toFixed(1)}h`;
  return `${Math.max(1, Math.round(secs / 60))}m`;
}

function pct(n: number, digits = 1): string {
  return `${n >= 99.95 && digits === 1 ? "100" : n.toFixed(digits)}%`;
}

// A ratio of a share to the network difficulty, as a percentage: small ones need
// more places to say anything.
function ratioPct(ratio?: number): string {
  if (!ratio || ratio <= 0) return "—";
  const p = ratio * 100;
  return p >= 1 ? `${p.toFixed(2)}%` : `${p.toPrecision(2)}%`;
}

function OnlineBadge({ online }: { online: boolean }) {
  return (
    <span
      className="flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.6rem] font-semibold tracking-[0.16em] uppercase"
      style={{
        color: online ? "var(--neon-green)" : "#ff0080",
        borderColor: online ? "color-mix(in oklab, var(--neon-green) 55%, transparent)" : "color-mix(in oklab, #ff0080 55%, transparent)",
        boxShadow: online ? "0 0 14px -4px var(--neon-green)" : "0 0 14px -4px #ff0080",
      }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{
          background: online ? "var(--neon-green)" : "#ff0080",
          animation: online ? "pulse-glow 2.2s ease-in-out infinite" : undefined,
        }}
      />
      {online ? "Online" : "Offline"}
    </span>
  );
}

function CoinIcon({ app, size }: { app: ForgeApp; size: string }) {
  return (
    <span
      className={`font-display flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-md text-lg font-bold`}
      style={{ color: app.color }}
    >
      {app.icon ? <img src={app.icon} alt={app.ticker} className="size-full object-contain" /> : app.symbol}
    </span>
  );
}

// One node in the list: who it is and a few figures at a glance.
function NodeCard({
  app,
  miners,
  selected,
  wide,
  onSelect,
  children,
}: {
  app: ForgeApp;
  miners: NodeMiners;
  selected: boolean;
  wide: boolean;
  onSelect: () => void;
  children?: ReactNode;
}) {
  const online = app.online;
  const n = app.node;
  const synced = online && n.syncPercent >= 100 && n.syncStatus.startsWith("Synced");
  return (
    <div
      className="rounded-xl border transition"
      style={{
        opacity: online ? 1 : 0.6,
        borderColor: selected ? "var(--neon-cyan)" : "color-mix(in oklab, var(--border) 60%, transparent)",
        background: selected ? "color-mix(in oklab, var(--neon-cyan) 7%, transparent)" : undefined,
      }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-pressed={wide ? selected : undefined}
        aria-expanded={wide ? undefined : selected}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
        className="cursor-pointer p-3.5 transition hover:bg-secondary/30"
      >
        <div className="flex items-center gap-3">
          <CoinIcon app={app} size="size-11" />
          <div className="min-w-0">
            <p className="font-display truncate text-lg font-bold tracking-tight">
              <AuroraText colors={[app.color, "#7928CA", "#38bdf8", app.color]}>{app.ticker}</AuroraText>
            </p>
            <p className="truncate text-[0.7rem] text-white">{app.chain}</p>
          </div>
          <span className="ml-auto">
            <OnlineBadge online={online} />
          </span>
        </div>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[0.7rem]">
          <dt className="text-foreground/90">Sync:</dt>
          <dd style={{ color: synced ? "var(--neon-green)" : online ? "var(--neon-gold)" : "#ff0080" }}>
            {n.syncStatus}
          </dd>
          <dt className="text-foreground/90">Miners:</dt>
          <dd>
            {online ? (
              <>
                <span style={{ color: miners.mining.length > 0 ? "var(--neon-green)" : undefined }}>
                  {miners.mining.length} mining
                </span>
                <span className="text-foreground/90"> · {miners.standby} on standby</span>
              </>
            ) : (
              "—"
            )}
          </dd>
          <dt className="text-foreground/90">Hashrate:</dt>
          <dd className="text-neon-cyan">{online && miners.ths > 0 ? formatHashrate(miners.ths) : "—"}</dd>
        </dl>
      </div>
      {children}
    </div>
  );
}

function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border/70 bg-secondary/25 p-3.5 ${className ?? ""}`}>
      <p className="flex items-center gap-2 text-[0.62rem] font-semibold tracking-[0.2em] text-white uppercase">
        <span className="h-3 w-0.5 rounded-full bg-neon-cyan" />
        {title}
      </p>
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

// A label and its value on one line, as the coin apps lay them out.
function Line({ label, sub, children }: { label: string; sub?: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/30 py-1 last:border-b-0">
      <span className="text-foreground/90">
        {label}
        {sub && <span className="text-[0.58rem] text-foreground"> ({sub})</span>}:
      </span>
      <span className="min-w-0 truncate text-right">{children}</span>
    </div>
  );
}

// A Line that opens to show more beneath it, as the coin apps do.
function DropLine({
  label,
  sub,
  value,
  details,
}: {
  label: string;
  sub?: string;
  value: ReactNode;
  details: { label: string; value: ReactNode }[];
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="border-b border-border/30 py-1 last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={id}
          className="flex items-baseline gap-1 text-left text-foreground/90 transition hover:text-foreground"
        >
          <span>
            {label}
            {sub && <span className="text-[0.58rem] text-foreground"> ({sub})</span>}:
          </span>
          <span
            className="text-[0.9rem] leading-none transition-transform"
            style={{ color: "var(--neon-green)", transform: open ? "rotate(180deg)" : undefined }}
          >
            ▾
          </span>
        </button>
        <span className="min-w-0 truncate text-right">{value}</span>
      </div>
      {open && (
        <dl id={id} className="mt-1 mb-0.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 pl-3 text-[0.66rem]">
          {details.map((d) => (
            <div key={d.label} className="contents">
              <dt className="text-foreground/90">{d.label}:</dt>
              <dd className="text-right">{d.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

// "6:38pm 27/09/2026", or null for a missing or zero time.
function achievedAt(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime()) || d.getFullYear() < 2009) return null;
  const h = d.getHours();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${h % 12 || 12}:${pad(d.getMinutes())}${h < 12 ? "am" : "pm"} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// Who found the best share, opening to show when they found it.
function ByDrop({ name, at }: { name?: string; at?: string | null }) {
  const [open, setOpen] = useState(false);
  if (!name) return at ? <span className="block truncate">{at}</span> : null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 transition hover:text-foreground"
      >
        by {name}
        {at && (
          <span
            className="text-[0.9rem] leading-none transition-transform"
            style={{ color: "var(--neon-green)", transform: open ? "rotate(180deg)" : undefined }}
          >
            ▾
          </span>
        )}
      </button>
      {open && at && <span className="block truncate">Achieved: {at}</span>}
    </>
  );
}

// A headline figure for the node, laid out as the Mesh Overview's figures.
function Tile({ label, value, sub, color }: { label: string; value: ReactNode; sub?: ReactNode; color?: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <span className="text-[0.6rem] tracking-[0.14em] text-foreground/90 uppercase">{label}</span>
      <span className="font-mono text-sm font-semibold" style={{ color: color ?? "var(--foreground)" }}>
        {value}
      </span>
      {sub && <span className="max-w-full font-mono text-[0.62rem] text-foreground/90">{sub}</span>}
    </div>
  );
}

function Pill({ label, value, sub, color }: { label: string; value: ReactNode; sub?: string; color?: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border/60 px-3 py-2">
      <p className="text-[0.58rem] tracking-[0.14em] text-foreground/90 uppercase">{label}</p>
      <p className="mt-0.5 truncate font-mono text-[0.8rem] font-semibold" style={{ color: color ?? "var(--foreground)" }}>
        {value}
      </p>
      {sub && <p className="truncate font-mono text-[0.6rem] text-foreground/90">{sub}</p>}
    </div>
  );
}

function By({ name }: { name?: string }) {
  return name ? <span className="text-foreground/90"> by {name}</span> : null;
}

// Everything about one node: how the fleet is doing on it this session, the
// miners on it, its lifetime record and the network it is on.
function NodeDetail({
  app,
  miners,
  view,
  link,
  onOpenMiner,
  sort,
  onSort,
}: {
  app: ForgeApp;
  miners: NodeMiners;
  view: HashrateView;
  link?: string;
  onOpenMiner: (key: string) => void;
  sort: Sort<MinerSortKey>;
  onSort: (key: MinerSortKey) => void;
}) {
  const sym = app.id.toUpperCase();
  const st = app.status;
  const node = st?.node;
  const pool = st?.pool;
  const online = app.online;

  // This session's shares, from each connected worker's own counts.
  const live = (app.workers ?? []).filter((w) => w.online !== false);
  const sa = live.reduce((s, w) => s + (w.valid_shares ?? 0), 0);
  const sr = live.reduce((s, w) => s + (w.invalid_shares ?? 0), 0);
  const ss = live.reduce((s, w) => s + (w.stale_shares ?? 0), 0);
  const sessionTotal = sa + sr + ss;

  // Lifetime counts, kept by the engine across restarts.
  const aa = pool?.shares_accepted ?? 0;
  const ar = pool?.shares_rejected ?? 0;
  const at = pool?.shares_stale ?? 0;
  const allTotal = aa + ar + at;

  // The engine samples each node's total from the miners' own figures every 30
  // seconds and keeps the highest; never shown below the total on screen now.
  const peak = Math.max((view === "live" ? pool?.max_hashrate_live : pool?.max_hashrate_avg) ?? 0, miners.ths);

  const lag = node ? Math.max(0, (node.headers ?? 0) - (node.blocks ?? 0)) : 0;
  const difficulty = node?.difficulty ?? 0;
  const bestOn = (r: WorkerRow) => r.coins.find((c) => c.sym === sym)?.worker.best_session ?? 0;
  // The hover label on a miner row, drawn by the pointer. A browser's own
  // tooltip cannot be styled, so this one is ours.
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const sign = sort.dir === "desc" ? -1 : 1;
  const sessionOn = (r: WorkerRow) => r.coins.find((c) => c.sym === sym)?.worker;
  const minerCmp: Record<MinerSortKey, (a: WorkerRow, b: WorkerRow) => number> = {
    name: (a, b) => byName(a.name, b.name),
    // Mesh before Direct, then by protocol.
    connection: (a, b) =>
      Number(!a.viaMesh) - Number(!b.viaMesh) ||
      (sessionOn(a)?.protocol ?? "~").localeCompare(sessionOn(b)?.protocol ?? "~"),
    hashrate: (a, b) => a.hashrate - b.hashrate,
    difficulty: (a, b) => (sessionOn(a)?.difficulty ?? 0) - (sessionOn(b)?.difficulty ?? 0),
    best: (a, b) => bestOn(a) - bestOn(b),
  };
  // Names break ties so rows keep their places between polls.
  const sortedMiners = [...miners.mining].sort(
    (a, b) => sign * minerCmp[sort.key](a, b) || byName(a.name, b.name),
  );
  const head = (key: MinerSortKey, label: ReactNode, right = false) => (
    <button
      type="button"
      onClick={() => onSort(key)}
      aria-pressed={sort.key === key}
      className={`flex items-center gap-1 uppercase tracking-[0.12em] transition hover:text-foreground ${right ? "justify-end" : ""}`}
      style={{ color: sort.key === key ? "var(--neon-cyan)" : undefined }}
    >
      {label}
      {sort.key === key && <span>{sort.dir === "asc" ? "↑" : "↓"}</span>}
    </button>
  );

  const found = pool?.blocks_found ?? 0;
  const orphaned = pool?.blocks_orphaned ?? 0;
  const bestBy = pool?.best_session_worker ? pool.best_session_worker.split(".").pop() : "";
  const bestAt = achievedAt(pool?.best_session_time);

  return (
    <div className="flex flex-col gap-3 font-mono text-[0.72rem]">
      {/* The node's headline figures, full width above the detail. */}
      <div
        className="relative overflow-hidden rounded-xl border border-border/70 p-4"
        style={{ background: "color-mix(in oklab, var(--secondary) 25%, transparent)" }}
      >
        {/* The same moving beam, in the coin's colour, as the node panel on the Overview tab. */}
        <ShineBorder borderWidth={1.5} duration={14} shineColor={[app.color, "var(--neon-cyan)", app.color]} />
        <span className="flex items-center gap-2">
          <Activity className="size-4 text-neon-cyan" />
          <span className="font-display text-sm font-bold">Node Overview</span>
        </span>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 @2xl:grid-cols-4">
        <Tile
          label="Worker count"
          value={
            <span style={{ color: miners.mining.length > 0 ? "var(--neon-green)" : undefined }}>
              {miners.mining.length} mining
            </span>
          }
          sub={`${miners.standby} on standby`}
        />
        <Tile
          label={`Total hashrate (${view === "live" ? "live" : "avg"})`}
          value={miners.ths > 0 ? formatHashrate(miners.ths) : "—"}
          color="var(--neon-cyan)"
        />
        <Tile
          label="Best share (session)"
          value={(pool?.best_session_diff ?? 0) > 0 ? bestShare(pool?.best_session_diff ?? 0) : "—"}
          color="var(--neon-cyan)"
          sub={
            bestBy || bestAt ? (
              <>
                <ByDrop name={bestBy} at={bestAt} />
              </>
            ) : undefined
          }
        />
        <Tile
          label="Blocks found"
          value={found.toLocaleString()}
          color={found > 0 ? "var(--neon-gold)" : undefined}
          sub={orphaned > 0 ? <span style={{ color: "#ff0080" }}>{orphaned} orphaned</span> : undefined}
        />
        </div>
      </div>

      <div className="grid gap-3 @4xl:grid-cols-2">
        <Section title="Mining status">
          <Line label="Max session hashrate" sub={view === "live" ? "live" : "avg"}>
            {peak > 0 ? formatHashrate(peak) : "—"}
          </Line>
          <DropLine
            label="Closest to block"
            sub="session"
            value={
              <>
                <span className="text-neon-cyan">{ratioPct(pool?.best_ratio)}</span>
                <By name={pool?.best_ratio_worker ? pool.best_ratio_worker.split(".").pop() : undefined} />
              </>
            }
            details={[
              {
                label: "Share difficulty",
                value: (pool?.best_ratio_share_diff ?? 0) > 0 ? bestShare(pool?.best_ratio_share_diff ?? 0) : "—",
              },
              {
                label: "Network difficulty",
                value: (pool?.best_ratio_net_diff ?? 0) > 0 ? compactNumber(pool?.best_ratio_net_diff ?? 0) : "—",
              },
              {
                label: "Block height",
                value: (pool?.best_ratio_height ?? 0) > 0 ? (pool?.best_ratio_height ?? 0).toLocaleString() : "—",
              },
            ]}
          />
          <Line label="Network difficulty">{difficulty > 0 ? compactNumber(difficulty) : "—"}</Line>
          <Line label="Last share">{agoSeconds(pool?.last_share_time)}</Line>
          <Line label="Total shares" sub="session">
            {sessionTotal > 0 ? <Ars a={sa} r={sr} s={ss} /> : "—"}
          </Line>
          <Line label="Valid shares" sub="session">
            <span style={{ color: "var(--neon-green)" }}>{sessionTotal > 0 ? pct((sa / sessionTotal) * 100) : "—"}</span>
          </Line>
        </Section>

        <Section title="All time node stats">
          <Line label="Best share difficulty" sub="all time">
            <span className="text-neon-cyan">
              {(pool?.best_all_time_diff ?? 0) > 0 ? bestShare(pool?.best_all_time_diff ?? 0) : "—"}
            </span>
            <By name={pool?.best_all_time_worker ? pool.best_all_time_worker.split(".").pop() : undefined} />
          </Line>
          <Line label="Total shares">{allTotal > 0 ? allTotal.toLocaleString() : "—"}</Line>
          <Line label="Valid shares">
            <span style={{ color: "var(--neon-green)" }}>{allTotal > 0 ? pct((aa / allTotal) * 100, 2) : "—"}</span>
          </Line>
          <Line label="Shares accepted">
            <span style={{ color: "var(--neon-green)" }}>{aa.toLocaleString()}</span>
          </Line>
          <Line label="Shares rejected">
            <span style={{ color: ar > 0 ? "#ff0080" : undefined }}>{ar.toLocaleString()}</span>
          </Line>
          <Line label="Shares stale">
            <span style={{ color: at > 0 ? "var(--neon-gold)" : undefined }}>{at.toLocaleString()}</span>
          </Line>
        </Section>
      </div>

      {/* Full width, with room for more columns later. */}
      <Section title="Miners on this node">
        {miners.mining.length === 0 ? (
          <p className="py-2 text-foreground/90">
            {online ? "No miners are mining this node right now." : "The node is offline."}
          </p>
        ) : (
          <>
            {/* The same columns as the Miners tab's list, for the miners on this node. */}
            <div className="overflow-x-auto">
              <div className="min-w-[46rem]">
                <div className={`grid ${MINER_COLS} gap-x-3 px-1 pb-1.5 text-[0.58rem] tracking-[0.12em] text-foreground/90 uppercase`}>
                  {head("name", "Miner")}
                  {head("connection", "Connection")}
                  {head("hashrate", "Hashrate")}
                  {head("difficulty", "Difficulty")}
                  {head(
                    "best",
                    <>
                      Best share <span className="text-[0.5rem] text-foreground normal-case">(session)</span>
                    </>,
                  )}
                </div>
                <div className="flex flex-col">
                  {sortedMiners.map((r) => {
                    const w = r.coins.find((c) => c.sym === sym)?.worker;
                    const best = w?.best_session ?? 0;
                    const context = bestShareContext(best, w?.best_session_network_diff ?? 0, w?.best_session_height);
                    const source = SOURCE[r.hashrateSource];
                    return (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => onOpenMiner(r.key)}
                        aria-label={`Open ${r.name} on the Miners tab`}
                        onMouseMove={(e) => setTip({ text: `Open ${r.name} on the Miners tab`, x: e.clientX, y: e.clientY })}
                        onMouseLeave={() => setTip(null)}
                        className={`grid ${MINER_COLS} items-center gap-x-3 rounded-md border-b border-border/30 px-1 py-1.5 text-left transition last:border-b-0 hover:bg-secondary/40`}
                      >
                        {/* Miner, with its device and address */}
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="size-1.5 shrink-0 rounded-full"
                            style={{ background: "var(--neon-green)", boxShadow: "0 0 6px var(--neon-green)" }}
                          />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{r.name}</span>
                            <span className="block truncate text-[0.62rem] text-foreground/90">
                              {r.model || "unknown device"}
                              {r.ip && ` · ${r.ip}`}
                            </span>
                          </span>
                        </span>

                        {/* How it connects: through the mesh or direct, and the protocol */}
                        <span className="flex flex-wrap items-center gap-x-1.5">
                          <span
                            className="rounded border px-1 text-[0.58rem] font-semibold"
                            style={
                              r.viaMesh
                                ? { borderColor: "var(--neon-cyan)", color: "var(--neon-cyan)" }
                                : { borderColor: "oklch(0.78 0.17 296)", color: "oklch(0.78 0.17 296)" }
                            }
                          >
                            {r.viaMesh ? "Mesh" : "Direct"}
                          </span>
                          {w?.protocol && <span className="text-[0.6rem] text-foreground/90">{w.protocol.toUpperCase()}</span>}
                        </span>

                        {/* Hashrate, and where the figure came from */}
                        <span>
                          <span style={{ color: source?.color ?? "var(--neon-cyan)" }}>
                            {r.hashrate > 0 ? formatHashrate(r.hashrate) : "—"}
                          </span>
                          {source && r.hashrate > 0 && (
                            <span className="block text-[0.62rem] text-foreground">
                              ({source.text}
                              {r.hashrateWindow && ` · ${windowText(r.hashrateWindow)}`})
                            </span>
                          )}
                        </span>

                        <span>{(w?.difficulty ?? 0) > 0 ? compactNumber(w?.difficulty ?? 0) : "—"}</span>

                        {/* Best share this session, against the network when it was found */}
                        <span>
                          <span className="text-neon-cyan">{best > 0 ? bestShare(best) : "—"}</span>
                          {context && <span className="block text-[0.62rem] text-foreground/90">{context}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </Section>

      <Section title="Network">
        <div className="grid grid-cols-2 gap-2 @xl:grid-cols-4 @6xl:grid-cols-7">
          <Pill label="Network difficulty" value={difficulty > 0 ? compactNumber(difficulty) : "—"} color="var(--neon-green)" />
          <Pill label="Network hashrate" value={node?.network_hashrate || "—"} color="var(--neon-green)" />
          <Pill label="Est. time to block" value={timeToBlock(difficulty, miners.ths)} />
          <Pill
            label="Chain lag"
            value={!online ? "—" : lag === 0 ? "In sync" : `${lag.toLocaleString()} block${lag === 1 ? "" : "s"}`}
            color={online && lag > 0 ? "var(--neon-gold)" : undefined}
          />
          <Pill label="Last block" value={node?.last_block_time ? timeAgo(node.last_block_time * 1000) : "—"} />
          <Pill
            label="Mempool"
            value={
              node?.mempool_size_mb !== undefined ? (
                <>
                  {node.mempool_size_mb.toFixed(2)} MiB
                  {node.mempool_txns !== undefined && (
                    <span className="text-[0.62rem] font-normal text-foreground/90">
                      {" "}({node.mempool_txns.toLocaleString()} tx)
                    </span>
                  )}
                </>
              ) : (
                "—"
              )
            }
          />
          <Pill
            label="Connections"
            value={node?.peers_in !== undefined ? `${node.peers_in} in / ${node.peers_out ?? 0} out` : "—"}
          />
        </div>
      </Section>

      {tip &&
        createPortal(
          <div
            role="tooltip"
            className="pointer-events-none fixed z-50 rounded-md border px-2 py-1 font-mono text-[0.68rem] font-semibold whitespace-nowrap text-white shadow-lg"
            style={{
              left: tip.x + 14,
              top: tip.y + 16,
              background: "color-mix(in oklab, var(--neon-cyan) 10%, #02050d)",
              borderColor: "color-mix(in oklab, var(--neon-cyan) 60%, transparent)",
            }}
          >
            {tip.text}
          </div>,
          document.body,
        )}
      {link && (
        <p className="text-[0.7rem] text-foreground/90">
          Settings, found blocks, charts and logs are in{" "}
          <a href={link} target="_blank" rel="noreferrer" className="text-neon-cyan hover:underline">
            {app.ticker}
          </a>
          .
        </p>
      )}
    </div>
  );
}

function DetailHeader({ app }: { app: ForgeApp }) {
  return (
    <header className="flex flex-wrap items-center gap-3">
      <CoinIcon app={app} size="size-14" />
      <div className="min-w-0">
        <h2 className="font-display truncate text-2xl font-bold tracking-tight">
          <AuroraText colors={[app.color, "#7928CA", "#38bdf8", app.color]}>{app.ticker}</AuroraText>
        </h2>
        <p className="text-xs text-white">{app.chain}</p>
      </div>
    </header>
  );
}

export function NodesPanel({
  apps,
  rows,
  view,
  onViewChange,
  onOpenMiner,
  initialId,
}: {
  apps: ForgeApp[];
  rows: WorkerRow[];
  view: HashrateView;
  onViewChange: (v: HashrateView) => void;
  onOpenMiner: (key: string) => void;
  // The node to show on arrival, when opened from the Overview tab.
  initialId?: string | null;
}) {
  // Redraw each second so "last share" counts up between polls.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Where each coin app opens, for the link to it. Absent off ForgeNX.
  const [links, setLinks] = useState<Record<string, string>>({});
  useEffect(() => {
    fetchAppLinks().then((l) => l && setLinks(l));
  }, []);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setWide(el.clientWidth >= SIDE_BY_SIDE_PX);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [nodesSort, setNodesSort] = useState<Sort<NodeSortKey>>({ key: "name", dir: "asc" });
  const [minersSort, setMinersSort] = useState<Sort<MinerSortKey>>({ key: "name", dir: "asc" });
  // Marked once the user picks, so a saved sort arriving late does not undo it.
  const nodesChosen = useRef(false);
  const minersChosen = useRef(false);
  useEffect(() => {
    fetchMeshSettings().then((st) => {
      const n = parseSort(st?.nodes_sort, ["name", "hashrate", "miners", "status"] as const);
      if (n && !nodesChosen.current) setNodesSort(n);
      const m = parseSort(st?.node_miners_sort, ["name", "connection", "hashrate", "difficulty", "best"] as const);
      if (m && !minersChosen.current) setMinersSort(m);
    });
  }, []);
  const chooseNodes = (key: NodeSortKey, first: Dir) => {
    const next = nextSort(nodesSort, key, first);
    nodesChosen.current = true;
    setNodesSort(next);
    saveMeshSettings({ nodes_sort: `${next.key}:${next.dir}` });
  };
  const chooseMiners = (key: MinerSortKey) => {
    const next = nextSort(minersSort, key, MINER_SORT_FIRST[key]);
    minersChosen.current = true;
    setMinersSort(next);
    saveMeshSettings({ node_miners_sort: `${next.key}:${next.dir}` });
  };

  const figures = (a: ForgeApp) => minersOn(a.id.toUpperCase(), rows);
  const nodeSign = nodesSort.dir === "desc" ? -1 : 1;
  const nodeCmp: Record<NodeSortKey, (a: ForgeApp, b: ForgeApp) => number> = {
    name: (a, b) => byName(a.ticker, b.ticker),
    hashrate: (a, b) => figures(a).ths - figures(b).ths,
    miners: (a, b) => figures(a).mining.length - figures(b).mining.length,
    status: (a, b) => statusRank(a) - statusRank(b),
  };
  // Offline nodes stay in their own group at the bottom, whatever the sort.
  const sortNodes = (list: ForgeApp[]) =>
    [...list].sort((a, b) => nodeSign * nodeCmp[nodesSort.key](a, b) || byName(a.ticker, b.ticker));
  const online = sortNodes(apps.filter((a) => a.online));
  const offline = sortNodes(apps.filter((a) => !a.online));
  const ordered = [...online, ...offline];

  // The first online node is shown until the user picks one. Stacked, a node's
  // detail opens under it, so there nothing is open until one is picked.
  const [picked, setPicked] = useState<string | null>(initialId ?? null);
  const selectedId = picked ?? (wide ? ordered[0]?.id ?? null : null);
  const selected = ordered.find((a) => a.id === selectedId) ?? null;
  const pick = (id: string) => setPicked((p) => (!wide && p === id ? "" : id));

  const linkFor = (a: ForgeApp) => (a.coinId ? links[a.coinId] : undefined);

  const card = (a: ForgeApp) => (
    <NodeCard
      key={a.id}
      app={a}
      miners={figures(a)}
      selected={selectedId === a.id}
      wide={wide}
      onSelect={() => pick(a.id)}
    >
      {!wide && selectedId === a.id && (
        <div className="@container border-t border-border/50 p-3.5">
          <div className="mb-3 flex justify-end">
            {linkFor(a) && (
              <a href={linkFor(a)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-neon-cyan">
                Open {a.ticker}
                <ExternalLink className="size-3.5" />
              </a>
            )}
          </div>
          <NodeDetail
            app={a}
            miners={figures(a)}
            view={view}
            link={linkFor(a)}
            onOpenMiner={onOpenMiner}
            sort={minersSort}
            onSort={chooseMiners}
          />
        </div>
      )}
    </NodeCard>
  );

  return (
    <div ref={wrapRef} className="mx-auto w-full max-w-[106rem]">
      <div className={wide ? "grid grid-cols-[30rem_minmax(0,75rem)] items-start justify-center gap-4" : "flex flex-col gap-4"}>
        <section className="panel-neon animate-rise flex min-w-0 flex-col p-5">
          <header className="flex flex-wrap items-center gap-3">
            <Network className="size-4 text-neon-cyan" />
            <h2 className="text-xs font-semibold tracking-[0.26em] text-neon-cyan uppercase">Nodes</h2>
            <span className="ml-auto flex items-center gap-1.5">
              <span className="text-[0.6rem] font-semibold tracking-[0.18em] text-foreground/90 uppercase">Hashrate</span>
              <HashrateToggle view={view} onChange={onViewChange} />
            </span>
          </header>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[0.6rem] font-semibold tracking-[0.18em] text-foreground/90 uppercase">Sort</span>
            {NODE_SORTS.map((o) => {
              const on = nodesSort.key === o.key;
              return (
                <button
                  key={o.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => chooseNodes(o.key, o.first)}
                  className="rounded-md border px-2 py-0.5 text-[0.65rem] font-semibold transition"
                  style={{
                    borderColor: on ? "var(--neon-cyan)" : "var(--border)",
                    color: on ? "var(--neon-cyan)" : "var(--foreground)",
                  }}
                >
                  {o.label}
                  {on && (nodesSort.dir === "asc" ? " ↑" : " ↓")}
                </button>
              );
            })}
          </div>

          {apps.length === 0 ? (
            <p className="py-6 text-sm text-foreground/90">No nodes are installed yet.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-2">
              {online.map(card)}
              {offline.length > 0 && (
                <p className="mt-2 text-[0.6rem] font-semibold tracking-[0.18em] text-foreground/90 uppercase">Offline</p>
              )}
              {offline.map(card)}
            </div>
          )}
        </section>

        {wide &&
          (selected ? (
            <section
              key={selected.id}
              className="panel-neon animate-rise @container sticky top-4 flex min-w-0 flex-col self-start p-5"
            >
              <DetailHeader app={selected} />
              <div className="mt-4">
                <NodeDetail
                  app={selected}
                  miners={figures(selected)}
                  view={view}
                  link={linkFor(selected)}
                  onOpenMiner={onOpenMiner}
                  sort={minersSort}
                  onSort={chooseMiners}
                />
              </div>
            </section>
          ) : (
            <aside className="panel-neon animate-rise flex min-h-[200px] flex-col items-center justify-center p-5 text-center">
              <p className="text-xs font-semibold tracking-[0.26em] text-foreground uppercase">No node selected</p>
            </aside>
          ))}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ExternalLink, Network } from "lucide-react";

import { AuroraText } from "./aurora-text";
import { compactNumber, formatHashrate, timeAgo } from "./format";
import type { ForgeApp } from "./nexus-data";
import { Ars, HashrateToggle } from "./workers-panel";
import type { HashrateView, WorkerRow } from "./workers-data";
import { fetchAppLinks } from "@/lib/forge-api";

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

// Per node: the miners mining it, and those holding it warm on standby.
type NodeMiners = { mining: WorkerRow[]; standby: number; ths: number };

function minersOn(sym: string, rows: WorkerRow[]): NodeMiners {
  const mining = rows.filter((r) => r.online && r.coin === sym);
  const standby = rows.filter(
    (r) =>
      r.online &&
      r.coin !== sym &&
      r.coins.some((c) => c.sym === sym && c.standby && c.worker.online !== false),
  ).length;
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

function Pill({ label, value, color }: { label: string; value: ReactNode; color?: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border/60 px-3 py-2">
      <p className="text-[0.58rem] tracking-[0.14em] text-foreground/90 uppercase">{label}</p>
      <p className="mt-0.5 truncate font-mono text-[0.8rem] font-semibold" style={{ color: color ?? "var(--foreground)" }}>
        {value}
      </p>
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
}: {
  app: ForgeApp;
  miners: NodeMiners;
  view: HashrateView;
  link?: string;
  onOpenMiner: (key: string) => void;
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

  const lag = node ? Math.max(0, (node.headers ?? 0) - (node.blocks ?? 0)) : 0;
  const difficulty = node?.difficulty ?? 0;
  const bestOn = (r: WorkerRow) => r.coins.find((c) => c.sym === sym)?.worker.best_session ?? 0;

  return (
    <div className="flex flex-col gap-3 font-mono text-[0.72rem]">
      <div className="grid gap-3 @4xl:grid-cols-2">
        <Section title="Mining status">
          <Line label="Worker count">
            <span style={{ color: miners.mining.length > 0 ? "var(--neon-green)" : undefined }}>
              {miners.mining.length} mining
            </span>
            <span className="text-foreground/90"> · {miners.standby} on standby</span>
          </Line>
          <Line label="Total hashrate" sub={view === "live" ? "live" : "avg"}>
            <span className="text-neon-cyan">{miners.ths > 0 ? formatHashrate(miners.ths) : "—"}</span>
          </Line>
          <Line label="Max session hashrate">
            {(pool?.max_hashrate ?? 0) > 0 ? formatHashrate(pool?.max_hashrate ?? 0) : "—"}
          </Line>
          <Line label="Closest to block" sub="session">
            <span className="text-neon-cyan">{ratioPct(pool?.best_ratio)}</span>
            <By name={pool?.best_ratio_worker ? pool.best_ratio_worker.split(".").pop() : undefined} />
          </Line>
          <Line label="Best share difficulty" sub="session">
            <span className="text-neon-cyan">
              {(pool?.best_session_diff ?? 0) > 0 ? compactNumber(pool?.best_session_diff ?? 0) : "—"}
            </span>
            <By name={pool?.best_session_worker ? pool.best_session_worker.split(".").pop() : undefined} />
          </Line>
          <Line label="Network difficulty">{difficulty > 0 ? compactNumber(difficulty) : "—"}</Line>
          <Line label="Last share">{agoSeconds(pool?.last_share_time)}</Line>
          <Line label="Total shares" sub="session">
            {sessionTotal > 0 ? <Ars a={sa} r={sr} s={ss} /> : "—"}
          </Line>
          <Line label="Valid shares" sub="session">
            <span style={{ color: "var(--neon-green)" }}>{sessionTotal > 0 ? pct((sa / sessionTotal) * 100) : "—"}</span>
          </Line>
        </Section>

        <Section title="Miners on this node">
          {miners.mining.length === 0 ? (
            <p className="py-2 text-foreground/90">
              {online ? "No miners are mining this node right now." : "The node is offline."}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 pb-1 text-[0.58rem] tracking-[0.12em] text-foreground/90 uppercase">
                <span>Miner</span>
                <span className="text-right">Hashrate</span>
                <span className="text-right">
                  Best share <span className="text-[0.5rem] text-foreground">(session)</span>
                </span>
              </div>
              <div className="flex flex-col">
                {[...miners.mining]
                  .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }))
                  .map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => onOpenMiner(r.key)}
                      title={`Open ${r.name} on the Miners tab`}
                      className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-3 rounded-md border-b border-border/30 px-1 py-1 text-left transition last:border-b-0 hover:bg-secondary/40"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="size-1.5 shrink-0 rounded-full" style={{ background: "var(--neon-green)", boxShadow: "0 0 6px var(--neon-green)" }} />
                        <span className="truncate font-semibold">{r.name}</span>
                        {r.viaMesh && <span className="text-[0.55rem] text-neon-cyan">Mesh</span>}
                      </span>
                      <span className="text-right text-neon-cyan">{r.hashrate > 0 ? formatHashrate(r.hashrate) : "—"}</span>
                      <span className="text-right text-neon-cyan">{bestOn(r) > 0 ? compactNumber(bestOn(r)) : "—"}</span>
                    </button>
                  ))}
              </div>
            </>
          )}
        </Section>

        <Section title="All time node stats">
          <Line label="Best share difficulty" sub="all time">
            <span className="text-neon-cyan">
              {(pool?.best_all_time_diff ?? 0) > 0 ? compactNumber(pool?.best_all_time_diff ?? 0) : "—"}
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

        <Section title="Network">
          <div className="grid grid-cols-2 gap-2 @xl:grid-cols-3 @4xl:grid-cols-2">
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
                node?.mempool_size_mb !== undefined
                  ? `${node.mempool_size_mb.toFixed(2)} MiB · ${(node.mempool_txns ?? 0).toLocaleString()} tx`
                  : "—"
              }
            />
            <Pill
              label="Connections"
              value={node?.peers_in !== undefined ? `${node.peers_in} in / ${node.peers_out ?? 0} out` : "—"}
            />
          </div>
        </Section>
      </div>

      {link && (
        <p className="text-[0.62rem] text-foreground/90">
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

function DetailHeader({ app, link }: { app: ForgeApp; link?: string }) {
  return (
    <header className="flex flex-wrap items-center gap-3">
      <CoinIcon app={app} size="size-14" />
      <div className="min-w-0">
        <h2 className="font-display truncate text-2xl font-bold tracking-tight">
          <AuroraText colors={[app.color, "#7928CA", "#38bdf8", app.color]}>{app.ticker}</AuroraText>
        </h2>
        <p className="text-xs text-white">{app.chain}</p>
      </div>
      <span className="ml-auto flex flex-wrap items-center gap-2">
        <OnlineBadge online={app.online} />
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1 text-[0.72rem] font-semibold transition"
            style={{
              borderColor: "var(--neon-cyan)",
              color: "var(--neon-cyan)",
              background: "color-mix(in oklab, var(--neon-cyan) 10%, transparent)",
            }}
          >
            Open {app.ticker}
            <ExternalLink className="size-3.5" />
          </a>
        )}
      </span>
    </header>
  );
}

export function NodesPanel({
  apps,
  rows,
  view,
  onViewChange,
  onOpenMiner,
}: {
  apps: ForgeApp[];
  rows: WorkerRow[];
  view: HashrateView;
  onViewChange: (v: HashrateView) => void;
  onOpenMiner: (key: string) => void;
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

  const online = apps.filter((a) => a.online);
  const offline = apps.filter((a) => !a.online);
  const ordered = [...online, ...offline];

  // The first online node is shown until the user picks one. Stacked, a node's
  // detail opens under it, so there nothing is open until one is picked.
  const [picked, setPicked] = useState<string | null>(null);
  const selectedId = picked ?? (wide ? ordered[0]?.id ?? null : null);
  const selected = ordered.find((a) => a.id === selectedId) ?? null;
  const pick = (id: string) => setPicked((p) => (!wide && p === id ? "" : id));

  const figures = (a: ForgeApp) => minersOn(a.id.toUpperCase(), rows);
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
          <NodeDetail app={a} miners={figures(a)} view={view} link={linkFor(a)} onOpenMiner={onOpenMiner} />
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
              <DetailHeader app={selected} link={linkFor(selected)} />
              <div className="mt-4">
                <NodeDetail
                  app={selected}
                  miners={figures(selected)}
                  view={view}
                  link={linkFor(selected)}
                  onOpenMiner={onOpenMiner}
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

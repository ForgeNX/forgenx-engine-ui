import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Cpu, Search } from "lucide-react";
import { AuroraText } from "./aurora-text";
import { RejectionList } from "./rejection-list";
import { compactNumber, formatHashrate, timeAgo } from "./format";
import { bestOf, buildWorkerRows, formatUptime, realTime, type WorkerRow } from "./workers-data";
import { fetchFoundMiners, type FoundMiner, type MeshStatus } from "@/lib/forge-api";
import type { ForgeApp } from "./nexus-data";

// Every miner working for this engine, one row each, across all coins. Read-only:
// changing where a miner mines is done from the Nexus tab.
//
// On a wide screen the list and the selected miner's detail sit side by side,
// each capped in width and the pair centred, so an ultrawide monitor does not
// stretch the columns apart. Narrower, the detail opens under its row instead.

// Width at which the list (with its full columns) and the detail panel fit side
// by side: the columns need 56rem inside the list's padding, so 58.5rem of list,
// a 1rem gap and the 30rem panel.
const SIDE_BY_SIDE_PX = 90 * 16;

type Filter = "all" | "mesh" | "direct" | "offline";
type SortKey = "name" | "hashrate" | "coin" | "device" | "best" | "last";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "mesh", label: "Mesh" },
  { key: "direct", label: "Direct" },
  { key: "offline", label: "Offline" },
];

const SORTS: { key: SortKey; label: string; first: "asc" | "desc" }[] = [
  { key: "name", label: "Name", first: "asc" },
  { key: "hashrate", label: "Hashrate", first: "desc" },
  { key: "coin", label: "Coin", first: "asc" },
  { key: "device", label: "Device", first: "asc" },
  { key: "best", label: "Best share", first: "desc" },
  { key: "last", label: "Last share", first: "desc" },
];

const SOURCE_COLOUR: Record<string, string> = {
  miner: "var(--neon-green)",
  mesh: "var(--neon-cyan)",
  coin: "var(--neon-gold)",
  scanner: "var(--neon-green)",
};

// Last share, to the second while it is recent: "12s ago", "4m 12s ago", then
// the coarser "2h ago". Miners submit every few seconds, so "just now" hid the
// difference between a miner that is submitting and one that has just stopped.
function lastShareAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (!Number.isFinite(s)) return "—";
  if (s < 60) return `${Math.max(0, s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s ago`;
  return timeAgo(iso);
}

const lastShareMs = (r: WorkerRow) => (r.active?.last_share ? new Date(r.active.last_share).getTime() : 0);

function sortRows(rows: WorkerRow[], key: SortKey, dir: "asc" | "desc"): WorkerRow[] {
  const sign = dir === "desc" ? -1 : 1;
  const byName = (a: WorkerRow, b: WorkerRow) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
  const cmp: Record<SortKey, (a: WorkerRow, b: WorkerRow) => number> = {
    name: byName,
    hashrate: (a, b) => a.hashrate - b.hashrate,
    coin: (a, b) => (a.coin ?? "~").localeCompare(b.coin ?? "~"),
    device: (a, b) => (a.model || "~").localeCompare(b.model || "~"),
    best: (a, b) => bestOf(a).best - bestOf(b).best,
    last: (a, b) => lastShareMs(a) - lastShareMs(b),
  };
  // Offline miners sit at the bottom whatever the sort, and names break ties so
  // rows keep their places between polls.
  return [...rows].sort(
    (a, b) => Number(!a.online) - Number(!b.online) || sign * cmp[key](a, b) || byName(a, b),
  );
}

// A best share as a share of the network difficulty it was found against: how
// close it came to a block.
function ofNetwork(best: number, netDiff: number): string {
  if (!best || !netDiff) return "";
  const pct = (best / netDiff) * 100;
  return pct >= 1 ? `${pct.toFixed(1)}%` : `${pct.toPrecision(2)}%`;
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center rounded-lg border border-border/50 px-3 py-2 text-center">
      <span className="text-[0.6rem] tracking-[0.14em] text-foreground/90 uppercase">{label}</span>
      <span className="font-mono text-sm font-semibold" style={{ color: color ?? "var(--foreground)" }}>
        {value}
      </span>
      {sub && <span className="max-w-full truncate font-mono text-[0.62rem] text-foreground/90">{sub}</span>}
    </div>
  );
}

// Column layout shared by the header and the rows, used when the panel is wide
// enough; narrower, each row lays its figures out in labelled pairs instead.
// Miner, Node, Hashrate, Difficulty, Best share, Shares, Last share, Uptime.
const COLS =
  "@4xl:grid-cols-[minmax(10rem,1.5fr)_minmax(6.5rem,1fr)_minmax(5.5rem,0.8fr)_minmax(4.5rem,0.7fr)_minmax(7.5rem,1.1fr)_minmax(6.5rem,1fr)_minmax(5rem,0.8fr)_minmax(4rem,0.6fr)]";

function Label({ children }: { children: string }) {
  return <span className="mr-1.5 text-[0.6rem] tracking-[0.12em] text-foreground/90 uppercase @4xl:hidden">{children}</span>;
}

function Row({
  r,
  apps,
  selected,
  wide,
  onSelect,
}: {
  r: WorkerRow;
  apps: ForgeApp[];
  selected: boolean;
  wide: boolean;
  onSelect: () => void;
}) {
  const app = apps.find((a) => a.id.toUpperCase() === r.coin);
  const colour = app?.color ?? "var(--foreground)";
  const w = r.active;
  const best = bestOf(r);

  return (
    <div
      className="rounded-lg border transition"
      style={{
        opacity: r.online ? 1 : 0.55,
        borderColor: selected ? "var(--neon-cyan)" : "color-mix(in oklab, var(--border) 50%, transparent)",
        background: selected ? "color-mix(in oklab, var(--neon-cyan) 7%, transparent)" : undefined,
      }}
    >
      <div
        role="button"
        tabIndex={0}
        // Side by side, a row selects its miner for the detail panel; stacked, it
        // opens the detail beneath itself.
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
        className={`grid cursor-pointer grid-cols-2 gap-x-3 gap-y-1.5 px-3 py-2.5 font-mono text-[0.72rem] transition hover:bg-secondary/30 @4xl:items-center @4xl:gap-y-0 ${COLS}`}
      >
        {/* Miner */}
        <span className="col-span-2 flex min-w-0 items-center gap-2 @4xl:col-span-1">
          {!wide && (
            <ChevronDown
              className={`size-3.5 shrink-0 text-foreground/90 transition-transform ${selected ? "rotate-180" : ""}`}
            />
          )}
          <span
            className="size-1.5 shrink-0 rounded-full"
            style={{
              background: r.online ? "var(--neon-green)" : "#e0115f",
              boxShadow: r.online ? "0 0 6px var(--neon-green)" : undefined,
            }}
          />
          <span className="min-w-0">
            <span className="font-display block truncate text-sm font-bold">{r.name}</span>
            <span className="block truncate text-[0.65rem] text-foreground/90">
              {r.model || "unknown device"}
              {r.ip && ` · ${r.ip}`}
            </span>
          </span>
        </span>

        {/* Node */}
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5">
          <Label>Node</Label>
          {r.online && r.coin ? (
            <span className="font-semibold" style={{ color: colour }}>
              {app ? <AuroraText colors={[app.color, "#7928CA", "#38bdf8", app.color]}>{app.ticker}</AuroraText> : r.coin}
            </span>
          ) : (
            <span className="text-foreground/90">—</span>
          )}
          <span
            className="rounded border px-1 text-[0.58rem] font-semibold"
            style={
              r.viaMesh
                ? { borderColor: "var(--neon-cyan)", color: "var(--neon-cyan)" }
                : { borderColor: "var(--border)", color: "var(--foreground)" }
            }
          >
            {r.viaMesh ? "Mesh" : "Direct"}
          </span>
          {w?.protocol && <span className="text-[0.6rem] text-foreground/90">{w.protocol.toUpperCase()}</span>}
        </span>

        {/* Hashrate */}
        <span>
          <Label>Hashrate</Label>
          {r.online ? (
            <span style={{ color: SOURCE_COLOUR[r.hashrateSource] ?? "var(--neon-cyan)" }}>{formatHashrate(r.hashrate)}</span>
          ) : (
            <span className="text-foreground/90">—</span>
          )}
        </span>

        {/* Difficulty */}
        <span>
          <Label>Difficulty</Label>
          {r.online && (w?.difficulty ?? 0) > 0 ? compactNumber(w?.difficulty ?? 0) : <span className="text-foreground/90">—</span>}
        </span>

        {/* Best share (session), and how close it came to a block */}
        <span>
          <Label>Best share</Label>
          {best.best > 0 ? (
            <>
              <span className="text-neon-cyan">{compactNumber(best.best)}</span>
              {ofNetwork(best.best, best.netDiff) && (
                <span className="block text-[0.62rem] text-foreground/90">
                  {ofNetwork(best.best, best.netDiff)} of {best.sym} network
                </span>
              )}
            </>
          ) : (
            <span className="text-foreground/90">—</span>
          )}
        </span>

        {/* Shares this session */}
        <span>
          <Label>Shares</Label>
          {w ? (
            <>
              <span style={{ color: "var(--neon-green)" }}>{w.valid_shares ?? 0}</span>
              <span className="text-foreground/50"> / </span>
              <span style={{ color: (w.invalid_shares ?? 0) > 0 ? "#ff0080" : "var(--foreground)" }}>{w.invalid_shares ?? 0}</span>
              <span className="text-foreground/50"> / </span>
              <span style={{ color: (w.stale_shares ?? 0) > 0 ? "var(--neon-gold)" : "var(--foreground)" }}>{w.stale_shares ?? 0}</span>
            </>
          ) : (
            <span className="text-foreground/90">—</span>
          )}
        </span>

        {/* Last share */}
        <span>
          <Label>Last share</Label>
          {r.online ? (
            w?.last_share ? lastShareAgo(w.last_share) : "—"
          ) : (
            <span style={{ color: "#e0115f" }}>{r.lastSeen ? `offline, seen ${timeAgo(r.lastSeen)}` : "offline"}</span>
          )}
        </span>

        {/* Uptime */}
        <span>
          <Label>Uptime</Label>
          {formatUptime(r.uptime)}
        </span>
      </div>

      {!wide && selected && (
        <div className="@container border-t border-border/50 px-3 py-3">
          <Detail r={r} apps={apps} />
        </div>
      )}
    </div>
  );
}

// What sits behind a row: the miner on each coin it is bonded to, its best share
// in context, and why any shares were refused. Laid out as one block per coin so
// it reads in the narrow side panel as well as under a row.
function Detail({ r, apps }: { r: WorkerRow; apps: ForgeApp[] }) {
  const best = bestOf(r);
  const bestSession = r.coins.find((c) => c.sym === best.sym)?.worker;
  // The all-time best, with the context recorded when it was set.
  const allTimeOn = r.coins.reduce<WorkerRow["coins"][number] | null>(
    (m, c) => ((c.worker.best_all_time ?? 0) > (m?.worker.best_all_time ?? 0) ? c : m),
    null,
  );
  const allTime = allTimeOn?.worker.best_all_time ?? 0;
  const w = r.active;
  const n = (v?: number) => (v ?? 0).toLocaleString();
  const acc = w?.shares_48h_valid ?? 0;
  const rej = w?.shares_48h_invalid ?? 0;
  const rate = acc + rej > 0 ? (acc / (acc + rej)) * 100 : null;
  const deg = (t: number) => (t > 0 ? `${Math.round(t)}°` : "—");

  return (
    <div className="flex flex-col gap-3 font-mono text-[0.7rem]">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="text-foreground/90">ASIC temp</dt>
        <dd>
          {deg(r.asicTemp)}
          {r.asicTempMax > 0 && <span className="text-foreground/90"> / {deg(r.asicTempMax)} hottest chip</span>}
        </dd>
        <dt className="text-foreground/90">VR temp</dt>
        <dd>{deg(r.vrTemp)}</dd>
        <dt className="text-foreground/90">Accepted 48h</dt>
        <dd>
          {rate !== null ? (
            <>
              {rate >= 99.95 ? "100" : rate.toFixed(1)}%
              <span className="text-foreground/90">
                {" "}
                ({n(acc)} / {n(rej)})
              </span>
            </>
          ) : (
            "—"
          )}
        </dd>
      </dl>

      {r.coins.length > 0 && (
        <div className="grid gap-2 @xl:grid-cols-2">
          {r.coins.map((c) => {
            const app = apps.find((a) => a.id.toUpperCase() === c.sym);
            const live = c.worker.online !== false;
            const state = !live ? "offline" : c.standby ? "standby" : "mining";
            return (
              <div key={c.sym} className="rounded-md border border-border/50 px-2.5 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold" style={{ color: app?.color ?? "var(--foreground)" }}>
                    {app?.ticker ?? c.sym}
                  </span>
                  <span
                    className="text-[0.62rem]"
                    style={{ color: state === "mining" ? "var(--neon-green)" : state === "offline" ? "#e0115f" : "var(--foreground)" }}
                  >
                    {state}
                  </span>
                </div>
                <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                  <dt className="text-foreground/90">Session</dt>
                  <dd>
                    <span style={{ color: "var(--neon-green)" }}>{n(c.worker.valid_shares)}</span>
                    {" / "}
                    <span style={{ color: (c.worker.invalid_shares ?? 0) > 0 ? "#ff0080" : undefined }}>
                      {n(c.worker.invalid_shares)}
                    </span>
                    {" / "}
                    <span style={{ color: (c.worker.stale_shares ?? 0) > 0 ? "var(--neon-gold)" : undefined }}>
                      {n(c.worker.stale_shares)}
                    </span>
                  </dd>
                  <dt className="text-foreground/90">48h</dt>
                  <dd>
                    {n(c.worker.shares_48h_valid)} / {n(c.worker.shares_48h_invalid)}
                  </dd>
                  <dt className="text-foreground/90">All time</dt>
                  <dd>
                    {n(c.worker.shares_alltime_valid)} / {n(c.worker.shares_alltime_invalid)}
                  </dd>
                  <dt className="text-foreground/90">Best</dt>
                  <dd className="text-neon-cyan">
                    {(c.worker.best_session ?? 0) > 0 ? compactNumber(c.worker.best_session ?? 0) : "—"}
                  </dd>
                </dl>
              </div>
            );
          })}
        </div>
      )}
      {r.coins.length > 0 && (
        <p className="text-[0.6rem] text-foreground/90">Shares are accepted / rejected / stale.</p>
      )}

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        {best.best > 0 && bestSession && (
          <>
            <dt className="text-foreground/90">Best this session</dt>
            <dd>
              <span className="text-neon-cyan">{compactNumber(best.best)}</span>
              {bestSession.best_session_height ? ` at height ${bestSession.best_session_height.toLocaleString()}` : ""}
              {realTime(bestSession.best_session_time) ? `, ${timeAgo(bestSession.best_session_time as string)}` : ""}
            </dd>
          </>
        )}
        {allTime > 0 && allTimeOn && (
          <>
            <dt className="text-foreground/90">Best all time</dt>
            <dd>
              <span className="text-neon-cyan">{compactNumber(allTime)}</span>
              {allTimeOn.worker.height_at_best ? ` at height ${allTimeOn.worker.height_at_best.toLocaleString()}` : ""}
              {realTime(allTimeOn.worker.time_at_best) ? `, ${timeAgo(allTimeOn.worker.time_at_best as string)}` : ""}
            </dd>
          </>
        )}
        {w?.connected_at && (
          <>
            <dt className="text-foreground/90">Connected</dt>
            <dd>{timeAgo(w.connected_at)}</dd>
          </>
        )}
        {w?.payout_address && w.payout_address !== w.name && (
          <>
            <dt className="text-foreground/90">Payout</dt>
            <dd className="min-w-0 break-all">{w.payout_address}</dd>
          </>
        )}
      </dl>

      <div>
        <p className="text-[0.6rem] tracking-[0.12em] text-foreground/90 uppercase">Recent refused shares</p>
        <RejectionList worker={r.name} />
      </div>
    </div>
  );
}

// The selected miner's detail, beside the list on a wide screen. It stays in view
// while a long list scrolls.
function DetailPanel({ r, apps }: { r: WorkerRow | null; apps: ForgeApp[] }) {
  if (!r) {
    return (
      <aside className="panel-neon animate-rise sticky top-4 flex min-h-[200px] flex-col items-center justify-center self-start p-5 text-center">
        <p className="text-xs font-semibold tracking-[0.26em] text-foreground uppercase">No miner selected</p>
        <p className="mt-2 text-sm text-foreground/90">Select a miner to see its detail across each coin.</p>
      </aside>
    );
  }
  return (
    <aside className="panel-neon animate-rise @container sticky top-4 flex max-h-[calc(100vh-2rem)] flex-col self-start overflow-y-auto p-5">
      <header className="flex items-center gap-2.5">
        <span
          className="size-1.5 shrink-0 rounded-full"
          style={{
            background: r.online ? "var(--neon-green)" : "#e0115f",
            boxShadow: r.online ? "0 0 6px var(--neon-green)" : undefined,
          }}
        />
        <span className="min-w-0">
          <span className="font-display block truncate text-sm font-bold">{r.name}</span>
          <span className="block truncate font-mono text-[0.65rem] text-foreground/90">
            {r.model || "unknown device"}
            {r.ip && ` · ${r.ip}`}
            {!r.online && " · offline"}
          </span>
        </span>
      </header>
      <div className="mt-4">
        <Detail r={r} apps={apps} />
      </div>
    </aside>
  );
}

export function WorkersPanel({ apps, mesh }: { apps: ForgeApp[]; mesh: MeshStatus | null }) {
  // Redraw each second so "last share" counts up between polls.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // The scanner's readings: model, temperatures and each miner's own uptime.
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

  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Whether the list and the detail panel fit side by side, from the width the
  // tab actually has rather than the window's.
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

  const { rows, summary } = useMemo(() => buildWorkerRows(apps, mesh, found), [apps, mesh, found]);
  // Looked up in every row, not only those shown, so a selection survives a
  // filter or search that hides it from the list.
  const selectedRow = rows.find((r) => r.key === selectedKey) ?? null;

  const counts: Record<Filter, number> = {
    all: rows.length,
    mesh: rows.filter((r) => r.viaMesh).length,
    direct: rows.filter((r) => !r.viaMesh).length,
    offline: rows.filter((r) => !r.online).length,
  };
  const q = query.trim().toLowerCase();
  const shown = sortRows(
    rows.filter(
      (r) =>
        (filter === "all" ||
          (filter === "mesh" && r.viaMesh) ||
          (filter === "direct" && !r.viaMesh) ||
          (filter === "offline" && !r.online)) &&
        (!q || r.name.toLowerCase().includes(q) || r.ip.includes(q) || r.model.toLowerCase().includes(q)),
    ),
    sort.key,
    sort.dir,
  );

  const choose = (key: SortKey, first: "asc" | "desc") =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: first }));

  const total48 = summary.accepted48h + summary.rejected48h;

  return (
    <div ref={wrapRef} className="mx-auto flex w-full max-w-[118.5rem] flex-col gap-4">
      <section className="panel-neon animate-rise @container flex flex-col p-5">
        <header className="flex items-center gap-3">
          <Cpu className="size-4 text-neon-cyan" />
          <h2 className="text-xs font-semibold tracking-[0.26em] text-neon-cyan uppercase">Miners</h2>
        </header>

        <div className="mt-4 grid grid-cols-2 gap-2 @xl:grid-cols-3 @4xl:grid-cols-6">
          <Stat label="Online" value={String(summary.online)} color="var(--neon-green)" />
          <Stat
            label="Offline"
            value={String(summary.offline)}
            color={summary.offline > 0 ? "#e0115f" : undefined}
          />
          <Stat label="Hashrate" value={formatHashrate(summary.hashrate)} color="var(--neon-cyan)" />
          <Stat
            label="Accepted 48h"
            value={total48 > 0 ? `${((summary.accepted48h / total48) * 100).toFixed(2)}%` : "—"}
            sub={total48 > 0 ? `${summary.accepted48h.toLocaleString()} shares` : undefined}
          />
          <Stat
            label="Best share (session)"
            value={summary.bestSession > 0 ? compactNumber(summary.bestSession) : "—"}
            sub={summary.bestSessionBy ? `by ${summary.bestSessionBy}` : undefined}
            color="var(--neon-cyan)"
          />
          <Stat
            label="Best share (all time)"
            value={summary.bestAllTime > 0 ? compactNumber(summary.bestAllTime) : "—"}
            sub={summary.bestAllTimeBy ? `by ${summary.bestAllTimeBy}` : undefined}
            color="var(--neon-cyan)"
          />
        </div>
      </section>

      <div className={wide ? "grid grid-cols-[minmax(0,87.5rem)_30rem] items-start gap-4" : "flex flex-col"}>
        <section className="panel-neon animate-rise @container flex min-w-0 flex-col p-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {FILTERS.map((f) => {
                const on = filter === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setFilter(f.key)}
                    className="rounded-md border px-2 py-0.5 text-[0.65rem] font-semibold transition"
                    style={{
                      borderColor: on ? "var(--neon-cyan)" : "var(--border)",
                      color: on ? "var(--neon-cyan)" : "var(--foreground)",
                    }}
                  >
                    {f.label} ({counts[f.key]})
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[0.6rem] font-semibold tracking-[0.18em] text-foreground/90 uppercase">Sort</span>
              {SORTS.map((o) => {
                const on = sort.key === o.key;
                return (
                  <button
                    key={o.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => choose(o.key, o.first)}
                    className="rounded-md border px-2 py-0.5 text-[0.65rem] font-semibold transition"
                    style={{
                      borderColor: on ? "var(--neon-cyan)" : "var(--border)",
                      color: on ? "var(--neon-cyan)" : "var(--foreground)",
                    }}
                  >
                    {o.label}
                    {on && (sort.dir === "asc" ? " ↑" : " ↓")}
                  </button>
                );
              })}
            </div>
            <label className="relative ml-auto flex items-center">
              <Search className="pointer-events-none absolute left-2 size-3.5 text-foreground/90" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name, IP or device"
                aria-label="Search miners"
                className="w-48 rounded-md border border-border/70 bg-secondary/25 py-1 pr-2 pl-7 font-mono text-[0.7rem] text-foreground placeholder:text-muted-foreground/60 focus:border-neon-cyan focus:outline-none"
              />
            </label>
          </div>

          <div
            className={`mt-4 hidden gap-x-3 px-3 pb-1.5 text-[0.6rem] tracking-[0.12em] text-foreground/90 uppercase @4xl:grid ${COLS}`}
          >
            <span className={wide ? "pl-3.5" : "pl-9"}>Miner</span>
            <span>Node</span>
            <span>Hashrate</span>
            <span>Difficulty</span>
            <span>
              Best share <span className="text-[0.5rem] text-foreground">(session)</span>
            </span>
            <span>
              Shares A / R / S <span className="text-[0.5rem] text-foreground">(session)</span>
            </span>
            <span>Last share</span>
            <span>Uptime</span>
          </div>

          <div className="mt-2 flex flex-col gap-1.5 @4xl:mt-0">
            {rows.length === 0 ? (
              <p className="py-6 text-sm text-foreground/90">No miners are connected to the engine yet.</p>
            ) : shown.length === 0 ? (
              <p className="py-6 text-sm text-foreground/90">No miners match.</p>
            ) : (
              shown.map((r) => (
                <Row
                  key={r.key}
                  r={r}
                  apps={apps}
                  selected={selectedKey === r.key}
                  wide={wide}
                  onSelect={() => setSelectedKey((k) => (k === r.key ? null : r.key))}
                />
              ))
            )}
          </div>
        </section>
        {wide && <DetailPanel r={selectedRow} apps={apps} />}
      </div>
    </div>
  );
}

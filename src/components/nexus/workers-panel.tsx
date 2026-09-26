import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Search, Users } from "lucide-react";
import { AuroraText } from "./aurora-text";
import { RejectionList } from "./rejection-list";
import { compactNumber, formatHashrate, timeAgo } from "./format";
import { bestOf, buildWorkerRows, formatUptime, type WorkerRow } from "./workers-data";
import { fetchFoundMiners, type FoundMiner, type MeshStatus } from "@/lib/forge-api";
import type { ForgeApp } from "./nexus-data";

// Every miner working for this engine, one row each, across all coins. Read-only:
// changing where a miner mines is done from the Nexus tab.

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
const COLS =
  "@4xl:grid-cols-[minmax(11rem,1.5fr)_minmax(7rem,1fr)_minmax(6rem,0.8fr)_minmax(8rem,1.1fr)_minmax(7rem,1fr)_minmax(6rem,0.8fr)_minmax(4.5rem,0.6fr)_minmax(5rem,0.7fr)]";

function Label({ children }: { children: string }) {
  return <span className="mr-1.5 text-[0.6rem] tracking-[0.12em] text-foreground/90 uppercase @4xl:hidden">{children}</span>;
}

function Row({ r, apps, open, onToggle }: { r: WorkerRow; apps: ForgeApp[]; open: boolean; onToggle: () => void }) {
  const app = apps.find((a) => a.id.toUpperCase() === r.coin);
  const colour = app?.color ?? "var(--foreground)";
  const w = r.active;
  const acc = w?.shares_48h_valid ?? 0;
  const rej = w?.shares_48h_invalid ?? 0;
  const rate = acc + rej > 0 ? (acc / (acc + rej)) * 100 : null;
  const best = bestOf(r);

  return (
    <div className="rounded-lg border border-border/50" style={{ opacity: r.online ? 1 : 0.55 }}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className={`grid cursor-pointer grid-cols-2 gap-x-4 gap-y-1.5 px-3 py-2.5 font-mono text-[0.72rem] transition hover:bg-secondary/30 @4xl:items-center @4xl:gap-y-0 ${COLS}`}
      >
        {/* Miner */}
        <span className="col-span-2 flex min-w-0 items-center gap-2 @4xl:col-span-1">
          <ChevronDown className={`size-3.5 shrink-0 text-foreground/90 transition-transform ${open ? "rotate-180" : ""}`} />
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

        {/* Coin */}
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5">
          <Label>Coin</Label>
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
          {r.online && (w?.difficulty ?? 0) > 0 && (
            <span className="block text-[0.62rem] text-foreground/90">diff {compactNumber(w?.difficulty ?? 0)}</span>
          )}
        </span>

        {/* Shares */}
        <span>
          <Label>Shares</Label>
          {w ? (
            <>
              <span style={{ color: "var(--neon-green)" }}>{w.valid_shares ?? 0}</span>
              <span className="text-foreground/50"> / </span>
              <span style={{ color: (w.invalid_shares ?? 0) > 0 ? "#ff0080" : "var(--foreground)" }}>{w.invalid_shares ?? 0}</span>
              <span className="text-foreground/50"> / </span>
              <span style={{ color: (w.stale_shares ?? 0) > 0 ? "var(--neon-gold)" : "var(--foreground)" }}>{w.stale_shares ?? 0}</span>
              {rate !== null && (
                <span className="block text-[0.62rem] text-foreground/90">
                  48h {rate >= 99.95 ? "100" : rate.toFixed(1)}% accepted
                </span>
              )}
            </>
          ) : (
            <span className="text-foreground/90">—</span>
          )}
        </span>

        {/* Best share */}
        <span>
          <Label>Best</Label>
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

        {/* Temps */}
        <span>
          <Label>Temps</Label>
          {r.asicTemp > 0 ? `${Math.round(r.asicTemp)}°` : "—"}
          {r.asicTempMax > 0 && <span className="text-foreground/90"> / {Math.round(r.asicTempMax)}°</span>}
          <span className="block text-[0.62rem] text-foreground/90">VR {r.vrTemp > 0 ? `${Math.round(r.vrTemp)}°` : "—"}</span>
        </span>

        {/* Uptime */}
        <span>
          <Label>Uptime</Label>
          {formatUptime(r.uptime)}
        </span>

        {/* Last share */}
        <span>
          <Label>Last share</Label>
          {r.online ? (
            w?.last_share ? timeAgo(w.last_share) : "—"
          ) : (
            <span style={{ color: "#e0115f" }}>{r.lastSeen ? `offline, seen ${timeAgo(r.lastSeen)}` : "offline"}</span>
          )}
        </span>
      </div>

      {open && <Detail r={r} apps={apps} />}
    </div>
  );
}

function Detail({ r, apps }: { r: WorkerRow; apps: ForgeApp[] }) {
  const best = bestOf(r);
  const bestSession = r.coins.find((c) => c.sym === best.sym)?.worker;
  const allTime = r.coins.reduce((m, c) => Math.max(m, c.worker.best_all_time ?? 0), 0);
  const w = r.active;

  return (
    <div className="flex flex-col gap-3 border-t border-border/50 px-3 py-3 font-mono text-[0.7rem]">
      {r.coins.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left">
            <thead>
              <tr className="text-[0.6rem] tracking-[0.12em] text-foreground/90 uppercase">
                <th className="pb-1 font-normal">Coin</th>
                <th className="pb-1 font-normal">State</th>
                <th className="pb-1 font-normal">Session A / R / S</th>
                <th className="pb-1 font-normal">48h A / R</th>
                <th className="pb-1 font-normal">All time A / R</th>
                <th className="pb-1 font-normal">Best</th>
              </tr>
            </thead>
            <tbody>
              {r.coins.map((c) => {
                const app = apps.find((a) => a.id.toUpperCase() === c.sym);
                return (
                  <tr key={c.sym}>
                    <td className="py-0.5 font-semibold" style={{ color: app?.color ?? "var(--foreground)" }}>
                      {app?.ticker ?? c.sym}
                    </td>
                    <td className="py-0.5" style={{ color: c.standby ? "var(--foreground)" : "var(--neon-green)" }}>
                      {c.standby ? "standby" : "mining"}
                    </td>
                    <td className="py-0.5">
                      {c.worker.valid_shares ?? 0} / {c.worker.invalid_shares ?? 0} / {c.worker.stale_shares ?? 0}
                    </td>
                    <td className="py-0.5">
                      {c.worker.shares_48h_valid ?? 0} / {c.worker.shares_48h_invalid ?? 0}
                    </td>
                    <td className="py-0.5">
                      {c.worker.shares_alltime_valid ?? 0} / {c.worker.shares_alltime_invalid ?? 0}
                    </td>
                    <td className="py-0.5 text-neon-cyan">{compactNumber(c.worker.best_session ?? 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid gap-x-6 gap-y-1 @2xl:grid-cols-2">
        {best.best > 0 && bestSession && (
          <span>
            <span className="text-foreground/90">Best share this session: </span>
            <span className="text-neon-cyan">{compactNumber(best.best)}</span>
            {bestSession.height_at_best ? ` at height ${bestSession.height_at_best.toLocaleString()}` : ""}
            {bestSession.time_at_best ? `, ${timeAgo(bestSession.time_at_best)}` : ""}
          </span>
        )}
        {allTime > 0 && (
          <span>
            <span className="text-foreground/90">Best share all time: </span>
            <span className="text-neon-cyan">{compactNumber(allTime)}</span>
          </span>
        )}
        {w?.connected_at && (
          <span>
            <span className="text-foreground/90">Connected: </span>
            {timeAgo(w.connected_at)}
          </span>
        )}
        {w?.payout_address && w.payout_address !== w.name && (
          <span className="min-w-0 truncate">
            <span className="text-foreground/90">Payout: </span>
            {w.payout_address}
          </span>
        )}
      </div>

      <div>
        <p className="text-[0.6rem] tracking-[0.12em] text-foreground/90 uppercase">Recent refused shares</p>
        <RejectionList worker={r.name} />
      </div>
    </div>
  );
}

export function WorkersPanel({ apps, mesh }: { apps: ForgeApp[]; mesh: MeshStatus | null }) {
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
  const [openKey, setOpenKey] = useState<string | null>(null);

  const { rows, summary } = useMemo(() => buildWorkerRows(apps, mesh, found), [apps, mesh, found]);

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
    <section className="panel-neon animate-rise @container flex flex-col p-5">
      <header className="flex items-center gap-3">
        <Users className="size-4 text-neon-cyan" />
        <h2 className="text-xs font-semibold tracking-[0.26em] text-neon-cyan uppercase">Workers</h2>
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

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
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
            aria-label="Search workers"
            className="w-48 rounded-md border border-border/70 bg-secondary/25 py-1 pr-2 pl-7 font-mono text-[0.7rem] text-foreground placeholder:text-muted-foreground/60 focus:border-neon-cyan focus:outline-none"
          />
        </label>
      </div>

      <div
        className={`mt-4 hidden gap-x-4 px-3 pb-1.5 text-[0.6rem] tracking-[0.12em] text-foreground/90 uppercase @4xl:grid ${COLS}`}
      >
        <span className="pl-9">Miner</span>
        <span>Coin</span>
        <span>Hashrate</span>
        <span>Shares A / R / S</span>
        <span>Best share</span>
        <span>ASIC / VR</span>
        <span>Uptime</span>
        <span>Last share</span>
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
              open={openKey === r.key}
              onToggle={() => setOpenKey((k) => (k === r.key ? null : r.key))}
            />
          ))
        )}
      </div>
    </section>
  );
}

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { setMeshDefault, type MeshStatus } from "@/lib/forge-api";
import type { ForgeApp } from "./nexus-data";

// A miner arriving on the mesh has no assignment, so it needs somewhere to go and
// somewhere to fall back to. This is that order: the first coin is where it
// starts, the rest are its fallbacks in turn when one stops serving. Without a
// choice here the mesh uses the order its coins happen to be configured in, which
// is an installation detail rather than anything anyone decided.
//
// Coins installed but absent from the mesh configuration are listed dimmed rather
// than hidden: a coin you can see you have, but cannot route to, is less
// confusing than one that silently is not there.
export function MeshDefault({
  apps,
  mesh,
  refresh,
}: {
  apps: ForgeApp[];
  mesh: MeshStatus | null;
  refresh: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const meshCoins = (mesh?.coins ?? []).map((c) => c.toUpperCase());
  const installed = apps.filter((a) => a.installed);

  // app.id is the ticker code lowercased (dgb, bch); app.symbol is the currency
  // glyph and matches nothing the mesh knows about.
  const symOf = (a: ForgeApp) => a.id.toUpperCase();

  // Routable coins in the user's order, with any the order omits appended in the
  // order the mesh lists them — the same rule the engine applies, so what is shown
  // is what will happen.
  const saved = (mesh?.default_order ?? []).map((c) => c.toUpperCase());
  const routable = installed.filter((a) => meshCoins.includes(symOf(a)));
  const ordered = [
    ...saved.map((s) => routable.find((a) => symOf(a) === s)).filter(Boolean),
    ...routable.filter((a) => !saved.includes(symOf(a))),
  ] as ForgeApp[];
  const unroutable = installed.filter((a) => !meshCoins.includes(symOf(a)));

  const move = async (index: number, delta: number) => {
    const next = [...ordered];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setBusy(true);
    const res = await setMeshDefault(next.map(symOf));
    setNote(res.note);
    setTimeout(() => setNote(""), 6000);
    setBusy(false);
    refresh();
  };

  const row = (app: ForgeApp, position: number | null) => (
    <div key={app.id} className="flex items-center gap-2" style={{ opacity: position === null ? 0.4 : 1 }}>
      <span
        className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md text-sm font-bold"
        style={{ color: app.color }}
      >
        {app.icon ? <img src={app.icon} alt={app.ticker} className="size-full object-contain" /> : app.symbol}
      </span>
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{
          background: app.online ? "var(--neon-green)" : "var(--muted-foreground)",
          boxShadow: app.online ? "0 0 8px var(--neon-green)" : undefined,
          animation: app.online ? "pulse-glow 2.4s ease-in-out infinite" : undefined,
        }}
      />
      <span className="min-w-0 flex-1">
        <span
          className="font-display block truncate text-sm font-semibold tracking-wide"
          style={{ color: position === 0 ? app.color : "var(--foreground)" }}
        >
          {app.ticker}
        </span>
        <span className="block truncate text-[0.6rem] text-foreground/90">{app.chain}</span>
      </span>

      {position !== null && (
        <>
          <span
            className="shrink-0 text-[0.7rem] font-semibold tracking-[0.18em] uppercase"
            style={{ color: position === 0 ? app.color : "var(--foreground)" }}
          >
            {position === 0 ? "default" : `fallback ${position}`}
          </span>
          <span className="flex shrink-0 flex-col">
            <button
              type="button"
              aria-label={`Move ${app.ticker} up`}
              disabled={busy || position === 0}
              onClick={() => move(position, -1)}
              className="rounded text-foreground transition hover:text-neon-cyan disabled:opacity-25"
            >
              <ChevronUp className="size-4.5" />
            </button>
            <button
              type="button"
              aria-label={`Move ${app.ticker} down`}
              disabled={busy || position === ordered.length - 1}
              onClick={() => move(position, 1)}
              className="rounded text-foreground transition hover:text-neon-cyan disabled:opacity-25"
            >
              <ChevronDown className="size-4.5" />
            </button>
          </span>
        </>
      )}
    </div>
  );

  return (
    <section className="panel-neon animate-rise flex flex-col p-5">
      <header className="flex items-center gap-3">
        <span
          className="h-4 w-1 animate-pulse-glow rounded-full"
          style={{ background: "var(--neon-cyan)", boxShadow: "0 0 12px var(--neon-cyan)" }}
        />
        <h2 className="text-xs font-semibold tracking-[0.26em] text-neon-cyan uppercase">Node priority order</h2>
      </header>

      <p className="mt-3 text-sm leading-relaxed text-foreground/90">
        Where a miner starts when it joins the mesh, and where it falls back to when the node is
        offline. Miners you have assigned to a node ignore this.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {installed.length === 0 ? (
          <div className="py-6 text-sm text-muted-foreground">No coin apps installed.</div>
        ) : (
          <>
            {ordered.map((app, i) => row(app, i))}
            {unroutable.map((app) => row(app, null))}
          </>
        )}
      </div>

      {note && <p className="mt-3 text-[0.7rem] text-muted-foreground">{note}</p>}
      {unroutable.length > 0 && (
        <p className="mt-3 text-[0.65rem] text-muted-foreground">
          Dimmed coins are installed but not in the mesh's configured coin list, so miners cannot be
          routed to them.
        </p>
      )}
    </section>
  );
}

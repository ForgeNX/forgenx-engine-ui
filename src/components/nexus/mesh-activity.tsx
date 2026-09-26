import { useEffect, useState } from "react";
import { Activity as ActivityIcon, Scale } from "lucide-react";
import { timeAgo } from "./format";
import type { MeshActivity } from "@/lib/forge-api";
import type { ForgeApp } from "./nexus-data";

// What the mesh has been doing, so it can be read here rather than in the log.
// The same record serves both panels: everything, and the balancer's share of it.

const KIND_LABEL: Record<string, string> = {
  switch: "switched",
  balancer: "moved by Fleet Balance",
  join: "joined the mesh on",
  leave: "left the mesh",
  block: "found a block on",
};

function Row({ e, apps }: { e: MeshActivity; apps: ForgeApp[] }) {
  const appFor = (sym?: string) => apps.find((a) => a.id.toUpperCase() === (sym ?? "").toUpperCase());
  const node = (sym?: string) => {
    const app = appFor(sym);
    if (!sym) return null;
    return (
      <span className="font-semibold" style={{ color: app?.color ?? "var(--foreground)" }}>
        {app?.ticker ?? sym}
      </span>
    );
  };

  // A found block is the one event worth looking at twice, so it is marked out.
  const isBlock = e.kind === "block";

  return (
    <div
      className="flex items-baseline justify-between gap-3 py-1"
      style={
        isBlock
          ? { background: "color-mix(in oklab, var(--neon-green) 8%, transparent)", marginInline: "-0.4rem", paddingInline: "0.4rem", borderRadius: "0.375rem" }
          : undefined
      }
    >
      <span className="min-w-0 font-mono text-[0.7rem] text-foreground/90">
        <span className="font-semibold text-foreground">{e.worker}</span>{" "}
        <span style={isBlock ? { color: "var(--neon-green)", fontWeight: 600 } : undefined}>
          {KIND_LABEL[e.kind] ?? e.kind}
        </span>{" "}
        {e.kind === "switch" || e.kind === "balancer" ? (
          <>
            {node(e.from)} → {node(e.to)}
          </>
        ) : (
          node(e.to ?? e.from)
        )}
        {isBlock && e.detail && <span className="text-foreground"> {e.detail}</span>}
      </span>
      <span className="shrink-0 font-mono text-[0.65rem] text-foreground/90">{timeAgo(e.at)}</span>
    </div>
  );
}

export function MeshActivityPanel({
  apps,
  activity,
  fleetOnly,
  worker = null,
}: {
  apps: ForgeApp[];
  activity: MeshActivity[];
  fleetOnly?: boolean;
  // The selected miner, whose history the panel narrows to until "Show all".
  worker?: string | null;
}) {
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // A new selection starts narrowed again.
  useEffect(() => setShowAll(false), [worker]);

  const filtered = Boolean(worker) && !showAll;
  const kinds = fleetOnly ? activity.filter((e) => e.kind === "balancer") : activity;
  const events = filtered ? kinds.filter((e) => e.worker === worker) : kinds;
  const shown = expanded ? events : events.slice(0, 8);

  return (
    <section className="panel-neon animate-rise flex flex-col p-5">
      <header className="flex items-center gap-3">
        {fleetOnly ? (
          <Scale className="size-4 text-neon-cyan" />
        ) : (
          <ActivityIcon className="size-4 text-neon-cyan" />
        )}
        <h2 className="text-xs font-semibold tracking-[0.26em] text-neon-cyan uppercase">
          {fleetOnly ? "Fleet Balance activity" : "Mesh activity"}
        </h2>
        {worker && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="ml-auto rounded-md border px-2 py-0.5 font-mono text-[0.65rem] font-semibold transition"
            style={{
              borderColor: filtered ? "var(--neon-cyan)" : "var(--border)",
              color: filtered ? "var(--neon-cyan)" : "var(--foreground)",
            }}
          >
            {filtered ? `${worker} · Show all` : `Only ${worker}`}
          </button>
        )}
      </header>

      {shown.length === 0 ? (
        <p className="mt-3 text-[0.72rem] leading-relaxed text-foreground/90">
          {filtered
            ? `Nothing recorded for ${worker} since the engine started.`
            : fleetOnly
              ? "Fleet Balance has not moved a miner yet. It checks every five minutes, and leaves a miner it has moved alone for half an hour."
              : "Nothing has happened on the mesh since the engine started."}
        </p>
      ) : (
        <div className="mt-3 flex flex-col divide-y divide-border/40">
          {shown.map((e, i) => (
            <Row key={`${e.at}-${e.worker}-${i}`} e={e} apps={apps} />
          ))}
        </div>
      )}

      {events.length > 8 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 self-start text-[0.65rem] text-muted-foreground underline decoration-dotted underline-offset-2 transition hover:text-neon-cyan"
        >
          {expanded ? "Show fewer" : `Show ${events.length - 8} older`}
        </button>
      )}
    </section>
  );
}

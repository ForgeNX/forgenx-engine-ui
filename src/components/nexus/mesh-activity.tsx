import { Activity as ActivityIcon, Scale } from "lucide-react";
import type { MeshActivity } from "@/lib/forge-api";
import type { ForgeApp } from "./nexus-data";

// What the mesh has been doing, so it can be read here rather than in the log.
// The same record serves both panels: everything, and the balancer's share of it.

function ago(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (!Number.isFinite(mins)) return "";
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return hours < 48 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

const KIND_LABEL: Record<string, string> = {
  switch: "switched",
  balancer: "moved by Fleet Balance",
  join: "joined the mesh on",
  leave: "left the mesh",
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

  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="min-w-0 font-mono text-[0.7rem] text-foreground/90">
        <span className="font-semibold text-foreground">{e.worker}</span> {KIND_LABEL[e.kind] ?? e.kind}{" "}
        {e.kind === "switch" || e.kind === "balancer" ? (
          <>
            {node(e.from)} → {node(e.to)}
          </>
        ) : (
          node(e.to ?? e.from)
        )}
      </span>
      <span className="shrink-0 font-mono text-[0.62rem] text-muted-foreground">{ago(e.at)}</span>
    </div>
  );
}

export function MeshActivityPanel({
  apps,
  activity,
  fleetOnly,
}: {
  apps: ForgeApp[];
  activity: MeshActivity[];
  fleetOnly?: boolean;
}) {
  const events = fleetOnly ? activity.filter((e) => e.kind === "balancer") : activity;
  const shown = events.slice(0, 8);

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
      </header>

      {shown.length === 0 ? (
        <p className="mt-3 text-[0.72rem] leading-relaxed text-foreground/90">
          {fleetOnly
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

      {events.length > shown.length && (
        <p className="mt-2 text-[0.62rem] text-muted-foreground">
          and {events.length - shown.length} older
        </p>
      )}
    </section>
  );
}

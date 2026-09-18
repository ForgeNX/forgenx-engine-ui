import { useState } from "react";
import { Share2, Link2Off, Check } from "lucide-react";
import {
  assignMeshWorker,
  unassignMeshWorker,
  type MeshStatus,
} from "@/lib/forge-api";

// A miner pointed at the mesh port is bonded to every configured coin at once:
// one receives its work, the rest stay warm so it can be switched without
// reconnecting. Assigning pins it to a coin; unassigned miners follow the mesh
// default, which means a new miner is productive immediately rather than idling
// until someone tells it where to go.
export function MeshPanel({
  mesh,
  loading,
  refresh,
}: {
  mesh: MeshStatus | null;
  loading: boolean;
  refresh: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});

  const say = (worker: string, text: string) => {
    setNote((n) => ({ ...n, [worker]: text }));
    setTimeout(() => setNote((n) => ({ ...n, [worker]: "" })), 6000);
  };

  const assign = async (worker: string, coin: string) => {
    setBusy(worker);
    const res = await assignMeshWorker(worker, `${coin}:100`);
    say(worker, res.applied ? "Moved now" : res.note);
    setBusy(null);
    refresh();
  };

  const clear = async (worker: string) => {
    setBusy(worker);
    const res = await unassignMeshWorker(worker);
    say(worker, res.note);
    setBusy(null);
    refresh();
  };

  // Single accent for now — per-coin colours live in forge-api's COIN_META, which
  // is module-private. Worth wiring up when this panel gets its proper styling.
  const accent = "var(--neon-cyan)";

  if (loading && !mesh) {
    return (
      <div className="panel-neon animate-rise flex min-h-[300px] flex-col items-center justify-center gap-3 p-10 text-center">
        <span className="size-2 rounded-full bg-neon-cyan" style={{ animation: "pulse-glow 2s ease-in-out infinite" }} />
        <p className="font-display text-2xl font-bold tracking-[0.12em] uppercase">Reading mesh</p>
      </div>
    );
  }

  if (!mesh?.enabled) {
    return (
      <div className="panel-neon animate-rise flex min-h-[300px] flex-col items-center justify-center gap-3 p-10 text-center">
        <p className="font-display text-2xl font-bold tracking-[0.12em] uppercase">Mesh disabled</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Set <span className="font-mono text-[0.78rem] text-neon-cyan">MESH_ENABLED=true</span> to bond one miner
          to several coins at once, with automatic failover when a coin stops serving.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <section className="panel-neon animate-rise flex flex-col p-6">
        <header className="flex items-center gap-3">
          <Share2 className="size-4 text-neon-cyan" />
          <h2 className="text-xs font-semibold tracking-[0.26em] text-neon-cyan uppercase">Nexus Mesh</h2>
        </header>
        <p className="mt-3 text-sm leading-relaxed text-foreground/90">
          Point a miner at <span className="font-mono text-[0.78rem] text-neon-cyan">port {mesh.port}</span> and it
          bonds to {mesh.coins.join(", ")} together. It mines one and holds the rest warm, so a coin going down moves
          it across without a reconnect. Assign a miner to pin it to a coin; unassigned miners follow the default.
        </p>

        <div className="mt-5 space-y-3">
          {mesh.miners.length === 0 ? (
            <div className="py-6 text-sm text-muted-foreground">
              No miners on the mesh yet. Point one at port {mesh.port} to begin.
            </div>
          ) : (
            mesh.miners.map((m) => (
              <div key={m.worker} className="rounded-xl border border-border/70 bg-secondary/25 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-bold">{m.worker}</span>
                    {m.connected ? (
                      m.active_coin ? (
                        <span
                          className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.62rem] font-semibold"
                          style={{
                            background: "color-mix(in oklab, var(--neon-green) 12%, transparent)",
                            color: accent,
                          }}
                        >
                          <span className="size-1.5 rounded-full" style={{ background: "currentColor" }} />
                          mining {m.active_coin}
                        </span>
                      ) : null
                    ) : (
                      <span className="flex items-center gap-1.5 rounded-full bg-secondary/60 px-2 py-0.5 text-[0.62rem] font-semibold text-muted-foreground">
                        <Link2Off className="size-2.5" />
                        offline
                      </span>
                    )}
                    <span className="text-[0.65rem] text-muted-foreground">
                      {m.assigned ? "assigned" : "following default"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {mesh.coins.map((c) => {
                      const isOn = m.assigned && m.assignment.toUpperCase().startsWith(c.toUpperCase());
                      return (
                        <button
                          key={c}
                          type="button"
                          disabled={busy === m.worker}
                          onClick={() => assign(m.worker, c)}
                          className="rounded-lg border px-2.5 py-1 text-[0.7rem] font-semibold transition disabled:opacity-40"
                          style={{
                            borderColor: isOn ? accent : "var(--border)",
                            color: isOn ? accent : "var(--muted-foreground)",
                            background: isOn ? "color-mix(in oklab, currentColor 10%, transparent)" : "transparent",
                          }}
                        >
                          {isOn && <Check className="mr-1 inline size-2.5" />}
                          {c}
                        </button>
                      );
                    })}
                    {m.assigned && (
                      <button
                        type="button"
                        disabled={busy === m.worker}
                        onClick={() => clear(m.worker)}
                        className="rounded-lg border border-border/70 px-2.5 py-1 text-[0.7rem] font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-40"
                      >
                        clear
                      </button>
                    )}
                  </div>
                </div>
                {note[m.worker] && (
                  <p className="mt-2.5 text-[0.7rem] text-muted-foreground">{note[m.worker]}</p>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

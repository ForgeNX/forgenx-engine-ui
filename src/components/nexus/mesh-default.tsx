import { useState } from "react";
import { setMeshDefault, type MeshStatus } from "@/lib/forge-api";
import type { ForgeApp } from "./nexus-data";

// A miner arriving on the mesh for the first time has no assignment, so it needs
// somewhere to go. Without a choice the mesh falls back to the order its coins
// happen to be configured in, which is an installation detail rather than
// anything the user decided. This is where they decide it.
//
// Coins installed but absent from the mesh configuration are shown dimmed rather
// than hidden: a coin you can see you have, but cannot pick, is less confusing
// than one that silently is not listed.
export function MeshDefault({
  apps,
  mesh,
  refresh,
}: {
  apps: ForgeApp[];
  mesh: MeshStatus | null;
  refresh: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const meshCoins = (mesh?.coins ?? []).map((c) => c.toUpperCase());
  const current = (mesh?.default_coin ?? "").toUpperCase();
  const installed = apps.filter((a) => a.installed);

  const choose = async (symbol: string) => {
    setBusy(symbol);
    const res = await setMeshDefault(symbol);
    setNote(res.note);
    setTimeout(() => setNote(""), 6000);
    setBusy(null);
    refresh();
  };

  return (
    <section className="panel-neon animate-rise flex flex-col p-5">
      <header className="flex items-center gap-3">
        <span
          className="h-4 w-1 animate-pulse-glow rounded-full"
          style={{ background: "var(--neon-cyan)", boxShadow: "0 0 12px var(--neon-cyan)" }}
        />
        <h2 className="text-xs font-semibold tracking-[0.26em] text-neon-cyan uppercase">Default coin</h2>
      </header>

      <p className="mt-3 text-sm leading-relaxed text-foreground/90">
        Where a miner starts when it first connects to the mesh, before you assign it anywhere.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {installed.length === 0 ? (
          <div className="py-6 text-sm text-muted-foreground">No coin apps installed.</div>
        ) : (
          installed.map((app) => {
            const sym = app.symbol.toUpperCase();
            const inMesh = meshCoins.includes(sym);
            const isDefault = current === sym;
            return (
              <div
                key={app.id}
                className="flex items-center gap-2"
                style={{ opacity: inMesh ? 1 : 0.4 }}
              >
                <span
                  className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md text-sm font-bold"
                  style={{ color: app.color }}
                >
                  {app.icon ? (
                    <img src={app.icon} alt={app.ticker} className="size-full object-contain" />
                  ) : (
                    app.symbol
                  )}
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
                    style={{ color: isDefault ? app.color : "var(--foreground)" }}
                  >
                    {app.ticker}
                  </span>
                  <span className="block truncate text-[0.6rem] text-muted-foreground">{app.chain}</span>
                </span>

                <button
                  type="button"
                  role="switch"
                  aria-checked={isDefault}
                  aria-label={`Make ${app.ticker} the default`}
                  disabled={!inMesh || busy !== null || isDefault}
                  onClick={() => choose(sym)}
                  className="relative h-5 w-9 shrink-0 rounded-full border transition disabled:cursor-not-allowed"
                  style={{
                    borderColor: isDefault ? app.color : "var(--border)",
                    background: isDefault
                      ? `color-mix(in oklab, ${app.color} 25%, transparent)`
                      : "var(--secondary)",
                  }}
                >
                  <span
                    className="absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full transition-all"
                    style={{
                      left: isDefault ? "calc(100% - 1.05rem)" : "0.15rem",
                      background: isDefault ? app.color : "var(--muted-foreground)",
                      boxShadow: isDefault ? `0 0 8px ${app.color}` : undefined,
                    }}
                  />
                </button>
              </div>
            );
          })
        )}
      </div>

      {note && <p className="mt-3 text-[0.7rem] text-muted-foreground">{note}</p>}
      {installed.some((a) => !meshCoins.includes(a.symbol.toUpperCase())) && (
        <p className="mt-3 text-[0.65rem] text-muted-foreground">
          Dimmed coins are installed but not in the mesh's configured coin list, so miners cannot be
          routed to them.
        </p>
      )}
    </section>
  );
}

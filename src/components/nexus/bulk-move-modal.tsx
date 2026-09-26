import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import type { FoundMiner } from "@/lib/forge-api";

// Moving several miners to the mesh at once. Each is moved in turn, so worker
// names given out in sequence stay in order and one miner refusing the change
// does not stop the rest. The dialog stays open through the run and shows how
// each one went.
export type BulkState = "waiting" | "moving" | "done" | "failed";
// include: whether the miner is ticked to be moved. Every eligible miner starts
// ticked; the user can leave some out before the run starts.
export type BulkRow = { miner: FoundMiner; name: string; state: BulkState; include: boolean; note?: string };

export function BulkMoveModal({
  rows,
  address,
  port,
  autoName,
  includeNew,
  running,
  finished,
  onToggle,
  onConfirm,
  onClose,
}: {
  rows: BulkRow[];
  address: string;
  port: number;
  autoName: boolean;
  includeNew: boolean;
  running: boolean;
  finished: boolean;
  onToggle: (host: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLButtonElement>(null);
  // Closing mid-run would hide which miners have moved, so it waits.
  const closeRef = useRef(onClose);
  closeRef.current = running ? () => {} : onClose;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    firstRef.current?.focus();
    return () => opener?.focus?.();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = panelRef.current.querySelectorAll<HTMLElement>("button:not([disabled])");
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const started = running || finished;
  const chosen = rows.filter((r) => r.include).length;
  const moved = rows.filter((r) => r.state === "done").length;
  const failed = rows.filter((r) => r.state === "failed").length;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Move miners to the mesh"
      onClick={() => closeRef.current()}
    >
      <div
        ref={panelRef}
        className="panel-neon flex max-h-[85vh] w-full max-w-lg flex-col p-5"
        style={{ background: "var(--background)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4" style={{ color: "#e0115f" }} />
          <h2 className="font-display text-sm font-bold">
            Move {chosen} miner{chosen === 1 ? "" : "s"} to the mesh?
          </h2>
        </div>

        <p className="mt-3 text-[0.78rem] leading-relaxed text-foreground/90">
          This changes the settings on each miner. Its primary pool is replaced with{" "}
          <span className="font-mono text-neon-cyan">
            {address}:{port}
          </span>
          , its protocol is set to Stratum V1 with extranonce subscribe on, and it restarts - so each stops
          mining for about a minute. They are moved one at a time.
        </p>
        {!started && (
          <p className="mt-2 text-[0.72rem] text-foreground/90">Untick any miner you want to leave as it is.</p>
        )}

        <ul className="mt-3 flex min-h-0 flex-col gap-1.5 overflow-y-auto rounded-lg border border-border/60 p-3 font-mono text-[0.7rem]">
          {rows.map((r) => (
            <li key={r.miner.host} className="flex items-start gap-2" style={{ opacity: r.include ? 1 : 0.45 }}>
              <span className="mt-0.5 shrink-0">
                {!started ? (
                  // Before the run: a real checkbox for leaving a miner out.
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={r.include}
                    aria-label={`Move ${r.miner.worker}`}
                    onClick={() => onToggle(r.miner.host)}
                    className="flex size-3.5 items-center justify-center rounded-sm border transition"
                    style={{
                      borderColor: r.include ? "var(--neon-cyan)" : "var(--border)",
                      background: r.include ? "color-mix(in oklab, var(--neon-cyan) 25%, transparent)" : "transparent",
                    }}
                  >
                    {r.include && <Check className="size-2.5" style={{ color: "var(--neon-cyan)" }} />}
                  </button>
                ) : !r.include ? (
                  <span className="block size-3.5" />
                ) : r.state === "done" ? (
                  <Check className="size-3.5" style={{ color: "var(--neon-green)" }} />
                ) : r.state === "failed" ? (
                  <X className="size-3.5" style={{ color: "#ff0080" }} />
                ) : r.state === "moving" ? (
                  <Loader2 className="size-3.5 animate-spin" style={{ color: "var(--neon-gold)" }} />
                ) : (
                  // Ticked, waiting its turn: a plain clock face, not a control.
                  <span className="block size-3.5 rounded-full border border-dashed border-foreground/50" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-foreground">
                  <span className="font-semibold">{r.miner.worker}</span>
                  <span className="text-foreground/90"> · IP: {r.miner.host}</span>
                </span>
                <span className="block truncate text-foreground/90">
                  Mesh Worker Name:{" "}
                  {r.name ? (
                    r.name === r.miner.worker ? (
                      <span className="text-neon-cyan">{r.name} (unchanged)</span>
                    ) : (
                      <span style={{ color: "var(--neon-gold)" }}>{r.name} (renamed)</span>
                    )
                  ) : (
                    <span style={{ color: "var(--neon-gold)" }}>
                      {autoName ? "next in sequence" : "none"}
                    </span>
                  )}
                </span>
                <span className="block truncate text-foreground/90">
                  Current Primary Pool: {r.miner.pool_url || "unknown"}
                </span>
                {!started && !r.include && <span className="block text-muted-foreground">left as it is</span>}
                {r.note && (
                  <span className="block" style={{ color: r.state === "failed" ? "#ff0080" : "var(--muted-foreground)" }}>
                    {r.note}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>

        {!started && (
          <>
            <p className="mt-3 text-[0.8rem] leading-relaxed text-foreground">
              <span style={{ color: "#e0115f" }}>⚠ Warning:</span> the primary pool each miner uses now will be lost,
              and you should record its details if you wish to set it back by hand later. Fallback pools and other
              settings are left alone.
            </p>
            <p className="mt-2 text-[0.8rem] leading-relaxed text-foreground">
              <span className="text-neon-cyan">ⓘ Note:</span>{" "}
              {autoName
                ? "Worker names are given in sequence as each miner is moved. "
                : "Each miner keeps the worker name shown. "}
              {includeNew
                ? "They will join Fleet Balance, since Include new miners is on."
                : "They will mine to the first online node in your Node Priority Order until you allocate them."}
            </p>
          </>
        )}

        {finished && (
          <p className="mt-3 text-[0.8rem] text-foreground">
            {moved} moved{failed > 0 ? `, ${failed} not moved` : ""}. They will appear on the mesh as they restart.
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          {!started ? (
            <>
              <button
                ref={firstRef}
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border/70 px-3 py-1.5 text-[0.75rem] font-semibold text-foreground transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={chosen === 0}
                className="rounded-lg border px-3 py-1.5 text-[0.75rem] font-semibold transition disabled:opacity-40"
                style={{
                  borderColor: "var(--neon-cyan)",
                  color: "var(--neon-cyan)",
                  background: "color-mix(in oklab, var(--neon-cyan) 12%, transparent)",
                }}
              >
                Move {chosen} miner{chosen === 1 ? "" : "s"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              disabled={running}
              className="rounded-lg border border-border/70 px-3 py-1.5 text-[0.75rem] font-semibold text-foreground transition disabled:opacity-40"
            >
              {running ? "Moving…" : "Close"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

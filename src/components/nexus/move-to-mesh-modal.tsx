import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import type { FoundMiner } from "@/lib/forge-api";

// Asked before ForgeNX writes to a miner's settings. It says what will change
// and what will be lost, because the primary pool it replaces is one the owner
// chose, and a miner mining somewhere they did not expect is worse than a
// moment's friction here.
export function MoveToMeshModal({
  miner,
  worker,
  address,
  port,
  includeNew,
  busy,
  onConfirm,
  onCancel,
}: {
  miner: FoundMiner;
  worker: string;
  address: string;
  port: number;
  includeNew: boolean;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const renaming = worker !== miner.worker;
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  // Read through a ref so the key handler below is set up once, not on every
  // render the parent gives it a new function.
  const closeRef = useRef(onCancel);
  closeRef.current = busy ? () => {} : onCancel;

  // Focus starts on Cancel, the safe choice, and goes back to whatever opened
  // the dialog when it closes.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => opener?.focus?.();
  }, []);

  // Escape closes it, as a dialog should - except while the move is running,
  // when closing would hide the result. Tab stays within the dialog.
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

  // Rendered at the top of the document rather than where it sits in the tree:
  // inside a scrolling column, a fixed overlay is positioned against that column
  // and can land half off the screen.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Move ${miner.worker} to the mesh`}
      onClick={() => closeRef.current()}
    >
      <div
        ref={panelRef}
        className="panel-neon w-full max-w-md p-5"
        style={{ background: "var(--background)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4" style={{ color: "#e0115f" }} />
          <h2 className="font-display text-sm font-bold">Move {miner.worker} to the mesh?</h2>
        </div>

        <p className="mt-3 text-[0.78rem] leading-relaxed text-foreground/90">
          This changes the settings on the miner itself. Its primary pool will be replaced and it will
          restart, so it stops mining for about a minute.
        </p>

        <dl className="mt-3 flex flex-col gap-1.5 rounded-lg border border-border/60 p-3 font-mono text-[0.72rem]">
          <div className="flex justify-between gap-3">
            <dt className="text-foreground">Primary Pool Now:</dt>
            <dd className="truncate text-foreground/90">{miner.pool_url || "unknown"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-neon-cyan">Primary Pool After:</dt>
            <dd className="truncate text-neon-cyan">
              {address}:{port}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-neon-cyan">Worker Name:</dt>
            <dd className="truncate" style={{ color: renaming ? "var(--neon-gold)" : "var(--neon-cyan)" }}>
              {worker}
              {renaming && " (renamed)"}
            </dd>
          </div>
        </dl>

        <p className="mt-3 text-[0.8rem] leading-relaxed text-foreground">
          <span style={{ color: "#e0115f" }}>⚠ Warning:</span> the pool this miner uses now will be lost,
          and you will need its details if you ever want to set it back by hand. Its protocol is set
          to Stratum V1 with extranonce subscribe on, which the mesh needs; its fallback pool and every
          other setting are left alone.
        </p>

        <p className="mt-2 text-[0.8rem] leading-relaxed text-foreground">
          <span className="text-neon-cyan">ⓘ Note:</span>{" "}
          {includeNew
            ? "The miner will join the mesh and be allocated to Fleet Balance, since Include new miners is on."
            : "The miner will join the mesh and mine to the first online node in your Node Priority Order until you allocate it by hand."}
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-border/70 px-3 py-1.5 text-[0.75rem] font-semibold text-foreground transition disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-lg border px-3 py-1.5 text-[0.75rem] font-semibold transition disabled:opacity-40"
            style={{
              borderColor: "var(--neon-cyan)",
              color: "var(--neon-cyan)",
              background: "color-mix(in oklab, var(--neon-cyan) 12%, transparent)",
            }}
          >
            {busy ? "Moving…" : "Move to mesh"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

import { useEffect, useRef, useState } from "react";
import { MoreVertical, Play, RotateCcw, Square, X } from "lucide-react";
import { engineAction, engineIsUp } from "@/lib/forge-api";

type ActionKind = "start" | "stop" | "restart";
type ModalStage = "confirm" | "running" | "done" | "error";

const ACTION_META: Record<ActionKind, { label: string; color: string; gerund: string; past: string }> = {
  start: { label: "Start", color: "var(--neon-green)", gerund: "Starting", past: "started" },
  stop: { label: "Stop", color: "var(--neon-pink)", gerund: "Stopping", past: "stopped" },
  restart: { label: "Restart", color: "var(--neon-gold)", gerund: "Restarting", past: "restarted" },
};

export function EngineControls() {
  const [available, setAvailable] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<ActionKind | null>(null);
  const [stage, setStage] = useState<ModalStage>("confirm");
  const [statusText, setStatusText] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  // Only expose engine start/stop/restart when forgenxd is reachable (ForgeNX
  // platform). On UmbrelOS / StratumOS / standalone the host manages the engine.
  useEffect(() => {
    // Positive ForgeNX detection: engine lifecycle (start/stop/restart) is served
    // by forgenxd, which is only present on ForgeNX. forgenxd's /api/version
    // returns {product:"ForgeNX"} (the engine 404s it), so we show the controls
    // ONLY when we positively confirm ForgeNX. Fails safe: any other host, or an
    // unreachable probe, leaves the kebab hidden rather than showing a broken one.
    let alive = true;
    fetch("/api/version", { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setAvailable(d?.product === "ForgeNX"))
      .catch(() => alive && setAvailable(false));
    return () => { alive = false; };
  }, []);

  // Close the dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const openAction = (action: ActionKind) => {
    setMenuOpen(false);
    if (action === "start") {
      runAction("start");
      return;
    }
    setModal(action);
    setStage("confirm");
    setStatusText("");
  };

  const runAction = async (action: ActionKind) => {
    const meta = ACTION_META[action];
    setModal(action);
    setStage("running");
    setStatusText(`${meta.gerund} engine...`);
    const ok = await engineAction(action);
    if (!ok) {
      setStage("error");
      setStatusText(`Failed to ${action} the engine. Please try again.`);
      return;
    }
    await pollUntilComplete(action);
  };

  const pollUntilComplete = async (action: ActionKind) => {
    const meta = ACTION_META[action];
    const deadline = Date.now() + 60000; // 60s safety timeout
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    if (action === "stop") {
      let downStreak = 0;
      while (Date.now() < deadline) {
        await sleep(1500);
        const up = await engineIsUp();
        downStreak = up ? 0 : downStreak + 1;
        if (downStreak >= 2) { setStage("done"); setStatusText(`Engine ${meta.past}.`); return; }
      }
    } else {
      // restart / start: wait for it to go (optionally) down then come back up
      await sleep(2000);
      while (Date.now() < deadline) {
        await sleep(1500);
        if (await engineIsUp()) { setStage("done"); setStatusText(`Engine ${meta.past}.`); return; }
      }
    }
    setStage("error");
    setStatusText("Taking longer than expected. Check the engine status.");
  };

  const closeModal = () => { setModal(null); setStage("confirm"); setStatusText(""); };

  if (!available) return null;

  const items: ActionKind[] = ["start", "stop", "restart"];
  const meta = modal ? ACTION_META[modal] : null;

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          aria-label="Engine controls"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex size-9 items-center justify-center rounded-xl border text-neon-cyan transition-all hover:brightness-125"
          style={{
            borderColor: "color-mix(in oklab, var(--neon-cyan) 45%, transparent)",
            background: "color-mix(in oklab, var(--neon-cyan) 8%, transparent)",
            boxShadow: "0 0 16px -6px var(--neon-cyan)",
          }}
        >
          <MoreVertical className="size-4" />
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-xl border bg-[#02050d] py-1 shadow-xl"
            style={{ borderColor: "color-mix(in oklab, var(--neon-cyan) 25%, transparent)", boxShadow: "0 16px 48px rgba(0,0,0,0.8)" }}
          >
            {items.map((action) => {
              const m = ACTION_META[action];
              const Icon = action === "start" ? Play : action === "stop" ? Square : RotateCcw;
              return (
                <button
                  key={action}
                  type="button"
                  onClick={() => openAction(action)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[0.8rem] font-medium transition-colors hover:bg-white/5"
                  style={{ color: m.color }}
                >
                  <Icon className="size-3.5" />
                  {m.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {modal && meta && (
        <div
          className="fixed inset-0 z-[4000] flex items-center justify-center p-5"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onMouseDown={(e) => { if (e.target === e.currentTarget && stage !== "running") closeModal(); }}
        >
          <div
            className="relative w-full max-w-[420px] overflow-hidden rounded-[20px] bg-[#02050d]"
            style={{ border: "1px solid rgba(168,85,247,0.2)", boxShadow: "0 24px 80px rgba(0,0,0,0.8)" }}
          >
            <div
              className="absolute top-0 right-10 left-10 h-0.5"
              style={{ background: "linear-gradient(90deg, transparent, #a855f7, #00e5ff, transparent)" }}
            />
            <div className="flex items-center justify-between px-6 pt-5 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <div className="text-[0.65rem] tracking-wide text-muted-foreground uppercase">ForgeNX Engine</div>
                <div className="text-lg font-bold" style={{ color: meta.color }}>{meta.label} engine</div>
              </div>
              {stage !== "running" && (
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex size-8 items-center justify-center rounded-lg"
                  style={{ background: "rgba(255,0,128,0.08)", border: "1px solid rgba(255,0,128,0.5)", color: "#ff0080", boxShadow: "0 0 8px rgba(255,0,128,0.2), 0 0 16px rgba(255,0,128,0.08)" }}
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div className="px-6 py-6">
              {stage === "confirm" && (
                <>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    This will interrupt active mining. Are you sure you want to {modal} the engine?
                  </p>
                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={() => runAction(modal)}
                      className="flex-1 rounded-[10px] py-2.5 text-sm font-semibold"
                      style={{ background: "color-mix(in oklab, " + meta.color + " 12%, transparent)", border: "1px solid color-mix(in oklab, " + meta.color + " 45%, transparent)", color: meta.color }}
                    >
                      {meta.label}
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="rounded-[10px] border px-5 py-2.5 text-sm text-muted-foreground"
                      style={{ borderColor: "color-mix(in oklab, var(--border) 90%, transparent)" }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}

              {stage === "running" && (
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <span
                    className="size-8 rounded-full border-2"
                    style={{ borderColor: meta.color, borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }}
                  />
                  <p className="text-sm font-medium" style={{ color: meta.color }}>{statusText}</p>
                  <p className="text-[0.7rem] text-muted-foreground">Please wait, this may take a moment.</p>
                </div>
              )}

              {stage === "done" && (
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <span className="flex size-9 items-center justify-center rounded-full" style={{ background: "color-mix(in oklab, var(--neon-green) 15%, transparent)", color: "var(--neon-green)" }}>✓</span>
                  <p className="text-sm font-semibold" style={{ color: "var(--neon-green)" }}>{statusText}</p>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="mt-2 rounded-[10px] border px-6 py-2 text-sm text-muted-foreground"
                    style={{ borderColor: "color-mix(in oklab, var(--border) 90%, transparent)" }}
                  >
                    Close
                  </button>
                </div>
              )}

              {stage === "error" && (
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <span className="flex size-9 items-center justify-center rounded-full" style={{ background: "rgba(255,0,128,0.12)", color: "#ff0080" }}>!</span>
                  <p className="text-sm font-medium" style={{ color: "#ff0080" }}>{statusText}</p>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="mt-2 rounded-[10px] border px-6 py-2 text-sm text-muted-foreground"
                    style={{ borderColor: "color-mix(in oklab, var(--border) 90%, transparent)" }}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

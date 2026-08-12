import { useState } from "react";
import { Check, Copy, KeyRound, RefreshCw, ShieldAlert, Bell } from "lucide-react";
import { regenerateSV2, type CoinSV2 } from "@/lib/forge-api";

function resolveColor(c: string): string {
  if (!c.startsWith("var(")) return c;
  const name = c.slice(4, -1).trim();
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || "#00e5ff";
}

type RegenStage = "confirm" | "running" | "done" | "error";

export function SettingsPanel({
  coins,
  refresh,
}: {
  coins: CoinSV2[] | null;
  refresh: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [regen, setRegen] = useState<CoinSV2 | null>(null);
  const [stage, setStage] = useState<RegenStage>("confirm");
  const [newPubkey, setNewPubkey] = useState<string>("");
  const [errText, setErrText] = useState<string>("");

  const copy = (text: string, id: string) => {
    if (!text || !navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    }).catch(() => {});
  };

  const openRegen = (coin: CoinSV2) => {
    setRegen(coin);
    setStage("confirm");
    setNewPubkey("");
    setErrText("");
  };

  const closeRegen = () => {
    setRegen(null);
    setStage("confirm");
    setNewPubkey("");
    setErrText("");
  };

  const doRegen = async () => {
    if (!regen) return;
    setStage("running");
    const res = await regenerateSV2(regen.coinId);
    if (!res.success || !res.pubkey) {
      setErrText("Regeneration failed. The coin may not have reloaded. Check engine logs.");
      setStage("error");
      return;
    }
    setNewPubkey(res.pubkey);
    setStage("done");
    refresh(); // refresh the shell-owned list so the new key shows everywhere
  };

  return (
    <>
      <div className="mx-auto w-full max-w-3xl space-y-4">
        {/* SV2 Security & Keys */}
        <section className="panel-neon animate-rise flex flex-col p-6">
          <header className="flex items-center gap-3">
            <KeyRound className="size-4 text-neon-cyan" />
            <h2 className="text-xs font-semibold tracking-[0.26em] text-neon-cyan uppercase">
              SV2 Security &amp; Keys
            </h2>
          </header>
          <p className="mt-3 text-sm leading-relaxed text-foreground/90">
            One authority keypair per coin. Its public key is what miners paste into their
            {" "}<span className="font-mono text-[0.78rem] text-neon-cyan">sv2_auth_pk</span>{" "}
            field to verify server identity. Private keys never leave the server.
          </p>

          <div className="mt-5 space-y-3">
            {coins === null ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <span className="size-2 rounded-full bg-neon-cyan" style={{ animation: "pulse-glow 2s ease-in-out infinite" }} />
                Loading keys...
              </div>
            ) : coins.length === 0 ? (
              <div className="py-6 text-sm text-muted-foreground">No coins installed.</div>
            ) : (
              coins.map((coin) => {
                const col = resolveColor(coin.color);
                const isCopied = copied === coin.coinId;
                return (
                  <div key={coin.coinId} className="rounded-xl border border-border/70 bg-secondary/25 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-bold" style={{ color: col }}>{coin.ticker}</span>
                        <span
                          className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.62rem] font-semibold"
                          style={{
                            background: coin.enabled ? "color-mix(in oklab, var(--neon-green) 12%, transparent)" : "rgba(255,0,128,0.1)",
                            color: coin.enabled ? "var(--neon-green)" : "#ff0080",
                          }}
                        >
                          <span className="size-1.5 rounded-full" style={{ background: "currentColor" }} />
                          {coin.enabled ? "SV2 Enabled" : "SV2 Disabled"}
                        </span>
                        {coin.port && <span className="font-mono text-[0.65rem] text-foreground/90">port: {coin.port}</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => openRegen(coin)}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.7rem] font-semibold transition-colors"
                        style={{ background: "rgba(255,0,128,0.08)", border: "1px solid rgba(255,0,128,0.4)", color: "#ff0080" }}
                      >
                        <RefreshCw className="size-3" />
                        Regenerate
                      </button>
                    </div>

                    {coin.authorityPubkey ? (
                      <div className="mt-3">
                        <div className="mb-1 text-[0.6rem] tracking-wide text-foreground/90 uppercase">Authority Public Key</div>
                        <button
                          type="button"
                          onClick={() => copy(coin.authorityPubkey, coin.coinId)}
                          title="Click to copy"
                          className="group flex w-full items-start gap-2 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 text-left"
                        >
                          <span className="flex-1 font-mono text-[0.7rem] break-all" style={{ color: "var(--neon-green)" }}>
                            {coin.authorityPubkey}
                          </span>
                          {isCopied ? (
                            <Check className="mt-0.5 size-3.5 shrink-0 text-neon-green" />
                          ) : (
                            <Copy className="mt-0.5 size-3.5 shrink-0 text-muted-foreground group-hover:text-neon-cyan" />
                          )}
                        </button>
                        <div className="mt-1 text-[0.6rem] text-foreground/90">
                          {isCopied ? "Copied!" : "Click to copy · paste into the miner's sv2_auth_pk field"}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 text-[0.72rem] text-muted-foreground">Authority key not generated.</div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Notifications (placeholder) */}
        <section className="panel-neon flex flex-col p-6 opacity-80">
          <header className="flex items-center gap-3">
            <Bell className="size-4 text-neon-violet" />
            <h2 className="text-xs font-semibold tracking-[0.26em] text-neon-violet uppercase">
              Notifications
            </h2>
          </header>
          <p className="mt-3 text-sm text-foreground/90">
            Email and Telegram alerts for pool events (blocks found, worker offline, engine restarts).
          </p>
          <div className="mt-4 inline-flex w-fit items-center gap-2 rounded-lg border border-border/60 px-3 py-1.5 text-[0.7rem] text-foreground/90">
            <span className="size-1.5 rounded-full bg-neon-violet" />
            Coming soon
          </div>
        </section>
      </div>

      {/* Regenerate confirmation modal */}
      {regen && (
        <div
          className="fixed inset-0 z-[4000] flex items-center justify-center p-5"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onMouseDown={(e) => { if (e.target === e.currentTarget && stage !== "running") closeRegen(); }}
        >
          <div
            className="relative w-full max-w-[460px] overflow-hidden rounded-[20px] bg-[#02050d]"
            style={{ border: "1px solid rgba(168,85,247,0.2)", boxShadow: "0 24px 80px rgba(0,0,0,0.8)" }}
          >
            <div
              className="absolute top-0 right-10 left-10 h-0.5"
              style={{ background: "linear-gradient(90deg, transparent, #a855f7, #00e5ff, transparent)" }}
            />
            <div className="flex items-center justify-between px-6 pt-5 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <div className="text-[0.65rem] tracking-wide text-foreground uppercase">{regen.ticker} · SV2 Authority Key</div>
                <div className="text-lg font-bold" style={{ color: "#ff0080" }}>Regenerate key</div>
              </div>
              {stage !== "running" && (
                <button
                  type="button"
                  onClick={closeRegen}
                  className="flex size-8 items-center justify-center rounded-lg text-lg leading-none"
                  style={{ background: "rgba(255,0,128,0.08)", border: "1px solid rgba(255,0,128,0.5)", color: "#ff0080", boxShadow: "0 0 8px rgba(255,0,128,0.2), 0 0 16px rgba(255,0,128,0.08)" }}
                >
                  ×
                </button>
              )}
            </div>

            <div className="px-6 py-6">
              {stage === "confirm" && (
                <>
                  <div className="flex items-start gap-3 rounded-xl border p-3" style={{ borderColor: "rgba(255,0,128,0.3)", background: "rgba(255,0,128,0.05)" }}>
                    <ShieldAlert className="mt-0.5 size-5 shrink-0" style={{ color: "#ff0080" }} />
                    <div className="text-[0.8rem] leading-relaxed text-foreground/90">
                      <p className="mb-2 font-semibold" style={{ color: "#ff0080" }}>This is disruptive and cannot be undone.</p>
                      <p className="mb-2">Regenerating the SV2 authority key for <span className="font-semibold">{regen.ticker}</span> will:</p>
                      <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                        <li>Invalidate the current key. Every {regen.ticker} miner must update its
                          {" "}<span className="font-mono text-neon-cyan">sv2_auth_pk</span>{" "}
                          to the new key or it will fail to connect.</li>
                        <li>Briefly restart the {regen.ticker} coin (mining pauses a few seconds).</li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={doRegen}
                      className="flex-1 rounded-[10px] py-2.5 text-sm font-semibold"
                      style={{ background: "rgba(255,0,128,0.1)", border: "1px solid rgba(255,0,128,0.5)", color: "#ff0080" }}
                    >
                      Regenerate key
                    </button>
                    <button
                      type="button"
                      onClick={closeRegen}
                      className="rounded-[10px] border px-5 py-2.5 text-sm text-foreground"
                      style={{ borderColor: "color-mix(in oklab, var(--border) 90%, transparent)" }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}

              {stage === "running" && (
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <span className="size-8 rounded-full border-2" style={{ borderColor: "#ff0080", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                  <p className="text-sm font-medium" style={{ color: "#ff0080" }}>Regenerating &amp; reloading {regen.ticker}...</p>
                  <p className="text-[0.7rem] text-muted-foreground">The coin is restarting to load the new key.</p>
                </div>
              )}

              {stage === "done" && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2" style={{ color: "var(--neon-green)" }}>
                    <Check className="size-5" />
                    <p className="text-sm font-semibold">New key generated and loaded.</p>
                  </div>
                  <div>
                    <div className="mb-1 text-[0.6rem] tracking-wide text-muted-foreground uppercase">New Authority Public Key</div>
                    <button
                      type="button"
                      onClick={() => copy(newPubkey, "regen-new")}
                      className="group flex w-full items-start gap-2 rounded-lg border border-border/50 bg-[#01030a] px-3 py-2 text-left"
                    >
                      <span className="flex-1 font-mono text-[0.72rem] break-all" style={{ color: "var(--neon-green)" }}>{newPubkey}</span>
                      {copied === "regen-new" ? <Check className="mt-0.5 size-3.5 shrink-0 text-neon-green" /> : <Copy className="mt-0.5 size-3.5 shrink-0 text-muted-foreground group-hover:text-neon-cyan" />}
                    </button>
                  </div>
                  <p className="rounded-lg px-3 py-2 text-[0.72rem]" style={{ background: "rgba(255,154,31,0.08)", color: "var(--neon-gold)" }}>
                    Update every {regen.ticker} miner's <span className="font-mono">sv2_auth_pk</span> to this new key now, or they will fail to connect.
                  </p>
                  <button
                    type="button"
                    onClick={closeRegen}
                    className="self-end rounded-[10px] border px-6 py-2 text-sm text-muted-foreground"
                    style={{ borderColor: "color-mix(in oklab, var(--border) 90%, transparent)" }}
                  >
                    Done
                  </button>
                </div>
              )}

              {stage === "error" && (
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <span className="flex size-9 items-center justify-center rounded-full text-lg" style={{ background: "rgba(255,0,128,0.12)", color: "#ff0080" }}>!</span>
                  <p className="text-sm font-medium" style={{ color: "#ff0080" }}>{errText}</p>
                  <button
                    type="button"
                    onClick={closeRegen}
                    className="rounded-[10px] border px-6 py-2 text-sm text-muted-foreground"
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

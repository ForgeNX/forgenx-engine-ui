import { useState } from "react";
import { Timer } from "lucide-react";
import { setMeshInterval, type MeshStatus } from "@/lib/forge-api";

// Rotation splits a miner's time between coins. Worth being plain that this
// divides its expected blocks rather than adding to them — it is a way to be paid
// in more than one coin, not a way to find more — because the intuitive reading
// is the opposite and someone choosing it should know what they are choosing.
//
// The cycle length is mesh-wide: every rotating miner shares it. Per-miner
// cadences would be a lot of machinery for a distinction few would want.
//
// Cadences are long on purpose. A switch can only be made cleanly when the coin
// being moved to sends a job, and a coin that does so only on new blocks may be
// quiet for minutes — so every switch risks losing the work in flight. Switching
// twice a day serves a payout preference as well as switching every few minutes,
// with a fraction of the disturbance.
const CHOICES = [
  { value: "1h", label: "1 hour" },
  { value: "2h", label: "2 hours" },
  { value: "4h", label: "4 hours" },
  { value: "6h", label: "6 hours" },
  { value: "12h", label: "12 hours" },
  { value: "24h", label: "24 hours" },
];

export function MeshRotation({
  mesh,
  refresh,
}: {
  mesh: MeshStatus | null;
  refresh: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const current = mesh?.rotate_interval || "6h";
  const rotating = (mesh?.miners ?? []).filter(
    (m) => m.assignment.includes(",") && m.assigned,
  );

  const choose = async (value: string) => {
    setBusy(true);
    const res = await setMeshInterval(value);
    setNote(res.note);
    setTimeout(() => setNote(""), 6000);
    setBusy(false);
    refresh();
  };

  return (
    <section className="panel-neon animate-rise flex flex-col p-5">
      <header className="flex items-center gap-3">
        <Timer className="size-4 text-neon-cyan" />
        <h2 className="text-xs font-semibold tracking-[0.26em] text-neon-cyan uppercase">Node Rotation</h2>
      </header>

      <p className="mt-3 text-sm leading-relaxed text-foreground/90">
        Miners that are not allocated to the Fleet Balance rotate between nodes. A miner split across nodes spends a share of each cycle on one, then moves to the next. This is how long a full cycle takes. Example. If Node Rotation is set to 2 hours, and you set a miner to 50% node 1 and 50% node 2, it will spend 1 hour mining to node 1 and then 1 hour mining to node 2.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {CHOICES.map((c) => {
          const on = current === c.value;
          return (
            <button
              key={c.value}
              type="button"
              disabled={busy}
              onClick={() => choose(c.value)}
              className="rounded-lg border px-3 py-1.5 text-[0.75rem] font-semibold transition disabled:opacity-40"
              style={{
                borderColor: on ? "var(--neon-cyan)" : "var(--border)",
                color: on ? "var(--neon-cyan)" : "var(--foreground)",
                background: on ? "color-mix(in oklab, var(--neon-cyan) 10%, transparent)" : "transparent",
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-[0.7rem] leading-relaxed text-foreground">
        <span className="text-neon-cyan">ⓘ Note:</span> Splitting a miner divides the blocks it can
        expect between those nodes rather than adding to them. It is a way to be paid in more than one
        coin, not a way to find more.
      </p>

      {rotating.length > 0 && (
        <div className="mt-4 border-t border-border/60 pt-3">
          <p className="text-[0.6rem] tracking-[0.18em] text-muted-foreground uppercase">Rotating now</p>
          {rotating.map((m) => (
            <p key={m.worker} className="mt-1.5 text-[0.75rem] text-foreground/90">
              {m.worker}
              <span className="ml-2 text-muted-foreground">{m.assignment.replace(/,/g, " / ")}</span>
            </p>
          ))}
        </div>
      )}

      {note && <p className="mt-3 text-[0.7rem] text-muted-foreground">{note}</p>}
    </section>
  );
}

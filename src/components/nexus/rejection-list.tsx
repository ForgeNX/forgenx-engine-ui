import { useEffect, useState } from "react";
import { fetchRejectionsFor, type Rejection } from "@/lib/forge-api";

// The recent shares the pool refused for one miner, and why. Opened from the
// share counts on a miner's pill - a count on its own says something went wrong,
// where the reason says what.
export function RejectionList({ worker }: { worker: string }) {
  const [list, setList] = useState<Rejection[] | null>(null);

  // Read on opening and kept current while open, asking only for this miner's
  // shares. A failed read keeps what is already shown.
  useEffect(() => {
    let live = true;
    const load = async () => {
      const next = await fetchRejectionsFor(worker);
      if (live && next) setList(next);
    };
    load();
    const t = setInterval(load, 15_000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [worker]);

  if (list === null) return <p className="mt-2 text-[0.68rem] text-muted-foreground">Reading…</p>;
  if (list.length === 0) {
    return <p className="mt-2 text-[0.68rem] text-muted-foreground">No refused shares on record.</p>;
  }

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {[...list].reverse().map((r, i) => (
        <div key={`${r.at}-${i}`} className="rounded-md border border-border/60 px-2 py-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[0.68rem] font-semibold" style={{ color: "var(--neon-gold)" }}>
              {r.reason}
            </span>
            <span className="font-mono text-[0.6rem] text-muted-foreground">
              {r.coin} · {new Date(r.at).toLocaleTimeString()}
            </span>
          </div>
          <p className="mt-0.5 text-[0.65rem] text-foreground/90">{r.detail}</p>
        </div>
      ))}
    </div>
  );
}

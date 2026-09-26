import { useState } from "react";
import { Trophy, X } from "lucide-react";
import { ShineBorder } from "./shine-border";
import { timeAgo } from "./format";
import type { FoundBlock } from "@/lib/forge-api";
import type { ForgeApp } from "./nexus-data";

// A found block is the event solo mining exists for, so it is announced rather
// than left as a counter ticking up. The banner stays until dismissed, and a
// dismissal is remembered in this browser so it does not return on reload.
const SEEN_KEY = "forgenx.nexus.seenBlocks";

const keyOf = (b: FoundBlock) => `${b.coin}:${b.height}`;

function readSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeSeen(seen: Set<string>) {
  try {
    // Only the most recent keys are kept; old blocks never come back.
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-200)));
  } catch {
    // Storage unavailable: the dismissal still holds until the page reloads.
  }
}

export function FoundBlockBanner({ apps, blocks }: { apps: ForgeApp[]; blocks: FoundBlock[] }) {
  const [seen, setSeen] = useState<Set<string>>(readSeen);
  const unseen = blocks.filter((b) => !seen.has(keyOf(b)));
  if (unseen.length === 0) return null;

  const latest = unseen[0];
  const app = apps.find((a) => a.id.toUpperCase() === latest.coin.toUpperCase());
  const colour = app?.color ?? "var(--neon-green)";

  const dismiss = () => {
    const next = new Set(seen);
    for (const b of unseen) next.add(keyOf(b));
    writeSeen(next);
    setSeen(next);
  };

  return (
    <div
      role="status"
      className="relative overflow-hidden rounded-xl border p-4"
      style={{
        borderColor: "color-mix(in oklab, var(--neon-green) 60%, transparent)",
        background: "color-mix(in oklab, var(--neon-green) 8%, transparent)",
        boxShadow: "0 0 28px -10px var(--neon-green)",
      }}
    >
      <ShineBorder borderWidth={1.5} duration={8} shineColor={["var(--neon-green)", "var(--neon-gold)", colour]} />
      <div className="flex items-start gap-3">
        <Trophy className="mt-0.5 size-5 shrink-0" style={{ color: "var(--neon-gold)" }} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold tracking-wide" style={{ color: "var(--neon-green)" }}>
            Block found!
          </p>
          <p className="mt-0.5 font-mono text-[0.75rem] text-foreground">
            <span className="font-semibold">{latest.worker}</span> found a{" "}
            <span className="font-semibold" style={{ color: colour }}>
              {app?.ticker ?? latest.coin}
            </span>{" "}
            block, height {latest.height.toLocaleString()}
            <span className="text-foreground/90"> · {timeAgo(latest.at)}</span>
          </p>
          {unseen.length > 1 && (
            <p className="mt-0.5 font-mono text-[0.68rem] text-foreground/90">
              and {unseen.length - 1} more this session
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss block notice"
          className="shrink-0 rounded-md p-1 text-foreground/90 transition hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, RefreshCw, Search } from "lucide-react";
import { fetchEngineLogs } from "@/lib/forge-api";

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG" | "OTHER";

type ParsedLine = {
  raw: string;
  ts: string | null;
  source: string | null;
  level: LogLevel;
  tag: string | null;
  message: string;
};

const LEVEL_COLOR: Record<LogLevel, string> = {
  INFO: "var(--neon-cyan)",
  WARN: "var(--neon-gold)",
  ERROR: "var(--neon-pink)",
  DEBUG: "var(--neon-violet)",
  OTHER: "var(--muted-foreground)",
};

const ALL_LEVELS: LogLevel[] = ["INFO", "WARN", "ERROR", "DEBUG"];
const TAIL_OPTIONS = [100, 250, 500, 1000, 2000, 5000];

const LINE_RE =
  /^\[([^\]]+)\]\s*\[([^\]]+)\]\s*\[([A-Z]+)\]\s*(?:\[([^\]]+)\]\s*)?(.*)$/;

function parseLine(raw: string): ParsedLine {
  const m = raw.match(LINE_RE);
  if (!m) {
    return { raw, ts: null, source: null, level: "OTHER", tag: null, message: raw };
  }
  const lvl = m[3] as LogLevel;
  const level: LogLevel = ALL_LEVELS.includes(lvl) ? lvl : "OTHER";
  return { raw, ts: m[1], source: m[2], level, tag: m[4] ?? null, message: m[5] };
}

export function LogsPanel() {
  const [raw, setRaw] = useState<string>("Loading logs…");
  const [tail, setTail] = useState<number>(500);
  const [live, setLive] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [hidden, setHidden] = useState<Set<LogLevel>>(new Set());
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());

  const rawRef = useRef<string>("");
  const liveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [stickBottom, setStickBottom] = useState<boolean>(true);
  const programmaticScroll = useRef<boolean>(false);

  const load = async (silent = false) => {
    if (!silent) setRaw("Loading…");
    try {
      const text = await fetchEngineLogs(tail);
      setRaw(text);
      rawRef.current = text;
    } catch {
      setRaw("Could not connect to log API.");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tail]);

  useEffect(() => {
    if (live) {
      load(true);
      liveRef.current = setInterval(() => load(true), 2000);
    } else if (liveRef.current) {
      clearInterval(liveRef.current);
      liveRef.current = null;
    }
    return () => {
      if (liveRef.current) clearInterval(liveRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, tail]);

  // When the user scrolls up (paused), freeze the displayed text so incoming
  // poll data doesn't shift lines through the viewport. Resume on return to bottom.
  const frozenRaw = useRef<string>("");
  const displayRaw = stickBottom ? raw : frozenRaw.current || raw;
  useEffect(() => {
    if (stickBottom) frozenRaw.current = raw;
  }, [raw, stickBottom]);
  useEffect(() => {
    // Capture the moment we pause, so we hold exactly what was on screen.
    if (!stickBottom) frozenRaw.current = frozenRaw.current || raw;
  }, [stickBottom, raw]);

  const lines = useMemo(() => {
    if (!displayRaw) return [];
    return displayRaw.split("\n").filter((l) => l.length > 0).map(parseLine);
  }, [displayRaw]);

  const availableTags = useMemo(() => {
    const s = new Set<string>();
    for (const l of lines) if (l.tag) s.add(l.tag);
    return Array.from(s).sort();
  }, [lines]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return lines.filter((l) => {
      if (hidden.has(l.level)) return false;
      if (activeTags.size > 0 && (!l.tag || !activeTags.has(l.tag))) return false;
      if (q && !l.raw.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [lines, hidden, activeTags, search]);

  useEffect(() => {
    const el = bodyRef.current;
    if (el && stickBottom) {
      programmaticScroll.current = true;
      el.scrollTop = el.scrollHeight;
    }
  }, [filtered, stickBottom]);

  const onScroll = () => {
    const el = bodyRef.current;
    if (!el) return;
    // Ignore the scroll event caused by our own auto-scroll-to-bottom.
    if (programmaticScroll.current) {
      programmaticScroll.current = false;
      return;
    }
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (atBottom) frozenRaw.current = "";
    setStickBottom(atBottom);
  };

  const toggleLevel = (lvl: LogLevel) =>
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(lvl) ? next.delete(lvl) : next.add(lvl);
      return next;
    });

  const toggleTag = (tag: string) =>
    setActiveTags((prev) => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });

  const copyLogs = () => {
    const text = rawRef.current || raw;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  const jumpToBottom = () => {
    const el = bodyRef.current;
    if (el) {
      frozenRaw.current = "";
      setStickBottom(true);
      programmaticScroll.current = true;
      el.scrollTop = el.scrollHeight;
    }
  };

  return (
    <section className="panel-neon animate-rise flex h-full flex-col p-5">
      <header className="flex flex-wrap items-center gap-3">
        <span
          className="h-4 w-1 rounded-full animate-pulse-glow"
          style={{ background: "var(--neon-cyan)", boxShadow: "0 0 12px var(--neon-cyan)" }}
        />
        <h2 className="text-xs font-semibold tracking-[0.26em] text-neon-cyan uppercase">
          Engine logs
        </h2>
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[0.7rem] text-foreground/85">
            Tail
            <select
              value={tail}
              onChange={(e) => setTail(Number(e.target.value))}
              className="rounded-md border border-border/70 bg-transparent px-1.5 py-1 text-[0.7rem] text-foreground outline-none"
            >
              {TAIL_OPTIONS.map((n) => (
                <option key={n} value={n} className="bg-[#02050d]">
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setLive((v) => !v)}
            className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[0.7rem] font-semibold transition-colors"
            style={{
              borderColor: live
                ? "color-mix(in oklab, var(--neon-green) 55%, transparent)"
                : "color-mix(in oklab, var(--border) 90%, transparent)",
              background: live ? "color-mix(in oklab, var(--neon-green) 12%, transparent)" : "transparent",
              color: live ? "var(--neon-green)" : "var(--foreground)",
            }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{
                background: live ? "var(--neon-green)" : "var(--muted-foreground)",
                boxShadow: live ? "0 0 8px var(--neon-green)" : undefined,
                animation: live ? "pulse-glow 2s ease-in-out infinite" : undefined,
              }}
            />
            Live
          </button>
          <button
            type="button"
            onClick={() => load()}
            disabled={live}
            className="flex items-center gap-1.5 rounded-md border border-border/70 px-2.5 py-1 text-[0.7rem] text-foreground/85 transition-colors hover:text-neon-cyan disabled:opacity-40"
          >
            <RefreshCw className="size-3" />
            Refresh
          </button>
          <button
            type="button"
            onClick={copyLogs}
            className="flex items-center gap-1.5 rounded-md border border-border/70 px-2.5 py-1 text-[0.7rem] text-foreground/85 transition-colors hover:text-neon-cyan"
          >
            <Copy className="size-3" />
            Copy
          </button>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {ALL_LEVELS.map((lvl) => {
          const on = !hidden.has(lvl);
          const color = LEVEL_COLOR[lvl];
          return (
            <button
              key={lvl}
              type="button"
              onClick={() => toggleLevel(lvl)}
              className="rounded-md border px-2 py-1 text-[0.65rem] font-semibold tracking-wide transition-all"
              style={{
                borderColor: on ? `color-mix(in oklab, ${color} 55%, transparent)` : "color-mix(in oklab, var(--border) 80%, transparent)",
                background: on ? `color-mix(in oklab, ${color} 12%, transparent)` : "transparent",
                color: on ? color : "var(--muted-foreground)",
                opacity: on ? 1 : 0.5,
              }}
            >
              {lvl}
            </button>
          );
        })}

        <div className="relative ml-2 flex-1 min-w-[160px]">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2 text-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs…"
            className="w-full rounded-md border border-border/70 bg-transparent py-1 pr-2 pl-7 text-[0.72rem] text-foreground outline-none placeholder:text-foreground/90 focus:border-neon-cyan"
          />
        </div>
      </div>

      {availableTags.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[0.6rem] tracking-wide text-foreground/85 uppercase">Tags</span>
          {availableTags.map((tag) => {
            const on = activeTags.has(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className="rounded-full border px-2 py-0.5 font-mono text-[0.62rem] transition-all"
                style={{
                  borderColor: on ? "color-mix(in oklab, var(--neon-cyan) 55%, transparent)" : "color-mix(in oklab, var(--border) 80%, transparent)",
                  background: on ? "color-mix(in oklab, var(--neon-cyan) 12%, transparent)" : "transparent",
                  color: on ? "var(--neon-cyan)" : "var(--foreground)",
                }}
              >
                {tag}
              </button>
            );
          })}
          {activeTags.size > 0 && (
            <button
              type="button"
              onClick={() => setActiveTags(new Set())}
              className="text-[0.6rem] text-muted-foreground underline underline-offset-2 hover:text-neon-pink"
            >
              clear
            </button>
          )}
        </div>
      )}

      <div className="relative mt-3 min-h-0 flex-1">
        <div
          ref={bodyRef}
          onScroll={onScroll}
          className="h-full overflow-auto rounded-xl border border-border/60 bg-[#01030a] p-3"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {filtered.length === 0 ? (
            <div className="text-[0.72rem] text-muted-foreground">No matching log lines.</div>
          ) : (
            filtered.map((l, i) => (
              <div
                key={l.raw + "\u0000" + i}
                className="flex gap-2 py-0.5 text-[0.72rem] leading-relaxed"
                style={{ borderBottom: "1px solid color-mix(in oklab, var(--border) 30%, transparent)" }}
              >
                {l.ts && <span className="shrink-0 text-muted-foreground/70">{l.ts}</span>}
                <span
                  className="shrink-0 font-semibold"
                  style={{ color: LEVEL_COLOR[l.level], minWidth: "44px" }}
                >
                  {l.level === "OTHER" ? "" : l.level}
                </span>
                {l.tag && (
                  <span
                    className="shrink-0 rounded px-1 text-[0.62rem]"
                    style={{
                      background: "color-mix(in oklab, var(--neon-cyan) 10%, transparent)",
                      color: "color-mix(in oklab, var(--neon-cyan) 80%, white)",
                    }}
                  >
                    {l.tag}
                  </span>
                )}
                <span className="break-all text-foreground/90">{l.message}</span>
              </div>
            ))
          )}
        </div>

        {!stickBottom && (
          <button
            type="button"
            onClick={jumpToBottom}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-neon-cyan/50 bg-[#02050d] px-3 py-1 text-[0.65rem] font-semibold text-neon-cyan shadow-lg"
          >
            ↓ Jump to latest
          </button>
        )}
      </div>

      <div className="mt-2 text-right text-[0.72rem] text-foreground/85">
        {filtered.length} of {lines.length} lines
      </div>
    </section>
  );
}

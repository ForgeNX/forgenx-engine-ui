import { Boxes, Clock, GitBranch, Hash, Layers, Server, Tag, User } from "lucide-react";
import { type EngineInfo } from "@/lib/forge-api";

function formatUptime(sec: number): string {
  if (!sec || sec <= 0) return "\u2014";
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const parts: string[] = [];
  if (d) parts.push(`${d} ${d === 1 ? "day" : "days"}`);
  if (h || d) parts.push(`${h}hr`);
  parts.push(`${m}min`);
  return parts.join(" ");
}

function formatBuildDate(iso: string): string {
  if (!iso) return "\u2014";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  // Compose "time, date" with the time first. Each part is locale-aware:
  // the browser decides 12/24hr for the time and month/day style for the date,
  // and both render in the user's local timezone. undefined = user's own locale.
  const time = dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const date = dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  return `${time}, ${date}`;
}

type Row = { label: string; value: string; icon: typeof Tag; mono?: boolean; link?: boolean };

export function InformationPanel({
  coinCount,
  info,
  uptime,
}: {
  coinCount: number;
  info: EngineInfo | null;
  uptime: number;
}) {

  if (!info) {
    return (
      <div className="mx-auto flex min-h-[300px] w-full max-w-3xl items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="size-2 rounded-full bg-neon-cyan" style={{ animation: "pulse-glow 2s ease-in-out infinite" }} />
          <p className="text-sm text-muted-foreground">Loading engine information...</p>
        </div>
      </div>
    );
  }

  const rows: Row[] = [
    { label: "Version", value: info.version || "\u2014", icon: Tag, mono: true },
    { label: "Build date", value: formatBuildDate(info.build_date), icon: Clock },
    { label: "Developer", value: info.developer || "\u2014", icon: User },
    { label: "Category", value: info.category ? info.category.charAt(0).toUpperCase() + info.category.slice(1) : "\u2014", icon: GitBranch },
    { label: "Pool name", value: info.pool_name || "\u2014", icon: Server, mono: true },
    { label: "Uptime", value: formatUptime(uptime), icon: Clock },
    { label: "Coins active", value: String(coinCount), icon: Boxes },
  ];
  if (info.website) rows.push({ label: "Website", value: info.website, icon: Layers, link: true });
  if (info.support) rows.push({ label: "Support", value: info.support, icon: Hash, link: true });

  return (
    <div className="mx-auto w-full max-w-3xl">
      <section className="panel-neon animate-rise flex flex-col p-6">
        <header className="flex items-center gap-4">
          <span
            className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-neon-cyan/40"
            style={{ boxShadow: "0 0 28px -8px var(--neon-cyan)" }}
          >
            <img
              src="/Engine.png"
              alt="ForgeNX Engine"
              className="size-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold tracking-[0.06em]">{info.name}</h2>
            <p className="mt-1 text-sm text-foreground/90">{info.description}</p>
          </div>
        </header>

        <div className="mt-6 rounded-xl border border-border/70 bg-secondary/25">
          {rows.map((r, i) => {
            const Icon = r.icon;
            return (
              <div
                key={r.label}
                className="flex items-center justify-between gap-4 px-4 py-3"
                style={{ borderTop: i === 0 ? "none" : "1px solid color-mix(in oklab, var(--border) 40%, transparent)" }}
              >
                <span className="flex items-center gap-2 text-xs tracking-wide text-foreground/90 uppercase">
                  <Icon className="size-3.5 text-neon-cyan" />
                  {r.label}
                </span>
                {r.link ? (
                  <a href={r.value} target="_blank" rel="noreferrer" className="truncate text-sm text-neon-cyan hover:underline" style={{ maxWidth: "62%" }}>
                    {r.value}
                  </a>
                ) : (
                  <span className="truncate text-right text-sm font-semibold text-foreground/90" style={{ maxWidth: "62%", fontFamily: r.mono ? "var(--font-mono)" : undefined }}>
                    {r.value}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-center text-[0.75rem] text-foreground/90">
          Engine self-reported &middot; portable across ForgeNX, Umbrel, and standalone installs
        </p>
      </section>
    </div>
  );
}

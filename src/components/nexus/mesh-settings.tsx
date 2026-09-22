import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  fetchFoundMiners,
  fetchMeshSettings,
  saveMeshSettings,
  type FoundMiner,
  type MeshSettings as Settings,
} from "@/lib/forge-api";

// Mesh-wide settings. The miner network is what lets the engine find miners on
// the LAN and read their own hashrate and temperatures — it can't discover the
// LAN for itself from inside its container, so the user names the range.
//
// The network saves on a button, since a half-typed address isn't worth
// validating; the toggle saves as soon as it is flipped.

type FoundSortKey = "name" | "hashrate" | "device" | "connection";

const FOUND_SORTS: { key: FoundSortKey; label: string; first: "asc" | "desc" }[] = [
  { key: "name", label: "Name", first: "asc" },
  { key: "hashrate", label: "Hashrate", first: "desc" },
  { key: "device", label: "Device", first: "asc" },
  { key: "connection", label: "Connection", first: "asc" },
];

// Connection order: mining through the mesh, then pointed at it but idle, then
// direct. Ties fall back to the name so equal miners keep their places.
function sortFound(list: FoundMiner[], spec: string): FoundMiner[] {
  const [key, dir] = spec.split(":");
  const sign = dir === "desc" ? -1 : 1;
  const byName = (a: FoundMiner, b: FoundMiner) =>
    a.worker.localeCompare(b.worker, undefined, { numeric: true, sensitivity: "base" });
  const rank = (f: FoundMiner) => (f.on_mesh ? 0 : f.points_at_mesh ? 1 : 2);
  const primary: Record<string, (a: FoundMiner, b: FoundMiner) => number> = {
    name: byName,
    hashrate: (a, b) => a.hashrate_ths - b.hashrate_ths,
    device: (a, b) => (a.model || "~").localeCompare(b.model || "~"),
    connection: (a, b) => rank(a) - rank(b),
  };
  const cmp = primary[key] ?? byName;
  return [...list].sort((a, b) => sign * cmp(a, b) || byName(a, b));
}

export function MeshSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);
  const [found, setFound] = useState<FoundMiner[]>([]);
  const [foundSort, setFoundSort] = useState("name:asc");
  const chooseFoundSort = (key: FoundSortKey, first: "asc" | "desc") => {
    const [cur, dir] = foundSort.split(":");
    const next = cur === key ? `${key}:${dir === "asc" ? "desc" : "asc"}` : `${key}:${first}`;
    setFoundSort(next);
    saveMeshSettings({ discovered_sort: next });
  };

  // The found list is only fetched while it is open.
  useEffect(() => {
    if (!open) return;
    let live = true;
    const load = async () => {
      const list = await fetchFoundMiners();
      if (live) setFound(list);
    };
    load();
    const t = setInterval(load, 30_000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [open]);

  const load = async () => {
    const s = await fetchMeshSettings();
    if (!s) return;
    setSettings(s);
    setStart(s.network_start);
    setEnd(s.network_end);
    if (s.discovered_sort) setFoundSort(s.discovered_sort);
  };

  useEffect(() => {
    load();
    // The miners-found count changes as the scanner sweeps, so refresh it
    // occasionally rather than only on load.
    const t = setInterval(async () => {
      const s = await fetchMeshSettings();
      if (s) setSettings((prev) => (prev ? { ...prev, miners_found: s.miners_found } : s));
    }, 30_000);
    return () => clearInterval(t);
  }, []);

  const dirty = settings !== null && (start !== settings.network_start || end !== settings.network_end);

  const saveNetwork = async () => {
    setBusy(true);
    setError("");
    const res = await saveMeshSettings({ network_start: start.trim(), network_end: end.trim() });
    setBusy(false);
    if (!res.ok || !res.settings) {
      setError(res.error ?? "could not save");
      return;
    }
    setSettings(res.settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    // A new range triggers a sweep; the count settles within a minute.
    setTimeout(load, 45_000);
  };

  const toggleIncludeNew = async () => {
    if (!settings) return;
    const next = !settings.include_new;
    setSettings({ ...settings, include_new: next });
    const res = await saveMeshSettings({ include_new: next });
    if (!res.ok || !res.settings) {
      setSettings({ ...settings, include_new: !next });
      setError(res.error ?? "could not save");
      return;
    }
    setSettings(res.settings);
  };

  const input =
    "w-full rounded-lg border border-border/70 bg-secondary/25 px-3 py-1.5 font-mono text-[0.8rem] text-foreground placeholder:text-muted-foreground/60 focus:border-neon-cyan focus:outline-none";

  return (
    <section className="panel-neon animate-rise flex flex-col p-5">
      <header className="flex items-center gap-3">
        <span
          className="h-4 w-1 animate-pulse-glow rounded-full"
          style={{ background: "var(--neon-cyan)", boxShadow: "0 0 12px var(--neon-cyan)" }}
        />
        <h2 className="text-xs font-semibold tracking-[0.26em] text-neon-cyan uppercase">Mesh settings</h2>
      </header>

      <div className="mt-4">
        <p className="text-[0.7rem] font-semibold tracking-[0.18em] text-foreground uppercase">Miner network</p>
        <p className="mt-1 text-[0.72rem] leading-relaxed text-foreground/90">
          Where to look for miners, so their own hashrate and temperatures can be read. A network such as
          192.168.1.0/24, or a start and end address.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input
            className={input}
            placeholder="192.168.1.0/24"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            aria-label="Network or start address"
          />
          <input
            className={input}
            placeholder="End (optional)"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            aria-label="End address (optional)"
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          {settings?.network_start ? (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="flex items-center gap-1 text-[0.7rem] font-semibold tracking-[0.18em] text-foreground uppercase transition hover:text-neon-cyan"
            >
              {settings.miners_found} Miner{settings.miners_found === 1 ? "" : "s"} Discovered
              <ChevronDown className={`size-3 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
          ) : (
            <span className="text-[0.7rem] text-foreground/90">Not set</span>
          )}
          <button
            type="button"
            disabled={busy || !dirty}
            onClick={saveNetwork}
            className="rounded-lg border px-3 py-1 text-[0.7rem] font-semibold transition disabled:opacity-40"
            style={{
              borderColor: dirty ? "var(--neon-cyan)" : "var(--border)",
              color: dirty ? "var(--neon-cyan)" : "var(--foreground)",
            }}
          >
            {saved ? "Saved" : busy ? "Saving…" : "Save"}
          </button>
        </div>
        {error && <p className="mt-2 text-[0.7rem] text-[#ff0080]">{error}</p>}
        {open && (
          <div className="mt-3 flex flex-col gap-2 border-t border-border/60 pt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[0.6rem] font-semibold tracking-[0.18em] text-foreground/90 uppercase">Sort</span>
              {FOUND_SORTS.map((o) => {
                const [cur, dir] = foundSort.split(":");
                const on = cur === o.key;
                return (
                  <button
                    key={o.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => chooseFoundSort(o.key, o.first)}
                    className="rounded-md border px-2 py-0.5 text-[0.65rem] font-semibold transition"
                    style={{
                      borderColor: on ? "var(--neon-cyan)" : "var(--border)",
                      color: on ? "var(--neon-cyan)" : "var(--foreground)",
                    }}
                  >
                    {o.label}
                    {on && (dir === "asc" ? " ↑" : " ↓")}
                  </button>
                );
              })}
            </div>
            {found.length === 0 && <p className="text-[0.7rem] text-foreground/90">Reading miners…</p>}
            {sortFound(found, foundSort).map((f) => {
              const badge = f.on_mesh
                ? { label: `Mesh · ${f.mesh_coin}`, color: "var(--neon-cyan)" }
                : f.points_at_mesh
                  ? { label: "Mesh · idle", color: "var(--neon-gold)" }
                  : { label: "Direct", color: "var(--muted-foreground)" };
              const temp = (t: number) => (t > 0 ? `${Math.round(t)}°` : "—");
              return (
                <div key={f.host} className="rounded-lg border border-border/60 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[0.75rem] font-semibold" style={{ color: f.on_mesh || f.points_at_mesh ? badge.color : "var(--foreground)" }}>
                      {f.worker}
                    </span>
                    <span
                      className="shrink-0 rounded-md border px-1.5 py-0.5 text-[0.6rem] font-semibold"
                      style={{ borderColor: badge.color, color: badge.color }}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-[0.65rem] text-foreground/90 whitespace-pre-wrap">
                    Device: {f.model || "unknown"}  -  IP: {f.host}
                  </p>
                  <p className="mt-0.5 font-mono text-[0.65rem] text-foreground/90 whitespace-pre-wrap">
                    <span className="text-neon-cyan">{f.hashrate_ths.toFixed(2)} TH/s</span>
                    {"  -  "}Asic: {temp(f.asic_temp)}
                    {f.asic_temp_max > 0 && ` / ${temp(f.asic_temp_max)} max`}
                    {"  -  "}VR: {temp(f.vr_temp)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
        <div className="min-w-0">
          <p className="text-[0.7rem] font-semibold tracking-[0.18em] text-foreground uppercase">
            Include new miners
          </p>
          <p className="mt-1 text-[0.72rem] leading-relaxed text-foreground/90">
            A newly connected miner is automatically allocated to the Fleet Balance and assigned work.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings?.include_new ?? false}
          aria-label="Include newly connected miners in Fleet Balance"
          disabled={!settings}
          onClick={toggleIncludeNew}
          className="relative h-5 w-9 shrink-0 rounded-full border transition disabled:opacity-40"
          style={{
            borderColor: settings?.include_new ? "var(--neon-cyan)" : "var(--border)",
            background: settings?.include_new
              ? "color-mix(in oklab, var(--neon-cyan) 25%, transparent)"
              : "var(--secondary)",
          }}
        >
          <span
            className="absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full transition-all"
            style={{
              left: settings?.include_new ? "calc(100% - 1.05rem)" : "0.15rem",
              background: settings?.include_new ? "var(--neon-cyan)" : "var(--muted-foreground)",
              boxShadow: settings?.include_new ? "0 0 8px var(--neon-cyan)" : undefined,
            }}
          />
        </button>
      </div>
    </section>
  );
}

import { useEffect, useState } from "react";
import { ChevronDown, RefreshCw, ScanLine } from "lucide-react";
import { MoveToMeshModal } from "./move-to-mesh-modal";
import {
  fetchFoundMiners,
  fetchMeshSettings,
  moveMinerToMesh,
  rescanMiners,
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
  // The worker name each discovered miner would take on the mesh. Held here while
  // the user decides: it is only needed at the moment a miner is moved across.
  const [renames, setRenames] = useState<Record<string, string>>({});
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  // Moving a miner writes to someone's hardware, so it asks first and says what
  // happened afterwards, per miner.
  const [confirming, setConfirming] = useState<string | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [moveNote, setMoveNote] = useState<Record<string, string>>({});
  const [scanning, setScanning] = useState(false);
  const rescan = async () => {
    setScanning(true);
    await rescanMiners();
    // A sweep takes a few seconds; give it time before reading the list back.
    setTimeout(async () => {
      const list = await fetchFoundMiners();
      setFound(list);
      const s2 = await fetchMeshSettings();
      if (s2) setSettings(s2);
      setScanning(false);
    }, 20_000);
  };

  const nameFor = (f: FoundMiner) =>
    settings?.auto_name ? settings.next_name : overrides[f.host] ? (renames[f.host] ?? "") : f.worker;

  const doMove = async (f: FoundMiner) => {
    const worker = nameFor(f).trim();
    setConfirming(null);
    setMoving(f.host);
    const res = await moveMinerToMesh(f.host, worker);
    if (res.ok) {
      // The engine reserves the name it was given, so reading settings now moves
      // next_name on before another miner can be moved with the same one.
      const now = await fetchMeshSettings();
      if (now) setSettings(now);
    }
    setMoving(null);
    setMoveNote((n) => ({ ...n, [f.host]: res.ok ? (res.note ?? "moved") : (res.error ?? "failed") }));
    if (res.ok) {
      // The miner restarts and reconnects; the list catches up on its own.
      setTimeout(async () => {
        const list = await fetchFoundMiners();
        setFound(list);
        const s2 = await fetchMeshSettings();
        if (s2) setSettings(s2);
      }, 75_000);
    }
  };
  const [prefix, setPrefix] = useState("");
  const [address, setAddress] = useState("");
  const [addressSaved, setAddressSaved] = useState(false);
  // A suggestion for the address field, never saved on its own. A loopback
  // hostname is no use to a miner, so it falls back to an example.
  const host = window.location.hostname;
  const suggestedAddress = /^(localhost|127\.|\[?::1\]?$)/.test(host) ? "192.168.1.10" : host;
  const saveAddress = async () => {
    // Leaving the field without changing it saves nothing.
    if (address.trim() === (settings?.mesh_address ?? "")) return;
    const res = await saveMeshSettings({ mesh_address: address.trim() });
    if (res.ok && res.settings) {
      setSettings(res.settings);
      setAddressSaved(true);
      setTimeout(() => setAddressSaved(false), 3000);
    }
    else setError(res.error ?? "could not save");
  };
  const savePrefix = async () => {
    const res = await saveMeshSettings({ name_prefix: prefix.trim() });
    if (res.ok && res.settings) setSettings(res.settings);
    else setError(res.error ?? "could not save");
  };
  const toggleAutoName = async () => {
    if (!settings) return;
    const next = !settings.auto_name;
    setSettings({ ...settings, auto_name: next });
    const res = await saveMeshSettings({ auto_name: next });
    if (res.ok && res.settings) setSettings(res.settings);
    else setSettings({ ...settings, auto_name: !next });
  };
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
    setPrefix(s.name_prefix ?? "");
    // Only ever what the engine has saved. The browser's hostname is offered as
    // the placeholder instead of filled in: over a tunnel it is "localhost", and
    // a miner pointed somewhere unreachable fails quietly.
    setAddress(s.mesh_address ?? "");
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
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            className={`${input} !w-auto`}
            size={Math.max(start.length, 14)}
            placeholder="192.168.1.0/24"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            aria-label="Network or start address"
          />
          <input
            className={`${input} !w-auto`}
            size={Math.max(end.length, 14)}
            placeholder="End (optional)"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            aria-label="End address (optional)"
          />
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
      {/* Two mesh-wide settings, side by side so their headings and toggles line up. */}
      <div className="mt-5 border-t border-border/60 pt-4">
        <p className="text-[0.7rem] font-semibold tracking-[0.18em] text-foreground uppercase">
          Mesh address for miners
        </p>
        <p className="mt-1 text-[0.72rem] leading-relaxed text-foreground/90">
          The address a miner is pointed at when you add it to the mesh. It must be one your miners
          can reach.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            className={`${input} !w-auto`}
            size={Math.max(address.length, suggestedAddress.length, 14)}
            placeholder={suggestedAddress}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onBlur={saveAddress}
            aria-label="Mesh address for miners"
          />
          {settings?.mesh_port ? (
            <span className="font-mono text-[0.85rem] text-neon-cyan">: {settings.mesh_port}</span>
          ) : null}
          {addressSaved && <span className="text-[0.65rem] text-muted-foreground">saved</span>}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-5 border-t border-border/60 pt-4">
        <div>
          <div className="flex items-start justify-between gap-3">
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
        </div>

        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.7rem] font-semibold tracking-[0.18em] text-foreground uppercase">
                Assign worker names
              </p>
              <p className="mt-1 text-[0.72rem] leading-relaxed text-foreground/90">
                A miner added to the mesh is given the next free name in sequence, built from this prefix.
              </p>
            </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings?.auto_name ?? false}
            aria-label="Assign worker names automatically"
            disabled={!settings}
            onClick={toggleAutoName}
            className="relative h-5 w-9 shrink-0 rounded-full border transition disabled:opacity-40"
            style={{
              borderColor: settings?.auto_name ? "var(--neon-cyan)" : "var(--border)",
              background: settings?.auto_name
                ? "color-mix(in oklab, var(--neon-cyan) 25%, transparent)"
                : "var(--secondary)",
            }}
          >
            <span
              className="absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full transition-all"
              style={{
                left: settings?.auto_name ? "calc(100% - 1.05rem)" : "0.15rem",
                background: settings?.auto_name ? "var(--neon-cyan)" : "var(--muted-foreground)",
                boxShadow: settings?.auto_name ? "0 0 8px var(--neon-cyan)" : undefined,
              }}
            />
          </button>
          </div>

          {settings?.auto_name && (
            <>
              <div className="mt-3 flex items-center gap-2">
                <input
                  className={input}
                  placeholder="Worker"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  onBlur={savePrefix}
                  aria-label="Worker name prefix"
                />
                {settings.next_name && (
                  <span className="shrink-0 font-mono text-[0.72rem] text-neon-cyan">
                    next: {settings.next_name}
                  </span>
                )}
              </div>
              <p className="mt-2 text-[0.68rem] leading-relaxed text-foreground">
                  <span style={{ color: "#e0115f" }}>⚠ Warning:</span> A miner added to the mesh will be
                  renamed to the next available name in the sequence, replacing the name it currently uses.
                </p>
            </>
          )}
        </div>
      </div>
      <div className="mt-5 border-t border-border/60 pt-4">
          <div className="mt-2 flex items-center justify-between gap-3">
            {settings?.network_start ? (
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className="flex items-center gap-2 text-xs font-semibold tracking-[0.26em] text-neon-cyan uppercase transition hover:brightness-125"
              >
                <ScanLine className="size-4" />
                <span>
                  <span className="text-sm" style={{ color: "var(--neon-pink)" }}>
                    {settings.miners_found}
                  </span>{" "}
                  Miner{settings.miners_found === 1 ? "" : "s"} Discovered
                </span>
                <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
            ) : (
              <span className="text-[0.7rem] text-foreground/90">Not set</span>
            )}
            {settings?.network_start && (
              <button
                type="button"
                onClick={rescan}
                disabled={scanning}
                title="Scan the network now"
                className="flex items-center gap-1.5 text-[0.75rem] font-semibold transition disabled:opacity-100"
                style={{ color: scanning ? "var(--neon-gold)" : "var(--neon-cyan)" }}
              >
                <RefreshCw className={`size-3.5 ${scanning ? "animate-spin" : ""}`} />
                {scanning ? "Scanning…" : "Rescan"}
              </button>
            )}
          </div>
          {settings?.network_start && (
            <p className="mt-1 text-[0.68rem] leading-relaxed text-foreground/90">
              Expand to see every miner found on your network, and whether each is on the mesh.
            </p>
          )}
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
                      Hashrate: <span className="text-neon-cyan">{f.hashrate_ths.toFixed(2)} TH/s</span>
                      {"  -  "}Asic: {temp(f.asic_temp)}
                      {f.asic_temp_max > 0 && ` / ${temp(f.asic_temp_max)} max`}
                      {"  -  "}VR: {temp(f.vr_temp)}
                    </p>
                    {!f.on_mesh && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="text-[0.65rem] text-foreground/90">Worker name:</span>
                        <input
                          className="w-40 rounded-md border border-border/70 bg-secondary/25 px-2 py-0.5 font-mono text-[0.65rem] text-foreground focus:border-neon-cyan focus:outline-none disabled:opacity-60"
                          value={
                            settings?.auto_name
                              ? settings.next_name
                              : overrides[f.host]
                                ? (renames[f.host] ?? "")
                                : f.worker
                          }
                          disabled={Boolean(settings?.auto_name) || !overrides[f.host]}
                          onChange={(e) => setRenames((r) => ({ ...r, [f.host]: e.target.value }))}
                          aria-label={`Worker name for ${f.worker}`}
                        />
                        {settings?.auto_name ? (
                          <span className="text-[0.62rem] text-muted-foreground">assigned automatically</span>
                        ) : (
                          <button
                            type="button"
                            role="switch"
                            aria-checked={Boolean(overrides[f.host])}
                            aria-label={`Override the worker name for ${f.worker}`}
                            onClick={() =>
                              setOverrides((o) => {
                                const on = !o[f.host];
                                if (on) setRenames((r) => ({ ...r, [f.host]: r[f.host] ?? f.worker }));
                                return { ...o, [f.host]: on };
                              })
                            }
                            className="flex items-center gap-1.5 text-[0.62rem] text-muted-foreground transition hover:text-neon-cyan"
                          >
                            <span
                              className="relative h-3.5 w-6 rounded-full border transition"
                              style={{
                                borderColor: overrides[f.host] ? "var(--neon-cyan)" : "var(--border)",
                                background: overrides[f.host]
                                  ? "color-mix(in oklab, var(--neon-cyan) 25%, transparent)"
                                  : "var(--secondary)",
                              }}
                            >
                              <span
                                className="absolute top-1/2 size-2 -translate-y-1/2 rounded-full transition-all"
                                style={{
                                  left: overrides[f.host] ? "calc(100% - 0.6rem)" : "0.15rem",
                                  background: overrides[f.host] ? "var(--neon-cyan)" : "var(--muted-foreground)",
                                }}
                              />
                            </span>
                            change
                          </button>
                        )}
                      </div>
                    )}
                    {!f.on_mesh && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {f.driver !== "axeos" ? (
                          <span className="text-[0.62rem] text-foreground">
                            <span className="text-neon-cyan">ⓘ Note:</span> This miner's firmware cannot be
                            given a new pool — add the mesh on the miner itself.
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={
                              moving !== null || !settings?.mesh_address || !nameFor(f).trim()
                            }
                            onClick={() => setConfirming(f.host)}
                            className="relative overflow-hidden rounded-md border px-2 py-0.5 text-[0.62rem] font-semibold transition disabled:opacity-40"
                            style={{ borderColor: "var(--neon-cyan)", color: "var(--neon-cyan)" }}
                          >
                            <span
                              aria-hidden
                              className="pointer-events-none absolute inset-y-0 w-1/3"
                              style={{
                                background:
                                  "linear-gradient(90deg, transparent, color-mix(in oklab, var(--neon-cyan) 45%, transparent), transparent)",
                                animation: "flow-right 2.6s linear infinite",
                              }}
                            />
                            <span className="relative">{moving === f.host ? "Moving…" : "Move to mesh"}</span>
                          </button>
                        )}
                        {moveNote[f.host] && (
                          <span className="text-[0.62rem] text-muted-foreground">{moveNote[f.host]}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>


    {confirming && (() => {

      const f = found.find((x) => x.host === confirming);

      if (!f) return null;

      return (

        <MoveToMeshModal

          miner={f}

          worker={nameFor(f).trim()}

          address={settings?.mesh_address ?? ""}

          port={settings?.mesh_port ?? 0}
      includeNew={Boolean(settings?.include_new)}

          busy={moving === f.host}

          onConfirm={() => doMove(f)}

          onCancel={() => setConfirming(null)}

        />

      );

    })()}

    </section>
  );
}

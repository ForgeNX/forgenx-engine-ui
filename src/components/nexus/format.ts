// Number formatting shared by the Nexus panels, so the same figure reads the same
// wherever it appears.

// Hashrate given in TH/s: "8.04 TH/s", or "1.21 PH/s" from a thousand up.
export function formatHashrate(th: number): string {
  return th >= 1000 ? `${(th / 1000).toFixed(2)} PH/s` : `${th.toFixed(2)} TH/s`;
}

// Share and difficulty figures, which run from thousands to trillions:
// 1207411 -> "1.21M", 950 -> "950".
export function compactNumber(n: number): string {
  const units = ["", "K", "M", "G", "T", "P"];
  let i = 0;
  while (Math.abs(n) >= 1000 && i < units.length - 1) {
    n /= 1000;
    i++;
  }
  return `${n.toFixed(i === 0 ? 0 : 2)}${units[i]}`;
}

// How long ago something happened, in the units that matter: "just now", "4m
// ago", "3h ago", "2d ago". Takes an ISO time or epoch milliseconds.
export function timeAgo(when: string | number): string {
  const ms = typeof when === "number" ? when : new Date(when).getTime();
  const mins = Math.floor((Date.now() - ms) / 60_000);
  if (!Number.isFinite(mins)) return "";
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return hours < 48 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

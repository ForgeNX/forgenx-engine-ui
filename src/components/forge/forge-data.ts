export const READINESS_CHECKS = [
  "Node RPC ready",
  "Blockchain synced",
  "Payout address configured",
  "Stratum V1 port open",
  "Stratum V2 port open",
  "ForgeNX Engine online",
  "ZMQ connected",
] as const;

export const PORTS = [
  { label: "P2P", value: "12024", color: "var(--neon-cyan)" },
  { label: "RPC", value: "9001", color: "var(--neon-violet)" },
  { label: "ZMQ", value: "28332", color: "var(--neon-green)" },
  { label: "Stratum V1", value: "3333", color: "var(--neon-pink)" },
  { label: "Stratum V2", value: "4333", color: "var(--neon-gold)" },
];

export const MINING_STATUS = [
  { label: "Worker count", value: "7" },
  { label: "Total hashrate", hint: "15min / 5min", value: "44.15 TH/s / 58.14 TH/s", accent: "var(--neon-cyan)" },
  { label: "Max session hashrate", value: "113.55 TH/s", accent: "var(--neon-cyan)" },
  { label: "Closest to block", hint: "session", value: "11.69%" },
  { label: "Best share difficulty", hint: "session", value: "76.88 M" },
  { label: "Network difficulty", value: "1.03 G" },
  { label: "Last share", value: "0s ago" },
  { label: "Total shares", hint: "session", value: "1,796 / 0", accent: "var(--neon-violet)" },
  { label: "Valid shares", hint: "session", value: "100.0%", accent: "var(--neon-green)" },
];

export const NODE_HEALTH = [
  { label: "Block height", value: "23,949,611" },
  { label: "Header height", value: "23,949,611" },
  { label: "Connected peers", value: "26" },
  { label: "Chain size", value: "1.8 GiB" },
  { label: "Prune enabled", value: "Yes" },
  { label: "Prune limit", value: "2 GiB" },
  { label: "Prune current", value: "1.78 GiB" },
  { label: "RPC status", value: "Online", accent: "var(--neon-green)" },
];

import type { TileViz } from "./tile-visuals";

export const NETWORK_TILES: {
  label: string;
  value: string;
  color: string;
  viz: TileViz;
}[] = [
  { label: "Network difficulty", value: "1.03 G", color: "var(--neon-cyan)", viz: "equalizer" },
  { label: "Network hashrate", value: "41.36 PH/s", color: "var(--neon-pink)", viz: "wave" },
  { label: "Est. time to block", value: "21.2h", color: "var(--neon-gold)", viz: "gauge" },
  { label: "Chain lag", value: "In sync", color: "var(--neon-green)", viz: "ripple" },
  { label: "Last block", value: "10s ago", color: "var(--neon-violet)", viz: "relay" },
  { label: "Mempool", value: "0 MiB", color: "var(--neon-cyan)", viz: "bubble" },
  { label: "Connections", value: "0 in / 26 out", color: "var(--neon-green)", viz: "flow" },
];

export const FORGE_TABS = [
  "Overview",
  "Node",
  "Workers",
  "Blocks / Luck",
  "Settings",
  "Advanced",
  "Information",
  "Logs",
] as const;
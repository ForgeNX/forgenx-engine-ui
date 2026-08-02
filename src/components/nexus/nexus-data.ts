export type ForgeAppNode = {
  syncStatus: string;
  syncNote: string;
  syncPercent: number;
  checks: { label: string; ok: boolean }[];
  blockHeight: string;
  bestHeight: string;
  lastBlock: string;
  lastBlockAgo: string;
  stratumV1: string;
  stratumV2: string;
  workerName: string;
  workerHint: string;
  networkDifficulty: string;
  networkHashrate: string;
  bestSessionDifficulty: string;
};

export type ForgeApp = {
  id: string;
  ticker: string;
  chain: string;
  symbol: string;
  color: string;
  installed: boolean;
  online: boolean;
  hashrate: string;
  percentage: number;
  miners: number;
  node: ForgeAppNode;
};

function node(partial: Partial<ForgeAppNode>): ForgeAppNode {
  return {
    syncStatus: "Synced (100%)",
    syncNote: "Fully up to date",
    syncPercent: 100,
    checks: [
      { label: "RPC", ok: true },
      { label: "ZMQ", ok: true },
      { label: "P2P", ok: true },
      { label: "POOL", ok: true },
      { label: "DISK", ok: true },
    ],
    blockHeight: "845,721",
    bestHeight: "845,721",
    lastBlock: "26 May 2025, 10:42:31",
    lastBlockAgo: "2 minutes ago",
    stratumV1: "stratum+tcp://forgepool.local:3333",
    stratumV2: "stratum+tls://forgepool.local:443",
    workerName: "YourWorkerName",
    workerHint: "e.g. Nano-3S-01",
    networkDifficulty: "85.67 T",
    networkHashrate: "568.12 EH/s",
    bestSessionDifficulty: "1.23 T",
    ...partial,
  };
}

/** Flip `installed` to see the Node Status ring + headings react. */
export const FORGE_APPS: ForgeApp[] = [
  {
    id: "btc",
    ticker: "ForgeBTC",
    chain: "Bitcoin Core",
    symbol: "₿",
    color: "var(--coin-btc)",
    installed: true,
    online: true,
    hashrate: "8.04 TH/s",
    percentage: 21.9,
    miners: 6,
    node: node({}),
  },
  {
    id: "bch",
    ticker: "ForgeBCH",
    chain: "Bitcoin Cash",
    symbol: "Ƀ",
    color: "var(--coin-bch)",
    installed: true,
    online: true,
    hashrate: "7.56 TH/s",
    percentage: 20.6,
    miners: 5,
    node: node({
      blockHeight: "899,412",
      bestHeight: "899,412",
      lastBlock: "26 May 2025, 10:39:04",
      lastBlockAgo: "5 minutes ago",
      stratumV1: "stratum+tcp://forgepool.local:3334",
      stratumV2: "stratum+tls://forgepool.local:444",
      networkDifficulty: "412.90 G",
      networkHashrate: "3.14 EH/s",
      bestSessionDifficulty: "88.42 G",
    }),
  },
  {
    id: "xec",
    ticker: "ForgeXEC",
    chain: "eCash",
    symbol: "ⓔ",
    color: "var(--coin-xec)",
    installed: true,
    online: true,
    hashrate: "2.57 TH/s",
    percentage: 7.0,
    miners: 0,
    node: node({
      blockHeight: "878,004",
      bestHeight: "878,004",
      lastBlockAgo: "just now",
      stratumV1: "stratum+tcp://forgepool.local:3335",
      stratumV2: "stratum+tls://forgepool.local:445",
      networkDifficulty: "128.44 G",
      networkHashrate: "1.02 EH/s",
      bestSessionDifficulty: "12.08 G",
    }),
  },
  {
    id: "fb",
    ticker: "ForgeFB",
    chain: "Fractal Bitcoin",
    symbol: "FB",
    color: "var(--coin-fb)",
    installed: true,
    online: true,
    hashrate: "6.22 TH/s",
    percentage: 16.9,
    miners: 4,
    node: node({
      blockHeight: "412,668",
      bestHeight: "412,668",
      lastBlockAgo: "40 seconds ago",
      stratumV1: "stratum+tcp://forgepool.local:3336",
      stratumV2: "stratum+tls://forgepool.local:446",
      networkDifficulty: "9.44 T",
      networkHashrate: "72.60 PH/s",
      bestSessionDifficulty: "640.11 G",
    }),
  },
  {
    id: "dgb",
    ticker: "ForgeDGB",
    chain: "DigiByte",
    symbol: "Ð",
    color: "var(--coin-dgb)",
    installed: true,
    online: true,
    hashrate: "6.69 TH/s",
    percentage: 18.2,
    miners: 5,
    node: node({
      blockHeight: "23,949,611",
      bestHeight: "23,949,611",
      lastBlockAgo: "10 seconds ago",
      stratumV1: "stratum+tcp://forgepool.local:3333",
      stratumV2: "stratum+tls://forgepool.local:4333",
      networkDifficulty: "1.03 G",
      networkHashrate: "41.36 PH/s",
      bestSessionDifficulty: "76.88 M",
    }),
  },
  {
    id: "bc2",
    ticker: "ForgeBC2",
    chain: "Bitcoin II",
    symbol: "B²",
    color: "var(--coin-bc2)",
    installed: true,
    online: true,
    hashrate: "2.31 TH/s",
    percentage: 6.3,
    miners: 1,
    node: node({
      blockHeight: "104,229",
      bestHeight: "104,229",
      lastBlockAgo: "8 minutes ago",
      stratumV1: "stratum+tcp://forgepool.local:3337",
      stratumV2: "stratum+tls://forgepool.local:447",
      networkDifficulty: "244.10 M",
      networkHashrate: "1.74 PH/s",
      bestSessionDifficulty: "4.90 M",
    }),
  },
  {
    id: "ppc",
    ticker: "ForgePPC",
    chain: "Peercoin",
    symbol: "Ᵽ",
    color: "var(--coin-ppc)",
    installed: false,
    online: false,
    hashrate: "3.35 TH/s",
    percentage: 9.1,
    miners: 2,
    node: node({
      syncStatus: "Not installed",
      syncNote: "Install ForgePPC to begin syncing",
      syncPercent: 0,
      checks: [
        { label: "RPC", ok: false },
        { label: "ZMQ", ok: false },
        { label: "P2P", ok: false },
        { label: "POOL", ok: false },
        { label: "DISK", ok: true },
      ],
      blockHeight: "—",
      bestHeight: "—",
      lastBlock: "No data",
      lastBlockAgo: "awaiting install",
      stratumV1: "unavailable",
      stratumV2: "unavailable",
      networkDifficulty: "—",
      networkHashrate: "—",
      bestSessionDifficulty: "—",
    }),
  },
];

export const NEXUS_TABS = [
  "Overview",
  "Workers",
  "Nodes",
  "Nexus",
  "Settings",
  "Information",
  "Logs",
] as const;
export type NexusTab = (typeof NEXUS_TABS)[number];

export const TIME_WINDOWS = ["15m", "1H", "6H", "24H", "7D"] as const;
export type NexusWindow = (typeof TIME_WINDOWS)[number];
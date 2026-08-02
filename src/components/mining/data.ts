export type Coin = {
  id: string;
  ticker: string;
  name: string;
  symbol: string;
  color: string;
  share: number;
  miners: number;
};

export const COINS: Coin[] = [
  {
    id: "dgb",
    ticker: "ForgeDGB",
    name: "Digibyte",
    symbol: "D",
    color: "var(--neon-cyan)",
    share: 18.2,
    miners: 5,
  },
  {
    id: "ppc",
    ticker: "ForgePPC",
    name: "Peercoin",
    symbol: "P",
    color: "var(--neon-green)",
    share: 9.1,
    miners: 2,
  },
  {
    id: "fb",
    ticker: "ForgeFB",
    name: "Fractal Bitcoin",
    symbol: "FB",
    color: "var(--neon-gold)",
    share: 16.9,
    miners: 4,
  },
  {
    id: "bch",
    ticker: "ForgeBCH",
    name: "Bitcoin Cash",
    symbol: "B",
    color: "var(--neon-green)",
    share: 20.6,
    miners: 5,
  },
  {
    id: "btc",
    ticker: "ForgeBTC",
    name: "Bitcoin",
    symbol: "B",
    color: "var(--neon-gold)",
    share: 21.9,
    miners: 6,
  },
  {
    id: "bc2",
    ticker: "ForgeBC2",
    name: "Bitcoin II",
    symbol: "B²",
    color: "var(--neon-pink)",
    share: 6.3,
    miners: 1,
  },
  {
    id: "xec",
    ticker: "ForgeXEC",
    name: "eCash",
    symbol: "C",
    color: "var(--neon-cyan)",
    share: 7.0,
    miners: 0,
  },
];

/** Deterministic pseudo-random so SSR and hydration agree. */
export function seededSeries(seed: number, length = 40, drift = 1) {
  let s = seed * 9301 + 49297;
  const out: number[] = [];
  let value = 0.5;
  for (let i = 0; i < length; i += 1) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    value = Math.min(1, Math.max(0.08, value + (r - 0.5) * 0.42 * drift));
    out.push(value);
  }
  return out;
}

export const TIME_WINDOWS = ["30M", "6H", "1D", "3D", "6D", "7D"] as const;
export type TimeWindow = (typeof TIME_WINDOWS)[number];
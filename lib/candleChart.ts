import { Candle, Timeframe } from '../types';

// CoinGecko OHLC `days` per timeframe.
export const TIMEFRAME_DAYS: Record<Timeframe, string> = {
  [Timeframe.Day]: '1',
  [Timeframe.Month]: '30',
  [Timeframe.Year]: '365',
};

// All timeframes in display order (values double as UI labels).
export const TIMEFRAMES = Object.values(Timeframe);

// CoinGecko OHLC rows are [ts_ms, open, high, low, close].
export function mapOhlcRows(rows: number[][]): Candle[] {
  return rows.map(([t, o, h, l, c]) => ({ t, o, h, l, c }));
}

// Fold the live price (from the Kraken ticker socket in the store) into the
// most recent candle so the right-most candle moves in real-time. Pure +
// immutable: earlier candles keep their references.
export function applyLivePrice(candles: Candle[], price?: number): Candle[] {
  if (price == null || candles.length === 0) return candles;
  const last = candles[candles.length - 1];
  const updated: Candle = {
    ...last,
    c: price,
    h: Math.max(last.h, price),
    l: Math.min(last.l, price),
  };
  return [...candles.slice(0, -1), updated];
}

// % change across a candle series (first open → last close). Derived from the
// OHLC data we already fetch, so the timeframe change needs no extra request.
export function periodChangePct(candles: Candle[]): number | null {
  if (candles.length === 0) return null;
  const first = candles[0].o;
  if (first === 0) return null;
  const last = candles[candles.length - 1].c;
  return ((last - first) / first) * 100;
}

// "▲ 12.30%" / "▼ -1.93%"
export function formatSignedPct(pct: number): string {
  return `${pct >= 0 ? '▲' : '▼'} ${pct.toFixed(2)}%`;
}

export interface PriceDomain {
  min: number;
  max: number;
}

export function priceDomain(candles: Candle[]): PriceDomain {
  if (candles.length === 0) return { min: 0, max: 1 };
  return {
    min: Math.min(...candles.map((c) => c.l)),
    max: Math.max(...candles.map((c) => c.h)),
  };
}

// Map a price to a y coordinate in a box of `height` (0 = top).
export function priceToY(
  price: number,
  domain: PriceDomain,
  height: number,
): number {
  const range = domain.max - domain.min || 1;
  return height - ((price - domain.min) / range) * height;
}

// "Nice" round tick values covering [min, max] (à la d3). Used for the Y axis.
function niceNum(range: number, round: boolean): number {
  const exp = Math.floor(Math.log10(range));
  const frac = range / Math.pow(10, exp);
  let nice: number;
  if (round) nice = frac < 1.5 ? 1 : frac < 3 ? 2 : frac < 7 ? 5 : 10;
  else nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  return nice * Math.pow(10, exp);
}

export function niceTicks(min: number, max: number, count = 5): number[] {
  if (max <= min) return [min];
  const range = niceNum(max - min, false);
  const step = niceNum(range / Math.max(count - 1, 1), true);
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + step * 0.5; v += step) {
    ticks.push(Number(v.toFixed(10))); // avoid float drift
  }
  return ticks;
}

// Indices of at most `count` evenly-spaced items across a length-`n` series,
// inclusive of the first and last. Used to thin out X-axis time labels.
export function evenlySpacedIndices(n: number, count: number): number[] {
  if (n <= 0 || count <= 0) return [];
  const k = Math.min(count, n);
  if (k === 1) return [0];
  return Array.from({ length: k }, (_, i) => Math.round((i * (n - 1)) / (k - 1)));
}

export function formatAxisPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (p >= 1) return p.toFixed(2);
  return p.toPrecision(3); // small prices like 0.163
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const pad = (n: number) => String(n).padStart(2, '0');

function weekOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d.getTime() - start.getTime()) / 86_400_000);
  return Math.floor((days + start.getDay()) / 7) + 1;
}

// X-axis label per timeframe: Day→HH:mm, Month→DD.MM, Year→Mon Wnn.
export function formatAxisTime(ts: number, tf: Timeframe): string {
  const d = new Date(ts);
  switch (tf) {
    case Timeframe.Day:
      return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    case Timeframe.Month:
      return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
    case Timeframe.Year:
      return `${MONTHS[d.getMonth()]} W${weekOfYear(d)}`;
  }
}

export interface CandleLayout {
  x: number; // body left
  bodyY: number; // body top
  bodyWidth: number;
  bodyHeight: number;
  wickX: number; // wick center x
  wickTop: number;
  wickBottom: number;
  up: boolean;
}

// Pure geometry: project candles into an SVG box (0,0 top-left). Domain defaults
// to the data's own min/max but can be overridden (e.g. nice-tick bounds) so
// candles and gridlines share the same scale.
export function computeCandleLayout(
  candles: Candle[],
  size: { width: number; height: number },
  domain: PriceDomain = priceDomain(candles),
): CandleLayout[] {
  if (candles.length === 0) return [];

  const { width, height } = size;
  const slot = width / candles.length;
  const bodyWidth = Math.max(slot * 0.6, 1);

  return candles.map((c, i) => {
    const center = (i + 0.5) * slot;
    const top = priceToY(Math.max(c.o, c.c), domain, height);
    const bottom = priceToY(Math.min(c.o, c.c), domain, height);
    return {
      x: center - bodyWidth / 2,
      bodyY: top,
      bodyWidth,
      bodyHeight: Math.max(bottom - top, 1),
      wickX: center,
      wickTop: priceToY(c.h, domain, height),
      wickBottom: priceToY(c.l, domain, height),
      up: c.c >= c.o,
    };
  });
}

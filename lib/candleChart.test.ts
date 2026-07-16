import {
  computeCandleLayout,
  applyLivePrice,
  periodChangePct,
  formatSignedPct,
  priceDomain,
  priceToY,
  niceTicks,
  formatAxisPrice,
  formatAxisTime,
  evenlySpacedIndices,
  describeCandles,
} from './candleChart';
import { Candle, Timeframe } from '../types';

// Test-data builder: a valid candle so each test states ONLY the fields it
// exercises (o/c for direction, h/l for range) via overrides.
const makeCandle = (overrides: Partial<Candle> = {}): Candle => ({
  t: 0,
  o: 10,
  h: 15,
  l: 5,
  c: 12,
  ...overrides,
});

describe('computeCandleLayout', () => {
  const size = { width: 100, height: 100 };

  it('returns no layout for an empty series', () => {
    // Arrange
    const candles: Candle[] = [];

    // Act
    const result = computeCandleLayout(candles, size);

    // Assert
    expect(result).toEqual([]);
  });

  it('flags a candle as up when close >= open and colours the body accordingly', () => {
    // Arrange
    const candles = [makeCandle({ o: 10, c: 12 })];

    // Act
    const [layout] = computeCandleLayout(candles, size);

    // Assert
    expect(layout.up).toBe(true);
  });

  it('maps the highest high to y=0 and the lowest low to y=height (inverted axis)', () => {
    // Arrange — first candle spans the full price range (high 20, low 0)
    const candles = [makeCandle({ h: 20, l: 0 }), makeCandle()];

    // Act
    const result = computeCandleLayout(candles, size);

    // Assert — high(20) → top (y≈0), low(0) → bottom (y≈height)
    expect(result[0].wickTop).toBeCloseTo(0);
    expect(result[0].wickBottom).toBeCloseTo(100);
  });
});

describe('applyLivePrice', () => {
  it('updates the last candle close and extends its high/low with the live price', () => {
    // Arrange
    const candles = [makeCandle(), makeCandle({ h: 13, l: 10 })];

    // Act
    const result = applyLivePrice(candles, 15);

    // Assert
    const last = result[result.length - 1];
    expect(last.c).toBe(15);
    expect(last.h).toBe(15); // 15 > previous high 13
    expect(last.l).toBe(10); // unchanged
    expect(result[0]).toBe(candles[0]); // earlier candles untouched (same ref)
  });

  it('returns the candles unchanged when there is no live price', () => {
    // Arrange
    const candles = [makeCandle()];

    // Act
    const result = applyLivePrice(candles, undefined);

    // Assert
    expect(result).toBe(candles);
  });
});

describe('periodChangePct', () => {
  it('computes percent change from the first open to the last close', () => {
    // Arrange
    const candles = [makeCandle({ o: 100 }), makeCandle({ c: 120 })];

    // Act
    const result = periodChangePct(candles);

    // Assert — (120 - 100) / 100 * 100
    expect(result).toBeCloseTo(20);
  });

  it('returns null for an empty series', () => {
    // Arrange / Act / Assert
    expect(periodChangePct([])).toBeNull();
  });

  it('returns null when the first open is 0 (avoids divide-by-zero)', () => {
    // Arrange
    const candles = [makeCandle({ o: 0 }), makeCandle({ c: 120 })];

    // Act
    const result = periodChangePct(candles);

    // Assert
    expect(result).toBeNull();
  });
});

describe('priceToY', () => {
  const domain = { min: 0, max: 100 };

  it('maps the domain max to the top (y=0) and the min to the bottom (y=height)', () => {
    // Arrange / Act / Assert — y axis is inverted (0 = top)
    expect(priceToY(100, domain, 200)).toBeCloseTo(0);
    expect(priceToY(0, domain, 200)).toBeCloseTo(200);
  });

  it('maps the midpoint to the vertical center', () => {
    // Arrange / Act / Assert
    expect(priceToY(50, domain, 200)).toBeCloseTo(100);
  });

  it('handles a flat series (min === max) without dividing by zero', () => {
    // Arrange
    const flat = { min: 50, max: 50 };

    // Act
    const result = priceToY(50, flat, 200);

    // Assert — falls back to a range of 1, so the result is finite
    expect(Number.isFinite(result)).toBe(true);
  });
});

describe('formatSignedPct', () => {
  it('prefixes ▲ for non-negative and ▼ for negative', () => {
    // Arrange / Act / Assert
    expect(formatSignedPct(12.3)).toBe('▲ 12.30%');
    expect(formatSignedPct(-1.93)).toBe('▼ -1.93%');
  });
});

describe('priceDomain', () => {
  it('returns the lowest low and highest high across candles', () => {
    // Arrange
    const candles = [makeCandle({ h: 15, l: 8 }), makeCandle({ h: 20, l: 5 })];

    // Act
    const result = priceDomain(candles);

    // Assert
    expect(result).toEqual({ min: 5, max: 20 });
  });
});

describe('niceTicks', () => {
  it('produces round tick values that cover the range', () => {
    // Arrange
    const min = 73;
    const max = 76;

    // Act
    const result = niceTicks(min, max, 5);

    // Assert
    expect(result).toEqual([73, 74, 75, 76]);
  });

  it('returns a single tick when max <= min', () => {
    // Arrange / Act / Assert
    expect(niceTicks(5, 5, 5)).toEqual([5]);
  });

  it('rounds to a nice step for a mid-range span', () => {
    // Arrange / Act / Assert — step 5 nicely covers 0..15
    expect(niceTicks(0, 15, 5)).toEqual([0, 5, 10, 15]);
  });

  it('rounds to a nice step for a large span', () => {
    // Arrange / Act / Assert — step 200 nicely covers 0..1000
    expect(niceTicks(0, 1000, 5)).toEqual([0, 200, 400, 600, 800, 1000]);
  });
});

describe('evenlySpacedIndices', () => {
  it('returns no indices for an empty series', () => {
    // Arrange / Act / Assert
    expect(evenlySpacedIndices(0, 5)).toEqual([]);
  });

  it('returns a single index for a one-item series', () => {
    // Arrange / Act / Assert
    expect(evenlySpacedIndices(1, 5)).toEqual([0]);
  });

  it('spreads count indices across the series, including first and last', () => {
    // Arrange / Act / Assert
    expect(evenlySpacedIndices(10, 5)).toEqual([0, 2, 5, 7, 9]);
  });

  it('clamps the count to the series length', () => {
    // Arrange / Act / Assert
    expect(evenlySpacedIndices(3, 5)).toEqual([0, 1, 2]);
  });
});

describe('formatAxisPrice', () => {
  it('drops decimals and groups thousands for large prices', () => {
    // Arrange / Act / Assert
    expect(formatAxisPrice(62888)).toBe('62,888');
  });

  it('keeps 2 decimals for mid prices and 3 sig-figs for tiny ones', () => {
    // Arrange / Act / Assert
    expect(formatAxisPrice(74.2)).toBe('74.20');
    expect(formatAxisPrice(0.16253)).toBe('0.163');
  });
});

describe('formatAxisTime', () => {
  const ts = new Date(2026, 5, 5, 14, 30).getTime(); // 5 Jun 2026, 14:30 local

  it('formats Day as HH:mm', () => {
    // Arrange / Act / Assert
    expect(formatAxisTime(ts, Timeframe.Day)).toBe('14:30');
  });

  it('formats Month as DD.MM', () => {
    // Arrange / Act / Assert
    expect(formatAxisTime(ts, Timeframe.Month)).toBe('05.06');
  });

  it('formats Year as month + week number', () => {
    // Arrange / Act / Assert
    expect(formatAxisTime(ts, Timeframe.Year)).toMatch(/^Jun W\d+$/);
  });
});

describe('describeCandles', () => {
  const series = [
    { t: 0, o: 100, h: 120, l: 90, c: 110 },
    { t: 1, o: 110, h: 130, l: 80, c: 108 },
  ];

  it('summarises the range, direction and extremes', () => {
    // Arrange / Act
    const result = describeCandles(series, Timeframe.Month, 2);

    // Assert — the shape a sighted user takes in at a glance
    expect(result).toBe(
      'Price chart, last month. Opened at $100.00, up 8.00%, now $108.00. High $130.00, low $80.00.',
    );
  });

  it('says down when the period closed lower', () => {
    // Arrange
    const falling = [
      { t: 0, o: 100, h: 100, l: 40, c: 90 },
      { t: 1, o: 90, h: 95, l: 40, c: 50 },
    ];

    // Act
    const result = describeCandles(falling, Timeframe.Day, 2);

    // Assert
    expect(result).toContain('last 24 hours');
    expect(result).toContain('down 50.00%');
  });

  it('finds the high and low across every candle, not just the ends', () => {
    // Arrange — the extremes sit in the middle candle
    const spiky = [
      { t: 0, o: 100, h: 101, l: 99, c: 100 },
      { t: 1, o: 100, h: 500, l: 10, c: 100 },
      { t: 2, o: 100, h: 101, l: 99, c: 100 },
    ];

    // Act
    const result = describeCandles(spiky, Timeframe.Year, 2);

    // Assert
    expect(result).toContain('High $500.00, low $10.00');
  });

  it('says so rather than inventing a range when there is no data', () => {
    // Arrange / Act
    const result = describeCandles([], Timeframe.Month, 2);

    // Assert
    expect(result).toBe('Price chart, last month. No data.');
  });
});

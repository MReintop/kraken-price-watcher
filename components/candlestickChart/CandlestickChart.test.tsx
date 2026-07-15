import { render, screen } from '@testing-library/react';
import { Candle, Timeframe } from '../../types';
import CandlestickChart from './CandlestickChart';

const makeCandle = (overrides: Partial<Candle> = {}): Candle => ({
  t: 0,
  o: 12,
  h: 14,
  l: 11,
  c: 13,
  ...overrides,
});

describe('CandlestickChart', () => {
  it('draws a body rect per candle and renders price + time axis labels', () => {
    // Arrange — price domain 10..20 → nice ticks include 20.00; Day → HH:mm.
    // One up candle (c>=o) and one down candle (c<o) to exercise both colors.
    const candles: Candle[] = [
      makeCandle({
        t: new Date(2026, 0, 1, 9, 5).getTime(),
        o: 12,
        h: 14,
        l: 11,
        c: 13,
      }),
      makeCandle({
        t: new Date(2026, 0, 1, 12, 30).getTime(),
        o: 19,
        h: 20,
        l: 10,
        c: 11,
      }),
    ];

    // Act
    const { container } = render(
      <CandlestickChart
        candles={candles}
        width={300}
        height={200}
        timeframe={Timeframe.Day}
      />,
    );

    // Assert
    expect(container.querySelectorAll('[data-testid="svg-rect"]')).toHaveLength(
      2,
    );
    expect(screen.getByText('20.00')).toBeTruthy(); // Y-axis price label
    expect(screen.getByText('09:05')).toBeTruthy(); // X-axis time label
  });

  it('handles a single candle', () => {
    // Arrange
    const candles = [makeCandle({ t: new Date(2026, 0, 1, 8, 0).getTime() })];

    // Act
    const { container } = render(
      <CandlestickChart
        candles={candles}
        width={300}
        height={200}
        timeframe={Timeframe.Day}
      />,
    );

    // Assert
    expect(container.querySelectorAll('[data-testid="svg-rect"]')).toHaveLength(
      1,
    );
    expect(screen.getByText('08:00')).toBeTruthy();
  });

  it('reads out as one summary rather than a heap of rectangles', () => {
    // Arrange
    const candles = [
      { t: 1_700_000_000_000, o: 100, h: 120, l: 90, c: 110 },
      { t: 1_700_003_600_000, o: 110, h: 130, l: 80, c: 108 },
    ];

    // Act
    render(
      <CandlestickChart
        candles={candles}
        width={300}
        height={200}
        timeframe={Timeframe.Month}
      />,
    );

    // Assert — an SVG of rects says nothing to a screen reader; this is the
    // whole chart in one label
    expect(
      screen.getByLabelText(
        'Price chart, last month. Opened at $100.00, up 8.00%, now $108.00. High $130.00, low $80.00.',
      ),
    ).toBeTruthy();
  });
});

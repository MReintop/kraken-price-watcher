import { render, screen, fireEvent } from '@testing-library/react';
import { Candle, FetchStatus, Timeframe } from '../../types';
import { useCandles } from '../../hooks/useCandles';
import CoinChart from './CoinChart';

// Unit-test CoinChart in isolation by stubbing the data hook (its fetching is
// covered separately); this test only exercises the wiring: status → UI, live
// price → period change, and timeframe selection → series.
jest.mock('../../hooks/useCandles', () => ({ useCandles: jest.fn() }));
const mockUseCandles = useCandles as jest.Mock;

const makeCandle = (overrides: Partial<Candle> = {}): Candle => ({
  t: 0,
  o: 100,
  h: 105,
  l: 95,
  c: 102,
  ...overrides,
});

// Month opens at 100, Year opens at 50 → with a live price of 120 folded into
// the last candle, the period change differs per timeframe (+20% vs +140%).
const byTimeframe = {
  [Timeframe.Day]: [makeCandle()],
  [Timeframe.Month]: [
    makeCandle({ o: 100 }),
    makeCandle({ o: 102, h: 110, l: 100, c: 108 }),
  ],
  [Timeframe.Year]: [makeCandle({ o: 50 }), makeCandle({ o: 60, c: 70 })],
};

afterEach(() => jest.clearAllMocks());

describe('CoinChart', () => {
  it('shows a spinner while loading', () => {
    // Arrange
    mockUseCandles.mockReturnValue({
      candles: undefined,
      status: FetchStatus.Loading,
    });

    // Act
    render(<CoinChart coinId="bitcoin" livePrice={100} />);

    // Assert
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('shows an error message when the fetch failed', () => {
    // Arrange
    mockUseCandles.mockReturnValue({
      candles: undefined,
      status: FetchStatus.Failed,
    });

    // Act
    render(<CoinChart coinId="bitcoin" livePrice={100} />);

    // Assert
    expect(screen.getByText(/load chart/)).toBeTruthy();
  });

  it('renders the period change and one candle per data point when loaded', () => {
    // Arrange
    // The hook is asked for one range, so the stub answers per range — which is
    // what keeps the timeframe switch below meaningful.
    mockUseCandles.mockImplementation((_coinId, timeframe: Timeframe) => ({
      candles: byTimeframe[timeframe],
      status: FetchStatus.Succeeded,
    }));

    // Act — live price 120 vs Month open 100 → +20%
    const { container } = render(
      <CoinChart coinId="bitcoin" livePrice={120} />,
    );

    // Assert
    expect(screen.getByText('▲ 20.00%')).toBeTruthy();
    expect(container.querySelectorAll('[data-testid="svg-rect"]')).toHaveLength(
      2,
    );
  });

  it('switches the series when a different timeframe is selected', () => {
    // Arrange
    // The hook is asked for one range, so the stub answers per range — which is
    // what keeps the timeframe switch below meaningful.
    mockUseCandles.mockImplementation((_coinId, timeframe: Timeframe) => ({
      candles: byTimeframe[timeframe],
      status: FetchStatus.Succeeded,
    }));
    render(<CoinChart coinId="bitcoin" livePrice={120} />);

    // Act — Year open 50 vs live price 120 → +140%
    fireEvent.click(screen.getByText('1Y'));

    // Assert
    expect(screen.getByText('▲ 140.00%')).toBeTruthy();
  });
});

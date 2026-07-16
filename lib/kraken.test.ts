import {
  fetchKrakenLastPrices,
  fetchKrakenCandles,
  fetchKrakenPairDecimals,
} from './kraken';
import { Timeframe } from '../types';

const envelope = (result: unknown, error: string[] = []) => ({
  ok: true,
  status: 200,
  headers: { get: (): string | null => null },
  json: async () => ({ error, result }),
});

const ohlcRow = (time: number, close: string) => [
  time,
  '100.0',
  '110.0',
  '90.0',
  close,
  '100.0',
  '1.0',
  10,
];

afterEach(() => jest.resetAllMocks());

describe('fetchKrakenPairDecimals', () => {
  it('reads the price precision each market publishes', async () => {
    // Arrange — Kraken quotes BTC/USD to a tenth of a dollar
    globalThis.fetch = jest.fn().mockResolvedValue(
      envelope({
        XXBTZUSD: { altname: 'XBTUSD', pair_decimals: 1 },
        SOLUSD: { altname: 'SOLUSD', pair_decimals: 2 },
      }),
    ) as unknown as typeof fetch;

    // Act
    const decimals = await fetchKrakenPairDecimals(['XXBTZUSD', 'SOLUSD']);

    // Assert
    expect(decimals.get('XXBTZUSD')).toBe(1);
    expect(decimals.get('SOLUSD')).toBe(2);
  });

  it.each([
    ['missing', undefined],
    ['a string', '1'],
    ['fractional', 1.5],
    ['negative', -1],
    // Intl throws a RangeError past 20, which would crash the render.
    ['absurd', 99],
  ])(
    'rejects a %s precision rather than formatting by guess',
    async (_l, d) => {
      // Arrange
      globalThis.fetch = jest
        .fn()
        .mockResolvedValue(
          envelope({ XXBTZUSD: { pair_decimals: d } }),
        ) as unknown as typeof fetch;

      // Act / Assert
      await expect(fetchKrakenPairDecimals(['XXBTZUSD'])).rejects.toThrow(
        'expected a decimal count',
      );
    },
  );
});

describe('fetchKrakenLastPrices', () => {
  it('reads the last trade price for each pair', async () => {
    // Arrange
    globalThis.fetch = jest.fn().mockResolvedValue(
      envelope({
        XXBTZUSD: { c: ['64788.0', '1.0'], o: '64000.0' },
      }),
    ) as unknown as typeof fetch;

    // Act
    const prices = await fetchKrakenLastPrices(['XXBTZUSD']);

    // Assert
    expect(prices.get('XXBTZUSD')).toBe(64788);
  });

  it('asks for every pair in one request', async () => {
    // Arrange
    const fetchMock = jest.fn().mockResolvedValue(envelope({}));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    // Act
    await fetchKrakenLastPrices(['XXBTZUSD', 'SOLUSD']);

    // Assert — one call, not one per pair
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('pair=XXBTZUSD,SOLUSD');
  });

  it('keys by the pair name, since Kraken does not answer in the order asked', async () => {
    // Arrange
    globalThis.fetch = jest.fn().mockResolvedValue(
      envelope({
        SOLUSD: { c: ['142.5', '1.0'], o: '140.0' },
        XXBTZUSD: { c: ['64788.0', '1.0'], o: '64000.0' },
      }),
    ) as unknown as typeof fetch;

    // Act
    const prices = await fetchKrakenLastPrices(['XXBTZUSD', 'SOLUSD']);

    // Assert
    expect(prices.get('XXBTZUSD')).toBe(64788);
    expect(prices.get('SOLUSD')).toBe(142.5);
  });

  it('throws on an error body, which Kraken sends with HTTP 200', async () => {
    // Arrange — response.ok is true here; only the error array reveals the failure
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(
        envelope({}, ['EQuery:Unknown asset pair']),
      ) as unknown as typeof fetch;

    // Act / Assert
    await expect(fetchKrakenLastPrices(['NOPE'])).rejects.toThrow(
      'Unknown asset pair',
    );
  });
});

describe('fetchKrakenCandles', () => {
  it('converts string prices and second-precision timestamps', async () => {
    // Arrange
    globalThis.fetch = jest.fn().mockResolvedValue(
      envelope({
        XXBTZUSD: [ohlcRow(1_700_000_000, '105.0')],
        last: 1_700_000_000,
      }),
    ) as unknown as typeof fetch;

    // Act
    const candles = await fetchKrakenCandles('XXBTZUSD', Timeframe.Month);

    // Assert — milliseconds and numbers, as the chart expects
    expect(candles).toEqual([
      { t: 1_700_000_000_000, o: 100, h: 110, l: 90, c: 105 },
    ]);
  });

  it('ignores the `last` cursor Kraken returns alongside the rows', async () => {
    // Arrange
    globalThis.fetch = jest.fn().mockResolvedValue(
      envelope({
        SOLUSD: [ohlcRow(1_700_000_000, '105.0')],
        last: 1_700_000_000,
      }),
    ) as unknown as typeof fetch;

    // Act
    const candles = await fetchKrakenCandles('SOLUSD', Timeframe.Month);

    // Assert
    expect(candles).toHaveLength(1);
  });

  it('requests hourly candles for the 24h timeframe', async () => {
    // Arrange
    const fetchMock = jest
      .fn()
      .mockResolvedValue(envelope({ SOLUSD: [], last: 0 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    // Act
    await fetchKrakenCandles('SOLUSD', Timeframe.Day);

    // Assert
    expect(fetchMock.mock.calls[0][0]).toContain('interval=60');
  });

  it('requests weekly candles for the 1Y timeframe', async () => {
    // Arrange
    const fetchMock = jest
      .fn()
      .mockResolvedValue(envelope({ SOLUSD: [], last: 0 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    // Act
    await fetchKrakenCandles('SOLUSD', Timeframe.Year);

    // Assert
    expect(fetchMock.mock.calls[0][0]).toContain('interval=10080');
  });

  it('keeps only the most recent candles for the timeframe', async () => {
    // Arrange — Kraken returns far more rows than a 24h chart needs
    const rows = Array.from({ length: 100 }, (_, i) =>
      ohlcRow(1_700_000_000 + i * 3600, String(i)),
    );
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(
        envelope({ SOLUSD: rows, last: 0 }),
      ) as unknown as typeof fetch;

    // Act
    const candles = await fetchKrakenCandles('SOLUSD', Timeframe.Day);

    // Assert — the tail, so the chart ends at "now"
    expect(candles).toHaveLength(24);
    expect(candles[candles.length - 1].c).toBe(99);
  });

  it('throws on an unknown pair, which Kraken reports with HTTP 200', async () => {
    // Arrange
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(
        envelope({}, ['EQuery:Unknown asset pair']),
      ) as unknown as typeof fetch;

    // Act / Assert — the silent-empty-chart trap
    await expect(fetchKrakenCandles('NOPE', Timeframe.Month)).rejects.toThrow(
      'Unknown asset pair',
    );
  });

  it('throws when the response carries no rows at all', async () => {
    // Arrange
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(envelope({ last: 0 })) as unknown as typeof fetch;

    // Act / Assert
    await expect(fetchKrakenCandles('SOLUSD', Timeframe.Month)).rejects.toThrow(
      'no candles',
    );
  });
});

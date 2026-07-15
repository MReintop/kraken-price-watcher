import { renderHook, waitFor } from '@testing-library/react';
import { FetchStatus, Timeframe } from '../types';
import { stubUpstreams } from '../test/upstreams';
import { useCandles } from './useCandles';

// Ids must be real coins, because the hook maps each to a Kraken pair — so they
// repeat across tests, and the module-scope cache would leak between them.
// Rather than reset the module (which would hand the hook a second copy of React
// and make every hook call throw), the clock jumps past the TTL before each test,
// so every entry the previous test left behind is already stale.
const CACHE_TTL_MS = 5 * 60 * 1000;
let clock = 1_700_000_000_000;
const uniqueCoinId = () => 'bitcoin';

const mockFetch = () => stubUpstreams();

beforeEach(() => {
  clock += CACHE_TTL_MS * 2;
  jest.spyOn(Date, 'now').mockImplementation(() => clock);
});

afterEach(() => jest.restoreAllMocks());

describe('useCandles', () => {
  it('starts loading, then succeeds with a series per timeframe', async () => {
    // Arrange
    mockFetch();
    const coinId = uniqueCoinId();

    // Act
    const { result } = renderHook(() => useCandles(coinId));

    // Assert
    expect(result.current.status).toBe(FetchStatus.Loading);
    await waitFor(() =>
      expect(result.current.status).toBe(FetchStatus.Succeeded),
    );
    expect(Object.keys(result.current.byTimeframe!)).toEqual([
      Timeframe.Day,
      Timeframe.Month,
      Timeframe.Year,
    ]);
  });

  it('maps the upstream rows into candles', async () => {
    // Arrange
    mockFetch();
    const coinId = uniqueCoinId();

    // Act
    const { result } = renderHook(() => useCandles(coinId));
    await waitFor(() =>
      expect(result.current.status).toBe(FetchStatus.Succeeded),
    );

    // Assert — string prices and second-precision timestamps, converted
    expect(result.current.byTimeframe![Timeframe.Day]).toEqual([
      { t: 1_700_000_000_000, o: 100, h: 110, l: 90, c: 105 },
    ]);
  });

  it('fetches every timeframe once, not once per render', async () => {
    // Arrange
    const fetchMock = mockFetch();
    const coinId = uniqueCoinId();

    // Act
    const { result, rerender } = renderHook(() => useCandles(coinId));
    await waitFor(() =>
      expect(result.current.status).toBe(FetchStatus.Succeeded),
    );
    rerender();

    // Assert — three timeframes, three requests, and no more
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('serves a second visit from cache without refetching', async () => {
    // Arrange
    const fetchMock = mockFetch();
    const coinId = uniqueCoinId();
    const first = renderHook(() => useCandles(coinId));
    await waitFor(() =>
      expect(first.result.current.status).toBe(FetchStatus.Succeeded),
    );
    first.unmount();

    // Act — the same coin again
    const second = renderHook(() => useCandles(coinId));

    // Assert — cached candles are there on render one, with no spinner
    expect(second.result.current.status).toBe(FetchStatus.Succeeded);
    expect(second.result.current.byTimeframe).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('refetches once the cached entry has expired', async () => {
    // Arrange
    const fetchMock = mockFetch();
    const coinId = uniqueCoinId();
    const first = renderHook(() => useCandles(coinId));
    await waitFor(() =>
      expect(first.result.current.status).toBe(FetchStatus.Succeeded),
    );
    first.unmount();

    // Act — step past the 5 minute TTL
    clock += CACHE_TTL_MS + 1;
    const second = renderHook(() => useCandles(coinId));
    await waitFor(() =>
      expect(second.result.current.status).toBe(FetchStatus.Succeeded),
    );

    // Assert — stale candles must not outlive the window
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it('caches per coin, so a different coin still fetches', async () => {
    // Arrange
    const fetchMock = mockFetch();
    const firstCoin = 'bitcoin';
    const secondCoin = 'ethereum';
    const first = renderHook(() => useCandles(firstCoin));
    await waitFor(() =>
      expect(first.result.current.status).toBe(FetchStatus.Succeeded),
    );

    // Act
    const second = renderHook(() => useCandles(secondCoin));
    await waitFor(() =>
      expect(second.result.current.status).toBe(FetchStatus.Succeeded),
    );

    // Assert
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it('goes back to loading when the coin changes mid-mount', async () => {
    // Arrange
    mockFetch();
    const { result, rerender } = renderHook(({ id }) => useCandles(id), {
      initialProps: { id: 'bitcoin' },
    });
    await waitFor(() =>
      expect(result.current.status).toBe(FetchStatus.Succeeded),
    );

    // Act — same hook instance, different coin
    rerender({ id: 'ethereum' });

    // Assert — one coin's candles must never be shown as another's
    expect(result.current.status).toBe(FetchStatus.Loading);
    expect(result.current.byTimeframe).toBeUndefined();
  });

  it('reports failure when the upstream rejects unrecoverably', async () => {
    // Arrange
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: { get: (): string | null => null },
    }) as unknown as typeof fetch;
    const coinId = uniqueCoinId();

    // Act
    const { result } = renderHook(() => useCandles(coinId));

    // Assert
    await waitFor(() => expect(result.current.status).toBe(FetchStatus.Failed));
  });

  it('reports failure when the network throws', async () => {
    // Arrange
    globalThis.fetch = jest
      .fn()
      .mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    const coinId = uniqueCoinId();

    // Act
    const { result } = renderHook(() => useCandles(coinId));

    // Assert
    await waitFor(() => expect(result.current.status).toBe(FetchStatus.Failed));
  });

  it('does not cache a failed fetch, so a retry retries', async () => {
    // Arrange
    const fetchMock = jest.fn().mockRejectedValue(new Error('offline'));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const coinId = uniqueCoinId();
    const first = renderHook(() => useCandles(coinId));
    await waitFor(() =>
      expect(first.result.current.status).toBe(FetchStatus.Failed),
    );
    first.unmount();

    // Act — the upstream recovers; the retry must actually reach it
    const recovered = stubUpstreams();
    const second = renderHook(() => useCandles(coinId));
    await waitFor(() =>
      expect(second.result.current.status).toBe(FetchStatus.Succeeded),
    );

    // Assert — a cached failure would have skipped the network entirely
    expect(recovered).toHaveBeenCalled();
  });
});

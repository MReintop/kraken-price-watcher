import { renderHook, waitFor } from '@testing-library/react';
import { FetchStatus, Timeframe } from '../types';
import { stubUpstreams } from '../test/upstreams';
import { useCandles } from './useCandles';

// The id must be a real coin (the hook maps it to a Kraken pair), so every test
// shares one and the hook's module-scope cache would leak between them. The
// clock jumps past the TTL before each test instead, staling the previous test's
// entries — resetting the module would hand the hook a second copy of React.
const CACHE_TTL_MS = 5 * 60 * 1000;
const COIN_ID = 'bitcoin';
let clock = 1_700_000_000_000;

// Long enough for the retry policy's jittered attempts to run out. Real timers,
// so only a test asserting on retries should pay it.
const RETRY_SCHEDULE_MS = 10_000;

const mockFetch = () => stubUpstreams();

// The prefetch is fire-and-forget, so a test that only awaits the selected
// range can finish while the other two are still in flight.
const settlePrefetch = () => waitFor(() => expect(true).toBe(true));

beforeEach(() => {
  clock += CACHE_TTL_MS * 2;
  jest.spyOn(Date, 'now').mockImplementation(() => clock);
});

afterEach(() => jest.restoreAllMocks());

describe('useCandles', () => {
  it('starts loading, then succeeds with the selected range', async () => {
    // Arrange
    mockFetch();

    // Act
    const { result } = renderHook(() => useCandles(COIN_ID, Timeframe.Month));

    // Assert
    expect(result.current.status).toBe(FetchStatus.Loading);
    await waitFor(() =>
      expect(result.current.status).toBe(FetchStatus.Succeeded),
    );
    await settlePrefetch();
  });

  it('maps the upstream rows into candles', async () => {
    // Arrange
    mockFetch();

    // Act
    const { result } = renderHook(() => useCandles(COIN_ID, Timeframe.Day));
    await waitFor(() =>
      expect(result.current.status).toBe(FetchStatus.Succeeded),
    );

    // Assert — string prices and second-precision timestamps, converted
    expect(result.current.candles).toEqual([
      { t: 1_700_000_000_000, o: 100, h: 110, l: 90, c: 105 },
    ]);
    await settlePrefetch();
  });

  it('asks for the selected range first, alone', async () => {
    // Arrange
    const fetchMock = mockFetch();

    // Act
    renderHook(() => useCandles(COIN_ID, Timeframe.Month));

    // Assert — asserted at mount, before anything resolves: the visible chart
    // gets the network to itself rather than queueing behind two ranges nobody
    // has opened. `interval=1440` is Timeframe.Month.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('interval=1440');
    await settlePrefetch();
  });

  it('prefetches the other ranges once the selected one lands', async () => {
    // Arrange
    const fetchMock = mockFetch();

    // Act
    const { result } = renderHook(() => useCandles(COIN_ID, Timeframe.Month));
    await waitFor(() =>
      expect(result.current.status).toBe(FetchStatus.Succeeded),
    );

    // Assert — three ranges total, so switching is instant
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  });

  it('switches range without a spinner once prefetched', async () => {
    // Arrange
    const fetchMock = mockFetch();
    const { result, rerender } = renderHook(
      ({ tf }) => useCandles(COIN_ID, tf),
      { initialProps: { tf: Timeframe.Month } },
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

    // Act
    rerender({ tf: Timeframe.Year });

    // Assert — the prefetch is why this never shows Loading
    expect(result.current.status).toBe(FetchStatus.Succeeded);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not refetch a range it already holds', async () => {
    // Arrange
    const fetchMock = mockFetch();
    const first = renderHook(() => useCandles(COIN_ID, Timeframe.Month));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    first.unmount();

    // Act — a second visit within the TTL
    const { result } = renderHook(() => useCandles(COIN_ID, Timeframe.Month));

    // Assert — served from cache, no spinner, no request
    expect(result.current.status).toBe(FetchStatus.Succeeded);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('refetches once the cached range has expired', async () => {
    // Arrange
    const fetchMock = mockFetch();
    const first = renderHook(() => useCandles(COIN_ID, Timeframe.Month));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    first.unmount();

    // Act — past the TTL
    clock += CACHE_TTL_MS + 1;
    const { result } = renderHook(() => useCandles(COIN_ID, Timeframe.Month));

    // Assert
    expect(result.current.status).toBe(FetchStatus.Loading);
    await waitFor(() =>
      expect(result.current.status).toBe(FetchStatus.Succeeded),
    );
    await settlePrefetch();
  });

  it('caches per coin, so a different coin still fetches', async () => {
    // Arrange
    const fetchMock = mockFetch();
    const first = renderHook(() => useCandles(COIN_ID, Timeframe.Month));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    first.unmount();

    // Act
    const { result } = renderHook(() =>
      useCandles('ethereum', Timeframe.Month),
    );

    // Assert
    expect(result.current.status).toBe(FetchStatus.Loading);
    await waitFor(() =>
      expect(result.current.status).toBe(FetchStatus.Succeeded),
    );
    await settlePrefetch();
  });

  it('goes back to loading when the coin changes mid-mount', async () => {
    // Arrange
    const fetchMock = mockFetch();
    const { result, rerender } = renderHook(
      ({ id }) => useCandles(id, Timeframe.Month),
      { initialProps: { id: COIN_ID } },
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

    // Act — same hook instance, different coin
    rerender({ id: 'ethereum' });

    // Assert — one coin's candles must never be shown as another's
    expect(result.current.status).toBe(FetchStatus.Loading);
    expect(result.current.candles).toBeUndefined();
    await waitFor(() =>
      expect(result.current.status).toBe(FetchStatus.Succeeded),
    );
    await settlePrefetch();
  });

  it('reports failure when the upstream rejects unrecoverably', async () => {
    // Arrange
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers(),
    }) as unknown as typeof fetch;

    // Act
    const { result } = renderHook(() => useCandles(COIN_ID, Timeframe.Month));

    // Assert
    await waitFor(() => expect(result.current.status).toBe(FetchStatus.Failed));
  });

  it('reports failure once the network has been given its retries', async () => {
    // Arrange
    globalThis.fetch = jest
      .fn()
      .mockRejectedValue(new Error('offline')) as unknown as typeof fetch;

    // Act
    const { result } = renderHook(() => useCandles(COIN_ID, Timeframe.Month));

    // Assert — retried before it is believed, so the failure lands a whole
    // backoff schedule after the throw
    await waitFor(
      () => expect(result.current.status).toBe(FetchStatus.Failed),
      {
        timeout: RETRY_SCHEDULE_MS,
      },
    );
  });

  it('does not cache a failed range, so a retry retries', async () => {
    // Arrange — a 404, not a throw: this is about what the cache keeps, and an
    // unretryable status gets there without waiting out the backoff
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers(),
    }) as unknown as typeof fetch;
    const failed = renderHook(() => useCandles(COIN_ID, Timeframe.Month));
    await waitFor(() =>
      expect(failed.result.current.status).toBe(FetchStatus.Failed),
    );
    failed.unmount();

    // Act — the upstream recovers
    const fetchMock = mockFetch();
    const { result } = renderHook(() => useCandles(COIN_ID, Timeframe.Month));

    // Assert
    await waitFor(() =>
      expect(result.current.status).toBe(FetchStatus.Succeeded),
    );
    expect(fetchMock).toHaveBeenCalled();
    await settlePrefetch();
  });

  it('keeps a range that loaded when another range fails', async () => {
    // Arrange — 1M answers, everything else 500s on every attempt
    const ok = { t: 1_700_000_000, o: '100', h: '110', l: '90', c: '105' };
    globalThis.fetch = jest.fn((url: string) =>
      String(url).includes('interval=1440')
        ? Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers(),
            json: async () => ({
              error: [],
              result: {
                XXBTZUSD: [[ok.t, ok.o, ok.h, ok.l, ok.c, '0', '0', 0]],
                last: 0,
              },
            }),
          })
        : Promise.resolve({ ok: false, status: 500, headers: new Headers() }),
    ) as unknown as typeof fetch;

    // Act
    const { result } = renderHook(() => useCandles(COIN_ID, Timeframe.Month));

    // Assert — a failed prefetch must not take down the range being viewed
    await waitFor(() =>
      expect(result.current.status).toBe(FetchStatus.Succeeded),
    );
    expect(result.current.candles).toHaveLength(1);
  });
});

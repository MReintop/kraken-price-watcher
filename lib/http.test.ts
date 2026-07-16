import { fetchWithRetry, retryDelayMs } from './http';

const throttled = {
  ok: false,
  status: 429,
  headers: { get: (): string | null => null },
};
const ok = {
  ok: true,
  status: 200,
  headers: { get: (): string | null => null },
};

// Answers only to its abort signal: a request that never comes back on its own.
const neverAnswers = (_url: string, init?: RequestInit) =>
  new Promise<never>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () =>
      reject(new Error('The operation was aborted')),
    );
  });

const throttledFor = (seconds: string) => ({
  ok: false,
  status: 429,
  headers: { get: () => seconds },
});

describe('retryDelayMs', () => {
  it('honours a Retry-After header over its own backoff', () => {
    // Arrange / Act
    const result = retryDelayMs(0, '3');

    // Assert
    expect(result).toBe(3000);
  });

  it('caps a Retry-After longer than anyone would wait out', () => {
    // Arrange / Act — ten minutes is a server asking for the whole session
    const result = retryDelayMs(0, '600');

    // Assert
    expect(result).toBe(30_000);
  });

  it('ignores a Retry-After that is not a positive number', () => {
    // Arrange / Act
    const result = retryDelayMs(0, 'later');

    // Assert
    expect(result).toBeGreaterThan(0);
    expect(Number.isFinite(result)).toBe(true);
  });

  it('grows with each attempt', () => {
    // Arrange — pin the jitter so only the backoff varies
    jest.spyOn(Math, 'random').mockReturnValue(0.5);

    // Act
    const first = retryDelayMs(0, null);
    const third = retryDelayMs(2, null);

    // Assert
    expect(third).toBeGreaterThan(first);
  });

  it('jitters, so simultaneous callers do not retry in lockstep', () => {
    // Arrange / Act — same attempt, different random draws
    jest.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(1);
    const low = retryDelayMs(1, null);
    const high = retryDelayMs(1, null);

    // Assert
    expect(high).toBeGreaterThan(low);
  });
});

describe('fetchWithRetry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('returns a successful response without retrying', async () => {
    // Arrange
    const fetchMock = jest.fn().mockResolvedValue(ok);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    // Act
    await fetchWithRetry('https://example.test', {});

    // Assert
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a throttled request and returns the eventual success', async () => {
    // Arrange
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(throttled)
      .mockResolvedValueOnce(ok);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    // Act
    const pending = fetchWithRetry('https://example.test', {});
    await jest.advanceTimersByTimeAsync(5_000);

    // Assert
    await expect(pending).resolves.toMatchObject({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up after a bounded number of attempts', async () => {
    // Arrange
    const fetchMock = jest.fn().mockResolvedValue(throttled);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    // Act
    const pending = fetchWithRetry('https://example.test', {});
    await jest.advanceTimersByTimeAsync(60_000);
    await pending;

    // Assert — bounded, so a dead upstream cannot hang the screen forever
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('does not retry a client error it cannot recover from', async () => {
    // Arrange
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: { get: (): string | null => null },
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    // Act
    const pending = fetchWithRetry('https://example.test', {});
    await jest.advanceTimersByTimeAsync(60_000);
    await pending;

    // Assert — retrying a 404 only wastes the user's time
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a server error', async () => {
    // Arrange
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        headers: { get: (): string | null => null },
      })
      .mockResolvedValueOnce(ok);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    // Act
    const pending = fetchWithRetry('https://example.test', {});
    await jest.advanceTimersByTimeAsync(5_000);
    await pending;

    // Assert
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries an attempt that ran out of time', async () => {
    // Arrange — the first attempt never answers, so only the deadline ends it
    const fetchMock = jest
      .fn()
      .mockImplementationOnce(neverAnswers)
      .mockResolvedValueOnce(ok);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    // Act
    const pending = fetchWithRetry('https://example.test', {});
    await jest.advanceTimersByTimeAsync(20_000);

    // Assert — the deadline is per attempt: a slow first try is not the whole call
    await expect(pending).resolves.toMatchObject({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries a dropped connection', async () => {
    // Arrange
    const fetchMock = jest
      .fn()
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce(ok);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    // Act
    const pending = fetchWithRetry('https://example.test', {});
    await jest.advanceTimersByTimeAsync(5_000);

    // Assert
    await expect(pending).resolves.toMatchObject({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('stays bounded when every attempt times out', async () => {
    // Arrange
    const fetchMock = jest.fn().mockImplementation(neverAnswers);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    // Act
    const pending = fetchWithRetry('https://example.test', {});
    const settled = expect(pending).rejects.toThrow('timed out');
    await jest.advanceTimersByTimeAsync(120_000);

    // Assert
    await settled;
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('does not retry a caller who has walked away', async () => {
    // Arrange
    const controller = new AbortController();
    const fetchMock = jest.fn().mockImplementation(neverAnswers);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    // Act
    const pending = fetchWithRetry('https://example.test', {
      signal: controller.signal,
    });
    const settled = expect(pending).rejects.toThrow('Request aborted');
    controller.abort();
    await settled;

    // Assert — an abort is a decision, not a failure to retry
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gives up on a Retry-After wait once the caller aborts', async () => {
    // Arrange — two minutes is long enough to outlive the screen that asked
    const controller = new AbortController();
    const fetchMock = jest.fn().mockResolvedValue(throttledFor('120'));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    // Act
    const pending = fetchWithRetry('https://example.test', {
      signal: controller.signal,
    });
    const settled = expect(pending).rejects.toThrow('Request aborted');
    await jest.advanceTimersByTimeAsync(0);
    controller.abort();
    await settled;

    // Assert — the wait ends with the caller, not with the server's schedule
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

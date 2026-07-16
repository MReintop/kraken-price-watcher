const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 500;

// Per attempt, not for the whole call: a request that will never answer should
// not hold a spinner forever, and without this there is no deadline at all —
// fetch waits as long as the socket stays open.
const ATTEMPT_TIMEOUT_MS = 10_000;

// A server can ask for a longer wait than anyone will sit through.
const MAX_RETRY_AFTER_MS = 30_000;

export class AbortedError extends Error {
  constructor() {
    super('Request aborted');
    this.name = 'AbortedError';
  }
}

// Waiting is part of the request, so the caller's signal has to reach it: an
// unabortable sleep honours a Retry-After long after the screen is gone.
const sleep = (ms: number, signal?: AbortSignal | null) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new AbortedError());
    const settle = (finish: () => void) => () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      finish();
    };
    const onAbort = settle(() => reject(new AbortedError()));
    const timer = setTimeout(settle(resolve), ms);
    signal?.addEventListener('abort', onAbort);
  });

const isRetryable = (status: number) => status === 429 || status >= 500;

// Jitter, not just backoff: several screens can ask at once, and an unjittered
// retry would re-collide with the same siblings on every attempt.
//
// Only the delta-seconds form of Retry-After is read; the HTTP-date form parses
// as NaN and falls through to the backoff.
export function retryDelayMs(attempt: number, retryAfter: string | null) {
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
  }
  const backoff = BASE_DELAY_MS * 2 ** attempt;
  return backoff / 2 + Math.random() * backoff;
}

// Built from AbortController rather than AbortSignal.timeout/any: neither exists
// in jsdom, and neither is safe to assume on Hermes.
//
// Both the deadline and the caller abort this one signal, so the reason is
// recorded here: downstream they are the same error, and only one may be retried.
async function fetchOnce(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, ATTEMPT_TIMEOUT_MS);
  const abort = () => controller.abort();
  init?.signal?.addEventListener('abort', abort);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (init?.signal?.aborted) throw new AbortedError();
    if (timedOut)
      throw new Error(`Request timed out after ${ATTEMPT_TIMEOUT_MS}ms`);
    throw error;
  } finally {
    clearTimeout(timer);
    init?.signal?.removeEventListener('abort', abort);
  }
}

// Retries only what a retry can fix. A 404 retried four times just wastes time,
// and a caller who walked away is not asking to be tried harder.
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    if (init?.signal?.aborted) throw new AbortedError();
    const lastAttempt = attempt >= MAX_ATTEMPTS - 1;

    let response: Response;
    try {
      response = await fetchOnce(url, init);
    } catch (error) {
      // A timeout or a dropped connection is exactly what a retry is for.
      if (error instanceof AbortedError || lastAttempt) throw error;
      await sleep(retryDelayMs(attempt, null), init?.signal);
      continue;
    }

    if (response.ok || lastAttempt || !isRetryable(response.status)) {
      return response;
    }
    await sleep(
      retryDelayMs(attempt, response.headers.get('retry-after')),
      init?.signal,
    );
  }
}

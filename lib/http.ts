const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 500;

// Per attempt, not for the whole call: a request that will never answer should
// not hold a spinner forever, and without this there is no deadline at all —
// fetch waits as long as the socket stays open.
const ATTEMPT_TIMEOUT_MS = 10_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryable = (status: number) => status === 429 || status >= 500;

// Jitter, not just backoff: several screens can ask at once, and an unjittered
// retry would re-collide with the same siblings on every attempt.
export function retryDelayMs(attempt: number, retryAfter: string | null) {
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  const backoff = BASE_DELAY_MS * 2 ** attempt;
  return backoff / 2 + Math.random() * backoff;
}

// Built from AbortController rather than AbortSignal.timeout/any: neither exists
// in jsdom, and neither is safe to assume on Hermes.
//
// The deadline is per attempt, so a slow first try is still retried rather than
// failing the lot; the caller's signal cancels the whole call.
async function fetchOnce(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
  const abort = () => controller.abort();
  init?.signal?.addEventListener('abort', abort);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    init?.signal?.removeEventListener('abort', abort);
  }
}

// Retries only what a retry can fix. A 404 retried four times just wastes time.
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    if (init?.signal?.aborted) throw new Error('Request aborted');

    const response = await fetchOnce(url, init);
    const lastAttempt = attempt >= MAX_ATTEMPTS - 1;
    if (response.ok || lastAttempt || !isRetryable(response.status)) {
      return response;
    }
    await sleep(retryDelayMs(attempt, response.headers.get('retry-after')));
  }
}

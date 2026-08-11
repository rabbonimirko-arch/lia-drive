export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
}
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 180;
  const maxDelayMs = options.maxDelayMs ?? 2000;
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const retryAllowed = options.shouldRetry ? options.shouldRetry(error) : true;
      if (!retryAllowed || attempt === attempts - 1) break;
      const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      const jitter = Math.floor(Math.random() * Math.max(1, exponential * 0.2));
      await new Promise((resolve) => setTimeout(resolve, exponential + jitter));
    }
  }
  throw lastError;
}
export function retryFetch(url: string | URL, init?: RequestInit): Promise<Response> {
  return withRetry(
    async () => {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
      if (response.status === 429 || response.status >= 500)
        throw new Error('Upstream request failed with ' + response.status);
      return response;
    },
    { attempts: 3 },
  );
}

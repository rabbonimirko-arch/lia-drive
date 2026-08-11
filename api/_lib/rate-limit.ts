import type { VercelRequest } from './vercel-types.js';
import { ApiError } from './errors.js';
import { getSupabaseAdmin } from './supabase.js';
const buckets = new Map<string, { count: number; resetAt: number }>();
function clientKey(request: VercelRequest): string {
  const forwarded = request.headers['x-forwarded-for'];
  const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]?.trim();
  return [ip ?? request.socket.remoteAddress ?? 'unknown', request.url ?? '/'].join(':');
}
export async function enforceRateLimit(
  request: VercelRequest,
  limit: number,
  windowSeconds: number,
): Promise<void> {
  const key = clientKey(request);
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase.rpc('consume_rate_limit', {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (!error && data === false) throw new ApiError(429, 'Rate limit exceeded', 'rate_limited');
    if (!error) return;
  }
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) throw new ApiError(429, 'Rate limit exceeded', 'rate_limited');
}
export function resetRateLimitsForTests(): void {
  buckets.clear();
}

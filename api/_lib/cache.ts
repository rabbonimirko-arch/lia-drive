import type { ServiceEnvelope } from './types';
import { getSupabaseAdmin } from './supabase';
interface MemoryEntry {
  value: unknown;
  expiresAt: number;
}
const memoryCache = new Map<string, MemoryEntry>();
export async function getCached<T>(key: string): Promise<ServiceEnvelope<T> | null> {
  const now = Date.now();
  const memory = memoryCache.get(key);
  if (memory && memory.expiresAt > now) return memory.value as ServiceEnvelope<T>;
  if (memory) memoryCache.delete(key);
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('cached_feeds')
    .select('payload,expires_at')
    .eq('cache_key', key)
    .maybeSingle();
  if (error || !data || new Date(data.expires_at).getTime() <= now) return null;
  const envelope = data.payload as ServiceEnvelope<T>;
  memoryCache.set(key, { value: envelope, expiresAt: new Date(data.expires_at).getTime() });
  return envelope;
}
export async function setCached<T>(key: string, envelope: ServiceEnvelope<T>): Promise<void> {
  const expiresAt = new Date(envelope.expiresAt).getTime();
  memoryCache.set(key, { value: envelope, expiresAt });
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  await supabase.from('cached_feeds').upsert({
    cache_key: key,
    payload: envelope,
    source: envelope.source,
    expires_at: envelope.expiresAt,
    refreshed_at: envelope.fetchedAt,
  });
}
export async function cachedService<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<{
    data: T;
    source: string;
    quality?: ServiceEnvelope<T>['quality'];
    warning?: string;
  }>,
  force = false,
): Promise<ServiceEnvelope<T>> {
  if (!force) {
    const cached = await getCached<T>(key);
    if (cached) return { ...cached, quality: 'cached' };
  }
  const result = await loader();
  const fetchedAt = new Date();
  const envelope: ServiceEnvelope<T> = {
    data: result.data,
    source: result.source,
    quality: result.quality ?? 'live',
    fetchedAt: fetchedAt.toISOString(),
    expiresAt: new Date(fetchedAt.getTime() + ttlSeconds * 1000).toISOString(),
    warning: result.warning,
  };
  await setCached(key, envelope);
  return envelope;
}
export function resetMemoryCacheForTests(): void {
  memoryCache.clear();
}

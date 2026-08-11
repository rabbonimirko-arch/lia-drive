import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getTraffic } from '../../api/_lib/traffic-service';
import { resetConfigForTests } from '../../api/_lib/config';
import { resetMemoryCacheForTests } from '../../api/_lib/cache';
describe('traffic fallback', () => {
  beforeEach(() => {
    delete process.env.TOMTOM_API_KEY;
    process.env.NODE_ENV = 'test';
    resetConfigForTests();
    resetMemoryCacheForTests();
  });
  afterEach(() => {
    resetConfigForTests();
    resetMemoryCacheForTests();
  });
  it('returns a clearly labelled estimate without a provider key', async () => {
    const result = await getTraffic({ lat: 41.9028, lon: 12.4964 }, true);
    expect(result.quality).toBe('estimated');
    expect(result.source).toBe('lia-time-profile');
    expect(result.warning).toContain('TOMTOM_API_KEY');
    expect(result.data.currentSpeedKmh).toBeTypeOf('number');
  });
});

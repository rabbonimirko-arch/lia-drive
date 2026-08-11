import { beforeEach, describe, expect, it } from 'vitest';
import { createMocks } from 'node-mocks-http';
import handler from '../../api/preferences';
import { resetConfigForTests } from '../../api/_lib/config';
import { resetRateLimitsForTests } from '../../api/_lib/rate-limit';
describe('preferences API', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    resetConfigForTests();
    resetRateLimitsForTests();
  });
  it('returns useful anonymous defaults', async () => {
    const { req, res } = createMocks({ method: 'GET', url: '/api/preferences' });
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res._getData());
    expect(payload.authenticated).toBe(false);
    expect(payload.data.language).toBe('it');
    expect(payload.data.interests).toContain('storia');
  });
});

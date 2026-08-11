import { beforeEach, describe, expect, it } from 'vitest';
import { createMocks } from 'node-mocks-http';
import handler from '../../api/health';
import { resetConfigForTests } from '../../api/_lib/config';
import { resetRateLimitsForTests } from '../../api/_lib/rate-limit';
describe('GET /api/health', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
    resetConfigForTests();
    resetRateLimitsForTests();
  });
  it('returns runtime and integration status', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      url: '/api/health',
      headers: { origin: 'http://localhost:3000' },
    });
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res._getData());
    expect(payload.status).toBe('ok');
    expect(payload.version).toBe('1.0.0');
    expect(res.getHeader('access-control-allow-origin')).toBe('http://localhost:3000');
  });
  it('rejects unsupported methods', async () => {
    const { req, res } = createMocks({ method: 'POST', url: '/api/health' });
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(405);
  });
});

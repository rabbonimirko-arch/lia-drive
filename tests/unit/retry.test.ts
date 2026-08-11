import { describe, expect, it, vi } from 'vitest';
import { withRetry } from '../../api/_lib/retry';
describe('withRetry', () => {
  it('retries transient failures and returns the value', async () => {
    const operation = vi.fn().mockRejectedValueOnce(new Error('temporary')).mockResolvedValue('ok');
    await expect(withRetry(operation, { attempts: 2, baseDelayMs: 1 })).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });
  it('stops after the configured attempts', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('down'));
    await expect(withRetry(operation, { attempts: 2, baseDelayMs: 1 })).rejects.toThrow('down');
    expect(operation).toHaveBeenCalledTimes(2);
  });
});

import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from './vercel-types.js';
import { ZodError, type ZodType } from 'zod';
import { getConfig } from './config.js';
import { log } from './logger.js';
import { enforceRateLimit } from './rate-limit.js';
import { ApiError } from './errors.js';
export type ApiHandler = (
  request: VercelRequest,
  response: VercelResponse,
  context: { requestId: string },
) => Promise<void> | void;
function originAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  const allowed = getConfig()
    .ALLOWED_ORIGINS.split(',')
    .map((value) => value.trim());
  return allowed.includes('*') || allowed.includes(origin);
}
export function setCors(request: VercelRequest, response: VercelResponse): void {
  const origin = typeof request.headers.origin === 'string' ? request.headers.origin : undefined;
  if (origin && originAllowed(origin)) response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Vary', 'Origin');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization,Content-Type,X-LIA-API-Key,X-Admin-Key',
  );
  response.setHeader('Access-Control-Max-Age', '86400');
}
export function sendJson(response: VercelResponse, status: number, body: unknown): void {
  response.status(status).json(body);
}
export function queryValue(request: VercelRequest, key: string): string | undefined {
  const value = request.query[key];
  return Array.isArray(value) ? value[0] : value;
}
export function parseBody<T>(request: VercelRequest, schema: ZodType<T>): T {
  const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
  return schema.parse(body ?? {});
}
export function parseQuery<T>(request: VercelRequest, schema: ZodType<T>): T {
  const normalized = Object.fromEntries(
    Object.entries(request.query).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  );
  return schema.parse(normalized);
}
export function requireMethod(request: VercelRequest, allowed: string[]): void {
  if (!request.method || !allowed.includes(request.method))
    throw new ApiError(
      405,
      'Method ' + (request.method ?? 'unknown') + ' not allowed',
      'method_not_allowed',
    );
}
export function withApi(
  handler: ApiHandler,
  options: { rateLimit?: number; rateWindowSeconds?: number } = {},
) {
  return async function wrapped(request: VercelRequest, response: VercelResponse): Promise<void> {
    const requestId = (request.headers['x-request-id'] as string | undefined) ?? randomUUID();
    response.setHeader('X-Request-Id', requestId);
    setCors(request, response);
    if (request.method === 'OPTIONS') {
      response.status(204).end();
      return;
    }
    try {
      await enforceRateLimit(request, options.rateLimit ?? 90, options.rateWindowSeconds ?? 60);
      await handler(request, response, { requestId });
    } catch (error) {
      const apiError =
        error instanceof ApiError
          ? error
          : error instanceof ZodError
            ? new ApiError(400, 'Invalid request', 'validation_error', error.flatten())
            : error instanceof SyntaxError
              ? new ApiError(400, 'Malformed JSON body', 'invalid_json')
              : new ApiError(500, 'Internal server error', 'internal_error');
      log({
        level: apiError.status >= 500 ? 'error' : 'warn',
        message: apiError.message,
        requestId,
        error,
        metadata: { code: apiError.code },
      });
      if (!response.headersSent)
        sendJson(response, apiError.status, {
          error: { code: apiError.code, message: apiError.message, details: apiError.details },
          requestId,
        });
    }
  };
}

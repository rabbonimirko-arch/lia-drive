import { createSecretKey } from 'node:crypto';
import type { VercelRequest } from './vercel-types';
import { jwtVerify } from 'jose';
import type { AuthIdentity } from './types';
import { ApiError } from './errors';
import { getConfig } from './config';
import { getSupabasePublic } from './supabase';
function bearerToken(request: VercelRequest): string | undefined {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  return header.slice('Bearer '.length).trim();
}
export async function authenticate(
  request: VercelRequest,
  required = false,
): Promise<AuthIdentity | null> {
  const token = bearerToken(request);
  if (!token) {
    if (required) throw new ApiError(401, 'Authentication required', 'authentication_required');
    return null;
  }
  const supabase = getSupabasePublic();
  if (supabase) {
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data.user)
      return { userId: data.user.id, email: data.user.email, provider: 'supabase' };
  }
  const secret = getConfig().JWT_SECRET;
  if (secret) {
    try {
      const { payload } = await jwtVerify(token, createSecretKey(Buffer.from(secret)), {
        algorithms: ['HS256'],
      });
      if (typeof payload.sub === 'string')
        return {
          userId: payload.sub,
          email: typeof payload.email === 'string' ? payload.email : undefined,
          provider: 'local-jwt',
        };
    } catch {
      throw new ApiError(401, 'Invalid or expired token', 'invalid_token');
    }
  }
  throw new ApiError(401, 'Invalid or expired token', 'invalid_token');
}
export function requireAdmin(request: VercelRequest): void {
  const configured = getConfig().ADMIN_API_KEY;
  const supplied = request.headers['x-admin-key'];
  if (!configured || supplied !== configured)
    throw new ApiError(403, 'Admin authorization required', 'admin_required');
}

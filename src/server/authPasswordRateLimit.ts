import { sha256Base64Url } from '../auth/authCrypto';
import type { D1Database } from './d1';

/** Persistent pre-auth counters never store passwords, raw email or IP. */
export async function consumeAuthPasswordRateLimit(database: D1Database, request: Request, identifier: string, now = Date.now(), purpose: 'login' | 'reset' | 'reset-action' | 'email-verification' | 'email-action' | 'account-deletion' = 'login') {
  const windowStart = Math.floor(now / 600_000) * 600_000;
  const ip = request.headers.get('cf-connecting-ip')?.slice(0, 100) ?? 'shared-local';
  const prefix = purpose === 'login' ? 'hanzi' : `hanzi-${purpose}`;
  const action = purpose === 'reset-action' || purpose === 'email-action' || purpose === 'account-deletion';
  const normalized = action ? identifier : identifier.trim().toLowerCase();
  const limits = action ? [20, 8] : purpose === 'login' ? [30, 10] : [10, 3];
  const keys = await Promise.all([sha256Base64Url(`${prefix}-ip:${ip}`), sha256Base64Url(`${prefix}-id:${normalized}`)]);
  const results = await database.batch(keys.map((key, index) => database.prepare(`INSERT INTO auth_login_rate_limits(key_hash,window_start,request_count,updated_at)
    VALUES(?,?,1,?) ON CONFLICT(key_hash) DO UPDATE SET window_start=excluded.window_start,
    request_count=CASE WHEN auth_login_rate_limits.window_start=excluded.window_start THEN auth_login_rate_limits.request_count+1 ELSE 1 END,
    updated_at=excluded.updated_at WHERE excluded.window_start>auth_login_rate_limits.window_start
    OR (excluded.window_start=auth_login_rate_limits.window_start AND auth_login_rate_limits.request_count<?)`)
    .bind(key, windowStart, now, limits[index]!)));
  if (results.some(result => !result.success)) throw new Error('Authentication rate limit unavailable.');
  return results.every(result => (result.meta?.changes ?? 0) === 1);
}

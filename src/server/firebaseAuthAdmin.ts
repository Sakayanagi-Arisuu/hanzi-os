import { bytesToBase64Url, toArrayBuffer } from '../auth/authCrypto';
import { readBoundedRequestText } from './boundedRequestBody';
import { SyncBackendUnavailableError } from './d1';

/** Server-only, project-scoped identity administration. Never send this config to a client. */
export type FirebaseAuthAdminConfig = {
  projectId: string; clientEmail: string; privateKey: string; privateKeyId: string;
};
export type FirebaseCredentialState = {
  uid: string; email: string; emailVerified: boolean; disabled: boolean;
  passwordUpdatedAt: number; validSince: number;
};
export class FirebaseAuthAdminUnavailableError extends SyncBackendUnavailableError {}
const unavailable = () => new FirebaseAuthAdminUnavailableError('Account administration unavailable.');
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const PROJECT = /^[a-z][a-z0-9-]{4,62}$/u;
const UID = /^[A-Za-z0-9_-]{1,128}$/u;

export function firebaseAuthAdminConfig(projectId: string | undefined, serviceAccountJson: string | undefined): FirebaseAuthAdminConfig | null {
  if (!projectId || !PROJECT.test(projectId) || !serviceAccountJson || serviceAccountJson.length > 16_384) return null;
  try {
    const source = record(JSON.parse(serviceAccountJson));
    if (source.type !== 'service_account' || source.project_id !== projectId
      || typeof source.client_email !== 'string'
      || !source.client_email.endsWith(`@${projectId}.iam.gserviceaccount.com`)
      || !/^[a-z0-9._-]+@[a-z0-9.-]+$/u.test(source.client_email)
      || source.token_uri !== 'https://oauth2.googleapis.com/token'
      || typeof source.private_key !== 'string' || source.private_key.length > 8_192
      || !/^-----BEGIN PRIVATE KEY-----\n[A-Za-z0-9+/=\n]+\n-----END PRIVATE KEY-----\n?$/u.test(source.private_key)
      || typeof source.private_key_id !== 'string' || !/^[a-f0-9]{40}$/u.test(source.private_key_id)) return null;
    return { projectId, clientEmail: source.client_email, privateKey: source.private_key, privateKeyId: source.private_key_id };
  } catch { return null; }
}

async function boundedJson(response: Response): Promise<Record<string, unknown>> {
  if (response.status >= 300 && response.status < 400
    || response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json') throw unavailable();
  const bounded = await readBoundedRequestText(new Request('https://reply.invalid', {
    method: 'POST', body: response.body, duplex: 'half',
  } as RequestInit), 65_536);
  if (!bounded.ok) throw unavailable();
  try { return record(JSON.parse(bounded.text)); } catch { throw unavailable(); }
}

/** No endpoint, UID, email, key, token or raw provider error enters diagnostics. */
export class FirebaseAuthAdmin {
  private token: { value: string; expiresAt: number } | null = null;
  constructor(private readonly config: FirebaseAuthAdminConfig, private readonly fetcher: typeof fetch = fetch,
    private readonly now: () => number = Date.now) {}

  private async post(url: string, body: BodyInit, headers: HeadersInit) {
    try {
      return await this.fetcher(url, { method: 'POST', redirect: 'manual',
        signal: AbortSignal.timeout(12_000), headers, body });
    } catch { throw unavailable(); }
  }

  private async accessToken() {
    if (this.token && this.token.expiresAt > this.now() + 60_000) return this.token.value;
    const iat = Math.floor(this.now() / 1000);
    const encode = (value: unknown) => bytesToBase64Url(new TextEncoder().encode(JSON.stringify(value)));
    const signingInput = `${encode({ alg: 'RS256', typ: 'JWT', kid: this.config.privateKeyId })}.${encode({
      iss: this.config.clientEmail, aud: 'https://oauth2.googleapis.com/token',
      scope: 'https://www.googleapis.com/auth/identitytoolkit', iat, exp: iat + 3600,
    })}`;
    let assertion: string;
    try {
      const pem = this.config.privateKey.replace(/-----[^-]+-----|\s/gu, '');
      const bytes = Uint8Array.from(atob(pem), character => character.charCodeAt(0));
      const key = await crypto.subtle.importKey('pkcs8', toArrayBuffer(bytes),
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
      const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signingInput));
      assertion = `${signingInput}.${bytesToBase64Url(new Uint8Array(signature))}`;
    } catch { throw unavailable(); }
    const response = await this.post('https://oauth2.googleapis.com/token', new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion,
    }), { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' });
    const body = await boundedJson(response);
    if (!response.ok || typeof body.access_token !== 'string' || body.access_token.length < 20 || body.access_token.length > 8192
      || body.token_type !== 'Bearer' || typeof body.expires_in !== 'number' || body.expires_in < 120 || body.expires_in > 3600) throw unavailable();
    this.token = { value: body.access_token, expiresAt: this.now() + body.expires_in * 1000 };
    return this.token.value;
  }

  private async accountRequest(operation: 'lookup' | 'delete', uid: string) {
    if (!UID.test(uid)) throw unavailable();
    const response = await this.post(`https://identitytoolkit.googleapis.com/v1/projects/${this.config.projectId}/accounts:${operation}`,
      JSON.stringify({ localId: operation === 'lookup' ? [uid] : uid }), {
        'content-type': 'application/json', accept: 'application/json', authorization: `Bearer ${await this.accessToken()}`,
      });
    const body = await boundedJson(response);
    if (!response.ok) {
      // A deletion retry may find that the prior request already succeeded.
      if (operation === 'delete' && response.status === 400 && record(body.error).message === 'USER_NOT_FOUND') return {};
      throw unavailable();
    }
    return body;
  }

  async lookup(uid: string): Promise<FirebaseCredentialState | null> {
    const body = await this.accountRequest('lookup', uid);
    if (body.users === undefined || Array.isArray(body.users) && body.users.length === 0) return null;
    if (!Array.isArray(body.users) || body.users.length !== 1) throw unavailable();
    const user = record(body.users[0]);
    const passwordUpdatedAt = user.passwordUpdatedAt;
    const validSince = typeof user.validSince === 'string' && /^\d{1,12}$/u.test(user.validSince) ? Number(user.validSince) : NaN;
    const email = typeof user.email === 'string' ? user.email.trim().toLowerCase() : '';
    if (user.localId !== uid || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) || email.length > 254
      || typeof passwordUpdatedAt !== 'number' || !Number.isSafeInteger(passwordUpdatedAt) || passwordUpdatedAt < 0
      || !Number.isSafeInteger(validSince) || validSince < 0
      || !Array.isArray(user.providerUserInfo) || !user.providerUserInfo.some(value => record(value).providerId === 'password')) throw unavailable();
    return { uid, email, passwordUpdatedAt, validSince, emailVerified: user.emailVerified === true, disabled: user.disabled === true };
  }

  /** Call only after the owner-bound deletion ceremony has been persisted. */
  async delete(uid: string): Promise<void> { await this.accountRequest('delete', uid); }
}

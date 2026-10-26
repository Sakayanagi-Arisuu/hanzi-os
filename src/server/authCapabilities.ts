import type { AuthCapabilities } from '../auth/authCapabilities';
import { facebookConfig, firebasePasswordConfig, githubConfig, googleConfig, isLocalDevelopmentAuth, type AuthRuntimeEnvironment } from './authHttp';

const configured = (check: () => unknown) => { try { check(); return true; } catch { return false; } };
export function authenticationCapabilities(environment: AuthRuntimeEnvironment, request: Request): AuthCapabilities {
  const local = isLocalDevelopmentAuth(request.url, environment.AUTH_DEV_HANZI_DEMOS);
  return {
    google: configured(() => googleConfig(environment, request)),
    googleNative: { enabled: environment.GOOGLE_NATIVE_ENABLED === '1' && configured(() => googleConfig(environment, request)),
      serverClientId: environment.GOOGLE_NATIVE_ENABLED === '1' ? environment.GOOGLE_CLIENT_ID?.trim() ?? null : null },
    github: configured(() => githubConfig(environment, request)),
    hanzi: environment.HANZI_HOSTING_PROVIDER === 'cloudflare' ? Boolean(firebasePasswordConfig(environment)) : local,
    hanziPasswordReset: environment.HANZI_HOSTING_PROVIDER === 'cloudflare' && Boolean(firebasePasswordConfig(environment)),
    facebook: configured(() => facebookConfig(environment, request)),
    emailOtp: Boolean(environment.AUTH_EMAIL_SENDER) || isLocalDevelopmentAuth(request.url, environment.AUTH_DEV_EMAIL_OTP),
    passkey: new URL(request.url).protocol === 'https:' || local,
  };
}

import { getAuthenticatedUser, type ChatGPTUser } from "../../app/chatgpt-auth";
import {
  AuthRepository,
  clearSessionCookie,
  hasRecentAuthentication,
  readCookieValue,
  SESSION_COOKIE_NAME,
  serializeSessionCookie,
  type NativeSessionUser,
} from "./authRepository";
import {
  getD1Database,
  getRuntimeEnvironment,
  type D1Database,
} from "./d1";
import { SyncRepository } from "./syncRepository";
import type { GoogleOAuthConfig } from "./googleIdentity";

export const AUTH_JSON_HEADERS = {
  "cache-control": "private, no-store, max-age=0",
  pragma: "no-cache",
  expires: "0",
  "x-robots-tag": "noindex, nofollow",
};

export type AuthRuntimeEnvironment = {
  DB?: D1Database;
  AUTH_ALLOWED_ORIGIN?: string;
  AUTH_RP_ID?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  AUTH_DEV_EMAIL_OTP?: string;
  AUTH_EMAIL_SENDER?: {
    send(message: {
      to: string;
      subject: string;
      text: string;
    }): Promise<void>;
  };
};

export const authError = (
  status: number,
  code: string,
  message: string,
  headers?: HeadersInit,
) => Response.json(
  { error: { code, message } },
  { status, headers: { ...AUTH_JSON_HEADERS, ...headers } },
);

export function sameOriginMutation(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin;
}
export function boundedReturnTo(value: string | null, fallback = "/") {
  if (!value || value.length > 500) return fallback;
  try {
    const url = new URL(value, "https://app.local");
    if (url.origin !== "https://app.local" || url.pathname.startsWith("/auth/")) {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export async function loadAuthRuntime() {
  const [database, environment] = await Promise.all([
    getD1Database(),
    getRuntimeEnvironment<AuthRuntimeEnvironment>(),
  ]);
  return { database, environment, repository: new AuthRepository(database) };
}

export function googleConfig(
  environment: AuthRuntimeEnvironment,
  request: Request,
): GoogleOAuthConfig {
  const clientId = environment.GOOGLE_CLIENT_ID?.trim();
  const configuredRedirect = environment.GOOGLE_REDIRECT_URI?.trim();
  const exactCallback = `${new URL(request.url).origin}/auth/google/callback`;
  if (!clientId || !configuredRedirect || configuredRedirect !== exactCallback) {
    throw new Error("Google sign-in is not configured for this exact callback URI.");
  }
  return {
    clientId,
    clientSecret: environment.GOOGLE_CLIENT_SECRET?.trim() || null,
    redirectUri: configuredRedirect,
  };
}

export function relyingPartyConfig(
  environment: AuthRuntimeEnvironment,
  request: Request,
) {
  const url = new URL(request.url);
  const allowedOrigin = environment.AUTH_ALLOWED_ORIGIN?.trim() || url.origin;
  if (allowedOrigin !== url.origin) {
    throw new Error("Authentication origin does not match configuration.");
  }
  const rpId = environment.AUTH_RP_ID?.trim() || url.hostname;
  if (rpId !== url.hostname && !url.hostname.endsWith(`.${rpId}`)) {
    throw new Error("Passkey RP ID is outside the request origin.");
  }
  return { origin: allowedOrigin, rpId };
}

export async function resolveCurrentAccount(
  database: D1Database,
  recent = false,
): Promise<{ identity: ChatGPTUser; userId: string } | null> {
  const identity = await getAuthenticatedUser();
  if (!identity) return null;
  if (recent && identity.authenticatedAt !== undefined && !hasRecentAuthentication(
    identity as NativeSessionUser,
  )) {
    return null;
  }
  return {
    identity,
    userId: await new SyncRepository(database).resolveUser(identity),
  };
}

export function recentFirstPartySession(identity: ChatGPTUser | null) {
  if (
    !identity?.userId
    || !identity.sessionId
    || identity.authenticatedAt === undefined
    || !hasRecentAuthentication(identity as NativeSessionUser)
  ) {
    return null;
  }
  return {
    userId: identity.userId,
    sessionId: identity.sessionId,
    authenticatedAt: identity.authenticatedAt,
  };
}

export async function resolveRequestSession(
  request: Request,
  repository: AuthRepository,
) {
  const token = readCookieValue(request.headers.get("cookie"), SESSION_COOKIE_NAME);
  return token ? repository.resolveSession(token) : null;
}

export function sessionResponseHeaders(token: string): HeadersInit {
  return {
    ...AUTH_JSON_HEADERS,
    "set-cookie": serializeSessionCookie(token),
  };
}

export function clearedSessionResponseHeaders(): HeadersInit {
  return { ...AUTH_JSON_HEADERS, "set-cookie": clearSessionCookie() };
}

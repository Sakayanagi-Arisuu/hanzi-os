import {
  base64UrlToBytes,
  bytesToBase64Url,
  constantTimeEqual,
  toArrayBuffer,
} from "../auth/authCrypto";

const GOOGLE_AUTHORIZATION_ENDPOINT =
  "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS_ENDPOINT = "https://www.googleapis.com/oauth2/v3/certs";

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string | null;
  redirectUri: string;
};

export type GoogleIdentity = {
  providerSubject: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
};

type GoogleIdTokenClaims = {
  iss?: unknown;
  aud?: unknown;
  azp?: unknown;
  exp?: unknown;
  iat?: unknown;
  nonce?: unknown;
  sub?: unknown;
  email?: unknown;
  email_verified?: unknown;
  name?: unknown;
};

const decodeJsonSegment = <T>(value: string): T =>
  JSON.parse(new TextDecoder().decode(base64UrlToBytes(value))) as T;

export function googleAuthorizationUrl(input: {
  config: GoogleOAuthConfig;
  state: string;
  nonce: string;
  codeChallenge: string;
}) {
  const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
  url.searchParams.set("client_id", input.config.clientId);
  url.searchParams.set("redirect_uri", input.config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", input.state);
  url.searchParams.set("nonce", input.nonce);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export async function exchangeGoogleAuthorizationCode(input: {
  config: GoogleOAuthConfig;
  code: string;
  codeVerifier: string;
  nonce: string;
  fetcher?: typeof fetch;
}): Promise<GoogleIdentity> {
  const fetcher = input.fetcher ?? fetch;
  const form = new URLSearchParams({
    code: input.code,
    client_id: input.config.clientId,
    redirect_uri: input.config.redirectUri,
    grant_type: "authorization_code",
    code_verifier: input.codeVerifier,
  });
  if (input.config.clientSecret) {
    form.set("client_secret", input.config.clientSecret);
  }
  const response = await fetcher(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form,
  });
  if (!response.ok) throw new Error("Google authorization code exchange failed.");
  const body: unknown = await response.json();
  const idToken = body && typeof body === "object"
    ? (body as { id_token?: unknown }).id_token
    : null;
  if (typeof idToken !== "string") {
    throw new Error("Google did not return an identity token.");
  }
  return verifyGoogleIdToken({
    idToken,
    clientId: input.config.clientId,
    nonce: input.nonce,
    fetcher,
  });
}

export async function verifyGoogleIdToken(input: {
  idToken: string;
  clientId: string;
  nonce: string;
  fetcher?: typeof fetch;
  nowSeconds?: number;
}): Promise<GoogleIdentity> {
  const segments = input.idToken.split(".");
  if (segments.length !== 3) throw new Error("Google identity token is invalid.");
  const [encodedHeader = "", encodedClaims = "", encodedSignature = ""] = segments;
  const header = decodeJsonSegment<{ alg?: unknown; kid?: unknown }>(encodedHeader);
  if (header.alg !== "RS256" || typeof header.kid !== "string") {
    throw new Error("Google identity token algorithm is invalid.");
  }
  const jwksResponse = await (input.fetcher ?? fetch)(GOOGLE_JWKS_ENDPOINT, {
    headers: { accept: "application/json" },
  });
  if (!jwksResponse.ok) throw new Error("Google signing keys are unavailable.");
  const jwks: unknown = await jwksResponse.json();
  const keys = jwks && typeof jwks === "object"
    ? (jwks as { keys?: unknown }).keys
    : null;
  if (!Array.isArray(keys)) throw new Error("Google signing keys are invalid.");
  const jwk = keys.find((candidate) =>
    candidate
    && typeof candidate === "object"
    && (candidate as { kid?: unknown }).kid === header.kid
    && (candidate as { kty?: unknown }).kty === "RSA"
  ) as JsonWebKey | undefined;
  if (!jwk) throw new Error("Google signing key was not found.");
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const verified = await crypto.subtle.verify(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    toArrayBuffer(base64UrlToBytes(encodedSignature)),
    toArrayBuffer(new TextEncoder().encode(`${encodedHeader}.${encodedClaims}`)),
  );
  if (!verified) throw new Error("Google identity token signature is invalid.");

  const claims = decodeJsonSegment<GoogleIdTokenClaims>(encodedClaims);
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1_000);
  const audienceMatches = claims.aud === input.clientId
    || (Array.isArray(claims.aud) && claims.aud.includes(input.clientId));
  const authorizedPartyMatches = !Array.isArray(claims.aud)
    || claims.aud.length <= 1
    || claims.azp === input.clientId;
  if (
    !["https://accounts.google.com", "accounts.google.com"].includes(String(claims.iss))
    || !audienceMatches
    || !authorizedPartyMatches
    || typeof claims.exp !== "number"
    || claims.exp <= now
    || typeof claims.iat !== "number"
    || claims.iat > now + 300
    || typeof claims.nonce !== "string"
    || !constantTimeEqual(claims.nonce, input.nonce)
    || typeof claims.sub !== "string"
    || typeof claims.email !== "string"
    || claims.email_verified !== true
  ) {
    throw new Error("Google identity token claims are invalid.");
  }
  return {
    providerSubject: claims.sub,
    email: claims.email.trim().toLowerCase(),
    emailVerified: true,
    displayName: typeof claims.name === "string" ? claims.name : null,
  };
}

export function pkceChallenge(verifier: string) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))
    .then((digest) => bytesToBase64Url(new Uint8Array(digest)));
}

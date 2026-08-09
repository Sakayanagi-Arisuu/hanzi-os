import { toArrayBuffer } from "../auth/authCrypto";

export type FacebookOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  graphVersion: `v${number}.${number}`;
};

export type FacebookIdentity = {
  providerSubject: string;
  email: string | null;
  emailVerified: false;
  displayName: string | null;
};

type FacebookTokenResponse = {
  access_token?: unknown;
  token_type?: unknown;
  expires_in?: unknown;
};

type FacebookDebugResponse = {
  data?: {
    app_id?: unknown;
    user_id?: unknown;
    is_valid?: unknown;
    expires_at?: unknown;
    data_access_expires_at?: unknown;
  };
};

type FacebookProfileResponse = {
  id?: unknown;
  name?: unknown;
  email?: unknown;
};

const graphEndpoint = (config: FacebookOAuthConfig, path: string) =>
  `https://graph.facebook.com/${config.graphVersion}/${path}`;

export function facebookAuthorizationUrl(input: {
  config: FacebookOAuthConfig;
  state: string;
}) {
  const url = new URL(
    `https://www.facebook.com/${input.config.graphVersion}/dialog/oauth`,
  );
  url.searchParams.set("client_id", input.config.clientId);
  url.searchParams.set("redirect_uri", input.config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "email,public_profile");
  url.searchParams.set("state", input.state);
  return url.toString();
}

async function appSecretProof(accessToken: string, clientSecret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(new TextEncoder().encode(clientSecret)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign(
    "HMAC",
    key,
    toArrayBuffer(new TextEncoder().encode(accessToken)),
  ));
  // Meta expects lowercase hexadecimal appsecret_proof, not base64url.
  return [...signature].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function exchangeFacebookAuthorizationCode(input: {
  config: FacebookOAuthConfig;
  code: string;
  fetcher?: typeof fetch;
  nowSeconds?: number;
}): Promise<FacebookIdentity> {
  const fetcher = input.fetcher ?? fetch;
  const tokenUrl = new URL(graphEndpoint(input.config, "oauth/access_token"));
  tokenUrl.searchParams.set("client_id", input.config.clientId);
  tokenUrl.searchParams.set("client_secret", input.config.clientSecret);
  tokenUrl.searchParams.set("redirect_uri", input.config.redirectUri);
  tokenUrl.searchParams.set("code", input.code);
  const tokenResponse = await fetcher(tokenUrl, {
    method: "GET",
    headers: { accept: "application/json" },
  });
  if (!tokenResponse.ok) {
    throw new Error("Facebook authorization code exchange failed.");
  }
  const tokenBody = await tokenResponse.json() as FacebookTokenResponse;
  if (
    typeof tokenBody.access_token !== "string"
    || tokenBody.access_token.length < 20
    || (tokenBody.token_type !== undefined
      && String(tokenBody.token_type).toLowerCase() !== "bearer")
  ) {
    throw new Error("Facebook did not return a valid access token.");
  }
  const accessToken = tokenBody.access_token;

  const debugUrl = new URL(graphEndpoint(input.config, "debug_token"));
  debugUrl.searchParams.set("input_token", accessToken);
  debugUrl.searchParams.set(
    "access_token",
    `${input.config.clientId}|${input.config.clientSecret}`,
  );
  const debugResponse = await fetcher(debugUrl, {
    headers: { accept: "application/json" },
  });
  if (!debugResponse.ok) throw new Error("Facebook token validation failed.");
  const debugBody = await debugResponse.json() as FacebookDebugResponse;
  const debug = debugBody.data;
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1_000);
  if (
    !debug
    || debug.is_valid !== true
    || debug.app_id !== input.config.clientId
    || typeof debug.user_id !== "string"
    || debug.user_id.length < 1
    || (typeof debug.expires_at === "number" && debug.expires_at !== 0
      && debug.expires_at <= now)
    || (typeof debug.data_access_expires_at === "number"
      && debug.data_access_expires_at !== 0
      && debug.data_access_expires_at <= now)
  ) {
    throw new Error("Facebook access token claims are invalid.");
  }

  const profileUrl = new URL(graphEndpoint(input.config, "me"));
  profileUrl.searchParams.set("fields", "id,name,email");
  profileUrl.searchParams.set(
    "appsecret_proof",
    await appSecretProof(accessToken, input.config.clientSecret),
  );
  const profileResponse = await fetcher(profileUrl, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
    },
  });
  if (!profileResponse.ok) throw new Error("Facebook profile lookup failed.");
  const profile = await profileResponse.json() as FacebookProfileResponse;
  if (profile.id !== debug.user_id) {
    throw new Error("Facebook profile subject does not match the validated token.");
  }
  const email = typeof profile.email === "string"
    && profile.email.length <= 254
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(profile.email)
    ? profile.email.trim().toLowerCase()
    : null;
  return {
    providerSubject: debug.user_id,
    email,
    // Facebook's email field is useful contact data, but it is not treated as
    // proof for automatic cross-provider account linking.
    emailVerified: false,
    displayName: typeof profile.name === "string" && profile.name.trim().length > 0
      ? profile.name.trim().slice(0, 120)
      : null,
  };
}

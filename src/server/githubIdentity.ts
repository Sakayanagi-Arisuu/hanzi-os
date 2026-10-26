const GITHUB_AUTHORIZATION_ENDPOINT = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_ENDPOINT = "https://github.com/login/oauth/access_token";
const GITHUB_PROFILE_ENDPOINT = "https://api.github.com/user";
const GITHUB_EMAILS_ENDPOINT = "https://api.github.com/user/emails";
const MAX_RESPONSE_BYTES = 64 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;

export type GithubOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type GithubIdentity = {
  providerSubject: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
};

export class GithubIdentityError extends Error {}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const assertNotAborted = (signal: AbortSignal) => {
  // Workers implements the signal/event contract; do not require the optional
  // throwIfAborted convenience method from the browser/Node runtime.
  if (signal.aborted) throw new GithubIdentityError('GitHub sign-in request timed out.');
};

export function githubAuthorizationUrl(input: {
  config: GithubOAuthConfig;
  state: string;
  codeChallenge: string;
}) {
  const url = new URL(GITHUB_AUTHORIZATION_ENDPOINT);
  url.searchParams.set("client_id", input.config.clientId);
  url.searchParams.set("redirect_uri", input.config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "read:user user:email");
  url.searchParams.set("state", input.state);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

async function readBoundedJson(response: Response, signal: AbortSignal): Promise<unknown> {
  if (!response.ok) throw new GithubIdentityError(`GitHub provider request failed (${response.status}).`);
  const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim();
  if (contentType?.toLowerCase() !== "application/json" || !response.body) {
    throw new GithubIdentityError("GitHub provider response is invalid.");
  }
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null && (!/^\d+$/u.test(contentLength)
    || Number(contentLength) > MAX_RESPONSE_BYTES)) {
    throw new GithubIdentityError("GitHub provider response is too large.");
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      assertNotAborted(signal);
      const { value, done } = await reader.read();
      assertNotAborted(signal);
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > MAX_RESPONSE_BYTES) {
        throw new GithubIdentityError("GitHub provider response is too large.");
      }
      chunks.push(value);
    }
  } catch (error) {
    void reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch {
    throw new GithubIdentityError("GitHub provider response is invalid.");
  }
}

export async function exchangeGithubAuthorizationCode(input: {
  config: GithubOAuthConfig;
  code: string;
  codeVerifier: string;
  fetcher?: typeof fetch;
}): Promise<GithubIdentity> {
  const fetcher = input.fetcher ?? fetch;
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new GithubIdentityError("GitHub sign-in request timed out."));
    }, REQUEST_TIMEOUT_MS);
  });
  const requestJson = async (url: string, init: RequestInit) => {
    assertNotAborted(controller.signal);
    const response = await fetcher(url, {
      ...init,
      signal: controller.signal,
      // Workers accepts only follow/manual. Reject 3xx in readBoundedJson
      // instead of following a redirect with provider credentials.
      redirect: "manual",
    });
    return readBoundedJson(response, controller.signal);
  };

  const exchange = async (): Promise<GithubIdentity> => {
    const tokenBody = await requestJson(GITHUB_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: input.config.clientId,
        client_secret: input.config.clientSecret,
        redirect_uri: input.config.redirectUri,
        code: input.code,
        code_verifier: input.codeVerifier,
      }),
    });
    if (isRecord(tokenBody) && typeof tokenBody.error === 'string') {
      const category = ['incorrect_client_credentials', 'bad_verification_code', 'redirect_uri_mismatch', 'unverified_user_email']
        .includes(tokenBody.error) ? tokenBody.error : 'provider_rejected';
      throw new GithubIdentityError(`GitHub token exchange rejected (${category}).`);
    }
    if (!isRecord(tokenBody) || tokenBody.error !== undefined
      || typeof tokenBody.access_token !== "string"
      || !/^[A-Za-z0-9_.~-]{20,2048}$/u.test(tokenBody.access_token)
      || typeof tokenBody.token_type !== "string"
      || tokenBody.token_type.toLowerCase() !== "bearer") {
      throw new GithubIdentityError("GitHub did not return a valid access token.");
    }
    const headers = {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${tokenBody.access_token}`,
      "user-agent": "HANZI.OS",
      "x-github-api-version": "2022-11-28",
    };
    const profile = await requestJson(GITHUB_PROFILE_ENDPOINT, { headers });
    if (!isRecord(profile) || typeof profile.id !== "number"
      || !Number.isSafeInteger(profile.id) || profile.id <= 0) {
      throw new GithubIdentityError("GitHub profile subject is invalid.");
    }
    const emails = await requestJson(GITHUB_EMAILS_ENDPOINT, { headers });
    if (!Array.isArray(emails) || emails.some((email) => !isRecord(email))) {
      throw new GithubIdentityError("GitHub email response is invalid.");
    }
    const verifiedPrimary = emails.filter((email: Record<string, unknown>) =>
      email.primary === true && email.verified === true);
    if (verifiedPrimary.length > 1) {
      throw new GithubIdentityError("GitHub email response is invalid.");
    }
    const primaryEmail = verifiedPrimary[0]?.email;
    let email: string | null = null;
    if (verifiedPrimary.length > 0) {
      if (typeof primaryEmail !== "string" || primaryEmail.length > 254
        || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(primaryEmail)) {
        throw new GithubIdentityError("GitHub primary email is invalid.");
      }
      email = primaryEmail.toLowerCase();
    }
    return {
      // Account ownership follows the stable GitHub user ID, never an email match.
      providerSubject: String(profile.id),
      email,
      emailVerified: email !== null,
      displayName: typeof profile.name === "string" && profile.name.trim().length > 0
        ? profile.name.trim().slice(0, 120)
        : null,
    };
  };

  try {
    return await Promise.race([exchange(), deadline]);
  } catch (error) {
    controller.abort();
    if (error instanceof GithubIdentityError) throw error;
    // Fetch/parse exceptions may contain URLs, headers or provider payloads.
    throw new GithubIdentityError("GitHub sign-in verification failed.");
  } finally {
    clearTimeout(timeout);
  }
}

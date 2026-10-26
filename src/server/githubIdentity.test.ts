import { afterEach, describe, expect, it, vi } from "vitest";
import {
  exchangeGithubAuthorizationCode,
  githubAuthorizationUrl,
  type GithubOAuthConfig,
} from "./githubIdentity";

const config: GithubOAuthConfig = {
  clientId: "github-client-123",
  clientSecret: "github-secret-456",
  redirectUri: "https://hanzi.example/auth/github/callback",
};
const accessToken = "gho_this_is_only_a_fixture_access_token";
const validToken = { access_token: accessToken, token_type: "bearer" };
const validProfile = { id: 123456789, name: "  GitHub Learner  ", email: "ignored@example.com" };
const validEmails = [{ email: "Learner@Example.com", primary: true, verified: true }];

function exchangeWithResponses(responses: Response[]) {
  const fetcher = vi.fn(async () => responses.shift() as Response);
  return {
    fetcher,
    exchange: () => exchangeGithubAuthorizationCode({
      config, code: "authorization-code", codeVerifier: "a".repeat(64),
      fetcher: fetcher as typeof fetch,
    }),
  };
}

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("GitHub OAuth identity", () => {
  it('rejects provider redirects without another request or forwarding secrets', async () => {
    const { exchange, fetcher } = exchangeWithResponses([
      new Response(null, { status: 307, headers: { location: 'https://untrusted.example/token' } }),
    ]);
    await expect(exchange()).rejects.toThrow('GitHub provider request failed (307).');
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ redirect: 'manual' }));
  });
  it('works with Worker signals that have no throwIfAborted method', async () => {
    vi.stubGlobal('AbortController', class {
      signal = Object.assign(new EventTarget(), { aborted: false });
      abort() { this.signal.aborted = true; this.signal.dispatchEvent(new Event('abort')); }
    });
    const { exchange } = exchangeWithResponses([
      Response.json(validToken), Response.json(validProfile), Response.json(validEmails),
    ]);
    await expect(exchange()).resolves.toMatchObject({ providerSubject: '123456789' });
  });
  it("pins authorization endpoint, exact callback, state and PKCE without repository scopes", () => {
    const url = new URL(githubAuthorizationUrl({
      config, state: "state-value", codeChallenge: "challenge-value",
    }));
    expect(url.origin).toBe("https://github.com");
    expect(url.pathname).toBe("/login/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe(config.clientId);
    expect(url.searchParams.get("redirect_uri")).toBe(config.redirectUri);
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("state")).toBe("state-value");
    expect(url.searchParams.get("code_challenge")).toBe("challenge-value");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("scope")).toBe("read:user user:email");
    expect(url.searchParams.has("client_secret")).toBe(false);
  });

  it("exchanges the PKCE code and returns stable identity with a verified primary email", async () => {
    const responses = [Response.json(validToken), Response.json(validProfile), Response.json(validEmails)];
    const requests: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetcher = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ url: String(url), init });
      return responses.shift() as Response;
    });
    const identity = await exchangeGithubAuthorizationCode({
      config, code: "authorization-code", codeVerifier: "a".repeat(64),
      fetcher: fetcher as typeof fetch,
    });
    expect(identity).toEqual({
      providerSubject: "123456789", email: "learner@example.com",
      emailVerified: true, displayName: "GitHub Learner",
    });
    expect(JSON.stringify(identity)).not.toContain(accessToken);
    expect(requests.map(({ url }) => url)).toEqual([
      "https://github.com/login/oauth/access_token",
      "https://api.github.com/user",
      "https://api.github.com/user/emails",
    ]);
    const tokenRequest = requests[0]?.init;
    expect(tokenRequest?.method).toBe("POST");
    const form = tokenRequest?.body as URLSearchParams;
    expect(Object.fromEntries(form)).toEqual({
      client_id: config.clientId, client_secret: config.clientSecret,
      redirect_uri: config.redirectUri, code: "authorization-code", code_verifier: "a".repeat(64),
    });
    expect(new Headers(tokenRequest?.headers).get("accept")).toBe("application/json");
    for (const request of requests.slice(1)) {
      const headers = new Headers(request.init?.headers);
      expect(headers.get("authorization")).toBe(`Bearer ${accessToken}`);
      expect(headers.get("user-agent")).toBe("HANZI.OS");
      expect(headers.get("accept")).toBe("application/vnd.github+json");
      expect(headers.get("x-github-api-version")).toBe("2022-11-28");
    }
    expect(requests.every(({ init }) => init?.redirect === "manual")).toBe(true);
    expect(requests.every(({ init }) => init?.signal instanceof AbortSignal)).toBe(true);
    expect(requests.every(({ init }) => init?.signal === tokenRequest?.signal)).toBe(true);
  });

  it.each([
    { emails: [] },
    { emails: [{ email: "unverified@example.com", primary: true, verified: false }] },
    { emails: [{ email: "secondary@example.com", primary: false, verified: true }] },
  ])("allows login without a verified primary email and ignores the profile email: %j", async ({ emails }) => {
    const { exchange } = exchangeWithResponses([
      Response.json(validToken), Response.json(validProfile), Response.json(emails),
    ]);
    await expect(exchange()).resolves.toMatchObject({
      providerSubject: "123456789", email: null, emailVerified: false,
    });
  });

  it('classifies provider rejection without copying provider details or tokens', async () => {
    const { exchange, fetcher } = exchangeWithResponses([Response.json({
      error: 'bad_verification_code', error_description: 'private provider reply', access_token: accessToken,
    })]);
    await expect(exchange()).rejects.toThrow('GitHub token exchange rejected (bad_verification_code).');
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it.each([
    {},
    { access_token: "short", token_type: "bearer" },
    { access_token: `${accessToken}\r\nsecret`, token_type: "bearer" },
    { access_token: "a".repeat(2049), token_type: "bearer" },
    { access_token: accessToken, token_type: "basic" },
    { access_token: accessToken },
  ])("rejects invalid access tokens before profile requests: %j", async (token) => {
    const { exchange, fetcher } = exchangeWithResponses([Response.json(token)]);
    await expect(exchange()).rejects.toThrow("valid access token");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, "123456789", 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects missing or unsafe numeric provider subjects: %j", async (id) => {
      const { exchange, fetcher } = exchangeWithResponses([
        Response.json(validToken), Response.json({ ...validProfile, id }),
      ]);
      await expect(exchange()).rejects.toThrow("profile subject is invalid");
      expect(fetcher).toHaveBeenCalledTimes(2);
    },
  );

  it.each([
    { emails: { email: "not-an-array" } },
    { emails: [null] },
    { emails: [{ email: "invalid", primary: true, verified: true }] },
    { emails: [validEmails[0], { email: "duplicate@example.com", primary: true, verified: true }] },
  ])("rejects malformed or ambiguous email responses: %j", async ({ emails }) => {
    const { exchange } = exchangeWithResponses([
      Response.json(validToken), Response.json(validProfile), Response.json(emails),
    ]);
    await expect(exchange()).rejects.toThrow(/GitHub (email response|primary email) is invalid/u);
  });

  it.each([401, 302])("rejects unsuccessful provider status %i", async (status) => {
    const { exchange } = exchangeWithResponses([Response.json({ error: "private" }, { status })]);
    await expect(exchange()).rejects.toThrow("provider request failed");
  });

  it("rejects malformed JSON without exposing the provider payload", async () => {
    const { exchange } = exchangeWithResponses([
      new Response(`{"access_token":"${accessToken}",`, { headers: { "content-type": "application/json" } }),
    ]);
    await expect(exchange()).rejects.toThrow("GitHub provider response is invalid.");
  });

  it("rejects a response that is not JSON", async () => {
    const { exchange } = exchangeWithResponses([new Response("access_token=private")]);
    await expect(exchange()).rejects.toThrow("provider response is invalid");
  });

  it("bounds both declared and streamed response size", async () => {
    for (const response of [
      Response.json(validToken, { headers: { "content-length": "65537" } }),
      Response.json({ access_token: "a".repeat(65536), token_type: "bearer" }),
    ]) {
      const { exchange } = exchangeWithResponses([response]);
      await expect(exchange()).rejects.toThrow("provider response is too large");
    }
  });

  it("sanitizes transport exceptions so tokens and credentials cannot leak", async () => {
    const fetcher = vi.fn(async () => { throw new Error(`Private ${accessToken} ${config.clientSecret}`); });
    await expect(exchangeGithubAuthorizationCode({
      config, code: "code", codeVerifier: "a".repeat(64), fetcher: fetcher as typeof fetch,
    })).rejects.toThrow("GitHub sign-in verification failed.");
  });

  it("aborts and fails within the total timeout even if a transport ignores abort", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | null | undefined;
    const fetcher = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      signal = init?.signal;
      return new Promise<Response>(() => undefined);
    });
    const assertion = expect(exchangeGithubAuthorizationCode({
      config, code: "code", codeVerifier: "a".repeat(64), fetcher: fetcher as typeof fetch,
    })).rejects.toThrow("GitHub sign-in request timed out.");
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
    expect(signal?.aborted).toBe(true);
  });
});

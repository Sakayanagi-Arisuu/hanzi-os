import { describe, expect, it, vi } from "vitest";
import {
  exchangeFacebookAuthorizationCode,
  facebookAuthorizationUrl,
  type FacebookOAuthConfig,
} from "./facebookIdentity";

const config: FacebookOAuthConfig = {
  clientId: "facebook-client-123",
  clientSecret: "facebook-secret-456",
  redirectUri: "https://hanzi.example/auth/facebook/callback",
  graphVersion: "v23.0",
};

describe("Facebook OAuth identity", () => {
  it("pins the configured Graph version and preserves state in authorization", () => {
    const url = new URL(facebookAuthorizationUrl({ config, state: "state-token" }));
    expect(url.origin).toBe("https://www.facebook.com");
    expect(url.pathname).toBe("/v23.0/dialog/oauth");
    expect(url.searchParams.get("state")).toBe("state-token");
    expect(url.searchParams.get("redirect_uri")).toBe(config.redirectUri);
    expect(url.searchParams.get("scope")).toContain("email");
  });

  it("exchanges, debugs and binds the profile to the validated Facebook subject", async () => {
    const requests: Array<{ url: string; authorization: string | null }> = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requests.push({
        url,
        authorization: new Headers(init?.headers).get("authorization"),
      });
      if (url.includes("oauth/access_token")) {
        return Response.json({
          access_token: "facebook-user-access-token-123456789",
          token_type: "bearer",
          expires_in: 3600,
        });
      }
      if (url.includes("debug_token")) {
        return Response.json({
          data: {
            app_id: config.clientId,
            user_id: "facebook-user-1",
            is_valid: true,
            expires_at: 2_000_000_000,
            data_access_expires_at: 2_000_000_000,
          },
        });
      }
      return Response.json({
        id: "facebook-user-1",
        name: "Facebook Learner",
        email: "Learner@Example.com",
      });
    });
    await expect(exchangeFacebookAuthorizationCode({
      config,
      code: "authorization-code",
      fetcher: fetcher as typeof fetch,
      nowSeconds: 1_900_000_000,
    })).resolves.toEqual({
      providerSubject: "facebook-user-1",
      email: "learner@example.com",
      emailVerified: false,
      displayName: "Facebook Learner",
    });
    expect(requests).toHaveLength(3);
    expect(requests.every(({ url }) => url.includes("/v23.0/"))).toBe(true);
    expect(requests[2]?.authorization).toBe(
      "Bearer facebook-user-access-token-123456789",
    );
    expect(new URL(requests[2]?.url ?? "https://invalid").searchParams.get(
      "appsecret_proof",
    )).toMatch(/^[0-9a-f]{64}$/u);
  });

  it("rejects a profile that does not match the debug-token subject", async () => {
    const responses = [
      Response.json({
        access_token: "facebook-user-access-token-123456789",
        token_type: "bearer",
      }),
      Response.json({
        data: {
          app_id: config.clientId,
          user_id: "facebook-user-1",
          is_valid: true,
        },
      }),
      Response.json({ id: "facebook-user-2", name: "Mismatch" }),
    ];
    const fetcher = vi.fn(async () => responses.shift() as Response);
    await expect(exchangeFacebookAuthorizationCode({
      config,
      code: "authorization-code",
      fetcher: fetcher as typeof fetch,
    })).rejects.toThrow("does not match");
  });
});

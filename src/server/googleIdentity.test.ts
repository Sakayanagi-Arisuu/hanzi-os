import { describe, expect, it } from "vitest";
import { googleAuthorizationUrl } from "./googleIdentity";

describe("Google OAuth authorization request", () => {
  it("binds state, nonce, PKCE S256 and the exact configured redirect URI", () => {
    const redirectUri = "https://hanzi.example/auth/google/callback";
    const url = new URL(googleAuthorizationUrl({
      config: { clientId: "client-id", clientSecret: null, redirectUri },
      state: "state-value",
      nonce: "nonce-value",
      codeChallenge: "pkce-value",
    }));
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("redirect_uri")).toBe(redirectUri);
    expect(url.searchParams.get("state")).toBe("state-value");
    expect(url.searchParams.get("nonce")).toBe("nonce-value");
    expect(url.searchParams.get("code_challenge")).toBe("pkce-value");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });
});

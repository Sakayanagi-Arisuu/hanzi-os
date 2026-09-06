import { describe, expect, it } from "vitest";
import { POST as requestEmailCode } from "../../app/api/auth/email/request/route";
import { POST as registerHanziAccount } from "../../app/api/auth/hanzi/register/route";
import { POST as loginHanziAccount } from "../../app/api/auth/hanzi/login/route";
import { POST as seedHanziDemoAccounts } from "../../app/api/auth/hanzi/demo-accounts/route";
import {
  facebookConfig,
  isLocalDevelopmentAuth,
  recentFirstPartySession,
  roleAwareSignInReturnTo,
} from "./authHttp";

describe("authentication HTTP boundary", () => {
  it("rejects cross-origin email mutations before reading runtime bindings", async () => {
    const response = await requestEmailCode(new Request(
      "https://hanzi.example/api/auth/email/request",
      {
        method: "POST",
        headers: {
          origin: "https://attacker.example",
          "content-type": "application/json",
        },
        body: JSON.stringify({ email: "learner@example.com" }),
      },
    ));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "CROSS_ORIGIN_BLOCKED" },
    });
  });

  it("accepts step-up only from a recent first-party session", () => {
    expect(recentFirstPartySession({
      displayName: "ChatGPT",
      email: "admin@example.com",
      fullName: null,
    })).toBeNull();
    expect(recentFirstPartySession({
      displayName: "Old session",
      email: "admin@example.com",
      fullName: null,
      userId: "admin",
      sessionId: "old-session",
      authenticatedAt: Date.now() - 11 * 60_000,
    })).toBeNull();
    expect(recentFirstPartySession({
      displayName: "Recent session",
      email: "admin@example.com",
      fullName: null,
      userId: "admin",
      sessionId: "recent-session",
      authenticatedAt: Date.now(),
    })).toMatchObject({ userId: "admin", sessionId: "recent-session" });
  });

  it.each([
    ["register", registerHanziAccount, { username: "user.demo" }],
    ["login", loginHanziAccount, { identifier: "user.demo" }],
    ["demo seed", seedHanziDemoAccounts, {}],
  ])("rejects cross-origin HANZI.OS %s before reading runtime bindings", async (
    _label,
    handler,
    body,
  ) => {
    const response = await handler(new Request(
      "https://hanzi.example/api/auth/hanzi/action",
      {
        method: "POST",
        headers: {
          origin: "https://attacker.example",
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      },
    ));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "CROSS_ORIGIN_BLOCKED" },
    });
  });

  it("enables visible email OTP only for a loopback development origin", () => {
    expect(isLocalDevelopmentAuth("http://localhost:3000/signin", undefined, "development"))
      .toBe(true);
    expect(isLocalDevelopmentAuth("http://127.0.0.1:3000/signin", "1", "production"))
      .toBe(true);
    expect(isLocalDevelopmentAuth("https://hanzi.example/signin", "1", "development"))
      .toBe(false);
    expect(isLocalDevelopmentAuth("http://localhost:3000/signin", undefined, "production"))
      .toBe(false);
  });

  it("requires all Facebook secrets, an exact callback and an explicit Graph version", () => {
    const request = new Request("https://hanzi.example/auth/facebook/start");
    expect(() => facebookConfig({
      FACEBOOK_CLIENT_ID: "client",
      FACEBOOK_CLIENT_SECRET: "secret",
      FACEBOOK_REDIRECT_URI: "https://hanzi.example/auth/facebook/callback",
    }, request)).toThrow("explicit Graph API version");
    expect(() => facebookConfig({
      FACEBOOK_CLIENT_ID: "client",
      FACEBOOK_CLIENT_SECRET: "secret",
      FACEBOOK_REDIRECT_URI: "https://attacker.example/auth/facebook/callback",
      FACEBOOK_GRAPH_VERSION: "v23.0",
    }, request)).toThrow("exact callback");
    expect(facebookConfig({
      FACEBOOK_CLIENT_ID: "client",
      FACEBOOK_CLIENT_SECRET: "secret",
      FACEBOOK_REDIRECT_URI: "https://hanzi.example/auth/facebook/callback",
      FACEBOOK_GRAPH_VERSION: "v23.0",
    }, request)).toEqual({
      clientId: "client",
      clientSecret: "secret",
      redirectUri: "https://hanzi.example/auth/facebook/callback",
      graphVersion: "v23.0",
    });
  });

  it("keeps specialist accounts in their workspace without breaking back-office deep links", () => {
    expect(roleAwareSignInReturnTo("/path", ["learner"])).toBe("/path");
    expect(roleAwareSignInReturnTo("/path", ["learner", "content_editor"]))
      .toBe("/studio");
    expect(roleAwareSignInReturnTo("/lesson/boot-1", ["learner", "admin"]))
      .toBe("/admin");
    expect(roleAwareSignInReturnTo("/admin/security?filter=active", ["learner", "admin"]))
      .toBe("/admin/security?filter=active");
    expect(roleAwareSignInReturnTo("/studio/items/revision-1", ["learner", "content_editor"]))
      .toBe("/studio/items/revision-1");
    expect(roleAwareSignInReturnTo("/account/security", ["learner", "admin"]))
      .toBe("/account/security");
    expect(roleAwareSignInReturnTo("https://attacker.example", ["learner", "admin"]))
      .toBe("/admin");
  });
});

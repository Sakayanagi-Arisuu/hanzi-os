import { describe, expect, it } from "vitest";
import { POST as requestEmailCode } from "../../app/api/auth/email/request/route";
import { recentFirstPartySession } from "./authHttp";

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
});

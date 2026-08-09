import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getChatGPTUser: vi.fn(),
  getD1Database: vi.fn(),
}));

vi.mock("../../app/chatgpt-auth", () => ({
  getChatGPTUser: mocks.getChatGPTUser,
}));
vi.mock("./d1", () => ({
  getD1Database: mocks.getD1Database,
}));

import { GET } from "../../app/api/session/route";
import { deriveAccountKey } from "../lib/accountKey";

describe("first-party session authorization response", () => {
  beforeEach(() => {
    mocks.getChatGPTUser.mockReset();
    mocks.getD1Database.mockReset();
  });

  it("returns persisted learner and admin roles for a native session", async () => {
    mocks.getChatGPTUser.mockResolvedValue({
      displayName: "Điều Hành Demo",
      email: "admin@hanzi.local",
      fullName: "Điều Hành Demo",
      userId: "local-demo-user-3",
      sessionId: "session-admin",
      identityId: "local-demo-hanzi-identity-3",
      provider: "hanzi",
      authenticatedAt: Date.now(),
    });
    mocks.getD1Database.mockResolvedValue({
      prepare: vi.fn(() => ({
        bind() { return this; },
        async all() {
          return {
            success: true,
            results: [{ role: "learner" }, { role: "admin" }],
          };
        },
      })),
      batch: vi.fn(),
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      authenticated: true,
      accountKey: await deriveAccountKey("local-demo-user-3"),
      user: { provider: "hanzi" },
      authorization: {
        roles: ["learner", "admin"],
        permissions: expect.arrayContaining([
          "learning:use",
          "admin:users:read",
          "admin:roles:write",
        ]),
      },
    });
  });
});

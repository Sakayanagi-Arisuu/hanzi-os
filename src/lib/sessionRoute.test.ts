import { beforeEach, describe, expect, it, vi } from "vitest";
import { deriveAccountKey } from "./accountKey";

const authMocks = vi.hoisted(() => ({
  headers: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: authMocks.headers }));
vi.mock("next/navigation", () => ({ redirect: authMocks.redirect }));

import { GET } from "../../app/api/session/route";

describe("optional SIWC session endpoint", () => {
  beforeEach(() => {
    authMocks.headers.mockReset();
    authMocks.redirect.mockReset();
  });

  it("returns an anonymous, non-cacheable session without identity headers", async () => {
    authMocks.headers.mockResolvedValue(new Headers());

    const response = await GET();

    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    await expect(response.json()).resolves.toEqual({
      authenticated: false,
      user: null,
      accountKey: null,
      authorization: null,
    });
  });

  it("returns the decoded identity and a stable account key", async () => {
    authMocks.headers.mockResolvedValue(
      new Headers({
        "oai-authenticated-user-email": "Learner@Example.com",
        "oai-authenticated-user-full-name": "Nguy%E1%BB%85n%20An",
        "oai-authenticated-user-full-name-encoding": "percent-encoded-utf-8",
      }),
    );

    const response = await GET();

    await expect(response.json()).resolves.toEqual({
      authenticated: true,
      user: {
        displayName: "Nguyễn An",
        email: "Learner@Example.com",
        fullName: "Nguyễn An",
      },
      accountKey: await deriveAccountKey("Learner@Example.com"),
      authorization: {
        roles: ["learner"],
        permissions: ["learning:use", "account:self:manage"],
      },
    });
  });
});

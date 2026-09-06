import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class AdminRoleSelfRevocationError extends Error { readonly code = "ADMIN_SELF_REVOCATION_BLOCKED"; }
  class AuthorizationTargetNotFoundError extends Error { readonly code = "AUTHORIZATION_TARGET_NOT_FOUND"; }
  class AuthorizationConcurrencyError extends Error { readonly code = "AUTHORIZATION_REVISION_CONFLICT"; }
  class LastAdminProtectionError extends Error { readonly code = "LAST_ADMIN_PROTECTED"; }
  return {
    authorizeAdmin: vi.fn(),
    listUserPage: vi.fn(),
    setRole: vi.fn(),
    AdminRoleSelfRevocationError,
    AuthorizationTargetNotFoundError,
    AuthorizationConcurrencyError,
    LastAdminProtectionError,
  };
});

vi.mock("./adminHttp", () => ({
  authorizeAdmin: mocks.authorizeAdmin,
  adminError: (status: number, code: string, message: string) => Response.json(
    { error: { code, message } },
    { status, headers: { "cache-control": "private, no-store" } },
  ),
}));
vi.mock("./authorizationRepository", () => ({
  AdminRoleSelfRevocationError: mocks.AdminRoleSelfRevocationError,
  AuthorizationTargetNotFoundError: mocks.AuthorizationTargetNotFoundError,
  AuthorizationConcurrencyError: mocks.AuthorizationConcurrencyError,
  LastAdminProtectionError: mocks.LastAdminProtectionError,
  AuthorizationRepository: function AuthorizationRepository() {
    return { listUserPage: mocks.listUserPage, setRole: mocks.setRole };
  },
}));

import { GET } from "../../app/api/admin/users/route";
import { PUT } from "../../app/api/admin/users/[userId]/roles/route";
import { POST } from "../../app/admin/roles/route";

const adminContext = {
  database: {},
  identity: {
    displayName: "Admin",
    email: "admin@example.com",
    fullName: null,
    userId: "admin-user",
    sessionId: "session-admin",
    authenticatedAt: Date.now(),
  },
  account: {
    userId: "admin-user",
    authorization: { roles: ["learner", "admin"], permissions: [] },
  },
  sessionId: "session-admin",
};

beforeEach(() => {
  mocks.authorizeAdmin.mockReset();
  mocks.authorizeAdmin.mockResolvedValue({ ok: true, context: adminContext });
  mocks.listUserPage.mockReset();
  mocks.listUserPage.mockResolvedValue({ users: [], filteredTotal: 0, summary: { total: 0, active: 0, locked: 0, editors: 0, admins: 0 } });
  mocks.setRole.mockReset();
  mocks.setRole.mockResolvedValue({
    authorization: { roles: ["learner", "content_editor"], permissions: [] },
    controlRevision: 2,
  });
});

describe("admin authorization routes", () => {
  it("returns the fail-closed authorization response before listing users", async () => {
    mocks.authorizeAdmin.mockResolvedValueOnce({
      ok: false,
      response: Response.json({ error: { code: "AUTH_REQUIRED" } }, { status: 401 }),
    });
    expect((await GET()).status).toBe(401);
    expect(mocks.listUserPage).not.toHaveBeenCalled();
  });

  it("returns the account directory without caching it", async () => {
    mocks.listUserPage.mockResolvedValueOnce({
      users: [{ email: "learner@example.com", roles: ["learner"] }],
      filteredTotal: 1,
      summary: { total: 1, active: 1, locked: 0, editors: 0, admins: 0 },
    });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toMatchObject({
      requestedBy: "admin-user",
      users: [{ email: "learner@example.com" }],
      filteredTotal: 1,
    });
  });

  it("blocks cross-origin role changes before authorization", async () => {
    const response = await PUT(new Request(
      "https://hanzi.test/api/admin/users/user-2/roles",
      {
        method: "PUT",
        headers: { "content-type": "application/json", origin: "https://attacker.test" },
        body: JSON.stringify({ role: "content_editor", enabled: true, expectedRevision: 1 }),
      },
    ), { params: Promise.resolve({ userId: "user-2" }) });
    expect(response.status).toBe(403);
    expect(mocks.authorizeAdmin).not.toHaveBeenCalled();
  });

  it("requires step-up and updates a target role with its expected revision", async () => {
    const response = await PUT(new Request(
      "https://hanzi.test/api/admin/users/user-2/roles",
      {
        method: "PUT",
        headers: { "content-type": "application/json", origin: "https://hanzi.test" },
        body: JSON.stringify({ role: "content_editor", enabled: true, expectedRevision: 1 }),
      },
    ), { params: Promise.resolve({ userId: "user-2" }) });
    expect(response.status).toBe(200);
    expect(mocks.authorizeAdmin).toHaveBeenCalledWith("admin:roles:write", { stepUp: true });
    expect(mocks.setRole).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: "admin-user",
      actorSessionId: "session-admin",
      targetUserId: "user-2",
      role: "content_editor",
      enabled: true,
      expectedRevision: 1,
    }));
  });

  it("supports the no-JavaScript role form with the same step-up boundary", async () => {
    const response = await POST(new Request("https://hanzi.test/admin/roles", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        origin: "https://hanzi.test",
      },
      body: new URLSearchParams({
        userId: "user-2",
        role: "admin",
        enabled: "true",
        expectedRevision: "4",
      }),
    }));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/admin?updated=user-2");
    expect(mocks.setRole).toHaveBeenCalledWith(expect.objectContaining({
      targetUserId: "user-2",
      role: "admin",
      expectedRevision: 4,
    }));
  });

  it("reports final-admin protection as a conflict", async () => {
    mocks.setRole.mockRejectedValueOnce(new mocks.LastAdminProtectionError());
    const response = await PUT(new Request(
      "https://hanzi.test/api/admin/users/user-2/roles",
      {
        method: "PUT",
        headers: { "content-type": "application/json", origin: "https://hanzi.test" },
        body: JSON.stringify({ role: "admin", enabled: false, expectedRevision: 2 }),
      },
    ), { params: Promise.resolve({ userId: "user-2" }) });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "LAST_ADMIN_PROTECTED" } });
  });
});

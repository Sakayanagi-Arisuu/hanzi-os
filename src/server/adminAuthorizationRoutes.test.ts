import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class AdminRoleSelfRevocationError extends Error {
    readonly code = "ADMIN_SELF_REVOCATION_BLOCKED";
  }
  class AuthorizationTargetNotFoundError extends Error {
    readonly code = "AUTHORIZATION_TARGET_NOT_FOUND";
  }
  return {
    getChatGPTUser: vi.fn(),
    getD1Database: vi.fn(),
    resolveAuthorizedAccount: vi.fn(),
    listUsers: vi.fn(),
    setAdminRole: vi.fn(),
    AdminRoleSelfRevocationError,
    AuthorizationTargetNotFoundError,
  };
});

vi.mock("../../app/chatgpt-auth", () => ({
  getChatGPTUser: mocks.getChatGPTUser,
}));
vi.mock("./d1", () => ({
  getD1Database: mocks.getD1Database,
  SyncBackendUnavailableError: class extends Error {
    readonly code = "SYNC_BACKEND_UNAVAILABLE";
  },
}));
vi.mock("./authorizationRepository", () => ({
  resolveAuthorizedAccount: mocks.resolveAuthorizedAccount,
  AdminRoleSelfRevocationError: mocks.AdminRoleSelfRevocationError,
  AuthorizationTargetNotFoundError: mocks.AuthorizationTargetNotFoundError,
  AuthorizationRepository: function AuthorizationRepository() {
    return { listUsers: mocks.listUsers, setAdminRole: mocks.setAdminRole };
  },
}));

import { GET } from "../../app/api/admin/users/route";
import { PUT } from "../../app/api/admin/users/[userId]/roles/route";
import { POST } from "../../app/admin/roles/route";

const identity = {
  displayName: "Admin",
  email: "admin@example.com",
  fullName: null,
};
const learnerAuthorization = {
  roles: ["learner"],
  permissions: ["learning:use", "account:self:manage"],
};
const adminAuthorization = {
  roles: ["learner", "admin"],
  permissions: [
    "learning:use",
    "account:self:manage",
    "admin:users:read",
    "admin:roles:write",
  ],
};

beforeEach(() => {
  mocks.getChatGPTUser.mockReset();
  mocks.getChatGPTUser.mockResolvedValue(identity);
  mocks.getD1Database.mockReset();
  mocks.getD1Database.mockResolvedValue({});
  mocks.resolveAuthorizedAccount.mockReset();
  mocks.resolveAuthorizedAccount.mockResolvedValue({
    userId: "admin-user",
    authorization: adminAuthorization,
  });
  mocks.listUsers.mockReset();
  mocks.listUsers.mockResolvedValue([]);
  mocks.setAdminRole.mockReset();
  mocks.setAdminRole.mockResolvedValue(adminAuthorization);
});

describe("admin authorization routes", () => {
  it("requires authentication and server-side admin permission to list users", async () => {
    mocks.getChatGPTUser.mockResolvedValueOnce(null);
    expect((await GET()).status).toBe(401);

    mocks.resolveAuthorizedAccount.mockResolvedValueOnce({
      userId: "learner-user",
      authorization: learnerAuthorization,
    });
    expect((await GET()).status).toBe(403);
    expect(mocks.listUsers).not.toHaveBeenCalled();
  });

  it("returns the account directory to an administrator without caching it", async () => {
    mocks.listUsers.mockResolvedValueOnce([
      {
        userId: "learner-user",
        email: "learner@example.com",
        status: "active",
        roles: ["learner"],
        createdAt: 1,
        updatedAt: 1,
      },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toMatchObject({
      requestedBy: "admin-user",
      users: [{ email: "learner@example.com", roles: ["learner"] }],
    });
  });

  it("blocks cross-origin role changes before identity access", async () => {
    const response = await PUT(
      new Request("https://hanzi.test/api/admin/users/user-2/roles", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          origin: "https://attacker.test",
        },
        body: JSON.stringify({ admin: true }),
      }),
      { params: Promise.resolve({ userId: "user-2" }) },
    );

    expect(response.status).toBe(403);
    expect(mocks.getChatGPTUser).not.toHaveBeenCalled();
  });

  it("updates a target role only after admin authorization", async () => {
    const response = await PUT(
      new Request("https://hanzi.test/api/admin/users/user-2/roles", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          origin: "https://hanzi.test",
        },
        body: JSON.stringify({ admin: true }),
      }),
      { params: Promise.resolve({ userId: "user-2" }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.setAdminRole).toHaveBeenCalledWith("admin-user", "user-2", true);
  });

  it("supports the no-JavaScript admin form with the same server authorization", async () => {
    const response = await POST(
      new Request("https://hanzi.test/admin/roles", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          origin: "https://hanzi.test",
        },
        body: new URLSearchParams({ userId: "user-2", admin: "false" }),
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/admin?updated=user-2");
    expect(mocks.setAdminRole).toHaveBeenCalledWith("admin-user", "user-2", false);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class AuthorizationTargetNotFoundError extends Error { readonly code = "AUTHORIZATION_TARGET_NOT_FOUND"; }
  class AuthorizationConcurrencyError extends Error { readonly code = "AUTHORIZATION_REVISION_CONFLICT"; }
  class AdminSelfLockError extends Error { readonly code = "ADMIN_SELF_LOCK_BLOCKED"; }
  class LastAdminProtectionError extends Error { readonly code = "LAST_ADMIN_PROTECTED"; }
  class AdminCurrentSessionRevocationError extends Error { readonly code = "ADMIN_CURRENT_SESSION_REVOCATION_BLOCKED"; }
  class SettingConcurrencyError extends Error { readonly code = "SETTING_REVISION_CONFLICT"; }
  return {
    authorizeAdmin: vi.fn(),
    setAccountLocked: vi.fn(),
    listSessions: vi.fn(),
    revokeManagedSession: vi.fn(),
    listSettings: vi.fn(),
    updateSetting: vi.fn(),
    listAudit: vi.fn(),
    AuthorizationTargetNotFoundError,
    AuthorizationConcurrencyError,
    AdminSelfLockError,
    LastAdminProtectionError,
    AdminCurrentSessionRevocationError,
    SettingConcurrencyError,
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
  AuthorizationTargetNotFoundError: mocks.AuthorizationTargetNotFoundError,
  AuthorizationConcurrencyError: mocks.AuthorizationConcurrencyError,
  AdminSelfLockError: mocks.AdminSelfLockError,
  LastAdminProtectionError: mocks.LastAdminProtectionError,
  AdminCurrentSessionRevocationError: mocks.AdminCurrentSessionRevocationError,
  AuthorizationRepository: function AuthorizationRepository() {
    return {
      setAccountLocked: mocks.setAccountLocked,
      listSessions: mocks.listSessions,
      revokeManagedSession: mocks.revokeManagedSession,
    };
  },
}));
vi.mock("./systemSettingsRepository", () => ({
  SYSTEM_SETTING_KEYS: [
    "account_registration_mode",
    "content_preview_enabled",
    "default_daily_minutes",
    "maintenance_banner",
  ],
  isSystemSettingKey: (value: unknown) => [
    "account_registration_mode",
    "content_preview_enabled",
    "default_daily_minutes",
    "maintenance_banner",
  ].includes(String(value)),
  SettingConcurrencyError: mocks.SettingConcurrencyError,
  SystemSettingsRepository: function SystemSettingsRepository() {
    return { list: mocks.listSettings, update: mocks.updateSetting };
  },
}));
vi.mock("./auditRepository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./auditRepository")>();
  return {
    ...actual,
    AuditRepository: function AuditRepository() { return { list: mocks.listAudit }; },
  };
});

import { PUT as updateStatus } from "../../app/api/admin/users/[userId]/status/route";
import { GET as listSessions } from "../../app/api/admin/sessions/route";
import { DELETE as revokeSession } from "../../app/api/admin/sessions/[sessionId]/route";
import { GET as listSettings, PUT as updateSetting } from "../../app/api/admin/settings/route";
import { GET as listAudit } from "../../app/api/admin/audit/route";

const context = {
  database: {},
  identity: { userId: "admin", sessionId: "admin-session" },
  account: { userId: "admin", authorization: { roles: ["learner", "admin"], permissions: [] } },
  sessionId: "admin-session",
};

beforeEach(() => {
  mocks.authorizeAdmin.mockReset();
  mocks.authorizeAdmin.mockResolvedValue({ ok: true, context });
  mocks.setAccountLocked.mockReset();
  mocks.setAccountLocked.mockResolvedValue({ status: "locked", controlRevision: 2 });
  mocks.listSessions.mockReset();
  mocks.listSessions.mockResolvedValue([]);
  mocks.revokeManagedSession.mockReset();
  mocks.listSettings.mockReset();
  mocks.listSettings.mockResolvedValue([]);
  mocks.updateSetting.mockReset();
  mocks.updateSetting.mockResolvedValue({ key: "maintenance_banner", revision: 1 });
  mocks.listAudit.mockReset();
  mocks.listAudit.mockResolvedValue([]);
});

describe("admin account, session, config and audit routes", () => {
  it("requires step-up to lock a user and forwards the expected revision", async () => {
    const response = await updateStatus(new Request(
      "https://hanzi.test/api/admin/users/user-2/status",
      {
        method: "PUT",
        headers: { "content-type": "application/json", origin: "https://hanzi.test" },
        body: JSON.stringify({ locked: true, reason: "Điều tra phiên", expectedRevision: 1 }),
      },
    ), { params: Promise.resolve({ userId: "user-2" }) });
    expect(response.status).toBe(200);
    expect(mocks.authorizeAdmin).toHaveBeenCalledWith("admin:users:lock", { stepUp: true });
    expect(mocks.setAccountLocked).toHaveBeenCalledWith(expect.objectContaining({
      targetUserId: "user-2",
      expectedRevision: 1,
      actorSessionId: "admin-session",
    }));
  });

  it("separates session read permission from step-up protected revoke", async () => {
    expect((await listSessions()).status).toBe(200);
    expect(mocks.authorizeAdmin).toHaveBeenCalledWith("admin:sessions:read");
    const response = await revokeSession(new Request(
      "https://hanzi.test/api/admin/sessions/session-2",
      { method: "DELETE", headers: { origin: "https://hanzi.test" } },
    ), { params: Promise.resolve({ sessionId: "session-2" }) });
    expect(response.status).toBe(200);
    expect(mocks.authorizeAdmin).toHaveBeenLastCalledWith(
      "admin:sessions:revoke",
      { stepUp: true },
    );
  });

  it("rejects unknown setting keys before reaching the repository", async () => {
    const response = await updateSetting(new Request(
      "https://hanzi.test/api/admin/settings",
      {
        method: "PUT",
        headers: { "content-type": "application/json", origin: "https://hanzi.test" },
        body: JSON.stringify({ key: "oauth_client_secret", value: "never", expectedRevision: 0 }),
      },
    ));
    expect(response.status).toBe(422);
    expect(mocks.updateSetting).not.toHaveBeenCalled();
  });

  it("reads and updates allowlisted settings with distinct permissions", async () => {
    expect((await listSettings()).status).toBe(200);
    const response = await updateSetting(new Request(
      "https://hanzi.test/api/admin/settings",
      {
        method: "PUT",
        headers: { "content-type": "application/json", origin: "https://hanzi.test" },
        body: JSON.stringify({ key: "maintenance_banner", value: "Bảo trì", expectedRevision: 0 }),
      },
    ));
    expect(response.status).toBe(200);
    expect(mocks.authorizeAdmin).toHaveBeenLastCalledWith(
      "admin:settings:write",
      { stepUp: true },
    );
  });

  it("guards the audit feed with its own read permission", async () => {
    const response = await listAudit(new Request("https://hanzi.test/api/admin/audit"));
    expect(response.status).toBe(200);
    expect(mocks.authorizeAdmin).toHaveBeenCalledWith("admin:audit:read");
  });
});

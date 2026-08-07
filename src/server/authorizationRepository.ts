import type { ChatGPTUser } from "../../app/chatgpt-auth";
import {
  createAuthorization,
  isAppRole,
  type AppAuthorization,
  type AppRole,
} from "../auth/authorization";
import type { D1Database } from "./d1";
import { getBootstrapAdminEmails } from "./runtimeAuthorizationConfig";
import { SyncRepository } from "./syncRepository";
import { AuditRepository } from "./auditRepository";

export type AuthorizedAccount = {
  userId: string;
  authorization: AppAuthorization;
};

export type AdminUserSummary = {
  userId: string;
  email: string;
  status: string;
  roles: AppRole[];
  controlRevision: number;
  lockedAt: number | null;
  lockedByUserId: string | null;
  lockReason: string | null;
  createdAt: number;
  updatedAt: number;
};

export type AdminSessionSummary = {
  id: string;
  userId: string;
  email: string;
  authMethod: string;
  deviceLabel: string | null;
  authenticatedAt: number;
  lastSeenAt: number;
  expiresAt: number;
  revokedAt: number | null;
};

export class AdminRoleSelfRevocationError extends Error {
  readonly code = "ADMIN_SELF_REVOCATION_BLOCKED";
}

export class AuthorizationTargetNotFoundError extends Error {
  readonly code = "AUTHORIZATION_TARGET_NOT_FOUND";
}

export class AuthorizationConcurrencyError extends Error {
  readonly code = "AUTHORIZATION_REVISION_CONFLICT";
}

export class LastAdminProtectionError extends Error {
  readonly code = "LAST_ADMIN_PROTECTED";
}

export class AdminSelfLockError extends Error {
  readonly code = "ADMIN_SELF_LOCK_BLOCKED";
}

export class AdminCurrentSessionRevocationError extends Error {
  readonly code = "ADMIN_CURRENT_SESSION_REVOCATION_BLOCKED";
}

const normalizeRoles = (roles: readonly unknown[]) =>
  roles.filter(isAppRole);

export class AuthorizationRepository {
  constructor(private readonly database: D1Database) {}

  async ensureBaselineRoles(
    userId: string,
    bootstrapAdmin: boolean,
  ): Promise<void> {
    const timestamp = Date.now();
    const statements = [
      this.database
        .prepare(
          "INSERT OR IGNORE INTO user_roles (user_id, role, granted_by_user_id, granted_at, updated_at) VALUES (?, 'learner', NULL, ?, ?)",
        )
        .bind(userId, timestamp, timestamp),
    ];
    if (bootstrapAdmin) {
      statements.push(
        this.database
          .prepare(
            "INSERT OR IGNORE INTO user_roles (user_id, role, granted_by_user_id, granted_at, updated_at) VALUES (?, 'admin', ?, ?, ?)",
          )
          .bind(userId, userId, timestamp, timestamp),
      );
    }
    await this.database.batch(statements);
  }

  async getAuthorization(userId: string): Promise<AppAuthorization> {
    const result = await this.database
      .prepare(
        "SELECT role FROM user_roles WHERE user_id = ? ORDER BY CASE role WHEN 'learner' THEN 0 WHEN 'content_editor' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END",
      )
      .bind(userId)
      .all<{ role: unknown }>();
    if (!result.success) throw new Error("Unable to read account roles.");
    return createAuthorization(normalizeRoles((result.results ?? []).map((row) => row.role)));
  }

  async listUsers(limit = 100): Promise<AdminUserSummary[]> {
    const boundedLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
    const result = await this.database
      .prepare(
        `SELECT u.id AS userId,
                COALESCE((
                  SELECT ai.normalized_email
                    FROM auth_identities ai
                   WHERE ai.user_id = u.id
                     AND ai.email_verified = 1
                     AND ai.normalized_email IS NOT NULL
                   ORDER BY CASE ai.provider
                     WHEN 'chatgpt' THEN 0 WHEN 'google' THEN 1
                     WHEN 'email_otp' THEN 2 ELSE 3 END,
                     ai.created_at
                   LIMIT 1
                ), '') AS email,
                u.status AS status,
                u.control_revision AS controlRevision,
                u.locked_at AS lockedAt,
                u.locked_by_user_id AS lockedByUserId,
                u.lock_reason AS lockReason,
                u.created_at AS createdAt,
                u.updated_at AS updatedAt,
                COALESCE(GROUP_CONCAT(ur.role), '') AS roles
           FROM users u
           LEFT JOIN user_roles ur ON ur.user_id = u.id
          GROUP BY u.id, u.status, u.control_revision, u.locked_at,
                   u.locked_by_user_id, u.lock_reason, u.created_at, u.updated_at
          ORDER BY u.created_at DESC, u.id
          LIMIT ?`,
      )
      .bind(boundedLimit)
      .all<{
        userId: string;
        email: string;
        status: string;
        controlRevision: number;
        lockedAt: number | null;
        lockedByUserId: string | null;
        lockReason: string | null;
        roles: string;
        createdAt: number;
        updatedAt: number;
      }>();
    if (!result.success) throw new Error("Unable to list authorized accounts.");
    return (result.results ?? []).map((row) => ({
      userId: row.userId,
      email: row.email,
      status: row.status,
      roles: createAuthorization(normalizeRoles(row.roles.split(","))).roles,
      controlRevision: row.controlRevision,
      lockedAt: row.lockedAt,
      lockedByUserId: row.lockedByUserId,
      lockReason: row.lockReason,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async setRole(input: {
    actorUserId: string;
    actorSessionId: string;
    targetUserId: string;
    role: Exclude<AppRole, "learner">;
    enabled: boolean;
    expectedRevision: number;
    requestId: string;
  }): Promise<{ authorization: AppAuthorization; controlRevision: number }> {
    if (
      input.role === "admin"
      && input.actorUserId === input.targetUserId
      && !input.enabled
    ) {
      throw new AdminRoleSelfRevocationError(
        "An administrator cannot revoke their own administrative role.",
      );
    }
    if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 1) {
      throw new AuthorizationConcurrencyError("Account revision is invalid.");
    }
    const target = await this.getTargetControl(input.targetUserId);
    if (!target) throw new AuthorizationTargetNotFoundError("Account not found.");
    if (target.controlRevision !== input.expectedRevision) {
      throw new AuthorizationConcurrencyError("Account changed in another session.");
    }

    const timestamp = Date.now();
    const roleMutation = input.enabled
      ? this.database
          .prepare(
            `INSERT OR IGNORE INTO user_roles (
              user_id, role, granted_by_user_id, granted_at, updated_at
            ) SELECT ?, ?, ?, ?, ?
              WHERE EXISTS (
                SELECT 1 FROM users
                 WHERE id = ? AND status IN ('active', 'locked')
                   AND control_revision = ?
              )`,
          )
          .bind(
            input.targetUserId,
            input.role,
            input.actorUserId,
            timestamp,
            timestamp,
            input.targetUserId,
            input.expectedRevision,
          )
      : this.database
          .prepare(
            `DELETE FROM user_roles
              WHERE user_id = ? AND role = ?
                AND EXISTS (
                  SELECT 1 FROM users
                   WHERE id = ? AND status IN ('active', 'locked')
                     AND control_revision = ?
                )`,
          )
          .bind(
            input.targetUserId,
            input.role,
            input.targetUserId,
            input.expectedRevision,
          );
    try {
      const results = await this.database.batch([
        roleMutation,
        this.database
          .prepare(
            `UPDATE users
                SET control_revision = control_revision + 1, updated_at = ?
              WHERE id = ? AND status IN ('active', 'locked')
                AND control_revision = ?`,
          )
          .bind(timestamp, input.targetUserId, input.expectedRevision),
      ]);
      if ((results[1]?.meta?.changes ?? 0) !== 1) {
        throw new AuthorizationConcurrencyError("Account changed in another session.");
      }
    } catch (error) {
      if (error instanceof AuthorizationConcurrencyError) throw error;
      if (String(error).includes("last active administrator")) {
        throw new LastAdminProtectionError("The final active administrator is protected.");
      }
      throw error;
    }

    await new AuditRepository(this.database).append({
      category: "role",
      action: input.enabled ? "role.granted" : "role.revoked",
      outcome: "success",
      actorUserId: input.actorUserId,
      actorSessionId: input.actorSessionId,
      targetType: "user",
      targetId: input.targetUserId,
      requestId: input.requestId,
      metadata: {
        role: input.role,
        previousRevision: input.expectedRevision,
        revision: input.expectedRevision + 1,
      },
    });
    return {
      authorization: await this.getAuthorization(input.targetUserId),
      controlRevision: input.expectedRevision + 1,
    };
  }

  async setAdminRole(
    actorUserId: string,
    targetUserId: string,
    enabled: boolean,
  ): Promise<AppAuthorization> {
    const target = await this.getTargetControl(targetUserId);
    if (!target) throw new AuthorizationTargetNotFoundError("Account not found.");
    return (await this.setRole({
      actorUserId,
      actorSessionId: `legacy:${actorUserId}`,
      targetUserId,
      role: "admin",
      enabled,
      expectedRevision: target.controlRevision,
      requestId: crypto.randomUUID(),
    })).authorization;
  }

  async setAccountLocked(input: {
    actorUserId: string;
    actorSessionId: string;
    targetUserId: string;
    locked: boolean;
    reason: string;
    expectedRevision: number;
    requestId: string;
  }): Promise<{ status: "active" | "locked"; controlRevision: number }> {
    if (input.locked && input.actorUserId === input.targetUserId) {
      throw new AdminSelfLockError("An administrator cannot lock their own account.");
    }
    const reason = input.reason.trim();
    if (input.locked && (reason.length < 3 || reason.length > 240)) {
      throw new Error("A lock reason between 3 and 240 characters is required.");
    }
    const target = await this.getTargetControl(input.targetUserId);
    if (!target) throw new AuthorizationTargetNotFoundError("Account not found.");
    if (target.controlRevision !== input.expectedRevision) {
      throw new AuthorizationConcurrencyError("Account changed in another session.");
    }
    const timestamp = Date.now();
    try {
      const results = await this.database.batch([
        this.database
          .prepare(
            `UPDATE auth_sessions
                SET revoked_at = ?
              WHERE user_id = ? AND revoked_at IS NULL AND ? = 1
                AND EXISTS (
                  SELECT 1 FROM users
                   WHERE id = ? AND control_revision = ?
                )`,
          )
          .bind(
            timestamp,
            input.targetUserId,
            input.locked ? 1 : 0,
            input.targetUserId,
            input.expectedRevision,
          ),
        this.database
          .prepare(
            `UPDATE users
                SET status = ?, control_revision = control_revision + 1,
                    locked_at = ?, locked_by_user_id = ?, lock_reason = ?,
                    updated_at = ?
              WHERE id = ? AND status IN ('active', 'locked')
                AND control_revision = ?`,
          )
          .bind(
            input.locked ? "locked" : "active",
            input.locked ? timestamp : null,
            input.locked ? input.actorUserId : null,
            input.locked ? reason : null,
            timestamp,
            input.targetUserId,
            input.expectedRevision,
          ),
      ]);
      if ((results[1]?.meta?.changes ?? 0) !== 1) {
        throw new AuthorizationConcurrencyError("Account changed in another session.");
      }
    } catch (error) {
      if (error instanceof AuthorizationConcurrencyError) throw error;
      if (String(error).includes("last active administrator")) {
        throw new LastAdminProtectionError("The final active administrator is protected.");
      }
      throw error;
    }
    await new AuditRepository(this.database).append({
      category: "account",
      action: input.locked ? "account.locked" : "account.unlocked",
      outcome: "success",
      actorUserId: input.actorUserId,
      actorSessionId: input.actorSessionId,
      targetType: "user",
      targetId: input.targetUserId,
      requestId: input.requestId,
      metadata: {
        reason: input.locked ? reason : "administrative unlock",
        previousRevision: input.expectedRevision,
        revision: input.expectedRevision + 1,
      },
    });
    return {
      status: input.locked ? "locked" : "active",
      controlRevision: input.expectedRevision + 1,
    };
  }

  async listSessions(limit = 100): Promise<AdminSessionSummary[]> {
    const boundedLimit = Math.max(1, Math.min(200, Math.trunc(limit)));
    const result = await this.database
      .prepare(
        `SELECT s.id, s.user_id AS userId,
                COALESCE((
                  SELECT ai.normalized_email FROM auth_identities ai
                   WHERE ai.user_id = s.user_id
                     AND ai.email_verified = 1
                     AND ai.normalized_email IS NOT NULL
                   ORDER BY ai.created_at LIMIT 1
                ), '') AS email,
                s.auth_method AS authMethod,
                s.device_label AS deviceLabel,
                s.authenticated_at AS authenticatedAt,
                s.last_seen_at AS lastSeenAt,
                s.expires_at AS expiresAt,
                s.revoked_at AS revokedAt
           FROM auth_sessions s
          ORDER BY s.created_at DESC, s.id
          LIMIT ?`,
      )
      .bind(boundedLimit)
      .all<AdminSessionSummary>();
    if (!result.success) throw new Error("Unable to list managed sessions.");
    return result.results ?? [];
  }

  async revokeManagedSession(input: {
    actorUserId: string;
    actorSessionId: string;
    sessionId: string;
    requestId: string;
  }): Promise<void> {
    if (input.actorSessionId === input.sessionId) {
      throw new AdminCurrentSessionRevocationError(
        "The current administrative session cannot revoke itself here.",
      );
    }
    const target = await this.database
      .prepare(
        "SELECT user_id AS userId FROM auth_sessions WHERE id = ? LIMIT 1",
      )
      .bind(input.sessionId)
      .first<{ userId: string }>();
    if (!target) throw new AuthorizationTargetNotFoundError("Session not found.");
    await this.database
      .prepare(
        "UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, ?) WHERE id = ?",
      )
      .bind(Date.now(), input.sessionId)
      .run();
    await new AuditRepository(this.database).append({
      category: "auth",
      action: "auth.session.revoked_by_admin",
      outcome: "success",
      actorUserId: input.actorUserId,
      actorSessionId: input.actorSessionId,
      targetType: "session",
      targetId: input.sessionId,
      requestId: input.requestId,
      metadata: { targetUserId: target.userId },
    });
  }

  private getTargetControl(targetUserId: string) {
    return this.database
      .prepare(
        `SELECT id, status, control_revision AS controlRevision
           FROM users
          WHERE id = ? AND status IN ('active', 'locked')
          LIMIT 1`,
      )
      .bind(targetUserId)
      .first<{ id: string; status: string; controlRevision: number }>();
  }
}

export async function resolveAuthorizedAccount(
  database: D1Database,
  identity: ChatGPTUser,
): Promise<AuthorizedAccount> {
  const userId = await new SyncRepository(database).resolveUser(identity);
  const bootstrapAdmins = await getBootstrapAdminEmails();
  const repository = new AuthorizationRepository(database);
  await repository.ensureBaselineRoles(
    userId,
    bootstrapAdmins.has(identity.email.trim().toLowerCase()),
  );
  return { userId, authorization: await repository.getAuthorization(userId) };
}

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

const IDENTITY_PROVIDER = "chatgpt";

export type AuthorizedAccount = {
  userId: string;
  authorization: AppAuthorization;
};

export type AdminUserSummary = {
  userId: string;
  email: string;
  status: string;
  roles: AppRole[];
  createdAt: number;
  updatedAt: number;
};

export class AdminRoleSelfRevocationError extends Error {
  readonly code = "ADMIN_SELF_REVOCATION_BLOCKED";
}

export class AuthorizationTargetNotFoundError extends Error {
  readonly code = "AUTHORIZATION_TARGET_NOT_FOUND";
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
        "SELECT role FROM user_roles WHERE user_id = ? ORDER BY CASE role WHEN 'learner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END",
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
                COALESCE(ai.normalized_email, '') AS email,
                u.status AS status,
                u.created_at AS createdAt,
                u.updated_at AS updatedAt,
                COALESCE(GROUP_CONCAT(ur.role), '') AS roles
           FROM users u
           LEFT JOIN auth_identities ai
             ON ai.user_id = u.id AND ai.provider = ?
           LEFT JOIN user_roles ur ON ur.user_id = u.id
          GROUP BY u.id, ai.normalized_email, u.status, u.created_at, u.updated_at
          ORDER BY u.created_at DESC, u.id
          LIMIT ?`,
      )
      .bind(IDENTITY_PROVIDER, boundedLimit)
      .all<{
        userId: string;
        email: string;
        status: string;
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
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async setAdminRole(
    actorUserId: string,
    targetUserId: string,
    enabled: boolean,
  ): Promise<AppAuthorization> {
    if (actorUserId === targetUserId && !enabled) {
      throw new AdminRoleSelfRevocationError(
        "An administrator cannot revoke their own administrative role.",
      );
    }
    const target = await this.database
      .prepare("SELECT id FROM users WHERE id = ? AND status = 'active' LIMIT 1")
      .bind(targetUserId)
      .first<{ id: string }>();
    if (!target) throw new AuthorizationTargetNotFoundError("Account not found.");

    const timestamp = Date.now();
    const statements = [
      this.database
        .prepare(
          "INSERT OR IGNORE INTO user_roles (user_id, role, granted_by_user_id, granted_at, updated_at) VALUES (?, 'learner', ?, ?, ?)",
        )
        .bind(targetUserId, actorUserId, timestamp, timestamp),
      enabled
        ? this.database
            .prepare(
              "INSERT OR IGNORE INTO user_roles (user_id, role, granted_by_user_id, granted_at, updated_at) VALUES (?, 'admin', ?, ?, ?)",
            )
            .bind(targetUserId, actorUserId, timestamp, timestamp)
        : this.database
            .prepare("DELETE FROM user_roles WHERE user_id = ? AND role = 'admin'")
            .bind(targetUserId),
    ];
    await this.database.batch(statements);
    return this.getAuthorization(targetUserId);
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

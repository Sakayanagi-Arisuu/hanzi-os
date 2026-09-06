import { getAuthenticatedUser, type ChatGPTUser } from "../chatgpt-auth";
import { hasPermission, type AppPermission } from "../../src/auth/authorization";
import { recentFirstPartySession } from "../../src/server/authHttp";
import { resolveAuthorizedAccount, type AuthorizedAccount } from "../../src/server/authorizationRepository";
import { getD1Database, type D1Database } from "../../src/server/d1";

export type AdminContext = {
  identity: ChatGPTUser;
  database: D1Database;
  account: AuthorizedAccount;
  stepUpReady: boolean;
};

export type AdminContextState =
  | { kind: "ok"; context: AdminContext }
  | { kind: "unauthenticated" }
  | { kind: "denied" }
  | { kind: "offline" };

/**
 * Every admin page resolves the same server-side identity and permission boundary.
 * Pages stay small and focused while the data boundary remains fail-closed.
 */
export async function loadAdminContext(
  permission: AppPermission = "admin:users:read",
): Promise<AdminContextState> {
  const identity = await getAuthenticatedUser();
  if (!identity) return { kind: "unauthenticated" };
  try {
    const database = await getD1Database();
    const account = await resolveAuthorizedAccount(database, identity);
    if (!hasPermission(account.authorization, permission)) return { kind: "denied" };
    return {
      kind: "ok",
      context: {
        identity,
        database,
        account,
        stepUpReady: recentFirstPartySession(identity) !== null,
      },
    };
  } catch {
    return { kind: "offline" };
  }
}

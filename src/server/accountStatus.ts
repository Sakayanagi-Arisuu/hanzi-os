import type { D1Database } from "./d1";

export class AccountLockedError extends Error {
  readonly code = "ACCOUNT_LOCKED";
}

export async function assertAccountCanAuthenticate(
  database: D1Database,
  userId: string,
): Promise<void> {
  const account = await database
    .prepare("SELECT status FROM users WHERE id = ? LIMIT 1")
    .bind(userId)
    .first<{ status: string }>();
  if (!account || account.status === "deleted") {
    throw new Error("Authenticated account is unavailable.");
  }
  if (account.status === "locked") {
    throw new AccountLockedError("Authenticated account is locked.");
  }
}

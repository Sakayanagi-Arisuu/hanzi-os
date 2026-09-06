import {
  constantTimeEqual,
  randomBase64Url,
  sha256Base64Url,
} from "../auth/authCrypto";
import type { D1Database } from "./d1";
import { assertAccountCanAuthenticate } from "./accountStatus";
import { isNewAccountRegistrationOpen } from "./systemSettingsRepository";
import {
  HANZI_PASSWORD_ALGORITHM,
  HANZI_PASSWORD_ITERATIONS,
  hashHanziPassword,
  normalizeHanziIdentifier,
  validateHanziRegistration,
  verifyHanziPassword,
  type HanziRegistrationInput,
} from "./hanziPassword";

export const SESSION_COOKIE_NAME = "__Host-hanzi_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const RECENT_AUTH_WINDOW_MS = 10 * 60_000;

export const normalizeAuthDeviceLabel = (value: string | null | undefined) => {
  const normalized = value?.trim().replace(/^"(.*)"$/u, "$1").trim() ?? "";
  return normalized ? normalized.slice(0, 120) : null;
};

export const FIRST_PARTY_AUTH_PROVIDERS = [
  "google",
  "facebook",
  "hanzi",
  "email_otp",
  "passkey",
] as const;

export type FirstPartyAuthProvider =
  typeof FIRST_PARTY_AUTH_PROVIDERS[number];

export type AuthChallengeKind =
  | "google_signin"
  | "google_link"
  | "google_unlink"
  | "facebook_signin"
  | "facebook_link"
  | "facebook_unlink"
  | "email_signin"
  | "email_link"
  | "email_unlink"
  | "passkey_register"
  | "passkey_signin"
  | "passkey_unlink";

export type FederatedIdentity = {
  provider: FirstPartyAuthProvider;
  providerSubject: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
};

export type NativeSessionUser = {
  userId: string;
  sessionId: string;
  identityId: string | null;
  provider: FirstPartyAuthProvider;
  displayName: string;
  email: string;
  fullName: string | null;
  authenticatedAt: number;
};

export type AccountIdentitySummary = {
  id: string;
  provider: string;
  email: string | null;
  emailVerified: boolean;
  createdAt: number;
};

export type AccountSessionSummary = {
  id: string;
  authMethod: FirstPartyAuthProvider;
  deviceLabel: string | null;
  authenticatedAt: number;
  lastSeenAt: number;
  expiresAt: number;
  current: boolean;
};

type StoredChallenge = {
  id: string;
  kind: AuthChallengeKind;
  provider: FirstPartyAuthProvider;
  userId: string | null;
  challengeHash: string;
  secretHash: string | null;
  payloadJson: string;
  attempts: number;
  createdAt: number;
  expiresAt: number;
  consumedAt: number | null;
};

export type AuthChallenge = Omit<StoredChallenge, "payloadJson"> & {
  payload: Record<string, unknown>;
};

type StoredHanziCredential = {
  id: string;
  userId: string;
  identityId: string;
  username: string;
  email: string;
  displayName: string | null;
  passwordAlgorithm: string;
  passwordIterations: number;
  passwordSalt: string;
  passwordHash: string;
  failedAttempts: number;
  lockedUntil: number | null;
};

export class AuthChallengeInvalidError extends Error {
  readonly code = "AUTH_CHALLENGE_INVALID";
}

export class AuthChallengeExpiredError extends Error {
  readonly code = "AUTH_CHALLENGE_EXPIRED";
}

export class IdentityAlreadyLinkedError extends Error {
  readonly code = "IDENTITY_ALREADY_LINKED";
}

export class LastIdentityRemovalError extends Error {
  readonly code = "LAST_IDENTITY_REMOVAL_BLOCKED";
}

export class HanziAccountConflictError extends Error {
  readonly code = "HANZI_ACCOUNT_CONFLICT";
}

export class InvalidHanziCredentialsError extends Error {
  readonly code = "HANZI_CREDENTIALS_INVALID";
}

export type HanziAccount = {
  userId: string;
  identityId: string;
  username: string;
  email: string;
  displayName: string;
};

export type LocalHanziDemoAccount = {
  username: string;
  email: string;
  password: string;
  displayName: string;
  roles: readonly ("learner" | "content_editor" | "admin")[];
  landingPath: "/" | "/studio" | "/admin";
};

export const LOCAL_HANZI_DEMO_ACCOUNTS: readonly LocalHanziDemoAccount[] = [
  {
    username: "learner.demo",
    email: "learner@hanzi.local",
    password: "Hanzi.Learner#2026",
    displayName: "Hành Giả Demo",
    roles: ["learner"],
    landingPath: "/",
  },
  {
    username: "editor.demo",
    email: "editor@hanzi.local",
    password: "Hanzi.Editor#2026",
    displayName: "Biên Tập Viên Demo",
    roles: ["learner", "content_editor"],
    landingPath: "/studio",
  },
  {
    username: "admin.demo",
    email: "admin@hanzi.local",
    password: "Hanzi.Admin#2026",
    displayName: "Điều Hành Viên Demo",
    roles: ["learner", "admin"],
    landingPath: "/admin",
  },
] as const;

const normalizeEmail = (email: string | null) => {
  const normalized = email?.trim().toLowerCase() ?? "";
  return normalized.length > 0 ? normalized : null;
};

const parsePayload = (value: string): Record<string, unknown> => {
  const parsed: unknown = JSON.parse(value);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : {};
};

export class AuthRepository {
  constructor(private readonly database: D1Database) {}

  async registerHanziAccount(
    input: HanziRegistrationInput,
  ): Promise<HanziAccount> {
    const normalized = validateHanziRegistration(input);
    if (!await isNewAccountRegistrationOpen(this.database)) {
      throw new Error("New account registration is closed.");
    }
    const digest = await hashHanziPassword(normalized.password);
    const timestamp = Date.now();
    const userId = crypto.randomUUID();
    const identityId = crypto.randomUUID();
    const credentialId = crypto.randomUUID();
    try {
      await this.database.batch([
        this.database
          .prepare(
            "INSERT INTO users (id, status, created_at, updated_at) VALUES (?, 'active', ?, ?)",
          )
          .bind(userId, timestamp, timestamp),
        this.database
          .prepare(
            "INSERT INTO auth_identities (id, user_id, provider, provider_subject, normalized_email, email_verified, created_at, updated_at) VALUES (?, ?, 'hanzi', ?, ?, 0, ?, ?)",
          )
          .bind(
            identityId,
            userId,
            normalized.username,
            normalized.email,
            timestamp,
            timestamp,
          ),
        this.database
          .prepare(
            `INSERT INTO hanzi_password_credentials (
              id, user_id, identity_id, normalized_username, normalized_email,
              password_algorithm, password_iterations, password_salt,
              password_hash, failed_attempts, locked_until, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?)`,
          )
          .bind(
            credentialId,
            userId,
            identityId,
            normalized.username,
            normalized.email,
            digest.algorithm,
            digest.iterations,
            digest.salt,
            digest.hash,
            timestamp,
            timestamp,
          ),
        this.database
          .prepare(
            `INSERT INTO profiles (
              user_id, display_name, goal, daily_minutes, script,
              starting_level, onboarded, revision, created_at, updated_at
            ) VALUES (?, ?, 'conversation', 20, 'simplified', 'zero', 0, 1, ?, ?)`,
          )
          .bind(userId, normalized.displayName, timestamp, timestamp),
        this.database
          .prepare(
            "INSERT INTO user_roles (user_id, role, granted_by_user_id, granted_at, updated_at) VALUES (?, 'learner', NULL, ?, ?)",
          )
          .bind(userId, timestamp, timestamp),
      ]);
    } catch (error) {
      const collision = await this.database
        .prepare(
          "SELECT id FROM hanzi_password_credentials WHERE normalized_username = ? OR normalized_email = ? LIMIT 1",
        )
        .bind(normalized.username, normalized.email)
        .first<{ id: string }>();
      if (collision) {
        throw new HanziAccountConflictError(
          "Tên tài khoản hoặc email đã được sử dụng.",
        );
      }
      throw error;
    }
    return {
      userId,
      identityId,
      username: normalized.username,
      email: normalized.email,
      displayName: normalized.displayName,
    };
  }

  async authenticateHanziAccount(
    identifier: string,
    password: string,
    now = Date.now(),
  ): Promise<HanziAccount> {
    const normalizedIdentifier = normalizeHanziIdentifier(identifier);
    const identifierIsBounded = normalizedIdentifier.value.length >= 3
      && normalizedIdentifier.value.length <= 254;
    const passwordLength = [...password].length;
    const passwordIsBounded = passwordLength >= 1
      && passwordLength <= 128
      && new TextEncoder().encode(password).byteLength <= 256;
    const stored = identifierIsBounded
      ? await this.database
          .prepare(
            `SELECT credential.id,
                    credential.user_id AS userId,
                    credential.identity_id AS identityId,
                    credential.normalized_username AS username,
                    credential.normalized_email AS email,
                    profile.display_name AS displayName,
                    credential.password_algorithm AS passwordAlgorithm,
                    credential.password_iterations AS passwordIterations,
                    credential.password_salt AS passwordSalt,
                    credential.password_hash AS passwordHash,
                    credential.failed_attempts AS failedAttempts,
                    credential.locked_until AS lockedUntil
               FROM hanzi_password_credentials credential
               JOIN auth_identities identity
                 ON identity.id = credential.identity_id
                AND identity.user_id = credential.user_id
                AND identity.provider = 'hanzi'
               JOIN users user ON user.id = credential.user_id
               LEFT JOIN profiles profile ON profile.user_id = credential.user_id
              WHERE ${normalizedIdentifier.kind === "email"
                ? "credential.normalized_email"
                : "credential.normalized_username"} = ?
              LIMIT 1`,
          )
          .bind(normalizedIdentifier.value)
          .first<StoredHanziCredential>()
      : null;
    const digest = stored && passwordIsBounded
      ? {
          algorithm: stored.passwordAlgorithm as typeof HANZI_PASSWORD_ALGORITHM,
          iterations: Number(stored.passwordIterations),
          salt: stored.passwordSalt,
          hash: stored.passwordHash,
        }
      : null;
    const passwordMatches = await verifyHanziPassword(
      passwordIsBounded ? password : "invalid-password-placeholder-0",
      digest,
    );
    const stillLocked = stored?.lockedUntil !== null
      && stored?.lockedUntil !== undefined
      && Number(stored.lockedUntil) > now;
    if (!stored || !passwordMatches || stillLocked) {
      if (stored && !stillLocked) {
        const failedAttempts = Math.min(1_000, Number(stored.failedAttempts) + 1);
        const delay = failedAttempts >= 5
          ? Math.min(15 * 60_000, 30_000 * (2 ** Math.min(5, failedAttempts - 5)))
          : 0;
        await this.database
          .prepare(
            "UPDATE hanzi_password_credentials SET failed_attempts = ?, locked_until = ?, updated_at = ? WHERE id = ?",
          )
          .bind(
            failedAttempts,
            delay > 0 ? now + delay : null,
            now,
            stored.id,
          )
          .run();
      }
      throw new InvalidHanziCredentialsError(
        "Tên tài khoản, email hoặc mật khẩu không đúng.",
      );
    }
    await assertAccountCanAuthenticate(this.database, stored.userId);
    if (stored.passwordIterations < HANZI_PASSWORD_ITERATIONS) {
      const upgraded = await hashHanziPassword(password);
      await this.database
        .prepare(
          `UPDATE hanzi_password_credentials
              SET password_algorithm = ?, password_iterations = ?,
                  password_salt = ?, password_hash = ?, failed_attempts = 0,
                  locked_until = NULL, updated_at = ?
            WHERE id = ?`,
        )
        .bind(
          upgraded.algorithm,
          upgraded.iterations,
          upgraded.salt,
          upgraded.hash,
          now,
          stored.id,
        )
        .run();
    } else {
      await this.database
        .prepare(
          "UPDATE hanzi_password_credentials SET failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?",
        )
        .bind(now, stored.id)
        .run();
    }
    return {
      userId: stored.userId,
      identityId: stored.identityId,
      username: stored.username,
      email: stored.email,
      displayName: stored.displayName ?? stored.username,
    };
  }

  async seedLocalDemoAccounts(
    localDevelopmentConfirmed: boolean,
  ): Promise<readonly LocalHanziDemoAccount[]> {
    if (!localDevelopmentConfirmed) {
      throw new Error("Local demo accounts cannot be seeded outside loopback development.");
    }
    for (const [index, account] of LOCAL_HANZI_DEMO_ACCOUNTS.entries()) {
      await this.upsertLocalDemoAccount(index, account);
    }
    return LOCAL_HANZI_DEMO_ACCOUNTS;
  }

  async resolveOrCreateIdentity(
    identity: FederatedIdentity,
    linkToUserId?: string,
  ): Promise<{ userId: string; identityId: string; created: boolean }> {
    const providerSubject = identity.providerSubject.trim();
    if (providerSubject.length < 1 || providerSubject.length > 512) {
      throw new Error("Identity subject is invalid.");
    }
    const existing = await this.database
      .prepare(
        "SELECT id, user_id AS userId FROM auth_identities WHERE provider = ? AND provider_subject = ? LIMIT 1",
      )
      .bind(identity.provider, providerSubject)
      .first<{ id: string; userId: string }>();
    if (existing) {
      if (linkToUserId && existing.userId !== linkToUserId) {
        throw new IdentityAlreadyLinkedError(
          "This identity already belongs to another account.",
        );
      }
      await assertAccountCanAuthenticate(this.database, existing.userId);
      await this.touchIdentity(existing.id, existing.userId, identity);
      return { userId: existing.userId, identityId: existing.id, created: false };
    }

    const timestamp = Date.now();
    const identityId = crypto.randomUUID();
    if (linkToUserId) {
      const target = await this.database
        .prepare("SELECT id FROM users WHERE id = ? AND status = 'active' LIMIT 1")
        .bind(linkToUserId)
        .first<{ id: string }>();
      if (!target) throw new Error("The account to link is unavailable.");
      try {
        await this.database
          .prepare(
            "INSERT INTO auth_identities (id, user_id, provider, provider_subject, normalized_email, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          )
          .bind(
            identityId,
            linkToUserId,
            identity.provider,
            providerSubject,
            normalizeEmail(identity.email),
            identity.emailVerified ? 1 : 0,
            timestamp,
            timestamp,
          )
          .run();
        return { userId: linkToUserId, identityId, created: true };
      } catch {
        const winner = await this.database
          .prepare(
            "SELECT id, user_id AS userId FROM auth_identities WHERE provider = ? AND provider_subject = ? LIMIT 1",
          )
          .bind(identity.provider, providerSubject)
          .first<{ id: string; userId: string }>();
        if (!winner || winner.userId !== linkToUserId) {
          throw new IdentityAlreadyLinkedError(
            "This identity already belongs to another account.",
          );
        }
        return { userId: winner.userId, identityId: winner.id, created: false };
      }
    }

    // Email equality is deliberately absent from this lookup and insert path.
    // Linking two providers is an explicit, re-authenticated operation only.
    if (!await isNewAccountRegistrationOpen(this.database)) {
      throw new Error("New account registration is closed.");
    }
    const userId = crypto.randomUUID();
    try {
      await this.database.batch([
        this.database
          .prepare(
            "INSERT INTO users (id, status, created_at, updated_at) VALUES (?, 'active', ?, ?)",
          )
          .bind(userId, timestamp, timestamp),
        this.database
          .prepare(
            "INSERT INTO auth_identities (id, user_id, provider, provider_subject, normalized_email, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          )
          .bind(
            identityId,
            userId,
            identity.provider,
            providerSubject,
            normalizeEmail(identity.email),
            identity.emailVerified ? 1 : 0,
            timestamp,
            timestamp,
          ),
        this.database
          .prepare(
            "INSERT INTO user_roles (user_id, role, granted_by_user_id, granted_at, updated_at) VALUES (?, 'learner', NULL, ?, ?)",
          )
          .bind(userId, timestamp, timestamp),
      ]);
      return { userId, identityId, created: true };
    } catch {
      const winner = await this.database
        .prepare(
          "SELECT id, user_id AS userId FROM auth_identities WHERE provider = ? AND provider_subject = ? LIMIT 1",
        )
        .bind(identity.provider, providerSubject)
        .first<{ id: string; userId: string }>();
      if (!winner) throw new Error("Unable to establish the authenticated user.");
      await assertAccountCanAuthenticate(this.database, winner.userId);
      await this.touchIdentity(winner.id, winner.userId, identity);
      return { userId: winner.userId, identityId: winner.id, created: false };
    }
  }

  async createSession(input: {
    userId: string;
    identityId: string;
    authMethod: FirstPartyAuthProvider;
    userAgent?: string | null;
    deviceLabel?: string | null;
  }): Promise<{ token: string; sessionId: string; expiresAt: number }> {
    await assertAccountCanAuthenticate(this.database, input.userId);
    const token = randomBase64Url(32);
    const tokenHash = await sha256Base64Url(token);
    const timestamp = Date.now();
    const expiresAt = timestamp + SESSION_MAX_AGE_SECONDS * 1_000;
    const sessionId = crypto.randomUUID();
    const userAgentHash = input.userAgent
      ? await sha256Base64Url(input.userAgent.slice(0, 1_024))
      : null;
    await this.database
      .prepare(
        "INSERT INTO auth_sessions (id, user_id, identity_id, token_hash, auth_method, device_label, user_agent_hash, authenticated_at, created_at, last_seen_at, expires_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)",
      )
      .bind(
        sessionId,
        input.userId,
        input.identityId,
        tokenHash,
        input.authMethod,
        normalizeAuthDeviceLabel(input.deviceLabel),
        userAgentHash,
        timestamp,
        timestamp,
        timestamp,
        expiresAt,
      )
      .run();
    return { token, sessionId, expiresAt };
  }

  async resolveSession(
    token: string,
    now = Date.now(),
  ): Promise<NativeSessionUser | null> {
    if (!/^[A-Za-z0-9_-]{40,100}$/u.test(token)) return null;
    const tokenHash = await sha256Base64Url(token);
    const row = await this.database
      .prepare(
        `SELECT s.id AS sessionId,
                s.user_id AS userId,
                s.identity_id AS identityId,
                s.auth_method AS provider,
                s.authenticated_at AS authenticatedAt,
                COALESCE(p.display_name, email_identity.normalized_email, s.user_id) AS displayName,
                COALESCE(email_identity.normalized_email, '') AS email
           FROM auth_sessions s
           JOIN users u ON u.id = s.user_id AND u.status = 'active'
           LEFT JOIN profiles p ON p.user_id = s.user_id
           LEFT JOIN auth_identities email_identity ON email_identity.id = (
             SELECT candidate.id
               FROM auth_identities candidate
              WHERE candidate.user_id = s.user_id
                AND candidate.email_verified = 1
                AND candidate.normalized_email IS NOT NULL
              ORDER BY CASE candidate.provider
                WHEN 'google' THEN 0 WHEN 'email_otp' THEN 1 ELSE 2 END,
                candidate.created_at
              LIMIT 1
           )
          WHERE s.token_hash = ?
            AND s.revoked_at IS NULL
            AND s.expires_at > ?
          LIMIT 1`,
      )
      .bind(tokenHash, now)
      .first<NativeSessionUser>();
    if (!row) return null;
    await this.database
      .prepare(
        "UPDATE auth_sessions SET last_seen_at = ? WHERE id = ? AND last_seen_at < ?",
      )
      .bind(now, row.sessionId, now - 60_000)
      .run();
    return { ...row, fullName: row.displayName };
  }

  async createChallenge(input: {
    kind: AuthChallengeKind;
    provider: FirstPartyAuthProvider;
    userId?: string | null;
    secret?: string | null;
    payload?: Record<string, unknown>;
    ttlMs?: number;
  }): Promise<string> {
    const challenge = randomBase64Url(32);
    const challengeHash = await sha256Base64Url(challenge);
    const secretHash = input.secret
      ? await sha256Base64Url(`${challenge}.${input.secret}`)
      : null;
    const createdAt = Date.now();
    const expiresAt = createdAt + Math.max(60_000, Math.min(15 * 60_000, input.ttlMs ?? 10 * 60_000));
    await this.database
      .prepare(
        "INSERT INTO auth_challenges (id, kind, provider, user_id, challenge_hash, secret_hash, payload_json, attempts, created_at, expires_at, consumed_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, NULL)",
      )
      .bind(
        crypto.randomUUID(),
        input.kind,
        input.provider,
        input.userId ?? null,
        challengeHash,
        secretHash,
        JSON.stringify(input.payload ?? {}),
        createdAt,
        expiresAt,
      )
      .run();
    return challenge;
  }

  async verifyChallenge(
    challenge: string,
    expectedKind: AuthChallengeKind,
    secret?: string,
  ): Promise<AuthChallenge> {
    const challengeHash = await sha256Base64Url(challenge);
    const row = await this.database
      .prepare(
        "SELECT id, kind, provider, user_id AS userId, challenge_hash AS challengeHash, secret_hash AS secretHash, payload_json AS payloadJson, attempts, created_at AS createdAt, expires_at AS expiresAt, consumed_at AS consumedAt FROM auth_challenges WHERE challenge_hash = ? LIMIT 1",
      )
      .bind(challengeHash)
      .first<StoredChallenge>();
    if (!row || row.kind !== expectedKind || row.consumedAt !== null) {
      throw new AuthChallengeInvalidError("Authentication challenge is invalid.");
    }
    if (row.expiresAt <= Date.now() || row.attempts >= 5) {
      throw new AuthChallengeExpiredError("Authentication challenge expired.");
    }
    if (row.secretHash !== null) {
      const suppliedHash = await sha256Base64Url(`${challenge}.${secret ?? ""}`);
      if (!constantTimeEqual(row.secretHash, suppliedHash)) {
        await this.database
          .prepare("UPDATE auth_challenges SET attempts = attempts + 1 WHERE id = ? AND attempts < 5")
          .bind(row.id)
          .run();
        throw new AuthChallengeInvalidError("Authentication code is invalid.");
      }
    }
    return { ...row, payload: parsePayload(row.payloadJson) };
  }

  async consumeChallenge(challenge: AuthChallenge): Promise<void> {
    const result = await this.database
      .prepare(
        "UPDATE auth_challenges SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL",
      )
      .bind(Date.now(), challenge.id)
      .run();
    if ((result.meta?.changes ?? 0) !== 1) {
      throw new AuthChallengeInvalidError("Authentication challenge was already used.");
    }
  }

  async listIdentities(userId: string): Promise<AccountIdentitySummary[]> {
    const result = await this.database
      .prepare(
        "SELECT id, provider, normalized_email AS email, email_verified AS emailVerified, created_at AS createdAt FROM auth_identities WHERE user_id = ? ORDER BY created_at, provider",
      )
      .bind(userId)
      .all<AccountIdentitySummary>();
    if (!result.success) throw new Error("Unable to list account identities.");
    return result.results ?? [];
  }

  async listSessions(
    userId: string,
    currentSessionId: string | null,
  ): Promise<AccountSessionSummary[]> {
    const result = await this.database
      .prepare(
        "SELECT id, auth_method AS authMethod, device_label AS deviceLabel, authenticated_at AS authenticatedAt, last_seen_at AS lastSeenAt, expires_at AS expiresAt FROM auth_sessions WHERE user_id = ? AND revoked_at IS NULL AND expires_at > ? ORDER BY last_seen_at DESC",
      )
      .bind(userId, Date.now())
      .all<Omit<AccountSessionSummary, "current">>();
    if (!result.success) throw new Error("Unable to list account sessions.");
    return (result.results ?? []).map((session) => ({
      ...session,
      deviceLabel: normalizeAuthDeviceLabel(session.deviceLabel),
      current: session.id === currentSessionId,
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<boolean> {
    const result = await this.database
      .prepare(
        "UPDATE auth_sessions SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL",
      )
      .bind(Date.now(), sessionId, userId)
      .run();
    return (result.meta?.changes ?? 0) === 1;
  }

  async unlinkIdentity(input: {
    userId: string;
    provider: FirstPartyAuthProvider;
    providerSubject: string;
  }): Promise<void> {
    const count = await this.database
      .prepare("SELECT COUNT(*) AS count FROM auth_identities WHERE user_id = ?")
      .bind(input.userId)
      .first<{ count: number }>();
    if (!count || Number(count.count) <= 1) {
      throw new LastIdentityRemovalError(
        "Add another sign-in method before removing this one.",
      );
    }
    const result = await this.database
      .prepare(
        "DELETE FROM auth_identities WHERE user_id = ? AND provider = ? AND provider_subject = ?",
      )
      .bind(input.userId, input.provider, input.providerSubject)
      .run();
    if ((result.meta?.changes ?? 0) !== 1) {
      throw new AuthChallengeInvalidError("The verified identity was not linked.");
    }
  }

  async createPasskeyCredential(input: {
    userId: string;
    credentialId: string;
    publicKeyJwk: JsonWebKey;
    algorithm: -7 | -257;
    signCount: number;
    transports: string[];
    label: string | null;
    backupEligible: boolean;
    backupState: boolean;
  }): Promise<string> {
    const linked = await this.resolveOrCreateIdentity({
      provider: "passkey",
      providerSubject: input.credentialId,
      email: null,
      emailVerified: false,
      displayName: input.label,
    }, input.userId);
    const timestamp = Date.now();
    await this.database
      .prepare(
        "INSERT INTO passkey_credentials (id, user_id, identity_id, public_key_jwk_json, algorithm, sign_count, transports_json, label, backup_eligible, backup_state, created_at, last_used_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)",
      )
      .bind(
        input.credentialId,
        input.userId,
        linked.identityId,
        JSON.stringify(input.publicKeyJwk),
        input.algorithm,
        input.signCount,
        JSON.stringify(input.transports),
        input.label,
        input.backupEligible ? 1 : 0,
        input.backupState ? 1 : 0,
        timestamp,
      )
      .run();
    return linked.identityId;
  }

  async getPasskeyCredential(credentialId: string): Promise<{
    id: string;
    userId: string;
    identityId: string;
    publicKeyJwk: JsonWebKey;
    algorithm: -7 | -257;
    signCount: number;
    transports: string[];
  } | null> {
    const row = await this.database
      .prepare(
        `SELECT pc.id, pc.user_id AS userId, pc.identity_id AS identityId,
                pc.public_key_jwk_json AS publicKeyJwkJson, pc.algorithm,
                pc.sign_count AS signCount, pc.transports_json AS transportsJson
           FROM passkey_credentials pc
           JOIN users u ON u.id = pc.user_id AND u.status = 'active'
          WHERE pc.id = ? LIMIT 1`,
      )
      .bind(credentialId)
      .first<{
        id: string;
        userId: string;
        identityId: string;
        publicKeyJwkJson: string;
        algorithm: -7 | -257;
        signCount: number;
        transportsJson: string;
      }>();
    return row
      ? {
          id: row.id,
          userId: row.userId,
          identityId: row.identityId,
          publicKeyJwk: JSON.parse(row.publicKeyJwkJson) as JsonWebKey,
          algorithm: row.algorithm,
          signCount: row.signCount,
          transports: JSON.parse(row.transportsJson) as string[],
        }
      : null;
  }

  async listPasskeyCredentialDescriptors(userId: string): Promise<Array<{
    id: string;
    transports: string[];
  }>> {
    const result = await this.database
      .prepare(
        "SELECT id, transports_json AS transportsJson FROM passkey_credentials WHERE user_id = ? ORDER BY created_at",
      )
      .bind(userId)
      .all<{ id: string; transportsJson: string }>();
    if (!result.success) throw new Error("Unable to list passkeys.");
    return (result.results ?? []).map((credential) => ({
      id: credential.id,
      transports: JSON.parse(credential.transportsJson) as string[],
    }));
  }

  async markPasskeyUsed(
    credentialId: string,
    previousSignCount: number,
    nextSignCount: number,
  ): Promise<void> {
    if (
      previousSignCount > 0
      && nextSignCount > 0
      && nextSignCount <= previousSignCount
    ) {
      throw new Error("Passkey signature counter did not advance.");
    }
    await this.database
      .prepare(
        "UPDATE passkey_credentials SET sign_count = ?, last_used_at = ? WHERE id = ?",
      )
      .bind(Math.max(previousSignCount, nextSignCount), Date.now(), credentialId)
      .run();
  }

  private async upsertLocalDemoAccount(
    index: number,
    account: LocalHanziDemoAccount,
  ): Promise<void> {
    const userId = `local-demo-user-${index + 1}`;
    const identityId = `local-demo-hanzi-identity-${index + 1}`;
    const credentialId = `local-demo-hanzi-credential-${index + 1}`;
    const existing = await this.database
      .prepare(
        "SELECT id, user_id AS userId FROM auth_identities WHERE provider = 'hanzi' AND provider_subject = ? LIMIT 1",
      )
      .bind(account.username)
      .first<{ id: string; userId: string }>();
    if (existing && (existing.id !== identityId || existing.userId !== userId)) {
      throw new HanziAccountConflictError(
        `Tài khoản local ${account.username} đã thuộc về một hồ sơ khác.`,
      );
    }
    const existingCredential = await this.database
      .prepare(
        `SELECT user_id AS userId, identity_id AS identityId,
                normalized_username AS username, normalized_email AS email,
                password_algorithm AS algorithm,
                password_iterations AS iterations,
                failed_attempts AS failedAttempts,
                locked_until AS lockedUntil
           FROM hanzi_password_credentials WHERE id = ? LIMIT 1`,
      )
      .bind(credentialId)
      .first<{
        userId: string;
        identityId: string;
        username: string;
        email: string;
        algorithm: string;
        iterations: number;
        failedAttempts: number;
        lockedUntil: number | null;
      }>();
    if (existingCredential && (
      existingCredential.userId !== userId
      || existingCredential.identityId !== identityId
      || existingCredential.username !== account.username
      || existingCredential.email !== account.email
    )) {
      throw new HanziAccountConflictError(
        `Credential local ${account.username} không còn đúng định danh cố định.`,
      );
    }
    const currentDigestCanBeRetained = existingCredential?.algorithm
      === HANZI_PASSWORD_ALGORITHM
      && Number(existingCredential.iterations) === HANZI_PASSWORD_ITERATIONS;
    if (existing && existingCredential && currentDigestCanBeRetained) {
      const [profile, storedRoles] = await Promise.all([
        this.database
          .prepare(
            `SELECT user.status, profile.display_name AS displayName,
                    profile.onboarded
               FROM users user
               LEFT JOIN profiles profile ON profile.user_id = user.id
              WHERE user.id = ? LIMIT 1`,
          )
          .bind(userId)
          .first<{ status: string; displayName: string | null; onboarded: number | boolean | null }>(),
        this.database
          .prepare("SELECT role FROM user_roles WHERE user_id = ?")
          .bind(userId)
          .all<{ role: string }>(),
      ]);
      const roles = new Set((storedRoles.results ?? []).map(({ role }) => role));
      if (
        profile?.status === "active"
        && profile.displayName === account.displayName
        && Boolean(profile.onboarded)
        && Number(existingCredential.failedAttempts) === 0
        && existingCredential.lockedUntil === null
        && account.roles.every((role) => roles.has(role))
      ) {
        return;
      }
    }
    const digest = currentDigestCanBeRetained
      ? null
      : await hashHanziPassword(account.password);
    const timestamp = Date.now();
    const statements = [
      this.database
        .prepare(
          `INSERT INTO users (id, status, created_at, updated_at)
           VALUES (?, 'active', ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             status = 'active', updated_at = excluded.updated_at,
             deleted_at = NULL, locked_at = NULL,
             locked_by_user_id = NULL, lock_reason = NULL`,
        )
        .bind(userId, timestamp, timestamp),
      this.database
        .prepare(
          `INSERT INTO auth_identities (
             id, user_id, provider, provider_subject, normalized_email,
             email_verified, created_at, updated_at
           ) VALUES (?, ?, 'hanzi', ?, ?, 1, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             normalized_email = excluded.normalized_email,
             email_verified = 1, updated_at = excluded.updated_at`,
        )
        .bind(
          identityId,
          userId,
          account.username,
          account.email,
          timestamp,
          timestamp,
        ),
      digest
        ? this.database
            .prepare(
              `INSERT INTO hanzi_password_credentials (
                 id, user_id, identity_id, normalized_username, normalized_email,
                 password_algorithm, password_iterations, password_salt,
                 password_hash, failed_attempts, locked_until, created_at, updated_at
               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
                 normalized_username = excluded.normalized_username,
                 normalized_email = excluded.normalized_email,
                 password_algorithm = excluded.password_algorithm,
                 password_iterations = excluded.password_iterations,
                 password_salt = excluded.password_salt,
                 password_hash = excluded.password_hash,
                 failed_attempts = 0, locked_until = NULL,
                 updated_at = excluded.updated_at`,
            )
            .bind(
              credentialId,
              userId,
              identityId,
              account.username,
              account.email,
              digest.algorithm,
              digest.iterations,
              digest.salt,
              digest.hash,
              timestamp,
              timestamp,
            )
        : this.database
            .prepare(
              `UPDATE hanzi_password_credentials
                  SET failed_attempts = 0, locked_until = NULL, updated_at = ?
                WHERE id = ? AND user_id = ? AND identity_id = ?`,
            )
            .bind(timestamp, credentialId, userId, identityId),
      this.database
        .prepare(
          `INSERT INTO profiles (
             user_id, display_name, goal, daily_minutes, script,
             starting_level, onboarded, revision, created_at, updated_at
           ) VALUES (?, ?, 'hsk', 20, 'simplified', 'hsk1', 1, 1, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET
             display_name = excluded.display_name,
             onboarded = 1, updated_at = excluded.updated_at,
             revision = profiles.revision + 1`,
        )
        .bind(userId, account.displayName, timestamp, timestamp),
    ];
    for (const role of account.roles) {
      statements.push(
        this.database
          .prepare(
            `INSERT OR IGNORE INTO user_roles (
               user_id, role, granted_by_user_id, granted_at, updated_at
             ) VALUES (?, ?, NULL, ?, ?)`,
          )
          .bind(userId, role, timestamp, timestamp),
      );
    }
    await this.database.batch(statements);
  }

  private async touchIdentity(
    identityId: string,
    userId: string,
    identity: FederatedIdentity,
  ): Promise<void> {
    const timestamp = Date.now();
    await this.database.batch([
      this.database
        .prepare(
          "UPDATE users SET status = 'active', updated_at = ?, deleted_at = NULL WHERE id = ? AND status IN ('active', 'deletion_pending')",
        )
        .bind(timestamp, userId),
      this.database
        .prepare(
          "UPDATE auth_identities SET normalized_email = ?, email_verified = ?, updated_at = ? WHERE id = ?",
        )
        .bind(
          normalizeEmail(identity.email),
          identity.emailVerified ? 1 : 0,
          timestamp,
          identityId,
        ),
    ]);
  }
}

export function serializeSessionCookie(token: string): string {
  return [
    `${SESSION_COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
    "Priority=High",
  ].join("; ");
}

export function clearSessionCookie(): string {
  return [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=0",
    "Priority=High",
  ].join("; ");
}

export function readCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName === name) return rawValue.join("=") || null;
  }
  return null;
}

export function hasRecentAuthentication(
  session: Pick<NativeSessionUser, "authenticatedAt">,
  now = Date.now(),
) {
  return now - session.authenticatedAt <= RECENT_AUTH_WINDOW_MS;
}

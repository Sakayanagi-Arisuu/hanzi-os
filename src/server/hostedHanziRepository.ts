import type { D1Database } from './d1';
import { assertAccountCanAuthenticate } from './accountStatus';
import { HanziAccountConflictError, InvalidHanziCredentialsError, type HanziAccount } from './authRepository';
import { normalizeHanziIdentifier, type NormalizedHanziRegistration } from './hanziPassword';
import { isNewAccountRegistrationOpen } from './systemSettingsRepository';
import type { FirebasePasswordIdentity } from './firebasePasswordIdentity';

type Alias = HanziAccount & { firebaseUid: string; projectId: string };

/** Firebase owns passwords; D1 retains learner ownership, aliases and roles. */
export class HostedHanziRepository {
  constructor(private readonly database: D1Database) {}

  async findIdentifier(identifier: string, projectId: string): Promise<Alias | null> {
    const normalized = normalizeHanziIdentifier(identifier);
    if (normalized.value.length < 3 || normalized.value.length > 254) return null;
    return this.database.prepare(`SELECT a.user_id AS userId, a.identity_id AS identityId,
      a.normalized_username AS username, a.normalized_email AS email,
      COALESCE(p.display_name, a.normalized_username) AS displayName,
      a.firebase_uid AS firebaseUid, a.project_id AS projectId
      FROM hosted_hanzi_aliases a LEFT JOIN profiles p ON p.user_id=a.user_id
      WHERE a.project_id=? AND ${normalized.kind === 'email' ? 'a.normalized_email' : 'a.normalized_username'}=? LIMIT 1`)
      .bind(projectId, normalized.value).first<Alias>();
  }

  async findUid(projectId: string, uid: string): Promise<Alias | null> {
    return this.database.prepare(`SELECT a.user_id AS userId, a.identity_id AS identityId,
      a.normalized_username AS username, a.normalized_email AS email,
      COALESCE(p.display_name, a.normalized_username) AS displayName,
      a.firebase_uid AS firebaseUid, a.project_id AS projectId
      FROM hosted_hanzi_aliases a LEFT JOIN profiles p ON p.user_id=a.user_id
      WHERE a.project_id=? AND a.firebase_uid=? LIMIT 1`).bind(projectId, uid).first<Alias>();
  }

  async assertRegistrationAllowed(input: NormalizedHanziRegistration, projectId: string) {
    if (!await isNewAccountRegistrationOpen(this.database)) throw new Error('New account registration is closed.');
    const occupied = await this.database.prepare(`SELECT normalized_username AS username, normalized_email AS email
      FROM hosted_hanzi_aliases WHERE project_id=? AND (normalized_username=? OR normalized_email=?) LIMIT 1`)
      .bind(projectId, input.username, input.email).first<{ username: string; email: string }>();
    if (occupied) throw new HanziAccountConflictError('Tên tài khoản hoặc email đã được sử dụng.');
  }

  async register(input: NormalizedHanziRegistration, identity: FirebasePasswordIdentity): Promise<HanziAccount> {
    if (identity.email !== input.email) throw new InvalidHanziCredentialsError('Password identity differs from registration.');
    await this.assertRegistrationAllowed(input, identity.projectId);
    const timestamp = Date.now();
    const userId = crypto.randomUUID();
    const identityId = crypto.randomUUID();
    try {
      const results = await this.database.batch([
        this.database.prepare("INSERT INTO users(id,status,created_at,updated_at) VALUES(?,'active',?,?)").bind(userId, timestamp, timestamp),
        this.database.prepare(`INSERT INTO auth_identities(id,user_id,provider,provider_subject,normalized_email,email_verified,created_at,updated_at)
          VALUES(?,?,'hanzi',?,?,?,?,?)`).bind(identityId, userId, `firebase:${identity.projectId}:${identity.uid}`, identity.email, identity.emailVerified ? 1 : 0, timestamp, timestamp),
        this.database.prepare(`INSERT INTO hosted_hanzi_aliases(user_id,identity_id,project_id,firebase_uid,normalized_username,normalized_email,created_at,updated_at)
          VALUES(?,?,?,?,?,?,?,?)`).bind(userId, identityId, identity.projectId, identity.uid, input.username, input.email, timestamp, timestamp),
        this.database.prepare(`INSERT INTO profiles(user_id,display_name,goal,daily_minutes,script,starting_level,onboarded,revision,created_at,updated_at)
          VALUES(?,?,'conversation',20,'simplified','zero',0,1,?,?)`).bind(userId, input.displayName, timestamp, timestamp),
        this.database.prepare("INSERT INTO user_roles(user_id,role,granted_by_user_id,granted_at,updated_at) VALUES(?,'learner',NULL,?,?)").bind(userId, timestamp, timestamp),
      ]);
      if (results.some(result => !result.success)) throw new Error('Hosted registration transaction failed.');
    } catch (error) {
      const existing = await this.findUid(identity.projectId, identity.uid);
      if (existing && existing.username === input.username && existing.email === input.email) {
        await assertAccountCanAuthenticate(this.database, existing.userId);
        return existing;
      }
      const conflict = await this.findIdentifier(input.username, identity.projectId)
        ?? await this.findIdentifier(input.email, identity.projectId);
      if (conflict || existing) throw new HanziAccountConflictError('Tên tài khoản hoặc email đã được sử dụng.');
      throw error;
    }
    return { userId, identityId, username: input.username, email: input.email, displayName: input.displayName };
  }

  async authenticate(alias: Alias | null, identity: FirebasePasswordIdentity): Promise<HanziAccount> {
    if (!alias || alias.projectId !== identity.projectId || alias.firebaseUid !== identity.uid
      || alias.email !== identity.email) throw new InvalidHanziCredentialsError('Credentials invalid.');
    await assertAccountCanAuthenticate(this.database, alias.userId);
    await this.database.prepare('UPDATE auth_identities SET email_verified=?,updated_at=? WHERE id=? AND user_id=?')
      .bind(identity.emailVerified ? 1 : 0, Date.now(), alias.identityId, alias.userId).run();
    return alias;
  }
}

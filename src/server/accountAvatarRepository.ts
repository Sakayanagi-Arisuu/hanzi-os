import type { D1Database } from './d1';
import { validateEncodedAvatar } from './avatarEncoding';
import { sha256Hex } from '../sync/canonicalHash';

export class AvatarConflictError extends Error {}
export class AvatarDataError extends Error {}
export type AvatarMetadata = { revision: number; updatedAt: string | null; hasImage: boolean };
type Row = { revision: number | null; updatedAt: number | null; byteLength: number | null; sha256: string | null };
export const avatarBytesSha256 = async (bytes: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes))), b => b.toString(16).padStart(2, '0')).join('');

export class AccountAvatarRepository {
  constructor(private readonly db: D1Database) {}
  private async row(userId: string) {
    const row = await this.db.prepare(`SELECT a.revision,a.updated_at AS updatedAt,a.byte_length AS byteLength,a.content_sha256 AS sha256
      FROM users u LEFT JOIN learner_avatars a ON a.user_id=u.id WHERE u.id=? AND u.status='active'`).bind(userId).first<Row>();
    if (!row) throw new AvatarDataError('Avatar owner unavailable.');
    if (row.revision !== null && (!Number.isSafeInteger(row.revision) || row.revision < 1 || row.revision >= Number.MAX_SAFE_INTEGER
      || !Number.isSafeInteger(row.updatedAt) || row.updatedAt! < 0 || row.updatedAt! > 8640000000000000
      || !Number.isSafeInteger(row.byteLength) || row.byteLength! < 0 || row.byteLength! > 204800
      || (row.byteLength === 0 ? row.sha256 !== null : typeof row.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(row.sha256)))) {
      throw new AvatarDataError('Stored avatar metadata invalid; retain source.');
    }
    return row;
  }
  async metadata(userId: string): Promise<AvatarMetadata> {
    const row = await this.row(userId);
    return { revision: row.revision ?? 0, updatedAt: row.updatedAt === null ? null : new Date(row.updatedAt).toISOString(), hasImage: Boolean(row.byteLength) };
  }
  async bytes(userId: string, revision: number) {
    const row = await this.row(userId);
    if (row.revision !== revision) throw new AvatarConflictError('Avatar revision changed.');
    if (!row.byteLength) return null;
    const result = await this.db.prepare(`SELECT sequence,data_base64 AS data FROM learner_avatar_chunks
      WHERE user_id=? AND revision=? AND EXISTS(SELECT 1 FROM users WHERE id=? AND status='active') ORDER BY sequence`)
      .bind(userId, revision, userId).all<{ sequence: number; data: string }>();
    if (!result.success || !result.results?.length || result.results.length > 5
      || result.results.some((chunk, index) => chunk.sequence !== index || chunk.data.length > 65536 || !/^[A-Za-z0-9+/]+={0,2}$/.test(chunk.data))) {
      throw new AvatarDataError('Avatar chunks invalid; retain source.');
    }
    let bytes: Uint8Array;
    try { bytes = Uint8Array.from(atob(result.results.map(chunk => chunk.data).join('')), c => c.charCodeAt(0)); }
    catch { throw new AvatarDataError('Avatar bytes unreadable.'); }
    if (bytes.length !== row.byteLength || await avatarBytesSha256(bytes) !== row.sha256) throw new AvatarDataError('Avatar integrity mismatch.');
    validateEncodedAvatar(bytes);
    if ((await this.row(userId)).revision !== revision) throw new AvatarConflictError('Avatar changed during the read.');
    return bytes;
  }
  async receipt(userId: string, operationId: string, requestSha256: string) {
    await this.row(userId);
    const row = await this.db.prepare('SELECT request_sha256 AS hash,revision FROM learner_avatar_mutations WHERE user_id=? AND operation_id=?')
      .bind(userId, operationId).first<{ hash: string; revision: number }>();
    if (row && row.hash !== requestSha256) throw new AvatarConflictError('Avatar operation reused with different input.');
    if (row && (!Number.isSafeInteger(row.revision) || row.revision < 1 || row.revision >= Number.MAX_SAFE_INTEGER)) throw new AvatarDataError('Invalid avatar receipt.');
    return row?.revision ?? null;
  }
  async mutate(userId: string, input: { operationId: string; expectedRevision: number; requestSha256: string; bytes: Uint8Array | null }) {
    const { operationId, expectedRevision, requestSha256, bytes } = input;
    if (!/^[a-f0-9-]{36}$/i.test(operationId) || !/^[a-f0-9]{64}$/.test(requestSha256) || !Number.isSafeInteger(expectedRevision)
      || expectedRevision < 0 || expectedRevision >= Number.MAX_SAFE_INTEGER - 1) throw new AvatarDataError('Invalid avatar mutation contract.');
    const previous = await this.receipt(userId, operationId, requestSha256);
    if (previous !== null) return { committedRevision: previous, metadata: await this.metadata(userId) };
    const current = await this.metadata(userId);
    if (current.revision !== expectedRevision) throw new AvatarConflictError('Avatar revision changed.');
    if (current.hasImage) await this.bytes(userId, current.revision);
    if (bytes) validateEncodedAvatar(bytes);
    const digest = bytes ? await avatarBytesSha256(bytes) : null, nonce = crypto.randomUUID(), timestamp = Date.now();
    const revision = expectedRevision + 1;
    const statements = [this.db.prepare(`INSERT OR IGNORE INTO learner_avatars(user_id,revision,updated_at,byte_length,content_sha256,last_operation_id,last_request_sha256,write_nonce)
      SELECT id,?,?,?,?,?,?,? FROM users WHERE id=? AND status='active' AND ?=0
      AND NOT EXISTS(SELECT 1 FROM learner_avatar_mutations WHERE user_id=? AND operation_id=?)`)
      .bind(revision, timestamp, bytes?.length ?? 0, digest, operationId, requestSha256, nonce, userId, expectedRevision, userId, operationId)];
    if (expectedRevision > 0) statements[0] = this.db.prepare(`UPDATE learner_avatars SET revision=?,updated_at=?,byte_length=?,content_sha256=?,
      last_operation_id=?,last_request_sha256=?,write_nonce=? WHERE user_id=? AND revision=?
      AND EXISTS(SELECT 1 FROM users WHERE id=? AND status='active')
      AND NOT EXISTS(SELECT 1 FROM learner_avatar_mutations WHERE user_id=? AND operation_id=?)`)
      .bind(revision, timestamp, bytes?.length ?? 0, digest, operationId, requestSha256, nonce, userId, expectedRevision, userId, userId, operationId);
    const committed = 'EXISTS(SELECT 1 FROM learner_avatars WHERE user_id=? AND write_nonce=?)';
    statements.push(this.db.prepare(`DELETE FROM learner_avatar_chunks WHERE user_id=? AND ${committed}`).bind(userId, userId, nonce));
    if (bytes) {
      let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
      const base64 = btoa(binary);
      for (let start = 0; start < base64.length; start += 65536) statements.push(this.db.prepare(`INSERT INTO learner_avatar_chunks(user_id,revision,sequence,data_base64)
        SELECT ?,?,?,? WHERE ${committed}`).bind(userId, revision, start / 65536, base64.slice(start, start + 65536), userId, nonce));
    }
    statements.push(this.db.prepare(`INSERT OR IGNORE INTO learner_avatar_mutations(user_id,operation_id,request_sha256,revision)
      SELECT ?,?,?,? WHERE ${committed}`).bind(userId, operationId, requestSha256, revision, userId, nonce));
    const results = await this.db.batch(statements);
    if (results.some(result => !result.success)) throw new AvatarDataError('Avatar transaction failed.');
    const accepted = await this.receipt(userId, operationId, requestSha256);
    if (accepted === null) throw new AvatarConflictError('Avatar changed; reload before replacing.');
    return { committedRevision: accepted, metadata: await this.metadata(userId) };
  }
}

export const avatarMutationHash = (expectedRevision: number, mime: string | null, bytesSha256: string | null) =>
  sha256Hex({ version: 1, expectedRevision, mime, bytesSha256 });

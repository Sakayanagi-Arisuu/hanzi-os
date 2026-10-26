import { readActiveOwnerLearningScope, readLessonResume, writeLessonResume, deleteLessonResume } from './indexedDb';
import type { CloudSession } from './protocol';

const ENTRY_KEY = 'offline-account:v1';
const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
type SavedAccount = { version: 1; generation: number; expiresAt: number; session: CloudSession };

// Explicit device permission, never a credential or server authorization.
export async function enableOfflineAccount(session: CloudSession) {
  const scope = await readActiveOwnerLearningScope();
  if (!session.authenticated || !scope || scope.ownerGeneration.ownerKey !== session.accountKey) {
    throw new Error('Hãy xác nhận tài khoản trước khi tải bài.');
  }
  await writeLessonResume({
    expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: scope.resetEpoch, entryKey: ENTRY_KEY,
    value: { version: 1, generation: scope.ownerGeneration.generation, expiresAt: Date.now() + MAX_AGE,
      session: { authenticated: true, accountKey: session.accountKey, user: session.user } } satisfies SavedAccount,
  });
}

export async function readOfflineAccount(ownerKey: string): Promise<CloudSession | null> {
  const scope = await readActiveOwnerLearningScope();
  if (!scope || scope.ownerGeneration.ownerKey !== ownerKey) return null;
  const record = await readLessonResume<SavedAccount>({ expectedOwnerGeneration: scope.ownerGeneration,
    resetEpoch: scope.resetEpoch, entryKey: ENTRY_KEY });
  const saved = record?.value;
  if (!saved || saved.version !== 1 || saved.generation !== scope.ownerGeneration.generation
    || !Number.isFinite(saved.expiresAt) || saved.expiresAt <= Date.now() || saved.expiresAt > Date.now() + MAX_AGE
    || saved.session?.authenticated !== true || saved.session.accountKey !== ownerKey
    || typeof saved.session.user?.email !== 'string') return null;
  return { authenticated: true, accountKey: ownerKey, user: saved.session.user };
}

export async function revokeOfflineAccount() {
  const scope = await readActiveOwnerLearningScope();
  if (scope) await deleteLessonResume({ expectedOwnerGeneration: scope.ownerGeneration,
    resetEpoch: scope.resetEpoch, entryKey: ENTRY_KEY });
}

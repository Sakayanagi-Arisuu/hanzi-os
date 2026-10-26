export type AccountAvatarSnapshot = {
  version: 1; ownerKey: string; revision: number; updatedAt: string | null; hasImage: boolean; uploadAvailable: boolean;
};
export function parseAccountAvatarSnapshot(value: unknown, ownerKey: string): AccountAvatarSnapshot {
  const row = value as AccountAvatarSnapshot;
  if (!row || Object.keys(row).sort().join() !== 'hasImage,ownerKey,revision,updatedAt,uploadAvailable,version'
    || row.version !== 1 || row.ownerKey !== ownerKey || !Number.isSafeInteger(row.revision) || row.revision < 0
    || row.revision >= Number.MAX_SAFE_INTEGER || typeof row.hasImage !== 'boolean' || typeof row.uploadAvailable !== 'boolean'
    || (row.revision === 0 ? row.updatedAt !== null || row.hasImage : typeof row.updatedAt !== 'string' || !Number.isFinite(Date.parse(row.updatedAt)))) {
    throw new Error('Unreadable account avatar; retain the existing image.');
  }
  return row;
}

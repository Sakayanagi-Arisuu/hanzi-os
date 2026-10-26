export const AVATAR_MAX_INPUT_BYTES = 5 * 1024 * 1024;
export const AVATAR_MAX_PIXELS = 16_000_000;
export const AVATAR_MAX_OUTPUT_BYTES = 200 * 1024;
export const AVATAR_SIZE = 256;
export const avatarStorageKey = (ownerKey: string) => `learner-avatar:v1:${JSON.stringify(ownerKey)}`;
export type AvatarRecord = { version: 1; ownerKey: string; revision: number; updatedAt: string; blob: Blob | null };

export function parseAvatarRecord(value: unknown, ownerKey: string): AvatarRecord | null {
  if (value === undefined) return null;
  if (value === null) throw new Error('Ảnh đã lưu chưa đọc được; dữ liệu cũ vẫn được giữ.');
  const record = value as AvatarRecord;
  if (record.version !== 1 || record.ownerKey !== ownerKey || !Number.isSafeInteger(record.revision) || record.revision < 1
    || typeof record.updatedAt !== 'string' || !Number.isFinite(Date.parse(record.updatedAt))
    || record.blob !== null && (!(record.blob instanceof Blob) || record.blob.type !== 'image/webp'
      || record.blob.size < 1 || record.blob.size > AVATAR_MAX_OUTPUT_BYTES)) throw new Error('Ảnh đã lưu chưa đọc được. Hãy giữ dữ liệu cũ để khôi phục.');
  return record;
}

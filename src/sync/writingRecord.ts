import { canonicalStringify } from './canonicalHash';

export const isWritingRecordKey = (key: string) => key.startsWith('activity.record:["writing","writing-state:');

export function writingRecordsEquivalent(left: unknown, right: unknown) {
  const comparable = (value: unknown) => {
    const record = value as { occurredAt?: unknown; details?: { phase?: unknown }; writingSnapshot?: { session?: Record<string, unknown> } } | null;
    if (!record || typeof record !== 'object' || !record.writingSnapshot?.session) return value;
    return record.details?.phase === 'assistance'
      ? { ...record, occurredAt: null, writingSnapshot: { ...record.writingSnapshot, session: { ...record.writingSnapshot.session, updatedAt: null } } }
      : { ...record, occurredAt: null };
  };
  return canonicalStringify(comparable(left)) === canonicalStringify(comparable(right));
}

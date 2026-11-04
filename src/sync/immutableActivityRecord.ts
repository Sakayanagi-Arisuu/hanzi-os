import { isWritingRecordKey } from './writingRecord';

// The goal-practice pilot is retired. Preserve these keys' immutable semantics
// for existing history, recovery drafts and commands queued by older clients.
export const isAdaptiveRecordKey = (key: string) => key.startsWith('activity.record:["overview","adaptive-state:');
export const isAdaptiveDraftRecoveryRecordKey = (key: string) => key.startsWith('activity.record:["overview","adaptive-recovery:');

/** Revision records represent commands, never last-write-wins profile fields. */
export const isImmutableActivityRecordKey = (key: string) => isWritingRecordKey(key) || isAdaptiveRecordKey(key) || isAdaptiveDraftRecoveryRecordKey(key);

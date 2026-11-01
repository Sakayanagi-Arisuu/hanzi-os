import type { LearningEvidence, LearningState } from '../types';
import { forEachHistoryBatch } from '../lib/historyWork';

export type HistoryStateSnapshot = Pick<LearningState, 'schemaVersion' | 'evidence'>;

/** Only the guest review/activity adapters consume state, and only these two
 * fields. Keep unsupported versions/values visible to their existing guards.
 * This is a disposable read projection, never a replacement learning state. */
export async function projectHistoryState(ownerKey: string, state: LearningState | null): Promise<HistoryStateSnapshot | null> {
  if (!ownerKey.startsWith('anonymous:') || !state) return null;
  const { schemaVersion, evidence } = state;
  if (schemaVersion !== 2 || !Array.isArray(evidence)) return { schemaVersion, evidence };
  const retained: LearningEvidence[] = [];
  await forEachHistoryBatch(evidence.length, index => {
    // Visit holes too: the original for-of readers reject a missing item rather
    // than silently treating a sparse array as complete history.
    const item = evidence[index];
    if (item.source === 'lesson' || item.source === 'review' && item.method !== 'fsrs-rating') return;
    retained.push(item);
  });
  return { schemaVersion, evidence: retained };
}

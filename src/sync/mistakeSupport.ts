import type { RemediationObservatoryItem } from '../mistakes/remediationObservatory';
import type { ActiveOwnerLearningScope } from './indexedDb';
import { saveDescriptiveActivity } from './activityObservations';

export async function saveMistakeSupport(scope: ActiveOwnerLearningScope, item: RemediationObservatoryItem,
  kind: 'hint' | 'synthetic-tts', operationId: string) {
  if (kind !== 'hint' && kind !== 'synthetic-tts'
    || kind === 'hint' && !item.hint.trim()
    || kind === 'synthetic-tts' && !item.spokenText?.trim()) throw new Error('Remediation support source is unavailable; retain source.');
  await saveDescriptiveActivity(scope, { operationId, module: 'mistakes', category: 'support',
    sourceId: item.referenceLessonId ?? item.id, sourceLessonIds: item.referenceLessonId ? [item.referenceLessonId] : [], itemId: item.id,
    contentVersion: item.contentVersion ?? 'unknown', activityVersion: item.activityVersion ?? 'unknown', skill: item.skill,
    modality: kind === 'hint' ? 'text' : 'audio', hint: kind === 'hint' ? true : null,
    details: { kind, originSource: item.originSource, syntheticTts: kind === 'synthetic-tts',
      playback: kind === 'synthetic-tts' ? 'requested' : null, measurementEligible: false } });
}

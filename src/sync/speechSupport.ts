import { saveDescriptiveActivity } from './activityObservations';
import type { ActiveOwnerLearningScope } from './indexedDb';
import { sha256Hex } from './canonicalHash';

export type SpeechSupportSource = { activityId: string; phraseId: string; sourceWordId: string;
  lessonId: string | null; chinese: string; focusWord: string; contentVersion: string; presentationVersion: string };

export async function saveSpeechSupport(scope: ActiveOwnerLearningScope, source: SpeechSupportSource,
  operationId: string, kind: 'phrase-tts' | 'word-tts' | 'audio-bypass') {
  const version = `speech-stimulus:sha256:${await sha256Hex(source)}`;
  await saveDescriptiveActivity(scope, { operationId, module: 'speech', category: 'support',
    sourceId: source.activityId, itemId: source.phraseId, sourceLessonIds: source.lessonId ? [source.lessonId] : [],
    contentVersion: source.contentVersion, activityVersion: version, skill: 'speaking', modality: kind === 'audio-bypass' ? 'unknown' : 'audio',
    details: { kind, sourceWordId: source.sourceWordId, presentationVersion: source.presentationVersion,
      syntheticTts: kind !== 'audio-bypass', playback: kind === 'audio-bypass' ? 'bypassed' : 'requested', measurementEligible: false } });
}

import type { DictionaryWord } from '../content/publishedStudioVocabulary';
import type { ActiveOwnerLearningScope } from './indexedDb';
import { sha256Hex } from './canonicalHash';
import { saveDescriptiveActivity } from './activityObservations';

export async function saveDictionaryActivity(scope: ActiveOwnerLearningScope, word: DictionaryWord,
  operationId: string, kind: 'lookup' | 'reveal' | 'self-review' | 'tts', lessonId: string | null = null,
  stimulus: 'word' | 'example' = 'word') {
  const version = `dictionary-display:sha256:${await sha256Hex({ id: word.id, simplified: word.simplified,
    traditional: word.traditional, pinyin: word.pinyin, meaning: word.meaning, senses: word.senses,
    example: word.example ?? null, examplePinyin: word.examplePinyin ?? null, exampleMeaning: word.exampleMeaning ?? null,
    sourcePublishedAt: word.sourcePublishedAt ?? null, sourceStableKey: word.sourceStableKey ?? null })}`;
  await saveDescriptiveActivity(scope, { operationId, module: 'dictionary',
    category: kind === 'self-review' ? 'self-review' : kind === 'lookup' ? 'exposure' : 'support',
    sourceId: word.sourceStableKey ?? word.id, itemId: word.id, contentVersion: version, activityVersion: version,
    sourceLessonIds: lessonId ? [lessonId] : word.sourceLessonIds ?? [],
    modality: kind === 'tts' ? 'audio' : 'text', reveal: kind === 'reveal' || kind === 'self-review' ? true : null,
    details: { kind, sourceKind: word.sourceKind ?? (word.isCore ? 'hanzi-os-core' : 'mega-lexicon'),
      sourceLessonId: lessonId, sourcePublishedAt: word.sourcePublishedAt ?? null,
      syntheticTts: kind === 'tts', playback: kind === 'tts' ? 'requested' : null,
      stimulus: kind === 'tts' ? stimulus : null, measurementEligible: false } });
}

export const LEARNING_TOPICS = ['daily-life', 'shopping', 'travel', 'work', 'hsk'] as const;
export type LearningPreferenceClock = { counter: number; operationId: string; observedAt: string };
export function validOptionalLearningPreferenceClock(value: unknown, preferences: unknown): value is LearningPreferenceClock | undefined {
  if (value === undefined) return true;
  if (preferences === undefined || !value || typeof value !== 'object' || Array.isArray(value)) return false;
  const clock = value as LearningPreferenceClock;
  return Object.keys(clock).sort().join() === 'counter,observedAt,operationId'
    && Number.isSafeInteger(clock.counter) && clock.counter >= 0
    && typeof clock.operationId === 'string' && clock.operationId.length > 0 && clock.operationId.length <= 160
    && typeof clock.observedAt === 'string' && Number.isFinite(Date.parse(clock.observedAt));
}
export type LearningPreferences = {
  version: 1;
  source: 'self-reported';
  sessionMinutes: 5 | 10 | 20;
  topics: (typeof LEARNING_TOPICS[number])[];
  audio: 'ask' | 'available' | 'unavailable';
  microphone: 'ask' | 'available' | 'unavailable';
  allowInference: boolean;
};

export const DEFAULT_LEARNING_PREFERENCES: LearningPreferences = {
  version: 1, source: 'self-reported', sessionMinutes: 10, topics: [],
  audio: 'ask', microphone: 'ask', allowInference: false,
};

/** Unknown versions must fail at the persistence boundary, never reset to defaults. */
export function isLearningPreferences(value: unknown): value is LearningPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as LearningPreferences;
  return Object.keys(candidate).sort().join() === 'allowInference,audio,microphone,sessionMinutes,source,topics,version'
    && candidate.version === 1 && candidate.source === 'self-reported'
    && [5, 10, 20].includes(candidate.sessionMinutes)
    && Array.isArray(candidate.topics) && candidate.topics.length <= LEARNING_TOPICS.length
    && new Set(candidate.topics).size === candidate.topics.length
    && candidate.topics.every(topic => LEARNING_TOPICS.includes(topic))
    && ['ask', 'available', 'unavailable'].includes(candidate.audio)
    && ['ask', 'available', 'unavailable'].includes(candidate.microphone)
    && typeof candidate.allowInference === 'boolean';
}

export const validOptionalLearningPreferences = (value: unknown) => value === undefined || value === null || isLearningPreferences(value);

export type LearningSessionContext = {
  minutes?: 5 | 10 | 20;
  audio?: boolean;
  microphone?: boolean;
  online: boolean;
};

/** Session choices override declarations without rewriting the saved profile or requesting permissions. */
export function resolveLearningContext(preferences: LearningPreferences | null | undefined, context: LearningSessionContext) {
  const saved = preferences ?? DEFAULT_LEARNING_PREFERENCES;
  if (!isLearningPreferences(saved)) throw new Error('Unsupported learning preferences; retain source.');
  if (typeof context.online !== 'boolean' || context.minutes !== undefined && ![5, 10, 20].includes(context.minutes)
    || context.audio !== undefined && typeof context.audio !== 'boolean'
    || context.microphone !== undefined && typeof context.microphone !== 'boolean') throw new Error('Unsupported session context');
  return { minutes: context.minutes ?? saved.sessionMinutes, online: context.online,
    audio: context.audio ?? saved.audio === 'available',
    microphone: context.microphone ?? saved.microphone === 'available',
    allowInference: saved.allowInference, topics: [...saved.topics], source: 'self-reported' as const };
}

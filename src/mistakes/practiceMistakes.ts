import type { WorkspaceEntry } from '../sync/workspaceProtocol';
import { currentWorkspaceScope, saveWorkspaceChanges } from '../sync/workspaceSync';
import type { RemediationObservatoryItem, RemediationObservatorySkill } from './remediationObservatory';
import { ACTIVITY_SKILL_LABELS } from '../learning/lessonActivityTarget';
import type { ActiveOwnerLearningScope } from '../sync/indexedDb';
import type { MockResult } from '../screens/MockExamsPage';

/** Descriptive practice only. Never server-verified evidence, mastery or rewards. */
export type PracticeMistake = {
  version: 1; source: 'reader' | 'assessment'; activityId: string; activityVersion: string;
  prompt: string; context: string; answer: string; options: string[]; explanation: string;
  sourceLabel: string; occurredAt: string;
  originId?: string;
  skill?: RemediationObservatorySkill; spokenText?: string;
};
const isMistake = (value: unknown): value is PracticeMistake => {
  if (!value || typeof value !== 'object') return false;
  const item = value as PracticeMistake;
  return item.version === 1 && (item.source === 'reader' || item.source === 'assessment')
    && ['activityId', 'activityVersion', 'prompt', 'context', 'answer', 'explanation', 'sourceLabel', 'occurredAt']
      .every(key => typeof item[key as keyof PracticeMistake] === 'string')
    && Number.isFinite(Date.parse(item.occurredAt)) && item.answer.length > 0
    && Array.isArray(item.options) && item.options.every(option => typeof option === 'string')
    && (item.skill === undefined || Object.hasOwn(ACTIVITY_SKILL_LABELS, item.skill))
    && (item.spokenText === undefined || typeof item.spokenText === 'string')
    && (item.originId === undefined || typeof item.originId === 'string');
};
export async function practiceMistakeKey(item: Pick<PracticeMistake, 'source' | 'activityId' | 'activityVersion'>) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([item.source, item.activityId, item.activityVersion])));
  return `practice.mistake:${Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')}`;
}
export async function savePracticeMistake(ownerKey: string, item: PracticeMistake, expected?: ActiveOwnerLearningScope) {
  if (!isMistake(item)) throw new Error('Invalid practice mistake');
  const scope = await currentWorkspaceScope(ownerKey);
  if (!scope) throw new Error('Learning owner changed');
  if (expected && (scope.resetEpoch !== expected.resetEpoch || scope.ownerGeneration.generation !== expected.ownerGeneration.generation)) throw new Error('Learning scope changed');
  await savePracticeMistakes(scope, [item]);
}
export async function savePracticeMistakes(scope: ActiveOwnerLearningScope, items: readonly PracticeMistake[]) {
  if (!items.every(isMistake)) throw new Error('Invalid practice mistakes');
  const candidates = await Promise.all(items.map(async item => ({ key: await practiceMistakeKey(item), value: item })));
  const newest = new Map<string, typeof candidates[number]>();
  for (const candidate of candidates) {
    const previous = newest.get(candidate.key);
    if (!previous || (candidate.value.originId === previous.value.originId
      ? candidate.value.occurredAt < previous.value.occurredAt : candidate.value.occurredAt > previous.value.occurredAt)) newest.set(candidate.key, candidate);
  }
  const changes = [...newest.values()];
  await saveWorkspaceChanges(scope, changes, (existing, value) => {
    const item = value as PracticeMistake;
    const previous = existing?.value;
    // Compare inside the fenced transaction; an older tab cannot replace a newer error.
    return !isMistake(previous) || Boolean(item.originId && item.originId !== previous.originId
      && Date.parse(item.occurredAt) > Date.parse(previous.occurredAt));
  });
}
export async function saveMockResultMistakes(scope: ActiveOwnerLearningScope, result: MockResult) {
  await savePracticeMistakes(scope, result.review.filter(item => !item.correct && item.selectedAnswer !== null).map(item => ({
    version: 1, source: 'assessment', activityId: item.itemId, activityVersion: item.itemVersion,
    prompt: item.prompt, context: '', answer: item.correctAnswer, options: [],
    explanation: item.explanationVi, sourceLabel: 'Phòng Luyện Đề', occurredAt: result.submittedAt,
    originId: result.sessionId,
    skill: Object.hasOwn(ACTIVITY_SKILL_LABELS, item.skill) ? item.skill as RemediationObservatorySkill : 'reading' as const,
    ...(item.spokenText ? { spokenText: item.spokenText } : {}),
  })));
}
export function collectPracticeMistakes(entries: readonly WorkspaceEntry[]) {
  return entries.flatMap(entry => {
    if (!entry.key.startsWith('practice.mistake:') || !isMistake(entry.value)) return [];
    const source = entry.value;
    const correction = entries.find(candidate => candidate.key === entry.key.replace('practice.mistake:', 'practice.correction:'))?.value as
      { originAt?: string; originId?: string; correct?: boolean; usedHint?: boolean } | undefined;
    const resolved = correction?.originAt === source.occurredAt && correction.originId === source.originId
      && correction.correct === true && correction.usedHint === false;
    const item: RemediationObservatoryItem = {
      id: entry.key, activityVersion: source.activityVersion, skill: source.skill ?? 'reading', skillLabel: ACTIVITY_SKILL_LABELS[source.skill ?? 'reading'], kindLabel: 'Luyện lại câu sai',
      originSource: source.source, originLabel: source.source === 'reader' ? 'Vạn Quyển Các' : 'Khảo Luyện',
      originDetail: source.sourceLabel, instruction: 'Tự trả lời lại từ ngữ cảnh', prompt: source.prompt,
      promptMeta: source.context, options: source.options, hint: source.explanation,
      spokenText: source.spokenText,
      occurrenceCount: 1, correctedStreak: resolved ? 1 : 0, resolved, lastAttemptAt: Date.parse(source.occurredAt),
    };
    return [{ item, source }];
  });
}

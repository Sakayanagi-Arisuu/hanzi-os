import { readLessonResume, updateLessonResume, type ActiveOwnerLearningScope } from '../sync/indexedDb';

const entryKey = 'dictionary-recent:v1';
type Recent = { version: 1; queries: string[] };
const scopeFor = (scope: ActiveOwnerLearningScope) => ({ expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: scope.resetEpoch, entryKey });
export function parseDictionaryRecent(value: unknown): Recent {
  if (value === undefined) return { version: 1, queries: [] };
  const record = value as Recent;
  if (record?.version !== 1 || !Array.isArray(record.queries) || record.queries.length > 12
    || !record.queries.every(query => typeof query === 'string' && query.length > 0 && query.length <= 120)) throw new Error('Invalid dictionary history');
  return record;
}
export async function readDictionaryRecent(scope: ActiveOwnerLearningScope) {
  return parseDictionaryRecent((await readLessonResume(scopeFor(scope)))?.value).queries;
}
export async function rememberDictionaryQuery(scope: ActiveOwnerLearningScope, query: string) {
  const value = query.trim().slice(0, 120);
  return (await updateLessonResume(scopeFor(scope), previous => {
    const history = parseDictionaryRecent(previous);
    return { version: 1 as const, queries: value ? [value, ...history.queries.filter(item => item !== value)].slice(0, 12) : history.queries };
  })).queries;
}
export async function clearDictionaryRecent(scope: ActiveOwnerLearningScope) {
  // Only the dedicated local history is cleared; observations and outbox stay intact.
  await updateLessonResume(scopeFor(scope), () => ({ version: 1, queries: [] }));
}

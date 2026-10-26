import type { LessonPageDocument } from '../learning/lessonPages';
import { lessonPageDocumentHash, matchLessonPageBindings } from '../learning/lessonPageBinding';
import { readLessonResume, writeLessonResume, type OwnerScopedCacheScope } from './indexedDb';

export async function loadOfflinePageBindings(scope: OwnerScopedCacheScope, lessonId: string,
  document: LessonPageDocument, signal: AbortSignal, send: typeof fetch = fetch) {
  const key = { ...scope, entryKey: `page-bindings:v1:${lessonId}:${await lessonPageDocumentHash(document)}` };
  const saved = await readLessonResume<unknown>(key);
  try {
    const response = await send(`/api/learning/page-activities?lessonId=${encodeURIComponent(lessonId)}`, { signal, cache: 'no-store' });
    if (response.status === 401 || response.status === 403) return {};
    if (!response.ok) throw new Error('Page activities unavailable');
    const payload: unknown = await response.json();
    const bindings = await matchLessonPageBindings(payload, lessonId, document);
    if (Object.keys(bindings).length) {
      await writeLessonResume({ ...key, value: payload });
      return bindings;
    }
  } catch {
    if (signal.aborted) return {};
  }
  return matchLessonPageBindings(saved?.value, lessonId, document);
}

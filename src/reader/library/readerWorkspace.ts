import { parseReaderProgress, type ReaderComprehensionAttempt, type ReaderProgressDocument } from './readerProgress';
import type { WorkspaceEntry } from '../../sync/workspaceProtocol';

function flatten(document: ReaderProgressDocument | null) {
  const entries = new Map<string, unknown>();
  if (!document) return entries;
  for (const [key, value] of Object.entries(document.chapters)) {
    entries.set(`reader.chapter:${key}`, value);
    // Independent questions must not overwrite one another through the chapter's LWW row.
    for (const [questionId, attempt] of Object.entries(value.comprehensionAttempts ?? {})) {
      entries.set(`reader.answer:${JSON.stringify([key, value.comprehensionVersion, questionId, attempt.answeredAt])}`,
        { chapterId: key, version: value.comprehensionVersion, questionId, attempt });
    }
  }
  for (const [key, value] of Object.entries(document.savedEntries)) entries.set(`reader.saved:${key}`, value);
  for (const key of document.bookmarkedSeriesIds) entries.set(`reader.bookmark:${key}`, true);
  for (const event of document.supportEvents) entries.set(`reader.support:${event.occurredAt}:${event.kind}:${event.chapterId}:${event.paragraphId}`, event);
  if (document.lastChapterId) entries.set('reader.position:last', { seriesId: document.lastSeriesId, chapterId: document.lastChapterId });
  return entries;
}
export function readerWorkspaceChanges(previous: ReaderProgressDocument | null, next: ReaderProgressDocument) {
  const left = flatten(previous), right = flatten(next);
  return [...new Set([...left.keys(), ...right.keys()])].flatMap(key => {
    // Support events are append-only; rotating the local display does not delete history.
    if ((key.startsWith('reader.support:') || key.startsWith('reader.answer:')) && !right.has(key)) return [];
    const value = right.get(key) ?? null;
    const original = value && typeof value === 'object' ? value as { lastReadAt?: string; savedAt?: string; occurredAt?: string } : null;
    return JSON.stringify(left.get(key)) === JSON.stringify(right.get(key)) ? [] : [{ key, value,
      ...(previous ? {} : { changedAt: Date.parse(original?.lastReadAt ?? original?.savedAt ?? original?.occurredAt ?? next.updatedAt) }) }];
  });
}
export function applyReaderWorkspace(document: ReaderProgressDocument, entries: WorkspaceEntry[]) {
  const next = structuredClone(document);
  const bookmarks = new Set(next.bookmarkedSeriesIds);
  const support = new Map(next.supportEvents.map(event => [JSON.stringify(event), event]));
  for (const entry of entries) {
    if (entry.key.startsWith('reader.chapter:')) {
      const key = entry.key.slice('reader.chapter:'.length);
      if (entry.value === null) delete next.chapters[key];
      else next.chapters[key] = structuredClone(entry.value) as ReaderProgressDocument['chapters'][string];
    } else if (entry.key.startsWith('reader.saved:')) {
      const key = entry.key.slice('reader.saved:'.length);
      if (entry.value === null) delete next.savedEntries[key];
      else next.savedEntries[key] = entry.value as ReaderProgressDocument['savedEntries'][string];
    } else if (entry.key.startsWith('reader.bookmark:')) {
      const key = entry.key.slice('reader.bookmark:'.length);
      if (entry.value === true) bookmarks.add(key); else bookmarks.delete(key);
    } else if (entry.key === 'reader.position:last' && entry.value && typeof entry.value === 'object') {
      const position = entry.value as { seriesId: string; chapterId: string };
      next.lastSeriesId = position.seriesId; next.lastChapterId = position.chapterId;
    } else if (entry.key.startsWith('reader.support:') && entry.value) {
      support.set(JSON.stringify(entry.value), entry.value as ReaderProgressDocument['supportEvents'][number]);
    }
  }
  // Apply immutable answer observations after chapter position updates. Old versions stay
  // in the journal but can never be attached to a newly published question set.
  const answers = entries.filter(entry => entry.key.startsWith('reader.answer:'))
    .sort((a, b) => a.changedAt - b.changedAt || a.changeId.localeCompare(b.changeId));
  for (const entry of answers) {
    if (!entry.value || typeof entry.value !== 'object') continue;
    const value = entry.value as { chapterId?: string; version?: string; questionId?: string; attempt?: ReaderComprehensionAttempt };
    if (!value.chapterId || !value.version || !value.questionId || !value.attempt) continue;
    const chapter = next.chapters[value.chapterId];
    if (!chapter || chapter.comprehensionVersion !== value.version) continue;
    const validated = parseReaderProgress({ ...next, chapters: { [value.chapterId]: {
      ...chapter, comprehensionAttempts: { [value.questionId]: value.attempt },
    } } }, document).chapters[value.chapterId]?.comprehensionAttempts?.[value.questionId];
    if (!validated) continue;
    const attempts = chapter.comprehensionAttempts ?? {};
    const previous = attempts[value.questionId];
    const candidate = validated;
    const latest = previous && previous.answeredAt > candidate.answeredAt ? previous : candidate;
    chapter.comprehensionAttempts = { ...attempts, [value.questionId]: previous ? {
      ...latest,
      firstAttemptCorrect: previous.firstAttemptCorrect && candidate.firstAttemptCorrect,
      answerExposed: previous.answerExposed || candidate.answerExposed,
      attemptCount: Math.max(previous.attemptCount, candidate.attemptCount),
    } : candidate };
  }
  next.bookmarkedSeriesIds = [...bookmarks];
  // The journal is append-only; the local reader document is a bounded display.
  // Feeding all historical events into its parser would reset the entire document.
  next.supportEvents = [...support.values()].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)).slice(-500);
  return parseReaderProgress(next, document, new Date().toISOString(), true);
}

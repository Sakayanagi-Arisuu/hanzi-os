import { expect, it } from 'vitest';
import { workspaceEntriesForClient, type WorkspaceEntry } from './workspaceProtocol';
it('keeps legacy APK exchanges readable without deleting new reader and mistake observations', () => {
  const entries: WorkspaceEntry[] = ['reader.saved:w', 'reader.chapter:c', 'reader.answer:a', 'practice.mistake:m', 'practice.correction:m']
    .map(key => ({ key, value: null, changedAt: 100, changeId: 'a' }));
  expect(workspaceEntriesForClient(entries, false).map(entry => entry.key)).toEqual(['reader.saved:w', 'reader.chapter:c']);
  expect(workspaceEntriesForClient(entries, true)).toEqual(entries);
  expect(entries).toHaveLength(5);
});

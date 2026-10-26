import { expect, it } from 'vitest';
import { workspaceEntriesWithHistory, workspaceHistoryEntry, workspaceHistoryEvents } from './workspaceHistory';
import type { WorkspaceEntry } from './workspaceProtocol';

it('rebuilds a synthetic 100000-source journal without duplicate projections or changing sources', () => {
  const sources: WorkspaceEntry[] = Array.from({ length: 100_000 }, (_, index) => ({ key: `reader.saved:scale-${index}`,
    value: { word: '书', savedAt: index, contentVersion: 'synthetic-scale-v1' }, changedAt: index, changeId: `scale-${index}` }));
  const existing = sources.filter((_, index) => index % 2 === 0).map(source => workspaceHistoryEntry(source)!);
  const input = [...sources, ...existing];
  const start = performance.now();
  const result = workspaceEntriesWithHistory(input);
  const elapsedMs = performance.now() - start;
  expect(result).toHaveLength(200_000);
  expect(result.slice(0, input.length)).toEqual(input);
  expect(new Set(result.map(entry => entry.key)).size).toBe(result.length);
  expect(workspaceEntriesWithHistory(result)).toHaveLength(result.length);
  const projectionStart = performance.now();
  const events = workspaceHistoryEvents({ ownerKey: `siwc_${'a'.repeat(64)}`, resetEpoch: 0 }, result, result);
  const projectionElapsedMs = performance.now() - projectionStart;
  expect(events).toHaveLength(100_000);
  expect(events.every(event => event.confirmationState === 'provisional' && event.authority === 'unknown' && event.receiptRef === null)).toBe(true);
  const acknowledgedSample = workspaceHistoryEvents({ ownerKey: `siwc_${'a'.repeat(64)}`, resetEpoch: 0 },
    [result.find(entry => entry.key === 'history.activity:scale-0')!, result.at(-1)!], []);
  expect(acknowledgedSample.every(event => event.confirmationState === 'confirmed')).toBe(true);
  // Observational desktop CPU measurement only; no device or indexed-storage claim.
  console.info(JSON.stringify({ fixture: '100000-workspace-sources', sourceCount: sources.length,
    preexistingHistory: existing.length, outputCount: result.length, elapsedMs, projectionElapsedMs }));
});

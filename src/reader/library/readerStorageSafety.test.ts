import { afterEach, expect, it, vi } from 'vitest';
import { createEmptyReaderProgress } from './readerProgress';
import { readReaderProgress, readerProgressStorageKey, READER_PROGRESS_LEGACY_STORAGE_KEY } from './readerProgressStorage';

const scope = { ownerKey: 'anonymous:reader-safe', ownerGeneration: 3, resetEpoch: 2 };
afterEach(() => vi.unstubAllGlobals());

it('keeps malformed/unknown/partial stored documents intact instead of returning writable empty progress', () => {
  for (const raw of ['{bad', JSON.stringify({ schemaVersion: 99, raw: 'preserve' }), JSON.stringify({ ...createEmptyReaderProgress(scope), chapters: { broken: {} } })]) {
    const storage = { getItem: vi.fn((key: string) => key === readerProgressStorageKey(scope) ? raw : null), setItem: vi.fn() };
    vi.stubGlobal('localStorage', storage);
    expect(() => readReaderProgress(scope)).toThrow('Bản gốc');
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.getItem(readerProgressStorageKey(scope))).toBe(raw);
  }
});

it('distinguishes read errors and other-owner legacy data while preserving compatible older v2 fields', () => {
  vi.stubGlobal('localStorage', { getItem: () => { throw new Error('read failure'); }, setItem: vi.fn() });
  expect(() => readReaderProgress(scope)).toThrow('Dữ liệu cũ');
  const old = createEmptyReaderProgress(scope);
  const { savedEntries: _saved, supportEvents: _support, ...olderV2 } = old;
  vi.stubGlobal('localStorage', { getItem: (key: string) => key === readerProgressStorageKey(scope) ? JSON.stringify(olderV2) : null });
  expect(readReaderProgress(scope)).toEqual(old);
  vi.stubGlobal('localStorage', { getItem: (key: string) => key === READER_PROGRESS_LEGACY_STORAGE_KEY ? JSON.stringify({ schemaVersion: 1, ownerKey: 'account:other', chapterId: 'private' }) : null });
  expect(readReaderProgress(scope).chapters).toEqual({});
});

import { expect, it } from 'vitest';
import { DEFAULT_LEARNING_PREFERENCES, isLearningPreferences, resolveLearningContext } from './learningPreferences';
import { INITIAL_LEARNING_STATE } from '../store/LearningStore';
import { parsePersistedLearningState } from '../lib/learningStatePersistence';
import { parseLearningStateImport } from '../lib/learningStateImport';
import { createInitialSyncDocument, evolveSyncDocument, mergeSyncDocuments } from '../sync/document';
import type { CloudSyncDocumentV1 } from '../sync/types';

it('keeps cold start short and conservative, distinguishes declarations from per-session availability and opt-out', () => {
  expect(resolveLearningContext(undefined, { online: false })).toMatchObject({ minutes: 10, audio: false,
    microphone: false, online: false, allowInference: false, topics: [], source: 'self-reported' });
  const saved = { ...DEFAULT_LEARNING_PREFERENCES, audio: 'available' as const, microphone: 'available' as const,
    sessionMinutes: 20 as const, topics: ['shopping' as const], allowInference: true };
  expect(resolveLearningContext(saved, { minutes: 5, audio: false, microphone: false, online: true }))
    .toMatchObject({ minutes: 5, audio: false, microphone: false, topics: ['shopping'] });
  expect(saved.sessionMinutes).toBe(20);
  expect(isLearningPreferences(saved)).toBe(true);
});

it('rejects unknown schemas and malformed declarations rather than normalizing away raw data', () => {
  for (const patch of [{ version: 99 }, { source: 'inferred' }, { sessionMinutes: 30 }, { topics: ['unknown'] },
    { topics: ['shopping', 'shopping'] }, { audio: true }, { allowInference: 1 }, { future: 'keep' }]) {
    const preferences = { ...DEFAULT_LEARNING_PREFERENCES, ...patch };
    expect(isLearningPreferences(preferences)).toBe(false);
    const raw = { ...INITIAL_LEARNING_STATE, profile: { ...INITIAL_LEARNING_STATE.profile, learningPreferences: preferences } };
    const before = JSON.stringify(raw);
    expect(parsePersistedLearningState(raw, INITIAL_LEARNING_STATE).ok).toBe(false);
    expect(parseLearningStateImport(raw, INITIAL_LEARNING_STATE).ok).toBe(false);
    expect(JSON.stringify(raw)).toBe(before);
  }
  for (const clock of [{ counter: -1, operationId: 'x', observedAt: '2026-10-21T00:00:00Z' },
    { counter: 0, operationId: 'x', observedAt: 'invalid' }, { counter: 0, operationId: 'x', observedAt: '2026-10-21T00:00:00Z', future: true }]) {
    const raw = { ...INITIAL_LEARNING_STATE, profile: { ...INITIAL_LEARNING_STATE.profile,
      learningPreferences: DEFAULT_LEARNING_PREFERENCES, learningPreferencesClock: clock } };
    const before = JSON.stringify(raw);
    expect(parsePersistedLearningState(raw, INITIAL_LEARNING_STATE).ok).toBe(false);
    expect(parseLearningStateImport(raw, INITIAL_LEARNING_STATE).ok).toBe(false);
    expect(JSON.stringify(raw)).toBe(before);
  }
});

it('preserves preferences across persistence/import and clocked owner document sync; reset preferences leaves learning untouched', () => {
  const state = structuredClone(INITIAL_LEARNING_STATE);
  state.profile.learningPreferences = { ...DEFAULT_LEARNING_PREFERENCES, sessionMinutes: 5, topics: ['shopping'] };
  const parsed = parsePersistedLearningState(state, INITIAL_LEARNING_STATE);
  expect(parsed.ok && parsed.state.profile.learningPreferences).toEqual(state.profile.learningPreferences);
  const imported = parseLearningStateImport(state, INITIAL_LEARNING_STATE);
  expect(imported.ok && imported.state.profile.learningPreferences).toEqual(state.profile.learningPreferences);
  const first = createInitialSyncDocument(state, '2026-10-21T00:00:00Z', 'first');
  const nextState = { ...state, profile: { ...state.profile, learningPreferences: null } };
  const next = evolveSyncDocument(first, state, nextState, '2026-10-21T00:01:00Z', 'reset-preferences');
  const merged = mergeSyncDocuments(first, next);
  expect(merged.document.state.profile.learningPreferences).toBeNull();
  expect(merged.document.reset.epoch).toBe(first.reset.epoch);
  expect({ ...merged.document.state, profile: state.profile }).toEqual(state);
});

const withoutPreferences = (document: CloudSyncDocumentV1) => {
  const legacy = structuredClone(document);
  for (const profile of [legacy.profile.value, legacy.state.profile]) {
    delete profile.learningPreferences; delete profile.learningPreferencesClock;
  }
  return legacy;
};

it('retains preferences when an older client changes an unrelated profile field and omits unknown fields', () => {
  const state = structuredClone(INITIAL_LEARNING_STATE);
  state.profile.learningPreferences = { ...DEFAULT_LEARNING_PREFERENCES, sessionMinutes: 5 };
  const saved = createInitialSyncDocument(state, '2026-10-21T00:00:00Z', 'saved');
  const older = withoutPreferences(evolveSyncDocument(saved, state,
    { ...state, profile: { ...state.profile, name: 'Older client' } }, '2026-10-21T00:01:00Z', 'legacy-name'));
  for (const [left, right] of [[saved, older], [older, saved]]) {
    const result = mergeSyncDocuments(left, right).document;
    expect(result.state.profile.name).toBe('Older client');
    expect(result.state.profile.learningPreferences?.sessionMinutes).toBe(5);
    expect(result.profile.value.learningPreferencesClock).toEqual(saved.profile.value.learningPreferencesClock);
  }
});

it('converges across three-branch arrival orders without laundering a preference clock through a newer legacy name', () => {
  const state = structuredClone(INITIAL_LEARNING_STATE);
  const initial = createInitialSyncDocument(state, '2026-10-21T00:00:00Z', 'initial');
  const a = evolveSyncDocument(initial, state, { ...state, profile: { ...state.profile,
    learningPreferences: { ...DEFAULT_LEARNING_PREFERENCES, sessionMinutes: 5 } } }, '2026-10-21T00:01:00Z', 'a');
  const c = evolveSyncDocument(initial, state, { ...state, profile: { ...state.profile,
    learningPreferences: { ...DEFAULT_LEARNING_PREFERENCES, sessionMinutes: 20 } } }, '2026-10-21T00:01:00Z', 'z');
  const b = withoutPreferences(evolveSyncDocument(a, a.state,
    { ...a.state, profile: { ...a.state.profile, name: 'Legacy name' } }, '2026-10-21T00:02:00Z', 'legacy'));
  const results = [[a,b,c], [a,c,b], [b,a,c], [b,c,a], [c,a,b], [c,b,a]].map(order =>
    order.slice(1).reduce((document, incoming) => mergeSyncDocuments(document, incoming).document, order[0]));
  for (const result of results) {
    expect(result).toEqual(results[0]);
    expect(result.state.profile.learningPreferences?.sessionMinutes).toBe(20);
    expect(result.state.profile.name).toBe('Legacy name');
  }
  const reset = evolveSyncDocument(results[0], results[0].state,
    { ...results[0].state, profile: { ...results[0].state.profile, learningPreferences: null } },
    '2026-10-21T00:03:00Z', 'reset');
  const lateLegacy = withoutPreferences(evolveSyncDocument(reset, reset.state,
    { ...reset.state, profile: { ...reset.state.profile, name: 'Later legacy name' } }, '2026-10-21T00:04:00Z', 'legacy-later'));
  const merged = mergeSyncDocuments(mergeSyncDocuments(reset, lateLegacy).document, c).document;
  expect(merged.state.profile.learningPreferences).toBeNull();
  expect(merged.state.profile.learningPreferencesClock).toEqual(reset.profile.value.learningPreferencesClock);
});

it('keeps opt-out/reset on an ambiguous equal clock and retains preferences across a learning reset', () => {
  const state = structuredClone(INITIAL_LEARNING_STATE);
  state.profile.learningPreferences = { ...DEFAULT_LEARNING_PREFERENCES, allowInference: true };
  const saved = createInitialSyncDocument(state, '2026-10-21T00:00:00Z', 'saved');
  const ambiguous = structuredClone(saved);
  ambiguous.profile.value.learningPreferences = null; ambiguous.state.profile.learningPreferences = null;
  const merged = mergeSyncDocuments(saved, ambiguous);
  expect(merged.document.state.profile.learningPreferences).toBeNull();
  expect(merged.conflicts.some(conflict => conflict.key === 'profile.learningPreferences')).toBe(true);
  expect(mergeSyncDocuments(ambiguous, saved).document).toEqual(merged.document);
  const reset = evolveSyncDocument(saved, state, structuredClone(INITIAL_LEARNING_STATE),
    '2026-10-21T00:01:00Z', 'reset-learning', 'reset');
  expect(reset.reset.epoch).toBe(1);
  expect(reset.state.profile.learningPreferences).toEqual(state.profile.learningPreferences);
});

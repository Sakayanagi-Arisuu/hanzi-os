import { expect, it, vi } from 'vitest';
import * as rich from '../learning/richLessonContent';
import { CURRENT_CONTENT_MANIFEST_SHA256 } from '../content/currentPackage';
import { CONTENT_VERSION, RELEASED_LESSONS } from '../data/curriculum';
import { CURRENT_AUTHORITATIVE_COURSE_ID } from '../learning/authoritativeProgress';
import { emptyObjectiveEvidenceProjection, type NormalizedLearningProjectionV1 } from '../learning/projectionProtocol';
import { buildAccountAdaptivePilotPlan, materializeAccountPilotUnit, parseAdaptivePlanRequest, parseAdaptiveUnitRequest,
  parseAdaptivePlanMode, type AdaptivePlanRequest } from './adaptivePilotPlan';
import { verifySessionManifestBinding } from '../personalization/practiceManifest';
import { deriveAccountKey } from '../lib/accountKey';
import { DEFAULT_LEARNING_PREFERENCES } from '../learning/learningPreferences';

const request: AdaptivePlanRequest = { resetEpoch: 2, preferences: null, context: { online: true, minutes: 5, microphone: false },
  intent: { kind: 'produce', origin: 'manual' } };
const projection = (passed = false): NormalizedLearningProjectionV1 => ({ protocolVersion: 1, resetEpoch: 2, cursor: 3,
  contentVersion: CONTENT_VERSION, manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
  enrollment: { enrollmentId: 'synthetic-enrollment', courseId: CURRENT_AUTHORITATIVE_COURSE_ID, contentVersion: CONTENT_VERSION,
    manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256, releaseState: 'beta', goal: 'conversation' },
  activeLessonSessions: [], objectiveEvidence: emptyObjectiveEvidenceProjection(),
  submittedLessons: passed ? RELEASED_LESSONS.map(lesson => ({ enrollmentId: 'synthetic-enrollment', contentVersion: CONTENT_VERSION,
    lessonId: lesson.id, lessonVersion: `${CONTENT_VERSION}:${lesson.id}:1`, submittedSessionCount: 1, passedSessionCount: 1,
    passed: true, bestRawScore: 100, bestGateScore: 100, lastSubmittedAt: '2026-10-20T00:00:00Z' })) : [] });
const input = () => ({ request, ownerKey: `siwc_${'a'.repeat(64)}`, projection: projection(true), events: [],
  entitlementAllowed: async () => true, now: '2026-10-21T00:00:00Z' });

it('accepts an explicit automatic selection without granting inference consent or trusting an inferred intent', async () => {
  const automatic = { ...request, intent: null };
  expect(parseAdaptivePlanRequest(automatic)).toEqual(automatic);
  const disabled = await buildAccountAdaptivePilotPlan({ ...input(), request: automatic, mode: 'practice' });
  expect(disabled.executionEnabled).toBe(false);
  const enabled = await buildAccountAdaptivePilotPlan({ ...input(), mode: 'practice',
    request: { ...automatic, preferences: { ...DEFAULT_LEARNING_PREFERENCES, allowInference: true } } });
  expect(enabled.executionEnabled).toBe(true);
  expect(enabled.manifest.intent).toEqual({ kind: 'explore', origin: 'default' });
  expect(enabled.manifest.authorityGrants).toEqual([]);
  for (const intent of [undefined, {}, { kind: 'produce', origin: 'practice-observation' }]) {
    expect(() => parseAdaptivePlanRequest({ ...request, intent })).toThrow('request');
  }
});

it('activates only explicitly requested eligible practice without granting source completion', async () => {
  const result = await buildAccountAdaptivePilotPlan({ ...input(), mode: 'practice' });
  expect(result.executionEnabled).toBe(true);
  expect(result.manifest).toMatchObject({ shadowOnly: false, status: 'practice-plan', authorityGrants: [], completionLessonIds: [] });
  await verifySessionManifestBinding(result.manifest);
  const denied = await buildAccountAdaptivePilotPlan({ ...input(), mode: 'practice', entitlementAllowed: async () => false });
  expect(denied.executionEnabled).toBe(false);
  expect(denied.units).toEqual([]);
  expect(parseAdaptivePlanMode(new URL('http://localhost/plan'))).toBe('shadow');
  expect(parseAdaptivePlanMode(new URL('http://localhost/plan?mode=practice'))).toBe('practice');
  for (const query of ['?mode=practice&mode=practice', '?mode=auto', '?sourcePermitted=true']) {
    expect(() => parseAdaptivePlanMode(new URL(`http://localhost/plan${query}`))).toThrow();
  }
});

it('builds only exact server-unlocked source units without completion or execution grants', async () => {
  const ownerKey = await deriveAccountKey('synthetic-account-fixture@example.test');
  const result = await buildAccountAdaptivePilotPlan({ ...input(), ownerKey });
  expect(result.manifest.status).toBe('shadow-plan');
  expect(result.units.map(unit => unit.id)).toEqual(expect.arrayContaining(['u.number.rule', 'u.price.task09-text']));
  expect(result.manifest.authorityGrants).toEqual([]);
  expect(result.executionEnabled).toBe(false);
  expect(result.model.status).toBe('disabled');
  expect(result.manifest.scope.ownerKey).toBe(ownerKey);
  expect(result.enrollmentBinding).toMatchObject({ resetEpoch: 2, cursor: 3, enrollmentId: 'synthetic-enrollment' });
});

it('withholds payloads for locked, unentitled or unprepared offline sources', async () => {
  const locked = await buildAccountAdaptivePilotPlan({ ...input(), projection: projection() });
  expect(locked.units).toEqual([]); expect(locked.manifest.status).toBe('no-candidate');
  const denied = await buildAccountAdaptivePilotPlan({ ...input(), entitlementAllowed: async () => false });
  expect(denied.units).toEqual([]);
  const offline = await buildAccountAdaptivePilotPlan({ ...input(), request: { ...request, context: { ...request.context, online: false } } });
  expect(offline.units).toEqual([]);
});

it('withholds source payloads when the rich lesson permission is revoked despite valid enrollment', async () => {
  vi.spyOn(rich, 'getRichLessonContent').mockReturnValue(null);
  const denied = await buildAccountAdaptivePilotPlan({ ...input(), mode: 'practice' });
  expect(denied.units).toEqual([]); expect(denied.executionEnabled).toBe(false);
});

it('rejects stale owner/reset/package or missing enrollment without trusting client flags', async () => {
  await expect(buildAccountAdaptivePilotPlan({ ...input(), ownerKey: 'anonymous:guest' })).rejects.toThrow('Account');
  await expect(buildAccountAdaptivePilotPlan({ ...input(), ownerKey: 'account:synthetic-test' })).rejects.toThrow('Account');
  await expect(buildAccountAdaptivePilotPlan({ ...input(), request: { ...request, resetEpoch: 3 } })).rejects.toThrow('projection');
  await expect(buildAccountAdaptivePilotPlan({ ...input(), projection: { ...projection(true), enrollment: null } })).rejects.toThrow('projection');
  await expect(buildAccountAdaptivePilotPlan({ ...input(), projection: { ...projection(true), contentVersion: 'old' } })).rejects.toThrow('projection');
  expect(() => parseAdaptivePlanRequest({ ...request, eligibility: { sourcePermitted: true } })).toThrow();
  expect(() => parseAdaptivePlanRequest({ ...request, intent: { kind: 'produce', origin: 'practice-observation' } })).toThrow();
  expect(() => parseAdaptivePlanRequest({ ...request, context: { online: true, minutes: 7 } })).toThrow();
});

it('revalidates exact unit/source/enrollment/entitlement on every render rather than treating a plan as access', async () => {
  const plan = await buildAccountAdaptivePilotPlan(input());
  const unit = plan.units.find(unit => unit.id === 'u.price.task09-text')!;
  const query = { resetEpoch: 2, unitId: unit.id, unitBinding: unit.binding, graphBinding: plan.graph.binding, contentVersion: CONTENT_VERSION };
  const source = { ...input(), resetEpoch: 2, request: query };
  expect(await materializeAccountPilotUnit(source)).toMatchObject({ unit, sourceAccess: 'server-revalidated', measurementEligible: false,
    authorityGrants: [], completionLessonIds: [] });
  for (const changed of [{ unitBinding: 'f'.repeat(64) }, { graphBinding: 'f'.repeat(64) }, { contentVersion: 'old' }, { unitId: 'u.missing' }]) {
    await expect(materializeAccountPilotUnit({ ...source, request: { ...query, ...changed } })).rejects.toThrow('retain frozen');
  }
  await expect(materializeAccountPilotUnit({ ...source, projection: projection() })).rejects.toThrow('eligibility');
  await expect(materializeAccountPilotUnit({ ...source, entitlementAllowed: async () => false })).rejects.toThrow('eligibility');
  await expect(materializeAccountPilotUnit({ ...source, resetEpoch: 3 })).rejects.toThrow('scope');
  expect(parseAdaptiveUnitRequest(new URL(`http://localhost/unit?${new URLSearchParams(Object.entries(query).map(([key,value]) => [key,String(value)]))}`))).toEqual(query);
  expect(() => parseAdaptiveUnitRequest(new URL('http://localhost/unit?resetEpoch=02'))).toThrow();
  expect(() => parseAdaptiveUnitRequest(new URL(`http://localhost/unit?${new URLSearchParams(Object.entries(query).map(([key,value]) => [key,String(value)]))}&sourcePermitted=true`))).toThrow();
});

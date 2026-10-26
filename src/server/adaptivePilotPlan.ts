import { deriveAuthoritativeReleasedLessonProgress } from '../learning/authoritativeProgress';
import type { NormalizedLearningProjectionV1 } from '../learning/projectionProtocol';
import { isLearningPreferences, resolveLearningContext, type LearningPreferences, type LearningSessionContext } from '../learning/learningPreferences';
import type { LessonHistoryEventV1 } from '../learning/lessonHistory';
import { reduceLearnerModel } from '../personalization/learnerModel';
import { composeShadowSession, type ComposerEligibility, type SessionIntent } from '../personalization/sessionComposer';
import { extractPilotLearningUnits } from './pilotLearningUnits';
import { sealPracticeManifest } from '../personalization/practiceManifest';
import { getRichLessonContent } from '../learning/richLessonContent';
import { sha256Hex } from '../sync/canonicalHash';

export function parseAdaptivePlanMode(url: URL): 'shadow' | 'practice' {
  if ([...url.searchParams.keys()].some(key => key !== 'mode') || url.searchParams.getAll('mode').length > 1) {
    throw new Error('Invalid plan mode');
  }
  const mode = url.searchParams.get('mode') ?? 'shadow';
  if (mode !== 'shadow' && mode !== 'practice') throw new Error('Invalid plan mode');
  return mode;
}

export type AdaptivePlanRequest = { resetEpoch: number; context: LearningSessionContext;
  preferences: LearningPreferences | null; intent: SessionIntent | null };

export function parseAdaptivePlanRequest(value: unknown): AdaptivePlanRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid plan request');
  const input = value as AdaptivePlanRequest;
  if (Object.keys(input).sort().join(',') !== 'context,intent,preferences,resetEpoch'
    || !Number.isSafeInteger(input.resetEpoch) || input.resetEpoch < 0
    || input.preferences !== null && !isLearningPreferences(input.preferences)
    || !input.context || input.intent !== null && (!input.intent || Object.keys(input.intent).sort().join(',') !== 'kind,origin'
    || !['explore', 'quantity', 'listen', 'produce', 'review', 'transfer'].includes(input.intent.kind)
    || input.intent.origin !== 'manual')
    || Object.keys(input.context).some(key => !['minutes', 'audio', 'microphone', 'online'].includes(key))) throw new Error('Invalid plan request');
  resolveLearningContext(input.preferences, input.context);
  return input;
}

type AccountSourceInput = { ownerKey: string; resetEpoch: number; projection: NormalizedLearningProjectionV1;
  entitlementAllowed: (lessonId: string) => Promise<boolean> };

async function accountPilotSources(input: AccountSourceInput) {
  if (!/^siwc_[a-f0-9]{64}$/.test(input.ownerKey)) throw new Error('Account binding required');
  const progress = deriveAuthoritativeReleasedLessonProgress(input.projection);
  if (!progress || progress.resetEpoch !== input.resetEpoch) throw new Error('Exact current account projection required');
  const { graph, units } = await extractPilotLearningUnits();
  const scope = { ownerKey: input.ownerKey, resetEpoch: input.resetEpoch };
  const byLesson = new Map(progress.lessons.map(lesson => [lesson.lessonId, lesson]));
  const entitlements = new Map<string, boolean>();
  const permittedSources = new Map<string, string | null>();
  for (const unit of units) if (!entitlements.has(unit.source.lessonId)) {
    entitlements.set(unit.source.lessonId, await input.entitlementAllowed(unit.source.lessonId));
    const permitted = getRichLessonContent(unit.source.lessonId);
    permittedSources.set(unit.source.lessonId, permitted ? await sha256Hex(permitted) : null);
  }
  const eligibility: ComposerEligibility = { scope, authority: 'server-validated', entries: units.map(unit => {
    const lesson = byLesson.get(unit.source.lessonId);
    return { unitId: unit.id, binding: unit.binding,
      sourcePermitted: Boolean(lesson && permittedSources.get(unit.source.lessonId) === unit.source.contextHash
        && unit.source.contentVersion === progress.contentVersion
        && lesson.lessonVersion === `${unit.source.contentVersion}:${unit.source.lessonId}:1`),
      lessonPrerequisitesAllowed: lesson?.unlocked === true, entitlementAllowed: entitlements.get(unit.source.lessonId) === true };
  }) };
  return { progress, graph, units, scope, eligibility };
}

/** Projection and entitlement come only from server readers, never from the request body. */
export async function buildAccountAdaptivePilotPlan(input: { request: AdaptivePlanRequest; ownerKey: string;
  projection: NormalizedLearningProjectionV1; events: readonly LessonHistoryEventV1[];
  entitlementAllowed: (lessonId: string) => Promise<boolean>; now: string; mode?: 'shadow' | 'practice' }) {
  const request = parseAdaptivePlanRequest(input.request);
  const { progress, graph, units, scope, eligibility } = await accountPilotSources({ ...input, resetEpoch: request.resetEpoch });
  const model = await reduceLearnerModel({ graph, units, events: input.events, scope, asOf: input.now,
    allowInference: request.preferences?.allowInference === true });
  // No offline preparation is asserted by an online server response; offline requests fail closed.
  const manifest = await composeShadowSession({ graph, units, model, scope, now: input.now,
    preferences: request.preferences, context: request.context, intent: request.intent ?? undefined, eligibility });
  const selected = new Set(manifest.steps.flatMap(step => step.kind === 'unit' ? [step.unitId] : []));
  const activated = input.mode === 'practice' && manifest.steps.length > 0 && manifest.steps.every(step => step.kind === 'unit');
  const selectedManifest = activated ? await sealPracticeManifest(manifest) : manifest;
  return { schemaVersion: 1 as const, manifest: selectedManifest, graph, model, units: units.filter(unit => selected.has(unit.id)),
    enrollmentBinding: { enrollmentId: progress.enrollmentId, contentVersion: progress.contentVersion,
      manifestSha256: progress.manifestSha256, resetEpoch: progress.resetEpoch, cursor: progress.cursor },
    executionEnabled: activated };
}

export type AdaptiveUnitRequest = { resetEpoch: number; unitId: string; unitBinding: string; graphBinding: string; contentVersion: string };
export function parseAdaptiveUnitRequest(url: URL): AdaptiveUnitRequest {
  const keys = ['resetEpoch', 'unitId', 'unitBinding', 'graphBinding', 'contentVersion'];
  if ([...url.searchParams.keys()].some(key => !keys.includes(key)) || keys.some(key => url.searchParams.getAll(key).length !== 1)) {
    throw new Error('Invalid unit request');
  }
  const resetEpoch = url.searchParams.get('resetEpoch')!;
  const unitId = url.searchParams.get('unitId')!, unitBinding = url.searchParams.get('unitBinding')!;
  const graphBinding = url.searchParams.get('graphBinding')!, contentVersion = url.searchParams.get('contentVersion')!;
  if (!/^(0|[1-9]\d*)$/.test(resetEpoch) || !Number.isSafeInteger(Number(resetEpoch))
    || !/^u\.[a-z0-9.-]{1,120}$/.test(unitId) || !/^[a-f0-9]{64}$/.test(unitBinding) || !/^[a-f0-9]{64}$/.test(graphBinding)
    || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/.test(contentVersion)) throw new Error('Invalid unit request');
  return { resetEpoch: Number(resetEpoch), unitId, unitBinding, graphBinding, contentVersion };
}

export class AdaptiveUnitUnavailableError extends Error {}

/** Re-check the live source at every render/resume boundary. A manifest hash is never an access token. */
export async function materializeAccountPilotUnit(input: AccountSourceInput & { request: AdaptiveUnitRequest }) {
  if (input.request.resetEpoch !== input.resetEpoch) throw new AdaptiveUnitUnavailableError('Adaptive source scope changed');
  const { progress, graph, units, scope, eligibility } = await accountPilotSources(input);
  const unit = units.find(unit => unit.id === input.request.unitId);
  const allowed = eligibility.entries.find(entry => entry.unitId === unit?.id);
  if (!unit || unit.binding !== input.request.unitBinding || graph.binding !== input.request.graphBinding
    || unit.source.contentVersion !== input.request.contentVersion || !allowed?.sourcePermitted
    || !allowed.entitlementAllowed || !allowed.lessonPrerequisitesAllowed) {
    throw new AdaptiveUnitUnavailableError('Adaptive source version or eligibility changed; retain frozen manifest');
  }
  return { schemaVersion: 1 as const, scope, graph, unit, sourceAccess: 'server-revalidated' as const,
    enrollmentBinding: { enrollmentId: progress.enrollmentId, contentVersion: progress.contentVersion,
      manifestSha256: progress.manifestSha256, resetEpoch: progress.resetEpoch, cursor: progress.cursor },
    measurementEligible: false as const, completionLessonIds: [] as string[], authorityGrants: [] as string[] };
}

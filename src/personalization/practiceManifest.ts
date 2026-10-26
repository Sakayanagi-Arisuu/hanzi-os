import { sha256Hex } from '../sync/canonicalHash';
import type { ShadowSessionManifest } from './sessionComposer';

export type PracticeSessionManifest = Omit<ShadowSessionManifest, 'shadowOnly' | 'manifestId' | 'binding' | 'status' | 'plannerVersion'> & {
  shadowOnly: false; manifestId: string; binding: string; status: 'practice-plan';
  plannerVersion: 'hanzi-deterministic-practice-v1'; shadowBinding: string;
};
export type SessionManifest = ShadowSessionManifest | PracticeSessionManifest;

/** Integrity/provenance only. Every actual unit still needs the live source-policy adapter. */
export async function verifySessionManifestBinding(manifest: SessionManifest) {
  const { manifestId, binding, ...body } = manifest;
  const practice = manifest.shadowOnly === false;
  if (manifest.schemaVersion !== 1 || typeof manifest.scope?.ownerKey !== 'string' || !manifest.scope.ownerKey
    || !Number.isSafeInteger(manifest.scope.resetEpoch) || manifest.scope.resetEpoch < 0
    || manifest.shadowOnly !== true && !practice
    || manifest.plannerVersion !== (practice ? 'hanzi-deterministic-practice-v1' : 'hanzi-deterministic-shadow-v1')
    || manifest.status !== (practice ? 'practice-plan' : 'shadow-plan')
    || !Array.isArray(manifest.steps) || !manifest.steps.length || manifest.steps.length > 50
    || new Set(manifest.steps.map(step => step.stepId)).size !== manifest.steps.length
    || !Array.isArray(manifest.authorityGrants) || manifest.authorityGrants.length
    || !Array.isArray(manifest.completionLessonIds) || manifest.completionLessonIds.length || manifest.introSkipEligible !== false
    || !Number.isFinite(Date.parse(manifest.createdAt)) || ![300, 600, 1200].includes(manifest.budgetSeconds)
    || manifest.transitionSeconds !== 10 || manifest.steps.some(step => !step.stepId || !Number.isSafeInteger(step.estimatedSeconds)
      || step.estimatedSeconds < 1 || step.kind !== 'unit' && step.kind !== 'fsrs-offer' || practice && step.kind !== 'unit')
    || manifest.estimatedSeconds !== manifest.steps.reduce((sum, step) => sum + step.estimatedSeconds + 10, 0)
    || manifest.estimatedSeconds > manifest.budgetSeconds || !/^[a-f0-9]{64}$/.test(binding)
    || manifestId !== `${practice ? 'practice' : 'shadow'}:${binding}` || binding !== await sha256Hex(body)) {
    throw new Error('Unsupported session manifest; retain frozen source.');
  }
  if (practice) {
    const { shadowBinding, ...practiceBody } = body as Omit<PracticeSessionManifest, 'manifestId' | 'binding'>;
    const shadowBody = { ...practiceBody, shadowOnly: true, plannerVersion: 'hanzi-deterministic-shadow-v1', status: 'shadow-plan' };
    if (!/^[a-f0-9]{64}$/.test(shadowBinding) || shadowBinding !== await sha256Hex(shadowBody)) {
      throw new Error('Practice manifest no longer matches its selected shadow plan.');
    }
  }
}

/** Call only after source eligibility was checked. This seal grants no access, scoring, XP or completion. */
export async function sealPracticeManifest(shadow: ShadowSessionManifest): Promise<PracticeSessionManifest> {
  await verifySessionManifestBinding(shadow);
  if (shadow.steps.some(step => step.kind !== 'unit')) throw new Error('Existing FSRS receipt adapter required before practice activation.');
  const { manifestId: _id, binding: shadowBinding, ...source } = structuredClone(shadow);
  const body = { ...source, shadowOnly: false as const, plannerVersion: 'hanzi-deterministic-practice-v1' as const,
    status: 'practice-plan' as const, shadowBinding };
  const binding = await sha256Hex(body);
  const result = { ...body, binding, manifestId: `practice:${binding}` };
  await verifySessionManifestBinding(result);
  return result;
}

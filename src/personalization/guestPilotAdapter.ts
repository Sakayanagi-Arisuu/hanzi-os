import { CONTENT_VERSION, LESSON_BY_ID } from '../data/curriculum';
import { getRichLessonContent } from '../learning/richLessonContent';
import { isLessonReleased, isLessonUnlocked } from '../lib/adaptive';
import { readActiveOwnerLearningScope, readOwnerLocalState, type ActiveOwnerLearningScope } from '../sync/indexedDb';
import { readLocalLearningHistory } from '../sync/reviewHistory';
import { extractPilotSourceUnits } from './pilotSourceUnits';
import { composeShadowSession, type SessionIntent, type ComposerEligibility } from './sessionComposer';
import { reduceLearnerModel } from './learnerModel';
import { sealPracticeManifest } from './practiceManifest';
import type { LearningSessionContext } from '../learning/learningPreferences';
import type { AdaptiveSession } from '../sync/adaptiveSession';
import { projectPilotCompetencyMap } from './pilotCompetencyMap';

async function assertGuestScope(scope: ActiveOwnerLearningScope) {
  const active = await readActiveOwnerLearningScope();
  if (!scope.ownerGeneration.ownerKey.startsWith('anonymous:') || !active
    || active.ownerGeneration.ownerKey !== scope.ownerGeneration.ownerKey
    || active.ownerGeneration.generation !== scope.ownerGeneration.generation || active.resetEpoch !== scope.resetEpoch) {
    throw new Error('Guest source scope changed; retain saved session');
  }
}

async function sources(scope: ActiveOwnerLearningScope) {
  await assertGuestScope(scope);
  // Read durable progress. No caller-supplied unlock/completion/entitlement flags.
  const state = await readOwnerLocalState(scope.ownerGeneration.ownerKey);
  if (!state || state.schemaVersion !== 2) throw new Error('Guest progress unavailable; retain original records');
  const lessons = ['hsk1-time-place-events-01-numbers', 'daily-1', 'daily-3'].map(id => getRichLessonContent(id));
  if (lessons.some(lesson => !lesson)) throw new Error('Permitted local rich source unavailable');
  const { graph, units } = await extractPilotSourceUnits({ contentVersion: CONTENT_VERSION, lessons });
  const owner = { ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: scope.resetEpoch };
  const eligibility: ComposerEligibility = { scope: owner, authority: 'guest-released-source', entries: units.map(unit => {
    const lesson = LESSON_BY_ID.get(unit.source.lessonId);
    return { unitId: unit.id, binding: unit.binding,
      sourcePermitted: Boolean(lesson && isLessonReleased(lesson) && unit.source.contentVersion === CONTENT_VERSION),
      lessonPrerequisitesAllowed: Boolean(lesson && isLessonUnlocked(lesson, state)),
      // This adapter is intentionally restricted to the three free HSK1 pilot sources.
      entitlementAllowed: ['hsk1-time-place-events-01-numbers', 'daily-1', 'daily-3'].includes(unit.source.lessonId) };
  }) };
  await assertGuestScope(scope);
  return { state, graph, units, owner, eligibility };
}

export async function buildGuestPilotPlan(scope: ActiveOwnerLearningScope,
  request: { context: LearningSessionContext; intent: SessionIntent | null }, mode: 'shadow' | 'practice' = 'shadow') {
  if (!request || Object.keys(request).sort().join(',') !== 'context,intent' || request.intent !== null && (!request.intent
    || Object.keys(request.intent).sort().join(',') !== 'kind,origin' || request.intent.origin !== 'manual'
    || !['explore','quantity','listen','produce','review','transfer'].includes(request.intent.kind))
    || !request.context || Object.keys(request.context).some(key => !['minutes','audio','microphone','online'].includes(key))
    || !['shadow','practice'].includes(mode)) throw new Error('Unsupported guest plan request');
  const { state, graph, units, owner, eligibility } = await sources(scope);
  const preferences = state.profile.learningPreferences;
  const now = new Date().toISOString();
  const events = preferences?.allowInference === true ? await readLocalLearningHistory(scope) : [];
  const model = await reduceLearnerModel({ graph, units, scope: owner, events, asOf: now, allowInference: preferences?.allowInference === true });
  const shadow = await composeShadowSession({ graph, units, scope: owner, model, now, preferences,
    context: request.context, intent: request.intent ?? undefined, eligibility });
  const executionEnabled = mode === 'practice' && shadow.steps.length > 0 && shadow.steps.every(step => step.kind === 'unit');
  const manifest = executionEnabled ? await sealPracticeManifest(shadow) : shadow;
  const competencyMap = await projectPilotCompetencyMap(graph,model,owner,manifest.graphBinding,manifest.modelBinding);
  await assertGuestScope(scope);
  const current = await readOwnerLocalState(scope.ownerGeneration.ownerKey);
  if (current?.profile.learningPreferences?.allowInference !== preferences?.allowInference) throw new Error('Guest inference preference changed; retry the plan');
  await assertGuestScope(scope);
  return { manifest, graph, model, competencyMap, executionEnabled };
}

export async function materializeGuestPilotUnit(scope: ActiveOwnerLearningScope, snapshot: AdaptiveSession, signal: AbortSignal) {
  const { graph, units, eligibility } = await sources(scope);
  const step = snapshot.manifest.steps[snapshot.cursor];
  const unit = step?.kind === 'unit' ? units.find(unit => unit.id === step.unitId && unit.binding === step.unitBinding) : null;
  const allowed = eligibility.entries.find(entry => entry.unitId === unit?.id);
  if (signal.aborted || snapshot.manifest.shadowOnly || snapshot.manifest.scope.ownerKey !== scope.ownerGeneration.ownerKey
    || snapshot.manifest.scope.resetEpoch !== scope.resetEpoch || snapshot.manifest.graphBinding !== graph.binding
    || !unit || step?.kind !== 'unit' || step.contentVersion !== unit.source.contentVersion
    || step.sourceLessonId !== unit.source.lessonId || step.skill !== unit.skill || step.modality !== unit.modality
    || step.taskType !== unit.taskType || step.competencyId !== unit.competencyId
    || !allowed?.sourcePermitted || !allowed.lessonPrerequisitesAllowed || !allowed.entitlementAllowed) {
    throw new Error('Guest source changed or unavailable; retain frozen session');
  }
  await assertGuestScope(scope);
  if (signal.aborted) throw new Error('Guest source cancelled');
  return unit;
}

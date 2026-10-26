import { readActiveOwnerLearningScope, type ActiveOwnerLearningScope } from '../sync/indexedDb';
import type { AdaptiveSession } from '../sync/adaptiveSession';
import { validateLearningUnit, type LearningUnit } from './learningUnit';
import type { CompetencyGraph } from './competencyGraph';

export class AdaptiveSourceUnavailableError extends Error {}
type Materialized = { schemaVersion: 1; scope: { ownerKey: string; resetEpoch: number }; graph: CompetencyGraph;
  unit: LearningUnit; sourceAccess: 'server-revalidated'; measurementEligible: false;
  authorityGrants: string[]; completionLessonIds: string[];
  enrollmentBinding: { enrollmentId: string; contentVersion: string; manifestSha256: string; resetEpoch: number; cursor: number } };

export async function validateMaterializedAdaptiveUnit(value: unknown, snapshot: AdaptiveSession): Promise<Materialized> {
  const body = value as Materialized;
  const step = snapshot.manifest.steps[snapshot.cursor];
  if (snapshot.manifest.shadowOnly || !body || Object.keys(body).sort().join(',') !== 'authorityGrants,completionLessonIds,enrollmentBinding,graph,measurementEligible,schemaVersion,scope,sourceAccess,unit'
    || body.schemaVersion !== 1 || body.sourceAccess !== 'server-revalidated' || !body.scope || !body.graph || !body.unit
    || step?.kind !== 'unit' || body.scope.ownerKey !== snapshot.manifest.scope.ownerKey
    || body.scope.resetEpoch !== snapshot.manifest.scope.resetEpoch || body.graph.binding !== snapshot.manifest.graphBinding
    || body.unit.id !== step.unitId || body.unit.binding !== step.unitBinding || body.unit.source.contentVersion !== step.contentVersion
    || body.unit.source.lessonId !== step.sourceLessonId || body.unit.taskType !== step.taskType || body.unit.skill !== step.skill
    || body.unit.modality !== step.modality || body.unit.competencyId !== step.competencyId
    || body.measurementEligible !== false || !Array.isArray(body.authorityGrants) || body.authorityGrants.length
    || !Array.isArray(body.completionLessonIds) || body.completionLessonIds.length || !body.enrollmentBinding
    || body.enrollmentBinding.resetEpoch !== body.scope.resetEpoch || body.enrollmentBinding.contentVersion !== step.contentVersion
    || typeof body.enrollmentBinding.enrollmentId !== 'string' || !body.enrollmentBinding.enrollmentId
    || !/^sha256:[a-f0-9]{64}$/.test(body.enrollmentBinding.manifestSha256)
    || !Number.isSafeInteger(body.enrollmentBinding.cursor) || body.enrollmentBinding.cursor < 0) {
    throw new AdaptiveSourceUnavailableError('Materialized unit no longer matches the frozen source.');
  }
  try { await validateLearningUnit(body.unit, body.graph); }
  catch { throw new AdaptiveSourceUnavailableError('Materialized unit payload or context changed; retain frozen source.'); }
  return body;
}

export async function fetchAdaptiveUnit(scope: ActiveOwnerLearningScope, snapshot: AdaptiveSession,
  options: { send?: typeof fetch; signal?: AbortSignal } = {}) {
  const checkScope = async () => {
    const active = await readActiveOwnerLearningScope();
    if (!active || active.ownerGeneration.ownerKey !== scope.ownerGeneration.ownerKey
      || active.ownerGeneration.generation !== scope.ownerGeneration.generation || active.resetEpoch !== scope.resetEpoch
      || snapshot.manifest.scope.ownerKey !== scope.ownerGeneration.ownerKey || snapshot.manifest.scope.resetEpoch !== scope.resetEpoch) {
      throw new AdaptiveSourceUnavailableError('Adaptive owner/reset changed; retain saved session.');
    }
  };
  await checkScope();
  const step = snapshot.manifest.steps[snapshot.cursor];
  if (step?.kind !== 'unit' || !snapshot.manifest.context.online) throw new AdaptiveSourceUnavailableError('Exact prepared source adapter required.');
  const query = new URLSearchParams({ resetEpoch: String(scope.resetEpoch), unitId: step.unitId,
    unitBinding: step.unitBinding, graphBinding: snapshot.manifest.graphBinding, contentVersion: step.contentVersion });
  const response = await (options.send ?? fetch)(`/api/learning/adaptive-unit?${query}`, { method: 'GET', cache: 'no-store',
    credentials: 'same-origin', headers: { 'x-learning-owner': scope.ownerGeneration.ownerKey }, signal: options.signal });
  if (!response.ok) {
    if (response.status === 403 || response.status === 409) throw new AdaptiveSourceUnavailableError('Adaptive source is unavailable; retain frozen session.');
    throw new Error('Adaptive source could not be loaded.');
  }
  const materialized = await validateMaterializedAdaptiveUnit(await response.json(), snapshot);
  await checkScope();
  if (options.signal?.aborted) throw new Error('Adaptive source load cancelled.');
  return materialized;
}

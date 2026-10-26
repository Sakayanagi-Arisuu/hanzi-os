import { readActiveOwnerLearningScope, readOwnerLocalState, type ActiveOwnerLearningScope } from '../sync/indexedDb';
import { verifySessionManifestBinding, type PracticeSessionManifest } from './practiceManifest';
import type { LearningPreferences, LearningSessionContext } from '../learning/learningPreferences';
import type { SessionIntent } from './sessionComposer';
import { projectPilotCompetencyMap, type PilotCompetencyMap } from './pilotCompetencyMap';
import type { CompetencyGraph } from './competencyGraph';
import type { LearnerModel } from './learnerModel';

export const localAdaptivePilotAvailable = (hostname: string, contentAvailable: boolean) =>
  contentAvailable && ['localhost', '127.0.0.1'].includes(hostname);

export async function requestAccountPracticePlan(scope: ActiveOwnerLearningScope,
  input: { preferences: LearningPreferences | null; context: LearningSessionContext; intent: SessionIntent | null },
  options: { send?: typeof fetch; signal?: AbortSignal; onCompetencyMap?: (map:PilotCompetencyMap) => void } = {}): Promise<PracticeSessionManifest | null> {
  const assertScope = async () => {
    const current = await readActiveOwnerLearningScope();
    if (!current || !/^siwc_[a-f0-9]{64}$/.test(scope.ownerGeneration.ownerKey)
      || current.ownerGeneration.ownerKey !== scope.ownerGeneration.ownerKey
      || current.ownerGeneration.generation !== scope.ownerGeneration.generation || current.resetEpoch !== scope.resetEpoch
      || options.signal?.aborted) throw new Error('Account scope changed; retain current session');
    if (input.preferences?.allowInference === true) {
      const local = await readOwnerLocalState(scope.ownerGeneration.ownerKey);
      if (local?.profile.learningPreferences?.allowInference !== true) throw new Error('Inference preference changed; retry without history inference');
    }
  };
  await assertScope();
  const response = await (options.send ?? fetch)('/api/learning/adaptive-plan?mode=practice', {
    method: 'POST', cache: 'no-store', credentials: 'same-origin', signal: options.signal,
    headers: { 'content-type': 'application/json', 'x-learning-owner': scope.ownerGeneration.ownerKey },
    body: JSON.stringify({ ...input, resetEpoch: scope.resetEpoch }),
  });
  if (!response.ok) throw new Error('Account source unavailable; retain current session');
  const body = await response.json() as { schemaVersion?: number; executionEnabled?: boolean; manifest?: PracticeSessionManifest; graph:CompetencyGraph; model:LearnerModel };
  await assertScope();
  if (body.schemaVersion !== 1 || typeof body.executionEnabled !== 'boolean') throw new Error('Unsupported plan response');
  const map = options.onCompetencyMap ? await projectPilotCompetencyMap(body.graph,body.model,
    {ownerKey:scope.ownerGeneration.ownerKey,resetEpoch:scope.resetEpoch},body.executionEnabled ? body.manifest?.graphBinding : undefined,
    body.executionEnabled ? body.manifest?.modelBinding : undefined) : null;
  if (map && map.inferenceEnabled !== (input.preferences?.allowInference === true)) throw new Error('Inference preference does not match the returned map');
  await assertScope();
  if (!body.executionEnabled) { if (map) options.onCompetencyMap?.(map); return null; }
  const manifest = body.manifest;
  if (!manifest || manifest.shadowOnly !== false || manifest.scope.ownerKey !== scope.ownerGeneration.ownerKey
    || manifest.scope.resetEpoch !== scope.resetEpoch) throw new Error('Plan scope changed');
  await verifySessionManifestBinding(manifest);
  await assertScope();
  if (map) options.onCompetencyMap?.(map);
  return manifest;
}

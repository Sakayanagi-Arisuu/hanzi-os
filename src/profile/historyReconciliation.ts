import { projectLessonHistoryGroupsCooperatively, type LessonHistoryEventV1 } from '../learning/lessonHistory';
import { StaleOwnerGenerationError, type ActiveOwnerLearningScope } from '../sync/indexedDb';
import { currentWorkspaceScope } from '../sync/workspaceSync';

/** UI projections may yield to reset, navigation or account changes. Publish a
 * result only while both the request and its durable owner scope still match. */
export async function reconcileProfileHistory(scope: ActiveOwnerLearningScope,
  events: readonly LessonHistoryEventV1[], requestIsCurrent: () => boolean) {
  return reconcileProfileHistoryGroups(scope, [events], requestIsCurrent);
}

export async function reconcileProfileHistoryGroups(scope: ActiveOwnerLearningScope,
  groups: readonly (readonly LessonHistoryEventV1[])[], requestIsCurrent: () => boolean) {
  if (!requestIsCurrent()) return null;
  const projected = await projectLessonHistoryGroupsCooperatively({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: scope.resetEpoch }, groups);
  if (!requestIsCurrent()) return null;
  const active = await currentWorkspaceScope(scope.ownerGeneration.ownerKey);
  if (!requestIsCurrent()) return null;
  if (!active || active.ownerGeneration.generation !== scope.ownerGeneration.generation || active.resetEpoch !== scope.resetEpoch) {
    throw new StaleOwnerGenerationError();
  }
  return projected;
}

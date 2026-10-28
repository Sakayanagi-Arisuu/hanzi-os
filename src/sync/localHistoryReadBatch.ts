import { listLessonResumes, readOwnerLocalState, readActiveOwnerLearningScope, StaleOwnerGenerationError, type ActiveOwnerLearningScope } from './indexedDb';
import { listLearningCommandRecords } from './learningCommandOutbox';
import { readWorkspaceCooperatively } from './workspaceSync';
import { workspaceEntriesWithHistoryCooperatively, workspaceHistoryEventsCooperatively } from './workspaceHistory';
import { readWorkspaceHistoryProjection } from './workspaceHistoryProjection';

/** One history load only: never retain this batch across refreshes or owners. */
export class LocalHistoryReadBatch {
  private readonly scope: ActiveOwnerLearningScope;
  private resumesRequest?: ReturnType<typeof listLessonResumes>;
  private commandsRequest?: ReturnType<typeof listLearningCommandRecords>;
  private stateRequest?: ReturnType<typeof readOwnerLocalState>;
  private workspaceRequest?: ReturnType<typeof readWorkspaceCooperatively>;
  private workspaceHistoryRequest?: ReturnType<typeof readWorkspaceHistoryProjection>;

  constructor(scope: ActiveOwnerLearningScope, private readonly aggregate = false) { this.scope = structuredClone(scope); }

  private requireScope(scope: ActiveOwnerLearningScope) {
    if (scope.ownerGeneration.ownerKey !== this.scope.ownerGeneration.ownerKey
      || scope.ownerGeneration.generation !== this.scope.ownerGeneration.generation
      || scope.resetEpoch !== this.scope.resetEpoch) throw new StaleOwnerGenerationError();
  }

  resumes(scope: ActiveOwnerLearningScope) {
    this.requireScope(scope);
    return this.resumesRequest ??= this.aggregate
      ? this.workspaceHistory(scope).then(() => listLessonResumes(this.scope, 'workspace-sync:v1'))
      : listLessonResumes(this.scope);
  }

  workspace(scope: ActiveOwnerLearningScope) {
    this.requireScope(scope);
    return this.workspaceRequest ??= readWorkspaceCooperatively(this.scope);
  }

  workspaceHistory(scope: ActiveOwnerLearningScope) {
    this.requireScope(scope);
    return this.workspaceHistoryRequest ??= this.aggregate ? readWorkspaceHistoryProjection(this.scope)
      : this.workspace(scope).then(async journal => workspaceHistoryEventsCooperatively({ ownerKey: this.scope.ownerGeneration.ownerKey,
        resetEpoch: this.scope.resetEpoch }, await workspaceEntriesWithHistoryCooperatively(journal.entries), journal.pending));
  }

  commands(scope: ActiveOwnerLearningScope) {
    this.requireScope(scope);
    return this.commandsRequest ??= listLearningCommandRecords(this.scope.ownerGeneration);
  }

  state(scope: ActiveOwnerLearningScope) {
    this.requireScope(scope);
    return this.stateRequest ??= readOwnerLocalState(this.scope.ownerGeneration.ownerKey);
  }

  async assertCurrent(scope: ActiveOwnerLearningScope) {
    this.requireScope(scope);
    const active = await readActiveOwnerLearningScope();
    if (!active || active.ownerGeneration.ownerKey !== this.scope.ownerGeneration.ownerKey
      || active.ownerGeneration.generation !== this.scope.ownerGeneration.generation
      || active.resetEpoch !== this.scope.resetEpoch) throw new StaleOwnerGenerationError();
  }
}

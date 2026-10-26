import { listLessonResumes, readOwnerLocalState, readActiveOwnerLearningScope, StaleOwnerGenerationError, type ActiveOwnerLearningScope } from './indexedDb';
import { listLearningCommandRecords } from './learningCommandOutbox';
import { readWorkspaceCooperatively } from './workspaceSync';

/** One history load only: never retain this batch across refreshes or owners. */
export class LocalHistoryReadBatch {
  private readonly scope: ActiveOwnerLearningScope;
  private resumesRequest?: ReturnType<typeof listLessonResumes>;
  private commandsRequest?: ReturnType<typeof listLearningCommandRecords>;
  private stateRequest?: ReturnType<typeof readOwnerLocalState>;
  private workspaceRequest?: ReturnType<typeof readWorkspaceCooperatively>;

  constructor(scope: ActiveOwnerLearningScope, private readonly aggregate = false) { this.scope = structuredClone(scope); }

  private requireScope(scope: ActiveOwnerLearningScope) {
    if (scope.ownerGeneration.ownerKey !== this.scope.ownerGeneration.ownerKey
      || scope.ownerGeneration.generation !== this.scope.ownerGeneration.generation
      || scope.resetEpoch !== this.scope.resetEpoch) throw new StaleOwnerGenerationError();
  }

  resumes(scope: ActiveOwnerLearningScope) {
    this.requireScope(scope);
    return this.resumesRequest ??= this.aggregate
      ? this.workspace(scope).then(() => listLessonResumes(this.scope, 'workspace-sync:v1'))
      : listLessonResumes(this.scope);
  }

  workspace(scope: ActiveOwnerLearningScope) {
    this.requireScope(scope);
    return this.workspaceRequest ??= readWorkspaceCooperatively(this.scope);
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

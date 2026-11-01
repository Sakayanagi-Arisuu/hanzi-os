import { listLessonResumes, readOwnerLocalState, readActiveOwnerLearningScope, StaleOwnerGenerationError, type ActiveOwnerLearningScope } from './indexedDb';
import { listLearningCommandRecords } from './learningCommandOutbox';
import { readWorkspaceCooperatively } from './workspaceSync';
import { workspaceEntriesWithHistoryCooperatively, workspaceHistoryEventsCooperatively } from './workspaceHistory';
import { readWorkspaceHistoryProjection } from './workspaceHistoryProjection';
import { LESSON_HISTORY_ENTRY_PREFIX } from '../learning/lessonHistory';
import { PAGE_CORRECTION_HISTORY_PREFIX } from './mistakeHistory';
import { projectHistoryState, type HistoryStateSnapshot } from './historyStateProjection';

/** One history load only: never retain this batch across refreshes or owners. */
export class LocalHistoryReadBatch {
  private readonly scope: ActiveOwnerLearningScope;
  private resumesRequest?: ReturnType<typeof listLessonResumes>;
  private commandsRequest?: ReturnType<typeof listLearningCommandRecords>;
  private stateRequest?: Promise<HistoryStateSnapshot | null>;
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
      ? this.workspaceHistory(scope).then(() => listLessonResumes(this.scope, 'workspace-sync:v1', record => {
        if (typeof record?.entryKey !== 'string') throw new Error('Unreadable history source wrapper; retain original record.');
        // These are the only resume families inspected by the three shared
        // history adapters. Default/non-history callers still receive all rows.
        return record.entryKey.startsWith(LESSON_HISTORY_ENTRY_PREFIX)
          || record.entryKey.startsWith('lesson-page-history:v1:')
          || record.entryKey.startsWith('lesson-reading:v1:')
          || record.entryKey.startsWith(PAGE_CORRECTION_HISTORY_PREFIX);
      }))
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
    return this.commandsRequest ??= this.aggregate
      ? listLearningCommandRecords(this.scope.ownerGeneration, this.scope.resetEpoch)
      : listLearningCommandRecords(this.scope.ownerGeneration);
  }

  state(scope: ActiveOwnerLearningScope) {
    this.requireScope(scope);
    return this.stateRequest ??= this.aggregate
      ? readOwnerLocalState(this.scope.ownerGeneration.ownerKey).then(async state => {
        const snapshot = await projectHistoryState(this.scope.ownerGeneration.ownerKey, state);
        await this.assertCurrent(this.scope);
        return snapshot;
      })
      : readOwnerLocalState(this.scope.ownerGeneration.ownerKey);
  }

  async assertCurrent(scope: ActiveOwnerLearningScope) {
    this.requireScope(scope);
    const active = await readActiveOwnerLearningScope();
    if (!active || active.ownerGeneration.ownerKey !== this.scope.ownerGeneration.ownerKey
      || active.ownerGeneration.generation !== this.scope.ownerGeneration.generation
      || active.resetEpoch !== this.scope.resetEpoch) throw new StaleOwnerGenerationError();
  }
}

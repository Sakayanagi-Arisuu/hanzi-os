import { resolveLearningContext, type LearningPreferences, type LearningSessionContext } from '../learning/learningPreferences';
import type { LessonHistoryEventV1 } from '../learning/lessonHistory';
import { sha256Hex } from '../sync/canonicalHash';
import type { CompetencyGraph } from './competencyGraph';
import type { LearningUnit } from './learningUnit';
import { reduceLearnerModel } from './learnerModel';
import { composeShadowSession, type ComposerEligibility, type SessionIntent } from './sessionComposer';

type Checkpoint = { at: string; preferences: LearningPreferences | null;
  context: LearningSessionContext; intent?: SessionIntent };

/** Offline technical harness. Synthetic scope only; no learner store, scoring or scheduler writes. */
export async function replayPilotTimeline(input: {
  graph: CompetencyGraph; units: readonly LearningUnit[];
  scope: ComposerEligibility['scope']; eligibility: ComposerEligibility;
  events: readonly LessonHistoryEventV1[]; checkpoints: readonly Checkpoint[];
}) {
  if (!input.scope.ownerKey.startsWith('fixture:replay:') || input.eligibility.authority !== 'synthetic-test'
    || !input.checkpoints.length || input.checkpoints.length > 32) throw new Error('Synthetic replay scope/checkpoints required');
  let previous = -Infinity;
  // Validate the full timeline before deriving anything. Never relabel a backward clock as a new run.
  for (const checkpoint of input.checkpoints) {
    const time = Date.parse(checkpoint.at);
    if (!Number.isFinite(time) || time <= previous) throw new Error('Replay checkpoints must increase');
    previous = time;
  }
  const started = performance.now();
  const timings: number[] = [];
  const snapshots = [];
  for (const checkpoint of input.checkpoints) {
    const start = performance.now();
    const context = resolveLearningContext(checkpoint.preferences, checkpoint.context);
    const model = await reduceLearnerModel({ ...input, asOf: checkpoint.at, allowInference: context.allowInference });
    const manifest = await composeShadowSession({ ...input, ...checkpoint, model, now: checkpoint.at });
    if (manifest.introSkipEligible || manifest.authorityGrants.length || manifest.completionLessonIds.length
      || model.cells.some(cell => cell.independentDistinctItems !== null || cell.sufficiency !== 'unknown'
        || cell.introSkipEligible || cell.prerequisiteEligible)) throw new Error('Unreviewed replay cannot grant measurement or access');
    snapshots.push({ at: checkpoint.at, modelBinding: model.binding, manifestBinding: manifest.binding,
      modelStatus: model.status, acceptedOccurrences: model.acceptedOccurrences, unknownByModule: model.unknownByModule,
      reasons: model.reasons, cells: model.cells, intent: manifest.intent, steps: manifest.steps,
      estimatedSeconds: manifest.estimatedSeconds, budgetSeconds: manifest.budgetSeconds,
      unresolved: manifest.unresolved, excluded: manifest.excluded, status: manifest.status });
    timings.push(performance.now() - start);
  }
  const body = { version: 1 as const, purpose: 'synthetic-technical-replay-only' as const,
    graphBinding: input.graph.binding, scope: input.scope,
    unitBindings: input.units.map(unit => ({ id: unit.id, binding: unit.binding })),
    snapshots, efficacy: 'not-measured' as const, independentRecall: 'unknown' as const,
    baselineArmComparison: 'requires-reviewed-protocol-and-cohort' as const };
  const usesHistory = input.checkpoints.some(checkpoint => resolveLearningContext(checkpoint.preferences, checkpoint.context).allowInference);
  const source = structuredClone({ graph: input.graph, units: input.units, scope: input.scope,
    eligibility: input.eligibility, checkpoints: input.checkpoints, events: usesHistory ? input.events : null });
  return { ...body, binding: await sha256Hex(body), sourceSnapshot: { input: source, binding: await sha256Hex(source),
    history: usesHistory ? 'synthetic-fixture-copies' as const : 'not-read-opt-out' as const }, performance: {
    basis: 'process-elapsed-not-device-navigation' as const, totalMs: performance.now() - started, checkpointMs: timings,
  } };
}

export type PilotReplayReport = Awaited<ReturnType<typeof replayPilotTimeline>>;

/** Re-execute frozen synthetic inputs; timing observations are not attestations. */
export async function verifyPilotReplayReport(report: PilotReplayReport) {
  if (!report || report.version !== 1 || report.purpose !== 'synthetic-technical-replay-only'
    || !report.sourceSnapshot?.input || !report.sourceSnapshot.binding) throw new Error('Unsupported synthetic replay artifact');
  const { binding, sourceSnapshot, performance: _timing, ...body } = report;
  if (await sha256Hex(sourceSnapshot.input) !== sourceSnapshot.binding || await sha256Hex(body) !== binding) {
    throw new Error('Replay artifact changed; retain original evidence');
  }
  const replayed = await replayPilotTimeline({ ...sourceSnapshot.input, events: sourceSnapshot.input.events ?? [] });
  if (replayed.binding !== binding || replayed.sourceSnapshot.binding !== sourceSnapshot.binding
    || replayed.sourceSnapshot.history !== sourceSnapshot.history) throw new Error('Replay no longer matches its frozen inputs');
  return { binding, verified: 'synthetic-semantic-replay-only' as const, timingAttested: false as const, efficacy: 'not-measured' as const };
}

import type { CompetencyGraph } from './competencyGraph';
import type { LearnerModel } from './learnerModel';
import { projectPilotCompetencyMap } from './pilotCompetencyMap';

// A reversible UX pacing rule, not a calibrated forgetting or mastery threshold.
const returnIntervalMs = 7 * 24 * 60 * 60 * 1000;

/** Descriptive pilot pacing only. Never schedules FSRS or authorizes skip/unlock. */
export async function planLongTermPractice(input: {
  graph: CompetencyGraph; model: LearnerModel;
  scope: { ownerKey: string; resetEpoch: number };
  now: string; allowInference: boolean; automatic: boolean; budgetSeconds: number;
}) {
  const now = Date.parse(input.now);
  if (!Number.isFinite(now) || ![300, 600, 1200].includes(input.budgetSeconds)) {
    throw new Error('Invalid long-term planning context');
  }
  const base = { budgetSeconds: input.budgetSeconds, reentry: false,
    diagnostic: 'reviewed-unseen-items-required' as const,
    delayedRecall: 'reviewed-unseen-items-required' as const,
    introSkipEligible: false as const, prerequisiteEligible: false as const };
  // Do not inspect history-derived cells for manual selection or opt-out.
  if (!input.allowInference || !input.automatic) return base;
  const map = await projectPilotCompetencyMap(input.graph, input.model, input.scope);
  if (!map.inferenceEnabled) return base;
  const cutoff = Date.parse(input.model.asOf);
  if (cutoff > now) throw new Error('Long-term model cutoff is in the future');
  let latest: number | null = null;
  for (const cell of input.model.cells) {
    if (cell.latestObservedAt === null) continue;
    const observed = Date.parse(cell.latestObservedAt);
    if (!Number.isFinite(observed) || observed > cutoff) throw new Error('Invalid observation clock');
    latest = latest === null ? observed : Math.max(latest, observed);
  }
  // Unknown time and cold start are not absence. A late sync keeps occurrence time.
  if (latest === null || now - latest < returnIntervalMs) return base;
  return { ...base, reentry: true, budgetSeconds: Math.min(300, input.budgetSeconds) };
}

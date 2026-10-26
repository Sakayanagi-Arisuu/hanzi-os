import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { DEFAULT_LEARNING_PREFERENCES } from '../src/learning/learningPreferences';
import { createActivityHistoryEvent } from '../src/learning/activityHistory';
import { extractPilotLearningUnits } from '../src/server/pilotLearningUnits';
import { replayPilotTimeline } from '../src/personalization/replayPilot';
import type { ComposerEligibility, SessionIntent } from '../src/personalization/sessionComposer';

// No real learner files, credentials, DB or browser storage are read by this CLI.
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--output')) throw Error('Usage: tsx scripts/replay-personalization-pilot.ts [--output tmp/file.json]');
const target = resolve(args[1] ?? 'tmp/personalization-pilot-replay.json');
const inside = relative(resolve('tmp'), target);
if (!inside || inside.startsWith('..') || isAbsolute(inside) || !target.endsWith('.json')) throw Error('Replay artifacts must stay in workspace tmp/*.json');
const { graph, units } = await extractPilotLearningUnits();
const scope = { ownerKey: 'fixture:replay:protocol-v1', resetEpoch: 0 };
const eligibility: ComposerEligibility = { scope, authority: 'synthetic-test', entries: units.map(unit => ({
  unitId: unit.id, binding: unit.binding, sourcePermitted: true, entitlementAllowed: true, lessonPrerequisitesAllowed: true,
})) };
const unit = units.find(unit => unit.id === 'u.number.rule')!;
const first = createActivityHistoryEvent({ ...scope, operationId: 'synthetic-first-wrong', module: 'overview',
  category: 'objective', sourceId: unit.source.lessonId, itemId: unit.id, activityVersion: unit.binding,
  contentVersion: unit.source.contentVersion, sourceRecordRef: 'synthetic-first-wrong', skill: unit.skill, modality: unit.modality,
  occurredAt: '2026-10-01T00:00:00Z', outcome: 'incorrect' });
const receipt = { ...first, confirmationState: 'confirmed' as const, authority: 'server-recorded' as const,
  receivedAt: '2026-10-02T00:00:00Z', receiptRef: 'synthetic-receipt' };
const point = { at: '2026-10-10T00:00:00Z', preferences: { ...DEFAULT_LEARNING_PREFERENCES, allowInference: true },
  context: { online: true, minutes: 5 as const, microphone: false, audio: false } };
const timeline = await replayPilotTimeline({ graph, units, scope, eligibility, events: [receipt, first, receipt],
  checkpoints: [{ ...point, at: '2026-10-01T12:00:00Z' }, { ...point, at: '2026-10-02T12:00:00Z' }, point] });
const paths = [];
for (const kind of ['quantity', 'listen', 'produce', 'transfer'] as SessionIntent['kind'][]) paths.push(await replayPilotTimeline({
  graph, units, scope, eligibility, events: [], checkpoints: [{ ...point, intent: { kind, origin: 'manual' } }],
}));
await mkdir(dirname(target), { recursive: true });
await writeFile(target, JSON.stringify({ purpose: 'synthetic-technical-replay-only', timeline, paths,
  limitations: ['No cohort, recall 7/30-day results or learning efficacy measurement.',
    'No device/navigation performance or live baseline-arm comparison.',
    'No writes to learner storage, scoring, FSRS, completion, entitlement or release policy.'] }, null, 2) + '\n');
console.log(JSON.stringify({ artifact: relative(process.cwd(), target), timelineBinding: timeline.binding,
  pathBindings: paths.map(path => path.binding), efficacy: timeline.efficacy, scope: 'synthetic-only' }));

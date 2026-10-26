import { readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { verifyPilotReplayReport, type PilotReplayReport } from '../src/personalization/replayPilot';

const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--input') throw Error('Usage: tsx scripts/verify-personalization-replay.ts --input tmp/file.json');
const target = resolve(args[1]);
const inside = relative(resolve('tmp'), target);
if (!inside || inside.startsWith('..') || isAbsolute(inside) || !target.endsWith('.json')) throw Error('Replay input must stay in workspace tmp/*.json');
const artifact = JSON.parse(await readFile(target, 'utf8')) as { purpose?: unknown; timeline?: PilotReplayReport; paths?: PilotReplayReport[] };
if (artifact.purpose !== 'synthetic-technical-replay-only' || !artifact.timeline || !Array.isArray(artifact.paths)
  || artifact.paths.length !== 4) throw Error('Unsupported synthetic replay artifact');
const results = [];
for (const report of [artifact.timeline, ...artifact.paths]) results.push(await verifyPilotReplayReport(report));
console.log(JSON.stringify({ artifact: relative(process.cwd(), target), results, efficacy: 'not-measured' }));

import { expect, it } from 'vitest';
import catalog from '../../content/runtime/hsk1-level-rich-lessons.json';
import { createPilotCompetencyGraph } from '../server/pilotCompetencyGraph';
import { resolveCompetency, sealCompetencyGraph, validateCompetencyGraph, verifyCompetencyGraphBinding } from './competencyGraph';

it('binds the four pilot goals to actual contextual source IDs without assigning mastery/skip from completion', async () => {
  const graph = await createPilotCompetencyGraph();
  await verifyCompetencyGraphBinding(graph);
  expect(graph.nodes.map(node => node.id)).toEqual(['c.number.quantity', 'c.price.comprehend', 'c.price.produce', 'c.shop.transfer']);
  expect(graph.nodes.flatMap(node => node.sourceMappings).map(mapping => mapping.source.entryId))
    .toEqual(expect.arrayContaining(['hsk1-grammar-row-011', 'hsk1-grammar-row-063', 'hsk1-task-09']));
  expect(graph.nodes.every(node => node.evidenceRequirements.threshold === null)).toBe(true);
  expect(graph.nodes.flatMap(node => node.sourceMappings).some(mapping => mapping.relation === 'measures')).toBe(false);
  expect(graph.authority).toBe('mapping-only'); expect(graph.humanReviewed).toBe(false);
});

it('rejects cycles, ambiguous aliases, fabricated thresholds and cross-modality measurement', async () => {
  const graph = await createPilotCompetencyGraph();
  const cycle = structuredClone(graph); cycle.nodes[0].prerequisites = ['c.price.comprehend'];
  expect(() => validateCompetencyGraph(cycle)).toThrow('cycle');
  const ambiguous = structuredClone(graph); ambiguous.nodes[0].aliases = ['c.price.comprehend'];
  expect(() => validateCompetencyGraph(ambiguous)).toThrow('alias');
  const policy = structuredClone(graph); policy.nodes[0].evidenceRequirements.threshold = 0.8 as unknown as null;
  expect(() => validateCompetencyGraph(policy)).toThrow('threshold');
  const measurement = structuredClone(graph); measurement.nodes[1].sourceMappings[0].relation = 'measures';
  expect(() => validateCompetencyGraph(measurement)).toThrow('Cross-skill');
  const alias = structuredClone(graph.nodes); alias[0].aliases = ['c.legacy-number'];
  const aliased = await sealCompetencyGraph(alias);
  expect(resolveCompetency(aliased, 'c.legacy-number')?.id).toBe('c.number.quantity');
  expect(resolveCompetency(aliased, 'c.unknown')).toBeNull();
});

it('pins whole contextual payloads and refuses missing/duplicate source items', async () => {
  const before = await createPilotCompetencyGraph();
  const changed = structuredClone(catalog);
  changed.lessons.find(lesson => lesson.lessonId === 'daily-1')!.dialogue[0].meaningVi += ' (fixture)';
  const after = await createPilotCompetencyGraph(changed);
  expect(after.binding).not.toBe(before.binding);
  expect(after.nodes[1].sourceMappings[0].source.sourceVersion).not.toBe(before.nodes[1].sourceMappings[0].source.sourceVersion);
  const tampered = structuredClone(before); tampered.nodes[0].objectiveVi += ' changed';
  await expect(verifyCompetencyGraphBinding(tampered)).rejects.toThrow('binding changed');
  const missing = structuredClone(catalog); missing.lessons = missing.lessons.filter(lesson => lesson.lessonId !== 'daily-1');
  await expect(createPilotCompetencyGraph(missing)).rejects.toThrow('unavailable');
  await expect(createPilotCompetencyGraph({ ...catalog, lessons: [...catalog.lessons, catalog.lessons[0]] })).rejects.toThrow();
});

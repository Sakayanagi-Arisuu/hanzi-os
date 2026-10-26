import type { Skill } from '../types';
import { sha256Hex } from '../sync/canonicalHash';

export type CompetencyModality = 'text' | 'audio' | 'speech' | 'handwriting';
export type CompetencySource = {
  lessonId: string; section: 'grammar' | 'dialogue' | 'tasks'; entryId: string | null;
  contentVersion: string; sourceVersion: string; payloadHash: string; contextHash: string;
};
export type Competency = {
  id: string; version: number; objectiveVi: string; aliases: string[]; prerequisites: string[];
  dimensions: { skill: Skill; modality: CompetencyModality }[];
  evidenceRequirements: { status: 'requires-human-review'; minimumDistinctItems: null; minimumDelayedDays: null;
    threshold: null; reviewRef: null };
  sourceMappings: { relation: 'teaches' | 'practices' | 'measures'; skill: Skill; modality: CompetencyModality; source: CompetencySource }[];
};
export type CompetencyGraph = { version: 1; id: string; binding: string; humanReviewed: false;
  authority: 'mapping-only'; nodes: Competency[] };
const identifier = (value: string) => /^c\.[a-z0-9][a-z0-9.-]*$/.test(value);
const hash = (value: string) => /^[a-f0-9]{64}$/.test(value);
const skills = new Set<Skill>(['pronunciation', 'listening', 'speaking', 'reading', 'writing', 'vocabulary', 'grammar']);
const modalities = new Set<CompetencyModality>(['text', 'audio', 'speech', 'handwriting']);

/** A mapping never grants completion, mastery, entitlement or introduction skip. */
export function validateCompetencyGraph(graph: CompetencyGraph) {
  if (graph.version !== 1 || graph.humanReviewed !== false || graph.authority !== 'mapping-only'
    || !graph.id || !hash(graph.binding) || !Array.isArray(graph.nodes) || !graph.nodes.length) throw new Error('Invalid competency graph');
  const ids = new Set<string>(), aliases = new Map<string, string>();
  for (const node of graph.nodes) {
    if (!identifier(node.id) || ids.has(node.id) || !Number.isSafeInteger(node.version) || node.version < 1 || !node.objectiveVi.trim()) throw new Error('Invalid/duplicate competency identity');
    ids.add(node.id);
  }
  for (const node of graph.nodes) {
    for (const alias of node.aliases) {
      if (!identifier(alias) || ids.has(alias) || aliases.has(alias)) throw new Error('Ambiguous competency alias');
      aliases.set(alias, node.id);
    }
    if (new Set(node.prerequisites).size !== node.prerequisites.length || node.prerequisites.some(id => !ids.has(id))) throw new Error('Unknown prerequisite');
    if (!node.dimensions.length || node.dimensions.some(dimension => !skills.has(dimension.skill) || !modalities.has(dimension.modality))) throw new Error('Invalid measurement dimension');
    const requirements = node.evidenceRequirements;
    if (requirements.status !== 'requires-human-review' || requirements.minimumDistinctItems !== null
      || requirements.minimumDelayedDays !== null || requirements.threshold !== null || requirements.reviewRef !== null) throw new Error('Unreviewed graph cannot invent evidence thresholds');
    if (!node.sourceMappings.length) throw new Error('Competency has no source mapping');
    for (const mapping of node.sourceMappings) {
      const source = mapping.source;
      if (!['teaches', 'practices', 'measures'].includes(mapping.relation) || !skills.has(mapping.skill) || !modalities.has(mapping.modality)
        || !source.lessonId || !['grammar', 'dialogue', 'tasks'].includes(source.section)
        || source.entryId !== null && !source.entryId || !source.contentVersion || !source.sourceVersion
        || !hash(source.payloadHash) || !hash(source.contextHash)) throw new Error('Invalid source binding');
      if (mapping.relation === 'measures' && !node.dimensions.some(dimension => dimension.skill === mapping.skill && dimension.modality === mapping.modality)) throw new Error('Cross-skill measurement is invalid');
    }
  }
  const visiting = new Set<string>(), visited = new Set<string>();
  const byId = new Map(graph.nodes.map(node => [node.id, node]));
  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error('Competency prerequisite cycle');
    if (visited.has(id)) return;
    visiting.add(id); byId.get(id)!.prerequisites.forEach(visit); visiting.delete(id); visited.add(id);
  };
  graph.nodes.forEach(node => visit(node.id));
  return { byId, aliases };
}

export function resolveCompetency(graph: CompetencyGraph, id: string) {
  const index = validateCompetencyGraph(graph);
  return index.byId.get(index.aliases.get(id) ?? id) ?? null;
}

export async function sealCompetencyGraph(nodes: Competency[], id = 'hanzi-price-quantity-pilot-v1'): Promise<CompetencyGraph> {
  const graph: CompetencyGraph = { version: 1, id, nodes: structuredClone(nodes),
    binding: await sha256Hex({ id, nodes }), humanReviewed: false, authority: 'mapping-only' };
  validateCompetencyGraph(graph); return graph;
}

export async function verifyCompetencyGraphBinding(graph: CompetencyGraph) {
  validateCompetencyGraph(graph);
  if (graph.binding !== await sha256Hex({ id: graph.id, nodes: graph.nodes })) throw new Error('Competency graph source binding changed');
}

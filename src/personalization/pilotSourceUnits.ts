// Pure contextual units; no bundled catalog or eligibility grants.
import { createPilotSourceGraph } from './pilotSourceGraph';
import { sealLearningUnit, type UnitTriple, type LearningUnit } from './learningUnit';
import type { CompetencyGraph, CompetencySource } from './competencyGraph';

const asTriple = (value: unknown): UnitTriple => {
  const source = value as UnitTriple;
  if (!source || ![source.hanzi, source.pinyin, source.meaningVi].every(text => typeof text === 'string' && text.trim())) throw new Error('Pilot unit triple unavailable');
  return { hanzi: source.hanzi, pinyin: source.pinyin, meaningVi: source.meaningVi,
    ...(typeof source.speaker === 'string' ? { speaker: source.speaker } : {}) };
};

export async function extractPilotSourceUnits(sourceCatalog: unknown) {
  const graph = await createPilotSourceGraph(sourceCatalog);
  const lessons = (sourceCatalog as { lessons: Record<string, unknown>[] }).lessons;
  const units: LearningUnit[] = [];
  const add = async (id: string, competencyId: string, section: CompetencySource['section'], entryId: string | null,
    taskType: LearningUnit['taskType'], seconds: number, typed = false) => {
    const node = graph.nodes.find(node => node.id === competencyId)!;
    const mapping = node.sourceMappings.find(mapping => mapping.source.section === section && mapping.source.entryId === entryId
      && (section !== 'tasks' || mapping.modality === (typed ? 'text' : 'speech')))!;
    if (!mapping) throw new Error('Unit mapping unavailable');
    const lesson = lessons.find(lesson => lesson.lessonId === mapping.source.lessonId)!;
    const dialogue = (lesson.dialogue as unknown[]).map(asTriple);
    const entry = entryId === null ? null : (lesson[section] as { id: string }[]).find(entry => entry.id === entryId) as Record<string, unknown>;
    const sourceInstruction = section === 'grammar' ? String(entry!.explanationVi ?? '')
      : section === 'tasks' ? String(entry!.instructionVi ?? '') : 'Đọc trọn lượt thoại, rồi đối chiếu thông tin giá và số lượng.';
    const instructionVi = typed ? `Viết lượt hỏi và trả lời của bạn. ${sourceInstruction} Tự đối chiếu với mẫu; đánh dấu nếu có dùng bộ gõ tiếng Trung (IME).` : sourceInstruction;
    const models = section === 'grammar' ? [asTriple(entry!.modelExample)]
      : section === 'tasks' ? (entry!.modelDialogue as unknown[]).map(asTriple) : [];
    units.push(await sealLearningUnit({ version: 1, id, graphBinding: graph.binding, competencyId,
      source: mapping.source, prerequisites: node.prerequisites, skill: mapping.skill, modality: mapping.modality, taskType,
      payload: { instructionVi, dialogue, explanationVi: section === 'grammar' ? instructionVi : null, models },
      assistance: { pinyin: 'optional', translation: 'optional', priorExposure: true, ime: 'record-if-used' },
      estimatedSeconds: seconds, timeBasis: 'planning-budget-not-measured', difficultyAssumption: 'unvalidated',
      access: 'source-lesson-policy-required', offline: 'exact-prepared-version-required',
      media: { nativeAudio: false, syntheticTts: 'optional-support-only' }, humanReviewed: false, measurementEligible: false,
      completionLessonIds: [], scoringAdapter: ['guided-role-play', 'guided-production'].includes(taskType) ? 'self-review' : 'exposure',
      provenance: { kind: 'existing-authored-local-source', sourceCatalog: 'content/runtime/hsk1-level-rich-lessons.json' },
    }, graph));
  };
  await add('u.number.rule', 'c.number.quantity', 'grammar', 'hsk1-grammar-row-011', 'explanation', 45);
  await add('u.price.dialogue', 'c.price.comprehend', 'dialogue', null, 'dialogue-context', 55);
  await add('u.price.rule', 'c.price.comprehend', 'grammar', 'hsk1-grammar-row-063', 'explanation', 45);
  await add('u.price.task09', 'c.price.produce', 'tasks', 'hsk1-task-09', 'guided-role-play', 90);
  await add('u.shop.dialogue', 'c.shop.transfer', 'dialogue', null, 'dialogue-context', 55);
  await add('u.price.task09-text', 'c.price.produce', 'tasks', 'hsk1-task-09', 'guided-production', 100, true);
  return { graph: graph as CompetencyGraph, units };
}

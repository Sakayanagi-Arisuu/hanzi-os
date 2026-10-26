// Pure source adapter; callers supply only content already permitted by their runtime.
import { sha256Hex } from '../sync/canonicalHash';
import { sealCompetencyGraph, type Competency, type CompetencySource } from './competencyGraph';

const requirements: Competency['evidenceRequirements'] = { status: 'requires-human-review',
  minimumDistinctItems: null, minimumDelayedDays: null, threshold: null, reviewRef: null };

export async function createPilotSourceGraph(sourceCatalog: unknown) {
  const source = sourceCatalog as { contentVersion?: unknown; lessons?: unknown };
  if (!source || typeof source.contentVersion !== 'string' || !source.contentVersion || !Array.isArray(source.lessons)) throw new Error('Pilot source catalog unavailable');
  const lessonIds = new Set<string>();
  for (const raw of source.lessons) {
    const lesson = raw as { lessonId?: unknown } | null;
    if (!lesson || typeof lesson.lessonId !== 'string' || !lesson.lessonId || lessonIds.has(lesson.lessonId)) throw new Error('Pilot lesson source unavailable or ambiguous');
    lessonIds.add(lesson.lessonId);
  }
  const bind = async (lessonId: string, section: CompetencySource['section'], entryId: string | null): Promise<CompetencySource> => {
    const lessons = source.lessons as Record<string, unknown>[];
    const candidates = lessons.filter(lesson => lesson?.lessonId === lessonId);
    if (candidates.length !== 1) throw new Error('Pilot lesson source unavailable or ambiguous');
    const lesson = candidates[0], rows = lesson[section];
    if (!Array.isArray(rows) || !rows.length) throw new Error('Pilot context unavailable');
    const selected = entryId === null ? rows : rows.filter(row => row && row.id === entryId);
    if (!selected.length || entryId !== null && selected.length !== 1) throw new Error('Pilot source item unavailable');
    const contextHash = await sha256Hex(lesson);
    return { lessonId, section, entryId, contentVersion: source.contentVersion as string,
      sourceVersion: `rich-pilot-v1:${contextHash}`, payloadHash: await sha256Hex(selected), contextHash };
  };
  const numberRule = await bind('hsk1-time-place-events-01-numbers', 'grammar', 'hsk1-grammar-row-011');
  const priceRule = await bind('daily-1', 'grammar', 'hsk1-grammar-row-063');
  const priceDialogue = await bind('daily-1', 'dialogue', null);
  const productTask = await bind('daily-1', 'tasks', 'hsk1-task-09');
  const shopDialogue = await bind('daily-3', 'dialogue', null);
  const nodes: Competency[] = [
    { id: 'c.number.quantity', version: 1, aliases: [], prerequisites: [],
      objectiveVi: 'Phân biệt số lượng và dùng 二/两 trong ngữ cảnh.', dimensions: [{ skill: 'grammar', modality: 'text' }],
      evidenceRequirements: requirements, sourceMappings: [{ relation: 'teaches', skill: 'grammar', modality: 'text', source: numberRule }] },
    { id: 'c.price.comprehend', version: 1, aliases: [], prerequisites: ['c.number.quantity'],
      objectiveVi: 'Hiểu giá và số lượng trong lượt hỏi đáp; phép đo nghe cần âm thanh phù hợp.', dimensions: [{ skill: 'listening', modality: 'audio' }],
      evidenceRequirements: requirements, sourceMappings: [
        { relation: 'teaches', skill: 'grammar', modality: 'text', source: priceRule },
        { relation: 'teaches', skill: 'reading', modality: 'text', source: priceDialogue }] },
    { id: 'c.price.produce', version: 1, aliases: [], prerequisites: ['c.number.quantity'],
      objectiveVi: 'Tự hỏi và trả lời giá hoặc số lượng trong tình huống cho trước.',
      dimensions: [{ skill: 'speaking', modality: 'speech' }, { skill: 'writing', modality: 'text' }],
      evidenceRequirements: requirements, sourceMappings: [
        { relation: 'practices', skill: 'speaking', modality: 'speech', source: productTask },
        { relation: 'practices', skill: 'writing', modality: 'text', source: productTask }] },
    { id: 'c.shop.transfer', version: 1, aliases: [], prerequisites: ['c.number.quantity'],
      objectiveVi: 'Vận dụng thông tin sản phẩm và giá trong tình huống khác mẫu.', dimensions: [{ skill: 'reading', modality: 'text' }],
      evidenceRequirements: requirements, sourceMappings: [{ relation: 'teaches', skill: 'reading', modality: 'text', source: shopDialogue }] },
  ];
  return sealCompetencyGraph(nodes);
}

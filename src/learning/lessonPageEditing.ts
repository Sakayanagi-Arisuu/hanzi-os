import type { LessonBlock, LessonPageDocument } from './lessonPages';

/** Copies receive fresh response keys; answer references follow their copied options. */
export function duplicateLessonBlock(source: LessonBlock, nextId: () => string = () => crypto.randomUUID()): LessonBlock {
  const block = structuredClone(source);
  block.id = nextId();
  if (block.activity) {
    const ids = new Map(block.activity.options.map(option => [option.id, nextId()]));
    block.activity.options = block.activity.options.map(option => ({ ...option, id: ids.get(option.id)! }));
    block.activity.answerIds = block.activity.answerIds.map(id => ids.get(id) ?? id);
    block.activity.rubric = block.activity.rubric.map(item => ({ ...item, id: nextId() }));
  }
  if (block.reading) block.reading.paragraphs = block.reading.paragraphs.map(paragraph => ({ ...paragraph, id: nextId() }));
  if (block.diagram) block.diagram.nodes = block.diagram.nodes.map(node => ({ ...node, id: nextId() }));
  return block;
}

export function duplicateLessonPage(source: LessonPageDocument['pages'][number], nextId: () => string = () => crypto.randomUUID()): LessonPageDocument['pages'][number] {
  return { ...structuredClone(source), id: nextId(), title: `${source.title} · bản sao`, blocks: source.blocks.map(block => duplicateLessonBlock(block, nextId)) };
}

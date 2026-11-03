import { afterEach, expect, it, vi } from 'vitest';
import { canonicalStudioJson, studioSha256 } from '../content/studioContent';
import type { D1Database } from './d1';
import { loadPublishedEditorialExamItems } from './hskMockExamEditorialRepository';

const repository = vi.hoisted(() => ({
  publishedRuntime: vi.fn(), releasedRuntimeRevisions: vi.fn(), getRevisions: vi.fn(),
}));
vi.mock('./contentStudioRepository', () => ({
  ContentStudioRepository: class {
    publishedRuntime = repository.publishedRuntime;
    releasedRuntimeRevisions = repository.releasedRuntimeRevisions;
    getRevisions = repository.getRevisions;
  },
}));
afterEach(() => { vi.resetAllMocks(); });

async function fixture(count = 19) {
  const sources = await Promise.all(Array.from({ length: count }, async (_, index) => {
    const content = { contentKind: 'exam-item', prompt: `item-${index}` };
    return { id: `revision-${index}`, itemType: 'exam_item', workflowState: 'published', content,
      contentSha256: await studioSha256(canonicalStudioJson(content)) };
  }));
  const publications = sources.map(source => ({ revisionId: source.id,
    itemType: source.itemType, contentSha256: source.contentSha256, content: {} }));
  repository.publishedRuntime.mockResolvedValue({ items: publications });
  repository.releasedRuntimeRevisions.mockResolvedValue(publications);
  return sources;
}

it('reads bounded batches and retains publication order across batches', async () => {
  const sources = await fixture(205);
  repository.getRevisions.mockImplementation(async (ids: string[]) =>
    ids.map(id => sources.find(source => source.id === id)));
  const result = await loadPublishedEditorialExamItems({} as D1Database);
  expect(repository.getRevisions.mock.calls.map(([ids]) => ids.length)).toEqual([100, 100, 5]);
  expect(result.map(item => item.revisionId)).toEqual(sources.map(source => source.id));
  expect(result.map(item => item.content)).toEqual(sources.map(source => source.content));
});

it('retains archived pinned sources for existing released forms', async () => {
  const sources = await fixture(1);
  repository.getRevisions.mockResolvedValue([{ ...sources[0], workflowState: 'archived' }]);
  expect((await loadPublishedEditorialExamItems({} as D1Database))[0].content).toEqual(sources[0].content);
});

it.each(['digest', 'stored-digest', 'state', 'type'])('rejects the entire result for a source with invalid %s', async invalid => {
  const sources = await fixture(2);
  repository.getRevisions.mockImplementation(async (ids: string[]) => ids.map(id => {
    const source = sources.find(item => item.id === id)!;
    if (source.id !== sources[1].id) return source;
    if (invalid === 'digest') return { ...source, content: { ...source.content, prompt: 'tampered' } };
    if (invalid === 'stored-digest') return { ...source, contentSha256: 'wrong' };
    if (invalid === 'state') return { ...source, workflowState: 'draft' };
    return { ...source, itemType: 'lesson' };
  }));
  await expect(loadPublishedEditorialExamItems({} as D1Database)).rejects.toThrow('immutable digest fence');
});

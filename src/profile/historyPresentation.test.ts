import { expect, it } from 'vitest';
import { createActivityHistoryEvent } from '../learning/activityHistory';
import { historyActivityLabel, historyDay, historyOutcomeLabel, historySourceLink } from './historyPresentation';

const event = createActivityHistoryEvent({ ownerKey: 'anonymous:one', resetEpoch: 0, operationId: 'real-operation',
  module: 'dictionary', category: 'exposure', sourceId: 'word-one', itemId: 'word-one', sourceRecordRef: 'private-source-ref',
  contentVersion: 'unknown', activityVersion: 'unknown', occurredAt: null });
it('keeps unknown dates explicit, separates visit/self-review/support and never labels them verified recall', () => {
  expect(historyDay({ ...event, receivedAt: '2026-10-19T01:00:00Z' })).toBe('Chưa rõ ngày thực hiện');
  expect(historyDay({ ...event, occurredAt: '2026-10-18T20:00:00Z' })).toBe('19/10/2026');
  expect(historyActivityLabel(event)).toBe('Đọc hoặc tra cứu');
  expect(historyOutcomeLabel(event)).toContain('đang chờ xác nhận');
  expect(historyActivityLabel({ ...event, business: { version: 1, category: 'visit' } })).toContain('không phải trả lời');
  expect(historyActivityLabel({ ...event, business: { version: 1, category: 'self-review' } })).toContain('không chấm mức thành thạo');
  expect(historyOutcomeLabel({ ...event, confirmationState: 'quarantined' })).toContain('Chưa được chấp nhận');
});
it('keeps source links local, distinguishes expansion and does not expose receipt/hash/IDs as labels', () => {
  const links = [historySourceLink(event), historySourceLink({ ...event, module: 'lessons', sourceLessonIds: ['https://not-a-destination.invalid'] }),
    historySourceLink({ ...event, module: 'lessons', business: { version: 1, category: 'support', details: { domain: 'expansion' } } }),
    historySourceLink({ ...event, module: 'assessment' }), historySourceLink({ ...event, module: 'writing' })];
  expect(links.every(link => link.href.startsWith('/') && !link.label.includes('private-source-ref') && !link.label.includes('word-one'))).toBe(true);
  expect(links[1].href).toBe('/lesson/https%3A%2F%2Fnot-a-destination.invalid');
  expect(links[2].href).toBe('/path/expansion/word-one');
  expect(links[3].href).toBe('/assessment');
});

it('names adaptive drafts and links the source lesson without exposing the manifest or unit ID', () => {
  const adaptive = { ...event, module: 'overview' as const, sourceId: `practice:${'a'.repeat(64)}`, itemId: 'u.private-unit',
    sourceLessonIds: ['daily-1'], business: { version: 1 as const, category: 'session' as const, details: { domain: 'adaptive-session', action: 'draft' } } };
  expect(historyActivityLabel(adaptive)).toBe('Khảo Luyện · giữ nháp câu trả lời');
  expect(historySourceLink(adaptive)).toEqual({ href: '/lesson/daily-1', label: 'Mở bài nguồn của lượt luyện' });
  expect(historySourceLink({ ...adaptive, sourceLessonIds: [] }).href).toBe('/path');
  expect(JSON.stringify([historyActivityLabel(adaptive), historySourceLink(adaptive)])).not.toMatch(/practice:|u\.private-unit|aaaa/);
});

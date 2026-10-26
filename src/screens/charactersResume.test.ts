import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import type { CharacterForgeSession } from '../characters/characterForgeSession';
import { CharactersPage } from './CharactersPage';

const { journal } = vi.hoisted(() => ({ journal: {
  snapshot: null as { session: CharacterForgeSession } | null,
  legacyCandidate: null as CharacterForgeSession | null,
  ready: true, busy: false, error: '', compatible: false,
  start: vi.fn(), retry: vi.fn(),
} }));
vi.mock('../sync/useWritingJournal', () => ({ useWritingJournal: () => journal }));
vi.mock('../store/LearningStore', () => ({ useLearning: () => ({
  state: { contentVersion: 'current', profile: { script: 'simplified' } }, sync: { ownerKey: 'anonymous:test' },
}) }));
vi.mock('react-router', () => ({ useLocation: () => ({ pathname: '/characters', search: '' }), useNavigate: () => vi.fn() }));
vi.mock('../content/usePublishedStudioCharacters', () => ({ usePublishedStudioCharacters: () => ({ entries: [], status: 'ready' }) }));
vi.mock('../commerce/usePremiumCharacters', () => ({ usePremiumCharacters: () => [] }));
vi.mock('../components/GuildBanner', () => ({ GuildBanner: () => null }));
vi.mock('../components/GuildGlyph', () => ({ GuildGlyph: () => null }));
vi.mock('../components/GuildJourney', () => ({ GuildJourney: () => null }));

const session: CharacterForgeSession = { version: 1, source: 'quick', lessonId: null, hanzis: ['人'],
  currentIndex: 0, phase: 'prediction', completedHanzis: [], needsReplay: [], paperHanzis: [],
  assistanceByHanzi: {}, updatedAt: '2026-10-21T00:00:00Z' };
const render = () => renderToStaticMarkup(createElement(CharactersPage));
beforeEach(() => Object.assign(journal, { snapshot: null, legacyCandidate: null, compatible: false, ready: true }));

it('offers a new session for an incompatible snapshot instead of sending the learner back to a rejecting runner', () => {
  journal.snapshot = { session };
  const before = JSON.stringify(journal.snapshot);
  const html = render();
  expect(html).toContain('Bắt đầu Nhìn Xuyên');
  expect(html).toContain('Học liệu đã đổi phiên bản. Phiên cũ được giữ');
  expect(html).not.toContain('Tiếp tục phiên đang dở');
  expect(JSON.stringify(journal.snapshot)).toBe(before);
  expect(journal.start).not.toHaveBeenCalled();
});

it('resumes a compatible active session and still offers explicit legacy adoption', () => {
  journal.snapshot = { session }; journal.compatible = true;
  expect(render()).toContain('Tiếp tục phiên đang dở');
  journal.snapshot = null; journal.compatible = false; journal.legacyCandidate = session;
  expect(render()).toContain('Tiếp tục phiên đang dở');
  journal.snapshot = { session };
  expect(render()).not.toContain('Tiếp tục phiên đang dở');
});

it('does not offer an active resume for a completed or still loading session', () => {
  journal.snapshot = { session: { ...session, phase: 'result' } }; journal.compatible = true;
  expect(render()).not.toContain('Tiếp tục phiên đang dở');
  journal.compatible = false; journal.ready = false;
  expect(render()).toContain('Đang đọc phiên…');
  expect(render()).not.toContain('Học liệu đã đổi phiên bản');
});

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { extractPilotLearningUnits } from '../server/pilotLearningUnits';
import { reduceLearnerModel } from './learnerModel';
import { composeShadowSession } from './sessionComposer';
import { AdaptiveUnitRenderer, type AdaptiveUnitRendererProps } from './AdaptiveUnitRenderer';
import type { AdaptiveJournal } from '../sync/adaptiveSession';
import { sealPracticeManifest } from './practiceManifest';

async function fixture(production = false) {
  const { graph, units } = await extractPilotLearningUnits();
  const scope = { ownerKey: 'anonymous:renderer-fixture', resetEpoch: 0 }, now = '2026-10-21T00:00:00Z';
  const model = await reduceLearnerModel({ graph, units, events: [], scope, asOf: now, allowInference: false });
  const shadow = await composeShadowSession({ graph, units, model, scope, now, preferences: null,
    context: { online: true, microphone: false, minutes: 5 }, intent: { kind: production ? 'produce' : 'quantity', origin: 'manual' },
    eligibility: { scope, authority: 'guest-released-source', entries: units.map(unit => ({ unitId: unit.id, binding: unit.binding,
      sourcePermitted: true, entitlementAllowed: true, lessonPrerequisitesAllowed: true })) } });
  const manifest = await sealPracticeManifest(shadow);
  const journal: AdaptiveJournal = { status: 'active', pending: false, snapshot: { version: 1, id: 'renderer', revision: 0,
    manifest, cursor: production ? 1 : 0, receipts: [], support: {}, drafts: {} } };
  const first = manifest.steps[0]!;
  if (production && first.kind === 'unit') journal.snapshot.receipts.push({ stepId: first.stepId, unitBinding: first.unitBinding,
    kind: 'exposure', response: null, ime: null, selfReview: null });
  const step = manifest.steps[journal.snapshot.cursor]!;
  if (step.kind !== 'unit') throw new Error('Unit fixture required');
  const unit = units.find(unit => unit.id === step.unitId)!;
  const props: AdaptiveUnitRendererProps = { unit, journal, busy: false, error: '', draft: { response: '三本书多少钱？', ime: true }, draftStatus: 'saved',
    onDraft: vi.fn(), onSupport: async () => undefined, onPractice: async () => undefined, onAdvance: async () => undefined, onExit: vi.fn() };
  return props;
}

it('renders the typed task, IME and explicit self-review without claiming scoring or exposing the model before reveal', async () => {
  const props = await fixture(true);
  const before = JSON.stringify(props.journal);
  const markup = renderToStaticMarkup(createElement(AdaptiveUnitRenderer, props));
  expect(markup).toContain('Lượt hỏi và trả lời của bạn'); expect(markup).toContain('Có dùng bộ gõ tiếng Trung (IME)');
  expect(markup).toContain('không phải điểm kiểm chứng');
  expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Lưu lượt tự đối chiếu/);
  expect(markup).not.toContain('Nghe máy đọc');
  expect(JSON.stringify(props.journal)).toBe(before);
});

it('keeps next/close disabled while an account receipt is pending', async () => {
  const props = await fixture();
  const step = props.journal.snapshot.manifest.steps[0]!;
  if (step.kind !== 'unit') throw new Error('Unit required');
  props.journal.pending = true;
  props.journal.snapshot.receipts = [{ stepId: step.stepId, unitBinding: step.unitBinding, kind: 'exposure', response: null, ime: null, selfReview: null }];
  const markup = renderToStaticMarkup(createElement(AdaptiveUnitRenderer, props));
  expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Đang chờ xác nhận lưu/);
  expect(markup).not.toContain('>Khép phiên luyện<');
});

it('preserves the frozen session and shows a fallback instead of rendering a substituted source unit', async () => {
  const props = await fixture();
  props.unit = { ...props.unit, binding: 'different-version' };
  const markup = renderToStaticMarkup(createElement(AdaptiveUnitRenderer, props));
  expect(markup).toContain('Phiên đã lưu được giữ nguyên');
  expect(markup).not.toContain('aria-label="Ngữ cảnh đầy đủ"');
});

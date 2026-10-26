import { canonicalStringify, sha256Hex } from '../sync/canonicalHash';
import { resolveLearningContext, type LearningPreferences, type LearningSessionContext } from '../learning/learningPreferences';
import type { CompetencyGraph } from './competencyGraph';
import { validateLearningUnit, type LearningUnit } from './learningUnit';
import type { LearnerModel } from './learnerModel';
import { planLongTermPractice } from './longTermPractice';

export type SessionIntent = { kind: 'explore' | 'quantity' | 'listen' | 'produce' | 'review' | 'transfer';
  origin: 'manual' | 'practice-observation' | 'synthetic-fixture' | 'default' };
export type UnitEligibility = { unitId: string; binding: string; sourcePermitted: boolean; entitlementAllowed: boolean;
  lessonPrerequisitesAllowed: boolean; prepared?: { ownerKey: string; resetEpoch: number; binding: string } };
export type ComposerEligibility = { scope: { ownerKey: string; resetEpoch: number };
  authority: 'server-validated' | 'guest-released-source' | 'synthetic-test'; entries: UnitEligibility[] };
export type ReviewOffer = { cardId: string; wordId: string; wordVersion: string; cardRevision: number;
  schedulerVersion: string; offerRevision: string; dueAt: string; estimatedSeconds: number; allowed: boolean;
  prepared?: { ownerKey: string; resetEpoch: number; offerRevision: string; wordVersion: string } };
export type ShadowStep = { stepId: string; kind: 'unit'; unitId: string; unitBinding: string; contentVersion: string;
  sourceLessonId: string; competencyId: string; skill: LearningUnit['skill']; taskType: LearningUnit['taskType']; modality: LearningUnit['modality'];
  assistance: LearningUnit['assistance']; estimatedSeconds: number; receiptKind: 'exposure' | 'self-review'; reasonVi: string }
  | { stepId: string; kind: 'fsrs-offer'; offer: Omit<ReviewOffer, 'allowed'>; estimatedSeconds: number;
    receiptKind: 'existing-review-grade'; reasonVi: string };
const sameScope = (a: ComposerEligibility['scope'], b: ComposerEligibility['scope']) => a.ownerKey === b.ownerKey && a.resetEpoch === b.resetEpoch;
const transitionSeconds = 10;

/** Shadow-only orchestration. It cannot open source lessons, submit answers or schedule FSRS. */
export async function composeShadowSession(input: { graph: CompetencyGraph; units: readonly LearningUnit[]; model: LearnerModel;
  scope: ComposerEligibility['scope']; preferences: LearningPreferences | null | undefined; context: LearningSessionContext;
  eligibility: ComposerEligibility; reviewOffers?: readonly ReviewOffer[]; intent?: SessionIntent; now: string }) {
  const now = Date.parse(input.now);
  if (!Number.isFinite(now) || input.model.graphBinding !== input.graph.binding || !sameScope(input.scope, input.model.scope)
    || Date.parse(input.model.asOf) > now || !sameScope(input.scope, input.eligibility.scope)) throw new Error('Composer scope/model cutoff changed');
  const context = resolveLearningContext(input.preferences, input.context);
  const budgetSeconds = context.minutes * 60;
  const pacing = await planLongTermPractice({ ...input, allowInference: context.allowInference,
    automatic: !input.intent, budgetSeconds });
  let intent = input.intent ?? { kind: 'explore' as const, origin: 'default' as const };
  if (!input.intent && !pacing.reentry && context.allowInference && input.model.status !== 'disabled') {
    const recent = [...input.model.cells].filter(cell => cell.reportedIncorrect > 0)
      .sort((a,b) => b.reportedIncorrect - a.reportedIncorrect || (a.competencyId < b.competencyId ? -1 : 1))[0];
    if (recent) intent = { kind: recent.skill === 'listening' ? 'listen' : recent.skill === 'writing' || recent.skill === 'speaking'
      ? 'produce' : recent.skill === 'reading' ? 'transfer' : 'quantity', origin: 'practice-observation' };
  }
  const steps: ShadowStep[] = [];
  const excluded: { unitId: string; reason: string }[] = [];
  const unresolved: string[] = [];
  if (pacing.reentry) unresolved.push('gentle-reentry-not-a-memory-assessment');
  const chosen = new Set<string>();
  const byId = new Map<string, LearningUnit>();
  const eligibility = new Map<string, UnitEligibility>();
  const authorityAllowed = input.eligibility.authority === 'server-validated'
    || input.eligibility.authority === 'guest-released-source' && input.scope.ownerKey.startsWith('anonymous:')
    || input.eligibility.authority === 'synthetic-test' && input.scope.ownerKey.startsWith('fixture:');
  for (const entry of input.eligibility.entries) {
    if (eligibility.has(entry.unitId)) throw new Error('Ambiguous unit eligibility');
    eligibility.set(entry.unitId, entry);
  }
  for (const unit of input.units) {
    await validateLearningUnit(unit, input.graph);
    if (byId.has(unit.id)) throw new Error('Ambiguous unit version');
    byId.set(unit.id, unit);
  }
  const manual = !context.allowInference && intent.origin !== 'manual';
  const permitted = (unit: LearningUnit) => {
    const entry = eligibility.get(unit.id);
    const reject = (reason: string) => { excluded.push({ unitId: unit.id, reason }); return false; };
    if (!authorityAllowed || !entry || entry.binding !== unit.binding || !entry.sourcePermitted) return reject('source-policy');
    if (!entry.entitlementAllowed) return reject('entitlement');
    if (!entry.lessonPrerequisitesAllowed) return reject('source-prerequisite');
    if (unit.modality === 'audio' && (!context.audio || !unit.media.nativeAudio)) return reject('native-audio-unavailable');
    if (unit.modality === 'speech' && !context.microphone) return reject('microphone-unavailable-use-text-alternative');
    if (!context.online && (!entry.prepared || !sameScope(entry.prepared, input.scope) || entry.prepared.binding !== unit.binding)) return reject('exact-offline-content-unavailable');
    return true;
  };
  const total = () => steps.reduce((sum, step) => sum + step.estimatedSeconds + transitionSeconds, 0);
  const bundleFor = (unit: LearningUnit, visiting = new Set<string>()): LearningUnit[] | null => {
    if (chosen.has(unit.id)) return [];
    if (visiting.has(unit.competencyId) || !permitted(unit)) return null;
    visiting.add(unit.competencyId);
    const bundle: LearningUnit[] = [];
    for (const id of unit.prerequisites) {
      if (steps.some(step => step.kind === 'unit' && step.competencyId === id)) continue;
      const support = input.units.find(candidate => candidate.competencyId === id && candidate.taskType === 'explanation');
      if (!support) { excluded.push({ unitId: unit.id, reason: 'prerequisite-preparation-unavailable' }); return null; }
      const before = bundleFor(support, new Set(visiting));
      if (!before) return null;
      bundle.push(...before);
    }
    return [...new Map([...bundle, unit].map(candidate => [candidate.id, candidate])).values()];
  };
  const addUnit = (id: string, reasonVi: string) => {
    const unit = byId.get(id);
    if (!unit || chosen.has(id)) return;
    const bundle = bundleFor(unit);
    if (!bundle) return;
    const fresh = bundle.filter(candidate => !chosen.has(candidate.id));
    if (total() + fresh.reduce((sum, candidate) => sum + candidate.estimatedSeconds + transitionSeconds, 0) > pacing.budgetSeconds) {
      excluded.push({ unitId: id, reason: 'session-time-budget' }); return;
    }
    for (const candidate of fresh) {
      chosen.add(candidate.id);
      steps.push({ stepId: `step-${steps.length + 1}`, kind: 'unit', unitId: candidate.id, unitBinding: candidate.binding,
        contentVersion: candidate.source.contentVersion, sourceLessonId: candidate.source.lessonId, competencyId: candidate.competencyId,
        skill: candidate.skill, taskType: candidate.taskType, modality: candidate.modality, assistance: candidate.assistance,
        estimatedSeconds: candidate.estimatedSeconds, receiptKind: candidate.scoringAdapter,
        reasonVi: candidate.id === id ? reasonVi : 'Ôn ngắn cách diễn đạt số lượng trước khi dùng trong ngữ cảnh.' });
    }
  };
  if (!manual) {
    if (intent.kind === 'listen') {
      unresolved.push(context.audio ? 'native-listening-content-unavailable' : 'audio-disabled');
      addUnit('u.price.dialogue', 'Có thể đổi sang đọc trọn lượt hỏi đáp về giá.');
      addUnit('u.price.rule', 'Đối chiếu cách diễn đạt giá bằng văn bản.');
    } else if (intent.kind === 'produce') {
      addUnit(context.microphone ? 'u.price.task09' : 'u.price.task09-text', context.microphone
        ? 'Tự luyện lời hỏi và trả lời giá, rồi đối chiếu theo mẫu.' : 'Viết lời hỏi và trả lời; có lựa chọn dùng bộ gõ tiếng Trung.');
    } else if (intent.kind === 'review') {
      addUnit('u.number.rule', 'Nhắc ngắn cách dùng số và lượng từ; lịch ôn từ vẫn theo FSRS hiện có.');
      const due = new Map<string, ReviewOffer>();
      for (const offer of input.reviewOffers ?? []) {
        if (!offer.allowed || !authorityAllowed || !offer.cardId || !offer.wordId || !offer.wordVersion || !offer.schedulerVersion || !offer.offerRevision
          || !Number.isSafeInteger(offer.cardRevision) || offer.cardRevision < 1 || !Number.isFinite(Date.parse(offer.dueAt))
          || Date.parse(offer.dueAt) > now || !Number.isSafeInteger(offer.estimatedSeconds) || offer.estimatedSeconds < 1) continue;
        if (!context.online && (!offer.prepared || !sameScope(offer.prepared, input.scope)
          || offer.prepared.offerRevision !== offer.offerRevision || offer.prepared.wordVersion !== offer.wordVersion)) continue;
        const previous = due.get(offer.cardId);
        if (previous && canonicalStringify(previous) !== canonicalStringify(offer)) throw new Error('Conflicting FSRS offer revisions');
        due.set(offer.cardId, offer);
      }
      for (const offer of [...due.values()].sort((a,b) => a.dueAt < b.dueAt ? -1 : a.dueAt > b.dueAt ? 1 : a.cardId < b.cardId ? -1 : 1)) {
        if (total() + offer.estimatedSeconds + transitionSeconds > budgetSeconds) continue;
        const { allowed: _allowed, ...frozen } = offer;
        steps.push({ stepId: `step-${steps.length + 1}`, kind: 'fsrs-offer', offer: frozen,
          estimatedSeconds: offer.estimatedSeconds, receiptKind: 'existing-review-grade', reasonVi: 'Thẻ đã đến hạn trong lịch ôn hiện có.' });
      }
      if (!steps.some(step => step.kind === 'fsrs-offer')) unresolved.push('no-eligible-existing-review-offer');
    } else if (intent.kind === 'transfer') {
      unresolved.push('reviewed-unseen-challenge-unavailable');
      addUnit('u.shop.dialogue', 'Có thể đổi sang đọc ngữ cảnh mua sắm khác để tự luyện.');
    } else if (intent.kind === 'quantity') addUnit('u.number.rule', 'Luyện cách diễn đạt số lượng theo mục tiêu hiện tại.');
    else { addUnit('u.number.rule', pacing.reentry
      ? 'Trở lại bằng một phần ngắn, tối đa 5 phút; bạn có thể tự chọn mục tiêu khác.'
      : 'Bắt đầu bằng một phần ngắn về số và lượng từ.'); addUnit('u.price.dialogue', 'Đặt cách diễn đạt vào lượt hỏi đáp có ngữ cảnh.'); }
  }
  const requiresTaskChange = steps.length > 0 && (intent.kind === 'listen' || intent.kind === 'transfer');
  const body = { schemaVersion: 1 as const, plannerVersion: 'hanzi-deterministic-shadow-v1', shadowOnly: true as const,
    scope: input.scope, createdAt: input.now, graphBinding: input.graph.binding, modelBinding: input.model.binding,
    preferenceBinding: await sha256Hex({ preferences: input.preferences ?? null, context }),
    eligibilityBinding: await sha256Hex(input.eligibility), context, intent, budgetSeconds, transitionSeconds,
    estimatedSeconds: total(), steps, unresolved, excluded, requiresTaskChange,
    timeBasis: 'planning-budget-not-measured' as const,
    status: manual ? 'manual-selection' as const : steps.length ? 'shadow-plan' as const : 'no-candidate' as const,
    fallback: { href: '/path', label: 'Chọn bài theo lộ trình hiện có' },
    introSkipEligible: false as const, completionLessonIds: [] as string[], authorityGrants: [] as string[] };
  const binding = await sha256Hex(body);
  return { ...body, manifestId: `shadow:${binding}`, binding };
}
export type ShadowSessionManifest = Awaited<ReturnType<typeof composeShadowSession>>;

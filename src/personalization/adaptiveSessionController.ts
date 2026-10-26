import type { ActiveOwnerLearningScope } from '../sync/indexedDb';
import { advanceAdaptiveSession, archiveAdaptiveSession, readAdaptiveSession, recordAdaptiveDraft, recordAdaptivePractice,
  recordAdaptiveSupport, type AdaptiveJournal, type AdaptivePracticeReceipt } from '../sync/adaptiveSession';
import { canonicalStringify } from '../sync/canonicalHash';
import { saveAdaptiveDraftRecovery } from '../sync/adaptiveDraftRecovery';

type Draft = { response: string; ime: boolean };
type Support = Parameters<typeof recordAdaptiveSupport>[2];
export type AdaptiveControllerState = {
  journal: AdaptiveJournal | null; draft: Draft; draftStatus: 'saved' | 'saving' | 'error';
  busy: boolean; conflict: boolean; error: string;
};
const emptyDraft = (): Draft => ({ response: '', ime: false });
const snapshotDraft = (journal: AdaptiveJournal | null): Draft => {
  const step = journal?.snapshot.manifest.steps[journal.snapshot.cursor];
  return { ...(step && journal?.snapshot.drafts?.[step.stepId] || emptyDraft()) };
};

/** One writer per mounted runner. IDB CAS remains the authority across tabs/devices.
 * Drafts stay visible after failures; no automatic rebase onto an external revision.
 */
export class AdaptiveSessionController {
  private state: AdaptiveControllerState = { journal: null, draft: emptyDraft(), draftStatus: 'saved', busy: false, conflict: false, error: '' };
  private tail: Promise<unknown> = Promise.resolve();
  private disposed = false;
  private dirty = false;
  private lifecycle = 0;
  private listeners = new Set<() => void>();
  constructor(private scope: ActiveOwnerLearningScope) {}
  getState = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  retain = () => {
    const lifecycle = ++this.lifecycle;
    return () => queueMicrotask(() => { if (lifecycle === this.lifecycle) this.dispose(); });
  };
  private publish(patch: Partial<AdaptiveControllerState>) {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(listener => listener());
  }
  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const result = this.tail.then(async () => {
      if (this.disposed) throw new Error('Adaptive runner closed');
      this.publish({ busy: true });
      try { return await work(); }
      catch (error) {
        this.publish({ error: 'Chưa lưu được phiên. Nội dung nháp vẫn được giữ; thử lưu lại hoặc đọc phiên đã lưu.',
          draftStatus: this.dirty ? 'error' : this.state.draftStatus });
        throw error;
      } finally { this.publish({ busy: false }); }
    });
    this.tail = result.catch(() => undefined);
    return result;
  }
  /** Initial hydration only; explicit recovery must acknowledge discarding the visible draft. */
  hydrate = () => this.enqueue(async () => {
    if (this.state.journal || this.dirty) return;
    const journal = await readAdaptiveSession(this.scope);
    this.publish({ journal, draft: snapshotDraft(journal), error: '' });
  });
  updateDraft = (draft: Draft) => {
    if (this.disposed || this.state.conflict || !this.state.journal) return;
    const snapshot = this.state.journal.snapshot, step = snapshot.manifest.steps[snapshot.cursor];
    if (step?.kind !== 'unit' || step.modality !== 'text' || step.receiptKind !== 'self-review'
      || snapshot.receipts.length !== snapshot.cursor || typeof draft.response !== 'string'
      || draft.response.length > 4000 || typeof draft.ime !== 'boolean') return;
    this.dirty = true;
    this.publish({ draft: { ...draft }, draftStatus: 'saving' });
  };
  private requireJournal() {
    if (this.state.conflict) throw new Error('External revision requires explicit reload');
    if (!this.state.journal) throw new Error('No adaptive session');
    return this.state.journal;
  }
  private async persistDraft() {
    const journal = this.requireJournal();
    if (!this.dirty) return;
    const draft = { ...this.state.draft };
    const saved = await recordAdaptiveDraft(this.scope, journal.snapshot, draft);
    if (this.disposed) return;
    this.dirty = canonicalStringify(draft) !== canonicalStringify(this.state.draft);
    this.publish({ journal: saved, draftStatus: this.dirty ? 'saving' : 'saved', error: '' });
  }
  flushDraft = () => this.enqueue(() => this.persistDraft());
  support = (kind: Support) => this.enqueue(async () => {
    await this.persistDraft();
    const journal = await recordAdaptiveSupport(this.scope, this.requireJournal().snapshot, kind);
    if (this.disposed) throw new Error('Adaptive runner closed before support effect');
    this.publish({ journal, error: '' });
  });
  practice = (receipt: AdaptivePracticeReceipt) => this.enqueue(async () => {
    await this.persistDraft();
    const journal = this.requireJournal();
    const step = journal.snapshot.manifest.steps[journal.snapshot.cursor];
    // A delayed click cannot submit a different answer than the current visible draft.
    if (step?.kind === 'unit' && step.modality === 'text' && step.receiptKind === 'self-review'
      && (receipt.response !== this.state.draft.response || receipt.ime !== this.state.draft.ime)) {
      throw new Error('Draft changed before submission; review current answer');
    }
    const saved = await recordAdaptivePractice(this.scope, journal.snapshot, receipt);
    this.publish({ journal: saved, error: '' });
  });
  advance = () => this.enqueue(async () => {
    await this.persistDraft();
    const journal = await advanceAdaptiveSession(this.scope, this.requireJournal().snapshot);
    this.publish({ journal, draft: snapshotDraft(journal), draftStatus: 'saved', error: '' });
  });
  archive = () => this.enqueue(async () => {
    await this.persistDraft();
    const journal = await archiveAdaptiveSession(this.scope, this.requireJournal().snapshot);
    this.publish({ journal, error: '' });
  });
  keepDraftAndReload = () => this.enqueue(async () => {
    const snapshot = this.state.journal?.snapshot;
    if (!snapshot) throw new Error('No original session for this draft');
    const draft = { ...this.state.draft };
    if (this.dirty || draft.response || draft.ime) await saveAdaptiveDraftRecovery(this.scope, snapshot, draft);
    const journal = await readAdaptiveSession(this.scope);
    if (canonicalStringify(draft) !== canonicalStringify(this.state.draft)) throw new Error('Draft changed while keeping a recovery copy');
    this.dirty = false;
    this.publish({ journal, draft: snapshotDraft(journal), draftStatus: 'saved', conflict: false, error: '' });
  });
  keepDraftForExit = () => this.enqueue(async () => {
    const snapshot = this.state.journal?.snapshot;
    if (!snapshot) throw new Error('No original session for this draft');
    const draft = { ...this.state.draft };
    if (this.dirty || draft.response || draft.ime) await saveAdaptiveDraftRecovery(this.scope, snapshot, draft);
    if (canonicalStringify(draft) !== canonicalStringify(this.state.draft)) throw new Error('Draft changed while keeping a recovery copy');
  });
  /** Safe on workspace received/focus/BroadcastChannel: ack changes are allowed,
   * external edits block writing and preserve the visible answer until explicit reload.
   */
  refresh = () => this.enqueue(async () => {
    let journal: AdaptiveJournal | null;
    try { journal = await readAdaptiveSession(this.scope); }
    catch (error) {
      this.publish({ conflict: true, error: 'Chưa đọc được phiên mới nhất. Nháp đang hiển thị được giữ; hãy giữ riêng nháp trước khi rời phiên.' });
      throw error;
    }
    if (canonicalStringify(journal?.snapshot ?? null) !== canonicalStringify(this.state.journal?.snapshot ?? null)) {
      this.publish({ conflict: true, error: 'Phiên đã thay đổi ở nơi khác. Nháp đang hiển thị vẫn được giữ; đọc phiên đã lưu để tiếp tục.' });
      return;
    }
    this.publish({ journal });
  });
  reloadSaved = (options: { discardVisibleDraft: boolean }) => this.enqueue(async () => {
    if (this.dirty && !options.discardVisibleDraft) throw new Error('Keep visible draft until explicitly discarded');
    const journal = await readAdaptiveSession(this.scope);
    this.dirty = false;
    this.publish({ journal, draft: snapshotDraft(journal), draftStatus: 'saved', conflict: false, error: '' });
  });
  dispose = () => { this.disposed = true; this.listeners.clear(); };
}

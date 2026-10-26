import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { JourneyLoading } from '../components/JourneyLoading';
import { RecoveryStatusSlot } from '../components/RecoveryStatusBoundary';
import { SYNC_DEVICE_STORAGE_KEY, SYNC_INSTALLATION_STORAGE_KEY } from '../lib/storageKeys';
import { continueOwnerRecovery, exportPendingRecoveryPreimage, finishOwnerRecovery,
  readOwnerRecoveryStatus, rollBackOwnerRecovery, cancelOwnerRecoveryPreview, prepareOwnerRecovery,
  beginOwnerRecovery, type RecoveryPreview } from '../sync/ownerRecoveryApply';
import { OWNER_RECOVERY_CHANGED } from '../sync/ownerRecoveryFence';

/** Mount no learner repositories while IDB/localStorage recovery is incomplete. */
export function OwnerRecoveryGate({ children }: { children: ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [job, setJob] = useState<Awaited<ReturnType<typeof readOwnerRecoveryStatus>>['job']>(null);
  const [preview, setPreview] = useState<RecoveryPreview | null>(null);
  const [prepared, setPrepared] = useState<{ digest: string; count: number } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const revision = useRef({ value: 0 });
  const previewIdentity = useRef<string | undefined>(undefined);
  const inspect = useCallback(async () => {
    const current = ++revision.current.value;
    try {
      const pending = await readOwnerRecoveryStatus();
      if (revision.current.value === current) {
        if (previewIdentity.current !== pending.preview?.id) { previewIdentity.current = pending.preview?.id; setPrepared(null); }
        setJob(pending.job); setPreview(pending.preview); setChecked(true);
      }
    } catch {
      if (revision.current.value === current) { setChecked(false); setError('Chưa đọc được trạng thái khôi phục. Bản dữ liệu gốc được giữ; thử kiểm tra lại.'); }
    }
  }, []);
  useEffect(() => {
    const sequence = revision.current;
    void inspect();
    const changed = () => { setChecked(false); void inspect(); };
    const focus = () => { void inspect(); };
    window.addEventListener(OWNER_RECOVERY_CHANGED, changed); window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', focus);
    let channel: BroadcastChannel | undefined;
    try { channel = new BroadcastChannel(OWNER_RECOVERY_CHANGED); channel.onmessage = changed; } catch { /* Focus rechecks remain. */ }
    return () => { ++sequence.value; window.removeEventListener(OWNER_RECOVERY_CHANGED, changed);
      window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', focus); channel?.close(); };
  }, [inspect]);
  const act = async (action: 'continue' | 'rollback' | 'finish' | 'export' | 'prepare' | 'apply' | 'cancel-preview') => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      if (action === 'prepare') {
        if (!preview) throw Error('No recovery preview');
        const result = await prepareOwnerRecovery(preview.source, preview.scope, preview.binding);
        setPrepared({ digest: result.digest, count: result.count });
      }
      if (action === 'apply') {
        if (!preview || !prepared) throw Error('Review recovery first');
        await beginOwnerRecovery(preview.source, preview.scope, preview.binding, prepared.digest, localStorage, preview.id);
        setPrepared(null);
      }
      if (action === 'cancel-preview') { await cancelOwnerRecoveryPreview(); window.location.reload(); return; }
      if (action === 'continue') await continueOwnerRecovery();
      if (action === 'rollback') { await rollBackOwnerRecovery(); await continueOwnerRecovery(); }
      if (action === 'finish') { await finishOwnerRecovery(); window.location.reload(); return; }
      if (action === 'export') {
        const installationId = localStorage.getItem(SYNC_INSTALLATION_STORAGE_KEY), deviceId = localStorage.getItem(SYNC_DEVICE_STORAGE_KEY);
        if (!installationId || !deviceId) throw Error('Missing local identity');
        const source = await exportPendingRecoveryPreimage({ installationId, deviceId });
        const url = URL.createObjectURL(new Blob([source], { type: 'application/json' }));
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'hanzi-os-before-recovery.json';
        document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 0);
      }
      await inspect();
    } catch {
      setPrepared(null);
      setError(preview ? 'Chưa thể khôi phục bản sao này. Dữ liệu học hiện tại vẫn nguyên vẹn. Bạn có thể thử kiểm tra lại hoặc quay lại không gian học.'
        : 'Chưa hoàn tất thao tác. Bản trước khôi phục vẫn được giữ. Nếu có thay đổi từ tab khác, dữ liệu mới được giữ và thao tác tạm dừng.');
    }
    finally { setBusy(false); }
  };
  if (checked && !job && !preview) return children;
  if (!checked && !error) return <JourneyLoading fullscreen message="Đang kiểm tra dữ liệu trên thiết bị…" />;
  return <main className="owner-recovery-gate" aria-busy={busy}>
    <RecoveryStatusSlot />
    <header><p>HANZI.OS · bảo toàn tiến trình</p><h1>{preview ? 'Xem trước khôi phục' : 'Tiếp tục khôi phục dữ liệu'}</h1></header>
    <section>
      <p>{preview ? 'Phiên học tạm dừng để kiểm tra bản sao. Chưa thay đổi dữ liệu học; bạn có thể quay lại trước bước khôi phục.'
        : 'Phiên học tạm dừng để hoàn tất khôi phục. Bản dữ liệu trước thay đổi vẫn được lưu trên thiết bị.'}</p>
      {preview && <p>{prepared ? `Đã kiểm tra ${prepared.count} mục. Khôi phục sẽ thay dữ liệu học hiện tại và giữ một bản trước thay đổi để hoàn tác. Sở thích hiện tại phải khớp với bản sao.`
        : 'Kiểm tra dữ liệu trong lúc các phiên học đã tạm dừng. Với bản sao lớn, thao tác này có thể cần thêm thời gian.'}</p>}
      {job && <p>{job.phase === 'awaiting-confirmation'
        ? 'Nhật ký, phiên dở và ảnh đã được ghi. Hoàn tất để mở lại không gian học, hoặc hoàn tác về bản trước đó.'
        : job.phase === 'rollback-ready' ? 'Đã ghi lại bản trước khôi phục. Hoàn tất để mở lại không gian học.'
          : job.phase === 'rolling-back-local' ? 'Đang hoàn tác về dữ liệu trước khôi phục. Tiếp tục để hoàn tất các mục còn lại.'
          : 'Bản sao đã được ghi vào kho chính. Cần tiếp tục để hoàn tất các mục trên trình duyệt.'}</p>}
      {error && <p role="alert">{error}</p>}
      {job && <button className="secondary-button full-button" disabled={busy} onClick={() => void act('export')}>Xuất bản dữ liệu trước khôi phục</button>}
    </section>
    <footer>
      {!checked ? <button className="primary-button full-button" disabled={busy} onClick={() => { setError(''); void inspect(); }}>Kiểm tra lại</button>
        : preview ? <>
          <button className="primary-button full-button" disabled={busy} onClick={() => void act(prepared ? 'apply' : 'prepare')}>
            {busy ? 'Đang kiểm tra và giữ dữ liệu hiện tại…' : prepared ? 'Khôi phục nhật ký, phiên dở và ảnh' : 'Kiểm tra điều kiện khôi phục'}</button>
          <button className="secondary-button full-button" disabled={busy} onClick={() => void act('cancel-preview')}>Quay lại, giữ dữ liệu hiện tại</button>
        </> : <>
          <button className="primary-button full-button" disabled={busy} onClick={() => void act(job?.phase === 'awaiting-confirmation' || job?.phase === 'rollback-ready' ? 'finish' : 'continue')}>
            {job?.phase === 'awaiting-confirmation' || job?.phase === 'rollback-ready' ? 'Hoàn tất và mở không gian học' : 'Tiếp tục ghi dữ liệu'}</button>
          {job?.phase !== 'rolling-back-local' && job?.phase !== 'rollback-ready' && <button className="secondary-button full-button" disabled={busy} onClick={() => void act('rollback')}>Hoàn tác về bản trước khôi phục</button>}
        </>}
    </footer>
  </main>;
}

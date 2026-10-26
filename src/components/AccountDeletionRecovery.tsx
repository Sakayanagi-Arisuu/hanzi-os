"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { ACCOUNT_DELETION_CHANGED_EVENT, readAccountDeletionReceipts } from '../sync/accountDeletion';
export function AccountDeletionRecovery({ resume, ready = true }: { resume: () => Promise<boolean>; ready?: boolean }) {
  const [receipts, setReceipts] = useState<ReturnType<typeof readAccountDeletionReceipts>>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const resumeRef = useRef(resume);
  useEffect(() => { resumeRef.current = resume; }, [resume]);
  useEffect(() => {
    const update = () => setReceipts(readAccountDeletionReceipts()); update();
    window.addEventListener(ACCOUNT_DELETION_CHANGED_EVENT, update);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener(ACCOUNT_DELETION_CHANGED_EVENT, update); window.removeEventListener('storage', update); };
  }, []);
  const check = useCallback(async () => {
    if (running.current || !mounted.current || !ready) return;
    running.current = true; setBusy(true); setMessage('');
    try {
      const pending = await resumeRef.current();
      if (!mounted.current) return;
      setMessage(pending ? 'Yêu cầu xóa đang được xử lý. Bạn có thể đóng ứng dụng và kiểm tra lại sau.' : 'Yêu cầu xóa đã hoàn tất.');
      setReceipts(readAccountDeletionReceipts());
    } catch (cause) { if (mounted.current) setMessage(cause instanceof Error ? cause.message : 'Chưa xác nhận được kết quả xóa.'); }
    finally { running.current = false; if (mounted.current) setBusy(false); }
  }, [ready]);
  useEffect(() => {
    let active = true;
    const online = () => { if (active && navigator.onLine && readAccountDeletionReceipts().length) void check(); };
    queueMicrotask(online);
    window.addEventListener('online', online);
    return () => { active = false; window.removeEventListener('online', online); };
  }, [check]);
  if (!receipts.length && !message) return null;
  return <section className="sys-panel" aria-busy={busy}><h2>Yêu cầu xóa tài khoản</h2>
    {receipts.length > 0 && <><p>Yêu cầu xóa đã được lưu trên thiết bị. Máy chủ tiếp tục xử lý khi dịch vụ sẵn sàng; dữ liệu trên thiết bị được giữ đến khi có xác nhận hoàn tất.</p>
      <button className="auth-secondary" type="button" style={{minHeight:44}} disabled={busy || !ready} onClick={() => void check()}>{busy ? 'Đang kiểm tra…' : 'Kiểm tra kết quả xóa'}</button></>}
    {message && <p role="status">{message}</p>}
  </section>;
}

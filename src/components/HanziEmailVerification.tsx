"use client";
import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
type Status = { available: boolean; verified?: boolean; email?: string };
const endpoint = '/api/auth/hanzi/email-verification';
export function HanziEmailVerification({ onVerified }: { onVerified?: () => void }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const pending = useRef(false);
  const lifecycle = useRef<AbortController | null>(null);
  const load = async (signal: AbortSignal) => {
    const response = await fetch(endpoint, { cache: 'no-store', signal });
    if (!response.ok) throw new Error('Chưa kiểm tra được trạng thái email. Hãy thử lại.');
    const result = await response.json() as Status;
    if (!signal.aborted) setStatus(result);
    return result;
  };
  useEffect(() => {
    const controller = new AbortController();
    lifecycle.current = controller;
    const timeout = window.setTimeout(() => { controller.abort(); setError('Chưa kiểm tra được trạng thái email. Hãy thử lại.'); }, 20_000);
    void load(controller.signal).catch(() => { if (!controller.signal.aborted) setError('Chưa kiểm tra được trạng thái email. Hãy thử lại.'); }).finally(() => clearTimeout(timeout));
    return () => { controller.abort(); clearTimeout(timeout); };
  }, []);
  const refresh = async () => {
    if (pending.current) return;
    const signal = AbortSignal.any([lifecycle.current!.signal, AbortSignal.timeout(20_000)]);
    pending.current = true; setBusy(true); setError('');
    try { const result = await load(signal); if (!signal.aborted && result.verified) onVerified?.(); }
    catch { if (!lifecycle.current?.signal.aborted) setError('Chưa kiểm tra được trạng thái email. Hãy thử lại.'); }
    finally { pending.current = false; if (!lifecycle.current?.signal.aborted) setBusy(false); }
  };
  const send = async () => {
    if (pending.current) return;
    const controller = lifecycle.current!;
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]);
    pending.current = true; setBusy(true); setError('');
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }), signal });
      if (!response.ok) throw new Error(response.status === 401 ? 'Hãy kiểm tra mật khẩu HANZI.OS và phiên đăng nhập.'
        : response.status === 429 ? 'Bạn đã yêu cầu nhiều lần. Hãy chờ 10 phút rồi thử lại.' : 'Chưa gửi được thư xác minh. Hãy thử lại sau.');
      const body = await response.json() as { accepted?: boolean; verified?: boolean };
      if (signal.aborted) return;
      if (body.verified === true) { await load(signal); if (!signal.aborted) onVerified?.(); }
      else if (body.accepted === true) setSent(true);
      else throw new Error('Chưa gửi được thư xác minh. Hãy thử lại sau.');
    } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error && cause.name === 'Error' ? cause.message : 'Chưa gửi được thư xác minh. Hãy thử lại sau.'); }
    finally { pending.current = false; if (!controller.signal.aborted) { setPassword(''); setBusy(false); } }
  };
  if (status?.available === false) return null;
  return <section className="auth-card auth-email-verification" aria-busy={busy || (!status && !error)}>
    <h2 className="auth-title">Email tài khoản HANZI.OS</h2>
    {status?.verified ? <p className="auth-copy" role="status"><ShieldCheck size={18} aria-hidden="true" /> Email đã xác minh.</p> : <>
      {status?.email && <p className="auth-copy">{status.email}</p>}
      {sent ? <p className="auth-copy" role="status">Thư xác minh đã được gửi. Mở liên kết trong email, rồi kiểm tra lại tại đây. Hãy xem cả thư rác.</p>
        : status ? <form onSubmit={event => { event.preventDefault(); void send(); }}>
          <p className="auth-copy">Xác minh email để bảo vệ tài khoản. Nhập mật khẩu HANZI.OS để gửi thư đến đúng email của bạn.</p>
          <label className="auth-field"><span>Mật khẩu HANZI.OS</span><span className="auth-password-field">
            <input className="auth-input" type={show ? 'text' : 'password'} aria-label="Mật khẩu HANZI.OS" autoComplete="current-password" required maxLength={256} disabled={busy} value={password} onChange={event => setPassword(event.target.value)} />
            <button type="button" disabled={busy} aria-pressed={show} aria-label={show ? 'Ẩn mật khẩu HANZI.OS' : 'Hiện mật khẩu HANZI.OS'} onClick={() => setShow(value => !value)}>{show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button>
          </span></label>
          <button className="auth-button auth-wide-button" type="submit" disabled={busy || !password}>{busy ? 'Đang gửi…' : 'Gửi thư xác minh'}</button>
        </form> : !error && <p role="status">Đang kiểm tra email…</p>}
      {(sent || error) && <button className="auth-secondary" type="button" disabled={busy} onClick={() => void refresh()}>{busy ? 'Đang kiểm tra…' : 'Kiểm tra lại email'}</button>}
      {sent && <button className="auth-secondary" type="button" disabled={busy} onClick={() => { setSent(false); setError(''); }}>Gửi thư mới</button>}
    </>}
    {error && <p className="auth-status auth-status-error" role="alert">{error}</p>}
  </section>;
}

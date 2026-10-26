"use client";

import { useEffect, useRef, useState } from 'react';

export function HanziPasswordReset({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const submit = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/hanzi/password-reset', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }), signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) {
        if (response.status === 429) throw new Error('Bạn đã yêu cầu nhiều lần. Hãy chờ 10 phút rồi thử lại.');
        throw new Error('Chưa gửi được yêu cầu. Hãy kiểm tra kết nối rồi thử lại.');
      }
      const body = await response.json() as { accepted?: boolean };
      if (body.accepted !== true) throw new Error('Chưa gửi được yêu cầu. Hãy thử lại.');
      setAccepted(true);
    } catch (cause) {
      setError(cause instanceof Error && cause.name === 'Error' ? cause.message : 'Chưa gửi được yêu cầu. Hãy kiểm tra kết nối rồi thử lại.');
    } finally { submitting.current = false; setBusy(false); }
  };
  return <form className="auth-card auth-hanzi-card auth-password-reset" aria-busy={busy} onSubmit={event => { event.preventDefault(); void submit(); }}>
    <h2 className="auth-title" tabIndex={-1} ref={heading}>Quên mật khẩu</h2>
    <div className="auth-reset-fields">
    {accepted ? <p role="status" className="auth-copy">Nếu email này có tài khoản HANZI.OS, bạn sẽ nhận được liên kết đặt lại mật khẩu. Hãy kiểm tra cả thư rác. Sau khi đổi mật khẩu, quay lại đây để đăng nhập.</p> : <>
      <p className="auth-copy">Nhập email đã dùng để tạo tài khoản HANZI.OS. Nếu dùng Google hoặc GitHub, hãy đăng nhập bằng nút tương ứng.</p>
      <label className="auth-field"><span>Email tài khoản HANZI.OS</span>
        <input className="auth-input" type="email" autoComplete="email" required maxLength={254} value={email}
          disabled={busy} onChange={event => setEmail(event.target.value)} />
      </label>
    </>}
    </div>
    <div className="auth-reset-footer">
    {!accepted && <button className="auth-button auth-wide-button" type="submit" disabled={busy || !email.trim()}><span>{busy ? 'Đang gửi yêu cầu…' : 'Gửi liên kết khôi phục'}</span></button>}
    {error && <p className="auth-status auth-status-error" role="alert">{error}</p>}
    <button className="auth-secondary auth-reset-back" type="button" disabled={busy} onClick={onBack}>Quay lại đăng nhập</button>
    </div>
  </form>;
}

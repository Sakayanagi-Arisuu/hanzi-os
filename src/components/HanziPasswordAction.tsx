"use client";

import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { hanziPasswordMeetsPolicy, HANZI_PASSWORD_MIN_LENGTH, HANZI_PASSWORD_POLICY_MESSAGE } from '../auth/hanziPasswordPolicy';
import { hanziEmailActionFromUrl } from '../auth/passwordResetAction';
import { AuthGateSeal } from './AuthGateSeal';
import { AuthSwordFormation } from './AuthSwordFormation';
import { HanziPasswordReset } from './HanziPasswordReset';
import './AuthConsole.css';
import './AuthGuild.css';
import './GuildTypography.css';
import './HanziPasswordAction.css';

type Stage = 'checking' | 'ready' | 'invalid' | 'unavailable' | 'completed' | 'request';
const ENDPOINT = '/api/auth/hanzi/password-reset/complete';
const CHECK_ERROR = 'Chưa kiểm tra được liên kết. Hãy kiểm tra kết nối rồi thử lại.';
const UNCERTAIN = 'Chưa xác nhận được kết quả. Hãy thử đăng nhập bằng mật khẩu mới; nếu chưa được, yêu cầu liên kết mới.';

export function HanziPasswordAction() {
  const [stage, setStage] = useState<Stage>('checking');
  const [attempt, setAttempt] = useState(0);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState<'password' | 'confirmation' | null>(null);
  const [emailAction, setEmailAction] = useState(false);
  const actionMode = useRef<'resetPassword' | 'verifyEmail'>('resetPassword');
  const code = useRef<string | null>(null);
  const initialized = useRef(false);
  const submitting = useRef(false);
  const mounted = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const confirmationInput = useRef<HTMLInputElement>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    // Read only once, including under React Strict Mode, then remove ALL query
    // and fragment data before subsequent requests or outgoing navigation.
    if (!initialized.current) {
      initialized.current = true;
      const action = hanziEmailActionFromUrl(new URL(window.location.href));
      code.current = action?.code ?? null;
      actionMode.current = action?.mode ?? 'resetPassword';
      setEmailAction(actionMode.current === 'verifyEmail');
      window.history.replaceState(null, '', window.location.pathname);
    }
    if (!code.current) { setStage('invalid'); return; }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      controller.abort();
      if (mounted.current) { setError(CHECK_ERROR); setStage('unavailable'); }
    }, 20_000);
    setStage('checking'); setError('');
    void fetch(actionMode.current === 'verifyEmail' ? '/api/auth/hanzi/email-verification/complete' : ENDPOINT, {
      method: 'POST', referrerPolicy: 'no-referrer', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ operation: 'verify', oobCode: code.current }), signal: controller.signal,
    }).then(async response => {
      if (controller.signal.aborted) return;
      if (response.status === 409 || response.status === 422) { code.current = null; setStage('invalid'); return; }
      if (!response.ok) {
        setError(response.status === 429 ? 'Bạn đã thử nhiều lần. Hãy chờ 10 phút rồi thử lại.' : CHECK_ERROR);
        setStage('unavailable'); return;
      }
      const body = await response.json() as { valid?: boolean };
      if (!controller.signal.aborted) {
        if (body.valid !== true) { setError(CHECK_ERROR); setStage('unavailable'); }
        else setStage('ready');
      }
    }).catch(() => {
      if (mounted.current && !controller.signal.aborted) { setError(CHECK_ERROR); setStage('unavailable'); }
    }).finally(() => window.clearTimeout(timeout));
    return () => { controller.abort(); window.clearTimeout(timeout); };
  }, [attempt]);

  useEffect(() => { if (stage !== 'checking') heading.current?.focus(); }, [stage]);
  useEffect(() => {
    if (!busy && fieldError) (fieldError === 'password' ? passwordInput : confirmationInput).current?.focus();
  }, [fieldError, busy]);
  const submit = async () => {
    if (submitting.current || !code.current) return;
    setFieldError(null); setError('');
    if (!emailAction && !hanziPasswordMeetsPolicy(password)) {
      setFieldError('password'); setError(HANZI_PASSWORD_POLICY_MESSAGE); passwordInput.current?.focus(); return;
    }
    if (!emailAction && confirmation !== password) {
      setFieldError('confirmation'); setError('Hai mật khẩu chưa khớp. Hãy nhập lại để xác nhận.'); confirmationInput.current?.focus(); return;
    }
    submitting.current = true; setBusy(true);
    try {
      const response = await fetch(emailAction ? '/api/auth/hanzi/email-verification/complete' : ENDPOINT, {
        method: 'POST', referrerPolicy: 'no-referrer', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ operation: 'confirm', oobCode: code.current, ...(!emailAction ? { newPassword: password } : {}) }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!mounted.current) return;
      if (response.status === 409) { code.current = null; setPassword(''); setConfirmation(''); setStage('invalid'); return; }
      if (!response.ok) {
        if (response.status === 422) {
          if (emailAction) { code.current = null; setStage('invalid'); }
          else { setFieldError('password'); setError(HANZI_PASSWORD_POLICY_MESSAGE); passwordInput.current?.focus(); }
        } else setError(response.status === 429 ? 'Bạn đã thử nhiều lần. Hãy chờ 10 phút rồi thử lại.' : emailAction ? 'Chưa xác nhận được kết quả. Hãy kiểm tra email trong Bảo mật tài khoản.' : UNCERTAIN);
        return;
      }
      const result = await response.json() as { completed?: boolean; verified?: boolean };
      if (!mounted.current) return;
      if ((emailAction ? result.verified : result.completed) !== true) { setError(emailAction ? CHECK_ERROR : UNCERTAIN); return; }
      code.current = null; setPassword(''); setConfirmation(''); setShowPassword(false); setError(''); setStage('completed');
    } catch { if (mounted.current) setError(emailAction ? 'Chưa xác nhận được kết quả. Hãy kiểm tra email trong Bảo mật tài khoản.' : UNCERTAIN); }
    finally { submitting.current = false; if (mounted.current) setBusy(false); }
  };
  const requestNew = () => {
    code.current = null; setPassword(''); setConfirmation(''); setError(''); setStage('request');
  };
  const title = stage === 'checking' ? 'Kiểm tra liên kết' : stage === 'completed' ? emailAction ? 'Email đã xác minh' : 'Đã đổi mật khẩu' : stage === 'invalid' ? 'Liên kết không còn hiệu lực'
    : stage === 'request' ? 'Khôi phục tài khoản' : emailAction ? 'Xác minh email' : 'Đặt mật khẩu mới';

  return <main className="signin-page auth-guild auth-action-page">
    <nav className="signin-nav"><a href="/welcome" aria-label="Trở về HANZI.OS"><strong>HANZI.OS</strong></a><a href="/signin">Đăng nhập</a></nav>
    <div className="signin-shell">
      <section className="signin-intro" aria-label="Cổng Hành Giả"><div className="auth-banner-copy"><strong lang="zh-Hans">汉<br />字</strong></div></section>
      <section className="signin-console">
        <div className="auth-stack auth-signin-stack" data-auth-view="recovery">
          <AuthSwordFormation />
          <div className="auth-entrance-mark"><AuthGateSeal recovery /><span>HANZI.OS <i /> CỔNG HÀNH GIẢ</span></div>
          <header className="auth-guild-heading"><h1 tabIndex={-1} ref={heading}>{title}</h1></header>
          {stage === 'checking' && <p className="auth-copy" role="status">{emailAction ? 'Đang kiểm tra liên kết xác minh…' : 'Đang kiểm tra liên kết khôi phục…'}</p>}
          {stage === 'ready' && !emailAction && <form className="auth-card auth-hanzi-card auth-password-action" aria-busy={busy} onSubmit={event => { event.preventDefault(); void submit(); }}>
            <div className="auth-action-fields">
            <p className="auth-copy">Tạo mật khẩu riêng cho tài khoản HANZI.OS của bạn.</p>
            <div className="auth-form-grid">
              <label className="auth-field"><span>Mật khẩu mới</span><span className="auth-password-field">
                <input ref={passwordInput} className="auth-input" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required maxLength={256}
                  value={password} disabled={busy} aria-invalid={fieldError === 'password'} aria-describedby="reset-password-policy reset-password-error"
                  onChange={event => setPassword(event.target.value)} />
                <button type="button" disabled={busy} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={showPassword}
                  onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </span></label>
              <p id="reset-password-policy" className="auth-field-hint">{HANZI_PASSWORD_MIN_LENGTH}–128 ký tự, có chữ thường a–z và số 0–9.</p>
              <label className="auth-field"><span>Nhập lại mật khẩu mới</span><input ref={confirmationInput} className="auth-input" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required maxLength={256}
                value={confirmation} disabled={busy} aria-invalid={fieldError === 'confirmation'} aria-describedby="reset-password-error" onChange={event => setConfirmation(event.target.value)} /></label>
            </div>
            <p id="reset-password-error" className={error ? 'auth-status auth-status-error' : 'auth-action-empty-error'} role="alert">{error}</p>
            </div>
            <div className="auth-action-footer">
            <button className="auth-button auth-wide-button" type="submit" disabled={busy || !password || !confirmation}>{busy ? 'Đang đổi mật khẩu…' : 'Lưu mật khẩu mới'}</button>
            <p className="auth-field-hint auth-action-note">Sau khi đổi, hãy đăng nhập lại trên các thiết bị của bạn.</p>
            </div>
          </form>}
          {stage === 'ready' && emailAction && <div className="auth-email-action" aria-busy={busy}><div className="auth-action-fields"><p className="auth-copy">Xác nhận email của bạn cho tài khoản HANZI.OS. Tiến độ học được giữ nguyên.</p>{error && <p className="auth-status auth-status-error" role="alert">{error}</p>}</div><div className="auth-action-footer"><button className="auth-button auth-wide-button" disabled={busy} type="button" onClick={() => void submit()}>{busy ? 'Đang xác minh…' : 'Xác minh email'}</button></div></div>}
          {stage === 'completed' && <><p className="auth-copy auth-action-success" role="status"><ShieldCheck size={24} aria-hidden="true" />{emailAction ? 'Email của bạn đã được xác minh. Hãy quay lại ứng dụng để tiếp tục học.' : 'Mật khẩu mới đã được lưu. Hãy đăng nhập lại để tiếp tục Thiên Lộ.'}</p><a className="auth-button auth-wide-button" href={emailAction ? '/account/security' : '/signin'}>{emailAction ? 'Bảo mật tài khoản' : 'Đăng nhập lại'}</a></>}
          {stage === 'invalid' && <><p className="auth-copy">{emailAction ? 'Liên kết có thể đã hết hạn hoặc đã dùng. Đăng nhập rồi kiểm tra trạng thái email hoặc xin thư mới trong Bảo mật tài khoản.' : 'Liên kết có thể đã hết hạn hoặc đã được dùng. Nếu bạn vừa đổi mật khẩu, hãy đăng nhập bằng mật khẩu mới.'}</p>{emailAction ? <a className="auth-button auth-wide-button" href="/account/security">Kiểm tra email tài khoản</a> : <button className="auth-button auth-wide-button" type="button" onClick={requestNew}>Yêu cầu liên kết mới</button>}</>}
          {stage === 'unavailable' && <><p className="auth-status auth-status-error" role="alert">{error}</p><button className="auth-button auth-wide-button" type="button" onClick={() => setAttempt(value => value + 1)}>Kiểm tra lại liên kết</button></>}
          {stage === 'request' && <HanziPasswordReset onBack={() => window.location.assign('/signin')} />}
          {(stage === 'ready' || stage === 'invalid' || stage === 'unavailable') && <a className="auth-action-back" href="/signin">Quay lại đăng nhập</a>}
        </div>
      </section>
    </div>
  </main>;
}

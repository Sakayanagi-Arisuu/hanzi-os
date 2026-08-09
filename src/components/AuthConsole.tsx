"use client";

import {
  ArrowRight,
  Chrome,
  Eye,
  EyeOff,
  ShieldCheck,
  UserRoundPlus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import "./AuthConsole.css";

type PasskeyOperation = "register" | "signin" | "unlink";
type AuthFeedback = {
  message: string;
  tone: "error" | "info" | "success";
};

const HANZI_PASSWORD_MIN_LENGTH = 12;
const hanziPasswordMeetsPolicy = (password: string) =>
  [...password].length >= HANZI_PASSWORD_MIN_LENGTH
  && /\p{L}/u.test(password)
  && /\p{N}/u.test(password);

type SecurityPayload = {
  account: { displayName: string; email: string };
  identities: Array<{
    id: string;
    provider: string;
    email: string | null;
    emailVerified: boolean;
    createdAt: number;
  }>;
  sessions: Array<{
    id: string;
    authMethod: string;
    deviceLabel: string | null;
    authenticatedAt: number;
    lastSeenAt: number;
    expiresAt: number;
    current: boolean;
  }>;
};

const identityProviderLabel: Record<string, string> = {
  hanzi: "Tài khoản HANZI.OS",
  google: "Google",
  facebook: "Facebook",
  email_otp: "Email một lần",
  passkey: "Passkey",
  chatgpt: "ChatGPT (tương thích)",
};

const identityVerificationLabel = (
  identity: SecurityPayload["identities"][number],
) => {
  if (!identity.email) {
    return identity.provider === "passkey"
      ? "không dùng email"
      : "nhà cung cấp không chia sẻ email";
  }
  if (identity.emailVerified) return "email đã xác minh";
  if (identity.provider === "facebook") {
    return "email nhà cung cấp · chưa dùng để gộp tài khoản";
  }
  return "email chưa xác minh";
};

function Feedback({ feedback }: { feedback: AuthFeedback | null }) {
  if (!feedback) return null;
  return (
    <div
      role={feedback.tone === "error" ? "alert" : "status"}
      className={`auth-status auth-status-${feedback.tone}`}
    >
      <ShieldCheck size={16} /> {feedback.message}
    </div>
  );
}

const decodeBase64Url = (value: string) => {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const encodeBase64Url = (value: ArrayBuffer) => {
  let binary = "";
  for (const byte of new Uint8Array(value)) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
};

const credentialJson = (credential: PublicKeyCredential) => {
  const response = credential.response;
  if (response instanceof AuthenticatorAttestationResponse) {
    return {
      id: credential.id,
      rawId: encodeBase64Url(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: encodeBase64Url(response.clientDataJSON),
        attestationObject: encodeBase64Url(response.attestationObject),
        transports: response.getTransports?.() ?? [],
      },
    };
  }
  const assertion = response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: encodeBase64Url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: encodeBase64Url(assertion.clientDataJSON),
      authenticatorData: encodeBase64Url(assertion.authenticatorData),
      signature: encodeBase64Url(assertion.signature),
      userHandle: assertion.userHandle ? encodeBase64Url(assertion.userHandle) : null,
    },
  };
};

async function parseError(response: Response, fallback: string) {
  try {
    const body = await response.json() as { error?: { message?: string } };
    return body.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

export function AuthConsole({
  mode,
  returnTo = "/",
  localDevelopment = false,
  googleAvailable = true,
  facebookAvailable = false,
}: {
  mode: "signin" | "security";
  returnTo?: string;
  localDevelopment?: boolean;
  googleAvailable?: boolean;
  facebookAvailable?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authView, setAuthView] = useState<"signin" | "register">("signin");
  const [demoAccounts, setDemoAccounts] = useState<Array<{
    username: string;
    email: string;
    password: string;
    displayName: string;
    roles: string[];
    landingPath: string;
  }>>([]);
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<string | null>(null);
  const [emailMode, setEmailMode] = useState<"signin" | "link" | "unlink">(
    mode === "signin" ? "signin" : "link",
  );
  const [feedback, setFeedback] = useState<AuthFeedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [security, setSecurity] = useState<SecurityPayload | null>(null);

  const loadSecurity = async () => {
    const response = await fetch("/api/account/security", { cache: "no-store" });
    if (!response.ok) throw new Error(await parseError(response, "Không thể tải bảo mật tài khoản."));
    setSecurity(await response.json() as SecurityPayload);
  };

  useEffect(() => {
    if (mode !== "security") return;
    loadSecurity().catch((error: unknown) => {
      setFeedback({
        tone: "error",
        message: error instanceof Error
          ? error.message
          : "Không thể tải bảo mật tài khoản.",
      });
    });
  }, [mode]);

  useEffect(() => {
    if (mode !== "signin" || !localDevelopment) return;
    fetch("/api/auth/hanzi/demo-accounts", {
      method: "POST",
      headers: { "content-type": "application/json" },
    }).then(async (response) => {
      if (!response.ok) throw new Error(await parseError(response, "Không thể chuẩn bị tài khoản thử."));
      return response.json() as Promise<{ accounts: typeof demoAccounts }>;
    }).then((body) => setDemoAccounts(body.accounts)).catch((error: unknown) => {
      setFeedback({
        tone: "error",
        message: error instanceof Error
          ? error.message
          : "Không thể chuẩn bị tài khoản thử.",
      });
    });
  }, [localDevelopment, mode]);

  const submitHanziAccount = async () => {
    if (busy) return;
    if (authView === "register" && password !== passwordConfirmation) {
      setFeedback({ tone: "error", message: "Hai lần nhập mật khẩu chưa khớp." });
      return;
    }
    if (authView === "register" && !hanziPasswordMeetsPolicy(password)) {
      setFeedback({
        tone: "error",
        message: "Mật khẩu cần ít nhất 12 ký tự, gồm tối thiểu một chữ và một số.",
      });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/auth/hanzi/${authView === "register" ? "register" : "login"}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(authView === "register"
          ? { username, email, displayName, password, returnTo }
          : { identifier: username, password, returnTo }),
      });
      if (!response.ok) throw new Error(await parseError(response, "Không thể xác minh tài khoản HANZI.OS."));
      const body = await response.json() as { returnTo?: string };
      window.location.assign(body.returnTo ?? returnTo);
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error
          ? error.message
          : "Không thể xác minh tài khoản HANZI.OS.",
      });
      setBusy(false);
    }
  };

  const signInDemoAccount = async (account: typeof demoAccounts[number]) => {
    setBusy(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/auth/hanzi/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          identifier: account.username,
          password: account.password,
          returnTo: account.landingPath,
        }),
      });
      if (!response.ok) throw new Error(await parseError(response, "Không thể mở tài khoản thử."));
      const body = await response.json() as { returnTo?: string };
      window.location.assign(body.returnTo ?? account.landingPath);
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Không thể mở tài khoản thử.",
      });
      setBusy(false);
    }
  };

  const requestEmailCode = async (nextMode = emailMode) => {
    setBusy(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/auth/email/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, mode: nextMode, returnTo: mode === "signin" ? returnTo : "/account/security" }),
      });
      if (!response.ok) throw new Error(await parseError(response, "Không thể gửi mã."));
      const body = await response.json() as { challenge: string; developmentCode?: string };
      setChallenge(body.challenge);
      if (body.developmentCode) {
        setCode(body.developmentCode);
        setFeedback({
          tone: "info",
          message: "Mã thử đã được điền sẵn. Chọn Xác minh để bước vào hệ thống.",
        });
      } else {
        setFeedback({
          tone: "success",
          message: "Mã sáu số đã được gửi và chỉ dùng được một lần trong 10 phút.",
        });
      }
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Không thể gửi mã.",
      });
    } finally {
      setBusy(false);
    }
  };

  const verifyEmailCode = async () => {
    if (!challenge) return;
    setBusy(true);
    try {
      const response = await fetch("/api/auth/email/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ challenge, code }),
      });
      if (!response.ok) throw new Error(await parseError(response, "Mã không hợp lệ."));
      const body = await response.json() as { returnTo?: string };
      window.location.assign(body.returnTo ?? (mode === "signin" ? returnTo : "/account/security"));
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Mã không hợp lệ.",
      });
      setBusy(false);
    }
  };

  const runPasskey = async (operation: PasskeyOperation) => {
    if (!("credentials" in navigator) || !("PublicKeyCredential" in window)) {
      setFeedback({ tone: "error", message: "Trình duyệt này chưa hỗ trợ passkey." });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const optionsResponse = await fetch("/api/auth/passkey/options", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operation, returnTo: mode === "signin" ? returnTo : "/account/security" }),
      });
      if (!optionsResponse.ok) {
        throw new Error(await parseError(optionsResponse, "Không thể bắt đầu passkey."));
      }
      const body = await optionsResponse.json() as {
        challenge: string;
        options: Record<string, unknown> & {
          challenge: string;
          user?: { id: string };
          excludeCredentials?: Array<{ id: string }>;
          allowCredentials?: Array<{ id: string }>;
        };
      };
      const publicKey = {
        ...body.options,
        challenge: decodeBase64Url(body.options.challenge),
        ...(body.options.user
          ? { user: { ...body.options.user, id: decodeBase64Url(body.options.user.id) } }
          : {}),
        ...(body.options.excludeCredentials
          ? { excludeCredentials: body.options.excludeCredentials.map((item) => ({ ...item, id: decodeBase64Url(item.id) })) }
          : {}),
        ...(body.options.allowCredentials
          ? { allowCredentials: body.options.allowCredentials.map((item) => ({ ...item, id: decodeBase64Url(item.id) })) }
          : {}),
      };
      const credential = operation === "register"
        ? await navigator.credentials.create({ publicKey: publicKey as unknown as PublicKeyCredentialCreationOptions })
        : await navigator.credentials.get({ publicKey: publicKey as unknown as PublicKeyCredentialRequestOptions });
      if (!(credential instanceof PublicKeyCredential)) throw new Error("Passkey đã bị hủy.");
      const verifyResponse = await fetch("/api/auth/passkey/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operation, challenge: body.challenge, credential: credentialJson(credential) }),
      });
      if (!verifyResponse.ok) throw new Error(await parseError(verifyResponse, "Passkey không hợp lệ."));
      const verified = await verifyResponse.json() as { returnTo?: string };
      window.location.assign(verified.returnTo ?? (mode === "signin" ? returnTo : "/account/security"));
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Passkey không hoàn tất.",
      });
      setBusy(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    setBusy(true);
    try {
      const response = await fetch("/api/account/security", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!response.ok) throw new Error(await parseError(response, "Không thể thu hồi phiên."));
      await loadSecurity();
      setFeedback({ tone: "success", message: "Phiên đã được thu hồi." });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Không thể thu hồi phiên.",
      });
    } finally {
      setBusy(false);
    }
  };

  if (mode === "signin") {
    return (
      <div className="auth-stack auth-signin-stack">
        <div className="auth-mode-tabs" role="group" aria-label="Đăng nhập hoặc đăng ký">
          <button type="button" aria-pressed={authView === "signin"} onClick={() => { setAuthView("signin"); setFeedback(null); }}>
            Đăng nhập
          </button>
          <button type="button" aria-pressed={authView === "register"} onClick={() => { setAuthView("register"); setFeedback(null); }}>
            Tạo tài khoản
          </button>
        </div>

        <form
          className="auth-card auth-hanzi-card"
          onSubmit={(event) => {
            event.preventDefault();
            void submitHanziAccount();
          }}
        >
          <div className="auth-card-heading">
            <span className="auth-method-icon">汉</span>
            <div>
              <span className="auth-method-state"><i /> HANZI.OS IDENTITY</span>
              <h3 className="auth-title">{authView === "signin" ? "Tài khoản HANZI.OS" : "Đăng ký HANZI.OS"}</h3>
            </div>
          </div>
          <p className="auth-copy">{authView === "signin" ? "Dùng tên tài khoản hoặc email cùng mật khẩu HANZI.OS." : "Tài khoản mới mặc định là Hành Giả; quyền biên tập và quản trị không thể tự đăng ký."}</p>
          <div className="auth-form-grid">
            {authView === "register" && (
              <label className="auth-field">
                <span>Tên hiển thị</span>
                <input className="auth-input" autoComplete="name" required value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Tên bạn muốn thấy" />
              </label>
            )}
            <label className="auth-field">
              <span>{authView === "signin" ? "Tên tài khoản hoặc email" : "Tên tài khoản"}</span>
              <input className="auth-input" autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} placeholder="vi-du: hanzi.nguyen" />
            </label>
            {authView === "register" && (
              <label className="auth-field">
                <span>Email</span>
                <input className="auth-input" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ban@example.com" />
              </label>
            )}
            <label className="auth-field">
              <span>Mật khẩu</span>
              <span className="auth-password-field">
                <input
                  className="auth-input"
                  type={showPassword ? "text" : "password"}
                  autoComplete={authView === "register" ? "new-password" : "current-password"}
                  required
                  minLength={authView === "register" ? HANZI_PASSWORD_MIN_LENGTH : undefined}
                  maxLength={128}
                  aria-describedby={authView === "register" ? "hanzi-password-policy" : undefined}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={authView === "register" ? "Tối thiểu 12 ký tự" : "Mật khẩu HANZI.OS"}
                />
                <button type="button" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </span>
            </label>
            {authView === "register" && (
              <label className="auth-field">
                <span>Nhập lại mật khẩu</span>
                <input className="auth-input" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={HANZI_PASSWORD_MIN_LENGTH} maxLength={128} value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} placeholder="Nhập lại để xác nhận" />
              </label>
            )}
            {authView === "register" && (
              <p id="hanzi-password-policy" className="auth-field-hint">Tên tài khoản dùng 3–32 ký tự a–z, số, dấu chấm, gạch dưới hoặc gạch ngang. Mật khẩu có ít nhất 12 ký tự, gồm tối thiểu một chữ và một số.</p>
            )}
          </div>
          <button
            className="auth-button auth-wide-button"
            type="submit"
            disabled={busy || !username.trim() || (authView === "signin" ? password.length < 1 : !hanziPasswordMeetsPolicy(password)) || (authView === "register" && (!displayName.trim() || !email.trim() || !passwordConfirmation))}
          >
            {busy ? "Đang xác minh..." : authView === "register" ? "Tạo danh tính HANZI.OS" : "Đăng nhập HANZI.OS"}
            {authView === "register" ? <UserRoundPlus size={17} /> : <ArrowRight size={17} />}
          </button>
          <Feedback feedback={feedback} />
        </form>

        <div className="auth-divider"><span>hoặc dùng nhà cung cấp</span></div>
        <section className="auth-provider-grid auth-provider-grid-two" aria-label="Google và Facebook">
          {googleAvailable ? (
              <a className="auth-provider" href={`/auth/google/start?mode=signin&returnTo=${encodeURIComponent(returnTo)}`}>
                <Chrome size={19} /><span><strong>Google</strong><small>Tiếp tục qua tài khoản Google</small></span><ArrowRight size={16} />
              </a>
          ) : (
              <button className="auth-provider" type="button" disabled>
                <Chrome size={19} /><span><strong>Google</strong><small>Sẵn sàng cấu hình khi public web</small></span><ShieldCheck size={16} />
              </button>
          )}
          {facebookAvailable ? (
              <a className="auth-provider" href={`/auth/facebook/start?mode=signin&returnTo=${encodeURIComponent(returnTo)}`}>
                <Users size={19} /><span><strong>Facebook</strong><small>Tiếp tục qua tài khoản Facebook</small></span><ArrowRight size={16} />
              </a>
          ) : (
              <button className="auth-provider" type="button" disabled>
                <Users size={19} /><span><strong>Facebook</strong><small>Sẵn sàng cấu hình khi public web</small></span><ShieldCheck size={16} />
              </button>
          )}
        </section>

        {localDevelopment && demoAccounts.length > 0 && (
          <section className="auth-demo-accounts">
            <header><span>LOCAL ROLE LAB</span><strong>Tài khoản thử theo vai trò</strong><small>Chỉ tồn tại trên localhost; không được tạo ở bản public.</small></header>
            <div>
              {demoAccounts.map((account) => (
                <button key={account.username} type="button" disabled={busy} onClick={() => void signInDemoAccount(account)}>
                  <span><strong>{account.displayName}</strong><small>{account.roles.join(" + ")} · {account.username}</small></span>
                  <code>{account.password}</code>
                  <ArrowRight size={16} />
                </button>
              ))}
            </div>
          </section>
        )}
        <a className="auth-guest-link" href="/">Tiếp tục học trên thiết bị này <ArrowRight size={16} /></a>
      </div>
    );
  }

  return (
    <div className="auth-stack">
      <section className="auth-card">
        <h2 className="auth-title">Phương thức đăng nhập</h2>
        <p className="auth-copy">Các phương thức chỉ được nối sau khi phiên hiện tại và nhà cung cấp mới đều xác minh. Email giống nhau không tự gộp tài khoản.</p>
        {security?.identities.map((identity) => (
          <div key={identity.id} className="auth-item">
            <div>
              <strong>{identityProviderLabel[identity.provider] ?? "Phương thức tương thích"}</strong>
              <small className="auth-meta">
                {identity.email
                  ?? (identity.provider === "passkey"
                    ? "Khóa công khai trên thiết bị"
                    : "Không có email từ nhà cung cấp")}
                {" · "}{new Date(identity.createdAt).toLocaleDateString("vi-VN")}
              </small>
            </div>
            <span className="auth-meta">{identityVerificationLabel(identity)}</span>
          </div>
        ))}
        <div className="auth-row auth-actions">
          <a className="auth-link" href="/auth/google/start?mode=link&returnTo=%2Faccount%2Fsecurity">Liên kết Google</a>
          {security?.identities.some((identity) => identity.provider === "google") && <a className="auth-link" href="/auth/google/start?mode=unlink&returnTo=%2Faccount%2Fsecurity">Gỡ Google sau xác minh</a>}
          <button className="auth-secondary" type="button" disabled={busy} onClick={() => runPasskey("register")}>Thêm passkey</button>
          {security?.identities.some((identity) => identity.provider === "passkey") && <button className="auth-secondary" type="button" disabled={busy} onClick={() => runPasskey("unlink")}>Xóa passkey đã xác minh</button>}
        </div>
      </section>
      <section className="auth-card">
        <h2 className="auth-title">Liên kết email</h2>
        <div className="auth-row">
          <input className="auth-input" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ban@example.com" />
          <select className="auth-input" value={emailMode} onChange={(event) => setEmailMode(event.target.value as typeof emailMode)}><option value="link">Liên kết</option><option value="unlink">Gỡ sau khi xác minh</option></select>
          <button className="auth-button" type="button" disabled={busy} onClick={() => requestEmailCode()}>Gửi mã</button>
        </div>
        {challenge && <div className="auth-row auth-row-spaced"><input className="auth-input" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/gu, "").slice(0, 6))} placeholder="000000" /><button className="auth-button" type="button" disabled={busy || code.length !== 6} onClick={verifyEmailCode}>Xác minh thay đổi</button></div>}
      </section>
      <section className="auth-card">
        <h2 className="auth-title">Phiên và thiết bị</h2>
        <p className="auth-copy">Thu hồi một phiên sẽ chặn cookie đó ngay trên máy chủ. Tiến độ local trên thiết bị không bị xóa.</p>
        {security?.sessions.map((session) => (
          <div key={session.id} className="auth-item">
            <div><strong>{session.deviceLabel ?? session.authMethod}{session.current ? " · phiên hiện tại" : ""}</strong><small className="auth-meta">Hoạt động {new Date(session.lastSeenAt).toLocaleString("vi-VN")} · hết hạn {new Date(session.expiresAt).toLocaleDateString("vi-VN")}</small></div>
            <button className="auth-secondary" type="button" disabled={busy} onClick={() => revokeSession(session.id)}>Thu hồi</button>
          </div>
        ))}
      </section>
      <Feedback feedback={feedback} />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

type PasskeyOperation = "register" | "signin" | "unlink";

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
  chatGPTSignIn,
}: {
  mode: "signin" | "security";
  chatGPTSignIn?: string;
}) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<string | null>(null);
  const [emailMode, setEmailMode] = useState<"signin" | "link" | "unlink">(
    mode === "signin" ? "signin" : "link",
  );
  const [status, setStatus] = useState<string | null>(null);
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
      setStatus(error instanceof Error ? error.message : "Không thể tải bảo mật tài khoản.");
    });
  }, [mode]);

  const requestEmailCode = async (nextMode = emailMode) => {
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch("/api/auth/email/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, mode: nextMode, returnTo: mode === "signin" ? "/" : "/account/security" }),
      });
      if (!response.ok) throw new Error(await parseError(response, "Không thể gửi mã."));
      const body = await response.json() as { challenge: string; developmentCode?: string };
      setChallenge(body.challenge);
      if (body.developmentCode) setCode(body.developmentCode);
      setStatus("Mã sáu số đã được gửi và chỉ dùng được một lần trong 10 phút.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Không thể gửi mã.");
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
      window.location.assign(body.returnTo ?? (mode === "signin" ? "/" : "/account/security"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Mã không hợp lệ.");
      setBusy(false);
    }
  };

  const runPasskey = async (operation: PasskeyOperation) => {
    if (!("credentials" in navigator) || !("PublicKeyCredential" in window)) {
      setStatus("Trình duyệt này chưa hỗ trợ passkey.");
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const optionsResponse = await fetch("/api/auth/passkey/options", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operation }),
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
      window.location.assign(verified.returnTo ?? (mode === "signin" ? "/" : "/account/security"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Passkey không hoàn tất.");
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
      setStatus("Phiên đã được thu hồi.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Không thể thu hồi phiên.");
    } finally {
      setBusy(false);
    }
  };

  if (mode === "signin") {
    return (
      <div className="auth-stack">
        <section className="auth-card">
          <h2 className="auth-title">Tiếp tục bằng tài khoản</h2>
          <p className="auth-copy">Chọn Google, mã email hoặc passkey. Tiến độ ẩn danh trên thiết bị sẽ được hòa giải qua hàng đợi local-first sau khi đăng nhập.</p>
          <div className="auth-row">
            <a className="auth-link" href="/auth/google/start?mode=signin&returnTo=%2F">Google</a>
            <button className="auth-secondary" type="button" disabled={busy} onClick={() => runPasskey("signin")}>Dùng passkey</button>
            {chatGPTSignIn && <a className="auth-link" href={chatGPTSignIn}>ChatGPT (tương thích)</a>}
          </div>
        </section>
        <section className="auth-card">
          <h2 className="auth-title">Mã một lần qua email</h2>
          <p className="auth-copy">Không cần mật khẩu. Mã chỉ dùng một lần và hết hạn sau 10 phút.</p>
          <div className="auth-row">
            <input className="auth-input" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ban@example.com" />
            <button className="auth-button" type="button" disabled={busy} onClick={() => requestEmailCode("signin")}>Gửi mã</button>
          </div>
          {challenge && <div className="auth-row auth-row-spaced"><input className="auth-input" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/gu, "").slice(0, 6))} placeholder="000000" /><button className="auth-button" type="button" disabled={busy || code.length !== 6} onClick={verifyEmailCode}>Xác minh</button></div>}
        </section>
        {status && <div role="status" className="auth-status">{status}</div>}
        <a className="auth-link" href="/">Tiếp tục học ẩn danh trên thiết bị</a>
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
            <div><strong>{identity.provider === "email_otp" ? "Email một lần" : identity.provider === "passkey" ? "Passkey" : identity.provider === "google" ? "Google" : "ChatGPT"}</strong><small className="auth-meta">{identity.email ?? "Khóa công khai trên thiết bị"} · {new Date(identity.createdAt).toLocaleDateString("vi-VN")}</small></div>
            <span className="auth-meta">{identity.emailVerified ? "đã xác minh" : "không dùng email"}</span>
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
      {status && <div role="status" className="auth-status">{status}</div>}
    </div>
  );
}

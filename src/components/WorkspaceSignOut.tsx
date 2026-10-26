"use client";

import { LogOut } from "lucide-react";
import { useRef, useState } from "react";
import { signedOutDestination } from "../lib/authNavigation";
import type { FirstPartyAuthProvider } from "../server/authRepository";

export function WorkspaceSignOut() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signOut = async () => {
    if (lock.current) return;
    // Respect the editors' existing unsaved-change guards before revoking a session.
    if (!window.dispatchEvent(new Event("beforeunload", { cancelable: true }))) {
      setError("Bạn có thay đổi chưa lưu. Hãy lưu bản nháp trước khi đăng xuất.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const sessionResponse = await fetch("/api/session", { cache: "no-store" });
      if (!sessionResponse.ok) throw new Error();
      const session = await sessionResponse.json() as {
        authenticated: boolean;
        user?: { provider?: FirstPartyAuthProvider };
      };
      const response = await fetch("/api/auth/signout", { method: "POST" });
      if (!response.ok || (await response.json()).signedOut !== true) throw new Error();
      // Keep local progress and owner-scoped outboxes intact. The learner runtime
      // reconciles its identity when next opened.
      window.location.assign(session.authenticated
        ? signedOutDestination(session.user?.provider)
        : "/signin");
    } catch {
      setError("Chưa thể đăng xuất. Hãy kiểm tra kết nối và thử lại.");
      lock.current = false;
      setBusy(false);
    }
  };
  return <div className="tv-signout">
    <button type="button" onClick={signOut} disabled={busy} aria-busy={busy}>
      <LogOut size={18} aria-hidden="true" />{busy ? "Đang đăng xuất…" : "Đăng xuất"}
    </button>
    {error && <p role="alert">{error}</p>}
  </div>;
}

import { headers } from "next/headers";
import { AuthConsole } from "../../src/components/AuthConsole";
import { chatGPTSignInPath } from "../../src/lib/chatgptAuthPaths";
import {
  type AuthRuntimeEnvironment,
  isLocalDevelopmentAuth,
} from "../../src/server/authHttp";
import { getRuntimeEnvironment } from "../../src/server/d1";

export const dynamic = "force-dynamic";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string; returnTo?: string; stepUp?: string }> }) {
  const query = await searchParams;
  const requestHeaders = await headers();
  const host = (requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000")
    .split(",")[0]!
    .trim();
  const protocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim()
    ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  let environment: AuthRuntimeEnvironment = {};
  try {
    environment = await getRuntimeEnvironment<AuthRuntimeEnvironment>();
  } catch {
    // The sign-in page stays useful even outside the Cloudflare local runtime.
  }
  const localDevelopment = isLocalDevelopmentAuth(
    `${origin}/signin`,
    environment.AUTH_DEV_EMAIL_OTP,
  );
  const googleAvailable = Boolean(
    environment.GOOGLE_CLIENT_ID?.trim()
    && environment.GOOGLE_REDIRECT_URI?.trim() === `${origin}/auth/google/callback`,
  );
  const chatGPTAvailable = new URL(origin).hostname.endsWith(".chatgpt.site");
  const returnTo = query.returnTo?.startsWith("/") && !query.returnTo.startsWith("//")
    ? query.returnTo.slice(0, 500)
    : "/";
  return (
    <main className="signin-page">
      <div className="signin-grid" aria-hidden="true" />
      <div className="signin-glyphs" aria-hidden="true"><span>觉</span><span>学</span><span>忆</span></div>
      <nav className="signin-nav">
        <a href="/" aria-label="Trở về HANZI.OS"><span className="signin-mark">汉</span><strong>HANZI.OS</strong></a>
        <span>IDENTITY GATE // 01</span>
      </nav>
      <div className="signin-shell">
        <section className="signin-intro">
          <div className="signin-orbit" aria-hidden="true"><i /><b /><span>觉</span></div>
          <span className="signin-kicker">CỔNG ĐỒNG BỘ HÀNH TRÌNH</span>
          <h1>Đánh thức<br /><em>danh tính học tập.</em></h1>
          <p>Đăng nhập để giữ tiến độ khi đổi thiết bị và mở Đại Khảo. Bạn vẫn có thể học trên máy này mà không cần tài khoản.</p>
          <div className="signin-trust-list">
            <span><strong>01</strong> Không cần hosting để thử đăng nhập local</span>
            <span><strong>02</strong> Không dùng mật khẩu</span>
            <span><strong>03</strong> Tiến độ trên máy được giữ nguyên</span>
          </div>
        </section>
        <section className="signin-console">
          <header>
            <span>AWAKENING PROTOCOL</span>
            <h2>Xác nhận danh tính</h2>
            <p>{localDevelopment ? "Mã thử sẽ được điền sẵn trên localhost." : "Chọn một cổng đang khả dụng để tiếp tục."}</p>
          </header>
          {query.error && <p className="signin-alert" role="alert">Cổng vừa chọn chưa sẵn sàng. Hãy dùng mã email hoặc thử lại sau.</p>}
          <AuthConsole
            mode="signin"
            returnTo={returnTo}
            localDevelopment={localDevelopment}
            googleAvailable={googleAvailable}
            chatGPTSignIn={query.stepUp === "1" || !chatGPTAvailable ? undefined : chatGPTSignInPath(returnTo)}
          />
        </section>
      </div>
    </main>
  );
}

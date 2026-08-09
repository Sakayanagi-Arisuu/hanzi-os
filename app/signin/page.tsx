import { headers } from "next/headers";
import { AuthConsole } from "../../src/components/AuthConsole";
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
    environment.AUTH_DEV_HANZI_DEMOS,
  );
  const googleAvailable = Boolean(
    environment.GOOGLE_CLIENT_ID?.trim()
    && environment.GOOGLE_REDIRECT_URI?.trim() === `${origin}/auth/google/callback`,
  );
  const facebookGraphVersion = environment.FACEBOOK_GRAPH_VERSION?.trim() ?? "";
  const facebookAvailable = Boolean(
    environment.FACEBOOK_CLIENT_ID?.trim()
    && environment.FACEBOOK_CLIENT_SECRET?.trim()
    && /^v\d{1,3}\.\d{1,2}$/u.test(facebookGraphVersion)
    && environment.FACEBOOK_REDIRECT_URI?.trim()
      === `${origin}/auth/facebook/callback`,
  );
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
          <span className="signin-kicker">CỔNG DANH TÍNH · BA PHƯƠNG THỨC</span>
          <h1>Đánh thức<br /><em>danh tính học tập.</em></h1>
          <p>Tạo tài khoản HANZI.OS hoặc tiếp tục bằng Google/Facebook khi bản public được cấu hình. Tiến độ local trên máy này vẫn được giữ nguyên.</p>
          <div className="signin-trust-list">
            <span><strong>01</strong> HANZI.OS dùng được ngay trên localhost</span>
            <span><strong>02</strong> Mật khẩu chỉ lưu dưới dạng băm có salt</span>
            <span><strong>03</strong> Ba vai trò có tài khoản thử riêng</span>
          </div>
        </section>
        <section className="signin-console">
          <header>
            <span>AWAKENING PROTOCOL</span>
            <h2>Xác nhận danh tính</h2>
            <p>{localDevelopment ? "Chọn nhanh Hành Giả, Quản Khố hoặc Điều Hành ở cuối bảng." : "Đăng nhập hoặc tạo một danh tính HANZI.OS mới."}</p>
          </header>
          {query.error && <p className="signin-alert" role="alert">Cổng vừa chọn chưa sẵn sàng. Hãy dùng tài khoản HANZI.OS hoặc thử lại sau.</p>}
          <AuthConsole
            mode="signin"
            returnTo={returnTo}
            localDevelopment={localDevelopment}
            googleAvailable={googleAvailable}
            facebookAvailable={facebookAvailable}
          />
        </section>
      </div>
    </main>
  );
}

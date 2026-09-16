import { headers } from "next/headers";
import { AuthConsole } from "../../src/components/AuthConsole";
import {
  type AuthRuntimeEnvironment,
  isLocalDevelopmentAuth,
} from "../../src/server/authHttp";
import { getRuntimeEnvironment } from "../../src/server/d1";
import "../../src/components/AuthGuild.css";
import "../../src/components/GuildTypography.css";

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
    <main className="signin-page auth-guild">
      <div className="signin-grid" aria-hidden="true" />
      <div className="signin-glyphs" aria-hidden="true"><span>觉</span><span>学</span><span>忆</span></div>
      <nav className="signin-nav">
        <a href="/welcome" aria-label="Trở về HANZI.OS"><span className="signin-mark">汉</span><strong>HANZI.OS</strong></a>
        <a href="/welcome">← Quay lại trang giới thiệu</a>
      </nav>
      <div className="signin-shell">
        <section className="signin-intro">
          <div className="auth-banner-copy"><strong lang="zh-Hans">汉<br />字</strong><span>VĂN HOÁ<br />KẾT NỐI<br />CON NGƯỜI</span></div><p className="auth-art-motto">TRI THỨC<br />VƯỢT THỜI GIAN<br />KẾT NỐI<br />MUÔN PHƯƠNG</p><p className="auth-art-footnote">HỌC CHỮ<br />HIỂU NGƯỜI<br />KIẾN TẠO TƯƠNG LAI</p>
        </section>
        <section className="signin-console">
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

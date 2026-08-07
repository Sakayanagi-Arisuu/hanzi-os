import type { CSSProperties } from "react";
import { AuthConsole } from "../../src/components/AuthConsole";
import { chatGPTSignInPath } from "../../src/lib/chatgptAuthPaths";

export const dynamic = "force-dynamic";

const page: CSSProperties = { minHeight: "100vh", padding: "clamp(20px,5vw,64px)", color: "#dcebe7", background: "radial-gradient(circle at 20% 0,#123d32 0,transparent 32%),#020907", fontFamily: "Inter,system-ui,sans-serif" };
const shell: CSSProperties = { width: "min(760px,100%)", margin: "0 auto" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  return (
    <main style={page}>
      <div style={shell}>
        <a href="/" style={{ color: "#91aaa3", textDecoration: "none", fontSize: 12 }}>← HANZI.OS</a>
        <header style={{ padding: "42px 0 28px" }}>
          <span style={{ color: "#61f2c0", fontFamily: "ui-monospace,monospace", fontSize: 11, letterSpacing: ".16em" }}>IDENTITY GATE · LOCAL FIRST</span>
          <h1 style={{ margin: "12px 0 10px", fontSize: "clamp(38px,8vw,68px)", letterSpacing: "-.05em" }}>Đăng nhập</h1>
          <p style={{ maxWidth: 650, color: "#91aaa3", lineHeight: 1.7 }}>Học ẩn danh vẫn hoạt động đầy đủ trên thiết bị. Đăng nhập chỉ thêm phục hồi đa thiết bị và quản lý tài khoản.</p>
          {query.error && <p role="alert" style={{ padding: 12, border: "1px solid #75473e", color: "#ffb8aa", background: "#21100d" }}>Phiên xác minh chưa hoàn tất. Hãy thử lại phương thức bạn chọn.</p>}
        </header>
        <AuthConsole mode="signin" chatGPTSignIn={chatGPTSignInPath("/")} />
      </div>
    </main>
  );
}

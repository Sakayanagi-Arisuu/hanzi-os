import type { CSSProperties } from "react";
import { AuthConsole } from "../../../src/components/AuthConsole";
import { getAuthenticatedUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

const page: CSSProperties = { minHeight: "100vh", padding: "clamp(20px,5vw,64px)", color: "#dcebe7", background: "radial-gradient(circle at 80% 0,#123d32 0,transparent 34%),#020907", fontFamily: "Inter,system-ui,sans-serif" };
const shell: CSSProperties = { width: "min(900px,100%)", margin: "0 auto" };

export default async function AccountSecurityPage() {
  const identity = await getAuthenticatedUser();
  if (!identity) {
    return <main style={page}><div style={shell}><h1>Bảo mật tài khoản</h1><p>Hãy đăng nhập để quản lý phương thức và phiên.</p><a href="/signin" style={{ color: "#61f2c0" }}>Mở đăng nhập</a></div></main>;
  }
  return (
    <main style={page}>
      <div style={shell}>
        <nav style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><a href="/profile" style={{ color: "#91aaa3", textDecoration: "none", fontSize: 12 }}>← Bảng Thuộc Tính</a><a href="/" style={{ color: "#91aaa3", textDecoration: "none", fontSize: 12 }}>HANZI.OS</a></nav>
        <header style={{ padding: "38px 0 24px" }}><span style={{ color: "#61f2c0", fontFamily: "ui-monospace,monospace", fontSize: 11, letterSpacing: ".16em" }}>ACCOUNT SECURITY</span><h1 style={{ margin: "10px 0", fontSize: "clamp(34px,7vw,60px)", letterSpacing: "-.05em" }}>Bảo mật tài khoản</h1><p style={{ color: "#91aaa3", lineHeight: 1.7 }}>Quản lý danh tính đã xác minh, passkey và các phiên đang hoạt động mà không chạm vào dữ liệu học riêng.</p></header>
        <AuthConsole mode="security" />
      </div>
    </main>
  );
}

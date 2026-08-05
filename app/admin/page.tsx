import type { CSSProperties } from "react";
import { hasPermission } from "../../src/auth/authorization";
import {
  AuthorizationRepository,
  resolveAuthorizedAccount,
  type AdminUserSummary,
} from "../../src/server/authorizationRepository";
import { getD1Database } from "../../src/server/d1";
import { getChatGPTUser } from "../chatgpt-auth";
import { chatGPTSignInPath } from "../../src/lib/chatgptAuthPaths";

export const dynamic = "force-dynamic";

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "clamp(18px, 4vw, 54px)",
    color: "#dcebe7",
    background: "radial-gradient(circle at 78% 5%, #123d32 0, transparent 34%), #020907",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  shell: { width: "min(1040px, 100%)", margin: "0 auto" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 28 },
  brand: { color: "#61f2c0", fontFamily: "ui-monospace, monospace", fontSize: 13, letterSpacing: ".14em" },
  back: { color: "#9bbab1", textDecoration: "none", border: "1px solid #28493f", padding: "9px 12px", fontSize: 12 },
  hero: { padding: "clamp(24px, 5vw, 48px)", border: "1px solid #286553", background: "linear-gradient(120deg, rgba(6,28,23,.96), rgba(6,46,37,.76))", boxShadow: "inset 0 0 50px rgba(82,243,191,.04)" },
  eyebrow: { color: "#61f2c0", fontFamily: "ui-monospace, monospace", fontSize: 10, letterSpacing: ".16em" },
  title: { margin: "12px 0 8px", fontSize: "clamp(30px, 6vw, 56px)", letterSpacing: "-.04em" },
  copy: { maxWidth: 720, margin: 0, color: "#91aaa3", lineHeight: 1.7, fontSize: 13 },
  notice: { marginTop: 16, padding: 13, border: "1px solid #315b4e", color: "#9ec6bb", background: "#071612", fontSize: 12 },
  error: { marginTop: 16, padding: 13, border: "1px solid #7a4037", color: "#ffae9e", background: "#21100d", fontSize: 12 },
  list: { display: "grid", gap: 9, marginTop: 18 },
  card: { display: "grid", gridTemplateColumns: "minmax(180px,1fr) auto auto", alignItems: "center", gap: 14, padding: 15, border: "1px solid #1d4439", background: "rgba(3,18,15,.92)" },
  email: { display: "block", overflowWrap: "anywhere", fontSize: 13 },
  meta: { display: "block", marginTop: 5, color: "#68857d", fontFamily: "ui-monospace, monospace", fontSize: 9 },
  role: { padding: "6px 8px", border: "1px solid #33705e", color: "#61f2c0", fontFamily: "ui-monospace, monospace", fontSize: 9 },
  roleAdmin: { padding: "6px 8px", border: "1px solid #75602e", color: "#f3c969", fontFamily: "ui-monospace, monospace", fontSize: 9 },
  button: { minHeight: 38, padding: "0 12px", border: "1px solid #34715f", color: "#61f2c0", background: "#0b211b", fontWeight: 700, fontSize: 10, cursor: "pointer" },
  disabled: { minHeight: 38, padding: "0 12px", border: "1px solid #303b37", color: "#61716c", background: "#101714", fontWeight: 700, fontSize: 10 },
  state: { minHeight: "70vh", display: "grid", placeItems: "center", textAlign: "center" },
  stateCard: { maxWidth: 620, padding: 36, border: "1px solid #315b4e", background: "#06130f" },
  action: { display: "inline-block", marginTop: 18, padding: "11px 16px", color: "#03100c", background: "#61f2c0", textDecoration: "none", fontWeight: 800, fontSize: 12 },
};

const roleCard = (user: AdminUserSummary, currentUserId: string) => {
  const admin = user.roles.includes("admin");
  const selfAdmin = admin && user.userId === currentUserId;
  return (
    <article key={user.userId} style={styles.card}>
      <div>
        <strong style={styles.email}>{user.email || "Tài khoản chưa có email hiển thị"}</strong>
        <small style={styles.meta}>{user.status} · khởi tạo {new Date(user.createdAt).toLocaleDateString("vi-VN")}</small>
      </div>
      <span style={admin ? styles.roleAdmin : styles.role}>{admin ? "QUẢN TRỊ" : "HÀNH GIẢ"}</span>
      <form action="/admin/roles" method="post">
        <input type="hidden" name="userId" value={user.userId} />
        <input type="hidden" name="admin" value={admin ? "false" : "true"} />
        <button
          type="submit"
          disabled={selfAdmin}
          title={selfAdmin ? "Không thể tự thu quyền quản trị" : undefined}
          style={selfAdmin ? styles.disabled : styles.button}
        >
          {admin ? "Thu quyền" : "Cấp quản trị"}
        </button>
      </form>
    </article>
  );
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  const identity = await getChatGPTUser();
  if (!identity) {
    return (
      <main style={styles.page}><section style={styles.state}><div style={styles.stateCard}>
        <span style={styles.eyebrow}>AUTHENTICATION REQUIRED</span>
        <h1>Cổng Quản Trị đang phong ấn</h1>
        <p style={styles.copy}>Đăng nhập bằng ChatGPT trước khi hệ thống kiểm tra vai trò ứng dụng.</p>
        <a style={styles.action} href={chatGPTSignInPath("/admin")}>Đăng nhập</a>
      </div></section></main>
    );
  }

  let account: Awaited<ReturnType<typeof resolveAuthorizedAccount>>;
  let users: AdminUserSummary[];
  try {
    const database = await getD1Database();
    account = await resolveAuthorizedAccount(database, identity);
    if (!hasPermission(account.authorization, "admin:users:read")) {
      return (
        <main style={styles.page}><section style={styles.state}><div style={styles.stateCard}>
          <span style={styles.eyebrow}>ACCESS DENIED · LEARNER ROLE</span>
          <h1>Không đủ quyền truy cập</h1>
          <p style={styles.copy}>Tài khoản đang là Hành Giả · Người học. API máy chủ cũng khóa thao tác quản trị.</p>
          <a style={styles.back} href="/profile">Trở về Bảng Thuộc Tính</a>
        </div></section></main>
      );
    }
    users = await new AuthorizationRepository(database).listUsers();
  } catch {
    return (
      <main style={styles.page}><section style={styles.state}><div style={styles.stateCard}>
        <span style={styles.eyebrow}>AUTHORIZATION BACKEND OFFLINE</span>
        <h1>Chưa thể mở Cổng Quản Trị</h1>
        <p style={styles.copy}>D1 hoặc migration phân quyền chưa sẵn sàng. Quyền quản trị được khóa an toàn thay vì suy đoán.</p>
        <a style={styles.back} href="/profile">Trở về Bảng Thuộc Tính</a>
      </div></section></main>
    );
  }

  const query = await searchParams;
  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        <nav style={styles.topbar}><strong style={styles.brand}>HANZI.OS · AUTHORITY CORE</strong><a style={styles.back} href="/profile">← Bảng Thuộc Tính</a></nav>
        <header style={styles.hero}>
          <span style={styles.eyebrow}>ADMIN COMMAND AUTHORITY</span>
          <h1 style={styles.title}>Cổng Quản Trị</h1>
          <p style={styles.copy}>Điều phối vai trò ứng dụng. Màn này chỉ hiển thị danh tính và quyền; không đọc tiến độ học riêng của Hành Giả khác.</p>
          <div style={styles.notice}><strong>Ma trận quyền:</strong> Người học dùng bài học, đồng bộ và tự quản lý tài khoản. Quản trị được xem danh sách tài khoản và cấp/thu quyền.</div>
          {query.updated && <div style={styles.notice}>Đã cập nhật quyền cho tài khoản được chọn.</div>}
          {query.error && <div style={styles.error}>{query.error}</div>}
        </header>
        <section style={styles.list}>{users.map((user) => roleCard(user, account.userId))}</section>
      </div>
    </main>
  );
}

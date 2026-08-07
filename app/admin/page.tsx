import type { CSSProperties } from "react";
import { getAuthenticatedUser } from "../chatgpt-auth";
import { hasPermission } from "../../src/auth/authorization";
import { recentFirstPartySession } from "../../src/server/authHttp";
import { AuditRepository, type AuditEvent } from "../../src/server/auditRepository";
import {
  AuthorizationRepository,
  resolveAuthorizedAccount,
  type AdminSessionSummary,
  type AdminUserSummary,
} from "../../src/server/authorizationRepository";
import { getD1Database } from "../../src/server/d1";
import {
  SYSTEM_SETTING_DEFINITIONS,
  SystemSettingsRepository,
  type SystemSetting,
} from "../../src/server/systemSettingsRepository";

export const dynamic = "force-dynamic";

const styles: Record<string, CSSProperties> = {
  page: { minHeight: "100vh", padding: "clamp(18px, 4vw, 54px)", color: "#dcebe7", background: "radial-gradient(circle at 78% 5%, #123d32 0, transparent 34%), #020907", fontFamily: "Inter, system-ui, sans-serif" },
  shell: { width: "min(1180px, 100%)", margin: "0 auto" },
  topbar: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 28 },
  brand: { color: "#61f2c0", fontFamily: "ui-monospace, monospace", fontSize: 13, letterSpacing: ".14em" },
  back: { color: "#9bbab1", textDecoration: "none", border: "1px solid #28493f", padding: "9px 12px", fontSize: 12 },
  hero: { padding: "clamp(24px, 5vw, 48px)", border: "1px solid #286553", background: "linear-gradient(120deg, rgba(6,28,23,.96), rgba(6,46,37,.76))", boxShadow: "inset 0 0 50px rgba(82,243,191,.04)" },
  eyebrow: { color: "#61f2c0", fontFamily: "ui-monospace, monospace", fontSize: 10, letterSpacing: ".16em" },
  title: { margin: "12px 0 8px", fontSize: "clamp(30px, 6vw, 56px)", letterSpacing: "-.04em" },
  copy: { maxWidth: 760, margin: 0, color: "#91aaa3", lineHeight: 1.7, fontSize: 13 },
  notice: { marginTop: 16, padding: 13, border: "1px solid #315b4e", color: "#9ec6bb", background: "#071612", fontSize: 12 },
  warning: { marginTop: 16, padding: 13, border: "1px solid #7d662d", color: "#f3d98f", background: "#201b0e", fontSize: 12 },
  error: { marginTop: 16, padding: 13, border: "1px solid #7a4037", color: "#ffae9e", background: "#21100d", fontSize: 12 },
  section: { marginTop: 24, padding: "clamp(18px, 3vw, 28px)", border: "1px solid #1d4439", background: "rgba(3,18,15,.92)" },
  sectionTitle: { margin: 0, color: "#e4f5ef", fontSize: 21 },
  sectionCopy: { margin: "7px 0 18px", color: "#79988f", fontSize: 12, lineHeight: 1.6 },
  list: { display: "grid", gap: 9 },
  card: { display: "grid", gap: 13, padding: 15, border: "1px solid #1d4439", background: "rgba(3,18,15,.96)" },
  row: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 9 },
  split: { display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", alignItems: "center", gap: 14 },
  email: { display: "block", overflowWrap: "anywhere", fontSize: 13 },
  meta: { display: "block", marginTop: 5, color: "#68857d", fontFamily: "ui-monospace, monospace", fontSize: 9 },
  role: { padding: "6px 8px", border: "1px solid #33705e", color: "#61f2c0", fontFamily: "ui-monospace, monospace", fontSize: 9 },
  roleAdmin: { padding: "6px 8px", border: "1px solid #75602e", color: "#f3c969", fontFamily: "ui-monospace, monospace", fontSize: 9 },
  roleEditor: { padding: "6px 8px", border: "1px solid #32647a", color: "#55d9ff", fontFamily: "ui-monospace, monospace", fontSize: 9 },
  button: { minHeight: 38, padding: "0 12px", border: "1px solid #34715f", color: "#61f2c0", background: "#0b211b", fontWeight: 700, fontSize: 10, cursor: "pointer" },
  danger: { minHeight: 38, padding: "0 12px", border: "1px solid #75483f", color: "#ffae9e", background: "#21100d", fontWeight: 700, fontSize: 10, cursor: "pointer" },
  disabled: { minHeight: 38, padding: "0 12px", border: "1px solid #303b37", color: "#61716c", background: "#101714", fontWeight: 700, fontSize: 10 },
  input: { minHeight: 38, minWidth: 180, padding: "0 10px", color: "#e4f5ef", background: "#06130f", border: "1px solid #315b4e", fontSize: 11 },
  state: { minHeight: "70vh", display: "grid", placeItems: "center", textAlign: "center" },
  stateCard: { maxWidth: 620, padding: 36, border: "1px solid #315b4e", background: "#06130f" },
  action: { display: "inline-block", marginTop: 18, padding: "11px 16px", color: "#03100c", background: "#61f2c0", textDecoration: "none", fontWeight: 800, fontSize: 12 },
};

const RoleControl = ({
  user,
  role,
  label,
  currentUserId,
  stepUpReady,
}: {
  user: AdminUserSummary;
  role: "content_editor" | "admin";
  label: string;
  currentUserId: string;
  stepUpReady: boolean;
}) => {
  const enabled = user.roles.includes(role);
  const selfAdmin = role === "admin" && enabled && user.userId === currentUserId;
  const disabled = !stepUpReady || selfAdmin;
  return (
    <form action="/admin/roles" method="post">
      <input type="hidden" name="userId" value={user.userId} />
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="enabled" value={enabled ? "false" : "true"} />
      <input type="hidden" name="expectedRevision" value={user.controlRevision} />
      <button type="submit" disabled={disabled} style={disabled ? styles.disabled : styles.button}>
        {enabled ? `Thu ${label}` : `Cấp ${label}`}
      </button>
    </form>
  );
};

const UserCard = ({
  user,
  currentUserId,
  stepUpReady,
}: {
  user: AdminUserSummary;
  currentUserId: string;
  stepUpReady: boolean;
}) => {
  const locked = user.status === "locked";
  return (
    <article style={styles.card}>
      <div style={styles.split}>
        <div>
          <strong style={styles.email}>{user.email || "Tài khoản chưa có email hiển thị"}</strong>
          <small style={styles.meta}>{user.status} · revision {user.controlRevision} · khởi tạo {new Date(user.createdAt).toLocaleDateString("vi-VN")}</small>
          {user.lockReason && <small style={styles.meta}>Lý do khóa: {user.lockReason}</small>}
        </div>
        <div style={styles.row}>
          <span style={styles.role}>HÀNH GIẢ</span>
          {user.roles.includes("content_editor") && <span style={styles.roleEditor}>QUẢN KHỐ NỘI DUNG</span>}
          {user.roles.includes("admin") && <span style={styles.roleAdmin}>ĐIỀU HÀNH HỆ THỐNG</span>}
        </div>
      </div>
      <div style={styles.row}>
        <RoleControl user={user} role="content_editor" label="Quản Khố" currentUserId={currentUserId} stepUpReady={stepUpReady} />
        <RoleControl user={user} role="admin" label="Điều Hành" currentUserId={currentUserId} stepUpReady={stepUpReady} />
        <form action="/admin/status" method="post" style={styles.row}>
          <input type="hidden" name="userId" value={user.userId} />
          <input type="hidden" name="locked" value={locked ? "false" : "true"} />
          <input type="hidden" name="expectedRevision" value={user.controlRevision} />
          {!locked && <input style={styles.input} name="reason" required minLength={3} maxLength={240} placeholder="Lý do khóa" />}
          <button
            type="submit"
            disabled={!stepUpReady || user.userId === currentUserId}
            style={!stepUpReady || user.userId === currentUserId ? styles.disabled : locked ? styles.button : styles.danger}
          >
            {locked ? "Mở khóa" : "Khóa tài khoản"}
          </button>
        </form>
      </div>
    </article>
  );
};

const SessionCard = ({
  session,
  currentSessionId,
  stepUpReady,
}: {
  session: AdminSessionSummary;
  currentSessionId: string | null;
  stepUpReady: boolean;
}) => {
  const current = session.id === currentSessionId;
  return (
    <article style={styles.card}>
      <div style={styles.split}>
        <div>
          <strong style={styles.email}>{session.email || session.userId}</strong>
          <small style={styles.meta}>{session.authMethod} · {session.deviceLabel ?? "Thiết bị chưa đặt tên"} · hoạt động {new Date(session.lastSeenAt).toLocaleString("vi-VN")}</small>
        </div>
        <span style={session.revokedAt ? styles.role : current ? styles.roleAdmin : styles.roleEditor}>
          {session.revokedAt ? "ĐÃ THU HỒI" : current ? "PHIÊN HIỆN TẠI" : "HOẠT ĐỘNG"}
        </span>
      </div>
      {!session.revokedAt && <form action="/admin/sessions" method="post">
        <input type="hidden" name="sessionId" value={session.id} />
        <button type="submit" disabled={!stepUpReady || current} style={!stepUpReady || current ? styles.disabled : styles.danger}>Thu hồi phiên</button>
      </form>}
    </article>
  );
};

const SettingCard = ({ setting, stepUpReady }: { setting: SystemSetting; stepUpReady: boolean }) => {
  const definition = SYSTEM_SETTING_DEFINITIONS[setting.key];
  const value = String(setting.value);
  return (
    <article style={styles.card}>
      <div><strong>{definition.label}</strong><small style={styles.meta}>{definition.description} · revision {setting.revision}</small></div>
      <form action="/admin/settings" method="post" style={styles.row}>
        <input type="hidden" name="key" value={setting.key} />
        <input type="hidden" name="expectedRevision" value={setting.revision} />
        {setting.key === "account_registration_mode" || setting.key === "content_preview_enabled" ? (
          <select style={styles.input} name="value" defaultValue={value}>
            {setting.key === "account_registration_mode"
              ? <><option value="open">open</option><option value="closed">closed</option></>
              : <><option value="false">false</option><option value="true">true</option></>}
          </select>
        ) : (
          <input
            style={styles.input}
            name="value"
            defaultValue={value}
            type={setting.key === "default_daily_minutes" ? "number" : "text"}
            min={setting.key === "default_daily_minutes" ? 5 : undefined}
            max={setting.key === "default_daily_minutes" ? 120 : undefined}
            maxLength={setting.key === "maintenance_banner" ? 160 : undefined}
          />
        )}
        <button type="submit" disabled={!stepUpReady} style={stepUpReady ? styles.button : styles.disabled}>Lưu cấu hình</button>
      </form>
    </article>
  );
};

const AuditCard = ({ event }: { event: AuditEvent }) => (
  <article style={styles.card}>
    <div style={styles.split}>
      <div><strong>{event.action}</strong><small style={styles.meta}>{event.category} · {event.targetType}:{event.targetId} · {new Date(event.createdAt).toLocaleString("vi-VN")}</small></div>
      <span style={event.outcome === "success" ? styles.role : styles.roleAdmin}>{event.outcome.toUpperCase()}</span>
    </div>
  </article>
);

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  const identity = await getAuthenticatedUser();
  if (!identity) {
    return <main style={styles.page}><section style={styles.state}><div style={styles.stateCard}>
      <span style={styles.eyebrow}>AUTHENTICATION REQUIRED</span><h1>Cổng Quản Trị đang phong ấn</h1>
      <p style={styles.copy}>Đăng nhập trước khi hệ thống kiểm tra vai trò phía máy chủ.</p>
      <a style={styles.action} href="/signin?returnTo=%2Fadmin">Đăng nhập</a>
    </div></section></main>;
  }

  let account: Awaited<ReturnType<typeof resolveAuthorizedAccount>>;
  let users: AdminUserSummary[];
  let sessions: AdminSessionSummary[];
  let settings: SystemSetting[];
  let audit: AuditEvent[];
  try {
    const database = await getD1Database();
    account = await resolveAuthorizedAccount(database, identity);
    if (!hasPermission(account.authorization, "admin:users:read")) {
      return <main style={styles.page}><section style={styles.state}><div style={styles.stateCard}>
        <span style={styles.eyebrow}>ACCESS DENIED</span><h1>Không đủ quyền truy cập</h1>
        <p style={styles.copy}>Cổng này chỉ dành cho Điều Hành Hệ Thống. Khu Content Studio sẽ là route riêng cho Quản Khố Nội Dung.</p>
        <a style={styles.back} href="/profile">Trở về Bảng Thuộc Tính</a>
      </div></section></main>;
    }
    [users, sessions, settings, audit] = await Promise.all([
      new AuthorizationRepository(database).listUsers(),
      new AuthorizationRepository(database).listSessions(60),
      new SystemSettingsRepository(database).list(),
      new AuditRepository(database).list({ limit: 80 }),
    ]);
  } catch {
    return <main style={styles.page}><section style={styles.state}><div style={styles.stateCard}>
      <span style={styles.eyebrow}>AUTHORIZATION BACKEND OFFLINE</span><h1>Chưa thể mở Cổng Quản Trị</h1>
      <p style={styles.copy}>D1 hoặc migration kiểm soát chưa sẵn sàng. Quyền được khóa an toàn thay vì suy đoán.</p>
      <a style={styles.back} href="/profile">Trở về Bảng Thuộc Tính</a>
    </div></section></main>;
  }

  const query = await searchParams;
  const recentSession = recentFirstPartySession(identity);
  const stepUpReady = recentSession !== null;
  return (
    <main style={styles.page}><div style={styles.shell}>
      <nav style={styles.topbar}><strong style={styles.brand}>HANZI.OS · AUTHORITY CORE</strong><a style={styles.back} href="/profile">← Bảng Thuộc Tính</a></nav>
      <header style={styles.hero}>
        <span style={styles.eyebrow}>ĐIỀU HÀNH HỆ THỐNG</span><h1 style={styles.title}>Cổng Quản Trị</h1>
        <p style={styles.copy}>Quản lý vai trò, khóa tài khoản, phiên, cấu hình allowlist và audit. Trang này không đọc tiến độ học riêng và không chứa Content Studio.</p>
        {!stepUpReady && <div style={styles.warning}>Thao tác nhạy cảm đang khóa. <a href="/signin?returnTo=%2Fadmin&stepUp=1">Xác minh lại bằng Google, email hoặc passkey</a>; việc chỉ có phiên ChatGPT tương thích không đủ step-up.</div>}
        {query.updated && <div style={styles.notice}>Đã cập nhật: {query.updated}</div>}
        {query.error && <div style={styles.error}>{query.error}</div>}
      </header>

      <section style={styles.section}><h2 style={styles.sectionTitle}>Tài khoản và vai trò</h2><p style={styles.sectionCopy}>Ba vai trò: Hành Giả, Quản Khố Nội Dung và Điều Hành Hệ Thống. Revision ngăn ghi đè từ hai phiên quản trị.</p><div style={styles.list}>{users.map((user) => <UserCard key={user.userId} user={user} currentUserId={account.userId} stepUpReady={stepUpReady} />)}</div></section>
      <section style={styles.section}><h2 style={styles.sectionTitle}>Phiên và thiết bị</h2><p style={styles.sectionCopy}>Thu hồi phiên phía máy chủ; phiên quản trị hiện tại phải kết thúc qua đăng xuất để tránh tự khóa nhầm.</p><div style={styles.list}>{sessions.map((session) => <SessionCard key={session.id} session={session} currentSessionId={recentSession?.sessionId ?? null} stepUpReady={stepUpReady} />)}</div></section>
      <section style={styles.section}><h2 style={styles.sectionTitle}>Cấu hình allowlist</h2><p style={styles.sectionCopy}>Chỉ bốn khóa không bí mật được phép lưu. OAuth secret và encryption key không có đường ghi vào đây.</p><div style={styles.list}>{settings.map((setting) => <SettingCard key={setting.key} setting={setting} stepUpReady={stepUpReady} />)}</div></section>
      <section style={styles.section}><h2 style={styles.sectionTitle}>Audit append-only</h2><p style={styles.sectionCopy}>Nhật ký auth, account, role, config và nền category cho approval/publication. Trigger D1 chặn sửa hoặc xóa.</p><div style={styles.list}>{audit.map((event) => <AuditCard key={event.id} event={event} />)}</div></section>
    </div></main>
  );
}

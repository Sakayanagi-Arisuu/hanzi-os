import type { ReactNode } from "react";
import type { AdminSessionSummary, AdminUserSummary } from "../../src/server/authorizationRepository";
import { SYSTEM_SETTING_DEFINITIONS, type SystemSetting } from "../../src/server/systemSettingsRepository";
import type { AuditEvent } from "../../src/server/auditRepository";

export const formatDate = (timestamp: number | null | undefined, withTime = false) => {
  if (!timestamp) return "Chưa có";
  return new Date(timestamp).toLocaleString("vi-VN", withTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" });
};

export const priorityLabel = (priority: "low" | "normal" | "high" | "urgent") => ({
  low: "Thấp",
  normal: "Bình thường",
  high: "Cao",
  urgent: "Khẩn",
}[priority]);

export function MetricCard({
  label,
  value,
  hint,
  tone = "jade",
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "jade" | "gold" | "coral" | "cyan";
  href?: string;
}) {
  const content = <><strong className={`admin-metric-value ${tone}`}>{value}</strong><span>{label}</span>{hint && <small>{hint}</small>}</>;
  return href
    ? <a className="admin-metric-card is-link" href={href}>{content}</a>
    : <div className="admin-metric-card">{content}</div>;
}

export function AdminSection({
  title,
  description,
  eyebrow,
  action,
  children,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const sectionId = `admin-section-${title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("vi")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/(^-|-$)/gu, "")}`;
  return <section className="admin-section" aria-labelledby={sectionId}>
    <div className="admin-section-heading">
      <div>{eyebrow && <span className="admin-eyebrow">{eyebrow}</span>}<h2 id={sectionId}>{title}</h2>{description && <p>{description}</p>}</div>
      {action}
    </div>
    {children}
  </section>;
}

const RoleControl = ({
  user,
  role,
  label,
  currentUserId,
  stepUpReady,
  returnTo,
}: {
  user: AdminUserSummary;
  role: "content_editor" | "admin";
  label: string;
  currentUserId: string;
  stepUpReady: boolean;
  returnTo: string;
}) => {
  const enabled = user.roles.includes(role);
  const selfAdmin = role === "admin" && enabled && user.userId === currentUserId;
  const disabled = !stepUpReady || selfAdmin;
  return <form action="/admin/roles" method="post">
    <input type="hidden" name="userId" value={user.userId} />
    <input type="hidden" name="role" value={role} />
    <input type="hidden" name="enabled" value={enabled ? "false" : "true"} />
    <input type="hidden" name="expectedRevision" value={user.controlRevision} />
    <input type="hidden" name="returnTo" value={returnTo} />
    <button className={disabled ? "admin-button is-disabled" : "admin-button is-secondary"} type="submit" disabled={disabled}>
      {enabled ? `Tắt ${label}` : `Cấp ${label}`}
    </button>
  </form>;
};

export function UserCard({
  user,
  currentUserId,
  stepUpReady,
  returnTo = "/admin/access",
}: {
  user: AdminUserSummary;
  currentUserId: string;
  stepUpReady: boolean;
  returnTo?: string;
}) {
  const locked = user.status === "locked";
  return <article className="admin-card admin-user-card">
    <div className="admin-card-head">
      <div className="admin-card-title"><span className="admin-avatar" aria-hidden="true">TK</span><div><strong>{user.email || "Tài khoản chưa có email"}</strong><small>Tạo ngày {formatDate(user.createdAt)}</small></div></div>
      <div className="admin-tag-list"><span className="admin-tag neutral">Hành Giả</span>{user.roles.includes("content_editor") && <span className="admin-tag cyan">Biên tập viên</span>}{user.roles.includes("admin") && <span className="admin-tag gold">Quản trị viên</span>}{locked && <span className="admin-tag coral">Đang khóa</span>}</div>
    </div>
    {user.lockReason && <div className="admin-card-note"><span className="admin-inline-glyph" aria-hidden="true">!</span> Lý do khóa: {user.lockReason}</div>}
    <div className="admin-card-actions">
      <div className="admin-action-group"><span className="admin-action-label">Vai trò</span><div className="admin-button-row"><RoleControl user={user} role="content_editor" label="biên tập" currentUserId={currentUserId} stepUpReady={stepUpReady} returnTo={returnTo} /><RoleControl user={user} role="admin" label="quản trị" currentUserId={currentUserId} stepUpReady={stepUpReady} returnTo={returnTo} /></div></div>
      <form className="admin-action-group admin-lock-form" action="/admin/status" method="post">
        <span className="admin-action-label">Trạng thái tài khoản</span>
        <input type="hidden" name="userId" value={user.userId} />
        <input type="hidden" name="locked" value={locked ? "false" : "true"} />
        <input type="hidden" name="expectedRevision" value={user.controlRevision} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <div className="admin-button-row">{!locked && <label className="admin-visually-labeled-input"><span>Lý do khóa</span><input name="reason" required minLength={3} maxLength={240} placeholder="Ví dụ: cần rà soát" /></label>}<button className={!stepUpReady || user.userId === currentUserId ? "admin-button is-disabled" : locked ? "admin-button is-secondary" : "admin-button is-danger"} type="submit" disabled={!stepUpReady || user.userId === currentUserId}>{locked ? "Mở khóa tài khoản" : "Khóa tài khoản"}</button></div>
      </form>
    </div>
  </article>;
}

export function SessionCard({
  session,
  currentSessionId,
  stepUpReady,
  returnTo = "/admin/security",
}: {
  session: AdminSessionSummary;
  currentSessionId: string | null;
  stepUpReady: boolean;
  returnTo?: string;
}) {
  const current = session.id === currentSessionId;
  const revoked = Boolean(session.revokedAt);
  const authMethod = session.authMethod === "hanzi"
    ? "tài khoản HANZI.OS"
    : session.authMethod === "email_otp"
      ? "mã xác minh email"
      : session.authMethod === "passkey"
        ? "passkey"
        : session.authMethod;
  return <article className="admin-card admin-session-card">
    <div className="admin-card-head"><div className="admin-card-title"><span className="admin-avatar" aria-hidden="true">PN</span><div><strong>{session.email || "Tài khoản nội bộ"}</strong><small>{session.deviceLabel ?? "Thiết bị chưa đặt tên"} · hoạt động {formatDate(session.lastSeenAt, true)}</small></div></div><span className={`admin-tag ${revoked ? "neutral" : current ? "gold" : "cyan"}`}>{revoked ? "Đã thu hồi" : current ? "Phiên hiện tại" : "Đang hoạt động"}</span></div>
    <div className="admin-session-meta"><span>Đăng nhập bằng {authMethod}</span><span>Hết hạn {formatDate(session.expiresAt, true)}</span></div>
    {!revoked && <form action="/admin/sessions" method="post"><input type="hidden" name="sessionId" value={session.id} /><input type="hidden" name="returnTo" value={returnTo} /><button className={stepUpReady && !current ? "admin-button is-danger" : "admin-button is-disabled"} type="submit" disabled={!stepUpReady || current}>{current ? "Đăng xuất ở thiết bị này" : "Thu hồi phiên"}</button></form>}
  </article>;
}

const settingValueLabel = (setting: SystemSetting) => {
  if (setting.key === "account_registration_mode") return setting.value === "open" ? "Đang mở" : "Đang tạm khóa";
  if (setting.key === "content_preview_enabled") return setting.value === true ? "Đang bật" : "Đang tắt";
  if (setting.key === "default_daily_minutes") return `${String(setting.value)} phút`;
  return String(setting.value || "Chưa có thông báo");
};

export function SettingCard({ setting, stepUpReady }: { setting: SystemSetting; stepUpReady: boolean }) {
  const definition = SYSTEM_SETTING_DEFINITIONS[setting.key];
  const value = String(setting.value);
  return <article className="admin-card admin-setting-card"><div className="admin-card-head"><div><strong>{definition.label}</strong><p>{definition.description}</p></div><span className="admin-setting-current">{settingValueLabel(setting)}</span></div><form className="admin-setting-form" action="/admin/settings" method="post"><input type="hidden" name="key" value={setting.key} /><input type="hidden" name="expectedRevision" value={setting.revision} /><input type="hidden" name="returnTo" value="/admin/configuration" /><label><span>Giá trị mới</span>{setting.key === "account_registration_mode" || setting.key === "content_preview_enabled" ? <select name="value" defaultValue={value}>{setting.key === "account_registration_mode" ? <><option value="open">Cho phép</option><option value="closed">Tạm khóa</option></> : <><option value="false">Tắt</option><option value="true">Bật</option></>}</select> : <input name="value" defaultValue={value} type={setting.key === "default_daily_minutes" ? "number" : "text"} min={setting.key === "default_daily_minutes" ? 5 : undefined} max={setting.key === "default_daily_minutes" ? 120 : undefined} maxLength={setting.key === "maintenance_banner" ? 160 : undefined} />}</label><button className={stepUpReady ? "admin-button is-primary" : "admin-button is-disabled"} type="submit" disabled={!stepUpReady}>Lưu thay đổi</button></form><small className="admin-card-foot">Lần cập nhật gần nhất: {formatDate(setting.updatedAt)} · phiên bản {setting.revision}</small></article>;
}

const auditCategoryLabel: Record<AuditEvent["category"], string> = { auth: "Xác thực", account: "Tài khoản", role: "Vai trò", config: "Cấu hình", approval: "Duyệt nội dung", publication: "Phát hành" };
const auditActionLabel = (action: string) => ({
  "auth.hanzi.registered": "Tạo tài khoản HANZI.OS",
  "auth.hanzi.signed_in": "Đăng nhập HANZI.OS",
  "auth.google.unlinked": "Ngắt liên kết Google",
  "auth.facebook.unlinked": "Ngắt liên kết Facebook",
  "auth.email.unlinked": "Ngắt liên kết email",
  "auth.passkey.linked": "Thêm passkey",
  "auth.passkey.unlinked": "Gỡ passkey",
  "auth.passkey.signed_in": "Đăng nhập bằng passkey",
  "auth.session.revoked": "Đăng xuất thiết bị",
  "auth.session.signed_out": "Đăng xuất",
  "role.granted": "Cấp vai trò",
  "role.revoked": "Thu hồi vai trò",
  "account.locked": "Khóa tài khoản",
  "account.unlocked": "Mở khóa tài khoản",
  "auth.session.revoked_by_admin": "Thu hồi phiên đăng nhập",
  "config.setting.updated": "Cập nhật cấu hình",
  "content.assignment.updated": "Cập nhật phân công",
  "content.revision.changes_requested": "Yêu cầu sửa nội dung",
  "content.revision.approved": "Phê duyệt nội dung",
  "content.revision.published": "Xác nhận phát hành",
  "content.release.completed": "Hoàn tất phát hành",
  "content.release.failed": "Phát hành thất bại",
  "content.release.replayed": "Chạy lại phát hành",
}[action] ?? "Thay đổi quản trị");

export function AuditCard({ event }: { event: AuditEvent }) {
  const success = event.outcome === "success";
  return <article className="admin-card admin-audit-card"><div className="admin-card-head"><div className="admin-card-title"><span className={`admin-audit-icon ${success ? "success" : "warning"}`} aria-hidden="true">{success ? "OK" : "!"}</span><div><strong>{auditActionLabel(event.action)}</strong><small>{auditCategoryLabel[event.category]} · {formatDate(event.createdAt, true)}</small></div></div><span className={`admin-tag ${success ? "jade" : "gold"}`}>{success ? "Thành công" : event.outcome === "denied" ? "Bị từ chối" : "Cần xem lại"}</span></div><details className="admin-technical-detail"><summary>Xem chi tiết kỹ thuật</summary><p>Đối tượng: {event.targetType} · mã nội bộ: {event.targetId}</p></details></article>;
}

export function EmptyState({ title, description, href, action }: { title: string; description: string; href?: string; action?: string }) {
  return <div className="admin-empty-state"><span className="admin-empty-glyph" aria-hidden="true">—</span><strong>{title}</strong><p>{description}</p>{href && action && <a className="admin-button is-secondary" href={href}>{action}</a>}</div>;
}

export function WorkflowStatus({ state }: { state: "draft" | "submitted" | "approved" | "published" | "archived" }) {
  const labels = { draft: "Bản nháp", submitted: "Chờ duyệt", approved: "Đã duyệt", published: "Đang phục vụ", archived: "Đã lưu trữ" };
  return <span className={`admin-tag ${state === "published" ? "jade" : state === "submitted" || state === "approved" ? "gold" : "neutral"}`}>{labels[state]}</span>;
}

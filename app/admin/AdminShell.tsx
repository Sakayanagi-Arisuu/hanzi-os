import type { ReactNode } from "react";
import { authorizationLabel, type AppAuthorization } from "../../src/auth/authorization";

export type AdminNavKey =
  | "overview"
  | "workflow"
  | "content"
  | "publishing"
  | "access"
  | "security"
  | "configuration"
  | "activity";

type AdminNavItem = {
  key: AdminNavKey;
  href: string;
  label: string;
  description: string;
  glyph: string;
};

type AdminNavGroup = {
  label: string;
  items: readonly AdminNavItem[];
};

export const ADMIN_NAV_GROUPS: readonly AdminNavGroup[] = [
  {
    label: "Công việc hàng ngày",
    items: [
      { key: "overview", href: "/admin", label: "Tổng quan", description: "Việc cần làm hôm nay", glyph: "TQ" },
      { key: "workflow", href: "/admin/workflow", label: "Công việc", description: "Phân công và hạn xử lý", glyph: "CV" },
      { key: "content", href: "/admin/content", label: "Kho nội dung", description: "Module và nội dung học", glyph: "KN" },
      { key: "publishing", href: "/admin/publishing", label: "Duyệt & phát hành", description: "Kiểm tra và đưa lên học", glyph: "DP" },
    ],
  },
  {
    label: "Quản trị hệ thống",
    items: [
      { key: "access", href: "/admin/access", label: "Tài khoản & quyền", description: "Ai được làm gì", glyph: "TK" },
      { key: "security", href: "/admin/security", label: "Phiên đăng nhập", description: "Thiết bị và bảo mật", glyph: "PN" },
      { key: "configuration", href: "/admin/configuration", label: "Cấu hình", description: "Thiết lập vận hành", glyph: "CH" },
      { key: "activity", href: "/admin/activity", label: "Nhật ký hoạt động", description: "Lịch sử thay đổi", glyph: "NK" },
    ],
  },
] as const;

const allItems = ADMIN_NAV_GROUPS.flatMap((group) => group.items);

export const adminPageHref = (key: AdminNavKey) =>
  allItems.find((item) => item.key === key)?.href ?? "/admin";

export function AdminState({ kind }: { kind: "unauthenticated" | "denied" | "offline" }) {
  const content = kind === "unauthenticated"
    ? {
        eyebrow: "CẦN ĐĂNG NHẬP",
        title: "Đăng nhập để mở Cổng Quản Trị",
        copy: "Hệ thống sẽ kiểm tra quyền ở phía máy chủ trước khi hiển thị dữ liệu quản trị.",
        href: "/signin?returnTo=%2Fadmin",
        action: "Đăng nhập",
      }
    : kind === "denied"
      ? {
          eyebrow: "KHÔNG ĐỦ QUYỀN",
          title: "Khu vực này chỉ dành cho Quản trị viên",
          copy: "Nếu bạn là Biên tập viên, hãy mở Biên Tập Viện để soạn và gửi nội dung.",
          href: "/studio",
          action: "Mở Biên Tập Viện",
        }
      : {
          eyebrow: "HỆ THỐNG TẠM KHÓA",
          title: "Chưa thể tải dữ liệu quản trị",
          copy: "Kho dữ liệu hoặc migration chưa sẵn sàng. Quyền được khóa an toàn; hãy thử tải lại sau.",
          href: "/admin",
          action: "Thử lại",
        };
  return (
    <main className="admin-page">
      <section className="admin-state" aria-labelledby="admin-state-title">
        <div className="admin-state-card">
          <span className="admin-eyebrow">{content.eyebrow}</span>
          <h1 id="admin-state-title">{content.title}</h1>
          <p>{content.copy}</p>
          <a className="admin-primary-action" href={content.href}>{content.action}</a>
        </div>
      </section>
    </main>
  );
}

export function AdminShell({
  current,
  title,
  description,
  authorization,
  stepUpReady = true,
  children,
  badges,
  eyebrow = "CỔNG QUẢN TRỊ",
  showStepUpWarning = false,
  status,
}: {
  current: AdminNavKey;
  title: string;
  description: string;
  authorization: AppAuthorization;
  stepUpReady?: boolean;
  children: ReactNode;
  badges?: Partial<Record<AdminNavKey, number>>;
  eyebrow?: string;
  showStepUpWarning?: boolean;
  status?: { kind: "updated" | "error"; message: string } | null;
}) {
  return (
    <main className="admin-page">
      <a className="admin-skip-link" href="#admin-main-content">Bỏ qua điều hướng</a>
      <div className="admin-app-shell">
        <header className="admin-topbar">
          <a className="admin-brand" href="/admin" aria-label="HANZI.OS, về Tổng quan Cổng Quản Trị">
            <span className="admin-brand-mark" aria-hidden="true">H</span>
            <span><strong>HANZI.OS</strong><small>CỔNG QUẢN TRỊ</small></span>
          </a>
          <div className="admin-topbar-actions">
            <a className="admin-quiet-action" href="/studio">Mở Biên Tập Viện</a>
            <a className="admin-quiet-action" href="/account/security">Tài khoản</a>
          </div>
        </header>

        <div className="admin-layout">
          <aside className="admin-sidebar" aria-label="Điều hướng Cổng Quản Trị">
            <nav className="admin-nav">
              {ADMIN_NAV_GROUPS.map((group, groupIndex) => {
                const groupActive = group.items.some((item) => item.key === current);
                const content = <div className="admin-nav-group">
                  <span className="admin-nav-group-label">{group.label}</span>
                  {group.items.map((item) => {
                    const active = current === item.key;
                    const badge = badges?.[item.key];
                    return (
                      <a
                        className={`admin-nav-item${active ? " is-active" : ""}`}
                        href={item.href}
                        key={item.key}
                        aria-current={active ? "page" : undefined}
                      >
                        <span className="admin-nav-glyph" aria-hidden="true">{item.glyph}</span>
                        <span className="admin-nav-item-copy"><strong>{item.label}</strong></span>
                        {typeof badge === "number" && badge > 0 && <span className="admin-nav-badge" aria-label={`${badge} việc cần xử lý`}>{badge > 99 ? "99+" : badge}</span>}
                      </a>
                    );
                  })}
                </div>;
                return groupIndex === 0
                  ? <div key={group.label}>{content}</div>
                  : <details className="admin-system-nav" open={groupActive} key={group.label}>
                      <summary>Quản lý hệ thống</summary>
                      {content}
                    </details>;
              })}
            </nav>
            <span className="admin-sidebar-role">{authorizationLabel(authorization)}</span>
          </aside>

          <div className="admin-main-column" id="admin-main-content" tabIndex={-1}>
            <header className="admin-page-header">
              <nav className="admin-breadcrumb" aria-label="Đường dẫn"><a href="/admin">Tổng quan</a>{current !== "overview" && <><span aria-hidden="true">/</span><span>{allItems.find((item) => item.key === current)?.label}</span></>}</nav>
              <div className="admin-page-heading-row">
                <div><span className="admin-eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>
              </div>
              {showStepUpWarning && !stepUpReady && <div className="admin-inline-warning" role="status">Thao tác nhạy cảm đang tạm khóa. <a href={`/signin?returnTo=${encodeURIComponent(adminPageHref(current))}&stepUp=1`}>Xác minh lại tài khoản</a> để tiếp tục.</div>}
              {status && <div className={`admin-inline-status ${status.kind}`} role={status.kind === "error" ? "alert" : "status"}>{status.message}</div>}
            </header>
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}

import { AdminSection, EmptyState, MetricCard, UserCard } from "../adminComponents";
import { AdminShell, AdminState } from "../AdminShell";
import { loadAdminContext } from "../adminServer";
import {
  AuthorizationRepository,
  type AdminUserRoleFilter,
  type AdminUserStatusFilter,
} from "../../../src/server/authorizationRepository";
import {
  createAuthorization,
  hasPermission,
  type AppPermission,
} from "../../../src/auth/authorization";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 12;

const accessRoles = [
  {
    id: "learner",
    label: "Hành Giả",
    plainLabel: "Người học",
    authorization: createAuthorization([]),
  },
  {
    id: "content_editor",
    label: "Quản Khố Nội Dung",
    plainLabel: "Biên tập viên",
    authorization: createAuthorization(["content_editor"]),
  },
  {
    id: "admin",
    label: "Điều Hành Hệ Thống",
    plainLabel: "Quản trị viên",
    authorization: createAuthorization(["admin"]),
  },
] as const;

const accessCapabilities: Array<{
  label: string;
  description: string;
  permissions: AppPermission[];
}> = [
  {
    label: "Học và quản lý tài khoản cá nhân",
    description: "Học, ôn, luyện và tự quản lý hồ sơ của chính mình.",
    permissions: ["learning:use", "account:self:manage"],
  },
  {
    label: "Mở Biên Tập Viện",
    description: "Xem thư khố, trạng thái và nội dung đang được xử lý.",
    permissions: ["content:workspace:read"],
  },
  {
    label: "Soạn, tự kiểm và gửi duyệt",
    description: "Tạo bản nháp, chạy kiểm định và chuyển sang hàng chờ độc lập.",
    permissions: [
      "content:drafts:write",
      "content:validation:run",
      "content:submit",
    ],
  },
  {
    label: "Phê duyệt và phát hành",
    description: "Quyết định độc lập trước khi nội dung tới người học.",
    permissions: ["content:approve", "content:publish"],
  },
  {
    label: "Điều hành tài khoản và hệ thống",
    description: "Vai trò, khóa tài khoản, phiên, cấu hình và nhật ký kiểm soát.",
    permissions: [
      "admin:users:read",
      "admin:sessions:read",
      "admin:settings:read",
      "admin:audit:read",
    ],
  },
];

export default async function AdminAccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    updated?: string;
    error?: string;
    role?: string;
    status?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const state = await loadAdminContext("admin:users:read");
  if (state.kind !== "ok") return <AdminState kind={state.kind} />;
  const query = await searchParams;
  const role: AdminUserRoleFilter = query.role === "learner_only"
    || query.role === "content_editor"
    || query.role === "admin"
    ? query.role
    : "all";
  const status: AdminUserStatusFilter = query.status === "active" || query.status === "locked"
    ? query.status
    : "all";
  const search = query.q?.trim().slice(0, 120) ?? "";
  const requestedPage = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  let userPage: Awaited<ReturnType<AuthorizationRepository["listUserPage"]>>;
  try {
    const repository = new AuthorizationRepository(state.context.database);
    userPage = await repository.listUserPage({
      role,
      status,
      query: search,
      limit: PAGE_SIZE,
      offset: (requestedPage - 1) * PAGE_SIZE,
    });
    const availablePages = Math.max(1, Math.ceil(userPage.filteredTotal / PAGE_SIZE));
    if (requestedPage > availablePages) {
      userPage = await repository.listUserPage({
        role,
        status,
        query: search,
        limit: PAGE_SIZE,
        offset: (availablePages - 1) * PAGE_SIZE,
      });
    }
  } catch {
    return <AdminState kind="offline" />;
  }
  const totalPages = Math.max(1, Math.ceil(userPage.filteredTotal / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const pageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (role !== "all") params.set("role", role);
    if (status !== "all") params.set("status", status);
    if (search) params.set("q", search);
    if (nextPage > 1) params.set("page", String(nextPage));
    const suffix = params.toString();
    return `/admin/access${suffix ? `?${suffix}` : ""}`;
  };
  return <AdminShell
    current="access"
    title="Tài khoản & quyền"
    description="Quản lý ai được biên tập, ai được duyệt và ai được điều hành hệ thống. Quyền học tập của mọi tài khoản vẫn được giữ nguyên."
    authorization={state.context.account.authorization}
    stepUpReady={state.context.stepUpReady}
    showStepUpWarning
    status={query.error ? { kind: "error", message: query.error } : query.updated ? { kind: "updated", message: "Đã cập nhật tài khoản hoặc vai trò." } : null}
  >
    <AdminSection title="Tóm tắt quyền truy cập" description="Một người có thể có nhiều vai trò; vai trò quyết định nhiệm vụ, không phải cấp bậc hơn kém." eyebrow="TỔNG QUAN">
      <div className="admin-metric-grid"><MetricCard value={userPage.summary.active} label="Tài khoản đang hoạt động" hint={`${userPage.summary.total} tài khoản toàn hệ thống`} /><MetricCard value={userPage.summary.editors} label="Biên tập viên" hint="Có thể soạn nội dung" tone="cyan" /><MetricCard value={userPage.summary.admins} label="Quản trị viên" hint="Có thể duyệt và phát hành" tone="gold" /><MetricCard value={userPage.summary.locked} label="Đang khóa" hint="Cần rà soát nếu có" tone={userPage.summary.locked > 0 ? "coral" : "jade"} /></div>
    </AdminSection>

    <AdminSection title="Ma trận trách nhiệm" description="Mỗi cột là quyền thật được máy chủ kiểm tra, không phải nhãn trang trí. Dấu “Không” là ranh giới chủ đích của quy trình." eyebrow="PHÂN QUYỀN">
      <div className="admin-capability-matrix" role="table" aria-label="Ma trận quyền theo vai trò">
        <div className="admin-capability-row admin-capability-head" role="row">
          <span role="columnheader">Khả năng</span>
          {accessRoles.map((role) => <span role="columnheader" key={role.id}><strong>{role.plainLabel}</strong><small>{role.label}</small></span>)}
        </div>
        {accessCapabilities.map((capability) => <div className="admin-capability-row" role="row" key={capability.label}>
          <span className="admin-capability-name" role="rowheader"><strong>{capability.label}</strong><small>{capability.description}</small></span>
          {accessRoles.map((role) => {
            const allowed = capability.permissions.every((permission) =>
              hasPermission(role.authorization, permission)
            );
            return <span className={`admin-capability-status ${allowed ? "is-allowed" : "is-denied"}`} data-role={role.plainLabel} role="cell" key={role.id}><b aria-hidden="true">{allowed ? "✓" : "—"}</b>{allowed ? "Có" : "Không"}</span>;
          })}
        </div>)}
      </div>
      <div className="admin-separation-note" role="note"><strong>Nguyên tắc bốn mắt</strong><p>Biên tập viên có thể soạn và gửi duyệt nhưng không thể tự phê duyệt hoặc phát hành. Quản trị viên có thể duyệt và phát hành nhưng không thể dùng vai trò quản trị để tự soạn bản nháp.</p><div><a className="admin-content-link" href="/studio">Mở Biên Tập Viện</a><a className="admin-content-link" href="/admin/workflow">Mở Công việc</a></div></div>
    </AdminSection>

    <AdminSection title="Danh sách tài khoản" description={`${userPage.filteredTotal} tài khoản khớp bộ lọc. Mỗi thay đổi cần xác minh lại; không thể tự thu quyền quản trị hoặc tự khóa tài khoản đang dùng.`} eyebrow="QUẢN LÝ">
      <form className="admin-list-filter admin-user-filter" method="get">
        <label><span>Tìm tài khoản</span><input type="search" name="q" defaultValue={search} maxLength={120} placeholder="Email tài khoản" /></label>
        <label><span>Vai trò</span><select name="role" defaultValue={role}><option value="all">Tất cả vai trò</option><option value="learner_only">Chỉ người học</option><option value="content_editor">Biên tập viên</option><option value="admin">Quản trị viên</option></select></label>
        <label><span>Trạng thái</span><select name="status" defaultValue={status}><option value="all">Tất cả trạng thái</option><option value="active">Đang hoạt động</option><option value="locked">Đang khóa</option></select></label>
        <button className="admin-button is-primary" type="submit">Lọc tài khoản</button>
        {(search || role !== "all" || status !== "all") && <a className="admin-button is-secondary" href="/admin/access">Xóa bộ lọc</a>}
      </form>
      {userPage.users.length === 0 ? <EmptyState title="Không có tài khoản phù hợp" description={userPage.summary.total === 0 ? "Tài khoản sẽ xuất hiện sau khi đăng nhập và được hệ thống đồng bộ." : "Thử bỏ bớt từ khóa hoặc chọn bộ lọc khác."} /> : <div className="admin-card-list">{userPage.users.map((user) => <UserCard key={user.userId} user={user} currentUserId={state.context.account.userId} stepUpReady={state.context.stepUpReady} returnTo={pageHref(page)} />)}</div>}
      {totalPages > 1 && <nav className="admin-pagination" aria-label="Phân trang tài khoản">
        {page > 1 ? <a href={pageHref(page - 1)}>← Trang trước</a> : <span aria-disabled="true">← Trang trước</span>}
        <strong>Trang {page}/{totalPages} · {userPage.filteredTotal} kết quả</strong>
        {page < totalPages ? <a href={pageHref(page + 1)}>Trang sau →</a> : <span aria-disabled="true">Trang sau →</span>}
      </nav>}
    </AdminSection>
  </AdminShell>;
}

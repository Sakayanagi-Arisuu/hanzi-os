import { AdminSection, AuditCard, EmptyState, MetricCard } from "../adminComponents";
import { AdminShell, AdminState } from "../AdminShell";
import { loadAdminContext } from "../adminServer";
import {
  AUDIT_CATEGORIES,
  AuditRepository,
  type AuditCategory,
  type AuditOutcome,
} from "../../../src/server/auditRepository";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;

const categoryLabels: Record<AuditCategory, string> = {
  auth: "Xác thực",
  account: "Tài khoản",
  role: "Vai trò",
  config: "Cấu hình",
  approval: "Duyệt nội dung",
  publication: "Phát hành",
};

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{
    updated?: string;
    error?: string;
    category?: string;
    outcome?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const state = await loadAdminContext("admin:audit:read");
  if (state.kind !== "ok") return <AdminState kind={state.kind} />;
  const query = await searchParams;
  const category = query.category && AUDIT_CATEGORIES.includes(query.category as AuditCategory)
    ? query.category as AuditCategory
    : null;
  const outcome: AuditOutcome | null = query.outcome === "success"
    || query.outcome === "denied"
    || query.outcome === "failed"
    ? query.outcome
    : null;
  const search = query.q?.trim().slice(0, 120) ?? "";
  const requestedPage = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  let eventPage: Awaited<ReturnType<AuditRepository["listPage"]>>;
  try {
    const repository = new AuditRepository(state.context.database);
    eventPage = await repository.listPage({
      category,
      outcome,
      query: search,
      limit: PAGE_SIZE,
      offset: (requestedPage - 1) * PAGE_SIZE,
    });
    const availablePages = Math.max(1, Math.ceil(eventPage.filteredTotal / PAGE_SIZE));
    if (requestedPage > availablePages) {
      eventPage = await repository.listPage({
        category,
        outcome,
        query: search,
        limit: PAGE_SIZE,
        offset: (availablePages - 1) * PAGE_SIZE,
      });
    }
  } catch {
    return <AdminState kind="offline" />;
  }
  const totalPages = Math.max(1, Math.ceil(eventPage.filteredTotal / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const pageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (outcome) params.set("outcome", outcome);
    if (search) params.set("q", search);
    if (nextPage > 1) params.set("page", String(nextPage));
    const suffix = params.toString();
    return `/admin/activity${suffix ? `?${suffix}` : ""}`;
  };
  return <AdminShell
    current="activity"
    title="Nhật ký hoạt động"
    description="Lịch sử các thay đổi về tài khoản, vai trò, cấu hình, phê duyệt và phát hành. Dùng trang này khi cần đối chiếu hoặc bàn giao."
    authorization={state.context.account.authorization}
    status={query.error ? { kind: "error", message: query.error } : query.updated ? { kind: "updated", message: "Đã cập nhật." } : null}
  >
    <AdminSection title="Tóm tắt lịch sử" description="Nhật ký chỉ thêm mới; không thể sửa hoặc xóa để việc đối chiếu luôn đáng tin cậy." eyebrow="ĐỐI CHIẾU">
      <div className="admin-metric-grid"><MetricCard value={eventPage.summary.total} label="Tổng sự kiện" hint="Toàn bộ nhật ký đang lưu" tone="cyan" /><MetricCard value={eventPage.summary.successful} label="Đã hoàn tất" hint="Thao tác thành công" tone="jade" /><MetricCard value={eventPage.summary.attention} label="Cần xem lại" hint="Bị từ chối hoặc thất bại" tone={eventPage.summary.attention > 0 ? "gold" : "jade"} /></div>
    </AdminSection>
    <AdminSection title="Hoạt động gần đây" description={`${eventPage.filteredTotal} sự kiện khớp bộ lọc. Thông tin kỹ thuật được ẩn sau nút mở rộng và chỉ cần mở khi điều tra.`} eyebrow="DÒNG THỜI GIAN">
      <form className="admin-list-filter admin-audit-filter" method="get">
        <label><span>Tìm sự kiện</span><input type="search" name="q" defaultValue={search} maxLength={120} placeholder="Hành động hoặc đối tượng" /></label>
        <label><span>Nhóm hoạt động</span><select name="category" defaultValue={category ?? ""}><option value="">Tất cả nhóm</option>{AUDIT_CATEGORIES.map((value) => <option value={value} key={value}>{categoryLabels[value]}</option>)}</select></label>
        <label><span>Kết quả</span><select name="outcome" defaultValue={outcome ?? ""}><option value="">Tất cả kết quả</option><option value="success">Hoàn tất</option><option value="denied">Bị từ chối</option><option value="failed">Thất bại</option></select></label>
        <button className="admin-button is-primary" type="submit">Lọc nhật ký</button>
        {(search || category || outcome) && <a className="admin-button is-secondary" href="/admin/activity">Xóa bộ lọc</a>}
      </form>
      {eventPage.events.length === 0 ? <EmptyState title="Không có hoạt động phù hợp" description={eventPage.summary.total === 0 ? "Những thay đổi quản trị sẽ được ghi lại tự động." : "Thử bỏ bớt từ khóa hoặc chọn bộ lọc khác."} /> : <div className="admin-card-list">{eventPage.events.map((event) => <AuditCard key={event.id} event={event} />)}</div>}
      {totalPages > 1 && <nav className="admin-pagination" aria-label="Phân trang nhật ký hoạt động">
        {page > 1 ? <a href={pageHref(page - 1)}>← Trang trước</a> : <span aria-disabled="true">← Trang trước</span>}
        <strong>Trang {page}/{totalPages} · {eventPage.filteredTotal} kết quả</strong>
        {page < totalPages ? <a href={pageHref(page + 1)}>Trang sau →</a> : <span aria-disabled="true">Trang sau →</span>}
      </nav>}
    </AdminSection>
  </AdminShell>;
}

import { AdminSection, EmptyState, MetricCard, SessionCard } from "../adminComponents";
import { AdminShell, AdminState } from "../AdminShell";
import { loadAdminContext } from "../adminServer";
import { recentFirstPartySession } from "../../../src/server/authHttp";
import {
  AuthorizationRepository,
  type AdminSessionFilter,
} from "../../../src/server/authorizationRepository";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 12;

export default async function AdminSecurityPage({
  searchParams,
}: {
  searchParams: Promise<{
    updated?: string;
    error?: string;
    status?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const state = await loadAdminContext("admin:sessions:read");
  if (state.kind !== "ok") return <AdminState kind={state.kind} />;
  const query = await searchParams;
  const status: AdminSessionFilter = query.status === "active" || query.status === "revoked"
    ? query.status
    : "all";
  const search = query.q?.trim().slice(0, 120) ?? "";
  const requestedPage = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  let sessionPage: Awaited<ReturnType<AuthorizationRepository["listSessionPage"]>>;
  try {
    const repository = new AuthorizationRepository(state.context.database);
    sessionPage = await repository.listSessionPage({
      status,
      query: search,
      limit: PAGE_SIZE,
      offset: (requestedPage - 1) * PAGE_SIZE,
    });
    const availablePages = Math.max(1, Math.ceil(sessionPage.filteredTotal / PAGE_SIZE));
    if (requestedPage > availablePages) {
      sessionPage = await repository.listSessionPage({
        status,
        query: search,
        limit: PAGE_SIZE,
        offset: (availablePages - 1) * PAGE_SIZE,
      });
    }
  } catch {
    return <AdminState kind="offline" />;
  }
  const totalPages = Math.max(1, Math.ceil(sessionPage.filteredTotal / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const sessions = sessionPage.sessions;
  const currentSessionId = recentFirstPartySession(state.context.identity)?.sessionId ?? null;
  const pageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (search) params.set("q", search);
    if (nextPage > 1) params.set("page", String(nextPage));
    const suffix = params.toString();
    return `/admin/security${suffix ? `?${suffix}` : ""}`;
  };
  return <AdminShell
    current="security"
    title="Phiên đăng nhập"
    description="Rà các thiết bị đang đăng nhập vào HANZI.OS và thu hồi phiên không còn dùng. Phiên bạn đang dùng luôn được đánh dấu rõ ràng."
    authorization={state.context.account.authorization}
    stepUpReady={state.context.stepUpReady}
    showStepUpWarning
    status={query.error ? { kind: "error", message: query.error } : query.updated ? { kind: "updated", message: "Đã cập nhật phiên đăng nhập." } : null}
  >
    <AdminSection title="Tình hình phiên" description="Thu hồi phiên chỉ ngăn phiên đó tiếp tục truy cập; không xóa tài khoản hay dữ liệu học." eyebrow="BẢO MẬT">
      <div className="admin-metric-grid"><MetricCard value={sessionPage.summary.active} label="Đang hoạt động" hint="Có thể truy cập hệ thống" tone="jade" /><MetricCard value={sessionPage.summary.revoked} label="Đã thu hồi" hint="Không còn được dùng" tone="coral" /><MetricCard value={currentSessionId ? 1 : 0} label="Phiên hiện tại" hint="Không thể thu hồi tại đây" tone="gold" /><MetricCard value={sessionPage.summary.total} label="Tổng phiên đã ghi" hint="Giữ để đối chiếu nhật ký" tone="cyan" /></div>
    </AdminSection>
    <AdminSection title="Thiết bị và phiên gần đây" description={`${sessionPage.filteredTotal} phiên khớp bộ lọc. Nếu nhận ra thiết bị lạ, hãy thu hồi phiên đó rồi kiểm tra Nhật ký hoạt động.`} eyebrow="DANH SÁCH">
      <form className="admin-list-filter" method="get">
        <label><span>Tìm phiên</span><input type="search" name="q" defaultValue={search} maxLength={120} placeholder="Email, thiết bị hoặc cách đăng nhập" /></label>
        <label><span>Trạng thái</span><select name="status" defaultValue={status}><option value="all">Tất cả phiên</option><option value="active">Đang hoạt động</option><option value="revoked">Đã thu hồi</option></select></label>
        <button className="admin-button is-primary" type="submit">Lọc danh sách</button>
        {(search || status !== "all") && <a className="admin-button is-secondary" href="/admin/security">Xóa bộ lọc</a>}
      </form>
      {sessions.length === 0 ? <EmptyState title="Không có phiên phù hợp" description={sessionPage.summary.total === 0 ? "Phiên đăng nhập sẽ xuất hiện sau lần đăng nhập đầu tiên." : "Thử bỏ bớt từ khóa hoặc chọn trạng thái khác."} /> : <div className="admin-card-list">{sessions.map((session) => <SessionCard key={session.id} session={session} currentSessionId={currentSessionId} stepUpReady={state.context.stepUpReady} returnTo={pageHref(page)} />)}</div>}
      {totalPages > 1 && <nav className="admin-pagination" aria-label="Phân trang phiên đăng nhập">
        {page > 1 ? <a href={pageHref(page - 1)}>← Trang trước</a> : <span aria-disabled="true">← Trang trước</span>}
        <strong>Trang {page}/{totalPages} · {sessionPage.filteredTotal} kết quả</strong>
        {page < totalPages ? <a href={pageHref(page + 1)}>Trang sau →</a> : <span aria-disabled="true">Trang sau →</span>}
      </nav>}
    </AdminSection>
  </AdminShell>;
}

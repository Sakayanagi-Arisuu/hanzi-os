import { AdminSection, EmptyState, MetricCard } from "../adminComponents";
import { AdminShell, AdminState } from "../AdminShell";
import { loadAdminContext } from "../adminServer";
import { STUDIO_ITEM_PRESENTATION } from "../../../src/content/studioContent";
import { ContentStudioRepository } from "../../../src/server/contentStudioRepository";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 10;

export default async function AdminPublishingPage({
  searchParams,
}: {
  searchParams: Promise<{
    updated?: string;
    error?: string;
    q?: string;
    reviewPage?: string;
    releasePage?: string;
    failurePage?: string;
  }>;
}) {
  const state = await loadAdminContext("content:approve");
  if (state.kind !== "ok") return <AdminState kind={state.kind} />;
  const query = await searchParams;
  const search = query.q?.trim().slice(0, 120) ?? "";
  const requestedReviewPage = Math.max(1, Number.parseInt(query.reviewPage ?? "1", 10) || 1);
  const requestedReleasePage = Math.max(1, Number.parseInt(query.releasePage ?? "1", 10) || 1);
  const requestedFailurePage = Math.max(1, Number.parseInt(query.failurePage ?? "1", 10) || 1);
  let summary: Awaited<ReturnType<ContentStudioRepository["operationalSummary"]>>;
  let submitted: Awaited<ReturnType<ContentStudioRepository["list"]>>;
  let approved: Awaited<ReturnType<ContentStudioRepository["list"]>>;
  let submittedCount: number;
  let approvedCount: number;
  let failurePage: Awaited<ReturnType<ContentStudioRepository["listReleaseFailurePage"]>>;
  try {
    const repository = new ContentStudioRepository(state.context.database);
    [summary, submitted, approved, submittedCount, approvedCount, failurePage] = await Promise.all([
      repository.operationalSummary(),
      repository.list({ state: "submitted", query: search, limit: PAGE_SIZE, offset: (requestedReviewPage - 1) * PAGE_SIZE }),
      repository.list({ state: "approved", query: search, limit: PAGE_SIZE, offset: (requestedReleasePage - 1) * PAGE_SIZE }),
      repository.count({ state: "submitted", query: search }),
      repository.count({ state: "approved", query: search }),
      repository.listReleaseFailurePage({ limit: PAGE_SIZE, offset: (requestedFailurePage - 1) * PAGE_SIZE }),
    ]);
    const reviewPages = Math.max(1, Math.ceil(submittedCount / PAGE_SIZE));
    const releasePages = Math.max(1, Math.ceil(approvedCount / PAGE_SIZE));
    const failurePages = Math.max(1, Math.ceil(failurePage.filteredTotal / PAGE_SIZE));
    const corrections: Array<Promise<void>> = [];
    if (requestedReviewPage > reviewPages) corrections.push(repository.list({ state: "submitted", query: search, limit: PAGE_SIZE, offset: (reviewPages - 1) * PAGE_SIZE }).then((items) => { submitted = items; }));
    if (requestedReleasePage > releasePages) corrections.push(repository.list({ state: "approved", query: search, limit: PAGE_SIZE, offset: (releasePages - 1) * PAGE_SIZE }).then((items) => { approved = items; }));
    if (requestedFailurePage > failurePages) corrections.push(repository.listReleaseFailurePage({ limit: PAGE_SIZE, offset: (failurePages - 1) * PAGE_SIZE }).then((page) => { failurePage = page; }));
    await Promise.all(corrections);
  } catch {
    return <AdminState kind="offline" />;
  }
  const reviewPages = Math.max(1, Math.ceil(submittedCount / PAGE_SIZE));
  const releasePages = Math.max(1, Math.ceil(approvedCount / PAGE_SIZE));
  const failurePages = Math.max(1, Math.ceil(failurePage.filteredTotal / PAGE_SIZE));
  const reviewPage = Math.min(requestedReviewPage, reviewPages);
  const releasePage = Math.min(requestedReleasePage, releasePages);
  const currentFailurePage = Math.min(requestedFailurePage, failurePages);
  const pendingCount = summary.workflow.submitted + failurePage.filteredTotal;
  const pageHref = (pageKey: "reviewPage" | "releasePage" | "failurePage", nextPage: number) => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (pageKey !== "reviewPage" && reviewPage > 1) params.set("reviewPage", String(reviewPage));
    if (pageKey !== "releasePage" && releasePage > 1) params.set("releasePage", String(releasePage));
    if (pageKey !== "failurePage" && currentFailurePage > 1) params.set("failurePage", String(currentFailurePage));
    if (nextPage > 1) params.set(pageKey, String(nextPage));
    const suffix = params.toString();
    return `/admin/publishing${suffix ? `?${suffix}` : ""}`;
  };
  return <AdminShell
    current="publishing"
    title="Duyệt & phát hành"
    description="Kiểm tra bản đã gửi, mở nội dung để duyệt độc lập và theo dõi gói đã được đưa lên các module người học."
    authorization={state.context.account.authorization}
    stepUpReady={state.context.stepUpReady}
    showStepUpWarning
    badges={{ publishing: pendingCount }}
    status={query.error ? { kind: "error", message: query.error } : query.updated ? { kind: "updated", message: "Đã xử lý yêu cầu phát hành." } : null}
  >
    <AdminSection title="Trạng thái phát hành" description="Các bước nhạy cảm luôn yêu cầu phiên xác minh gần đây và người duyệt không được là người soạn bản đó." eyebrow="TỔNG QUAN">
      <div className="admin-metric-grid"><MetricCard value={summary.workflow.submitted} label="Chờ bạn duyệt" hint="Toàn bộ bản đang chờ" tone="gold" /><MetricCard value={summary.workflow.approved} label="Đã duyệt, chờ phát hành" hint="Sẵn sàng đưa lên học" tone="cyan" /><MetricCard value={summary.release.pending + summary.release.processing} label="Đang đồng bộ" hint="Hệ thống đang xử lý" /><MetricCard value={failurePage.filteredTotal} label="Cần khôi phục" hint="Có thể thử lại an toàn" tone={failurePage.filteredTotal > 0 ? "coral" : "jade"} /></div>
    </AdminSection>

    <AdminSection title="Tìm trong hàng phát hành" description="Tìm theo tên hoặc mã nội dung mà không làm thay đổi trạng thái bản đang xử lý." eyebrow="BỘ LỌC">
      <form className="admin-list-filter" method="get">
        <label><span>Tìm nội dung</span><input type="search" name="q" defaultValue={search} maxLength={120} placeholder="Tên hoặc mã nội dung" /></label>
        <button className="admin-button is-primary" type="submit">Lọc nội dung</button>
        {search && <a className="admin-button is-secondary" href="/admin/publishing">Xóa bộ lọc</a>}
      </form>
    </AdminSection>

    <AdminSection title="Bản chờ duyệt" description={`${submittedCount} bản khớp bộ lọc. Đọc nội dung, xem kết quả tự kiểm rồi duyệt hoặc yêu cầu sửa trong trang chi tiết.`} eyebrow="BƯỚC 1">
      {submitted.length === 0 ? <EmptyState title={summary.workflow.submitted === 0 ? "Không có bản nào chờ duyệt" : "Không có bản phù hợp"} description={summary.workflow.submitted === 0 ? "Khi Biên tập viên gửi bản mới, bản đó sẽ xuất hiện ở đây." : "Thử tìm bằng tên ngắn hơn hoặc xóa bộ lọc."} href={summary.workflow.submitted === 0 ? "/admin/workflow" : undefined} action={summary.workflow.submitted === 0 ? "Xem công việc" : undefined} /> : <div className="admin-release-grid">{submitted.map((revision) => <article className="admin-card admin-release-card" key={revision.id}><div><div className="admin-card-head"><span className="admin-tag gold">Chờ duyệt</span><span className="admin-tag neutral">{STUDIO_ITEM_PRESENTATION[revision.itemType].label}</span></div><strong>{revision.title}</strong><p>{revision.level.toUpperCase()} · Bản {revision.revision} · cập nhật {new Date(revision.updatedAt).toLocaleDateString("vi-VN")}</p></div><div className="admin-card-actions-simple"><span className="admin-action-glyph" aria-hidden="true">DP</span><a className="admin-content-link" href={`/studio/items/${encodeURIComponent(revision.id)}`}>Mở để duyệt</a></div></article>)}</div>}
      {reviewPages > 1 && <nav className="admin-pagination" aria-label="Phân trang bản chờ duyệt">{reviewPage > 1 ? <a href={pageHref("reviewPage", reviewPage - 1)}>← Trang trước</a> : <span aria-disabled="true">← Trang trước</span>}<strong>Trang {reviewPage}/{reviewPages} · {submittedCount} kết quả</strong>{reviewPage < reviewPages ? <a href={pageHref("reviewPage", reviewPage + 1)}>Trang sau →</a> : <span aria-disabled="true">Trang sau →</span>}</nav>}
    </AdminSection>

    <AdminSection title="Bản đã duyệt, chờ đưa lên học" description={`${approvedCount} bản khớp bộ lọc. Người học chỉ thấy bản sau khi hệ thống đồng bộ thành công.`} eyebrow="BƯỚC 2">
      {approved.length === 0 ? <EmptyState title={summary.workflow.approved === 0 ? "Chưa có bản sẵn sàng phát hành" : "Không có bản phù hợp"} description={summary.workflow.approved === 0 ? "Các bản được duyệt sẽ nằm ở đây trước khi đưa lên học." : "Thử tìm bằng tên ngắn hơn hoặc xóa bộ lọc."} /> : <div className="admin-release-grid">{approved.map((revision) => <article className="admin-card admin-release-card" key={revision.id}><div><div className="admin-card-head"><span className="admin-tag jade">Đã duyệt</span><span className="admin-tag neutral">{STUDIO_ITEM_PRESENTATION[revision.itemType].label}</span></div><strong>{revision.title}</strong><p>{revision.level.toUpperCase()} · Bản {revision.revision} · sẵn sàng phát hành</p></div><div className="admin-card-actions-simple"><span className="admin-action-glyph" aria-hidden="true">OK</span><a className="admin-content-link" href={`/studio/items/${encodeURIComponent(revision.id)}`}>Kiểm tra & phát hành</a></div></article>)}</div>}
      {releasePages > 1 && <nav className="admin-pagination" aria-label="Phân trang bản chờ phát hành">{releasePage > 1 ? <a href={pageHref("releasePage", releasePage - 1)}>← Trang trước</a> : <span aria-disabled="true">← Trang trước</span>}<strong>Trang {releasePage}/{releasePages} · {approvedCount} kết quả</strong>{releasePage < releasePages ? <a href={pageHref("releasePage", releasePage + 1)}>Trang sau →</a> : <span aria-disabled="true">Trang sau →</span>}</nav>}
    </AdminSection>

    <AdminSection title="Sự cố đồng bộ" description="Thử lại chỉ gửi lại đúng gói bất biến; hệ thống không tạo bản sao hoặc làm mất tiến độ người học." eyebrow="BƯỚC 3">
      {failurePage.events.length === 0 ? <EmptyState title="Chưa có sự cố cần khôi phục" description="Hệ thống sẽ ghi lại các gói không đồng bộ được để bạn xử lý ở đây." /> : <div className="admin-card-list">{failurePage.events.map((event) => <article className="admin-card admin-queue-card" key={event.id}><div className="admin-queue-card-head"><div><div className="admin-tag-list"><span className="admin-tag coral">Đồng bộ thất bại</span><span className="admin-tag neutral">Đã thử {event.attempts} lần</span></div><strong>Gói nội dung cần kiểm tra</strong><small>Tạo {new Date(event.createdAt).toLocaleString("vi-VN")}</small>{event.errorCode && <details className="admin-technical-detail"><summary>Xem mã lỗi nội bộ</summary><p>{event.errorCode}</p></details>}</div><span className="admin-action-glyph" aria-hidden="true">RL</span></div><form action="/admin/releases" method="post"><input type="hidden" name="eventId" value={event.id} /><input type="hidden" name="returnTo" value={pageHref("failurePage", currentFailurePage)} /><button className={state.context.stepUpReady ? "admin-button is-danger" : "admin-button is-disabled"} type="submit" disabled={!state.context.stepUpReady}>Thử đồng bộ lại</button></form></article>)}</div>}
      {failurePages > 1 && <nav className="admin-pagination" aria-label="Phân trang sự cố đồng bộ">{currentFailurePage > 1 ? <a href={pageHref("failurePage", currentFailurePage - 1)}>← Trang trước</a> : <span aria-disabled="true">← Trang trước</span>}<strong>Trang {currentFailurePage}/{failurePages} · {failurePage.filteredTotal} kết quả</strong>{currentFailurePage < failurePages ? <a href={pageHref("failurePage", currentFailurePage + 1)}>Trang sau →</a> : <span aria-disabled="true">Trang sau →</span>}</nav>}
    </AdminSection>
  </AdminShell>;
}

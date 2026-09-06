import { AdminSection, EmptyState, MetricCard, formatDate, priorityLabel } from "../adminComponents";
import { AdminShell, AdminState } from "../AdminShell";
import { loadAdminContext } from "../adminServer";
import { STUDIO_ITEM_PRESENTATION } from "../../../src/content/studioContent";
import { AuthorizationRepository } from "../../../src/server/authorizationRepository";
import { ContentStudioRepository, STUDIO_ASSIGNMENT_PRIORITIES } from "../../../src/server/contentStudioRepository";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 12;

const localDateTimeValue = (timestamp: number | null) => {
  if (!timestamp) return "";
  const date = new Date(timestamp - new Date(timestamp).getTimezoneOffset() * 60_000);
  return date.toISOString().slice(0, 16);
};

export default async function AdminWorkflowPage({
  searchParams,
}: {
  searchParams: Promise<{
    updated?: string;
    error?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const state = await loadAdminContext("content:approve");
  if (state.kind !== "ok") return <AdminState kind={state.kind} />;

  const query = await searchParams;
  const search = query.q?.trim().slice(0, 120) ?? "";
  const requestedPage = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  try {
    const repository = new ContentStudioRepository(state.context.database);
    const authorizationRepository = new AuthorizationRepository(state.context.database);
    const [initialQueuePage, editorPage, reviewerPage, summary] = await Promise.all([
      repository.coordinationQueuePage({
        query: search,
        limit: PAGE_SIZE,
        offset: (requestedPage - 1) * PAGE_SIZE,
      }),
      authorizationRepository.listUserPage({ role: "content_editor", status: "active", limit: 50 }),
      authorizationRepository.listUserPage({ role: "admin", status: "active", limit: 50 }),
      repository.operationalSummary(),
    ]);
    let queuePage = initialQueuePage;
    const availablePages = Math.max(1, Math.ceil(queuePage.filteredTotal / PAGE_SIZE));
    if (requestedPage > availablePages) {
      queuePage = await repository.coordinationQueuePage({
        query: search,
        limit: PAGE_SIZE,
        offset: (availablePages - 1) * PAGE_SIZE,
      });
    }
    const totalPages = Math.max(1, Math.ceil(queuePage.filteredTotal / PAGE_SIZE));
    const page = Math.min(requestedPage, totalPages);
    const pageHref = (nextPage: number) => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (nextPage > 1) params.set("page", String(nextPage));
      const suffix = params.toString();
      return `/admin/workflow${suffix ? `?${suffix}` : ""}`;
    };
    const queue = queuePage.revisions;
    const assignments = await repository.assignmentsFor(queue);
    const assignmentByRevisionId = new Map(assignments.map((assignment) => [assignment.revisionId, assignment]));
    const editorCandidates = editorPage.users;
    const reviewerCandidates = reviewerPage.users;
    const now = Date.now();
    const openTotal = Object.entries(summary.workflow)
      .filter(([workflowState]) => workflowState !== "published" && workflowState !== "archived")
      .reduce((total, [, count]) => total + count, 0);
    const overdue = summary.assignment.overdue;
    const withoutReviewer = summary.assignment.withoutReviewer;
    return <AdminShell
      current="workflow"
      title="Công việc biên tập"
      description="Phân công người soạn, người duyệt và hạn xử lý. Bạn chỉ cần làm việc trên danh sách này; không phải lục trong toàn bộ hệ thống."
      authorization={state.context.account.authorization}
      stepUpReady={state.context.stepUpReady}
      showStepUpWarning
      badges={{ workflow: overdue + withoutReviewer }}
      status={query.error ? { kind: "error", message: query.error } : query.updated ? { kind: "updated", message: "Đã lưu phân công." } : null}
    >
      <AdminSection title="Nhìn nhanh hàng công việc" description="Các số này giúp bạn biết cần ưu tiên gì trước, không phải là điểm chất lượng nội dung." eyebrow="HÔM NAY">
        <div className="admin-workflow-summary"><MetricCard value={openTotal} label="Việc đang mở" hint="Toàn bộ việc chưa phát hành hoặc lưu trữ" /><MetricCard value={overdue} label="Đã quá hạn" hint="Đưa lên đầu danh sách" tone={overdue > 0 ? "coral" : "jade"} /><MetricCard value={withoutReviewer} label="Chưa có người duyệt" hint="Cần tách vai trò độc lập" tone={withoutReviewer > 0 ? "gold" : "jade"} /></div>
      </AdminSection>

      <AdminSection title="Danh sách cần xử lý" description={`${queuePage.filteredTotal} bản nội dung khớp bộ lọc. Chọn người phụ trách, người duyệt và hạn xử lý rồi lưu phân công.`} eyebrow="PHÂN CÔNG" action={<a className="admin-button is-secondary" href="/studio">Mở Biên Tập Viện</a>}>
        <form className="admin-list-filter" method="get">
          <label><span>Tìm nội dung</span><input type="search" name="q" defaultValue={search} maxLength={120} placeholder="Tên hoặc mã nội dung" /></label>
          <button className="admin-button is-primary" type="submit">Lọc công việc</button>
          {search && <a className="admin-button is-secondary" href="/admin/workflow">Xóa bộ lọc</a>}
        </form>
        {queue.length === 0 ? <EmptyState title={openTotal === 0 ? "Hiện chưa có việc cần phân công" : "Không có nội dung phù hợp"} description={openTotal === 0 ? "Khi Biên tập viên gửi bản nháp, nội dung sẽ xuất hiện ở đây." : "Thử tìm bằng tên ngắn hơn hoặc xóa bộ lọc."} href={openTotal === 0 ? "/admin/content" : undefined} action={openTotal === 0 ? "Xem kho nội dung" : undefined} /> : <div className="admin-card-list">{queue.map((revision) => {
          const assignment = assignmentByRevisionId.get(revision.id)!;
          const ownerKnown = editorCandidates.some((candidate) => candidate.userId === assignment.ownerUserId);
          const reviewerOptions = reviewerCandidates.filter((candidate) => candidate.userId !== assignment.ownerUserId && candidate.userId !== revision.authorUserId);
          const reviewerKnown = !assignment.reviewerUserId || reviewerOptions.some((candidate) => candidate.userId === assignment.reviewerUserId);
          const isOverdue = assignment.dueAt !== null && assignment.dueAt !== undefined && assignment.dueAt < now;
          return <article className={`admin-card admin-queue-card${isOverdue ? " is-overdue" : ""}`} key={revision.id}>
            <div className="admin-queue-card-head"><div><div className="admin-tag-list"><span className="admin-tag neutral">{STUDIO_ITEM_PRESENTATION[revision.itemType].label}</span><span className={`admin-tag ${isOverdue ? "coral" : "cyan"}`}>{isOverdue ? "Quá hạn" : revision.workflowState === "submitted" ? "Chờ duyệt" : revision.workflowState === "approved" ? "Đã duyệt" : "Đang soạn"}</span><span className="admin-tag gold">Ưu tiên {priorityLabel(assignment.priority)}</span></div><strong>{revision.title}</strong><small>{revision.level.toUpperCase()} · cập nhật {formatDate(revision.updatedAt, true)}</small></div><a href={`/studio/items/${encodeURIComponent(revision.id)}`}>Mở nội dung</a></div>
            <form className="admin-assignment-form" action="/admin/editorial-assignments" method="post">
              <input type="hidden" name="revisionId" value={revision.id} />
              <input type="hidden" name="expectedAssignmentRowVersion" value={assignment.rowVersion} />
              <input type="hidden" name="idempotencyKey" value={`assignment:${crypto.randomUUID()}`} />
              <input type="hidden" name="returnTo" value={pageHref(page)} />
              <label><span>Biên tập viên phụ trách</span><select name="ownerUserId" defaultValue={assignment.ownerUserId} required>{!ownerKnown && <option value={assignment.ownerUserId}>Người hiện tại · cần rà quyền</option>}{editorCandidates.map((candidate) => <option value={candidate.userId} key={candidate.userId}>{candidate.email || "Biên tập viên chưa có email"}</option>)}</select></label>
              <label><span>Người duyệt độc lập</span><select name="reviewerUserId" defaultValue={assignment.reviewerUserId ?? ""}><option value="">Chưa chỉ định</option>{!reviewerKnown && assignment.reviewerUserId && <option value={assignment.reviewerUserId}>Người hiện tại · cần rà quyền</option>}{reviewerOptions.map((candidate) => <option value={candidate.userId} key={candidate.userId}>{candidate.email || "Quản trị viên chưa có email"}</option>)}</select></label>
              <label><span>Mức ưu tiên</span><select name="priority" defaultValue={assignment.priority}>{STUDIO_ASSIGNMENT_PRIORITIES.map((priority) => <option value={priority} key={priority}>{priorityLabel(priority)}</option>)}</select></label>
              <label><span>Hạn xử lý</span><input type="datetime-local" name="dueAt" defaultValue={localDateTimeValue(assignment.dueAt)} /></label>
              <label><span>Ghi chú cho người nhận</span><textarea name="note" defaultValue={assignment.note ?? ""} maxLength={1000} placeholder="Ví dụ: kiểm tra phần thanh điệu trước khi gửi duyệt" /></label>
              <button className="admin-button is-primary" type="submit">Lưu phân công</button>
            </form>
          </article>;
        })}</div>}
        {totalPages > 1 && <nav className="admin-pagination" aria-label="Phân trang công việc biên tập">
          {page > 1 ? <a href={pageHref(page - 1)}>← Trang trước</a> : <span aria-disabled="true">← Trang trước</span>}
          <strong>Trang {page}/{totalPages} · {queuePage.filteredTotal} kết quả</strong>
          {page < totalPages ? <a href={pageHref(page + 1)}>Trang sau →</a> : <span aria-disabled="true">Trang sau →</span>}
        </nav>}
      </AdminSection>
    </AdminShell>;
  } catch {
    return <AdminState kind="offline" />;
  }
}

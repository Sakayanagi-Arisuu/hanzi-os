import {
  ArrowLeft,
  BookOpenText,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  GitFork,
  GitCompareArrows,
  LockKeyhole,
  Network,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";
import { getAuthenticatedUser } from "../../../chatgpt-auth";
import { hasPermission } from "../../../../src/auth/authorization";
import {
  STUDIO_ITEM_PRESENTATION,
  STUDIO_WORKFLOW_LABELS,
} from "../../../../src/content/studioContent";
import { analyzeStudioRevision } from "../../../../src/content/studioRevisionAnalysis";
import { StudioContentPreview } from "../../../../src/components/StudioContentPreview";
import { resolveAuthorizedAccount } from "../../../../src/server/authorizationRepository";
import {
  ContentStudioNotFoundError,
  ContentStudioRepository,
} from "../../../../src/server/contentStudioRepository";
import { getD1Database } from "../../../../src/server/d1";
import { hskMockExamEditorialSuggestions } from "../../../../src/server/hskMockExamBank";
import { recentFirstPartySession } from "../../../../src/server/authHttp";
import { StudioStructuredEditor } from "../../StudioStructuredEditor";

export const dynamic = "force-dynamic";

const actionFor = (state: string) => state === "validated"
  ? { action: "submit", label: "Gửi phê duyệt", className: "gold" }
  : state === "submitted"
    ? { action: "approve", label: "Phê duyệt nội dung", className: "" }
    : state === "approved"
      ? { action: "publish", label: "Phát hành cho người học", className: "" }
      : state === "published"
        ? { action: "archive", label: "Ngừng phát hành", className: "danger" }
        : null;

const stateClass = (state: string) => state === "published"
  ? "studio-badge green"
  : state === "submitted" || state === "approved"
    ? "studio-badge gold"
    : "studio-badge";

const validationLabels: Record<string, string> = {
  structure: "Đủ trường bắt buộc",
  contextualChinese: "Đủ Trung–Pinyin–Việt",
  answerIntegrity: "Đáp án nhất quán",
  fivePassAiReview: "Đã tự kiểm chất lượng",
  localStudyDisclosure: "Đúng phạm vi phát hành",
};

function RevisionLocked({ missing = false }: { missing?: boolean }) {
  return <main className="studio-state"><section className="studio-state-card"><LockKeyhole size={34} /><span className="studio-kicker">BIÊN TẬP CÓ PHÂN QUYỀN</span><h1>{missing ? "Không tìm thấy bản nội dung" : "Bàn biên tập đang khóa"}</h1><p>{missing ? "Bản này không tồn tại hoặc đã không còn trong phạm vi tài khoản." : "Đăng nhập bằng tài khoản Biên tập viên để tiếp tục."}</p><a href={missing ? "/studio" : "/signin?returnTo=%2Fstudio"}>{missing ? "Trở về Biên Tập Viện" : "Đăng nhập"}</a></section></main>;
}

export default async function StudioRevisionPage({
  params,
  searchParams,
}: {
  params: Promise<{ revisionId: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const identity = await getAuthenticatedUser();
  const route = await params;
  if (!identity) return <RevisionLocked />;
  try {
    const database = await getD1Database();
    const account = await resolveAuthorizedAccount(database, identity);
    if (!hasPermission(account.authorization, "content:workspace:read")) {
      return <RevisionLocked missing />;
    }
    const repository = new ContentStudioRepository(database);
    const revision = await repository.getRevision(route.revisionId);
    const [history, assignments, assignmentHistory, referencedBy] = await Promise.all([
      repository.history(revision.itemId),
      repository.assignmentsFor([revision]),
      repository.assignmentHistory(revision.id),
      repository.referencedBy(revision),
    ]);
    const assignment = assignments[0];
    const source = revision.basedOnRevisionId
      ? await repository.getRevision(revision.basedOnRevisionId)
      : history.revisions.find((entry) => entry.revision === revision.revision - 1) ?? null;
    const analysis = analyzeStudioRevision({
      itemType: revision.itemType,
      current: revision,
      baseline: source,
    });
    const outboundCounts = analysis.outboundLinks.reduce((counts, link) => {
      counts.set(link.kind, (counts.get(link.kind) ?? 0) + 1);
      return counts;
    }, new Map<string, number>());
    const query = await searchParams;
    const stepUpReady = recentFirstPartySession(identity) !== null;
    const canEdit = revision.workflowState === "draft"
      && hasPermission(account.authorization, "content:drafts:write");
    const canValidate = revision.workflowState === "draft"
      && hasPermission(account.authorization, "content:validation:run");
    const nextAction = actionFor(revision.workflowState);
    const hasTransitionPermission = nextAction?.action === "submit"
      ? hasPermission(account.authorization, "content:submit")
      : nextAction?.action === "approve"
        ? hasPermission(account.authorization, "content:approve")
        : nextAction
          ? hasPermission(account.authorization, "content:publish")
          : false;
    const canTransition = hasTransitionPermission
      && (nextAction?.action === "submit" || stepUpReady);
    const canReview = revision.workflowState === "submitted"
      && hasPermission(account.authorization, "content:approve")
      && stepUpReady;
    const canFork = ["published", "archived"].includes(revision.workflowState)
      && hasPermission(account.authorization, "content:drafts:write");
    const presentation = STUDIO_ITEM_PRESENTATION[revision.itemType];
    const examFormSuggestions = revision.itemType === "exam_form"
      ? hskMockExamEditorialSuggestions((await repository.publishedRuntime({
        itemType: "exam_item",
      })).items)
      : undefined;

    return <main className="studio-page"><div className="studio-shell">
      <nav className="studio-topbar" aria-label="Điều hướng bàn biên tập">
        <a className="studio-brand" href="/studio"><span><Sparkles size={21} /></span><span><strong>HANZI.OS · BIÊN TẬP VIỆN</strong><small>BÀN NỘI DUNG · BẢN {revision.revision}</small></span></a>
        <div className="studio-nav"><a href="/studio"><ArrowLeft size={17} /><span>Thư khố</span></a><a href="/account/security"><UserRoundCheck size={17} /><span>Tài khoản</span></a>{hasPermission(account.authorization, "admin:users:read") && <a href="/admin"><ShieldCheck size={17} /><span>Cổng Quản Trị</span></a>}</div>
      </nav>

      <header className="studio-revision-hero">
        <div className="studio-badge-row"><span className={stateClass(revision.workflowState)}>{STUDIO_WORKFLOW_LABELS[revision.workflowState]}</span><span className="studio-badge">{presentation.module}</span><span className="studio-badge">{revision.level.toUpperCase()}</span></div>
        <h1>{revision.title}</h1>
        <p>{presentation.label} · bản {revision.revision}. Nội dung đang phát hành không sửa trực tiếp; hệ thống luôn tạo một bản nháp mới để giữ an toàn cho người học.</p>
        {query.notice && <div className="studio-alert" role="status"><CheckCircle2 size={18} /> {query.notice}</div>}
        {query.error && <div className="studio-alert error" role="alert">{query.error}</div>}
      </header>

      <section className="studio-section" aria-labelledby="assignment-title">
        <header className="studio-section-heading"><div><span className="studio-kicker">ĐIỀU PHỐI BIÊN TẬP</span><h2 id="assignment-title">Trách nhiệm và hạn xử lý</h2></div><p>Phân công do Điều Hành Viên quản lý. Mỗi thay đổi được lưu nối tiếp để không mất dấu người chịu trách nhiệm.</p></header>
        <div className="studio-ops-grid">
          <article><UserRoundCheck size={20} /><span><small>Người phụ trách</small><strong>{assignment?.ownerUserId === account.userId ? "Bạn đang phụ trách" : "Biên tập viên đã được phân công"}</strong></span></article>
          <article><ShieldCheck size={20} /><span><small>Người duyệt độc lập</small><strong>{assignment?.reviewerUserId ? "Đã chỉ định Điều Hành Viên" : "Chưa chỉ định"}</strong></span></article>
          <article className={assignment?.dueAt && assignment.dueAt < Date.now() ? "overdue" : ""}><CalendarClock size={20} /><span><small>Hạn xử lý · {assignment?.priority === "urgent" ? "Khẩn" : assignment?.priority === "high" ? "Cao" : assignment?.priority === "low" ? "Thấp" : "Bình thường"}</small><strong>{assignment?.dueAt ? new Date(assignment.dueAt).toLocaleString("vi-VN") : "Chưa đặt hạn"}</strong></span></article>
        </div>
        {assignment?.note && <div className="studio-editorial-note"><strong>Lưu ý điều phối</strong><p>{assignment.note}</p></div>}
      </section>

      {canEdit ? <section className="studio-section" aria-labelledby="editor-title">
        <header className="studio-section-heading"><div><span className="studio-kicker">BÀN SOẠN NỘI DUNG</span><h2 id="editor-title">Chỉnh sửa bằng biểu mẫu</h2></div><p>Mọi trường kỹ thuật được hệ thống tự xử lý. Hãy tập trung vào tiếng Trung, Pinyin, nghĩa Việt và chất lượng sư phạm.</p></header>
        <StudioStructuredEditor mode="update" draftSeed={crypto.randomUUID().slice(0, 8)} revisionId={revision.id} expectedRowVersion={revision.rowVersion} initialItemType={revision.itemType} initialLevel={revision.level} initialTitle={revision.title} initialStableKey={revision.stableKey} initialContent={revision.content} examFormSuggestions={examFormSuggestions} />
      </section> : <section className="studio-section" aria-labelledby="preview-title"><header className="studio-section-heading"><div><span className="studio-kicker">NỘI DUNG ĐÃ KHÓA</span><h2 id="preview-title">Bản xem trước</h2></div><p>Trạng thái hiện tại không cho phép sửa trực tiếp. Bạn vẫn có thể xem đúng cách nội dung xuất hiện trong giao diện học.</p></header><StudioContentPreview revisionId={revision.id} itemType={revision.itemType} content={revision.content} /></section>}

      <section className="studio-section" aria-labelledby="impact-title">
        <header className="studio-section-heading"><div><span className="studio-kicker">LIÊN KẾT TOÀN HỆ THỐNG</span><h2 id="impact-title">Thay đổi và phạm vi ảnh hưởng</h2></div><p>Đọc được nội dung nào đã đổi, đang nối tới nguồn nào và module nào cần kiểm tra trước khi phát hành.</p></header>
        <div className="studio-impact-summary">
          <article><GitCompareArrows size={21} /><span><strong>{analysis.changes.length + analysis.changeOverflow}</strong><small>trường thay đổi so với {source ? `bản ${source.revision}` : "bản khởi đầu"}</small></span></article>
          <article><Network size={21} /><span><strong>{analysis.outboundLinks.length}</strong><small>liên kết nguồn được khai báo</small></span></article>
          <article><BookOpenText size={21} /><span><strong>{referencedBy.length}</strong><small>nội dung khác đang tham chiếu</small></span></article>
        </div>
        <div className="studio-impact-columns">
          <div><h3>Module cần kiểm tra</h3><div className="studio-badge-row">{analysis.affectedModules.map((module) => <span className="studio-badge green" key={module}>{module}</span>)}</div></div>
          <div><h3>Loại liên kết nguồn</h3><div className="studio-badge-row">{[...outboundCounts.entries()].map(([kind, count]) => <span className="studio-badge" key={kind}>{kind === "lesson" ? "Bài học" : kind === "vocabulary" ? "Từ vựng" : kind === "assessment" ? "Câu hỏi/đề" : kind === "skill" ? "Kỹ năng" : "Nội dung"}: {count}</span>)}{outboundCounts.size === 0 && <span className="studio-badge gold">Chưa khai báo liên kết nguồn</span>}</div></div>
        </div>
        <div className="studio-change-list">{analysis.changes.map((change) => <article key={change.path}><span className={`studio-change-kind ${change.kind}`}>{change.kind === "added" ? "Thêm" : change.kind === "removed" ? "Bỏ" : "Sửa"}</span><div><strong>{change.label}</strong>{change.before !== null && <small>Cũ: {change.before}</small>}{change.after !== null && <small>Mới: {change.after}</small>}</div></article>)}{analysis.changes.length === 0 && <div className="studio-empty"><p>Không có thay đổi nội dung so với bản nguồn.</p></div>}{analysis.changeOverflow > 0 && <p className="studio-overflow-note">Còn {analysis.changeOverflow} thay đổi chi tiết; danh sách được rút gọn để dễ rà soát.</p>}</div>
        {referencedBy.length > 0 && <div className="studio-reference-consumers"><h3>Nội dung đang phụ thuộc vào bản này</h3>{referencedBy.map((consumer) => <a href={`/studio/items/${encodeURIComponent(consumer.id)}`} key={consumer.id}><span><strong>{consumer.title}</strong><small>{STUDIO_ITEM_PRESENTATION[consumer.itemType].label} · {STUDIO_WORKFLOW_LABELS[consumer.workflowState]}</small></span><Network size={16} /></a>)}</div>}
      </section>

      <section className="studio-section" aria-labelledby="workflow-title">
        <header className="studio-section-heading"><div><span className="studio-kicker">CỔNG KIỂM ĐỊNH</span><h2 id="workflow-title">Bước tiếp theo</h2></div><p>Mỗi hành động chỉ xuất hiện khi tài khoản có đúng quyền và nội dung ở đúng trạng thái.</p></header>
        <div className="studio-workflow-bar">
          {canValidate && <form action="/studio/actions" method="post"><input type="hidden" name="action" value="validate" /><input type="hidden" name="revisionId" value={revision.id} /><input type="hidden" name="expectedRowVersion" value={revision.rowVersion} /><input type="hidden" name="idempotencyKey" value={`studio-validate:${crypto.randomUUID()}`} /><button type="submit"><ShieldCheck size={17} /> Kiểm định nội dung</button></form>}
          {nextAction && canTransition && <form className="studio-transition-form" action="/studio/actions" method="post"><input type="hidden" name="action" value={nextAction.action} /><input type="hidden" name="revisionId" value={revision.id} /><input type="hidden" name="expectedRowVersion" value={revision.rowVersion} /><input type="hidden" name="idempotencyKey" value={`studio-${nextAction.action}:${crypto.randomUUID()}`} />{nextAction.action !== "submit" && <label><span>{nextAction.action === "approve" ? "Nhận xét phê duyệt" : nextAction.action === "publish" ? "Ghi chú phát hành" : "Lý do ngừng phát hành"}</span><textarea name="note" required minLength={3} maxLength={1000} /></label>}<button className={nextAction.className} type="submit"><Send size={17} /> {nextAction.label}</button></form>}
          {canReview && <form className="studio-transition-form" action="/studio/actions" method="post"><input type="hidden" name="action" value="request_changes" /><input type="hidden" name="revisionId" value={revision.id} /><input type="hidden" name="expectedRowVersion" value={revision.rowVersion} /><input type="hidden" name="idempotencyKey" value={`studio-request-changes:${crypto.randomUUID()}`} /><label><span>Điểm cần chỉnh sửa</span><textarea name="note" required minLength={3} maxLength={1000} placeholder="Nêu rõ vị trí, vấn đề và kết quả mong muốn…" /></label><button className="danger" type="submit"><RotateCcw size={17} /> Yêu cầu chỉnh sửa</button></form>}
          {canFork && <form action="/studio/actions" method="post"><input type="hidden" name="action" value="fork" /><input type="hidden" name="revisionId" value={revision.id} /><input type="hidden" name="idempotencyKey" value={`studio-fork:${crypto.randomUUID()}`} /><button type="submit"><GitFork size={17} /> Tạo bản nháp mới từ nội dung này</button></form>}
          {!stepUpReady && hasTransitionPermission && nextAction?.action !== "submit" && <p className="studio-step-up">Thao tác duyệt hoặc phát hành cần xác minh lại. <a href={`/signin?returnTo=${encodeURIComponent(`/studio/items/${revision.id}`)}&stepUp=1`}>Xác minh tài khoản</a>.</p>}
          {!canValidate && !canTransition && !canFork && !(hasTransitionPermission && !stepUpReady) && <p>Chưa có hành động nào khả dụng với trạng thái và quyền hiện tại.</p>}
        </div>
      </section>

      <section className="studio-section" aria-labelledby="validation-title">
        <header className="studio-section-heading"><div><span className="studio-kicker">KẾT QUẢ KIỂM ĐỊNH</span><h2 id="validation-title">Nội dung đã sẵn sàng chưa?</h2></div><p>Hệ thống kiểm tra cấu trúc, ngữ cảnh, đáp án và checklist chất lượng trước khi cho gửi duyệt.</p></header>
        {revision.validation ? <div className="studio-validation"><div className="studio-badge-row"><span className={revision.validation.valid ? "studio-badge green" : "studio-badge gold"}>{revision.validation.valid ? "Đạt kiểm định" : "Cần chỉnh sửa"}</span>{Object.entries(revision.validation.checks).map(([key, value]) => <span className={value ? "studio-badge green" : "studio-badge gold"} key={key}>{validationLabels[key] ?? key}: {value ? "Đạt" : "Chưa đạt"}</span>)}</div>{revision.validation.errors.length > 0 && <ul className="studio-validation-list">{revision.validation.errors.map((issue) => <li key={`${issue.path}:${issue.message}`}>{issue.message}</li>)}</ul>}{revision.validation.warnings.length > 0 && <ul className="studio-validation-list">{revision.validation.warnings.map((issue) => <li key={`${issue.path}:${issue.message}`}>{issue.message}</li>)}</ul>}</div> : <div className="studio-empty"><p>Hãy lưu bản nháp rồi chọn “Kiểm định nội dung”.</p></div>}
      </section>

      {canEdit && <section className="studio-section" aria-labelledby="real-preview-title"><header className="studio-section-heading"><div><span className="studio-kicker">XEM TRƯỚC</span><h2 id="real-preview-title">Giao diện người học hiện tại</h2></div><p>Bản xem trước không tạo tiến độ, XP, bằng chứng học hay mở khóa bài.</p></header><StudioContentPreview revisionId={revision.id} itemType={revision.itemType} content={revision.content} /></section>}

      <details className="studio-disclosure"><summary><ChevronDown size={17} /> Lịch sử và thông tin kiểm soát</summary><div>
        <p>{source ? `Bản này được phát triển từ bản ${source.revision} (${STUDIO_WORKFLOW_LABELS[source.workflowState]}).` : "Đây là bản đầu tiên của nội dung này."}</p>
        {assignmentHistory.length > 0 && <><h3>Lịch sử phân công</h3><div className="studio-history-grid">{assignmentHistory.map((entry) => <article className="studio-history-card" key={entry.id}><span className="studio-badge">Phân công lần {entry.rowVersion}</span><p>{entry.reviewerUserId ? "Đã chỉ định người phụ trách và người duyệt độc lập." : "Đã chỉ định người phụ trách; chưa có người duyệt độc lập."}</p>{entry.note && <p>{entry.note}</p>}<small>{entry.occurredAt ? new Date(entry.occurredAt).toLocaleString("vi-VN") : ""}</small></article>)}</div></>}
        <h3>Lịch sử kiểm định và phát hành</h3>
        <div className="studio-history-grid">{history.events.map((event) => <article className="studio-history-card" key={event.id}><span className={stateClass(event.toState)}>{event.fromState ? `${STUDIO_WORKFLOW_LABELS[event.fromState]} → ` : ""}{STUDIO_WORKFLOW_LABELS[event.toState]}</span>{typeof event.metadata.note === "string" && event.metadata.note && <p>{event.metadata.note}</p>}<small>{new Date(event.occurredAt).toLocaleString("vi-VN")}</small></article>)}</div>
      </div></details>
    </div></main>;
  } catch (error) {
    return <RevisionLocked missing={error instanceof ContentStudioNotFoundError} />;
  }
}

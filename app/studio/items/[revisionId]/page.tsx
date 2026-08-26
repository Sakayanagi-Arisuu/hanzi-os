import {
  ArrowLeft,
  BookOpenText,
  CheckCircle2,
  ChevronDown,
  GitFork,
  LockKeyhole,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getAuthenticatedUser } from "../../../chatgpt-auth";
import { hasPermission } from "../../../../src/auth/authorization";
import {
  STUDIO_ITEM_PRESENTATION,
  STUDIO_WORKFLOW_LABELS,
} from "../../../../src/content/studioContent";
import { StudioContentPreview } from "../../../../src/components/StudioContentPreview";
import { resolveAuthorizedAccount } from "../../../../src/server/authorizationRepository";
import {
  ContentStudioNotFoundError,
  ContentStudioRepository,
} from "../../../../src/server/contentStudioRepository";
import { getD1Database } from "../../../../src/server/d1";
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
    const history = await repository.history(revision.itemId);
    const source = revision.basedOnRevisionId
      ? await repository.getRevision(revision.basedOnRevisionId)
      : history.revisions.find((entry) => entry.revision === revision.revision - 1) ?? null;
    const query = await searchParams;
    const canEdit = revision.workflowState === "draft"
      && hasPermission(account.authorization, "content:drafts:write");
    const canValidate = revision.workflowState === "draft"
      && hasPermission(account.authorization, "content:validation:run");
    const nextAction = actionFor(revision.workflowState);
    const canTransition = nextAction?.action === "submit"
      ? hasPermission(account.authorization, "content:submit")
      : nextAction?.action === "approve"
        ? hasPermission(account.authorization, "content:approve")
        : nextAction
          ? hasPermission(account.authorization, "content:publish")
          : false;
    const canFork = ["published", "archived"].includes(revision.workflowState)
      && hasPermission(account.authorization, "content:drafts:write");
    const presentation = STUDIO_ITEM_PRESENTATION[revision.itemType];

    return <main className="studio-page"><div className="studio-shell">
      <nav className="studio-topbar" aria-label="Điều hướng bàn biên tập">
        <a className="studio-brand" href="/studio"><span><Sparkles size={21} /></span><span><strong>HANZI.OS · BIÊN TẬP VIỆN</strong><small>BÀN NỘI DUNG · BẢN {revision.revision}</small></span></a>
        <div className="studio-nav"><a href="/studio"><ArrowLeft size={17} /><span>Thư khố</span></a><a href="/path"><BookOpenText size={17} /><span>Không gian học</span></a></div>
      </nav>

      <header className="studio-revision-hero">
        <div className="studio-badge-row"><span className={stateClass(revision.workflowState)}>{STUDIO_WORKFLOW_LABELS[revision.workflowState]}</span><span className="studio-badge">{presentation.module}</span><span className="studio-badge">{revision.level.toUpperCase()}</span></div>
        <h1>{revision.title}</h1>
        <p>{presentation.label} · bản {revision.revision}. Nội dung đang phát hành không sửa trực tiếp; hệ thống luôn tạo một bản nháp mới để giữ an toàn cho người học.</p>
        {query.notice && <div className="studio-alert" role="status"><CheckCircle2 size={18} /> {query.notice}</div>}
        {query.error && <div className="studio-alert error" role="alert">{query.error}</div>}
      </header>

      {canEdit ? <section className="studio-section" aria-labelledby="editor-title">
        <header className="studio-section-heading"><div><span className="studio-kicker">BÀN SOẠN NỘI DUNG</span><h2 id="editor-title">Chỉnh sửa bằng biểu mẫu</h2></div><p>Mọi trường kỹ thuật được hệ thống tự xử lý. Hãy tập trung vào tiếng Trung, Pinyin, nghĩa Việt và chất lượng sư phạm.</p></header>
        <StudioStructuredEditor mode="update" draftSeed={crypto.randomUUID().slice(0, 8)} revisionId={revision.id} expectedRowVersion={revision.rowVersion} initialItemType={revision.itemType} initialLevel={revision.level} initialTitle={revision.title} initialContent={revision.content} />
      </section> : <section className="studio-section" aria-labelledby="preview-title"><header className="studio-section-heading"><div><span className="studio-kicker">NỘI DUNG ĐÃ KHÓA</span><h2 id="preview-title">Bản xem trước</h2></div><p>Trạng thái hiện tại không cho phép sửa trực tiếp. Bạn vẫn có thể xem đúng cách nội dung xuất hiện trong giao diện học.</p></header><StudioContentPreview revisionId={revision.id} itemType={revision.itemType} content={revision.content} /></section>}

      <section className="studio-section" aria-labelledby="workflow-title">
        <header className="studio-section-heading"><div><span className="studio-kicker">CỔNG KIỂM ĐỊNH</span><h2 id="workflow-title">Bước tiếp theo</h2></div><p>Mỗi hành động chỉ xuất hiện khi tài khoản có đúng quyền và nội dung ở đúng trạng thái.</p></header>
        <div className="studio-workflow-bar">
          {canValidate && <form action="/studio/actions" method="post"><input type="hidden" name="action" value="validate" /><input type="hidden" name="revisionId" value={revision.id} /><input type="hidden" name="expectedRowVersion" value={revision.rowVersion} /><input type="hidden" name="idempotencyKey" value={`studio-validate:${crypto.randomUUID()}`} /><button type="submit"><ShieldCheck size={17} /> Kiểm định nội dung</button></form>}
          {nextAction && canTransition && <form action="/studio/actions" method="post"><input type="hidden" name="action" value={nextAction.action} /><input type="hidden" name="revisionId" value={revision.id} /><input type="hidden" name="expectedRowVersion" value={revision.rowVersion} /><input type="hidden" name="idempotencyKey" value={`studio-${nextAction.action}:${crypto.randomUUID()}`} /><button className={nextAction.className} type="submit"><Send size={17} /> {nextAction.label}</button></form>}
          {canFork && <form action="/studio/actions" method="post"><input type="hidden" name="action" value="fork" /><input type="hidden" name="revisionId" value={revision.id} /><input type="hidden" name="idempotencyKey" value={`studio-fork:${crypto.randomUUID()}`} /><button type="submit"><GitFork size={17} /> Tạo bản nháp mới từ nội dung này</button></form>}
          {!canValidate && !canTransition && !canFork && <p>Chưa có hành động nào khả dụng với trạng thái và quyền hiện tại.</p>}
        </div>
      </section>

      <section className="studio-section" aria-labelledby="validation-title">
        <header className="studio-section-heading"><div><span className="studio-kicker">KẾT QUẢ KIỂM ĐỊNH</span><h2 id="validation-title">Nội dung đã sẵn sàng chưa?</h2></div><p>Hệ thống kiểm tra cấu trúc, ngữ cảnh, đáp án và checklist chất lượng trước khi cho gửi duyệt.</p></header>
        {revision.validation ? <div className="studio-validation"><div className="studio-badge-row"><span className={revision.validation.valid ? "studio-badge green" : "studio-badge gold"}>{revision.validation.valid ? "Đạt kiểm định" : "Cần chỉnh sửa"}</span>{Object.entries(revision.validation.checks).map(([key, value]) => <span className={value ? "studio-badge green" : "studio-badge gold"} key={key}>{validationLabels[key] ?? key}: {value ? "Đạt" : "Chưa đạt"}</span>)}</div>{revision.validation.errors.length > 0 && <ul className="studio-validation-list">{revision.validation.errors.map((issue) => <li key={`${issue.path}:${issue.message}`}>{issue.message}</li>)}</ul>}{revision.validation.warnings.length > 0 && <ul className="studio-validation-list">{revision.validation.warnings.map((issue) => <li key={`${issue.path}:${issue.message}`}>{issue.message}</li>)}</ul>}</div> : <div className="studio-empty"><p>Hãy lưu bản nháp rồi chọn “Kiểm định nội dung”.</p></div>}
      </section>

      {canEdit && <section className="studio-section" aria-labelledby="real-preview-title"><header className="studio-section-heading"><div><span className="studio-kicker">XEM TRƯỚC</span><h2 id="real-preview-title">Giao diện người học hiện tại</h2></div><p>Bản xem trước không tạo tiến độ, EXP, bằng chứng học hay mở khóa bài.</p></header><StudioContentPreview revisionId={revision.id} itemType={revision.itemType} content={revision.content} /></section>}

      <details className="studio-disclosure"><summary><ChevronDown size={17} /> Lịch sử và thông tin kiểm soát</summary><div>
        <p>{source ? `Bản này được phát triển từ bản ${source.revision} (${STUDIO_WORKFLOW_LABELS[source.workflowState]}).` : "Đây là bản đầu tiên của nội dung này."}</p>
        <div className="studio-history-grid">{history.events.map((event) => <article className="studio-history-card" key={event.id}><span className={stateClass(event.toState)}>{event.fromState ? `${STUDIO_WORKFLOW_LABELS[event.fromState]} → ` : ""}{STUDIO_WORKFLOW_LABELS[event.toState]}</span><small>{new Date(event.occurredAt).toLocaleString("vi-VN")}</small></article>)}</div>
      </div></details>
    </div></main>;
  } catch (error) {
    return <RevisionLocked missing={error instanceof ContentStudioNotFoundError} />;
  }
}

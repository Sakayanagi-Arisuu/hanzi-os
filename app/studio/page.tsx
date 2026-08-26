import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  FileQuestion,
  LibraryBig,
  ListFilter,
  ListPlus,
  LockKeyhole,
  PenTool,
  ScrollText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getAuthenticatedUser } from "../chatgpt-auth";
import { hasPermission } from "../../src/auth/authorization";
import {
  isStudioItemType,
  isStudioLevel,
  isStudioWorkflowState,
  STUDIO_ITEM_PRESENTATION,
  STUDIO_ITEM_TYPES,
  STUDIO_LEVELS,
  STUDIO_WORKFLOW_LABELS,
  STUDIO_WORKFLOW_STATES,
  type StudioItemType,
} from "../../src/content/studioContent";
import { resolveAuthorizedAccount } from "../../src/server/authorizationRepository";
import { ContentStudioRepository } from "../../src/server/contentStudioRepository";
import { hskMockExamEditorialSuggestions } from "../../src/server/hskMockExamBank";
import { getD1Database } from "../../src/server/d1";
import { StudioStructuredEditor } from "./StudioStructuredEditor";

export const dynamic = "force-dynamic";

const moduleIcon: Record<StudioItemType, typeof LibraryBig> = {
  vocabulary: LibraryBig,
  character: PenTool,
  grammar: ScrollText,
  lesson: BookOpenText,
  exam_item: FileQuestion,
  exam_form: ListPlus,
};

const moduleMark: Record<StudioItemType, string> = {
  vocabulary: "词",
  character: "字",
  grammar: "法",
  lesson: "课",
  exam_item: "问",
  exam_form: "卷",
};

const stateClass = (state: string) => state === "published"
  ? "studio-badge green"
  : state === "submitted" || state === "approved"
    ? "studio-badge gold"
    : "studio-badge";

function LockedStudio({ denied = false }: { denied?: boolean }) {
  return <main className="studio-state"><section className="studio-state-card">
    <LockKeyhole size={34} />
    <span className="studio-kicker">KHU VỰC BIÊN TẬP CÓ PHÂN QUYỀN</span>
    <h1>{denied ? "Tài khoản chưa có quyền biên tập" : "Biên Tập Viện đang khóa"}</h1>
    <p>{denied
      ? "Không gian học và bản nháp nội dung được tách riêng. Điều Hành Viên có thể cấp vai trò Biên tập viên cho tài khoản này."
      : "Đăng nhập bằng tài khoản Biên tập viên để soạn, xem trước và gửi nội dung đi kiểm định."}</p>
    <a href={denied ? "/path" : "/signin?returnTo=%2Fstudio"}>{denied ? "Trở về không gian học" : "Đăng nhập Biên Tập Viện"}</a>
  </section></main>;
}

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    state?: string;
    level?: string;
    notice?: string;
    error?: string;
  }>;
}) {
  const identity = await getAuthenticatedUser();
  if (!identity) return <LockedStudio />;
  const query = await searchParams;
  const itemType = isStudioItemType(query.type) ? query.type : null;
  const state = isStudioWorkflowState(query.state) ? query.state : null;
  const level = isStudioLevel(query.level) ? query.level : null;
  try {
    const database = await getD1Database();
    const account = await resolveAuthorizedAccount(database, identity);
    if (!hasPermission(account.authorization, "content:workspace:read")) {
      return <LockedStudio denied />;
    }
    const repository = new ContentStudioRepository(database);
    const [revisions, approvals] = await Promise.all([
      repository.list({ itemType, state, level }),
      hasPermission(account.authorization, "content:approve")
        ? repository.list({ state: "submitted", limit: 50 })
        : Promise.resolve([]),
    ]);
    const canDraft = hasPermission(account.authorization, "content:drafts:write");
    const publishedCount = revisions.filter((revision) => revision.workflowState === "published").length;
    const selectedCreateType = itemType ?? "lesson";

    return <main className="studio-page"><div className="studio-shell">
      <nav className="studio-topbar" aria-label="Điều hướng Biên Tập Viện">
        <a className="studio-brand" href="/studio"><span><Sparkles size={21} /></span><span><strong>HANZI.OS · BIÊN TẬP VIỆN</strong><small>TRẠM SOẠN NỘI DUNG CÓ KIỂM ĐỊNH</small></span></a>
        <div className="studio-nav"><a href="/path"><ArrowLeft size={17} /><span>Không gian học</span></a>{hasPermission(account.authorization, "admin:users:read") && <a href="/admin"><ShieldCheck size={17} /><span>Quản trị quyền</span></a>}</div>
      </nav>

      <header className="studio-hero">
        <div>
          <span className="studio-kicker"><Sparkles size={15} /> DÀNH CHO BIÊN TẬP VIÊN TIẾNG TRUNG</span>
          <h1>Biên Tập Viện</h1>
          <p>Soạn nội dung bằng biểu mẫu Trung–Pinyin–Việt, xem lại chất lượng rồi gửi phê duyệt. Không cần biết JSON, không cần sửa mã nguồn và bản nháp không bao giờ tự lọt sang người học.</p>
          {query.notice && <div className="studio-alert" role="status"><CheckCircle2 size={18} /> {query.notice}</div>}
          {query.error && <div className="studio-alert error" role="alert">{query.error}</div>}
        </div>
        <div className="studio-hero-stats" aria-label="Quy mô kho nội dung">
          <div><strong>2.016</strong><span>từ mục HSK0–4 hiện có</span></div>
          <div><strong>1.096</strong><span>Hán tự nhận diện</span></div>
          <div><strong>213</strong><span>khung bài học</span></div>
          <div><strong>{revisions.length}</strong><span>bản biên tập trong bộ lọc</span></div>
        </div>
      </header>

      <section className="studio-progress" aria-label="Quy trình biên tập ba bước">
        <div><b>01</b><span><strong>Chọn phân khu</strong><small>Từ, chữ, ngữ pháp, bài học hoặc luyện đề</small></span></div>
        <div><b>02</b><span><strong>Soạn và xem trước</strong><small>Biểu mẫu hướng dẫn theo đúng loại nội dung</small></span></div>
        <div><b>03</b><span><strong>Kiểm định và gửi duyệt</strong><small>Người học chỉ nhận bản đã được phát hành</small></span></div>
      </section>

      <section className="studio-section" aria-labelledby="studio-modules-title">
        <header className="studio-section-heading"><div><span className="studio-kicker">BẢN ĐỒ NỘI DUNG</span><h2 id="studio-modules-title">Bạn muốn bổ sung vào đâu?</h2></div><p>Mỗi phân khu có bộ trường riêng. Chọn một thẻ để mở sẵn biểu mẫu phù hợp phía dưới.</p></header>
        <div className="studio-module-grid">
          {STUDIO_ITEM_TYPES.map((type) => {
            const Icon = moduleIcon[type];
            const item = STUDIO_ITEM_PRESENTATION[type];
            return <a className="studio-module-card" data-mark={moduleMark[type]} href={`?type=${type}#new-draft`} key={type}>
              <Icon size={24} /><small>{item.module}</small><strong>{item.label}</strong><p>{item.description}</p><span>Mở biểu mẫu <ArrowRight size={15} /></span>
            </a>;
          })}
        </div>
      </section>

      {canDraft && <section className="studio-section" id="new-draft" aria-labelledby="new-draft-title">
        <header className="studio-section-heading"><div><span className="studio-kicker">BẢN NHÁP MỚI</span><h2 id="new-draft-title">Soạn nội dung thủ công</h2></div><p>Biểu mẫu tự đóng gói dữ liệu đúng cấu trúc. Bạn chỉ tập trung vào chất lượng tiếng Trung và trải nghiệm học.</p></header>
        <StudioStructuredEditor mode="create" draftSeed={crypto.randomUUID().slice(0, 8)} initialItemType={selectedCreateType} initialLevel={level ?? "hsk1"} examFormSuggestions={selectedCreateType === "exam_form" ? hskMockExamEditorialSuggestions() : undefined} />
      </section>}

      <section className="studio-section" aria-labelledby="library-title">
        <header className="studio-section-heading"><div><span className="studio-kicker">THƯ KHỐ BIÊN TẬP</span><h2 id="library-title">Nội dung đang xử lý</h2></div><p>{publishedCount} bản đang phát hành trong bộ lọc hiện tại. Các bản còn lại vẫn tách khỏi người học.</p></header>
        <form className="studio-filter" method="get">
          <label><span>Phân khu</span><select name="type" defaultValue={itemType ?? ""}><option value="">Tất cả phân khu</option>{STUDIO_ITEM_TYPES.map((value) => <option value={value} key={value}>{STUDIO_ITEM_PRESENTATION[value].module} · {STUDIO_ITEM_PRESENTATION[value].label}</option>)}</select></label>
          <label><span>Trạng thái</span><select name="state" defaultValue={state ?? ""}><option value="">Tất cả trạng thái</option>{STUDIO_WORKFLOW_STATES.map((value) => <option value={value} key={value}>{STUDIO_WORKFLOW_LABELS[value]}</option>)}</select></label>
          <label><span>Cấp độ</span><select name="level" defaultValue={level ?? ""}><option value="">Tất cả cấp độ</option>{STUDIO_LEVELS.map((value) => <option value={value} key={value}>{value.toUpperCase()}</option>)}</select></label>
          <button type="submit"><ListFilter size={17} /> Lọc nội dung</button>
        </form>
        {revisions.length ? <div className="studio-revision-grid">
          {revisions.map((revision) => <article className="studio-revision-card" key={revision.id}>
            <header><span className={stateClass(revision.workflowState)}>{STUDIO_WORKFLOW_LABELS[revision.workflowState]}</span><span className="studio-badge">{revision.level.toUpperCase()}</span></header>
            <h3>{revision.title}</h3><p>{STUDIO_ITEM_PRESENTATION[revision.itemType].module} · {STUDIO_ITEM_PRESENTATION[revision.itemType].label} · bản {revision.revision}</p>
            <a href={`/studio/items/${encodeURIComponent(revision.id)}`}>Mở bàn biên tập <ArrowRight size={15} /></a>
          </article>)}
        </div> : <div className="studio-empty"><div><LibraryBig size={28} /><p>Chưa có nội dung khớp bộ lọc này.</p></div></div>}
      </section>

      {approvals.length > 0 && <section className="studio-section" aria-labelledby="approval-title"><header className="studio-section-heading"><div><span className="studio-kicker">HÀNG CHỜ PHÊ DUYỆT</span><h2 id="approval-title">Nội dung đang chờ Điều Hành Viên</h2></div><p>Biên tập viên có thể gửi duyệt nhưng không thể tự phát hành nội dung của mình.</p></header><div className="studio-revision-grid">{approvals.map((revision) => <article className="studio-revision-card" key={revision.id}><span className="studio-badge gold">Chờ phê duyệt</span><h3>{revision.title}</h3><p>{STUDIO_ITEM_PRESENTATION[revision.itemType].label} · bản {revision.revision}</p><a href={`/studio/items/${encodeURIComponent(revision.id)}`}>Kiểm tra nội dung <ArrowRight size={15} /></a></article>)}</div></section>}
    </div></main>;
  } catch {
    return <main className="studio-state"><section className="studio-state-card"><LockKeyhole size={34} /><span className="studio-kicker">KẾT NỐI NỘI DUNG CHƯA SẴN SÀNG</span><h1>Chưa thể mở Biên Tập Viện</h1><p>Kho bản nháp đang được bảo vệ. Hãy giữ nguyên trang học và thử mở lại sau khi máy chủ local sẵn sàng.</p><a href="/path">Trở về không gian học</a></section></main>;
  }
}

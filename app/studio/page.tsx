import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileQuestion,
  LibraryBig,
  ListFilter,
  ListPlus,
  LockKeyhole,
  PenTool,
  Search,
  ScrollText,
  Send,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
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
import {
  LEARNER_CONTENT_INVENTORY,
  learnerInventoryEntry,
} from "../../src/server/learnerContentInventory";
import { STUDIO_AUTHORING_GROUPS } from "../../src/content/studioAuthoringCatalog";
import { resolveAuthorizedAccount } from "../../src/server/authorizationRepository";
import { ContentStudioRepository } from "../../src/server/contentStudioRepository";
import { hskMockExamEditorialSuggestions } from "../../src/server/hskMockExamBank";
import { getD1Database } from "../../src/server/d1";
import { StudioStructuredEditor } from "./StudioStructuredEditor";

export const dynamic = "force-dynamic";

const formatCount = (value: number) => new Intl.NumberFormat("vi-VN").format(value);
const groupInventoryCount = (group: typeof STUDIO_AUTHORING_GROUPS[number]) =>
  group.methods.reduce(
    (total, method) => total + learnerInventoryEntry(method.itemType).count,
    0,
  );

const moduleIcon: Record<StudioItemType, typeof LibraryBig> = {
  vocabulary: LibraryBig,
  character: PenTool,
  grammar: ScrollText,
  pronunciation: Sparkles,
  communicative_function: BookOpenText,
  graded_text: LibraryBig,
  lesson: BookOpenText,
  exam_item: FileQuestion,
  exam_form: ListPlus,
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
    create?: string;
    type?: string;
    filterType?: string;
    state?: string;
    level?: string;
    notice?: string;
    error?: string;
    mine?: string;
    q?: string;
    page?: string;
    group?: string;
  }>;
}) {
  const identity = await getAuthenticatedUser();
  if (!identity) return <LockedStudio />;
  const query = await searchParams;
  const selectedGroup = STUDIO_AUTHORING_GROUPS.find((group) => group.id === query.group) ?? null;
  const createType = isStudioItemType(query.create)
    ? query.create
    : isStudioItemType(query.type)
      ? query.type
      : null;
  const filterItemType = isStudioItemType(query.filterType) ? query.filterType : null;
  const state = isStudioWorkflowState(query.state) ? query.state : null;
  const level = isStudioLevel(query.level) ? query.level : null;
  const mine = query.mine === "1";
  const search = query.q?.trim().slice(0, 120) ?? "";
  const requestedPage = /^\d+$/u.test(query.page ?? "") ? Number(query.page) : 1;
  const pageSize = 48;
  try {
    const database = await getD1Database();
    const account = await resolveAuthorizedAccount(database, identity);
    if (!hasPermission(account.authorization, "content:workspace:read")) {
      return <LockedStudio denied />;
    }
    const repository = new ContentStudioRepository(database);
    const listFilters = {
      itemType: filterItemType ?? createType,
      state,
      level,
      ownerUserId: mine ? account.userId : null,
      query: search || null,
    };
    const [totalRevisions, approvals] = await Promise.all([
      repository.count(listFilters),
      hasPermission(account.authorization, "content:approve")
        ? repository.list({ state: "submitted", limit: 50 })
        : Promise.resolve([]),
    ]);
    const totalPages = Math.max(1, Math.ceil(totalRevisions / pageSize));
    const page = Math.max(1, Math.min(totalPages, Math.trunc(requestedPage) || 1));
    const [revisions, publishedCount] = await Promise.all([
      repository.list({ ...listFilters, limit: pageSize, offset: (page - 1) * pageSize }),
      repository.count({ ...listFilters, state: "published" }),
    ]);
    const assignments = await repository.assignmentsFor(revisions);
    const assignmentByRevisionId = new Map(assignments.map((assignment) => [assignment.revisionId, assignment]));
    const canDraft = hasPermission(account.authorization, "content:drafts:write");
    const canAdminister = hasPermission(account.authorization, "content:approve");
    const canBulkValidate = hasPermission(account.authorization, "content:validation:run");
    const canBulkSubmit = hasPermission(account.authorization, "content:submit");
    const examFormSuggestions = createType === "exam_form"
      ? hskMockExamEditorialSuggestions((await repository.publishedRuntime({
        itemType: "exam_item",
      })).items)
      : undefined;
    const pageHref = (targetPage: number) => {
      const params = new URLSearchParams();
      if (createType) params.set("create", createType);
      if (filterItemType) params.set("filterType", filterItemType);
      if (state) params.set("state", state);
      if (level) params.set("level", level);
      if (mine) params.set("mine", "1");
      if (search) params.set("q", search);
      if (targetPage > 1) params.set("page", String(targetPage));
      const suffix = params.toString();
      return `${suffix ? `?${suffix}` : ""}#library-title`;
    };

    return <main className="studio-page"><div className="studio-shell">
      <nav className="studio-topbar" aria-label="Điều hướng Biên Tập Viện">
        <a className="studio-brand" href="/studio"><span><Sparkles size={21} /></span><span><strong>HANZI.OS · BIÊN TẬP VIỆN</strong><small>TRẠM SOẠN NỘI DUNG CÓ KIỂM ĐỊNH</small></span></a>
        <div className="studio-nav"><a href="/account/security"><UserRoundCheck size={17} /><span>Tài khoản</span></a>{hasPermission(account.authorization, "admin:users:read") && <a href="/admin"><ShieldCheck size={17} /><span>Cổng Quản Trị</span></a>}</div>
      </nav>

      {(query.notice || query.error) && <div className="studio-notices">
        {query.notice && <div className="studio-alert" role="status"><CheckCircle2 size={18} /> {query.notice}</div>}
        {query.error && <div className="studio-alert error" role="alert">{query.error}</div>}
      </div>}

      {createType ? <>
        <header className="studio-compose-hero">
          <a className="studio-back-link" href="/studio#studio-create"><ArrowLeft size={16} /> Chọn module khác</a>
          <span className="studio-kicker">{STUDIO_ITEM_PRESENTATION[createType].module}</span>
          <h1>Soạn {STUDIO_ITEM_PRESENTATION[createType].label.toLowerCase()}</h1>
          <p className="studio-compose-baseline"><strong>{formatCount(learnerInventoryEntry(createType).count)} {learnerInventoryEntry(createType).unit}</strong> đang phục vụ người học. Bản mới chỉ thay đổi kho học sau khi qua kiểm định và phát hành.</p>
          <ol className="studio-compose-steps" aria-label="Ba mốc hoàn thiện bản nháp">
            <li className="current"><b>1</b><span><strong>Định vị</strong></span></li>
            <li><b>2</b><span><strong>Biên soạn</strong></span></li>
            <li><b>3</b><span><strong>Tự kiểm & lưu</strong></span></li>
          </ol>
        </header>

        <section className="studio-section studio-compose-section" id="new-draft" aria-labelledby="new-draft-title">
          <header className="studio-section-heading"><div><span className="studio-kicker">BẢN NHÁP MỚI</span><h2 id="new-draft-title">Nội dung bài</h2></div></header>
          {canDraft
            ? <StudioStructuredEditor mode="create" draftSeed={crypto.randomUUID().slice(0, 8)} initialItemType={createType} initialLevel={level ?? "hsk1"} examFormSuggestions={examFormSuggestions} />
            : <div className="studio-permission-note" role="status"><LockKeyhole size={20} /><strong>{canAdminister ? "Chế độ quản trị · chỉ xem" : "Chế độ chỉ xem"}</strong></div>}
        </section>
      </> : <>
        <header className="studio-welcome">
          <div className="studio-welcome-copy">
            <span className="studio-kicker"><Sparkles size={15} /> BIÊN TẬP VIỆN</span>
            <h1>{selectedGroup ? selectedGroup.label : "Bạn muốn soạn gì?"}</h1>
          </div>
          {selectedGroup
            ? <a className="studio-secondary-link" href="/studio#studio-create"><ArrowLeft size={18} /> Chọn nhóm khác</a>
            : <a className="studio-secondary-link" href="#library-title"><LibraryBig size={18} /> Bản đang làm</a>}
        </header>

        <section className="studio-baseline-strip" aria-label="Kho nội dung đang phục vụ người học">
          <div><b>{formatCount(LEARNER_CONTENT_INVENTORY.byType.lesson.count)}</b><span>Bài học</span></div>
          <div><b>{formatCount(LEARNER_CONTENT_INVENTORY.byType.vocabulary.count)}</b><span>Mục từ</span></div>
          <div><b>{formatCount(LEARNER_CONTENT_INVENTORY.readerSeries.count)}</b><span>Bộ sách</span></div>
          <div><b>{formatCount(LEARNER_CONTENT_INVENTORY.byType.exam_form.count)}</b><span>Bộ đề</span></div>
          <p>Tự đồng bộ từ gói <strong>{LEARNER_CONTENT_INVENTORY.contentVersion}</strong>; số phiên bản mới trong xưởng được theo dõi riêng bên dưới.</p>
        </section>

        <section className="studio-section studio-create-section" id="studio-create" aria-labelledby="studio-create-title">
          <header className="studio-section-heading"><div><span className="studio-kicker">BẮT ĐẦU</span><h2 id="studio-create-title">{selectedGroup ? "Chọn loại nội dung" : "Chọn một nhóm"}</h2></div></header>
          {!canDraft && <div className="studio-permission-note" role="status"><LockKeyhole size={20} /><strong>{canAdminister ? "Chế độ quản trị · chỉ xem" : "Chế độ chỉ xem"}</strong></div>}
          {selectedGroup
            ? <div className="studio-task-list studio-selected-task-list">
                {selectedGroup.methods.map((entry) => {
                  const Icon = entry.itemType === "reader_series" ? LibraryBig : moduleIcon[entry.itemType];
                  const inventory = learnerInventoryEntry(entry.itemType);
                  return <a className="studio-task-card" href={entry.href} key={entry.itemType}>
                    <span className="studio-task-icon"><Icon size={19} /></span><span><strong>{entry.label}</strong><small>{entry.description}</small><em>{formatCount(inventory.count)} {inventory.unit} đang phục vụ</em></span><ArrowRight size={17} />
                  </a>;
                })}
              </div>
            : <div className="studio-authoring-groups">
                {STUDIO_AUTHORING_GROUPS.map((group) => <a className="studio-authoring-group studio-group-link" href={`?group=${group.id}#studio-create`} key={group.id}>
                  <span className="studio-group-number">{String(STUDIO_AUTHORING_GROUPS.indexOf(group) + 1).padStart(2, "0")}</span>
                  <span><small>{group.module}</small><strong>{group.label}</strong><em>{formatCount(groupInventoryCount(group))} hạng mục đang phục vụ</em></span>
                  <ArrowRight size={18} />
                </a>)}
              </div>}
        </section>
      </>}

      <section className="studio-section studio-library-section" aria-labelledby="library-title">
        <header className="studio-section-heading"><div><span className="studio-kicker">PHIÊN BẢN TRONG XƯỞNG</span><h2 id="library-title">{createType ? `Bản ${STUDIO_ITEM_PRESENTATION[createType].label.toLowerCase()} đang xử lý` : `${totalRevisions} phiên bản`}</h2></div><span className="studio-library-count">{publishedCount} bản xưởng đã phát hành</span></header>
        <details className="studio-filter-panel">
          <summary><ListFilter size={17} /> Tìm và lọc</summary>
          <form className="studio-filter" method="get">
          {createType && <input type="hidden" name="create" value={createType} />}
          <label className="studio-filter-search"><span>Tìm nội dung</span><span className="studio-search-field"><Search size={17} aria-hidden="true" /><input type="search" name="q" defaultValue={search} maxLength={120} placeholder="Tên nội dung hoặc mã ổn định…" /></span></label>
          <label><span>Loại nội dung</span><select name="filterType" defaultValue={filterItemType ?? ""}><option value="">Tất cả loại</option>{STUDIO_ITEM_TYPES.map((value) => <option value={value} key={value}>{STUDIO_ITEM_PRESENTATION[value].module} · {STUDIO_ITEM_PRESENTATION[value].label}</option>)}</select></label>
          <label><span>Trạng thái</span><select name="state" defaultValue={state ?? ""}><option value="">Tất cả trạng thái</option>{STUDIO_WORKFLOW_STATES.map((value) => <option value={value} key={value}>{STUDIO_WORKFLOW_LABELS[value]}</option>)}</select></label>
          <label><span>Cấp độ</span><select name="level" defaultValue={level ?? ""}><option value="">Tất cả cấp độ</option>{STUDIO_LEVELS.map((value) => <option value={value} key={value}>{value.toUpperCase()}</option>)}</select></label>
          <label><span>Người phụ trách</span><select name="mine" defaultValue={mine ? "1" : ""}><option value="">Toàn bộ thư khố</option><option value="1">Việc của tôi</option></select></label>
            <button type="submit"><ListFilter size={17} /> Áp dụng</button>
          </form>
        </details>
        {revisions.length ? <form className="studio-bulk-form" action="/studio/bulk" method="post">
          <input type="hidden" name="batchKey" value={crypto.randomUUID()} />
          {(canBulkValidate || canBulkSubmit) && <div className="studio-bulk-bar">
            <div><ClipboardCheck size={18} /><span><strong>Xử lý nhiều nội dung</strong><small>Chọn tối đa 25 bản nháp hoặc bản đã kiểm định. Bản sai trạng thái sẽ được bỏ qua an toàn.</small></span></div>
            <div>{canBulkValidate && <button type="submit" name="action" value="validate"><ShieldCheck size={16} /> Kiểm định đã chọn</button>}{canBulkSubmit && <button className="gold" type="submit" name="action" value="submit"><Send size={16} /> Gửi duyệt đã chọn</button>}</div>
          </div>}
          <div className="studio-revision-grid">
            {revisions.map((revision) => {
              const assignment = assignmentByRevisionId.get(revision.id);
              const selectable = canBulkValidate || canBulkSubmit
                ? ["draft", "validated"].includes(revision.workflowState)
                : false;
              const overdue = assignment?.dueAt ? assignment.dueAt < Date.now() : false;
              return <article className="studio-revision-card" key={revision.id}>
                <header><span className={stateClass(revision.workflowState)}>{STUDIO_WORKFLOW_LABELS[revision.workflowState]}</span><span className="studio-badge">{revision.level.toUpperCase()}</span></header>
                {selectable && <label className="studio-bulk-select"><input type="checkbox" name="selection" value={`${revision.id}|${revision.rowVersion}`} /><span>Chọn để xử lý hàng loạt</span></label>}
                <h3>{revision.title}</h3><p>{STUDIO_ITEM_PRESENTATION[revision.itemType].module} · {STUDIO_ITEM_PRESENTATION[revision.itemType].label} · bản {revision.revision}</p>
                <div className="studio-assignment-summary"><span><UserRoundCheck size={14} /> {assignment ? (assignment.ownerUserId === account.userId ? "Bạn phụ trách" : "Biên tập viên khác phụ trách") : "Chưa phân công"}</span><span className={overdue ? "overdue" : ""}><CalendarClock size={14} /> {assignment?.dueAt ? `${overdue ? "Quá hạn" : "Hạn"} ${new Date(assignment.dueAt).toLocaleDateString("vi-VN")}` : "Chưa đặt hạn"}</span></div>
                <a href={`/studio/items/${encodeURIComponent(revision.id)}`}>Tiếp tục soạn <ArrowRight size={15} /></a>
              </article>;
            })}
          </div>
          {totalPages > 1 && <nav className="studio-pagination" aria-label="Phân trang thư khố biên tập">
            {page > 1 ? <a href={pageHref(page - 1)}><ArrowLeft size={16} /> Trang trước</a> : <span aria-disabled="true"><ArrowLeft size={16} /> Trang trước</span>}
            <strong>Trang {page}/{totalPages} · {totalRevisions} kết quả</strong>
            {page < totalPages ? <a href={pageHref(page + 1)}>Trang sau <ArrowRight size={16} /></a> : <span aria-disabled="true">Trang sau <ArrowRight size={16} /></span>}
          </nav>}
        </form> : <div className="studio-empty"><div><LibraryBig size={28} /><p>Chưa có phiên bản trong xưởng khớp bộ lọc này. Kho người học phía trên vẫn được giữ nguyên.</p></div></div>}
      </section>

      {approvals.length > 0 && <section className="studio-section" aria-labelledby="approval-title"><header className="studio-section-heading"><div><span className="studio-kicker">HÀNG CHỜ PHÊ DUYỆT</span><h2 id="approval-title">Nội dung đang chờ Điều Hành Viên</h2></div><p>Biên tập viên có thể gửi duyệt nhưng không thể tự phát hành nội dung của mình.</p></header><div className="studio-revision-grid">{approvals.map((revision) => <article className="studio-revision-card" key={revision.id}><span className="studio-badge gold">Chờ phê duyệt</span><h3>{revision.title}</h3><p>{STUDIO_ITEM_PRESENTATION[revision.itemType].label} · bản {revision.revision}</p><a href={`/studio/items/${encodeURIComponent(revision.id)}`}>Kiểm tra nội dung <ArrowRight size={15} /></a></article>)}</div></section>}
    </div></main>;
  } catch {
    return <main className="studio-state"><section className="studio-state-card"><LockKeyhole size={34} /><span className="studio-kicker">KẾT NỐI NỘI DUNG CHƯA SẴN SÀNG</span><h1>Chưa thể mở Biên Tập Viện</h1><p>Kho bản nháp đang được bảo vệ. Không có nội dung nào bị ghi tạm ra phía người học.</p><a href="/studio">Thử mở lại</a></section></main>;
  }
}

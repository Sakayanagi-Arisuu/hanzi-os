import { getAuthenticatedUser } from "../chatgpt-auth";
import { hasPermission } from "../../src/auth/authorization";
import {
  isStudioItemType,
  isStudioLevel,
  isStudioWorkflowState,
  STUDIO_ITEM_TYPES,
  STUDIO_LEVELS,
  STUDIO_WORKFLOW_STATES,
  studioStarterContent,
} from "../../src/content/studioContent";
import { resolveAuthorizedAccount } from "../../src/server/authorizationRepository";
import { ContentStudioRepository } from "../../src/server/contentStudioRepository";
import { getD1Database } from "../../src/server/d1";
import { studioStyles as styles } from "./studioStyles";

export const dynamic = "force-dynamic";

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
  if (!identity) {
    return <main style={styles.page}><section style={styles.state}><div style={styles.stateCard}>
      <span style={styles.eyebrow}>AUTHENTICATION REQUIRED</span><h1>Content Studio đang khóa</h1>
      <p style={styles.copy}>Đăng nhập để hệ thống kiểm tra vai trò Quản Khố Nội Dung hoặc Điều Hành Hệ Thống ở phía máy chủ.</p>
      <a style={styles.actionLink} href="/signin?returnTo=%2Fstudio">Đăng nhập</a>
    </div></section></main>;
  }
  const query = await searchParams;
  const itemType = isStudioItemType(query.type) ? query.type : null;
  const state = isStudioWorkflowState(query.state) ? query.state : null;
  const level = isStudioLevel(query.level) ? query.level : null;
  try {
    const database = await getD1Database();
    const account = await resolveAuthorizedAccount(database, identity);
    if (!hasPermission(account.authorization, "content:workspace:read")) {
      return <main style={styles.page}><section style={styles.state}><div style={styles.stateCard}>
        <span style={styles.eyebrow}>ACCESS DENIED</span><h1>Không đủ quyền vào Content Studio</h1>
        <p style={styles.copy}>Hành Giả không nhìn thấy draft, hàng duyệt hoặc dữ liệu biên tập.</p>
        <a style={styles.link} href="/path">Trở về Lộ Trình</a>
      </div></section></main>;
    }
    const repository = new ContentStudioRepository(database);
    const [revisions, approvals] = await Promise.all([
      repository.list({ itemType, state, level }),
      hasPermission(account.authorization, "content:approve")
        ? repository.list({ state: "submitted", limit: 50 })
        : Promise.resolve([]),
    ]);
    const canDraft = hasPermission(account.authorization, "content:drafts:write");
    return <main style={styles.page}><div style={styles.shell}>
      <nav style={styles.topbar}><strong style={styles.brand}>HANZI.OS · CONTENT STUDIO</strong><div style={styles.nav}><a style={styles.link} href="/path">Lộ Trình</a>{hasPermission(account.authorization, "admin:users:read") && <a style={styles.link} href="/admin">Cổng Quản Trị</a>}</div></nav>
      <header style={styles.hero}>
        <span style={styles.eyebrow}>CMS-LITE · GOVERNED REVISIONS</span><h1 style={styles.title}>Xưởng Nội Dung</h1>
        <p style={styles.copy}>Soạn draft, kiểm định, gửi duyệt và phát hành revision bất biến trên cùng package governance hiện có. Learner runtime chỉ nhận projection <strong>published</strong>; preview không mở khóa bài học.</p>
        {query.notice && <div style={styles.notice}>{query.notice}</div>}
        {query.error && <div style={styles.error}>{query.error}</div>}
      </header>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Danh sách và bộ lọc</h2><p style={styles.sectionCopy}>Mỗi card là một revision có version, content digest, validation digest và rowVersion chống ghi đè.</p>
        <form method="get" style={styles.grid}>
          <label style={styles.label}>Loại<select name="type" defaultValue={itemType ?? ""} style={styles.input}><option value="">Tất cả</option>{STUDIO_ITEM_TYPES.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label style={styles.label}>Trạng thái<select name="state" defaultValue={state ?? ""} style={styles.input}><option value="">Tất cả</option>{STUDIO_WORKFLOW_STATES.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label style={styles.label}>Cấp độ<select name="level" defaultValue={level ?? ""} style={styles.input}><option value="">Tất cả</option>{STUDIO_LEVELS.map((value) => <option key={value}>{value}</option>)}</select></label>
          <button type="submit" style={styles.button}>Lọc revision</button>
        </form>
        <div style={{ ...styles.grid, marginTop: 18 }}>
          {revisions.map((revision) => <article key={revision.id} style={styles.card}>
            <div style={styles.between}><div><span style={revision.workflowState === "published" ? styles.badgeGreen : revision.workflowState === "submitted" || revision.workflowState === "approved" ? styles.badgeGold : styles.badge}>{revision.workflowState.toUpperCase()}</span><h3>{revision.title}</h3></div><span style={styles.badge}>{revision.itemType}</span></div>
            <small style={styles.meta}>{revision.stableKey} · {revision.level.toUpperCase()} · revision {revision.revision} · row {revision.rowVersion}</small>
            <small style={styles.meta}>content {revision.contentSha256}</small>
            <a style={styles.actionLink} href={`/studio/items/${encodeURIComponent(revision.id)}`}>Mở editor / preview</a>
          </article>)}
          {revisions.length === 0 && <p style={styles.sectionCopy}>Chưa có revision khớp bộ lọc. Draft mới không ảnh hưởng 213 bài đang học.</p>}
        </div>
      </section>

      {approvals.length > 0 && <section style={styles.section}><h2 style={styles.sectionTitle}>Hàng chờ phê duyệt</h2><p style={styles.sectionCopy}>Chỉ Điều Hành Hệ Thống có nút approve/publish; Quản Khố không thể tự phát hành.</p><div style={styles.grid}>{approvals.map((revision) => <article key={revision.id} style={styles.card}><span style={styles.badgeGold}>SUBMITTED</span><h3>{revision.title}</h3><small style={styles.meta}>{revision.stableKey} · revision {revision.revision}</small><a style={styles.actionLink} href={`/studio/items/${encodeURIComponent(revision.id)}`}>Kiểm tra và duyệt</a></article>)}</div></section>}

      {canDraft && <section style={styles.section} id="new-draft"><h2 style={styles.sectionTitle}>Tạo draft có kiểm soát</h2><p style={styles.sectionCopy}>Template nối với năm pass AI và disclosure humanReviewed=false; phải sửa nội dung thật rồi đánh dấu đủ năm pass trước khi validation xanh.</p>
        <form action="/studio/actions" method="post" style={{ display: "grid", gap: 14 }}>
          <input type="hidden" name="action" value="create" /><input type="hidden" name="idempotencyKey" value={`studio-create:${crypto.randomUUID()}`} />
          <div style={styles.grid}>
            <label style={styles.label}>Loại<select name="itemType" defaultValue="lesson" style={styles.input}>{STUDIO_ITEM_TYPES.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label style={styles.label}>Cấp độ<select name="level" defaultValue="hsk1" style={styles.input}>{STUDIO_LEVELS.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label style={styles.label}>Stable key<input required name="stableKey" pattern="[a-z0-9][a-z0-9._:-]{2,159}" placeholder="hsk1.lesson.greeting-01" style={styles.input} /></label>
            <label style={styles.label}>Tiêu đề<input required name="title" maxLength={240} placeholder="Chào hỏi và giới thiệu" style={styles.input} /></label>
          </div>
          <label style={styles.label}>JSON nội dung<textarea name="contentJson" defaultValue={JSON.stringify(studioStarterContent("lesson"), null, 2)} style={styles.textarea} /></label>
          <button type="submit" style={styles.buttonGreen}>Tạo revision draft</button>
        </form>
      </section>}
    </div></main>;
  } catch {
    return <main style={styles.page}><section style={styles.state}><div style={styles.stateCard}><span style={styles.eyebrow}>STUDIO BACKEND OFFLINE</span><h1>Chưa thể mở Xưởng Nội Dung</h1><p style={styles.copy}>D1 hoặc migration content governance chưa sẵn sàng; hệ thống fail-closed và không rơi về dữ liệu draft.</p><a style={styles.link} href="/path">Trở về Lộ Trình</a></div></section></main>;
  }
}

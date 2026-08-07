import { getAuthenticatedUser } from "../../../chatgpt-auth";
import { hasPermission } from "../../../../src/auth/authorization";
import { STUDIO_LEVELS } from "../../../../src/content/studioContent";
import { StudioContentPreview } from "../../../../src/components/StudioContentPreview";
import { resolveAuthorizedAccount } from "../../../../src/server/authorizationRepository";
import {
  ContentStudioNotFoundError,
  ContentStudioRepository,
} from "../../../../src/server/contentStudioRepository";
import { getD1Database } from "../../../../src/server/d1";
import { studioStyles as styles } from "../../studioStyles";

export const dynamic = "force-dynamic";

const stateAction = (state: string) => state === "validated"
  ? { action: "submit", label: "Gửi phê duyệt", style: styles.buttonGold }
  : state === "submitted"
    ? { action: "approve", label: "Phê duyệt revision", style: styles.buttonGreen }
    : state === "approved"
      ? { action: "publish", label: "Publish vào runtime", style: styles.buttonGreen }
      : state === "published"
        ? { action: "archive", label: "Lưu trữ revision", style: styles.danger }
        : null;

export default async function StudioRevisionPage({
  params,
  searchParams,
}: {
  params: Promise<{ revisionId: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const identity = await getAuthenticatedUser();
  const route = await params;
  if (!identity) {
    return <main style={styles.page}><section style={styles.state}><div style={styles.stateCard}><span style={styles.eyebrow}>AUTHENTICATION REQUIRED</span><h1>Revision đang khóa</h1><p style={styles.copy}>Đăng nhập để xem editor, diff, preview và lịch sử.</p><a style={styles.actionLink} href={`/signin?returnTo=${encodeURIComponent(`/studio/items/${route.revisionId}`)}`}>Đăng nhập</a></div></section></main>;
  }
  try {
    const database = await getD1Database();
    const account = await resolveAuthorizedAccount(database, identity);
    if (!hasPermission(account.authorization, "content:workspace:read")) {
      return <main style={styles.page}><section style={styles.state}><div style={styles.stateCard}><span style={styles.eyebrow}>ACCESS DENIED</span><h1>Draft không dành cho Hành Giả</h1><p style={styles.copy}>Path, Lesson và Exam không đọc revision chưa publish.</p><a style={styles.link} href="/path">Trở về Lộ Trình</a></div></section></main>;
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
    const action = stateAction(revision.workflowState);
    const canTransition = action?.action === "submit"
      ? hasPermission(account.authorization, "content:submit")
      : action?.action === "approve"
        ? hasPermission(account.authorization, "content:approve")
        : action
          ? hasPermission(account.authorization, "content:publish")
          : false;
    const canFork = ["published", "archived"].includes(revision.workflowState)
      && hasPermission(account.authorization, "content:drafts:write");

    return <main style={styles.page}><div style={styles.shell}>
      <nav style={styles.topbar}><strong style={styles.brand}>HANZI.OS · REVISION {revision.revision}</strong><div style={styles.nav}><a style={styles.link} href="/studio">← Xưởng Nội Dung</a><a style={styles.link} href="/path">Lộ Trình</a></div></nav>
      <header style={styles.hero}>
        <div style={styles.row}><span style={revision.workflowState === "published" ? styles.badgeGreen : revision.workflowState === "submitted" || revision.workflowState === "approved" ? styles.badgeGold : styles.badge}>{revision.workflowState.toUpperCase()}</span><span style={styles.badge}>{revision.itemType}</span><span style={styles.badge}>{revision.level.toUpperCase()}</span></div>
        <h1 style={styles.title}>{revision.title}</h1><p style={styles.copy}>{revision.stableKey} · revision {revision.revision} · rowVersion {revision.rowVersion}. Published revision không thể sửa; thay đổi tiếp theo phải fork thành draft mới.</p>
        <small style={styles.meta}>content {revision.contentSha256}</small>{revision.validationSha256 && <small style={styles.meta}>validation {revision.validationSha256}</small>}
        {query.notice && <div style={styles.notice}>{query.notice}</div>}{query.error && <div style={styles.error}>{query.error}</div>}
      </header>

      <section style={styles.section}><h2 style={styles.sectionTitle}>Editor và workflow</h2><p style={styles.sectionCopy}>Optimistic concurrency dùng rowVersion; mỗi form có idempotency key riêng và workflow event append-only.</p>
        {canEdit ? <form action="/studio/actions" method="post" style={{ display: "grid", gap: 14 }}>
          <input type="hidden" name="action" value="update" /><input type="hidden" name="revisionId" value={revision.id} /><input type="hidden" name="expectedRowVersion" value={revision.rowVersion} /><input type="hidden" name="idempotencyKey" value={`studio-update:${crypto.randomUUID()}`} />
          <div style={styles.grid}><label style={styles.label}>Tiêu đề<input name="title" required maxLength={240} defaultValue={revision.title} style={styles.input} /></label><label style={styles.label}>Cấp độ<select name="level" defaultValue={revision.level} style={styles.input}>{STUDIO_LEVELS.map((value) => <option key={value}>{value}</option>)}</select></label></div>
          <label style={styles.label}>Canonical content JSON<textarea name="contentJson" defaultValue={JSON.stringify(revision.content, null, 2)} style={styles.textarea} /></label><button type="submit" style={styles.button}>Lưu draft</button>
        </form> : <pre style={styles.pre}>{JSON.stringify(revision.content, null, 2)}</pre>}
        <div style={{ ...styles.row, marginTop: 14 }}>
          {canValidate && <form action="/studio/actions" method="post"><input type="hidden" name="action" value="validate" /><input type="hidden" name="revisionId" value={revision.id} /><input type="hidden" name="expectedRowVersion" value={revision.rowVersion} /><input type="hidden" name="idempotencyKey" value={`studio-validate:${crypto.randomUUID()}`} /><button type="submit" style={styles.buttonGreen}>Chạy validation</button></form>}
          {action && canTransition && <form action="/studio/actions" method="post"><input type="hidden" name="action" value={action.action} /><input type="hidden" name="revisionId" value={revision.id} /><input type="hidden" name="expectedRowVersion" value={revision.rowVersion} /><input type="hidden" name="idempotencyKey" value={`studio-${action.action}:${crypto.randomUUID()}`} /><button type="submit" style={action.style}>{action.label}</button></form>}
          {canFork && <form action="/studio/actions" method="post"><input type="hidden" name="action" value="fork" /><input type="hidden" name="revisionId" value={revision.id} /><input type="hidden" name="idempotencyKey" value={`studio-fork:${crypto.randomUUID()}`} /><button type="submit" style={styles.button}>Fork revision mới</button></form>}
        </div>
      </section>

      <section style={styles.section}><h2 style={styles.sectionTitle}>Kết quả validation</h2><p style={styles.sectionCopy}>Validation khóa digest của đúng payload và kiểm tra ngữ cảnh Trung–Pinyin–Việt, đáp án/distractor, năm pass AI cùng disclosure local.</p>
        {revision.validation ? <><div style={styles.row}><span style={revision.validation.valid ? styles.badgeGreen : styles.badgeGold}>{revision.validation.valid ? "VALID" : "NEEDS REVISION"}</span>{Object.entries(revision.validation.checks).map(([key, value]) => <span key={key} style={value ? styles.badgeGreen : styles.badgeGold}>{key}: {value ? "pass" : "fail"}</span>)}</div>{revision.validation.errors.length > 0 && <ul>{revision.validation.errors.map((issue) => <li key={`${issue.path}:${issue.message}`}>{issue.path}: {issue.message}</li>)}</ul>}{revision.validation.warnings.length > 0 && <ul>{revision.validation.warnings.map((issue) => <li key={`${issue.path}:${issue.message}`}>{issue.message}</li>)}</ul>}</> : <p style={styles.sectionCopy}>Chưa có validation gắn với content digest hiện tại.</p>}
      </section>

      <section style={styles.section}><h2 style={styles.sectionTitle}>Preview bằng Lesson UI thật</h2><p style={styles.sectionCopy}>Preview tái sử dụng `LessonDepthPanel` của màn học. Nó chỉ dành cho editor/admin, không tạo enrollment, evidence, mastery hay unlock.</p><StudioContentPreview revisionId={revision.id} itemType={revision.itemType} content={revision.content} /></section>

      <section style={styles.section}><h2 style={styles.sectionTitle}>Diff revision</h2><p style={styles.sectionCopy}>{source ? `So sánh revision ${source.revision} (${source.workflowState}) với revision ${revision.revision}.` : "Revision đầu tiên chưa có nguồn để so sánh."}</p>{source && <div style={styles.grid}><div><span style={styles.eyebrow}>TRƯỚC · {source.contentSha256.slice(0, 20)}…</span><pre style={styles.pre}>{JSON.stringify(source.content, null, 2)}</pre></div><div><span style={styles.eyebrow}>HIỆN TẠI · {revision.contentSha256.slice(0, 20)}…</span><pre style={styles.pre}>{JSON.stringify(revision.content, null, 2)}</pre></div></div>}</section>

      <section style={styles.section}><h2 style={styles.sectionTitle}>Lịch sử bất biến</h2><p style={styles.sectionCopy}>Workflow event chỉ append; D1 trigger chặn update/delete. Approval và publication đồng thời đi vào audit hệ thống.</p><div style={styles.grid}>{history.events.map((event) => <article key={event.id} style={styles.card}><span style={event.toState === "published" ? styles.badgeGreen : styles.badge}>{event.fromState ?? "∅"} → {event.toState}</span><small style={styles.meta}>sequence {event.sequence} · {new Date(event.occurredAt).toLocaleString("vi-VN")}</small><small style={styles.meta}>{event.actorUserId} · {event.requestSha256}</small></article>)}</div></section>
    </div></main>;
  } catch (error) {
    const missing = error instanceof ContentStudioNotFoundError;
    return <main style={styles.page}><section style={styles.state}><div style={styles.stateCard}><span style={styles.eyebrow}>{missing ? "REVISION NOT FOUND" : "STUDIO BACKEND OFFLINE"}</span><h1>{missing ? "Không tìm thấy revision" : "Chưa thể mở revision"}</h1><p style={styles.copy}>Content Studio fail-closed; không dùng draft hoặc dữ liệu suy đoán làm nội dung học.</p><a style={styles.link} href="/studio">Trở về Xưởng Nội Dung</a></div></section></main>;
  }
}

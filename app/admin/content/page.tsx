import { AdminSection, MetricCard } from "../adminComponents";
import { AdminShell, AdminState } from "../AdminShell";
import { loadAdminContext } from "../adminServer";
import {
  LEARNER_CONTENT_INVENTORY,
  learnerInventoryEntry,
} from "../../../src/server/learnerContentInventory";
import { STUDIO_MODULE_AUTHORING_COVERAGE } from "../../../src/content/studioAuthoringCatalog";
import { ContentStudioRepository } from "../../../src/server/contentStudioRepository";

export const dynamic = "force-dynamic";

const formatCount = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  const state = await loadAdminContext("content:approve");
  if (state.kind !== "ok") return <AdminState kind={state.kind} />;
  let summary: Awaited<ReturnType<ContentStudioRepository["operationalSummary"]>>;
  try {
    summary = await new ContentStudioRepository(state.context.database).operationalSummary();
  } catch {
    return <AdminState kind="offline" />;
  }
  const query = await searchParams;
  return <AdminShell
    current="content"
    title="Kho nội dung"
    description="Theo dõi nội dung nào đang nuôi từng module người học. Muốn biên soạn, hãy mở Biên Tập Viện; trang này dành cho việc quan sát và điều phối."
    authorization={state.context.account.authorization}
    status={query.error ? { kind: "error", message: query.error } : query.updated ? { kind: "updated", message: "Đã lưu thay đổi." } : null}
  >
    <AdminSection title="Kho người học đang sử dụng" description="Số liệu đọc trực tiếp từ gói bài học, nội dung chuyên sâu, Vạn Quyển Các và ngân hàng đề hiện hành; không phụ thuộc vào ngày Biên Tập Viện được tạo." eyebrow="ĐANG PHỤC VỤ" action={<a className="admin-primary-action" href="/studio">Mở Biên Tập Viện</a>}>
      <div className="admin-metric-grid"><MetricCard value={formatCount(LEARNER_CONTENT_INVENTORY.byType.lesson.count)} label="Bài học đang mở" hint="Thiên Lộ · HSK0–HSK4" /><MetricCard value={formatCount(LEARNER_CONTENT_INVENTORY.byType.vocabulary.count)} label="Mục từ" hint="Tàng Tự Khố" tone="cyan" /><MetricCard value={formatCount(LEARNER_CONTENT_INVENTORY.readerSeries.count)} label="Bộ sách" hint="Vạn Quyển Các" tone="jade" /><MetricCard value={formatCount(LEARNER_CONTENT_INVENTORY.byType.exam_form.count)} label="Bộ đề đang mở" hint="Phòng Luyện Đề" tone="gold" /></div>
      <p className="admin-inventory-provenance">Gói học <strong>{LEARNER_CONTENT_INVENTORY.contentVersion}</strong> · thư viện <strong>{LEARNER_CONTENT_INVENTORY.readerContentVersion}</strong>. Số liệu tự tính lại khi bài học, sách hoặc ngân hàng đề thay đổi; nội dung nền không bị sao chép thành bản nháp.</p>
    </AdminSection>

    <AdminSection title="Luồng Biên Tập Viện" description="Đây là số phiên bản được tạo trong xưởng. Con số 0 chỉ có nghĩa chưa có bản biên tập mới, không có nghĩa phía người học đang trống." eyebrow="VẬN HÀNH">
      <div className="admin-workflow-summary"><MetricCard value={summary.workflow.draft} label="Bản nháp" hint="Đang được soạn" /><MetricCard value={summary.workflow.submitted} label="Chờ duyệt" hint="Cần người duyệt độc lập" tone="gold" /><MetricCard value={summary.workflow.published} label="Bản xưởng đã phát hành" hint="Bổ sung hoặc thay thế kho nền" tone="cyan" /></div>
    </AdminSection>

    <AdminSection title="Nội dung theo module người học" description="Mỗi nhóm giải thích nội dung đi đâu. Bấm vào một thẻ để mở đúng biểu mẫu trong xưởng." eyebrow="BẢN ĐỒ NỘI DUNG">
      <div className="admin-content-groups">{STUDIO_MODULE_AUTHORING_COVERAGE.map((module) => <article className="admin-content-group" key={module.id}><div className="admin-content-group-head"><div><strong>{module.module}</strong><p>{module.plainLabel} · {module.learnerContent}</p></div><span className="admin-group-mark" aria-hidden="true">{module.id.slice(0, 2).toUpperCase()}</span></div><div className="admin-content-methods">{module.methods.map((method) => { const learner = learnerInventoryEntry(method.itemType); const studio = method.itemType === "reader_series" ? summary.readerSeries : summary.byType[method.itemType]; return <a className="admin-content-method" href={method.href} key={`${module.id}:${method.itemType}:${method.label}`}><strong>{method.label}</strong><small>{method.description}</small><span className="admin-content-baseline"><b>{formatCount(learner.count)}</b> {learner.unit} đang phục vụ</span><small>{studio.total} phiên bản trong xưởng · {studio.published} đã phát hành</small></a>; })}</div>{module.derived && <p className="admin-card-foot">Lưu ý: {module.derived}</p>}</article>)}</div>
    </AdminSection>

    <AdminSection title="Nguyên tắc an toàn nội dung" description="Các quy tắc này giúp Quản trị viên không vô tình làm thay công việc biên tập hoặc làm mất dữ liệu người học." eyebrow="CẦN NHỚ">
      <div className="admin-card-grid"><article className="admin-card"><strong>Không xóa cứng</strong><p>Lưu trữ, thay thế hoặc tạo phiên bản mới để giữ nguyên mã nội dung và tiến độ người học.</p></article><article className="admin-card"><strong>Không sửa tiến độ cá nhân</strong><p>Lịch ôn, chuỗi ngày học, trạng thái hoàn thành và lỗi sai phải dựa trên bằng chứng học; Quản trị viên chỉ điều hành nguồn nội dung.</p></article><article className="admin-card"><strong>Không đưa bản nháp lên học</strong><p>Mọi thay đổi phải qua kiểm định, duyệt độc lập và phát hành thành công.</p></article></div>
    </AdminSection>
  </AdminShell>;
}

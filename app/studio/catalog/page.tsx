import { authorizeStudio } from "../../../src/server/contentStudioHttp";
import { STUDIO_MODULE_AUTHORING_COVERAGE } from "../../../src/content/studioAuthoringCatalog";
import { MediaLibrary } from "./MediaLibrary";
import { hasPermission } from "../../../src/auth/authorization";

export const dynamic = "force-dynamic";

export default async function StudioCatalogPage() {
  const authorized = await authorizeStudio("content:workspace:read");
  if (!authorized.ok) return <main className="studio-state"><section className="studio-state-card"><h1>Kho học liệu đang khóa</h1><a href="/signin?returnTo=%2Fstudio%2Fcatalog">Đăng nhập tài khoản biên tập</a></section></main>;
  return <main className="studio-page"><div className="studio-shell">
    <header className="studio-topbar"><h1>Kho học liệu</h1><a className="studio-secondary-link" href="/studio">Về bàn làm việc</a></header>
    <section className="tv-hero"><h2>Nội dung của bạn đến đâu?</h2><p>Chọn khu vực người học để mở đúng công cụ. Bản nháp được kiểm tra, duyệt độc lập rồi mới phát hành.</p></section>
    <section className="studio-section"><h2>Ảnh & âm thanh</h2><p>Tìm, xem và tải học liệu kèm nguồn gốc. Tệp cũ được giữ để các bài đã phát hành tiếp tục hoạt động.</p><MediaLibrary canManage={hasPermission(authorized.context.account.authorization,"content:drafts:write")} /></section>
    <div className="tv-catalog-grid">{STUDIO_MODULE_AUTHORING_COVERAGE.map(module => <section className="tv-catalog-card" key={module.id}><span className="studio-kicker">{module.plainLabel}</span><h2>{module.module}</h2><p>{module.learnerContent}</p>{module.methods.map(method => <a key={method.itemType} href={method.href}>{method.label} →</a>)}{module.derived && <details><summary>Hệ thống tự tính phần nào?</summary><p>{module.derived}</p></details>}</section>)}</div>
    <section className="studio-section"><h2>Khảo Nghiệm Căn Cơ</h2><p>Ngân hàng đầu vào có quy trình biên tập, duyệt và phát hành riêng.</p><a className="studio-button" href="/studio/assessment">Quản lý câu khảo nghiệm</a></section><section className="studio-section" id="studio-help"><h2>Từ bản nháp đến người học</h2><ol><li><strong>Soạn nội dung:</strong> chọn cấp độ, thêm tiếng Trung, Pinyin, nghĩa Việt và nguồn sử dụng.</li><li><strong>Xem trước & kiểm tra:</strong> lưu bản nháp, xem giao diện học và sửa các lỗi được chỉ ra.</li><li><strong>Gửi duyệt:</strong> người duyệt độc lập xác nhận chất lượng; kiểm tra tự động không thay thế người duyệt.</li><li><strong>Phát hành:</strong> Quản trị viên đưa bản đã duyệt lên học. Muốn sửa tiếp, tạo phiên bản mới để giữ lịch sử.</li></ol><p>Tiến độ, lịch ôn và mức thông thạo thuộc người học; không chỉnh bằng công cụ biên tập.</p></section>
  </div></main>;
}

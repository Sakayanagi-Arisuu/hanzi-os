import { AdminSection, SettingCard } from "../adminComponents";
import { AdminShell, AdminState } from "../AdminShell";
import { loadAdminContext } from "../adminServer";
import { SystemSettingsRepository } from "../../../src/server/systemSettingsRepository";

export const dynamic = "force-dynamic";

export default async function AdminConfigurationPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  const state = await loadAdminContext("admin:settings:read");
  if (state.kind !== "ok") return <AdminState kind={state.kind} />;
  let settings: Awaited<ReturnType<SystemSettingsRepository["list"]>>;
  try {
    settings = await new SystemSettingsRepository(state.context.database).list();
  } catch {
    return <AdminState kind="offline" />;
  }
  const query = await searchParams;
  return <AdminShell
    current="configuration"
    title="Cấu hình vận hành"
    description="Điều chỉnh những thiết lập an toàn của hệ thống. Mỗi mục đều giải thích rõ nó ảnh hưởng gì trước khi bạn lưu."
    authorization={state.context.account.authorization}
    stepUpReady={state.context.stepUpReady}
    showStepUpWarning
    status={query.error ? { kind: "error", message: query.error } : query.updated ? { kind: "updated", message: "Đã lưu cấu hình." } : null}
  >
    <AdminSection title="Thiết lập hệ thống" description="Chỉ những thiết lập an toàn được phép thay đổi mới xuất hiện; bí mật đăng nhập và khóa mã hóa không bao giờ được nhập tại đây." eyebrow="CẤU HÌNH">
      <div className="admin-card-list">{settings.map((setting) => <SettingCard key={setting.key} setting={setting} stepUpReady={state.context.stepUpReady} />)}</div>
    </AdminSection>
    <AdminSection title="Trình tự thay đổi an toàn" description="Nếu thay đổi ảnh hưởng người học, hãy ghi chú lý do trong bàn giao nội bộ và theo dõi lại sau khi lưu." eyebrow="HƯỚNG DẪN">
      <div className="admin-card-grid"><article className="admin-card"><strong>1. Đọc mô tả</strong><p>Kiểm tra tác động ngay dưới tên thiết lập.</p></article><article className="admin-card"><strong>2. Chọn giá trị</strong><p>Biểu mẫu giới hạn sẵn loại giá trị hợp lệ.</p></article><article className="admin-card"><strong>3. Lưu và đối chiếu</strong><p>Mọi thay đổi được ghi vào Nhật ký hoạt động.</p></article></div>
    </AdminSection>
  </AdminShell>;
}

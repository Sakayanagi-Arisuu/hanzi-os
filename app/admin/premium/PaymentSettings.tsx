import { PAYMENT_PROVIDERS, merchantReadiness } from "../../../src/commerce/merchant";
import type { CommerceOperationsRepository } from "../../../src/server/commerceOperationsRepository";
import { AdminSection } from "../adminComponents";
export function PaymentSettings({ settings, enabled }: { enabled: boolean; settings: Awaited<ReturnType<CommerceOperationsRepository["settings"]>> }) {
  const value = settings.value;
  return <>
    <AdminSection title="Chuẩn bị thanh toán" description="Lưu thông tin đơn vị và phương thức dự kiến ngay bây giờ. Việc lưu này chưa kích hoạt thu tiền.">
      <div className="premium-payment-status"><strong>{enabled ? "Đang nhận đơn chuyển khoản · đối soát thủ công" : "Chưa mở thu tiền thật"}</strong><p>{enabled ? "Đơn mới sẽ cung cấp thông tin ngân hàng đã lưu. Chỉ xác nhận cấp quyền sau khi đối chiếu tiền vào ngân hàng." : "Hoàn tất cấu hình ngân hàng và môi trường hosting để nhận đơn. VNPay/MoMo cần tích hợp API/webhook riêng."}</p></div>
      <div className="premium-readiness">{merchantReadiness(value, enabled).map(item => <div key={item.label}><span aria-label={item.ready ? "Đã có" : "Còn thiếu"}>{item.ready ? "✓" : "○"}</span><span>{item.label}</span><small>{item.ready ? "Đã chuẩn bị" : "Cần hoàn tất"}</small></div>)}</div>
      <form action="/admin/premium/settings" method="post" className="premium-settings-form">
        <input type="hidden" name="revision" value={settings.revision} />
        <label>Tên đơn vị bán hàng<input name="businessName" required maxLength={120} defaultValue={value.businessName} /></label>
        <label>Email hỗ trợ khách hàng<input name="supportEmail" type="email" maxLength={160} defaultValue={value.supportEmail} placeholder="hotro@tenmien.vn" /></label>
        <label>Website chính thức<input name="website" type="url" maxLength={300} defaultValue={value.website} placeholder="https://tenmien.vn" /></label>
        <label>Trang chính sách hoàn tiền<input name="refundPolicyUrl" type="url" maxLength={300} defaultValue={value.refundPolicyUrl} placeholder="https://tenmien.vn/chinh-sach-hoan-tien" /></label>
        <label>Phương thức dự kiến<select name="provider" defaultValue={value.provider}>{Object.entries(PAYMENT_PROVIDERS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <fieldset><legend>Thông tin chuyển khoản dự kiến</legend><p>Thông tin này được lưu theo từng đơn khi mở nhận chuyển khoản; thay đổi cấu hình không đổi đơn đã tạo.</p>
          <label>Ngân hàng<input name="bankName" maxLength={100} defaultValue={value.bankName} /></label>
          <label>Số tài khoản<input name="bankAccount" maxLength={40} defaultValue={value.bankAccount} /></label>
          <label>Chủ tài khoản<input name="bankHolder" maxLength={120} defaultValue={value.bankHolder} /></label>
        </fieldset>
        <button className="admin-primary-action" type="submit">Lưu cấu hình chuẩn bị</button>
      </form>
      <details className="premium-technical"><summary>Hướng dẫn kết nối khi có hosting</summary><ol><li>Thiết lập tên miền HTTPS, email hỗ trợ và chính sách hoàn tiền.</li><li>Kiểm tra tài khoản ngân hàng, chính sách hoàn tiền và người phụ trách đối soát.</li><li>Với chuyển khoản thủ công, đối chiếu sao kê rồi xác nhận đúng đơn, số tiền và mã giao dịch ngân hàng. Với cổng tự động, cần tích hợp API và webhook kiểm chữ ký riêng.</li><li>Lưu khóa bí mật trong biến môi trường hosting; không đưa vào biểu mẫu hoặc source.</li><li>Kiểm thử thanh toán lặp, thất bại, hết hạn, hoàn tiền và đối soát trước khi mở thu tiền.</li></ol><p>Chuyển khoản thủ công đã có luồng tạo đơn, đối soát và hoàn tiền. Trên hosting cần bật HANZI_CASH_LEDGER_ENABLED=1 và HANZI_BANK_TRANSFER_ENABLED=1 sau khi hoàn tất cấu hình HTTPS. VNPay/MoMo vẫn cần tích hợp API/webhook riêng.</p></details>
    </AdminSection>
  </>;
}

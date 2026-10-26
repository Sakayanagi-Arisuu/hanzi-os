import { PREMIUM_PLANS } from "../../../src/commerce/policy";
import { AdminSection } from "../adminComponents";
import { formatVnd } from "./BusinessOverview";
export function PlanCatalog({ vnd, hanzi }: { vnd: { planId: string; amount: number }[]; hanzi: { planId: string; amount: number }[] }) {
  return <AdminSection title="Danh mục gói học" description="Hai thời hạn dùng chung quyền Premium. Đổi giá chỉ áp dụng cho lượt mua sau; không viết lại giá trị đơn cũ.">
    <div className="premium-plan-grid">{PREMIUM_PLANS.map(plan => {
      const cash = vnd.find(price => price.planId === plan.id)?.amount;
      const coins = hanzi.find(price => price.planId === plan.id)?.amount;
      return <article className="premium-plan-card" key={plan.id}>
        <header><span>{plan.months === 12 ? "ĐỒNG HÀNH DÀI HẠN" : "LINH HOẠT HÀNG THÁNG"}</span><h3>{plan.label}</h3><strong>{cash ? formatVnd(cash) : "Chưa đặt giá"}</strong><small>Gia hạn thêm {plan.months} tháng lịch · không tự động trừ tiền</small></header>
        <ul><li>Bài học Premium HSK4 trong Thiên Lộ</li><li>Các cửa Luyện Đề được cấu hình Premium</li><li>Giữ nguyên tiến độ khi gói hết hạn</li></ul>
        <form action="/admin/premium/price" method="post"><input type="hidden" name="currency" value="vnd"/><input type="hidden" name="planId" value={plan.id}/><label>Giá niêm yết VNĐ<input name="amount" type="number" min={1} max={100000000} step={1} required defaultValue={cash}/></label><button type="submit">Lưu giá VNĐ</button><small>Chưa thu tiền cho đến khi kết nối thanh toán.</small></form>
        <details><summary>Giá bằng Ví Hanzi</summary><p>Đơn vị nội bộ, không quy đổi tiền mặt.</p><form action="/admin/premium/price" method="post"><input type="hidden" name="planId" value={plan.id}/><label>Số Hanzi cần dùng<input name="amount" type="number" min={1} max={1000000} step={1} required defaultValue={coins}/></label><button type="submit">Lưu giá Hanzi</button></form></details>
      </article>;
    })}</div>
  </AdminSection>;
}

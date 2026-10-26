import { MetricCard } from "../adminComponents";
import type { CommerceOperationsRepository } from "../../../src/server/commerceOperationsRepository";
export const formatVnd = (amount: number) => `${amount.toLocaleString("vi-VN")} ₫`;
type Revenue = Awaited<ReturnType<CommerceOperationsRepository["revenue"]>>;
export function BusinessOverview({ revenue, compact = false }: { revenue: Revenue; compact?: boolean }) {
  return <section className="premium-business" aria-label="Kết quả kinh doanh">
    <header><div><span className="admin-eyebrow">KINH DOANH · {revenue.days} NGÀY</span><h2>Tiền thực nhận từ hệ thống</h2><p>Chỉ tính giao dịch VNĐ đã xác minh. Ví Hanzi và sandbox không phải doanh thu.</p></div><a className="admin-quiet-action" href="/admin/premium?tab=orders&method=vnd">Xem đơn VNĐ →</a></header>
    <div className="admin-metric-grid">
      <MetricCard label="Tiền đã thu" value={formatVnd(revenue.gross)} hint={`${revenue.paidOrders} đơn có khoản thu trong kỳ`} tone="gold" />
      <MetricCard label="Tiền đã hoàn" value={formatVnd(revenue.refunded)} hint="Theo ngày hoàn tiền thực tế" />
      <MetricCard label="Phí thanh toán" value={formatVnd(revenue.fees)} hint="Phí được nhà cung cấp xác nhận" />
      <MetricCard label="Thu ròng" value={formatVnd(revenue.net)} hint="Đã thu − đã hoàn − phí; chưa trừ thuế/chi phí" tone="cyan" />
    </div>
    {!compact && <div className="premium-revenue-history"><h3>Dòng tiền theo ngày</h3><a className="admin-quiet-action" href={`/admin/premium/export?days=${revenue.days}`}>Tải báo cáo CSV</a>{revenue.daily.length
      ? <div className="premium-table-scroll"><table><thead><tr><th>Ngày (giờ Việt Nam)</th><th>Thu ròng</th></tr></thead><tbody>{revenue.daily.map(day => <tr key={day.day}><td>{day.day}</td><td>{formatVnd(day.net)}</td></tr>)}</tbody></table></div>
      : <div className="premium-empty"><strong>Chưa phát sinh tiền thật</strong><p>Khi cổng thanh toán được kết nối, khoản thu, hoàn tiền và phí đã xác minh sẽ xuất hiện tại đây. Không quy đổi Hanzi hoặc giá niêm yết thành doanh thu.</p></div>}</div>}
  </section>;
}

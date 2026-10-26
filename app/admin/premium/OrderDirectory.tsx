import { AdminSection } from "../adminComponents";
import { premiumPlan } from "../../../src/commerce/policy";
import type { CommerceOperationsRepository } from "../../../src/server/commerceOperationsRepository";
import { formatVnd } from "./BusinessOverview";
const statuses: Record<string, string> = { pending: "Chờ thanh toán", paid: "Đã hoàn tất", failed: "Thất bại", cancelled: "Đã hủy", refunded: "Đã hoàn" };
export function OrderDirectory({ data }: { data: Awaited<ReturnType<CommerceOperationsRepository["orders"]>> }) {
  const href = (page: number) => `/admin/premium?${new URLSearchParams({ tab: "orders", q: data.query, method: data.method, status: data.status, page: String(page) })}`;
  return <AdminSection title="Đơn hàng" description={`${data.total.toLocaleString("vi-VN")} kết quả · 25 đơn mỗi trang. Số tiền của từng đơn được giữ theo thời điểm mua.`}>
    <form action="/admin/premium" method="get" className="premium-order-filter"><input type="hidden" name="tab" value="orders" />
      <label>Tìm khách hàng hoặc mã đơn<input name="q" maxLength={100} defaultValue={data.query} placeholder="Tên, tên đăng nhập hoặc mã đơn" /></label>
      <label>Phương thức<select name="method" defaultValue={data.method}><option value="">Tất cả</option><option value="vnd">VNĐ · tiền thật</option><option value="hanzi">Ví Hanzi</option><option value="sandbox">Sandbox · không thu tiền</option></select></label>
      <label>Trạng thái<select name="status" defaultValue={data.status}><option value="">Tất cả</option>{Object.entries(statuses).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label><button type="submit">Tìm đơn</button>
    </form>
    {data.rows.length ? <div className="premium-table-scroll"><table><thead><tr><th>Khách hàng</th><th>Gói / mã đơn</th><th>Giá trị</th><th>Trạng thái</th><th>Ngày tạo</th></tr></thead><tbody>{data.rows.map(order => <tr key={order.id}>
      <td><a href={`/admin/premium?tab=accounts&walletUserId=${encodeURIComponent(order.userId)}`}>{order.customer}</a>{order.username && <small>@{order.username}</small>}</td>
      <td>{premiumPlan(order.planId)?.label ?? order.planId}<details><summary>Mã đơn</summary><code>{order.id}</code></details></td>
      <td><strong>{order.method === "vnd" ? formatVnd(order.amount) : order.method === "hanzi" ? `${order.amount.toLocaleString("vi-VN")} Hanzi` : "Không thu tiền"}</strong><small>{order.method === "vnd" ? "VNĐ" : order.method === "hanzi" ? "Ví nội bộ" : "Sandbox"}</small></td>
      <td><span className={`premium-order-status is-${order.status}`}>{statuses[order.status] ?? order.status}</span></td><td>{new Date(order.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</td>
    </tr>)}</tbody></table></div> : <div className="premium-empty"><strong>Chưa có đơn phù hợp</strong><p>Thử đổi bộ lọc. Đơn VNĐ chỉ có khi thanh toán thật được kết nối.</p></div>}
    <nav className="premium-pagination" aria-label="Phân trang đơn hàng">{data.page > 1 && <a href={href(data.page - 1)}>← Trang trước</a>}<span>Trang {data.page}/{data.pages}</span>{data.page < data.pages && <a href={href(data.page + 1)}>Trang sau →</a>}</nav>
  </AdminSection>;
}

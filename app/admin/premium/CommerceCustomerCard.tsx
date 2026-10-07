import { AdminSection } from "../adminComponents";
import { ORDER_STATUS_LABELS, premiumPlan } from "../../../src/commerce/policy";
import type { CommerceCustomerRepository } from "../../../src/server/commerceCustomerRepository";

type Customer = NonNullable<Awaited<ReturnType<CommerceCustomerRepository["find"]>>>;
const date = (value: number) => new Date(value).toLocaleString("vi-VN");
const entryKind: Record<string, string> = {
  admin_credit: "Admin cấp", admin_debit: "Admin thu hồi", purchase: "Mua gói", refund: "Hoàn gói",
};
const ticketStatus = { open: "Chờ phản hồi", answered: "Đã phản hồi", closed: "Đã đóng" } as const;

export function CommerceCustomerCard({ customer }: { customer: Customer }) {
  return <AdminSection title="Hồ sơ thương mại của tài khoản">
    <p><strong>{customer.displayName || customer.username || customer.userId}</strong>
      {customer.username ? ` · @${customer.username}` : ""} · {customer.status === "active" ? "Đang hoạt động" : "Tài khoản không hoạt động"}</p>
    <p>Mã tài khoản: {customer.userId}</p>
    <p><strong>{customer.access.active ? `Premium đến ${date(customer.access.expiresAt!)}` : "Chưa có Premium hiệu lực"}</strong>
      {` · Ví ${customer.wallet.balance.toLocaleString("vi-VN")} Hanzi · ${customer.orders.length} đơn · ${customer.tickets.length} yêu cầu hỗ trợ`}</p>
    <h3>Đơn và vòng đời gói</h3>
    {customer.orders.length === 0 ? <p>Chưa có đơn.</p> : <div style={{ overflowX: "auto" }}><table><thead><tr>
      <th>Ngày</th><th>Gói</th><th>Phương thức</th><th>Trạng thái</th><th>Yêu cầu hoàn</th>
    </tr></thead><tbody>{customer.orders.slice(0, 20).map(order => <tr key={order.id}>
      <td>{date(order.createdAt)}</td><td>{premiumPlan(order.planId)?.label}</td>
      <td>{order.paymentMethod === "hanzi" ? `${order.hanziAmount} Hanzi` : "Sandbox không thu tiền"}</td>
      <td>{ORDER_STATUS_LABELS[order.status]}</td>
      <td>{order.refundRejectedAt ? <>Từ chối {date(order.refundRejectedAt)} · {order.refundRejectionReason}</> : order.refundRequestedAt ? date(order.refundRequestedAt) : "—"}</td>
    </tr>)}</tbody></table>{customer.orders.length > 20 && <p>Đang hiển thị 20 đơn gần nhất.</p>}</div>}
    <h3>Biến động ví</h3>
    {customer.wallet.entries.length === 0 ? <p>Chưa có biến động.</p> : <div style={{ overflowX: "auto" }}><table><thead><tr>
      <th>Ngày</th><th>Loại</th><th>Thay đổi</th>
    </tr></thead><tbody>{customer.wallet.entries.slice(0, 20).map(entry => <tr key={entry.id}>
      <td>{date(entry.createdAt)}</td><td>{entryKind[entry.kind] ?? entry.kind}</td>
      <td>{entry.delta > 0 ? "+" : ""}{entry.delta.toLocaleString("vi-VN")} Hanzi</td>
    </tr>)}</tbody></table>{customer.wallet.entries.length > 20 && <p>Đang hiển thị 20 biến động gần nhất.</p>}</div>}
    <h3>Hỗ trợ Premium</h3>
    {customer.tickets.length === 0 ? <p>Chưa có yêu cầu.</p> : <ul>{customer.tickets.slice(0, 10).map(ticket => <li key={ticket.id}>
      {date(ticket.createdAt)} · {ticket.subject} · {ticketStatus[ticket.status]}
    </li>)}</ul>}
  </AdminSection>;
}

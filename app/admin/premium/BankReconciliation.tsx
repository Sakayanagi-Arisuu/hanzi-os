import type { BankOrder } from "../../../src/server/bankTransferRepository";
import { premiumPlan } from "../../../src/commerce/policy";
import { formatVnd } from "./BusinessOverview";
import { AdminSection } from "../adminComponents";
export function BankReconciliation({ orders }: { orders:BankOrder[] }) {
 return <AdminSection title="Đối soát chuyển khoản" description="Chỉ xác nhận sau khi xem giao dịch trong tài khoản ngân hàng. Mã giao dịch không được dùng cho hai đơn. Số tiền phải khớp toàn bộ đơn.">
   {!orders.length?<div className="premium-empty">Không có đơn chuyển khoản cần đối soát.</div>:orders.map(order=><article className="admin-queue-card" key={order.id}>
    <h3>{premiumPlan(order.planId)?.label} · {formatVnd(order.amount)}</h3><a href={`/admin/premium?tab=accounts&walletUserId=${encodeURIComponent(order.userId)}`}>Xem khách hàng</a><p>Nội dung chuyển khoản: HANZI {order.id}</p><p>{order.status==='pending'?'Chờ xác nhận tiền vào':`Yêu cầu hoàn: ${order.refundReason}`}</p>
    <form action="/admin/premium/reconcile" method="post"><input type="hidden" name="orderId" value={order.id}/><input type="hidden" name="action" value={order.status==='pending'?'capture':'refund'}/>
      <label>Số tiền đã đối chiếu (VNĐ)<input type="number" name="amount" min={1} max={100000000} step={1} required /></label>
      <label>Mã giao dịch {order.status==='pending'?'tiền vào':'chuyển hoàn'} của ngân hàng<input name="bankReference" minLength={6} maxLength={100} required pattern="[A-Za-z0-9._:/-]+"/></label>
      <label className="premium-confirm-check"><input type="checkbox" name="verified" value="yes" required/><span>{order.status==='pending'?'Tôi đã đối chiếu ngân hàng: đúng người chuyển, nội dung và số tiền.':'Tôi đã chuyển hoàn toàn bộ số tiền cho khách và kiểm tra biên nhận ngân hàng.'}</span></label>
      <button type="submit">{order.status==='pending'?'Xác nhận đã thu & cấp Premium':'Ghi nhận đã hoàn tiền'}</button>
    </form>
   </article>)}
 </AdminSection>;
}

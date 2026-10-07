import { PremiumVndPriceRepository } from "../../../src/server/premiumVndPriceRepository";
import { AdminShell, AdminState } from "../AdminShell";
import { AdminSection } from "../adminComponents";
import { loadAdminContext } from "../adminServer";
import { CommerceRepository } from "../../../src/server/commerceRepository";
import { ORDER_STATUS_LABELS, premiumPlan } from "../../../src/commerce/policy";
import { PremiumSupportRepository } from "../../../src/server/premiumSupportRepository";
import { HanziWalletRepository } from "../../../src/server/hanziWalletRepository";
import { HanziPremiumRepository } from "../../../src/server/hanziPremiumRepository";
import { LessonAccessRepository } from "../../../src/server/lessonAccessRepository";
import { CommerceCustomerRepository } from "../../../src/server/commerceCustomerRepository";
import { CommerceCustomerCard } from "./CommerceCustomerCard";
import { LESSON_BY_ID } from "../../../src/data/curriculum";
import { getHskLessonPathId } from "../../../src/data/hskCurriculumGraph";
const supportCategory = { access: "Quyền truy cập", billing: "Gói và giao dịch", technical: "Lỗi kỹ thuật" } as const;
export const dynamic = "force-dynamic";
export default async function PremiumAdminPage({ searchParams }: { searchParams: Promise<{ notice?: string; walletUserId?: string }> }) {
  const state = await loadAdminContext("commerce:manage");
  if (state.kind !== "ok") return <AdminState kind={state.kind} />;
  const query = await searchParams;
  let dashboard;
  let supportQueue;
  let walletEntries;
  let hanziPrices;
  let vndPrices;
  let hanziRefunds;
  let freeHsk4LessonIds;
  let customer: Awaited<ReturnType<CommerceCustomerRepository["find"]>> = null;
  try {
    dashboard = await new CommerceRepository(state.context.database).dashboard();
    supportQueue = await new PremiumSupportRepository(state.context.database).queue();
    walletEntries = await new HanziWalletRepository(state.context.database).recent();
    const hanzi = new HanziPremiumRepository(state.context.database);
    hanziPrices = await hanzi.prices();
    vndPrices = await new PremiumVndPriceRepository(state.context.database).prices();
    hanziRefunds = await hanzi.pendingRefunds();
    freeHsk4LessonIds = await new LessonAccessRepository(state.context.database).freeHsk4LessonIds();
    if (query.walletUserId && query.walletUserId.length <= 100) {
      customer = await new CommerceCustomerRepository(state.context.database).find(query.walletUserId);
    }
  }
  catch { return <AdminState kind="offline" />; }
  const notice = query.notice;
  return <AdminShell current="premium" title="Gói Premium HSK4" description="Giao dịch thử nghiệm trên máy này. Không có doanh thu thật." authorization={state.context.account.authorization}>
    <AdminSection title="Tình hình thử nghiệm"><p>{dashboard.totalOrders} giao dịch · {dashboard.customers} tài khoản từng tạo đơn · {dashboard.activeCustomers} tài khoản còn hiệu lực · {dashboard.refundedOrders} lượt hoàn · {dashboard.pendingRefunds.length + hanziRefunds.length} yêu cầu chờ xử lý.</p><p>{dashboard.walletPurchases} lượt mua bằng Ví Hanzi · {dashboard.repeatCustomers} tài khoản từng mua từ hai lượt · {dashboard.expiringNext7Days} gói sẽ hết hạn trong 7 ngày · {supportQueue.length} yêu cầu hỗ trợ đang chờ.</p><p>Gồm giao dịch Ví Hanzi và sandbox không thu tiền. Không dùng số giao dịch thử nghiệm để tính doanh thu hoặc tỷ lệ chuyển đổi trả phí.</p></AdminSection>
    {notice && <p role="status">{notice}</p>}
    <AdminSection title="Tra cứu tài khoản"><p>Nhập chính xác tên đăng nhập HANZI.OS hoặc mã tài khoản để xem quyền gói, đơn, ví và hỗ trợ.</p><form action="/admin/premium" method="get"><label>Tên đăng nhập hoặc mã tài khoản<input name="walletUserId" maxLength={100} defaultValue={query.walletUserId ?? ""} required /></label><button type="submit">Xem hồ sơ</button></form>{query.walletUserId && !customer && <p>Không tìm thấy tài khoản này.</p>}</AdminSection>
    {customer && <CommerceCustomerCard customer={customer} />}
    <AdminSection title="Ví Hanzi · đơn vị thử nghiệm"><p>Admin cấp hoặc thu hồi Hanzi cho tài khoản đã có. Hanzi chưa quy đổi ra VND và chưa có chức năng tự nạp.</p><form action="/admin/premium/wallet" method="post"><input type="hidden" name="referenceId" value={crypto.randomUUID()} /><label>Mã tài khoản<input name="userId" required maxLength={100} defaultValue={customer?.userId ?? ""} /></label><label>Thay đổi số dư (số âm để thu hồi)<input name="amount" type="number" required min={-1000000} max={1000000} step={1} /></label><button className="admin-primary-action" type="submit">Cập nhật ví</button></form><h3>Biến động gần đây</h3>{walletEntries.length === 0 ? <p>Chưa có biến động.</p> : <div style={{ overflowX: "auto" }}><table><thead><tr><th>Ngày</th><th>Tài khoản</th><th>Hanzi</th><th>Loại</th></tr></thead><tbody>{walletEntries.map(entry => <tr key={entry.id}><td>{new Date(entry.createdAt).toLocaleString("vi-VN")}</td><td>{entry.userId}</td><td>{entry.delta > 0 ? `+${entry.delta}` : entry.delta}</td><td>{entry.kind === "admin_credit" ? "Cấp" : entry.kind === "admin_debit" ? "Thu hồi" : entry.kind}</td></tr>)}</tbody></table></div>}</AdminSection>
    <AdminSection title="Giá niêm yết VNĐ"><p>Giá hiển thị trên trang Premium, độc lập với Hanzi xu. Chưa mở thanh toán tiền thật.</p>{(["hsk4-month", "hsk4-year"] as const).map(planId => <form action="/admin/premium/price" method="post" key={planId}><input type="hidden" name="currency" value="vnd" /><input type="hidden" name="planId" value={planId} /><label>{premiumPlan(planId)?.label} · VNĐ<input name="amount" type="number" required min={1} max={100000000} step={1} defaultValue={vndPrices.find(price => price.planId === planId)?.amount ?? ""} /></label><button className="admin-primary-action" type="submit">Lưu giá VNĐ</button></form>)}</AdminSection>
    <AdminSection title="Giá gói bằng Hanzi"><p>Chỉ áp dụng cho Ví Hanzi thử nghiệm. Giá VNĐ được cấu hình riêng; Hanzi không quy đổi tiền mặt.</p>{(["hsk4-month", "hsk4-year"] as const).map(planId => <form action="/admin/premium/price" method="post" key={planId}><input type="hidden" name="planId" value={planId} /><label>{premiumPlan(planId)?.label}<input name="amount" type="number" required min={1} max={1000000} step={1} defaultValue={hanziPrices.find(price => price.planId === planId)?.amount ?? ""} placeholder="Chưa đặt giá" /></label><button className="admin-primary-action" type="submit">Lưu giá Hanzi</button></form>)}</AdminSection>
    <AdminSection title="Quyền bài Thiên Lộ"><p>HSK0–HSK3 vẫn miễn phí. Mặc định mọi bài HSK4 cần Premium; có thể mở miễn phí từng bài HSK4. Chỉ áp dụng cho bài Thiên Lộ, không đổi từ điển hoặc đề luyện.</p><form action="/admin/premium/access" method="post"><label>Bài HSK4<select name="lessonId" required>{[...LESSON_BY_ID.values()].filter(lesson => getHskLessonPathId(lesson.id) === "hsk4").map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.title} · {lesson.id}{freeHsk4LessonIds.includes(lesson.id) ? " · Free" : " · Premium"}</option>)}</select></label><label>Quyền truy cập<select name="tier" required defaultValue=""><option value="" disabled>Chọn Free hoặc Premium</option><option value="free">Free</option><option value="premium">Premium</option></select></label><button className="admin-primary-action" type="submit">Lưu quyền bài</button></form><p>{freeHsk4LessonIds.length} bài HSK4 đang mở Free.</p></AdminSection>
    <AdminSection title="Yêu cầu hoàn Ví Hanzi">{hanziRefunds.length === 0 ? <p>Chưa có yêu cầu.</p> : hanziRefunds.map(order => <article className="admin-queue-card" key={order.id}><h3>{premiumPlan(order.planId)?.label} · {order.amount} Hanzi</h3><p>Tài khoản {order.userId} · {order.refundReason}</p><form action="/admin/premium/refund" method="post"><input type="hidden" name="orderId" value={`hanzi:${order.id}`} /><button className="admin-primary-action" type="submit">Hoàn vào Ví Hanzi</button></form><form action="/admin/premium/reject-refund" method="post"><input type="hidden" name="orderId" value={`hanzi:${order.id}`} /><label>Lý do từ chối cho người học<textarea name="reason" required minLength={10} maxLength={500} rows={3} /></label><button type="submit">Từ chối yêu cầu</button></form></article>)}</AdminSection>
    <AdminSection title="Yêu cầu hỗ trợ Premium">{supportQueue.length === 0 ? <p>Chưa có yêu cầu đang chờ.</p> : supportQueue.map(ticket => <article className="admin-queue-card" key={ticket.id}><h3>{ticket.subject}</h3><p>{supportCategory[ticket.category]} · {new Date(ticket.createdAt).toLocaleString("vi-VN")} · Tài khoản {ticket.userId}</p><p>{ticket.message}</p><form action="/admin/premium/support" method="post"><input type="hidden" name="ticketId" value={ticket.id} /><label>Phản hồi cho người học<textarea name="response" required minLength={10} maxLength={2000} rows={4} /></label><button className="admin-primary-action" type="submit">Gửi phản hồi</button></form></article>)}</AdminSection>
    <AdminSection title="Yêu cầu hoàn thử nghiệm">{dashboard.pendingRefunds.length === 0 ? <p>Chưa có yêu cầu.</p> : dashboard.pendingRefunds.map(order => <article className="admin-queue-card" key={order.id}><h3>{premiumPlan(order.planId)?.label}</h3><p>Yêu cầu ngày {new Date(order.refundRequestedAt!).toLocaleString("vi-VN")}</p><p>Lý do: {order.refundReason}</p><form action="/admin/premium/refund" method="post"><input type="hidden" name="orderId" value={order.id} /><button className="admin-primary-action" type="submit">Xác nhận hoàn giao dịch thử nghiệm</button></form></article>)}</AdminSection>
    <AdminSection title="200 giao dịch gần đây"><div style={{ overflowX: "auto" }}><table><thead><tr><th>Ngày</th><th>Gói</th><th>Phương thức</th><th>Trạng thái</th><th>Tài khoản</th></tr></thead><tbody>{dashboard.recentOrders.map(order => <tr key={order.id}><td>{new Date(order.createdAt).toLocaleString("vi-VN")}</td><td>{premiumPlan(order.planId)?.label}</td><td>{order.paymentMethod === "hanzi" ? `${order.hanziAmount} Hanzi` : "Không thu tiền"}</td><td>{ORDER_STATUS_LABELS[order.status]}</td><td>{order.userId}</td></tr>)}</tbody></table></div></AdminSection>
  </AdminShell>;
}

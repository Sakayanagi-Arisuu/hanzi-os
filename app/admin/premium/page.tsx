import { BankTransferRepository } from "../../../src/server/bankTransferRepository";
import { BankReconciliation } from "./BankReconciliation";
import { PlanCatalog } from "./PlanCatalog";
import { CommerceOperationsRepository } from "../../../src/server/commerceOperationsRepository";
import { BusinessOverview } from "./BusinessOverview";
import { PaymentSettings } from "./PaymentSettings";
import { OrderDirectory } from "./OrderDirectory";
import { MetricCard } from "../adminComponents";
import { PremiumWorkspace } from "./PremiumWorkspace";
import { PremiumVndPriceRepository } from "../../../src/server/premiumVndPriceRepository";
import { AdminShell, AdminState } from "../AdminShell";
import { AdminSection } from "../adminComponents";
import { loadAdminContext } from "../adminServer";
import { CommerceRepository } from "../../../src/server/commerceRepository";
import { premiumPlan } from "../../../src/commerce/policy";
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
export default async function PremiumAdminPage({ searchParams }: { searchParams: Promise<{ notice?: string; walletUserId?: string; tab?: string; q?: string; method?: string; status?: string; page?: string; days?: string }> }) {
  const state = await loadAdminContext("commerce:manage");
  if (state.kind !== "ok") return <AdminState kind={state.kind} />;
  const query = await searchParams;
  const days = [7,30,90].includes(Number(query.days)) ? Number(query.days) : 30;
  let bankEnabled: boolean;
  let bankOrders;
  let cashCustomers;
  let revenue;
  let settings;
  let orders;
  let dashboard;
  let supportQueue;
  let walletEntries;
  let hanziPrices;
  let vndPrices;
  let hanziRefunds;
  let freeHsk4LessonIds;
  let customer: Awaited<ReturnType<CommerceCustomerRepository["find"]>> = null;
  try {
    const db = state.context.database;
    const operations = new CommerceOperationsRepository(db);
    [dashboard, supportQueue, walletEntries, hanziPrices, vndPrices, hanziRefunds, freeHsk4LessonIds, revenue, settings, orders] = await Promise.all([
      new CommerceRepository(db).dashboard(), new PremiumSupportRepository(db).queue(),
      new HanziWalletRepository(db).recent(), new HanziPremiumRepository(db).prices(),
      new PremiumVndPriceRepository(db).prices(), new HanziPremiumRepository(db).pendingRefunds(),
      new LessonAccessRepository(db).freeHsk4LessonIds(), operations.revenue(days), operations.settings(),
      operations.orders({ query: query.q, method: query.method, status: query.status, page: Number(query.page) }),
    ]);
    cashCustomers = await operations.cashCustomers();
    const bank = new BankTransferRepository(db);
    bankOrders = await bank.pending();
    bankEnabled = (await bank.availability(settings.value.website || "http://localhost")).enabled;
    if (query.walletUserId && query.walletUserId.length <= 100) {
      customer = await new CommerceCustomerRepository(state.context.database, Date.now(), true).find(query.walletUserId);
    }
  }
  catch { return <AdminState kind="offline" />; }
  const notice = query.notice;
  return <AdminShell current="premium" title="Kinh doanh Premium" description="Quản lý gói học, khách hàng, đơn hàng và thanh toán." authorization={state.context.account.authorization}>
    <section className="premium-hero"><div><span className="admin-eyebrow">HANZI.OS · PREMIUM</span><h2>Vận hành gói học từ một nơi</h2><p>{cashCustomers.active} khách Premium VNĐ · {cashCustomers.expiring} sắp hết hạn · {supportQueue.length + dashboard.pendingRefunds.length + hanziRefunds.length + bankOrders.length} yêu cầu cần xử lý.</p></div><a href="/admin/premium?tab=payments" className="premium-connection-badge">{bankEnabled ? "Chuyển khoản: đang nhận đơn →" : "Thanh toán VNĐ: chưa mở →"}</a></section>
    {notice && <p className="premium-notice" role="status">{notice}</p>}
    <PremiumWorkspace initialTab={query.tab ?? (query.walletUserId ? "accounts" : "overview")}>
    <div data-premium-group="overview"><form className="premium-period" method="get"><input type="hidden" name="tab" value="overview"/><label>Kỳ báo cáo<select name="days" defaultValue={days}><option value="7">7 ngày</option><option value="30">30 ngày</option><option value="90">90 ngày</option></select></label><button type="submit">Xem báo cáo</button></form><BusinessOverview revenue={revenue}/><div className="admin-metric-grid"><MetricCard value={cashCustomers.active} label="Khách Premium VNĐ hiệu lực"/><MetricCard value={cashCustomers.expiring} label="Gói VNĐ hết hạn trong 7 ngày" tone="gold"/><MetricCard value={bankOrders.length} label="Chuyển khoản cần đối soát" href="/admin/premium?tab=payments"/></div>
      <AdminSection title="Vận hành Premium" description="Số liệu quyền truy cập hiện tại, gồm Ví Hanzi và sandbox; không phải số khách đã trả tiền VNĐ.">
      <div className="admin-metric-grid"><MetricCard value={dashboard.activeCustomers} label="Quyền đang hiệu lực" hint="Từ giao dịch nội bộ/sandbox"/><MetricCard value={dashboard.expiringNext7Days} label="Hết hạn trong 7 ngày" tone="gold"/><MetricCard value={dashboard.pendingRefunds.length + hanziRefunds.length} label="Yêu cầu hoàn đang chờ" href="/admin/premium?tab=support"/><MetricCard value={supportQueue.length} label="Cần hỗ trợ" href="/admin/premium?tab=support" tone="cyan"/></div>
      <div className="premium-quick-links"><a href="/admin/premium?tab=orders">Tra cứu đơn hàng →</a><a href="/admin/premium?tab=plans">Cập nhật gói & giá →</a><a href="/admin/premium?tab=support">Xử lý hỗ trợ & hoàn tiền →</a></div>
      </AdminSection>
    </div>
    <div data-premium-group="payments"><BankReconciliation orders={bankOrders}/><PaymentSettings settings={settings} enabled={bankEnabled}/></div>
    <div data-premium-group="orders"><OrderDirectory data={orders}/></div>
    <div data-premium-group="accounts"><AdminSection title="Tra cứu tài khoản"><p>Nhập chính xác tên đăng nhập HANZI.OS hoặc mã tài khoản để xem quyền gói, đơn, ví và hỗ trợ.</p><form action="/admin/premium" method="get"><input type="hidden" name="tab" value="accounts"/><label>Tên đăng nhập hoặc mã tài khoản<input name="walletUserId" maxLength={100} defaultValue={query.walletUserId ?? ""} required /></label><button type="submit">Xem hồ sơ</button></form>{query.walletUserId && !customer && <p>Không tìm thấy tài khoản này.</p>}</AdminSection></div>
    <div data-premium-group="accounts">{customer && <CommerceCustomerCard customer={customer} />}</div>
    <div data-premium-group="accounts"><AdminSection title="Ví Hanzi · quản lý số dư nội bộ"><p>Admin cấp hoặc thu hồi Hanzi cho tài khoản đã có. Hanzi chưa quy đổi ra VND và chưa có chức năng tự nạp.</p>{customer ? <form action="/admin/premium/wallet" method="post"><input type="hidden" name="referenceId" value={crypto.randomUUID()} /><input type="hidden" name="userId" value={customer.userId}/><p>Đang điều chỉnh ví của <strong>{customer.displayName || customer.username}</strong>. Số dư hiện tại: {customer.wallet.balance.toLocaleString("vi-VN")} Hanzi.</p><label>Thay đổi số dư (số âm để thu hồi)<input name="amount" type="number" required min={-1000000} max={1000000} step={1} /></label><button className="admin-primary-action" type="submit">Cập nhật ví</button></form> : <p>Tra cứu khách hàng phía trên trước khi cấp hoặc thu hồi Hanzi.</p>}<h3>Biến động gần đây</h3>{walletEntries.length === 0 ? <p>Chưa có biến động.</p> : <div style={{ overflowX: "auto" }}><table><thead><tr><th>Ngày</th><th>Tài khoản</th><th>Hanzi</th><th>Loại</th></tr></thead><tbody>{walletEntries.map(entry => <tr key={entry.id}><td>{new Date(entry.createdAt).toLocaleString("vi-VN")}</td><td>{entry.userId}</td><td>{entry.delta > 0 ? `+${entry.delta}` : entry.delta}</td><td>{entry.kind === "admin_credit" ? "Cấp" : entry.kind === "admin_debit" ? "Thu hồi" : entry.kind}</td></tr>)}</tbody></table></div>}</AdminSection></div>
    <div data-premium-group="plans"><PlanCatalog vnd={vndPrices} hanzi={hanziPrices}/></div>
    <div data-premium-group="access"><AdminSection title="Quyền bài Thiên Lộ"><p>HSK0–HSK3 vẫn miễn phí. Mặc định mọi bài HSK4 cần Premium; có thể mở miễn phí từng bài HSK4. Chỉ áp dụng cho bài Thiên Lộ, không đổi từ điển hoặc đề luyện.</p><form action="/admin/premium/access" method="post"><label>Bài HSK4<select name="lessonId" required>{[...LESSON_BY_ID.values()].filter(lesson => getHskLessonPathId(lesson.id) === "hsk4").map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.title} · {lesson.id}{freeHsk4LessonIds.includes(lesson.id) ? " · Free" : " · Premium"}</option>)}</select></label><label>Quyền truy cập<select name="tier" required defaultValue=""><option value="" disabled>Chọn Free hoặc Premium</option><option value="free">Free</option><option value="premium">Premium</option></select></label><button className="admin-primary-action" type="submit">Lưu quyền bài</button></form><p>{freeHsk4LessonIds.length} bài HSK4 đang mở Free.</p></AdminSection></div>
    <div data-premium-group="support"><AdminSection title="Yêu cầu hoàn Ví Hanzi">{hanziRefunds.length === 0 ? <p>Chưa có yêu cầu.</p> : hanziRefunds.map(order => <article className="admin-queue-card" key={order.id}><h3>{premiumPlan(order.planId)?.label} · {order.amount} Hanzi</h3><p>Tài khoản {order.userId} · {order.refundReason}</p><form action="/admin/premium/refund" method="post"><input type="hidden" name="orderId" value={`hanzi:${order.id}`} /><button className="admin-primary-action" type="submit">Hoàn vào Ví Hanzi</button></form><form action="/admin/premium/reject-refund" method="post"><input type="hidden" name="orderId" value={`hanzi:${order.id}`} /><label>Lý do từ chối cho người học<textarea name="reason" required minLength={10} maxLength={500} rows={3} /></label><button type="submit">Từ chối yêu cầu</button></form></article>)}</AdminSection></div>
    <div data-premium-group="support"><AdminSection title="Yêu cầu hỗ trợ Premium">{supportQueue.length === 0 ? <p>Chưa có yêu cầu đang chờ.</p> : supportQueue.map(ticket => <article className="admin-queue-card" key={ticket.id}><h3>{ticket.subject}</h3><p>{supportCategory[ticket.category]} · {new Date(ticket.createdAt).toLocaleString("vi-VN")} · Tài khoản {ticket.userId}</p><p>{ticket.message}</p><form action="/admin/premium/support" method="post"><input type="hidden" name="ticketId" value={ticket.id} /><label>Phản hồi cho người học<textarea name="response" required minLength={10} maxLength={2000} rows={4} /></label><button className="admin-primary-action" type="submit">Gửi phản hồi</button></form></article>)}</AdminSection></div>
    <div data-premium-group="support"><AdminSection title="Yêu cầu hoàn thử nghiệm">{dashboard.pendingRefunds.length === 0 ? <p>Chưa có yêu cầu.</p> : dashboard.pendingRefunds.map(order => <article className="admin-queue-card" key={order.id}><h3>{premiumPlan(order.planId)?.label}</h3><p>Yêu cầu ngày {new Date(order.refundRequestedAt!).toLocaleString("vi-VN")}</p><p>Lý do: {order.refundReason}</p><form action="/admin/premium/refund" method="post"><input type="hidden" name="orderId" value={order.id} /><button className="admin-primary-action" type="submit">Xác nhận hoàn giao dịch thử nghiệm</button></form></article>)}</AdminSection></div>
    </PremiumWorkspace>
  </AdminShell>;
}

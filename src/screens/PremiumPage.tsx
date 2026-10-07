import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Check, Crown, ArrowLeft, ArrowUpRight, BookOpen, ShieldCheck, Wallet, ChevronRight, X, Headphones } from "lucide-react";
import { useCommerce } from "../commerce/CommerceProvider";
import { ORDER_STATUS_LABELS, PREMIUM_PLANS, premiumPlan, type CommerceOrder, type PremiumPlanId } from "../commerce/policy";
import { PremiumSupportSection } from "../commerce/PremiumSupportSection";
import "../commerce/premium-offer.css";

const date = (value: number) => new Date(value).toLocaleString("vi-VN");
export function PremiumPage() {
  const { snapshot, loading, error, refresh } = useCommerce();
  const [planId, setPlanId] = useState<PremiumPlanId>("hsk4-month");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const [selected, setSelected] = useState<CommerceOrder | null>(null);
  const [refundId, setRefundId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const requestKey = useRef<{ plan: PremiumPlanId; key: string } | null>(null);
  const walletKey = useRef<{ plan: PremiumPlanId; amount: number; key: string } | null>(null);
  const [walletRevision, setWalletRevision] = useState(0);
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [accountPanel, setAccountPanel] = useState<"wallet" | "orders" | "support">("wallet");
  const [accountOpen, setAccountOpen] = useState(false);
  const accountDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = accountDialog.current;
    if (accountOpen && !dialog?.open) dialog?.showModal();
    else if (!accountOpen && dialog?.open) dialog.close();
  }, [accountOpen]);
  const openAccountPanel = (panel: "wallet" | "orders" | "support") => {
    setAccountPanel(panel); setAccountOpen(true);
  };
  const [wallet, setWallet] = useState<{ balance: number; entries: { id: string; delta: number; createdAt: number; kind?: string; referenceId?: string }[] } | null>(null);
  const [walletError, setWalletError] = useState("");
  useEffect(() => {
    if (!snapshot?.authenticated) { setWallet(null); setWalletError(""); return; }
    const controller = new AbortController();
    fetch("/api/wallet", { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Chưa tải được Ví Hanzi.");
      setWallet(await response.json()); setWalletError("");
    }).catch(() => { if (!controller.signal.aborted) setWalletError("Ví Hanzi chưa khả dụng. Hãy thử lại sau."); });
    return () => controller.abort();
  }, [snapshot?.authenticated, walletRevision]);
  const hanziPrice = snapshot?.prices?.find(price => price.planId === planId)?.amount;
  const sandboxConfirmationOpen = Boolean(snapshot?.sandbox && !snapshot.prices?.length);
  async function purchaseWithWallet() {
    if (busy) return;
    if (!hanziPrice) return;
    if (walletKey.current?.plan !== planId) walletKey.current = { plan: planId, amount: hanziPrice, key: crypto.randomUUID() };
    const purchaseKey = walletKey.current.key;
    setBusy(true); setFailure(""); setMessage("");
    try {
      const response = await fetch("/api/wallet", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ planId, key: purchaseKey, expectedAmount: walletKey.current.amount }) });
      const body = await response.json() as { order?: CommerceOrder; error?: { message?: string } };
      if (!response.ok || !body.order) throw new Error(body.error?.message ?? "Chưa mua được gói bằng Hanzi.");
      walletKey.current = null;
      setWalletRevision(value => value + 1);
      refresh();
      setMessage("Đã dùng Ví Hanzi để kích hoạt gói. Bạn có thể trở lại Thiên Lộ.");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Chưa kết nối được. Hãy thử lại.";
      try {
        const lookup = await fetch("/api/commerce", { cache: "no-store" });
        if (lookup.ok) {
          const latest = await lookup.json() as { orders?: CommerceOrder[] };
          if (latest.orders?.some(order => order.paymentMethod === "hanzi" && order.idempotencyKey === purchaseKey && order.status === "paid")) {
            walletKey.current = null; setWalletRevision(value => value + 1); refresh();
            setMessage("Gói đã được kích hoạt bằng Ví Hanzi.");
            return;
          }
        }
      } catch { /* Keep the key for an idempotent retry. */ }
      if (message.includes("Giá Hanzi đã thay đổi")) { walletKey.current = null; refresh(); }
      setFailure(message);
    }
    finally { setBusy(false); }
  }
  async function mutate(input: Record<string, unknown>, success: string) {
    if (busy) return;
    setBusy(true); setFailure(""); setMessage("");
    try {
      const response = await fetch("/api/commerce", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
      const body = await response.json() as { order?: CommerceOrder; error?: { message?: string } };
      if (!response.ok || !body.order) throw new Error(body.error?.message ?? "Chưa xử lý được. Hãy thử lại.");
      setSelected(body.order.status === "pending" ? body.order : null);
      if (input.action !== "create") requestKey.current = null;
      setRefundId(null); setReason(""); setMessage(success); refresh();
    } catch (cause) { setFailure(cause instanceof Error ? cause.message : "Chưa kết nối được. Hãy thử lại."); }
    finally { setBusy(false); }
  }
  function create() {
    if (requestKey.current?.plan !== planId) requestKey.current = { plan: planId, key: crypto.randomUUID() };
    void mutate({ action: "create", planId, key: requestKey.current.key }, "Kiểm tra kỳ hạn rồi xác nhận giao dịch thử nghiệm.");
  }
  return <div className="content-page premium-page">
    <nav className="premium-topline" aria-label="Điều hướng gói học">
      <Link to="/profile" className="premium-back"><ArrowLeft size={17} /> Hồ sơ</Link>
      <button className="premium-wallet-summary" type="button" onClick={() => openAccountPanel("wallet")} aria-label="Xem số dư và giao dịch Ví Hanzi">
        <Wallet size={21} /><span><small>VÍ HANZI</small><strong>{!snapshot?.authenticated ? "Cần đăng nhập" : walletError ? "Chưa tải được" : wallet ? `${wallet.balance.toLocaleString("vi-VN")} xu` : "Đang tải…"}</strong></span><ChevronRight size={17} />
      </button>
    </nav>
    <div className="premium-offer">
      <section className="premium-story" aria-labelledby="premium-title">
        <span className="premium-eyebrow premium-hero-badge"><Crown size={16} /> HANZI.OS · PREMIUM</span>
        <h1 id="premium-title">Khai mở<br /><em>chặng đường mới.</em></h1>
        <p className="premium-lead">Đưa hành trình tiếng Trung lên HSK4. Dùng Hanzi xu bạn tích lũy để mở bài học và những cửa luyện đề Premium.</p>
        <ul className="premium-benefits">
          <li><BookOpen size={20} /><span><strong>Mở bài học Thiên Lộ HSK4</strong><small>Học theo lộ trình và điều kiện tiên quyết của từng bài.</small></span></li>
          <li><Crown size={20} /><span><strong>Mở thêm đề tại Phòng Luyện Đề</strong><small>Truy cập các cửa luyện đề được đánh dấu Premium.</small></span></li>
          <li><Check size={20} /><span><strong>Chủ động kỳ hạn học</strong><small>Gia hạn khi bạn muốn, không tự động trừ tiền.</small></span></li>
        </ul>
      </section>
      <section className="premium-purchase" aria-labelledby="premium-plan-title">
        <div className="premium-purchase-heading"><span className="premium-eyebrow">GÓI HỌC CỦA BẠN</span><Crown size={27} /></div>
        <h2 id="premium-plan-title">Chọn chặng tu luyện</h2>
        <p className="premium-purchase-intro">Thiên Lộ HSK4 + đề luyện Premium.</p>
        {loading ? <p role="status" className="premium-inline-state">Đang tải gói học…</p> : error ? <p role="alert" className="premium-inline-state">{error} <button className="secondary-button" type="button" onClick={refresh}>Thử lại</button></p> : <>
          {snapshot?.active && <div className="premium-active"><Check size={17} /><span>Đang hiệu lực đến <strong>{date(snapshot.expiresAt!)}</strong></span></div>}
          <fieldset className="premium-plan-picker" disabled={busy || Boolean(selected && sandboxConfirmationOpen)}>
            <legend>Chọn kỳ hạn</legend>
            {PREMIUM_PLANS.map(plan => {
              const amount = snapshot?.prices?.find(price => price.planId === plan.id)?.amount;
              const vndAmount = snapshot?.vndPrices?.find(price => price.planId === plan.id)?.amount;
              return <label key={plan.id} className={planId === plan.id ? "is-selected" : ""}>
                <input type="radio" name="premium-plan" value={plan.id} checked={planId === plan.id} onChange={() => { setPlanId(plan.id); requestKey.current = null; }} />
                <span><strong>{plan.months === 1 ? "1 tháng" : "1 năm"}</strong><small>{plan.months === 1 ? "Bắt đầu một chặng học" : "Duy trì hành trình dài hạn"}</small></span>
                <span className="premium-option-price"><strong>{vndAmount ? `${vndAmount.toLocaleString("vi-VN")}đ` : "Chưa niêm yết"}</strong><small>{amount ? `hoặc ${amount.toLocaleString("vi-VN")} Hanzi xu` : "Chưa mở đổi xu"}</small></span>
              </label>;
            })}
          </fieldset>
          {walletError && <p role="alert" className="premium-inline-state">{walletError} <button type="button" onClick={() => setWalletRevision(value => value + 1)}>Tải lại ví</button></p>}
          {selected && sandboxConfirmationOpen ? <div className="premium-checkout" aria-labelledby="checkout-title"><h3 id="checkout-title">Xác nhận trải nghiệm</h3><p>{premiumPlan(selected.planId)?.label} · Không thu tiền.</p><button className="primary-button premium-buy" disabled={busy} onClick={() => void mutate({ action: "pay", orderId: selected.id }, "Đã kích hoạt gói thử nghiệm. Bạn có thể trở lại Thiên Lộ.")}>Xác nhận không thu tiền <ArrowUpRight size={18} /></button><button className="premium-cancel" disabled={busy} onClick={() => void mutate({ action: "cancel", orderId: selected.id }, "Đã hủy giao dịch.")}>Hủy giao dịch</button></div> : <>
            {!snapshot?.authenticated ? <a className="primary-button premium-buy" href="/signin?returnTo=%2Fprofile%2Fpremium">Đăng nhập để chọn gói <ArrowUpRight size={18} /></a> : snapshot.sandbox && hanziPrice ? <button className="primary-button premium-buy" type="button" disabled={busy || !wallet || wallet.balance < hanziPrice} onClick={() => void purchaseWithWallet()}>{busy ? "Đang xử lý…" : `Đổi ${hanziPrice.toLocaleString("vi-VN")} Hanzi · ${planId === "hsk4-month" ? "1 tháng" : "1 năm"}`}<ArrowUpRight size={18} /></button> : snapshot.sandbox && snapshot.prices?.length ? <p className="premium-inline-state">Kỳ hạn này chưa có giá Hanzi. Hãy chọn kỳ hạn khác.</p> : snapshot.sandbox ? <button className="primary-button premium-buy" type="button" disabled={busy || Boolean(selected)} onClick={create}>{busy ? "Đang xử lý…" : snapshot.active ? "Gia hạn trải nghiệm" : "Bắt đầu trải nghiệm"}<ArrowUpRight size={18} /></button> : <button className="primary-button premium-buy" disabled>Chưa mở thanh toán</button>}
          </>}
          {hanziPrice && wallet && wallet.balance < hanziPrice && <p className="premium-balance-note">Thiếu {(hanziPrice - wallet.balance).toLocaleString("vi-VN")} xu · Nhận thưởng lên cấp tại Bảo Khố.</p>}
          {hanziPrice && wallet && !walletError && wallet.balance >= hanziPrice && <p className="premium-balance-note">Sau đổi còn {(wallet.balance - hanziPrice).toLocaleString("vi-VN")} xu trong ví.</p>}
          <div aria-live="polite">{message && <p role="status" className="premium-feedback">{message} <Link to="/path">Về Thiên Lộ <ChevronRight size={16} /></Link></p>}</div>
          {failure && <p role="alert" className="premium-inline-state">{failure}</p>}
          <p className="premium-renewal-note"><ShieldCheck size={15} /> Không tự gia hạn · Giữ nguyên dữ liệu học</p>
          <p className="premium-test-note">{snapshot?.sandbox ? "Bản trải nghiệm · Xu từ thưởng lên cấp, không quy đổi tiền mặt. Chưa thu tiền thật." : "Thanh toán chưa mở. Giá và phương thức mua sẽ được cập nhật tại đây."}</p>
        </>}
      </section>
    </div>
    <section className="premium-free-strip" aria-label="Quyền học miễn phí"><span className="premium-free-icon"><BookOpen size={22} /></span><div><strong>Chặng nền tảng luôn miễn phí</strong><p>Bài HSK0–HSK3, từ điển, chữ Hán và khảo nghiệm vẫn dùng bình thường. Phòng Luyện Đề mở miễn phí mặc định các cửa A, B, C ở mỗi HSK.</p></div><Link to="/path">Tiếp tục học <ArrowUpRight size={17} /></Link></section>
    <section className="premium-assurance" aria-labelledby="premium-assurance-title">
      <header><span className="premium-eyebrow">QUYỀN LỢI & ĐIỀU KIỆN</span><h2 id="premium-assurance-title">Biết rõ trước khi mở chặng mới.</h2><p>Gói học, thời hạn và dữ liệu của bạn được trình bày rõ ràng.</p></header>
      <div className="premium-assurance-grid">
        <article><BookOpen size={23} /><h3>Mở đúng nội dung Premium</h3><p>Bài học Thiên Lộ HSK4 và các cửa luyện đề được đánh dấu Premium. Học theo điều kiện tiên quyết của từng bài.</p><Link to="/path">Khám phá Thiên Lộ <ChevronRight size={15} /></Link></article>
        <article><ShieldCheck size={23} /><h3>Giữ trọn hành trình</h3><p>Hết hạn vẫn giữ tiến độ, lịch sử và thẻ ôn. Gia hạn nối tiếp thời hạn hiện có; không tự động trừ xu.</p><span>Chủ động gia hạn khi bạn cần</span></article>
        <article><Wallet size={23} /><h3>Rõ ràng từng Hanzi xu</h3><p>Xem giá và số dư trước khi đổi. Lịch sử ghi lại các giao dịch; yêu cầu hoàn được xem xét qua mục hỗ trợ.</p><Link to="/terms">Xem điều khoản <ChevronRight size={15} /></Link></article>
      </div>
    </section>
    <div className="premium-aftercare">
      <section className="premium-faq" aria-labelledby="premium-faq-title"><span className="premium-eyebrow">TRƯỚC KHI BẮT ĐẦU</span><h2 id="premium-faq-title">Giải đáp trước khi đổi gói</h2><p className="premium-section-note">Những điều cần biết về quyền học và kỳ hạn.</p>
        <details><summary>Premium mở những nội dung nào?</summary><p>Premium mở các bài Thiên Lộ và cửa luyện đề được đánh dấu Premium. Các bài vẫn tuân theo điều kiện tiên quyết. Premium không tự hoàn thành bài hoặc cộng thành thạo.</p></details>
        <details><summary>Hết hạn có mất tiến độ không?</summary><p>Không. Tiến độ, lịch sử, thẻ ôn và phiên đang dở vẫn được giữ. Bài HSK4 cần kết nối để xác minh quyền; gia hạn sẽ nối tiếp thời hạn hiện có.</p></details>
        <details><summary>Làm sao có Hanzi xu để đổi gói?</summary><p>Tu luyện tích lũy XP, rồi nhận thưởng lên cấp tại Bảo Khố Thăng Cấp trong Thức Tỉnh Điện. Dùng số dư Ví Hanzi đổi trọn kỳ hạn được niêm yết. Bản trải nghiệm chưa thu tiền thật và chưa mở chức năng nạp ví.</p></details>
        <details><summary>Nếu cần hỗ trợ hoặc yêu cầu hoàn?</summary><p>Gửi yêu cầu tại phần quản lý bên dưới. Yêu cầu hoàn được quản trị viên xem xét; khi đơn được hoàn, điểm Hanzi được trả vào ví và thời hạn tương ứng được tính lại.</p></details>
      </section>
      <section className="premium-manage" aria-labelledby="premium-manage-title"><span className="premium-eyebrow">TÀI KHOẢN CỦA BẠN</span><h2 id="premium-manage-title">Quản lý gói & hỗ trợ</h2><p className="premium-section-note">Số dư, giao dịch và yêu cầu hỗ trợ trong cùng một nơi.</p>
        <div className="premium-service-grid">
          <button type="button" onClick={() => openAccountPanel("wallet")}><span className="premium-service-icon"><Wallet size={24} /></span><strong>Ví & giao dịch</strong><span>Theo dõi xu thưởng, xu đã dùng và số dư hiện tại.</span><small>{wallet ? `${wallet.balance.toLocaleString("vi-VN")} xu trong ví` : "Xem Ví Hanzi"}<ArrowUpRight size={17} /></small></button>
          <button type="button" onClick={() => openAccountPanel("orders")}><span className="premium-service-icon"><Crown size={24} /></span><strong>Gói học của bạn</strong><span>Xem kỳ hạn, lịch sử đổi gói và gửi yêu cầu hoàn.</span><small>{snapshot?.active ? "Premium đang hoạt động" : "Quản lý gói học"}<ArrowUpRight size={17} /></small></button>
          <button type="button" onClick={() => openAccountPanel("support")}><span className="premium-service-icon"><Headphones size={24} /></span><strong>Trung tâm hỗ trợ</strong><span>Gửi vấn đề và theo dõi phản hồi ngay tại tài khoản.</span><small>Mở yêu cầu hỗ trợ<ArrowUpRight size={17} /></small></button>
        </div>
      </section>
    </div>
    <footer className="premium-service-footer"><span><ShieldCheck size={18} /> Minh bạch quyền học · Chủ động kỳ hạn</span><nav aria-label="Chính sách Premium"><Link to="/terms">Điều khoản sử dụng</Link><Link to="/privacy">Quyền riêng tư</Link></nav></footer>
    <dialog ref={accountDialog} className="premium-account-dialog" aria-labelledby="premium-dialog-title" onCancel={() => setAccountOpen(false)} onClose={() => setAccountOpen(false)}>
      <header className="premium-dialog-header"><div><span className="premium-eyebrow">HANZI.OS · TÀI KHOẢN</span><h2 id="premium-dialog-title">{accountPanel === "wallet" ? "Ví & giao dịch Hanzi" : accountPanel === "orders" ? "Gói học của bạn" : "Trung tâm hỗ trợ"}</h2></div><button type="button" aria-label="Đóng cửa sổ quản lý" onClick={() => setAccountOpen(false)}><X size={22} /></button></header>
      <div className="premium-dialog-body">
        {accountPanel === "wallet" && <>
          <div className="premium-dialog-balance"><span>SỐ DƯ KHẢ DỤNG</span><strong>{wallet ? `${wallet.balance.toLocaleString("vi-VN")} xu` : snapshot?.authenticated ? "Đang tải…" : "Cần đăng nhập"}</strong><small>Hanzi xu dùng đổi gói học; không quy đổi tiền mặt.</small></div>
          <p className="premium-section-note">Theo dõi xu đã nhận và đã sử dụng. Hiển thị tối đa 50 giao dịch gần nhất.</p>
          {wallet?.entries.length ? <><ul className="premium-ledger">{wallet.entries.slice(0, showAllEntries ? 50 : 4).map(entry => {
            const level = entry.kind === "level_reward" ? /^level:(\d+)$/.exec(entry.referenceId ?? "")?.[1] : null;
            const label = entry.kind === "level_reward" ? `Thưởng lên cấp${level ? ` ${level}` : ""}` : entry.kind === "purchase" ? "Đổi gói Premium" : entry.kind === "refund" ? "Hoàn xu vào ví" : "Điều chỉnh Ví Hanzi";
            return <li key={entry.id}><span className="premium-ledger-icon"><Wallet size={17} /></span><span><strong>{label}</strong><time dateTime={new Date(entry.createdAt).toISOString()}>{date(entry.createdAt)}</time></span><b className={entry.delta > 0 ? "is-credit" : "is-debit"}>{entry.delta > 0 ? "+" : ""}{entry.delta.toLocaleString("vi-VN")} <small>xu</small></b></li>;
          })}</ul>{wallet.entries.length > 4 && <button className="premium-history-toggle" type="button" onClick={() => setShowAllEntries(value => !value)}>{showAllEntries ? "Thu gọn lịch sử" : `Xem thêm ${wallet.entries.length - 4} giao dịch`}</button>}</> : <div className="premium-empty"><Wallet size={26} /><strong>{walletError ? "Chưa tải được lịch sử ví" : snapshot?.authenticated ? wallet ? "Chưa có giao dịch" : "Đang tải lịch sử…" : "Lịch sử dành riêng cho bạn"}</strong><p>{walletError || (snapshot?.authenticated ? "Xu nhận từ thưởng lên cấp và các lần đổi gói sẽ xuất hiện tại đây." : "Đăng nhập để xem số dư và các giao dịch của bạn.")}</p></div>}
        </>}
        {accountPanel === "orders" && <>
          <div className="premium-dialog-balance"><span>TRẠNG THÁI GÓI</span><strong>{snapshot?.active ? "Premium đang hiệu lực" : "Chưa có gói đang hoạt động"}</strong><small>{snapshot?.active ? `Đến ${date(snapshot.expiresAt!)}` : "Gói đã đổi và trạng thái xử lý sẽ được lưu tại đây."}</small></div>
      <section className="premium-history"><h2>Lịch sử gói học</h2>{!snapshot?.orders.length ? <p>Chưa có giao dịch.</p> : snapshot.orders.map(order => <article key={order.id}><div><h3>{premiumPlan(order.planId)?.label}</h3><p>{date(order.createdAt)} · {ORDER_STATUS_LABELS[order.status]}{order.paymentMethod === "hanzi" ? ` · ${order.hanziAmount} Hanzi` : " · thử nghiệm không thu tiền"}</p>{order.refundRejectedAt ? <p>Yêu cầu hoàn đã bị từ chối: {order.refundRejectionReason} Bạn có thể mở Trung tâm hỗ trợ nếu cần trao đổi thêm.</p> : order.refundRequestedAt && order.status === "paid" && <p>Yêu cầu hoàn đang chờ quản trị viên xử lý.</p>}{order.status === "pending" && !sandboxConfirmationOpen && <p>Xác nhận không thu tiền đã đóng; bạn có thể hủy đơn chờ này.</p>}</div>{order.status === "pending" && (sandboxConfirmationOpen ? <button className="secondary-button" disabled={busy} onClick={() => { setSelected(order); setAccountOpen(false); }}>Tiếp tục xác nhận</button> : <button className="secondary-button" disabled={busy} onClick={() => void mutate({ action: "cancel", orderId: order.id }, "Đã hủy giao dịch chờ.")}>Hủy giao dịch chờ</button>)}{order.status === "paid" && !order.refundRequestedAt && <button className="secondary-button" disabled={busy} onClick={() => { setRefundId(order.id); setReason(""); }}>Yêu cầu hoàn thử nghiệm</button>}{refundId === order.id && <form onSubmit={event => { event.preventDefault(); void mutate({ action: "request-refund", orderId: order.id, reason }, "Đã gửi yêu cầu hoàn giao dịch thử nghiệm."); }}><label>Lý do yêu cầu<textarea required minLength={5} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></label><button className="primary-button" disabled={busy}>Gửi yêu cầu</button><button className="secondary-button" type="button" onClick={() => setRefundId(null)}>Đóng</button></form>}</article>)}</section>
        </>}
        <div hidden={accountPanel !== "support"}><PremiumSupportSection authenticated={Boolean(snapshot?.authenticated)} /></div>
        {accountPanel === "orders" && <div aria-live="polite">{message && <p role="status">{message}</p>}{failure && <p role="alert">{failure}</p>}</div>}
      </div>
      <footer className="premium-dialog-footer"><span>Thông tin riêng của tài khoản bạn</span><button type="button" onClick={() => setAccountOpen(false)}>Đóng</button></footer>
    </dialog>
  </div>;
}

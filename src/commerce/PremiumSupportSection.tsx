import { useEffect, useState, type FormEvent } from "react";
import type { PremiumSupportCategory, PremiumSupportTicket } from "../server/premiumSupportRepository";

const categoryLabels: Record<PremiumSupportCategory, string> = {
  access: "Quyền truy cập",
  billing: "Gói và giao dịch",
  technical: "Lỗi kỹ thuật",
};

export function PremiumSupportSection({ authenticated }: { authenticated: boolean }) {
  const [tickets, setTickets] = useState<PremiumSupportTicket[]>([]);
  const [category, setCategory] = useState<PremiumSupportCategory>("access");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function load() {
    const response = await fetch("/api/premium-support", { cache: "no-store" });
    if (!response.ok) throw new Error("Chưa tải được yêu cầu hỗ trợ.");
    const body = await response.json() as { tickets: PremiumSupportTicket[] };
    setTickets(body.tickets);
  }
  useEffect(() => {
    if (!authenticated) return;
    let live = true;
    void load().catch(() => { if (live) setFeedback("Chưa tải được yêu cầu hỗ trợ. Hãy thử lại sau."); });
    return () => { live = false; };
  }, [authenticated]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setFeedback("");
    try {
      const response = await fetch("/api/premium-support", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ category, subject, message }),
      });
      const body = await response.json() as { ticket?: PremiumSupportTicket; error?: { message?: string } };
      if (!response.ok || !body.ticket) throw new Error(body.error?.message ?? "Chưa gửi được yêu cầu.");
      setTickets(current => [body.ticket!, ...current]);
      setSubject(""); setMessage(""); setFeedback("Đã gửi yêu cầu. Phản hồi sẽ hiện ở đây khi được xử lý.");
    } catch (cause) { setFeedback(cause instanceof Error ? cause.message : "Chưa gửi được yêu cầu."); }
    finally { setBusy(false); }
  }

  return <section className="premium-support" aria-labelledby="premium-support-title">
    <h2 id="premium-support-title">Hỗ trợ gói Premium</h2>
    {!authenticated ? <p><a href="/signin?returnTo=%2Fprofile%2Fpremium">Đăng nhập</a> để gửi và theo dõi yêu cầu.</p> : <>
      <form onSubmit={event => void submit(event)}>
        <label>Chủ đề<select value={category} onChange={event => setCategory(event.target.value as PremiumSupportCategory)}>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Tiêu đề<input required minLength={5} maxLength={120} value={subject} onChange={event => setSubject(event.target.value)} /></label>
        <label>Mô tả vấn đề<textarea required minLength={10} maxLength={2000} value={message} onChange={event => setMessage(event.target.value)} /></label>
        <button className="primary-button" disabled={busy} type="submit">{busy ? "Đang gửi…" : "Gửi yêu cầu"}</button>
      </form>
      {feedback && <p role="status">{feedback}</p>}
      <h3>Yêu cầu của bạn</h3>
      {tickets.length === 0 ? <p>Chưa có yêu cầu.</p> : tickets.map(ticket => <article key={ticket.id}><strong>{ticket.subject}</strong><p>{categoryLabels[ticket.category]} · {new Date(ticket.createdAt).toLocaleString("vi-VN")} · {ticket.status === "open" ? "Đang chờ" : ticket.status === "answered" ? "Đã phản hồi" : "Đã đóng"}</p><p>{ticket.message}</p>{ticket.response && <p className="premium-support-response"><strong>Phản hồi:</strong> {ticket.response}</p>}</article>)}
    </>}
  </section>;
}

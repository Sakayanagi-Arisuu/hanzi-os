import { authorizeAdmin } from "../../../../src/server/adminHttp";
import { CommerceOperationsRepository } from "../../../../src/server/commerceOperationsRepository";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const auth = await authorizeAdmin("commerce:manage");
    if (!auth.ok) return auth.response;
    const requested = Number(new URL(request.url).searchParams.get("days"));
    const days = [7,30,90].includes(requested) ? requested : 30;
    const report = await new CommerceOperationsRepository(auth.context.database).revenue(days);
    const rows = [
      ["Báo cáo VNĐ", `${days} ngày`], ["Tiền đã thu", report.gross], ["Tiền đã hoàn", report.refunded],
      ["Phí thanh toán", report.fees], ["Thu ròng (chưa trừ thuế và chi phí)", report.net],
      ["Số đơn có khoản thu", report.paidOrders], [], ["Ngày (Asia/Ho_Chi_Minh)", "Thu ròng VNĐ"],
      ...report.daily.map(row => [row.day, row.net]),
    ];
    return new Response("\uFEFF" + rows.map(row => row.map(cell => `"${String(cell).replaceAll('"','""')}"`).join(",")).join("\r\n"), {
      headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="hanzi-revenue-${days}-days.csv"`, "cache-control": "private, no-store" },
    });
  } catch { return new Response("Chưa xuất được báo cáo. Hãy thử lại.", { status: 503 }); }
}

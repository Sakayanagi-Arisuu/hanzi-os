import { authorizeAdmin } from "../../../../src/server/adminHttp";
import { sameOriginMutation } from "../../../../src/server/authHttp";
import { readBoundedRequestText } from "../../../../src/server/boundedRequestBody";
import { BankTransferRepository, cashLedgerEnabled } from "../../../../src/server/bankTransferRepository";
import { requestCorrelationId } from "../../../../src/server/auditRepository";
export async function POST(request: Request) {
  if (!sameOriginMutation(request) || !cashLedgerEnabled(request.url)) return new Response("Chưa mở thanh toán thật.",{status:403});
  if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) return new Response("Invalid form",{status:415});
  const url = new URL("/admin/premium?tab=payments",request.url);
  try {
    const auth=await authorizeAdmin("commerce:manage",{stepUp:true});
    if (!auth.ok) return auth.response;
    const body=await readBoundedRequestText(request,2000);if(!body.ok)return new Response("Too large",{status:413});
    const form=new URLSearchParams(body.text);const action=form.get("action");
    if (!['capture','refund'].includes(action ?? '') || form.get('verified')!=='yes') return new Response("Cần xác nhận đã đối chiếu ngân hàng.",{status:422});
    await new BankTransferRepository(auth.context.database).reconcile(form.get('orderId')??'',action as 'capture'|'refund',form.get('bankReference')??'',Number(form.get('amount')),auth.context.account.userId,auth.context.sessionId,requestCorrelationId(request));
    url.searchParams.set('notice',action==='capture'?'Đã xác nhận tiền vào và cấp quyền Premium.':'Đã ghi nhận tiền hoàn và thu hồi quyền của đơn.');
  } catch { url.searchParams.set('notice','Chưa xác nhận được. Kiểm tra trạng thái đơn, số tiền và mã giao dịch ngân hàng (không được trùng).'); }
  return Response.redirect(url,303);
}

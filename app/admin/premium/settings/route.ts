import { authorizeAdmin } from "../../../../src/server/adminHttp";
import { sameOriginMutation } from "../../../../src/server/authHttp";
import { readBoundedRequestText } from "../../../../src/server/boundedRequestBody";
import { requestCorrelationId } from "../../../../src/server/auditRepository";
import { CommerceOperationsRepository } from "../../../../src/server/commerceOperationsRepository";
import { parseMerchantSettings } from "../../../../src/commerce/merchant";

export async function POST(request: Request) {
  const destination = new URL("/admin/premium?tab=payments", request.url);
  const finish = (message: string) => {
    destination.searchParams.set("notice", message);
    return Response.redirect(destination, 303);
  };
  if (!sameOriginMutation(request)) return new Response("Forbidden", { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) return new Response("Unsupported form", { status: 415 });
  try {
    const auth = await authorizeAdmin("commerce:manage", { stepUp: true });
    if (!auth.ok) return auth.response;
    const body = await readBoundedRequestText(request, 5000);
    if (!body.ok) return new Response("Form too large", { status: 413 });
    const form = new URLSearchParams(body.text);
    const settings = parseMerchantSettings(Object.fromEntries(form));
    await new CommerceOperationsRepository(auth.context.database).saveSettings(settings, Number(form.get("revision")), auth.context.account.userId, auth.context.sessionId, requestCorrelationId(request));
    return finish("Đã lưu thông tin chuẩn bị thanh toán. Chưa bật thu tiền thật.");
  } catch (error) {
    return finish(error instanceof Error && !/SQL|constraint|D1|database/i.test(error.message)
      ? error.message : "Chưa lưu được cấu hình; hãy tải lại và thử lại.");
  }
}

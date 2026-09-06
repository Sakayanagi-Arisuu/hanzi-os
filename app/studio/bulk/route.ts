import type { AppPermission } from "../../../src/auth/authorization";
import { sameOriginMutation } from "../../../src/server/authHttp";
import { requestCorrelationId } from "../../../src/server/auditRepository";
import { readBoundedRequestText } from "../../../src/server/boundedRequestBody";
import { authorizeStudio } from "../../../src/server/contentStudioHttp";
import { ContentStudioRepository } from "../../../src/server/contentStudioRepository";

export const dynamic = "force-dynamic";

const redirect = (request: Request, key: "notice" | "error", message: string) => {
  const target = new URL("/studio", request.url);
  target.searchParams.set(key, message.slice(0, 500));
  target.hash = "library-title";
  return Response.redirect(target, 303);
};

const parseSelection = (value: string) => {
  const separator = value.lastIndexOf("|");
  const revisionId = value.slice(0, separator);
  const rowVersion = Number(value.slice(separator + 1));
  if (
    separator < 1
    || revisionId.length > 255
    || !Number.isSafeInteger(rowVersion)
    || rowVersion < 1
  ) return null;
  return { revisionId, rowVersion };
};

export async function POST(request: Request) {
  if (!sameOriginMutation(request)) {
    return redirect(request, "error", "Yêu cầu khác nguồn đã bị chặn.");
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded")) {
    return redirect(request, "error", "Biểu mẫu thao tác hàng loạt không hợp lệ.");
  }
  const bounded = await readBoundedRequestText(request, 80_000);
  if (!bounded.ok) return redirect(request, "error", "Danh sách đã chọn vượt giới hạn an toàn.");
  const form = new URLSearchParams(bounded.text);
  const action = form.get("action") ?? "";
  const permission: AppPermission | null = action === "validate"
    ? "content:validation:run"
    : action === "submit"
      ? "content:submit"
      : null;
  if (!permission) return redirect(request, "error", "Thao tác hàng loạt không hợp lệ.");
  const selections = form.getAll("selection").map(parseSelection).filter((entry) => entry !== null);
  const unique = [...new Map(selections.map((entry) => [entry.revisionId, entry])).values()];
  if (unique.length === 0) return redirect(request, "error", "Hãy chọn ít nhất một nội dung.");
  if (unique.length > 25) return redirect(request, "error", "Mỗi lượt chỉ xử lý tối đa 25 nội dung.");
  const batchKey = form.get("batchKey") ?? "";
  if (!/^[A-Za-z0-9._:-]{8,80}$/u.test(batchKey)) {
    return redirect(request, "error", "Mã lượt xử lý không hợp lệ.");
  }
  try {
    const authorized = await authorizeStudio(permission);
    if (!authorized.ok) return redirect(request, "error", "Tài khoản không có quyền cho thao tác này.");
    const repository = new ContentStudioRepository(authorized.context.database);
    let completed = 0;
    let needsWork = 0;
    let skipped = 0;
    for (const [index, selection] of unique.entries()) {
      try {
        if (action === "validate") {
          const result = await repository.validateRevision({
            actorUserId: authorized.context.account.userId,
            actorSessionId: authorized.context.sessionId,
            revisionId: selection.revisionId,
            expectedRowVersion: selection.rowVersion,
            idempotencyKey: `bulk:${batchKey}:${index}`,
            requestId: requestCorrelationId(request),
          });
          if (result.validation?.valid) completed += 1;
          else needsWork += 1;
        } else {
          await repository.transition({
            actorUserId: authorized.context.account.userId,
            actorSessionId: authorized.context.sessionId,
            revisionId: selection.revisionId,
            expectedRowVersion: selection.rowVersion,
            toState: "submitted",
            idempotencyKey: `bulk:${batchKey}:${index}`,
            requestId: requestCorrelationId(request),
          });
          completed += 1;
        }
      } catch {
        skipped += 1;
      }
    }
    const label = action === "validate" ? "kiểm định" : "gửi duyệt";
    const summary = `Đã ${label} ${completed} nội dung${needsWork ? `; ${needsWork} nội dung cần chỉnh sửa` : ""}${skipped ? `; bỏ qua an toàn ${skipped} nội dung không đúng trạng thái hoặc đã thay đổi` : ""}.`;
    return redirect(request, completed || needsWork ? "notice" : "error", summary);
  } catch {
    return redirect(request, "error", "Chưa thể hoàn tất thao tác hàng loạt; dữ liệu hiện tại vẫn được giữ nguyên.");
  }
}

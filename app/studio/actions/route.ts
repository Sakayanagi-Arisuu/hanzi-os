import {
  isStudioItemType,
  isStudioLevel,
} from "../../../src/content/studioContent";
import type { AppPermission } from "../../../src/auth/authorization";
import { sameOriginMutation } from "../../../src/server/authHttp";
import { requestCorrelationId } from "../../../src/server/auditRepository";
import { readBoundedRequestText } from "../../../src/server/boundedRequestBody";
import { authorizeStudio } from "../../../src/server/contentStudioHttp";
import { ContentStudioRepository } from "../../../src/server/contentStudioRepository";
import { processContentReleaseBatch } from "../../../src/server/contentReleaseWorker";

export const dynamic = "force-dynamic";

const redirect = (request: Request, path: string, key: "notice" | "error", value: string) => {
  const target = new URL(path, request.url);
  target.searchParams.set(key, value.slice(0, 600));
  return Response.redirect(target, 303);
};

const permissionFor = (action: string): AppPermission | null => {
  if (["create", "update", "fork"].includes(action)) return "content:drafts:write";
  if (action === "validate") return "content:validation:run";
  if (action === "submit") return "content:submit";
  if (action === "approve") return "content:approve";
  if (["publish", "archive"].includes(action)) return "content:publish";
  return null;
};

export async function POST(request: Request) {
  if (!sameOriginMutation(request)) {
    return redirect(request, "/studio", "error", "Yêu cầu khác nguồn đã bị chặn.");
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded")) {
    return redirect(request, "/studio", "error", "Form Content Studio không hợp lệ.");
  }
  const bounded = await readBoundedRequestText(request, 1_500_000);
  if (!bounded.ok) return redirect(request, "/studio", "error", "Payload vượt giới hạn an toàn.");
  const form = new URLSearchParams(bounded.text);
  const action = form.get("action") ?? "";
  const permission = permissionFor(action);
  const revisionId = form.get("revisionId") ?? "";
  const fallbackPath = revisionId
    ? `/studio/items/${encodeURIComponent(revisionId)}`
    : "/studio";
  if (!permission) return redirect(request, fallbackPath, "error", "Workflow action không hợp lệ.");

  try {
    const authorized = await authorizeStudio(permission);
    if (!authorized.ok) return authorized.response;
    const repository = new ContentStudioRepository(authorized.context.database);
    const common = {
      actorUserId: authorized.context.account.userId,
      actorSessionId: authorized.context.sessionId,
      idempotencyKey: form.get("idempotencyKey") ?? "",
    };
    if (action === "create") {
      const itemType = form.get("itemType");
      const level = form.get("level");
      if (!isStudioItemType(itemType) || !isStudioLevel(level)) {
        throw new TypeError("Loại item hoặc cấp độ không hợp lệ.");
      }
      const content = JSON.parse(form.get("contentJson") ?? "") as unknown;
      if (!content || typeof content !== "object" || Array.isArray(content)) {
        throw new TypeError("Content JSON phải là object.");
      }
      const revision = await repository.createDraft({
        ...common,
        itemType,
        level,
        stableKey: form.get("stableKey") ?? "",
        title: form.get("title") ?? "",
        content: content as Record<string, unknown>,
      });
      return redirect(request, `/studio/items/${encodeURIComponent(revision.id)}`, "notice", "Đã tạo bản nháp. Người học chưa nhìn thấy nội dung này.");
    }
    if (action === "update") {
      const level = form.get("level");
      if (!isStudioLevel(level)) throw new TypeError("Cấp độ không hợp lệ.");
      const content = JSON.parse(form.get("contentJson") ?? "") as unknown;
      if (!content || typeof content !== "object" || Array.isArray(content)) {
        throw new TypeError("Content JSON phải là object.");
      }
      const revision = await repository.updateDraft({
        ...common,
        revisionId,
        expectedRowVersion: Number(form.get("expectedRowVersion")),
        title: form.get("title") ?? "",
        level,
        content: content as Record<string, unknown>,
      });
      return redirect(request, `/studio/items/${encodeURIComponent(revision.id)}`, "notice", "Đã lưu thay đổi vào bản nháp.");
    }
    if (action === "validate") {
      const revision = await repository.validateRevision({
        ...common,
        revisionId,
        expectedRowVersion: Number(form.get("expectedRowVersion")),
      });
      return redirect(
        request,
        `/studio/items/${encodeURIComponent(revision.id)}`,
        revision.validation?.valid ? "notice" : "error",
        revision.validation?.valid
          ? "Nội dung đã đạt kiểm định và sẵn sàng gửi duyệt."
          : "Nội dung chưa đạt; hãy xem các mục cần chỉnh sửa bên dưới.",
      );
    }
    if (action === "fork") {
      const revision = await repository.forkRevision({
        ...common,
        sourceRevisionId: revisionId,
      });
      return redirect(request, `/studio/items/${encodeURIComponent(revision.id)}`, "notice", "Đã tạo một bản nháp mới từ nội dung đang phát hành.");
    }
    const toState = action === "submit"
      ? "submitted" as const
      : action === "approve"
        ? "approved" as const
        : action === "publish"
          ? "published" as const
          : "archived" as const;
    const revision = await repository.transition({
      ...common,
      revisionId,
      expectedRowVersion: Number(form.get("expectedRowVersion")),
      toState,
      requestId: requestCorrelationId(request),
      note: form.get("note") ?? undefined,
    });
    let releaseReady = true;
    if (toState === "published" || toState === "archived") {
      try {
        await processContentReleaseBatch(authorized.context.database);
      } catch {
        releaseReady = false;
      }
    }
    const notice = toState === "published"
      ? releaseReady
        ? "Đã phát hành nội dung cho người học."
        : "Đã duyệt phát hành; gói nội dung đang chờ đồng bộ lại."
      : toState === "archived"
        ? releaseReady
          ? "Đã ngừng phát hành nội dung này."
          : "Đã yêu cầu ngừng phát hành; catalog đang chờ đồng bộ lại."
        : toState === "approved"
          ? "Nội dung đã được phê duyệt và sẵn sàng phát hành."
          : "Đã gửi nội dung vào hàng chờ phê duyệt.";
    return redirect(request, `/studio/items/${encodeURIComponent(revision.id)}`, "notice", notice);
  } catch (error) {
    return redirect(
      request,
      fallbackPath,
      "error",
      error instanceof Error ? error.message : "Content Studio chưa thể hoàn tất thao tác.",
    );
  }
}

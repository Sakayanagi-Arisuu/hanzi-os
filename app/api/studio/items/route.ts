import {
  isStudioItemType,
  isStudioLevel,
  isStudioWorkflowState,
} from "../../../../src/content/studioContent";
import { sameOriginMutation } from "../../../../src/server/authHttp";
import { readBoundedRequestText } from "../../../../src/server/boundedRequestBody";
import {
  authorizeStudio,
  readIdempotencyKey,
  studioError,
  studioMutationError,
} from "../../../../src/server/contentStudioHttp";
import { ContentStudioRepository } from "../../../../src/server/contentStudioRepository";
import { noStoreJsonHeaders } from "../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authorized = await authorizeStudio("content:workspace:read");
    if (!authorized.ok) return authorized.response;
    const query = new URL(request.url).searchParams;
    const itemType = query.get("type");
    const state = query.get("state");
    const level = query.get("level");
    if (
      (itemType && !isStudioItemType(itemType))
      || (state && !isStudioWorkflowState(state))
      || (level && !isStudioLevel(level))
    ) {
      return studioError(422, "CONTENT_FILTER_INVALID", "Bộ lọc Content Studio không hợp lệ.");
    }
    const revisions = await new ContentStudioRepository(
      authorized.context.database,
    ).list({
      itemType: isStudioItemType(itemType) ? itemType : null,
      state: isStudioWorkflowState(state) ? state : null,
      level: isStudioLevel(level) ? level : null,
    });
    return Response.json({ revisions }, { headers: noStoreJsonHeaders });
  } catch (error) {
    return studioMutationError(error);
  }
}

export async function POST(request: Request) {
  if (!sameOriginMutation(request)) {
    return studioError(403, "CROSS_ORIGIN_BLOCKED", "Yêu cầu khác nguồn đã bị chặn.");
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return studioError(415, "JSON_REQUIRED", "API Content Studio chỉ nhận application/json.");
  }
  const bounded = await readBoundedRequestText(request, 1_100_000);
  if (!bounded.ok) return studioError(413, "CONTENT_TOO_LARGE", "Nội dung vượt giới hạn 1 MiB.");
  let body: unknown;
  try {
    body = JSON.parse(bounded.text);
  } catch {
    return studioError(400, "INVALID_JSON", "Không thể đọc nội dung JSON.");
  }
  const input = body as Record<string, unknown>;
  if (
    !body
    || typeof body !== "object"
    || !isStudioItemType(input.itemType)
    || !isStudioLevel(input.level)
    || typeof input.stableKey !== "string"
    || typeof input.title !== "string"
    || !input.content
    || typeof input.content !== "object"
    || Array.isArray(input.content)
  ) {
    return studioError(422, "CONTENT_INPUT_INVALID", "Metadata hoặc JSON nội dung không hợp lệ.");
  }
  try {
    const authorized = await authorizeStudio("content:drafts:write");
    if (!authorized.ok) return authorized.response;
    const revision = await new ContentStudioRepository(
      authorized.context.database,
    ).createDraft({
      actorUserId: authorized.context.account.userId,
      actorSessionId: authorized.context.sessionId,
      itemType: input.itemType,
      stableKey: input.stableKey,
      title: input.title,
      level: input.level,
      content: input.content as Record<string, unknown>,
      idempotencyKey: readIdempotencyKey(request, input.idempotencyKey),
    });
    return Response.json({ revision }, { status: 201, headers: noStoreJsonHeaders });
  } catch (error) {
    return studioMutationError(error);
  }
}

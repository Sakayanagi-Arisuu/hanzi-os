import { isStudioLevel } from "../../../../../src/content/studioContent";
import { sameOriginMutation } from "../../../../../src/server/authHttp";
import { readBoundedRequestText } from "../../../../../src/server/boundedRequestBody";
import {
  authorizeStudio,
  readIdempotencyKey,
  studioError,
  studioMutationError,
} from "../../../../../src/server/contentStudioHttp";
import { ContentStudioRepository } from "../../../../../src/server/contentStudioRepository";
import { noStoreJsonHeaders } from "../../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ revisionId: string }> },
) {
  try {
    const authorized = await authorizeStudio("content:workspace:read");
    if (!authorized.ok) return authorized.response;
    const { revisionId } = await params;
    const revision = await new ContentStudioRepository(
      authorized.context.database,
    ).getRevision(revisionId);
    const history = await new ContentStudioRepository(
      authorized.context.database,
    ).history(revision.itemId);
    return Response.json({ revision, history }, { headers: noStoreJsonHeaders });
  } catch (error) {
    return studioMutationError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ revisionId: string }> },
) {
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
    || typeof input.title !== "string"
    || !isStudioLevel(input.level)
    || typeof input.expectedRowVersion !== "number"
    || !Number.isInteger(input.expectedRowVersion)
    || !input.content
    || typeof input.content !== "object"
    || Array.isArray(input.content)
  ) {
    return studioError(422, "CONTENT_INPUT_INVALID", "Revision draft không hợp lệ.");
  }
  try {
    const authorized = await authorizeStudio("content:drafts:write");
    if (!authorized.ok) return authorized.response;
    const { revisionId } = await params;
    const revision = await new ContentStudioRepository(
      authorized.context.database,
    ).updateDraft({
      actorUserId: authorized.context.account.userId,
      actorSessionId: authorized.context.sessionId,
      revisionId,
      expectedRowVersion: input.expectedRowVersion,
      title: input.title,
      level: input.level,
      content: input.content as Record<string, unknown>,
      idempotencyKey: readIdempotencyKey(request, input.idempotencyKey),
    });
    return Response.json({ revision }, { headers: noStoreJsonHeaders });
  } catch (error) {
    return studioMutationError(error);
  }
}

import { sameOriginMutation } from "../../../../../../src/server/authHttp";
import { readBoundedRequestText } from "../../../../../../src/server/boundedRequestBody";
import {
  authorizeStudio,
  readIdempotencyKey,
  studioError,
  studioMutationError,
} from "../../../../../../src/server/contentStudioHttp";
import { ContentStudioRepository } from "../../../../../../src/server/contentStudioRepository";
import { noStoreJsonHeaders } from "../../../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ revisionId: string }> },
) {
  if (!sameOriginMutation(request)) {
    return studioError(403, "CROSS_ORIGIN_BLOCKED", "Yêu cầu khác nguồn đã bị chặn.");
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return studioError(415, "JSON_REQUIRED", "Validation API chỉ nhận application/json.");
  }
  const bounded = await readBoundedRequestText(request, 2_048);
  if (!bounded.ok) return studioError(413, "REQUEST_TOO_LARGE", "Yêu cầu validation quá lớn.");
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(bounded.text) as Record<string, unknown>;
  } catch {
    return studioError(400, "INVALID_JSON", "Không thể đọc yêu cầu validation.");
  }
  if (typeof body.expectedRowVersion !== "number" || !Number.isInteger(body.expectedRowVersion)) {
    return studioError(422, "CONTENT_INPUT_INVALID", "rowVersion không hợp lệ.");
  }
  try {
    const authorized = await authorizeStudio("content:validation:run");
    if (!authorized.ok) return authorized.response;
    const { revisionId } = await params;
    const revision = await new ContentStudioRepository(
      authorized.context.database,
    ).validateRevision({
      actorUserId: authorized.context.account.userId,
      actorSessionId: authorized.context.sessionId,
      revisionId,
      expectedRowVersion: body.expectedRowVersion,
      idempotencyKey: readIdempotencyKey(request, body.idempotencyKey),
    });
    return Response.json({ revision }, { headers: noStoreJsonHeaders });
  } catch (error) {
    return studioMutationError(error);
  }
}

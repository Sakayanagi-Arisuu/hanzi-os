import { sameOriginMutation } from "../../../../../../src/server/authHttp";
import { requestCorrelationId } from "../../../../../../src/server/auditRepository";
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

const TRANSITIONS = ["submitted", "approved", "published", "archived"] as const;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ revisionId: string }> },
) {
  if (!sameOriginMutation(request)) {
    return studioError(403, "CROSS_ORIGIN_BLOCKED", "Yêu cầu khác nguồn đã bị chặn.");
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return studioError(415, "JSON_REQUIRED", "Workflow API chỉ nhận application/json.");
  }
  const bounded = await readBoundedRequestText(request, 4_096);
  if (!bounded.ok) return studioError(413, "REQUEST_TOO_LARGE", "Yêu cầu workflow quá lớn.");
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(bounded.text) as Record<string, unknown>;
  } catch {
    return studioError(400, "INVALID_JSON", "Không thể đọc yêu cầu workflow.");
  }
  if (
    typeof body.toState !== "string"
    || !TRANSITIONS.includes(body.toState as typeof TRANSITIONS[number])
    || typeof body.expectedRowVersion !== "number"
    || !Number.isInteger(body.expectedRowVersion)
    || (body.note !== undefined && typeof body.note !== "string")
  ) {
    return studioError(422, "CONTENT_INPUT_INVALID", "Transition hoặc rowVersion không hợp lệ.");
  }
  const toState = body.toState as typeof TRANSITIONS[number];
  const permission = toState === "submitted"
    ? "content:submit" as const
    : toState === "approved"
      ? "content:approve" as const
      : "content:publish" as const;
  try {
    const authorized = await authorizeStudio(permission);
    if (!authorized.ok) return authorized.response;
    const { revisionId } = await params;
    const revision = await new ContentStudioRepository(
      authorized.context.database,
    ).transition({
      actorUserId: authorized.context.account.userId,
      actorSessionId: authorized.context.sessionId,
      revisionId,
      expectedRowVersion: body.expectedRowVersion,
      toState,
      idempotencyKey: readIdempotencyKey(request, body.idempotencyKey),
      requestId: requestCorrelationId(request),
      note: typeof body.note === "string" ? body.note : undefined,
    });
    return Response.json({ revision }, { headers: noStoreJsonHeaders });
  } catch (error) {
    return studioMutationError(error);
  }
}

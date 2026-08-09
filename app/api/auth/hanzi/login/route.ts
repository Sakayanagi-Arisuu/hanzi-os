import {
  authError,
  loadAuthRuntime,
  roleAwareHanziReturnTo,
  sameOriginMutation,
  sessionResponseHeaders,
} from "../../../../../src/server/authHttp";
import { InvalidHanziCredentialsError } from "../../../../../src/server/authRepository";
import { readBoundedRequestText } from "../../../../../src/server/boundedRequestBody";
import { AuthorizationRepository } from "../../../../../src/server/authorizationRepository";
import {
  AuditRepository,
  requestCorrelationId,
} from "../../../../../src/server/auditRepository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOriginMutation(request)) {
    return authError(403, "CROSS_ORIGIN_BLOCKED", "Yêu cầu khác nguồn đã bị chặn.");
  }
  const requestBody = await readBoundedRequestText(request, 4_096);
  if (!requestBody.ok) {
    return authError(413, "REQUEST_TOO_LARGE", "Dữ liệu đăng nhập vượt quá giới hạn.");
  }
  let body: unknown;
  try {
    body = JSON.parse(requestBody.text) as unknown;
  } catch {
    return authError(400, "INVALID_JSON", "Không thể đọc dữ liệu đăng nhập.");
  }
  const { identifier, password, returnTo } = body && typeof body === "object"
    ? body as {
        identifier?: unknown;
        password?: unknown;
        returnTo?: unknown;
      }
    : {};
  if (typeof identifier !== "string" || typeof password !== "string") {
    return authError(422, "HANZI_CREDENTIALS_INVALID", "Hãy nhập tài khoản và mật khẩu.");
  }
  try {
    const { database, repository } = await loadAuthRuntime();
    const account = await repository.authenticateHanziAccount(identifier, password);
    const session = await repository.createSession({
      userId: account.userId,
      identityId: account.identityId,
      authMethod: "hanzi",
      userAgent: request.headers.get("user-agent"),
      deviceLabel: request.headers.get("sec-ch-ua-platform")
        ?? "Tài khoản HANZI.OS",
    });
    const authorization = await new AuthorizationRepository(database)
      .getAuthorization(account.userId);
    await new AuditRepository(database).appendBestEffort({
      category: "auth",
      action: "auth.hanzi.signed_in",
      outcome: "success",
      actorUserId: account.userId,
      actorSessionId: session.sessionId,
      targetType: "user",
      targetId: account.userId,
      requestId: requestCorrelationId(request),
      metadata: { provider: "hanzi" },
    });
    return Response.json({
      authenticated: true,
      user: {
        username: account.username,
        email: account.email,
        displayName: account.displayName,
      },
      authorization,
      returnTo: roleAwareHanziReturnTo(
        typeof returnTo === "string" ? returnTo : null,
        authorization.roles,
      ),
    }, { headers: sessionResponseHeaders(session.token) });
  } catch (error) {
    if (error instanceof InvalidHanziCredentialsError) {
      return authError(401, error.code, "Tên tài khoản, email hoặc mật khẩu không đúng.");
    }
    // Account status and infrastructure details remain indistinguishable at
    // the public login boundary.
    return authError(401, "HANZI_CREDENTIALS_INVALID", "Tên tài khoản, email hoặc mật khẩu không đúng.");
  }
}

import { hasPermission } from "../../../src/auth/authorization";
import {
  AdminRoleSelfRevocationError,
  AuthorizationRepository,
  AuthorizationTargetNotFoundError,
  resolveAuthorizedAccount,
} from "../../../src/server/authorizationRepository";
import { readBoundedRequestText } from "../../../src/server/boundedRequestBody";
import { getD1Database } from "../../../src/server/d1";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

const redirect = (request: Request, key: "updated" | "error", value: string) => {
  const location = new URL("/admin", request.url);
  location.searchParams.set(key, value);
  return Response.redirect(location, 303);
};

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return redirect(request, "error", "Yêu cầu khác nguồn đã bị chặn.");
  }
  const identity = await getChatGPTUser();
  if (!identity) return redirect(request, "error", "Cần đăng nhập để thay đổi quyền.");
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded")) {
    return redirect(request, "error", "Biểu mẫu phân quyền không hợp lệ.");
  }
  const body = await readBoundedRequestText(request, 2_048);
  if (!body.ok) return redirect(request, "error", "Biểu mẫu phân quyền vượt giới hạn.");
  const form = new URLSearchParams(body.text);
  const userId = form.get("userId") ?? "";
  const rawAdmin = form.get("admin");
  if (!userId || userId.length > 128 || (rawAdmin !== "true" && rawAdmin !== "false")) {
    return redirect(request, "error", "Yêu cầu phân quyền không hợp lệ.");
  }

  try {
    const database = await getD1Database();
    const account = await resolveAuthorizedAccount(database, identity);
    if (!hasPermission(account.authorization, "admin:roles:write")) {
      return redirect(request, "error", "Tài khoản không có quyền phân quyền.");
    }
    await new AuthorizationRepository(database).setAdminRole(
      account.userId,
      userId,
      rawAdmin === "true",
    );
    return redirect(request, "updated", userId);
  } catch (error) {
    if (error instanceof AdminRoleSelfRevocationError) {
      return redirect(request, "error", "Không thể tự thu quyền quản trị của tài khoản đang dùng.");
    }
    if (error instanceof AuthorizationTargetNotFoundError) {
      return redirect(request, "error", "Không tìm thấy tài khoản cần phân quyền.");
    }
    return redirect(request, "error", "Không thể cập nhật quyền lúc này.");
  }
}

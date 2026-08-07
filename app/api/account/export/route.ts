import { getChatGPTUser } from "../../../chatgpt-auth";
import { getD1Database, SyncBackendUnavailableError } from "../../../../src/server/d1";
import {
  ACCOUNT_EXPORT_SCHEMA_VERSION,
  SyncRepository,
} from "../../../../src/server/syncRepository";
import { noStoreJsonHeaders } from "../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

export async function GET() {
  const identity = await getChatGPTUser();
  if (!identity) {
    return Response.json(
      { error: { code: "AUTH_REQUIRED", message: "Đăng nhập để xuất dữ liệu cloud." } },
      { status: 401, headers: noStoreJsonHeaders },
    );
  }

  try {
    const repository = new SyncRepository(await getD1Database());
    const userId = await repository.resolveUser(identity);
    const cloudData = await repository.exportAccountData(userId);
    const stored = cloudData.tables.learning_documents[0];
    const exportedAt = new Date().toISOString();
    return new Response(JSON.stringify({
      exportSchemaVersion: ACCOUNT_EXPORT_SCHEMA_VERSION,
      product: "HANZI.OS",
      source: "cloud-account",
      exportedAt,
      account: {
        provider: identity.provider ?? "chatgpt",
        email: identity.email,
        displayName: identity.displayName,
      },
      learning: stored
        ? {
            revision: stored.revision,
            contentVersion: stored.content_version,
            updatedAt: new Date(Number(stored.updated_at)).toISOString(),
            document: stored.document_json,
          }
        : null,
      cloudData,
    }, null, 2), {
      status: 200,
      headers: {
        ...noStoreJsonHeaders,
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="hanzi-os-account-${exportedAt.slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    const unavailable = error instanceof SyncBackendUnavailableError;
    return Response.json(
      {
        error: {
          code: unavailable ? error.code : "EXPORT_FAILED",
          message: unavailable
            ? error.message
            : "Không thể tạo bản xuất cloud lúc này.",
        },
      },
      { status: unavailable ? 503 : 500, headers: noStoreJsonHeaders },
    );
  }
}

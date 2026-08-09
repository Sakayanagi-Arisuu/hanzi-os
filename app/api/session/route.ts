import { getChatGPTUser } from "../../chatgpt-auth";
import { deriveAccountKey } from "../../../src/lib/accountKey";
import { BASELINE_AUTHORIZATION } from "../../../src/auth/authorization";
import { AuthorizationRepository } from "../../../src/server/authorizationRepository";
import { getD1Database } from "../../../src/server/d1";

export const dynamic = "force-dynamic";

const SESSION_RESPONSE_HEADERS = {
  "cache-control": "private, no-store, max-age=0",
  expires: "0",
  pragma: "no-cache",
  vary: [
    "cookie",
    "oai-authenticated-user-email",
    "oai-authenticated-user-full-name",
    "oai-authenticated-user-full-name-encoding",
  ].join(", "),
  "x-robots-tag": "noindex, nofollow",
};

export async function GET() {
  const user = await getChatGPTUser();

  if (!user) {
    return Response.json(
      {
        authenticated: false,
        user: null,
        accountKey: null,
        authorization: null,
      },
      { headers: SESSION_RESPONSE_HEADERS },
    );
  }

  const authorization = user.userId
    ? await new AuthorizationRepository(await getD1Database())
        .getAuthorization(user.userId)
    : BASELINE_AUTHORIZATION;

  return Response.json(
    {
      authenticated: true,
      user: {
        displayName: user.displayName,
        email: user.email,
        fullName: user.fullName,
        ...(user.provider ? { provider: user.provider } : {}),
      },
      accountKey: await deriveAccountKey(user.userId || user.email),
      authorization,
    },
    { headers: SESSION_RESPONSE_HEADERS },
  );
}

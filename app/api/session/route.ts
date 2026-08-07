import { getChatGPTUser } from "../../chatgpt-auth";
import { deriveAccountKey } from "../../../src/lib/accountKey";

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
      { authenticated: false, user: null, accountKey: null },
      { headers: SESSION_RESPONSE_HEADERS },
    );
  }

  return Response.json(
    {
      authenticated: true,
      user: {
        displayName: user.displayName,
        email: user.email,
        fullName: user.fullName,
      },
      accountKey: await deriveAccountKey(user.email || user.userId || ""),
    },
    { headers: SESSION_RESPONSE_HEADERS },
  );
}

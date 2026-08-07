import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  chatGPTSignInPath,
  chatGPTSignOutPath,
} from "../src/lib/chatgptAuthPaths";
import {
  AuthRepository,
  readCookieValue,
  SESSION_COOKIE_NAME,
  type FirstPartyAuthProvider,
} from "../src/server/authRepository";
import { getD1Database } from "../src/server/d1";

export { chatGPTSignInPath, chatGPTSignOutPath };

export type ChatGPTUser = {
  displayName: string;
  email: string;
  fullName: string | null;
  /** Present only for a first-party session resolved on the server. */
  userId?: string;
  sessionId?: string;
  identityId?: string | null;
  provider?: FirstPartyAuthProvider;
  authenticatedAt?: number;
};

const USER_EMAIL_HEADER = "oai-authenticated-user-email";
const USER_FULL_NAME_HEADER = "oai-authenticated-user-full-name";
const USER_FULL_NAME_ENCODING_HEADER =
  "oai-authenticated-user-full-name-encoding";
const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();
  const sessionToken = readCookieValue(
    requestHeaders.get("cookie"),
    SESSION_COOKIE_NAME,
  );
  if (sessionToken) {
    try {
      const session = await new AuthRepository(await getD1Database())
        .resolveSession(sessionToken);
      if (session) return session;
    } catch {
      // Fail the first-party session closed, while preserving the trusted
      // ChatGPT host-header compatibility path below when it is present.
    }
  }
  const email = requestHeaders.get(USER_EMAIL_HEADER);
  if (!email) return null;

  const encodedFullName = requestHeaders.get(USER_FULL_NAME_HEADER);
  const fullName =
    encodedFullName &&
    requestHeaders.get(USER_FULL_NAME_ENCODING_HEADER) === PERCENT_ENCODED_UTF8
      ? safeDecodeURIComponent(encodedFullName)
      : null;

  return {
    displayName: fullName ?? email,
    email,
    fullName,
  };
}

/** Preferred semantic name for new code; the old export remains compatible. */
export const getAuthenticatedUser = getChatGPTUser;

export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;

  redirect(chatGPTSignInPath(returnTo));
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

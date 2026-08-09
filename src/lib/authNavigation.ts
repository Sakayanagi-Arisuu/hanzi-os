import type { FirstPartyAuthProvider } from "../server/authRepository";
import { chatGPTSignOutPath } from "./chatgptAuthPaths";

/**
 * Native sessions are cleared by our own endpoint. Only the legacy hosted
 * compatibility session needs the external ChatGPT sign-out handoff.
 */
export const signedOutDestination = (
  provider: FirstPartyAuthProvider | undefined,
) => provider === undefined ? chatGPTSignOutPath("/") : "/signin";

import { randomBase64Url } from "../../../../src/auth/authCrypto";
import {
  boundedReturnTo,
  googleConfig,
  loadAuthRuntime,
  resolveCurrentAccount,
} from "../../../../src/server/authHttp";
import {
  googleAuthorizationUrl,
  pkceChallenge,
} from "../../../../src/server/googleIdentity";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") ?? "signin";
    if (!new Set(["signin", "link", "unlink"]).has(mode)) {
      return new Response("Invalid Google authentication mode.", { status: 400 });
    }
    const { database, environment, repository } = await loadAuthRuntime();
    const config = googleConfig(environment, request);
    const account = mode === "signin"
      ? null
      : await resolveCurrentAccount(database, true);
    if (mode !== "signin" && !account) {
      return Response.redirect(new URL("/signin?error=reauth", url.origin), 303);
    }
    const verifier = randomBase64Url(48);
    const nonce = randomBase64Url(32);
    const state = await repository.createChallenge({
      kind: `google_${mode}` as "google_signin" | "google_link" | "google_unlink",
      provider: "google",
      userId: account?.userId,
      payload: {
        verifier,
        nonce,
        returnTo: boundedReturnTo(url.searchParams.get("returnTo"),
          mode === "signin" ? "/" : "/account/security"),
      },
    });
    return Response.redirect(googleAuthorizationUrl({
      config,
      state,
      nonce,
      codeChallenge: await pkceChallenge(verifier),
    }), 303);
  } catch {
    return Response.redirect(
      new URL("/signin?error=google_unavailable", request.url),
      303,
    );
  }
}

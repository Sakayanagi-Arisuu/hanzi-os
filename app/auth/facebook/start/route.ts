import {
  boundedReturnTo,
  facebookConfig,
  loadAuthRuntime,
  resolveCurrentAccount,
} from "../../../../src/server/authHttp";
import { facebookAuthorizationUrl } from "../../../../src/server/facebookIdentity";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") ?? "signin";
    if (!new Set(["signin", "link", "unlink"]).has(mode)) {
      return new Response("Invalid Facebook authentication mode.", { status: 400 });
    }
    const { database, environment, repository } = await loadAuthRuntime();
    const config = facebookConfig(environment, request);
    const account = mode === "signin"
      ? null
      : await resolveCurrentAccount(database, true);
    if (mode !== "signin" && !account) {
      return Response.redirect(new URL("/signin?error=reauth", url.origin), 303);
    }
    const state = await repository.createChallenge({
      kind: `facebook_${mode}` as
        | "facebook_signin"
        | "facebook_link"
        | "facebook_unlink",
      provider: "facebook",
      userId: account?.userId,
      payload: {
        returnTo: boundedReturnTo(
          url.searchParams.get("returnTo"),
          mode === "signin" ? "/" : "/account/security",
        ),
      },
    });
    return Response.redirect(facebookAuthorizationUrl({ config, state }), 303);
  } catch {
    return Response.redirect(
      new URL("/signin?error=facebook_unavailable", request.url),
      303,
    );
  }
}

import { AUTH_JSON_HEADERS, type AuthRuntimeEnvironment } from '../../../../src/server/authHttp';
import { getRuntimeEnvironment } from '../../../../src/server/d1';
import { authenticationCapabilities } from '../../../../src/server/authCapabilities';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const environment = await getRuntimeEnvironment<AuthRuntimeEnvironment>();
    return Response.json(authenticationCapabilities(environment, request), { headers: AUTH_JSON_HEADERS });
  } catch {
    return Response.json({ google: false, github: false, hanzi: false, facebook: false, emailOtp: false, passkey: false }, { status: 503, headers: AUTH_JSON_HEADERS });
  }
}

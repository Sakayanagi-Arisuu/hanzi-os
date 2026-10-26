import { getRuntimeEnvironment } from './d1';

export async function publicOperator() {
  try {
    const env = await getRuntimeEnvironment<{ HANZI_SUPPORT_EMAIL?: string; HANZI_OPERATOR_NAME?: string }>();
    const email = env.HANZI_SUPPORT_EMAIL?.trim();
    const name = env.HANZI_OPERATOR_NAME?.trim();
    return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && name ? { name, email } : null;
  } catch { return null; }
}

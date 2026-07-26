export default async function globalTeardown(): Promise<void> {
  const host = process.env.E2E_HOST ?? "127.0.0.1";
  const port = process.env.E2E_PORT ?? "4173";

  try {
    await fetch(`http://${host}:${port}/__e2e__/shutdown`, { method: "POST" });
  } catch {
    // The production harness may already have exited after a startup failure.
  }
}

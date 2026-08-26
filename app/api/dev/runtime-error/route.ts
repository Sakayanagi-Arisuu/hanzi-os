export const runtime = "edge";

type RuntimeErrorRecord = {
  detail: string;
  receivedAt: string;
  route: string;
};

let latestRuntimeError: RuntimeErrorRecord | null = null;

const noStoreHeaders = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
};

const unavailable = () => new Response(
  JSON.stringify({ error: "Not found" }),
  { headers: noStoreHeaders, status: 404 },
);

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return unavailable();
  const url = new URL(request.url);
  if (!["localhost", "127.0.0.1"].includes(url.hostname)) return unavailable();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid diagnostic payload" }),
      { headers: noStoreHeaders, status: 400 },
    );
  }
  if (!payload || typeof payload !== "object") {
    return new Response(
      JSON.stringify({ error: "Invalid diagnostic payload" }),
      { headers: noStoreHeaders, status: 400 },
    );
  }
  const candidate = payload as { detail?: unknown; route?: unknown };
  latestRuntimeError = {
    detail: typeof candidate.detail === "string"
      ? candidate.detail.slice(0, 4_000)
      : "Unknown runtime failure",
    receivedAt: new Date().toISOString(),
    route: typeof candidate.route === "string"
      ? candidate.route.slice(0, 300)
      : "unknown",
  };
  console.error("HANZI.OS local runtime diagnostic", latestRuntimeError);
  return new Response(JSON.stringify({ recorded: true }), {
    headers: noStoreHeaders,
    status: 202,
  });
}

export function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") return unavailable();
  const url = new URL(request.url);
  if (!["localhost", "127.0.0.1"].includes(url.hostname)) return unavailable();
  return new Response(JSON.stringify({ latestRuntimeError }), {
    headers: noStoreHeaders,
    status: 200,
  });
}

import type { D1Database } from "../../src/server/d1";
import { processContentReleaseBatch } from "../../src/server/contentReleaseWorker";

type Env = {
  DB: D1Database;
  CONTENT_RELEASE_DRAIN_TOKEN?: string;
};

type ExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
};

const json = (body: unknown, status = 200) => Response.json(body, {
  status,
  headers: { "cache-control": "no-store" },
});

const worker = {
  async scheduled(
    _controller: unknown,
    env: Env,
    context: ExecutionContext,
  ) {
    context.waitUntil(processContentReleaseBatch(env.DB));
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ status: "ok", worker: "content-release", schemaVersion: 1 });
    }
    if (request.method !== "POST" || url.pathname !== "/drain") {
      return json({ error: "not_found" }, 404);
    }
    const expected = env.CONTENT_RELEASE_DRAIN_TOKEN;
    const supplied = request.headers.get("authorization");
    if (!expected || supplied !== `Bearer ${expected}`) {
      return json({ error: "forbidden" }, 403);
    }
    return json(await processContentReleaseBatch(env.DB));
  },
};

export default worker;

import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const dist = resolve(root, "dist");

await mkdir(resolve(dist, "server"), { recursive: true });
await mkdir(resolve(dist, ".openai"), { recursive: true });
await copyFile(
  resolve(root, ".openai", "hosting.json"),
  resolve(dist, ".openai", "hosting.json"),
);

await writeFile(
  resolve(dist, "server", "index.js"),
  `const serve = async (request, env) => {
  if (!env?.ASSETS?.fetch) {
    return new Response("HANZI.OS asset binding is unavailable.", { status: 503 });
  }

  const response = await env.ASSETS.fetch(request);
  if (response.status !== 404 || request.method !== "GET") return response;

  const fallbackUrl = new URL(request.url);
  fallbackUrl.pathname = "/index.html";
  fallbackUrl.search = "";
  return env.ASSETS.fetch(new Request(fallbackUrl, request));
};

export { serve as fetch };
export default { fetch: serve };
`,
  "utf8",
);

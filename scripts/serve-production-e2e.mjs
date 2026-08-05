import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { brotliCompress as brotliCompressCallback, constants as zlibConstants } from "node:zlib";

const root = resolve(process.cwd());
const clientRoot = resolve(root, "dist/client");
const workerPath = resolve(root, "dist/server/index.js");
const host = process.env.E2E_HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.E2E_PORT ?? "4173", 10);
const readyNonce = process.env.E2E_READY_NONCE ?? "";
const productionOrigin = "https://hanzi-os-awakening.sopping-oboists-13ts.chatgpt.site";
const brotliCompress = promisify(brotliCompressCallback);
const assetBufferCache = new Map();

const MIME_TYPES = new Map([
  [".avif", "image/avif"],
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".jpg", "image/jpeg"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mp3", "audio/mpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".webp", "image/webp"],
  [".xml", "application/xml; charset=utf-8"],
]);

function extension(pathname) {
  const filename = pathname.slice(pathname.lastIndexOf("/") + 1);
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

function safeAssetPath(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  if (decoded.includes("\0") || decoded.includes("\\")) return null;
  const candidate = resolve(clientRoot, decoded.replace(/^\/+/, ""));
  if (candidate !== clientRoot && !candidate.startsWith(`${clientRoot}${sep}`)) {
    return null;
  }
  return candidate;
}

async function fetchAsset(input) {
  const request = input instanceof Request ? input : new Request(input);
  const url = new URL(request.url);
  const filePath = safeAssetPath(url.pathname);
  if (!filePath) return new Response("Not Found", { status: 404 });

  let fileStat;
  try {
    fileStat = await stat(filePath);
  } catch {
    return new Response("Not Found", { status: 404 });
  }
  if (!fileStat.isFile()) return new Response("Not Found", { status: 404 });

  const etag = `W/"${fileStat.size}-${Math.floor(fileStat.mtimeMs)}"`;
  const contentType = MIME_TYPES.get(extension(url.pathname)) ?? "application/octet-stream";
  const acceptsBrotli = request.headers.get("accept-encoding")?.includes("br") ?? false;
  // HTML is rewritten below so local absolute metadata points at this harness.
  // Pre-compressing it here would make response.text() consume Brotli bytes as
  // text while retaining Content-Encoding, yielding a browser network error
  // and a partial service-worker shell.
  const isCompressible = !contentType.startsWith("text/html")
    && (
      contentType.startsWith("text/")
      || contentType.includes("javascript")
      || contentType.includes("json")
      || contentType.includes("svg")
      || contentType.includes("xml")
    );
  const useBrotli = request.method !== "HEAD" && acceptsBrotli && isCompressible;
  const cacheKey = `${filePath}:${fileStat.mtimeMs}:${useBrotli ? "br" : "raw"}`;
  let body = assetBufferCache.get(cacheKey);
  if (!body && request.method !== "HEAD") {
    const source = await readFile(filePath);
    body = useBrotli
      ? await brotliCompress(source, {
        params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 5 },
      })
      : source;
    assetBufferCache.set(cacheKey, body);
  }

  const headers = new Headers({
    "cache-control": url.pathname.startsWith("/assets/")
      ? "public, max-age=31536000, immutable"
      : "public, max-age=3600",
    "content-length": String(body?.length ?? fileStat.size),
    "content-type": contentType,
    etag,
  });
  if (useBrotli) {
    headers.set("content-encoding", "br");
    headers.set("vary", "Accept-Encoding");
  }
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers });
  }
  if (request.method === "HEAD") return new Response(null, { headers });
  return new Response(body, { headers });
}

await stat(workerPath);
await stat(clientRoot);
const worker = (await import(`${pathToFileURL(workerPath).href}?e2e=${Date.now()}`)).default;
if (!worker || typeof worker.fetch !== "function") {
  throw new Error("Built worker does not expose fetch(request, env, ctx)");
}

const env = {
  ASSETS: { fetch: fetchAsset },
  IMAGES: {
    input() {
      throw new Error("Image transformation is unavailable in the local E2E harness");
    },
  },
};
const ctx = {
  waitUntil(promise) {
    Promise.resolve(promise).catch(() => {});
  },
  passThroughOnException() {},
};

const server = createServer(async (incoming, outgoing) => {
  try {
    const incomingUrl = new URL(
      `http://${incoming.headers.host ?? `${host}:${port}`}${incoming.url ?? "/"}`,
    );
    if (incoming.method === "GET" && incomingUrl.pathname === "/__e2e__/ready") {
      outgoing.writeHead(200, {
        "cache-control": "no-store",
        "content-type": "application/json; charset=utf-8",
      });
      outgoing.end(JSON.stringify({ nonce: readyNonce }));
      return;
    }
    if (
      incoming.method === "POST"
      && incomingUrl.pathname === "/__e2e__/shutdown"
      && (
        !readyNonce
        || incoming.headers["x-e2e-nonce"] === readyNonce
      )
    ) {
      outgoing.writeHead(204);
      outgoing.end();
      setImmediate(() => {
        server.closeAllConnections();
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(0), 1_000).unref();
      });
      return;
    }

    const requestHeaders = new Headers();
    for (const [name, value] of Object.entries(incoming.headers)) {
      if (Array.isArray(value)) value.forEach((item) => requestHeaders.append(name, item));
      else if (value !== undefined) requestHeaders.set(name, value);
    }

    const method = incoming.method ?? "GET";
    const hasBody = method !== "GET" && method !== "HEAD";
    const request = new Request(
      incomingUrl,
      {
        method,
        headers: requestHeaders,
        ...(hasBody ? { body: Readable.toWeb(incoming), duplex: "half" } : {}),
      },
    );
    const url = new URL(request.url);
    const staticResponse = url.pathname.startsWith("/assets/")
      ? await fetchAsset(request)
      : null;
    let response = staticResponse && staticResponse.status !== 404
      ? staticResponse
      : await worker.fetch(request, env, ctx);
    if ((response.headers.get("content-type") ?? "").includes("text/html")) {
      const headers = new Headers(response.headers);
      const rewritten = Buffer.from(
        (await response.text()).replaceAll(
          productionOrigin,
          incomingUrl.origin,
        ),
        "utf8",
      );
      const useBrotli = method !== "HEAD"
        && requestHeaders.get("accept-encoding")?.includes("br");
      const body = useBrotli
        ? await brotliCompress(rewritten, {
          params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 5 },
        })
        : rewritten;
      headers.set("content-length", String(body.length));
      headers.delete("content-encoding");
      if (useBrotli) {
        headers.set("content-encoding", "br");
        headers.set("vary", "Accept-Encoding");
      }
      response = new Response(
        method === "HEAD" ? null : body,
        { status: response.status, statusText: response.statusText, headers },
      );
    }

    outgoing.statusCode = response.status;
    outgoing.statusMessage = response.statusText;
    response.headers.forEach((value, name) => outgoing.setHeader(name, value));
    if (!response.body || method === "HEAD") {
      outgoing.end();
      return;
    }
    Readable.fromWeb(response.body).pipe(outgoing);
  } catch (error) {
    console.error(error);
    if (!outgoing.headersSent) outgoing.writeHead(500, { "content-type": "text/plain" });
    outgoing.end("Internal Server Error");
  }
});

server.listen(port, host, () => {
  const address = server.address();
  const actualPort = typeof address === "object" && address
    ? address.port
    : port;
  console.log(
    `HANZI.OS production E2E server listening on http://${host}:${actualPort}`,
  );
  if (typeof process.send === "function") {
    process.send({
      type: "hanzi-e2e-ready",
      nonce: readyNonce,
      port: actualPort,
    });
  }
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.closeAllConnections();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1_000).unref();
  });
}

import {
  DEFAULT_DEVICE_SIZES,
  DEFAULT_IMAGE_SIZES,
  handleImageOptimization,
} from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { SECURITY_HEADERS } from "../src/server/securityHeaders";

interface AssetFetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface Env {
  ASSETS: AssetFetcher;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: {
          format: string;
          quality: number;
        }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const INDEXABLE_DOCUMENT_PATHS = new Set([
  "/",
  "/privacy",
  "/terms",
  "/voice-data",
]);

const STATIC_HEADER_OVERRIDES: Record<string, Record<string, string>> = {
  "/manifest.webmanifest": {
    "content-type": "application/manifest+json; charset=utf-8",
    "cache-control": "public, max-age=0, must-revalidate",
  },
  "/sw.js": {
    "content-type": "application/javascript; charset=utf-8",
    "cache-control": "no-cache, no-store, must-revalidate",
    "service-worker-allowed": "/",
  },
  "/robots.txt": {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "public, max-age=3600",
  },
  "/sitemap.xml": {
    "content-type": "application/xml; charset=utf-8",
    "cache-control": "public, max-age=3600",
  },
  "/offline.html": {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-cache",
    "x-robots-tag": "noindex, nofollow",
  },
};

function normalizeDocumentPath(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
}

function withSecurityHeaders(response: Response, pathname: string): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }

  const contentType = headers.get("content-type") ?? "";
  if (
    contentType.includes("text/html") &&
    (response.status >= 400 ||
      !INDEXABLE_DOCUMENT_PATHS.has(normalizeDocumentPath(pathname)))
  ) {
    headers.set("x-robots-tag", "noindex, nofollow");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const worker = {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    const headerOverride = STATIC_HEADER_OVERRIDES[url.pathname];
    if (headerOverride && env?.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        const headers = new Headers(assetResponse.headers);
        for (const [name, value] of Object.entries(headerOverride)) {
          headers.set(name, value);
        }
        return withSecurityHeaders(
          new Response(assetResponse.body, {
            status: assetResponse.status,
            statusText: assetResponse.statusText,
            headers,
          }),
          url.pathname,
        );
      }
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      const imageResponse = await handleImageOptimization(
        request,
        {
          fetchAsset: (path) =>
            env.ASSETS.fetch(new Request(new URL(path, request.url))),
          transformImage: async (body, { width, format, quality }) => {
            const result = await env.IMAGES.input(body)
              .transform(width > 0 ? { width } : {})
              .output({ format, quality });
            return result.response();
          },
        },
        allowedWidths,
      );
      return withSecurityHeaders(imageResponse, url.pathname);
    }

    const response = await handler.fetch(request, env, ctx);
    return withSecurityHeaders(response, url.pathname);
  },
};

export default worker;

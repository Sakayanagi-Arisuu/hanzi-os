import {
  DEFAULT_DEVICE_SIZES,
  DEFAULT_IMAGE_SIZES,
  handleImageOptimization,
} from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { emailActionRenderingRequest, securityHeadersForPath } from "../src/server/securityHeaders";
import { androidAssetLinks, directHostingRequest, isAuthNavigationPreload, offlineFallbackAssetRequest } from '../src/server/directHosting';
import type { D1Database } from '../src/server/d1';
import { AccountDeletionRepository } from '../src/server/accountDeletionRepository';
import { FirebaseAuthAdmin, firebaseAuthAdminConfig } from '../src/server/firebaseAuthAdmin';
import { firebaseEmailActionFallback } from '../src/server/firebaseEmailActionFallback';

interface AssetFetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface Env {
  DB?: D1Database;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_WEB_API_KEY?: string;
  FIREBASE_AUTH_SERVICE_ACCOUNT?: string;
  HANZI_HOSTING_PROVIDER?: string;
  ANDROID_PACKAGE_NAME?: string;
  ANDROID_SHA256_FINGERPRINTS?: string;
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
  "/delete-account",
]);

const STATIC_HEADER_OVERRIDES: Record<string, Record<string, string>> = {
  '/offline-assets.json': {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-cache',
  },
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
  for (const [name, value] of Object.entries(securityHeadersForPath(pathname))) {
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
  scheduled(_event: unknown, env: Env, ctx: ExecutionContext) {
    if (!env.DB) return;
    ctx.waitUntil(new AccountDeletionRepository(env.DB, async projectId => {
      const config = firebaseAuthAdminConfig(env.FIREBASE_PROJECT_ID, env.FIREBASE_AUTH_SERVICE_ACCOUNT);
      if (!config || config.projectId !== projectId) throw new Error('Deletion provider unavailable.');
      return new FirebaseAuthAdmin(config);
    }).runDueJobs().catch(() => { console.error('Account deletion worker unavailable; durable requests retained.'); }));
  },
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    request = directHostingRequest(request, env.HANZI_HOSTING_PROVIDER);
    const url = new URL(request.url);
    // Older installed service workers preload even bypassed OAuth navigations.
    // Never create/consume a one-time ceremony or set cookies on that duplicate.
    if (isAuthNavigationPreload(request)) {
      return withSecurityHeaders(new Response(null, { status: 204,
        headers: { 'cache-control': 'private, no-store' } }), url.pathname);
    }
    const providerAction = firebaseEmailActionFallback(request, env);
    if (providerAction) return withSecurityHeaders(providerAction, url.pathname);
    if (url.pathname === '/.well-known/assetlinks.json' && request.method === 'GET') {
      const links = androidAssetLinks(env.ANDROID_PACKAGE_NAME, env.ANDROID_SHA256_FINGERPRINTS);
      return withSecurityHeaders(Response.json(links ?? [], { status: links ? 200 : 404,
        headers: { 'cache-control': 'public, max-age=300' } }), url.pathname);
    }
    if (url.pathname === '/api/system/android-release' && request.method === 'GET') {
      const response = await env.ASSETS.fetch(new Request(new URL('/downloads/android-release.json', url.origin)));
      const headers = new Headers(response.headers);
      headers.set('cache-control', 'no-cache');
      return withSecurityHeaders(new Response(response.body, { status: response.status, headers }), url.pathname);
    }

    // A deliberately anonymous app document. API/account/admin pages retain
    // their private cache policy; no personalized HTML enters the offline shell.
    if (url.pathname === '/offline-shell' && request.method === 'GET') {
      const shell = await handler.fetch(new Request(new URL('/', request.url), {
        headers: { accept: 'text/html' },
      }), env, ctx);
      const headers = new Headers(shell.headers);
      if (shell.ok && headers.get('content-type')?.includes('text/html') && !headers.has('set-cookie')) {
        headers.set('cache-control', 'public, max-age=0, must-revalidate');
        headers.set('x-hanzi-offline-shell', '1');
      }
      return withSecurityHeaders(new Response(shell.body, { status: shell.status, headers }), url.pathname);
    }

    const headerOverride = STATIC_HEADER_OVERRIDES[url.pathname];
    if (headerOverride && env?.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(offlineFallbackAssetRequest(request));
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

    const response = await handler.fetch(emailActionRenderingRequest(request), env, ctx);
    return withSecurityHeaders(response, url.pathname);
  },
};

export default worker;

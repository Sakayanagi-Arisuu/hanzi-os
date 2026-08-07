const CACHE_PREFIX = "hanzi-os-";
const CACHE_VERSION = "v10";
const SHELL_CACHE = `${CACHE_PREFIX}shell-${CACHE_VERSION}`;
const PAGE_CACHE = `${CACHE_PREFIX}pages-${CACHE_VERSION}`;
const ASSET_CACHE = `${CACHE_PREFIX}assets-${CACHE_VERSION}`;

const ACTIVE_CACHES = new Set([SHELL_CACHE, PAGE_CACHE, ASSET_CACHE]);
const SHELL_ASSETS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/hanzi-os-mark.svg",
];

const PAGE_CACHE_LIMIT = 12;
const ASSET_CACHE_LIMIT = 80;

const AUTH_PATH_PREFIXES = [
  "/auth",
  "/signin",
  "/signin-with-chatgpt",
  "/signout-with-chatgpt",
  "/callback",
];
const PROTECTED_PATH_PREFIXES = ["/account", "/admin"];

function isPathAtOrBelow(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function shouldBypassServiceWorker(pathname) {
  return (
    isPathAtOrBelow(pathname, "/api") ||
    AUTH_PATH_PREFIXES.some((prefix) => isPathAtOrBelow(pathname, prefix)) ||
    PROTECTED_PATH_PREFIXES.some((prefix) =>
      isPathAtOrBelow(pathname, prefix),
    )
  );
}

function responseForbidsStorage(response) {
  const cacheControl = response?.headers?.get("cache-control") ?? "";
  return cacheControl.split(",").some((directive) => {
    const name = directive.trim().split("=", 1)[0].toLowerCase();
    return name === "private" || name === "no-store";
  });
}

function isCacheable(response) {
  return Boolean(
    response &&
      response.ok &&
      ["basic", "cors", "default"].includes(response.type) &&
      !responseForbidsStorage(response),
  );
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  const overflow = keys.length - maxEntries;
  if (overflow <= 0) return;

  await Promise.allSettled(
    keys.slice(0, overflow).map((request) => cache.delete(request)),
  );
}

async function putBounded(cacheName, request, response, maxEntries) {
  if (!isCacheable(response)) return false;

  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
    await trimCache(cacheName, maxEntries);
    return true;
  } catch {
    // Quota, storage, and unsupported-response failures must not break study.
    return false;
  }
}

async function installShell() {
  try {
    const cache = await caches.open(SHELL_CACHE);
    const staticResults = SHELL_ASSETS.map(async (url) => {
      const request = new Request(url, { cache: "reload" });
      const response = await fetch(request);
      if (!isCacheable(response)) {
        throw new Error(`Unable to cache ${url}`);
      }
      await cache.put(request, response);
    });

    const appDocument = (async () => {
      const request = new Request("/", { cache: "reload" });
      const response = await fetch(request);
      if (!isCacheable(response)) {
        throw new Error("Unable to cache the app document");
      }

      const html = await response.clone().text();
      const cached = await putBounded(
        PAGE_CACHE,
        request,
        response,
        PAGE_CACHE_LIMIT,
      );
      if (!cached) throw new Error("Unable to cache the app document");

      const directUrls = [...html.matchAll(/\b(?:src|href)="([^"]+)"/giu)]
        .map((match) => match[1]);
      const sourceSetUrls = [...html.matchAll(/\bsrcset="([^"]+)"/giu)]
        .flatMap((match) => match[1].split(","))
        .map((candidate) => candidate.trim().split(/\s+/u)[0]);
      const assetUrls = [...new Set([...directUrls, ...sourceSetUrls])]
        .filter((url) => url.startsWith("/"))
        .filter((url) =>
          url.startsWith("/assets/")
          || /\.(?:avif|css|gif|ico|jpe?g|js|png|svg|webp|woff2?)(?:\?|$)/iu.test(url)
        );

      // Discovered assets improve the first offline visit, but the cache-first
      // resource strategy can recover them later. They are not install-critical.
      await Promise.allSettled(assetUrls.map(async (url) => {
        const assetRequest = new Request(url, { cache: "reload" });
        const assetResponse = await fetch(assetRequest);
        if (!isCacheable(assetResponse)) {
          throw new Error(`Unable to cache ${url}`);
        }
        await putBounded(
          ASSET_CACHE,
          assetRequest,
          assetResponse,
          ASSET_CACHE_LIMIT,
        );
      }));
    })();

    // Wait for every in-flight cache write before deciding whether to remove
    // this version. Promise.all would reject early and let a slower task
    // recreate a partial cache after cleanup.
    const shellResults = await Promise.allSettled([
      ...staticResults,
      appDocument,
    ]);
    const failed = shellResults.find((result) => result.status === "rejected");
    if (failed) throw failed.reason;
  } catch (error) {
    await Promise.allSettled([
      caches.delete(SHELL_CACHE),
      caches.delete(PAGE_CACHE),
      caches.delete(ASSET_CACHE),
    ]);
    throw error;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(installShell());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.allSettled(
        keys
          .filter(
            (key) => key.startsWith(CACHE_PREFIX) && !ACTIVE_CACHES.has(key),
          )
          .map((key) => caches.delete(key)),
      );

      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.enable();
        } catch {
          // Navigation preload is an optimization, never an install gate.
        }
      }

      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function offlineResponse() {
  return new Response(
    "<!doctype html><html lang=\"vi\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>HANZI.OS đang ngoại tuyến</title><body><main><h1>Không có kết nối</h1><p>Hãy kết nối mạng rồi thử lại.</p></main></body></html>",
    {
      status: 503,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-robots-tag": "noindex, nofollow",
      },
    },
  );
}

async function networkFirstNavigation(event) {
  const { request } = event;

  try {
    let response;
    try {
      response = await event.preloadResponse;
    } catch {
      response = undefined;
    }
    response ||= await fetch(request);

    if (isCacheable(response)) {
      await putBounded(
        PAGE_CACHE,
        request,
        response.clone(),
        PAGE_CACHE_LIMIT,
      );
    }
    return response;
  } catch {
    const pageCache = await caches.open(PAGE_CACHE);
    const cachedPage = await pageCache.match(request, { ignoreVary: true });
    if (cachedPage) return cachedPage;

    const shellCache = await caches.open(SHELL_CACHE);
    return (await shellCache.match("/offline.html")) || offlineResponse();
  }
}

async function networkFirstResource(event, cacheName, maxEntries) {
  const { request } = event;
  try {
    const response = await fetch(request);
    if (isCacheable(response)) {
      await putBounded(cacheName, request, response.clone(), maxEntries);
    }
    return response;
  } catch {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error(`Network and cache miss for ${request.url}`);
  }
}

async function cacheFirst(event, cacheName, maxEntries) {
  const { request } = event;
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (isCacheable(response)) {
    await putBounded(cacheName, request, response.clone(), maxEntries);
  }
  return response;
}

function staleWhileRevalidate(event, cacheName, maxEntries) {
  const { request } = event;
  const cachePromise = caches.open(cacheName);
  const networkPromise = fetch(request).then(async (response) => {
    if (isCacheable(response)) {
      await putBounded(cacheName, request, response.clone(), maxEntries);
    }
    return response;
  });

  event.waitUntil(networkPromise.then(() => undefined).catch(() => undefined));
  return cachePromise.then(async (cache) => {
    const cached = await cache.match(request);
    return cached || networkPromise;
  });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.headers.has("range")) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (shouldBypassServiceWorker(url.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(event));
    return;
  }

  if (url.pathname === "/sw.js") return;

  if (
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/robots.txt" ||
    url.pathname === "/sitemap.xml"
  ) {
    event.respondWith(
      networkFirstResource(event, SHELL_CACHE, SHELL_ASSETS.length + 3),
    );
    return;
  }

  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/hanzi-data/")
  ) {
    event.respondWith(cacheFirst(event, ASSET_CACHE, ASSET_CACHE_LIMIT));
    return;
  }

  if (["style", "script", "image", "font"].includes(request.destination)) {
    event.respondWith(
      staleWhileRevalidate(event, ASSET_CACHE, ASSET_CACHE_LIMIT),
    );
  }
});

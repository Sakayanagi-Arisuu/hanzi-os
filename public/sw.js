const CACHE_PREFIX = "hanzi-os-";
const CACHE_VERSION = "v14";
const SHELL_CACHE = `${CACHE_PREFIX}shell-${CACHE_VERSION}`;
const PAGE_CACHE = `${CACHE_PREFIX}pages-${CACHE_VERSION}`;
const ASSET_CACHE = `${CACHE_PREFIX}assets-${CACHE_VERSION}`;
const PRIVATE_MEDIA_PREFIX = `${CACHE_PREFIX}learner-media-`;

const ACTIVE_CACHES = new Set([SHELL_CACHE, PAGE_CACHE, ASSET_CACHE]);
const offlinePreparations = new Set();
let offlinePreparationPaused = false;
const IS_LOCAL_DEVELOPMENT = ["localhost", "127.0.0.1"].includes(
  self.location.hostname,
) && !String(self.location.search || '').includes('offline=1');
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
const PROTECTED_PATH_PREFIXES = ["/account", "/admin", "/studio"];
const DEVELOPMENT_PATH_PREFIXES = [
  "/@fs",
  "/@id",
  "/@react-refresh",
  "/@vite",
  "/app",
  "/node_modules",
  "/src",
  "/dev-recover.html",
];

function isPathAtOrBelow(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function shouldBypassServiceWorker(pathname) {
  return (
    isPathAtOrBelow(pathname, "/api") ||
    DEVELOPMENT_PATH_PREFIXES.some((prefix) =>
      isPathAtOrBelow(pathname, prefix),
    ) ||
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
    // The shell holds the complete module graph; fetching the manifest must
    // never evict app chunks using an image-sized budget.
    if (cacheName !== SHELL_CACHE) await trimCache(cacheName, maxEntries);
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
      const request = new Request("/offline-shell", { cache: "reload", credentials: 'omit' });
      const response = await fetch(request);
      if (!isCacheable(response)) {
        throw new Error("Unable to cache the app document");
      }

      const html = await response.clone().text();
      const cached = await putBounded(
        SHELL_CACHE,
        request,
        response,
        1024,
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
          SHELL_CACHE,
          assetRequest,
          assetResponse,
          1024,
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

    // Pin the complete versioned JS/CSS graph, including lazy lesson chunks.
    // These are not subject to the small image cache's eviction policy.
    const manifestResponse = await fetch(new Request('/offline-assets.json', { cache: 'reload' }));
    if (!isCacheable(manifestResponse)) throw new Error('Offline asset manifest unavailable');
    const manifest = await manifestResponse.json();
    if (manifest.version !== 1 || !Array.isArray(manifest.assets) || !manifest.assets.length
      || manifest.assets.length > 1000 || manifest.assets.some(url => !/^\/assets\/[\w.-]+\.(js|css|woff2?)$/.test(url))) {
      throw new Error('Invalid offline asset manifest');
    }
    // Limit simultaneous downloads on mobile and wait for all writes on failure.
    let position = 0;
    const results = await Promise.allSettled(Array.from({ length: 4 }, async () => {
      while (position < manifest.assets.length) {
        const url = manifest.assets[position++];
        const response = await fetch(new Request(url, { cache: 'reload' }));
        if (!isCacheable(response)) throw new Error(`Offline asset unavailable: ${url}`);
        await cache.put(url, response);
      }
    }));
    const assetFailure = results.find(result => result.status === 'rejected');
    if (assetFailure) throw assetFailure.reason;
    await cache.put('/offline-assets.json', new Response(JSON.stringify(manifest)));
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
  if (IS_LOCAL_DEVELOPMENT) {
    event.waitUntil(self.skipWaiting());
    return;
  }
  event.waitUntil(installShell());
});

self.addEventListener("activate", (event) => {
  if (IS_LOCAL_DEVELOPMENT) {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.allSettled(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX))
            .map((key) => caches.delete(key)),
        );
        await self.registration.unregister();
        const windows = await self.clients.matchAll({
          includeUncontrolled: true,
          type: "window",
        });
        await Promise.allSettled(
          windows.map((client) => client.navigate(client.url)),
        );
      })(),
    );
    return;
  }
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.allSettled(
        keys
          .filter(
            (key) => key.startsWith(CACHE_PREFIX) && !ACTIVE_CACHES.has(key) && !key.startsWith(PRIVATE_MEDIA_PREFIX),
          )
          .map((key) => caches.delete(key)),
      );

      if (self.registration.navigationPreload) {
        try {
          // Preload duplicates bypassed OAuth start/callback requests, whose
          // state and authorization codes are deliberately single-use.
          await self.registration.navigationPreload.disable();
        } catch {
          // Navigation preload is an optimization, never an install gate.
        }
      }

      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === 'RESUME_OFFLINE_PREPARATION') {
    offlinePreparationPaused = false;
    return;
  }
  if (event.data?.type === 'PAUSE_OFFLINE_PREPARATION') {
    offlinePreparationPaused = true;
    for (const controller of offlinePreparations) controller.abort();
    return;
  }
  if (event.data?.type === "SKIP_WAITING") {
    // Keep a dormant waiting worker alive until activation was requested.
    event.waitUntil(self.skipWaiting());
    return;
  }
  if (event.data?.type === 'PREPARE_OFFLINE') {
    const controller = new AbortController();
    offlinePreparations.add(controller);
    event.waitUntil((async () => {
      try {
        if (offlinePreparationPaused) throw new Error('Offline preparation paused for update');
        const shell = await caches.open(SHELL_CACHE);
        controller.signal.throwIfAborted();
        if (!await shell.match('/offline-shell') || !await shell.match('/offline-assets.json')) {
          throw new Error('Offline shell incomplete');
        }
        const urls = event.data.urls;
        if (!Array.isArray(urls) || urls.length > 300 || urls.some(url =>
          typeof url !== 'string' || !/^\/(assets|images|art|audio|content|hanzi-data|api\/content\/media)\//.test(url)
          || url.includes('..') || url.includes('\\') || url.includes('?'))) throw new Error('Invalid offline resources');
        const media = shell;
        for (const url of new Set(urls)) {
          controller.signal.throwIfAborted();
          if (url.startsWith('/api/content/media/')) {
            const response = await privateLearnerMedia(new Request(new URL(url, self.location.origin), { signal: controller.signal }), true);
            if (!response.ok) throw new Error('Offline private media unavailable');
            continue;
          }
          const response = await fetch(new Request(url, { cache: 'reload', signal: controller.signal }));
          controller.signal.throwIfAborted();
          if (!isCacheable(response)) throw new Error('Offline resource unavailable');
          await media.put(url, response);
        }
        event.ports[0]?.postMessage({ ok: true });
      } catch {
        event.ports[0]?.postMessage({ ok: false });
      } finally {
        offlinePreparations.delete(controller);
      }
    })());
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

// Private media never enters the shared shell. Read the same owner/reset fence
// as the app, including on worker restart; reject a switch during a fetch.
function learnerMediaScope() {
  return new Promise(resolve => {
    const request = indexedDB.open('hanzi-os-sync-v1');
    request.onupgradeneeded = () => { request.transaction.abort(); };
    request.onerror = () => resolve(null);
    request.onsuccess = () => {
      const db = request.result;
      try {
        const transaction = db.transaction(['meta', 'documents', 'lesson-resumes'], 'readonly');
        let scope = null;
        const owner = transaction.objectStore('meta').get('activeOwnerGeneration');
        owner.onsuccess = () => {
          const value = owner.result?.value;
          if (!value || typeof value.ownerKey !== 'string' || !Number.isSafeInteger(value.generation)) return;
          const document = transaction.objectStore('documents').get(value.ownerKey);
          document.onsuccess = () => {
            const epoch = document.result?.document?.reset?.epoch ?? 0;
            if (!Number.isSafeInteger(epoch) || epoch < 0) return;
            const key = `${encodeURIComponent(value.ownerKey)}-${value.generation}-${epoch}`;
            scope = { key, ownerKey: value.ownerKey, premiumUntil: 0, accountUntil: value.ownerKey.startsWith('anonymous:') ? Infinity : 0 };
            const resumes = transaction.objectStore('lesson-resumes');
            const account = resumes.get(JSON.stringify([value.ownerKey, epoch, 'offline-account:v1']));
            account.onsuccess = () => {
              const saved = account.result?.value;
              if (saved?.generation === value.generation && saved.session?.accountKey === value.ownerKey) scope.accountUntil = saved.expiresAt;
            };
            const entitlement = resumes.get(JSON.stringify([value.ownerKey, epoch, 'offline-entitlement:v1']));
            entitlement.onsuccess = () => {
              const saved = entitlement.result?.value;
              const elapsed = Date.now() - saved?.savedAt;
              if (saved?.snapshot?.active && elapsed >= 0 && elapsed <= 30 * 86400_000
                && saved.snapshot.expiresAt > saved.snapshot.serverNow + elapsed) {
                scope.premiumUntil = Math.min(saved.savedAt + 30 * 86400_000,
                  saved.savedAt + saved.snapshot.expiresAt - saved.snapshot.serverNow);
              }
            };
          };
        };
        transaction.oncomplete = () => { db.close(); resolve(scope); };
        transaction.onabort = transaction.onerror = () => { db.close(); resolve(null); };
      } catch { db.close(); resolve(null); }
    };
  });
}

async function mediaRange(response, range) {
  if (!range || response.status !== 200) return response;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (!match[1] && !match[2])) return new Response(null, { status: 416 });
  const bytes = await response.arrayBuffer();
  const start = match[1] ? Number(match[1]) : Math.max(0, bytes.byteLength - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(bytes.byteLength - 1, Number(match[2])) : bytes.byteLength - 1;
  if (!Number.isSafeInteger(start) || start > end || start >= bytes.byteLength) return new Response(null, { status: 416,
    headers: { 'content-range': `bytes */${bytes.byteLength}` } });
  const headers = new Headers(response.headers);
  headers.delete('content-encoding');
  headers.set('content-length', String(end - start + 1));
  headers.set('content-range', `bytes ${start}-${end}/${bytes.byteLength}`);
  headers.set('accept-ranges', 'bytes');
  return new Response(bytes.slice(start, end + 1), { status: 206, headers });
}

async function privateLearnerMedia(request, requireStored = false) {
  request.signal.throwIfAborted();
  const scope = await learnerMediaScope();
  if (!scope) return requireStored ? new Response(null, { status: 503 }) : fetch(request);
  const cache = await caches.open(PRIVATE_MEDIA_PREFIX + scope.key);
  const headers = new Headers(request.headers);
  headers.delete('range');
  headers.set('x-learning-owner', scope.ownerKey);
  const full = new Request(request, { headers, signal: AbortSignal.any([request.signal, AbortSignal.timeout(12_000)]) });
  let response;
  try { response = await fetch(full); }
  catch { response = null; }
  request.signal.throwIfAborted();
  const current = await learnerMediaScope();
  if (scope.key !== current?.key) return new Response(null, { status: 409 });
  if (response && [401, 403, 404].includes(response.status)) {
    await cache.delete(full);
    return response;
  }
  if (response?.ok && response.status === 200 && /^(image|audio)\//.test(response.headers.get('content-type') || '')
    && ['free', 'premium'].includes(response.headers.get('x-hanzi-learner-media'))
    && Number(response.headers.get('content-length')) <= 20 * 1024 * 1024) {
    const storedHeaders = new Headers(response.headers);
    storedHeaders.set('x-hanzi-media-saved', String(Date.now()));
    let stored = false;
    try {
      const blob = await response.clone().blob();
      request.signal.throwIfAborted();
      if (blob.size <= 20 * 1024 * 1024) {
        await cache.put(full, new Response(blob, { headers: storedHeaders }));
        stored = true;
      }
    }
    catch { /* Quota failure must not block online playback. */ }
    if (requireStored && !stored) return new Response(null, { status: 503 });
    return mediaRange(response, request.headers.get('range'));
  }
  if (!response || response.status >= 500) {
    const saved = await cache.match(full);
    const age = Date.now() - Number(saved?.headers.get('x-hanzi-media-saved'));
    const entitled = saved?.headers.get('x-hanzi-learner-media') === 'free'
      || (current.accountUntil > Date.now() && current.premiumUntil > Date.now());
    if (saved && entitled && age >= 0 && age <= 30 * 86400_000) return mediaRange(saved, request.headers.get('range'));
  }
  return requireStored ? new Response(null, { status: 503 }) : response || new Response(null, { status: 503 });
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
    response ||= await fetch(new Request(request, { signal: AbortSignal.timeout(12_000) }));
    if (response.status >= 500 || response.status === 408 || response.status === 429) {
      throw new Error('Learner server unavailable');
    }

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
    if (/^\/(?:$|path(?:\/|$)|lesson(?:\/|$)|review(?:\/|$)|profile(?:\/|$)|practice(?:\/|$)|reader(?:\/|$)|dictionary(?:\/|$)|mistakes(?:\/|$)|exams(?:\/|$)|pronunciation(?:\/|$)|characters(?:\/|$)|assessment(?:\/|$)|analytics(?:\/|$))/.test(new URL(request.url).pathname)) {
      const shell = await shellCache.match('/offline-shell');
      if (shell) return shell;
    }
    return (await shellCache.match("/offline.html")) || offlineResponse();
  }
}

async function networkFirstResource(event, cacheName, maxEntries) {
  const { request } = event;
  try {
    const response = await fetch(request);
    if (response.status >= 500) throw new Error('Resource server unavailable');
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
  const shell = await caches.open(SHELL_CACHE);
  const pinned = await shell.match(request);
  if (pinned) return pinned;
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
    const shell = await caches.open(SHELL_CACHE);
    return (await shell.match(request)) || cached || networkPromise;
  });
}

self.addEventListener("fetch", (event) => {
  if (IS_LOCAL_DEVELOPMENT) return;
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (/^\/api\/content\/media\/[^/]+$/.test(url.pathname)) {
    event.respondWith(privateLearnerMedia(request));
    return;
  }
  if (request.headers.has('range')) {
    if (/^\/(assets|audio|images)\//.test(url.pathname)) {
      const headers = new Headers(request.headers); headers.delete('range');
      event.respondWith(cacheFirst({ request: new Request(request, { headers }) }, ASSET_CACHE, ASSET_CACHE_LIMIT)
        .then(response => mediaRange(response, request.headers.get('range'))));
    }
    return;
  }
  if (shouldBypassServiceWorker(url.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(event));
    return;
  }

  if (url.pathname === "/sw.js") return;

  if (
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/robots.txt"
  ) {
    event.respondWith(
      networkFirstResource(event, SHELL_CACHE, SHELL_ASSETS.length + 2),
    );
    return;
  }

  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/content/") ||
    url.pathname.startsWith("/hanzi-data/")
  ) {
    event.respondWith(cacheFirst(event, ASSET_CACHE, ASSET_CACHE_LIMIT));
    return;
  }

  if (["style", "script", "image", "font", "audio"].includes(request.destination)) {
    event.respondWith(
      staleWhileRevalidate(event, ASSET_CACHE, ASSET_CACHE_LIMIT),
    );
  }
});

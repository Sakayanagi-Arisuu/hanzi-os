import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IDBFactory } from 'fake-indexeddb';

type ServiceWorkerContext = {
  isCacheable: (response: Response) => boolean;
  listeners: Record<string, (...args: never[]) => void>;
  shouldBypassServiceWorker: (pathname: string) => boolean;
  mediaRange: (response: Response, range: string | null) => Promise<Response>;
  privateLearnerMedia: (request: Request, requireStored?: boolean) => Promise<Response>;
  networkFirstNavigation: (event: unknown) => Promise<Response>;
};

const loadServiceWorker = (overrides: {
  caches?: unknown;
  fetch?: unknown;
  origin?: string;
  self?: Record<string, unknown>;
  indexedDB?: IDBFactory;
} = {}): ServiceWorkerContext => {
  const source = readFileSync(
    new URL("../../public/sw.js", import.meta.url),
    "utf8",
  );
  const listeners: Record<string, (...args: never[]) => void> = {};
  class ServiceWorkerRequest extends Request {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      super(
        typeof input === "string" && input.startsWith("/")
          ? `https://hanzi.example${input}`
          : input,
        init,
      );
    }
  }
  const origin = overrides.origin ?? "https://hanzi.example";
  const location = new URL(origin);
  const context = {
    Headers,
    Request: ServiceWorkerRequest,
    Response,
    URL,
    AbortSignal,
    indexedDB: overrides.indexedDB,
    caches: overrides.caches ?? {},
    fetch: overrides.fetch ?? vi.fn(),
    listeners,
    self: {
      addEventListener: (
        type: string,
        listener: (...args: never[]) => void,
      ) => {
        listeners[type] = listener;
      },
      clients: {
        claim: vi.fn().mockResolvedValue(undefined),
        matchAll: vi.fn().mockResolvedValue([]),
      },
      location: { hostname: location.hostname, origin: location.origin },
      registration: { unregister: vi.fn().mockResolvedValue(true) },
      skipWaiting: vi.fn().mockResolvedValue(undefined),
      ...overrides.self,
    },
  };

  runInNewContext(source, context, { filename: "public/sw.js" });
  return context as unknown as ServiceWorkerContext;
};

describe("service worker privacy policy", () => {
  it('keeps an explicit update message alive until skipWaiting resolves', async () => {
    const activation = Promise.resolve();
    const skipWaiting = vi.fn().mockReturnValue(activation);
    const waitUntil = vi.fn();
    const worker = loadServiceWorker({ self: { skipWaiting } });
    worker.listeners.message({ data: { type: 'SKIP_WAITING' }, waitUntil } as never);
    expect(skipWaiting).toHaveBeenCalledOnce();
    expect(waitUntil).toHaveBeenCalledWith(activation);
    await activation;
  });
  it('disables navigation preload during activation without deleting current learner media', async () => {
    const disable = vi.fn().mockResolvedValue(undefined);
    const remove = vi.fn();
    const worker = loadServiceWorker({
      caches: { keys: async () => ['hanzi-os-learner-media-owner-a'], delete: remove },
      self: { registration: { navigationPreload: { disable } } },
    });
    let work: Promise<unknown> | undefined;
    worker.listeners.activate({ waitUntil: (value: Promise<unknown>) => { work = value; } } as never);
    await work;
    expect(disable).toHaveBeenCalledOnce();
    expect(remove).not.toHaveBeenCalled();
  });
  let serviceWorker: ServiceWorkerContext;

  beforeEach(() => {
    serviceWorker = loadServiceWorker();
  });

  it.each([
    "/api/session",
    "/api/sync/attempts",
    "/auth/google/start",
    "/signin",
    "/signin-with-chatgpt",
    "/signout-with-chatgpt",
    "/callback",
    "/account",
    "/account/devices",
    "/admin",
    "/admin/audit",
    "/studio",
    "/studio/items/revision-a",
    "/@vite/client",
    "/@react-refresh",
    "/app/client-app.tsx",
    "/node_modules/.vite/deps/react.js",
    "/src/screens/MockExamsPage.tsx",
    "/dev-recover.html",
  ])("bypasses identity-aware path %s", (pathname) => {
    expect(serviceWorker.shouldBypassServiceWorker(pathname)).toBe(true);

    const respondWith = vi.fn();
    serviceWorker.listeners.fetch({
      request: {
        destination: "document",
        headers: new Headers(),
        method: "GET",
        mode: "navigate",
        url: `https://hanzi.example${pathname}`,
      },
      respondWith,
      waitUntil: vi.fn(),
    } as never);

    expect(respondWith).not.toHaveBeenCalled();
  });

  it("continues to handle public navigations", () => {
    expect(serviceWorker.shouldBypassServiceWorker("/reader")).toBe(false);
    expect(serviceWorker.shouldBypassServiceWorker('/exams/hsk4/b')).toBe(false);
  });

  it('opens the cached learner shell when the server returns 503 while Internet is available', async () => {
    serviceWorker = loadServiceWorker({ fetch: vi.fn().mockResolvedValue(new Response('server down', { status: 503 })),
      caches: { open: vi.fn(async (name: string) => ({ match: vi.fn(async () => name.includes('shell') ? new Response('saved learner app') : undefined) })) } });
    const response = await serviceWorker.networkFirstNavigation({ request: new Request('https://hanzi.example/exams/hsk1/a') });
    expect(await response.text()).toBe('saved learner app');
  });

  it('serves cached audio ranges and rejects an empty or unsatisfiable range', async () => {
    const response = await serviceWorker.mediaRange(new Response('abcdef'), 'bytes=2-4');
    expect(response.status).toBe(206);
    expect(response.headers.get('content-range')).toBe('bytes 2-4/6');
    expect(await response.text()).toBe('cde');
    expect(await (await serviceWorker.mediaRange(new Response('abcdef'), 'bytes=-2')).text()).toBe('ef');
    expect((await serviceWorker.mediaRange(new Response('abc'), 'bytes=9-')).status).toBe(416);
    expect((await serviceWorker.mediaRange(new Response('abc'), 'bytes=-')).status).toBe(416);
  });

  it('isolates private media by owner, invalidates denial, and never stores editor preview media', async () => {
    const factory = new IDBFactory();
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open('hanzi-os-sync-v1', 1);
      request.onupgradeneeded = () => { ['meta', 'documents', 'lesson-resumes'].forEach(name => request.result.createObjectStore(name)); };
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    const setOwner = async (owner: string) => {
      await new Promise<void>(resolve => {
        const transaction = database.transaction(['meta', 'documents', 'lesson-resumes'], 'readwrite');
        transaction.objectStore('meta').put({ value: { ownerKey: owner, generation: 1 } }, 'activeOwnerGeneration');
        transaction.objectStore('documents').put({ document: { reset: { epoch: 0 } } }, owner);
        transaction.oncomplete = () => resolve();
      });
    };
    await setOwner('anonymous:a');
    const entries = new Map<string, Response>();
    const put = vi.fn(async (scope: string, request: Request, response: Response) => { entries.set(scope + request.url, response.clone()); });
    const caches = { open: vi.fn(async (scope: string) => ({
      put: (request: Request, response: Response) => put(scope, request, response),
      match: async (request: Request) => entries.get(scope + request.url)?.clone(),
      delete: async (request: Request) => entries.delete(scope + request.url),
    })) };
    const send = vi.fn().mockResolvedValue(new Response('image bytes', { headers: { 'content-type': 'image/png', 'x-hanzi-learner-media': 'free' } }));
    serviceWorker = loadServiceWorker({ indexedDB: factory, caches, fetch: send });
    const request = new Request('https://hanzi.example/api/content/media/file.png');
    await serviceWorker.privateLearnerMedia(request);
    expect(put).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0].headers.get('x-learning-owner')).toBe('anonymous:a');
    put.mockRejectedValueOnce(new Error('Quota exceeded'));
    expect((await serviceWorker.privateLearnerMedia(request, true)).status).toBe(503);
    send.mockRejectedValue(new TypeError('offline'));
    expect(await (await serviceWorker.privateLearnerMedia(request)).text()).toBe('image bytes');
    await setOwner('anonymous:b');
    expect((await serviceWorker.privateLearnerMedia(request)).status).toBe(503);
    await setOwner('anonymous:a');
    send.mockResolvedValue(new Response(null, { status: 403 }));
    expect((await serviceWorker.privateLearnerMedia(request)).status).toBe(403);
    send.mockRejectedValue(new TypeError('offline'));
    expect((await serviceWorker.privateLearnerMedia(request)).status).toBe(503);
    send.mockResolvedValue(new Response('editor preview', { headers: { 'content-type': 'image/png' } }));
    await serviceWorker.privateLearnerMedia(request);
    expect(put).toHaveBeenCalledTimes(2);
    database.close();
  });

  it.each(["private, max-age=60", "public, max-age=60, no-store"])(
    "refuses to cache a response with Cache-Control: %s",
    (cacheControl) => {
      const response = new Response("private", {
        headers: { "cache-control": cacheControl },
      });
      Object.defineProperty(response, "type", { value: "basic" });

      expect(serviceWorker.isCacheable(response)).toBe(false);
    },
  );

  it("allows a cacheable public response", () => {
    const response = new Response("public", {
      headers: { "cache-control": "public, max-age=60" },
    });
    Object.defineProperty(response, "type", { value: "basic" });

    expect(serviceWorker.isCacheable(response)).toBe(true);
  });

  it("rejects installation and removes the partial version when an essential asset fails", async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    const cache = {
      put,
      keys: vi.fn().mockResolvedValue([]),
    };
    let appDocumentFetchFinished = false;
    const cleanupObservedFinishedAppDocument: boolean[] = [];
    const deleteCache = vi.fn().mockImplementation(async () => {
      cleanupObservedFinishedAppDocument.push(appDocumentFetchFinished);
      return true;
    });
    const fetch = vi.fn(async (request: Request) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === "/offline-assets.json") return Response.json({version: 1, assets: ["/assets/app-a.js"]});
      if (pathname === "/offline.html") {
        return new Response("missing", { status: 503 });
      }
      if (pathname === "/offline-shell") {
        await new Promise((resolve) => setTimeout(resolve, 5));
        appDocumentFetchFinished = true;
      }
      return new Response(
        pathname === "/offline-shell" ? "<!doctype html><html></html>" : "asset",
      );
    });
    serviceWorker = loadServiceWorker({
      caches: {
        open: vi.fn().mockResolvedValue(cache),
        delete: deleteCache,
      },
      fetch,
    });
    let installWork: Promise<unknown> | null = null;

    serviceWorker.listeners.install({
      waitUntil: (work: Promise<unknown>) => {
        installWork = work;
      },
    } as never);

    await expect(installWork).rejects.toThrow("Unable to cache /offline.html");
    expect(deleteCache).toHaveBeenCalledTimes(3);
    expect(deleteCache.mock.calls.flat()).toEqual(expect.arrayContaining([
      "hanzi-os-shell-v14",
      "hanzi-os-pages-v14",
      "hanzi-os-assets-v14",
    ]));
    expect(cleanupObservedFinishedAppDocument).toEqual([true, true, true]);
  });

  it("installs only after every minimal shell response is durably cached", async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    const cache = {
      put,
      keys: vi.fn().mockResolvedValue([]),
    };
    const deleteCache = vi.fn().mockResolvedValue(true);
    const fetch = vi.fn(async (request: Request) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === "/offline-assets.json") return Response.json({version: 1, assets: ["/assets/app-a.js"]});
      return new Response(
        pathname === "/offline-shell" ? "<!doctype html><html></html>" : "asset",
      );
    });
    serviceWorker = loadServiceWorker({
      caches: {
        open: vi.fn().mockResolvedValue(cache),
        delete: deleteCache,
      },
      fetch,
    });
    let installWork: Promise<unknown> | null = null;

    serviceWorker.listeners.install({
      waitUntil: (work: Promise<unknown>) => {
        installWork = work;
      },
    } as never);

    await expect(installWork).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(6);
    expect(put).toHaveBeenCalledTimes(6);
    expect(deleteCache).not.toHaveBeenCalled();
  });

  it("self-removes a localhost worker, clears only HANZI.OS caches, and reloads clients", async () => {
    const deleteCache = vi.fn().mockResolvedValue(true);
    const navigate = vi.fn().mockResolvedValue(undefined);
    const unregister = vi.fn().mockResolvedValue(true);
    const skipWaiting = vi.fn().mockResolvedValue(undefined);
    const matchAll = vi.fn().mockResolvedValue([
      { navigate, url: "http://localhost:3000/exams" },
    ]);
    serviceWorker = loadServiceWorker({
      caches: {
        delete: deleteCache,
        keys: vi.fn().mockResolvedValue([
          "hanzi-os-assets-v12",
          "unrelated-cache",
        ]),
      },
      origin: "http://localhost:3000",
      self: {
        clients: { matchAll },
        registration: { unregister },
        skipWaiting,
      },
    });
    let installWork: Promise<unknown> | null = null;
    serviceWorker.listeners.install({
      waitUntil: (work: Promise<unknown>) => {
        installWork = work;
      },
    } as never);
    await expect(installWork).resolves.toBeUndefined();
    expect(skipWaiting).toHaveBeenCalledOnce();

    let activateWork: Promise<unknown> | null = null;
    serviceWorker.listeners.activate({
      waitUntil: (work: Promise<unknown>) => {
        activateWork = work;
      },
    } as never);
    await expect(activateWork).resolves.toBeUndefined();
    expect(deleteCache).toHaveBeenCalledWith("hanzi-os-assets-v12");
    expect(deleteCache).not.toHaveBeenCalledWith("unrelated-cache");
    expect(unregister).toHaveBeenCalledOnce();
    expect(matchAll).toHaveBeenCalledWith({
      includeUncontrolled: true,
      type: "window",
    });
    expect(navigate).toHaveBeenCalledWith("http://localhost:3000/exams");

    const respondWith = vi.fn();
    serviceWorker.listeners.fetch({
      request: {
        destination: "script",
        headers: new Headers(),
        method: "GET",
        mode: "cors",
        url: "http://localhost:3000/src/screens/MockExamsPage.tsx",
      },
      respondWith,
      waitUntil: vi.fn(),
    } as never);
    expect(respondWith).not.toHaveBeenCalled();
  });
});

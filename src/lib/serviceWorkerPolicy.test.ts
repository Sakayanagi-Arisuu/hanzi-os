import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { beforeEach, describe, expect, it, vi } from "vitest";

type ServiceWorkerContext = {
  isCacheable: (response: Response) => boolean;
  listeners: Record<string, (...args: never[]) => void>;
  shouldBypassServiceWorker: (pathname: string) => boolean;
};

const loadServiceWorker = (overrides: {
  caches?: unknown;
  fetch?: unknown;
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
  const context = {
    Headers,
    Request: ServiceWorkerRequest,
    Response,
    URL,
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
      location: { origin: "https://hanzi.example" },
    },
  };

  runInNewContext(source, context, { filename: "public/sw.js" });
  return context as unknown as ServiceWorkerContext;
};

describe("service worker privacy policy", () => {
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
      if (pathname === "/offline.html") {
        return new Response("missing", { status: 503 });
      }
      if (pathname === "/") {
        await new Promise((resolve) => setTimeout(resolve, 5));
        appDocumentFetchFinished = true;
      }
      return new Response(
        pathname === "/" ? "<!doctype html><html></html>" : "asset",
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
      "hanzi-os-shell-v9",
      "hanzi-os-pages-v9",
      "hanzi-os-assets-v9",
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
      return new Response(
        pathname === "/" ? "<!doctype html><html></html>" : "asset",
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
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(put).toHaveBeenCalledTimes(4);
    expect(deleteCache).not.toHaveBeenCalled();
  });
});

import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const recoveryScript = () => {
  const html = readFileSync(
    resolve(repositoryRoot, "public/dev-recover.html"),
    "utf8",
  );
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/giu)];
  const source = scripts.at(-1)?.[1];
  if (!source) throw new Error("Development recovery page has no script.");
  return source;
};

describe("development recovery page", () => {
  it("removes only HANZI.OS caches and returns to the requested route", async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    const deleteCache = vi.fn().mockResolvedValue(true);
    const replace = vi.fn();
    const continueLink = { classList: { add: vi.fn() }, href: "" };
    const status = { textContent: "" };
    const location = {
      origin: "http://localhost:3000",
      replace,
      search: "?returnTo=%2Fexams",
    };
    const window = {
      caches: {
        delete: deleteCache,
        keys: vi.fn().mockResolvedValue([
          "hanzi-os-assets-v12",
          "unrelated-cache",
        ]),
      },
      location,
    };

    runInNewContext(recoveryScript(), {
      URL,
      URLSearchParams,
      console,
      document: {
        getElementById: (id: string) => id === "status" ? status : continueLink,
      },
      navigator: {
        serviceWorker: {
          controller: null,
          getRegistrations: vi.fn().mockResolvedValue([{ unregister }]),
        },
      },
      window,
    });

    await vi.waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/exams?dev-recovered=v15");
    });
    expect(unregister).toHaveBeenCalledOnce();
    expect(deleteCache).toHaveBeenCalledWith("hanzi-os-assets-v12");
    expect(deleteCache).not.toHaveBeenCalledWith("unrelated-cache");
  });

  it("uses a fresh recovery document while an old worker controls the page", async () => {
    const replace = vi.fn();
    const continueLink = { classList: { add: vi.fn() }, href: "" };
    const location = {
      origin: "http://localhost:3000",
      replace,
      search: "?returnTo=%2Freview",
    };

    runInNewContext(recoveryScript(), {
      URL,
      URLSearchParams,
      console,
      document: {
        getElementById: (id: string) => id === "status"
          ? { textContent: "" }
          : continueLink,
      },
      navigator: {
        serviceWorker: {
          controller: {},
          getRegistrations: vi.fn().mockResolvedValue([
            { unregister: vi.fn().mockResolvedValue(true) },
          ]),
        },
      },
      window: {
        caches: {
          delete: vi.fn().mockResolvedValue(true),
          keys: vi.fn().mockResolvedValue([]),
        },
        location,
      },
    });

    await vi.waitFor(() => {
      expect(replace).toHaveBeenCalledWith(
        "/dev-recover.html?attempt=1&returnTo=%2Freview%3Fdev-recovered%3Dv15",
      );
    });
  });
});

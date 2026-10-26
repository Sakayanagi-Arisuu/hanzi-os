import { describe, expect, it } from "vitest";
import { createRecentQueue } from "./recentQueue";

describe("recent server queue", () => {
  it("reuses a verified result without extending its freshness on navigation", () => {
    const cache = createRecentQueue<string>();
    cache.write("owner:1:reset:0:cursor:8", "queue", 100);
    expect(cache.read("owner:1:reset:0:cursor:8", 200)).toBe("queue");
    expect(cache.read("owner:1:reset:0:cursor:8", 60_100)).toBeNull();
  });
  it("rejects a changed owner, generation, reset or progress and a reversed clock", () => {
    const cache = createRecentQueue<string>();
    cache.write("a:1:0:8", "queue", 100);
    for (const key of [null, "b:1:0:8", "a:2:0:8", "a:1:1:8", "a:1:0:9"]) {
      expect(cache.read(key, 200)).toBeNull();
    }
    expect(cache.read("a:1:0:8", 99)).toBeNull();
    cache.clear();
    expect(cache.read("a:1:0:8", 200)).toBeNull();
  });
});

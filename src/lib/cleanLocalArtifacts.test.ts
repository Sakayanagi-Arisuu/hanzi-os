import { mkdtemp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  cleanLocalArtifacts,
  DISPOSABLE_LOCAL_ARTIFACTS,
} from "../../scripts/clean-local-artifacts.mjs";

const temporaryRoots: string[] = [];

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(temporaryRoots.splice(0).map((root) =>
    rm(root, { recursive: true, force: true })));
});

describe("local artifact cleanup", () => {
  it("removes only disposable outputs and preserves the local D1 database", async () => {
    const root = await mkdtemp(join(tmpdir(), "hanzi-clean-"));
    temporaryRoots.push(root);

    await mkdir(join(root, ".wrangler", "state"), { recursive: true });
    await writeFile(join(root, ".wrangler", "state", "local.sqlite"), "learner-data");
    await Promise.all(DISPOSABLE_LOCAL_ARTIFACTS.map(async (artifact) => {
      const target = join(root, artifact);
      if (artifact.includes(".")) {
        await writeFile(target, "generated");
      } else {
        await mkdir(target, { recursive: true });
      }
    }));

    await cleanLocalArtifacts(root);

    await Promise.all(DISPOSABLE_LOCAL_ARTIFACTS.map((artifact) =>
      expect(stat(join(root, artifact))).rejects.toMatchObject({ code: "ENOENT" })));
    await expect(readFile(
      join(root, ".wrangler", "state", "local.sqlite"),
      "utf8",
    )).resolves.toBe("learner-data");
    expect(DISPOSABLE_LOCAL_ARTIFACTS).not.toContain(".wrangler");
  });
});

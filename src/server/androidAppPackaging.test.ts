import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { androidLinkConfig, androidResources, validateAndroidConfig, verifyAndroidProject } from "../../scripts/android-project.mjs";
import { androidAssetLinks } from "./directHosting";

const config = JSON.parse(readFileSync("android/twa-config.json", "utf8"));

describe("Android installation and website identity", () => {
  it("validates the source contract without claiming native compilation", async () => {
    expect(await verifyAndroidProject()).toMatchObject({ applicationId: "com.regulus.hanzios", versionCode: config.versionCode });
    const resources = androidResources(validateAndroidConfig(config));
    expect(resources).toContain(config.origin);
    expect(resources).toContain("delegate_permission/common.handle_all_urls");
  });
  it.each([
    { origin: "http://example.com" }, { origin: "https://localhost" },
    { origin: "https://example.com/signin" }, { origin: "https://user:secret@example.com" },
    { origin: "https://example.com?override=1" }, { applicationId: "com.test;<bad>" },
    { versionCode: 0 }, { versionCode: Number.MAX_SAFE_INTEGER },
    { browserHelperVersion: "unverified-latest" }, { gradleWrapperSha256: "0".repeat(64) },
  ])("rejects an invalid origin, identity or toolchain %j", (override) => {
    expect(() => validateAndroidConfig({ ...config, ...override })).toThrow();
  });
  it("only links the exact package to an actual public signing certificate", () => {
    expect(() => androidLinkConfig(config, "debug-key-placeholder")).toThrow();
    const fingerprint = Array(32).fill("AB").join(":");
    const link = androidLinkConfig(config, fingerprint);
    expect(androidAssetLinks(link.androidPackage, link.androidFingerprints.join(","))).toEqual([{
      relation: ["delegate_permission/common.handle_all_urls"],
      target: { namespace: "android_app", package_name: config.applicationId, sha256_cert_fingerprints: [fingerprint] },
    }]);
  });
  it("rejects a modified Gradle launcher before it can execute", async () => {
    const fixture = mkdtempSync(resolve(tmpdir(), "hanzi-android-contract-"));
    if (!resolve(fixture).startsWith(resolve(tmpdir()) + sep) || !fixture.includes("hanzi-android-contract-")) throw new Error("Unexpected fixture cleanup path");
    try {
      mkdirSync(resolve(fixture, "android/gradle/wrapper"), { recursive: true });
      copyFileSync("android/twa-config.json", resolve(fixture, "android/twa-config.json"));
      writeFileSync(resolve(fixture, "android/gradle/wrapper/gradle-wrapper.jar"), "modified launcher");
      await expect(verifyAndroidProject(fixture)).rejects.toThrow("wrapper integrity mismatch");
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });
});

import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import {
  readIndexedDbStore,
  type OwnerScopedCacheRecord,
  writeCurrentOwnerLocalState,
} from "./indexedDb";

const runtimeCatalog = JSON.parse(readFileSync(
  new URL("../content/runtime/hsk0-4-runtime-catalog.json", import.meta.url),
  "utf8",
)) as {
  schemaVersion: number;
  catalogId: string;
  runtimeContentVersion: string;
  importIdempotencyKey: string;
  integritySha256: string;
  sourceBindings: {
    contentPackage: {
      contentSchemaVersion: number;
      itemCatalogSchemaVersion: number;
    };
  };
};

const finishOnboarding = async (page: import("@playwright/test").Page) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Đánh thức một ngôn ngữ mới/i })).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục thiết lập" }).click();
  await page.getByRole("button", { name: "Tiếp tục thiết lập" }).click();
  await page.getByRole("button", { name: "Kích hoạt HANZI.OS" }).click();
  await expect(page.getByRole("heading", { name: /Đánh thức tiếng Trung trong bạn/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Xác nhận trạng thái" })).toBeVisible();
  await page.getByRole("button", { name: "Xác nhận trạng thái" }).click();
};

test("onboards a new learner into the released path", async ({ page }) => {
  await finishOnboarding(page);
  await page.getByRole("link", { name: "Xem Thiên Lộ" }).click();
  await expect(page).toHaveURL(/\/path$/u);
  await expect(page.getByRole("heading", { name: /Thiên Lộ/u })).toBeVisible();
});

test("shows the complete HSK4 target while retaining its prerequisite bridge", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", {
    name: /Đánh thức một ngôn ngữ mới/i,
  })).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục thiết lập" }).click();
  await page.getByRole("radiogroup", { name: /Căn Cơ Tự Khai · điểm xuất phát/u })
    .getByRole("radio", { name: /^HSK4/u })
    .click();
  await page.getByRole("button", { name: "Tiếp tục thiết lập" }).click();
  await page.getByRole("button", { name: "Kích hoạt HANZI.OS" }).click();
  await page.goto("/path");

  await expect(page.getByTestId("hsk4-level-check-card")).toBeVisible();
  await expect(page.locator(".lesson-node")).toHaveCount(217);
});

test("does not bypass a released HSK1 lesson prerequisite", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", {
    name: /Đánh thức một ngôn ngữ mới/i,
  })).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục thiết lập" }).click();
  await page.getByRole("radiogroup", { name: /Căn Cơ Tự Khai · điểm xuất phát/u })
    .getByRole("radio", { name: /^HSK1/u })
    .click();
  await page.getByRole("button", { name: "Tiếp tục thiết lập" }).click();
  await page.getByRole("button", { name: "Kích hoạt HANZI.OS" }).click();

  await page.goto("/lesson/daily-1");
  await expect(page.getByRole("heading", {
    name: "Thử Luyện này chưa khai mở",
  })).toBeVisible();
});

test("does not expose a historical draft lesson opened by direct URL", async ({ page }) => {
  await finishOnboarding(page);
  await page.goto("/lesson/historical-authoring-draft");
  await expect(page.getByRole("heading", { name: "Không tìm thấy thử luyện" })).toBeVisible();
  await expect(page.getByText("ACCESS DENIED", { exact: false })).toHaveCount(0);
});

test("persists an answered lesson item and resumes the exact session", async ({ page }) => {
  await finishOnboarding(page);
  await page.goto("/lesson/boot-1");
  await page.getByRole("button", { name: /Bước vào Thử Luyện/i }).click();

  const firstOption = page.locator(".answer-grid button").first();
  if (await firstOption.count()) {
    await firstOption.click();
  } else {
    await page.getByLabel("Hán tự bạn tự gọi lại").fill("错");
  }
  await page.getByRole("button", { name: "Xác nhận" }).click();
  await expect(page.getByRole("button", { name: "Câu tiếp theo" })).toBeVisible();

  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("hanzi-os-learning-state-v1");
    return raw ? JSON.parse(raw).evidence.length : 0;
  })).toBe(1);
  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("hanzi-os-learning-state-v1");
    const evidence = raw ? JSON.parse(raw).evidence?.[0] : null;
    return evidence && {
      schemaVersion: evidence.schemaVersion,
      contentVersion: evidence.contentVersion,
      activityVersion: evidence.activityVersion,
      source: evidence.source,
      metadata: {
        localRuntimeSchemaVersion:
          evidence.metadata?.localRuntimeSchemaVersion,
        activitySchemaVersion: evidence.metadata?.activitySchemaVersion,
        runtimeCatalogSchemaVersion:
          evidence.metadata?.runtimeCatalogSchemaVersion,
        runtimeCatalogId: evidence.metadata?.runtimeCatalogId,
        runtimeCatalogImportKey:
          evidence.metadata?.runtimeCatalogImportKey,
        runtimeCatalogIntegrity:
          evidence.metadata?.runtimeCatalogIntegrity,
        contentSchemaVersion: evidence.metadata?.contentSchemaVersion,
        itemCatalogSchemaVersion:
          evidence.metadata?.itemCatalogSchemaVersion,
        lessonId: evidence.metadata?.lessonId,
        lessonVersion: evidence.metadata?.lessonVersion,
        sessionId: evidence.metadata?.sessionId,
        activityPosition: evidence.metadata?.activityPosition,
        exerciseId: evidence.metadata?.exerciseId,
      },
    };
  })).toMatchObject({
    schemaVersion: 1,
    contentVersion: runtimeCatalog.runtimeContentVersion,
    source: "lesson",
    metadata: {
      localRuntimeSchemaVersion: 1,
      activitySchemaVersion: 1,
      runtimeCatalogSchemaVersion: runtimeCatalog.schemaVersion,
      runtimeCatalogId: runtimeCatalog.catalogId,
      runtimeCatalogImportKey: runtimeCatalog.importIdempotencyKey,
      runtimeCatalogIntegrity: runtimeCatalog.integritySha256,
      contentSchemaVersion:
        runtimeCatalog.sourceBindings.contentPackage.contentSchemaVersion,
      itemCatalogSchemaVersion:
        runtimeCatalog.sourceBindings.contentPackage.itemCatalogSchemaVersion,
      lessonId: "boot-1",
      lessonVersion: runtimeCatalog.runtimeContentVersion,
      activityPosition: 0,
    },
  });
  await expect.poll(async () => {
    const records = await readIndexedDbStore<
      OwnerScopedCacheRecord<{
        version: number;
        index: number;
        checked: boolean;
      }>
    >(page, "lesson-resumes");
    return records.find((record) =>
      record.entryKey.startsWith("lesson:v5:")
    )?.value ?? null;
  }).toMatchObject({ version: 5, index: 0, checked: true });

  await page.reload();
  await expect(page.getByText("1 / 10", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Câu tiếp theo" })).toBeVisible();
});

test("keeps public-client Reader practice out of verified mastery", async ({ page }) => {
  await finishOnboarding(page);
  await page.goto("/reader");
  const correctAnswer = "Tự giới thiệu là người Việt Nam và cảm ơn giáo viên.";
  await page.getByRole("radio", { name: correctAnswer }).click();
  await page.getByRole("button", { name: "Xác nhận practice" }).click();
  await expect(page.getByText("Đã hiểu đúng")).toBeVisible();

  await page.getByRole("button", { name: "Làm lại câu hiểu bài" }).click();
  await page.getByRole("radio", { name: correctAnswer }).click();
  await page.getByRole("button", { name: "Xác nhận practice" }).click();

  await expect.poll(() => page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("hanzi-os-learning-state-v1") ?? "{}");
    return (state.evidence ?? [])
      .filter((item: { source: string }) => item.source === "reader")
      .map((item: {
        masteryEligible: boolean;
        verified: boolean;
        metadata?: { measurementEligible?: boolean };
      }) => ({
        masteryEligible: item.masteryEligible,
        verified: item.verified,
        measurementEligible: item.metadata?.measurementEligible,
      }));
  })).toEqual([
    {
      masteryEligible: false,
      verified: false,
      measurementEligible: false,
    },
    {
      masteryEligible: false,
      verified: false,
      measurementEligible: false,
    },
  ]);
});

test("does not close remediation after revealing the answer", async ({ page }) => {
  await finishOnboarding(page);
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hanzi-os-learning-state-v1") ?? "{}")
  );
  state.mistakes = [{
      id: "boot-1:fixture-mistake",
      lessonId: "boot-1",
      questionId: "fixture-mistake",
      kind: "meaning",
      skill: "vocabulary",
      prompt: "你",
      selectedAnswer: "tôi",
      correctAnswer: "bạn",
      explanation: "你 (nǐ) nghĩa là bạn.",
      occurrences: 1,
      correctedStreak: 0,
      resolved: false,
      lastAttemptAt: "2026-07-20T00:00:00.000Z",
  }];
  await writeCurrentOwnerLocalState(page, state);
  await page.goto("/mistakes");
  await page.getByRole("button", { name: "Mở gợi ý" }).click();
  await page.getByLabel("Câu trả lời của bạn").fill("bạn");
  await page.getByRole("button", { name: "Kiểm tra local" }).click();
  await expect(
    page.getByText("Đúng sau khi đã mở gợi ý · chuỗi không tăng"),
  ).toBeVisible();

  await expect.poll(() => page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("hanzi-os-learning-state-v1") ?? "{}");
    const mistake = state.mistakes?.[0];
    const evidence = state.evidence?.at(-1);
    return {
      correctedStreak: mistake?.correctedStreak,
      resolved: mistake?.resolved,
      masteryEligible: evidence?.masteryEligible,
      usedHint: evidence?.metadata?.usedHint,
    };
  })).toEqual({
    correctedStreak: 0,
    resolved: false,
    masteryEligible: false,
    usedHint: true,
  });
});

test("resets progress without deleting the durable sync identity", async ({ page }) => {
  await finishOnboarding(page);
  await page.evaluate(async () => {
    localStorage.setItem("hanzi-os-voice-consent-v1", "granted");
    localStorage.setItem("hanzi-os-lesson-session-v3:boot-1", "legacy");
    localStorage.setItem("unrelated-app-key", "keep");
    const cache = await caches.open("hanzi-os-test-reset");
    await cache.put("/reset-fixture", new Response("fixture"));
  });
  await page.goto("/profile");
  await page.getByRole("button", { name: "Xóa toàn bộ dữ liệu HANZI.OS" }).click();
  await page.getByRole("button", { name: "Xóa toàn bộ dữ liệu", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Đánh thức một ngôn ngữ mới/i })).toBeVisible();

  await expect.poll(() => page.evaluate(async () => ({
    progressReset: (() => {
      const raw = localStorage.getItem("hanzi-os-learning-state-v1");
      if (!raw) return false;
      const state = JSON.parse(raw);
      return state.profile?.onboarded === false
        && state.evidence?.length === 0
        && Object.keys(state.completedLessons ?? {}).length === 0;
    })(),
    sessionKeys: Object.keys(localStorage).filter((key) =>
      key.startsWith("hanzi-os-lesson-session-v")
      || key === "hanzi-os-assessment-session-v1"
    ),
    voiceConsent: localStorage.getItem("hanzi-os-voice-consent-v1"),
    hasSyncIdentity: Boolean(
      localStorage.getItem("hanzi-os-sync-installation-v1")
      && localStorage.getItem("hanzi-os-sync-device-v1"),
    ),
    unrelated: localStorage.getItem("unrelated-app-key"),
    resetFixtureCachePresent: (await globalThis.caches.keys())
      .includes("hanzi-os-test-reset"),
    resetFixtureResponsePresent: Boolean(
      await globalThis.caches.match("/reset-fixture"),
    ),
  }))).toEqual({
    progressReset: true,
    sessionKeys: [],
    voiceConsent: null,
    hasSyncIdentity: true,
    unrelated: "keep",
    // The active service worker may immediately recreate public shell/asset
    // caches. The injected cache proves reset cleanup without treating those
    // non-learner runtime assets as retained progress.
    resetFixtureCachePresent: false,
    resetFixtureResponsePresent: false,
  });
});

test("keeps anonymous study public while cloud APIs require identity", async ({ page }) => {
  await finishOnboarding(page);
  await page.goto("/profile");
  const signIn = page.getByRole("link", { name: "Đăng nhập" });
  await expect(signIn).toBeVisible();
  await expect(signIn).toHaveAttribute("href", "/signin");

  const session = await page.request.get("/api/session");
  expect(session.status()).toBe(200);
  expect(await session.json()).toMatchObject({ authenticated: false });
  expect(session.headers()["cache-control"]).toContain("no-store");

  const sync = await page.request.get("/api/sync");
  expect(sync.status()).toBe(401);
  expect(sync.headers()["cache-control"]).toContain("no-store");
});

test("exposes aggregate operational health without accepting caller request IDs", async ({ page }) => {
  const live = await page.request.get("/api/health/live", {
    headers: { "x-request-id": "caller-controlled-id" },
  });
  expect(live.status()).toBe(200);
  expect(await live.json()).toEqual({ status: "live" });
  expect(live.headers()["cache-control"]).toContain("no-store");
  expect(live.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  expect(live.headers()["x-request-id"]).not.toBe("caller-controlled-id");

  const liveHead = await page.request.head("/api/health/live");
  expect(liveHead.status()).toBe(200);
  expect(await liveHead.text()).toBe("");

  // The local production harness intentionally has no D1 binding. Readiness
  // must therefore fail closed without exposing topology or error details.
  const ready = await page.request.get("/api/health/ready");
  expect(ready.status()).toBe(503);
  expect(await ready.json()).toEqual({ status: "unavailable" });
  expect(ready.headers()["cache-control"]).toContain("no-store");
});

test("traps keyboard focus in destructive dialogs and restores the trigger", async ({ page }) => {
  await finishOnboarding(page);
  await page.goto("/profile");

  const trigger = page.getByRole("button", {
    name: "Xóa toàn bộ dữ liệu HANZI.OS",
  });
  await trigger.focus();
  await trigger.click();

  const dialog = page.getByRole("dialog", {
    name: "Đưa hệ thống về khởi nguyên?",
  });
  const cancel = page.getByRole("button", { name: "Hủy thao tác" });
  const confirm = page.getByRole("button", {
    name: "Xóa toàn bộ dữ liệu",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(cancel).toBeFocused();

  await page.keyboard.press("Shift+Tab");
  await expect(confirm).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(cancel).toBeFocused();
  await page.keyboard.press("Escape");

  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("exports, restores and reloads a validated local JSON backup", async ({ page }) => {
  await finishOnboarding(page);
  await page.goto("/profile");
  await page.getByLabel("Tên hiển thị").fill("Hành giả phục hồi");
  await page.getByRole("button", { name: "Lưu cấu hình" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", {
    name: "Xuất bản phục hồi hiện tại",
  }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^hanzi-os-recovery-\d{4}-\d{2}-\d{2}\.json$/u);
  const backupPath = await download.path();
  expect(backupPath).not.toBeNull();

  await page.getByLabel("Tên hiển thị").fill("Trạng thái tạm thời");
  await page.getByRole("button", { name: "Lưu cấu hình" }).click();
  await page.locator('input[type="file"]').setInputFiles(backupPath!);
  await expect(page.getByLabel("Tên hiển thị")).toHaveValue("Hành giả phục hồi");
  await expect.poll(() => page.evaluate(() =>
    JSON.parse(localStorage.getItem("hanzi-os-learning-state-v1") ?? "{}").profile?.name
  )).toBe("Hành giả phục hồi");
  await page.reload();
  await expect(page.getByLabel("Tên hiển thị")).toHaveValue("Hành giả phục hồi");
});

test("recovers the interactive app offline after an online controlled load", async ({ page, context }) => {
  await finishOnboarding(page);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await expect(page.getByRole("heading", { name: /Đánh thức tiếng Trung trong bạn/i })).toBeVisible();

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Đánh thức tiếng Trung trong bạn/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Không có kết nối" })).toHaveCount(0);
  } finally {
    await context.setOffline(false);
  }
});

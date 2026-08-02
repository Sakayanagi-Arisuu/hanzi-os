import { expect, test, type Page } from "@playwright/test";

const PRIVATE_STATE = {
  schemaVersion: 2,
  contentVersion: "privacy-gate-fixture",
  profile: {
    name: "PRIVATE VAULT LEARNER",
    goal: "conversation",
    dailyMinutes: 20,
    script: "simplified",
    startingLevel: "zero",
    onboarded: true,
  },
  xp: 0,
  dailyXp: 0,
  streak: 0,
  lastStudyDate: null,
  completedLessons: {},
  savedWords: [],
  fsrsCards: {},
  reviewCount: 0,
  skillMastery: {
    pronunciation: 0,
    listening: 0,
    speaking: 0,
    reading: 0,
    writing: 0,
    vocabulary: 0,
    grammar: 0,
  },
  knowledge: {},
  mistakes: [],
  activityLog: [],
  diagnostic: {
    completed: false,
    score: 0,
    recommendedLessonId: "boot-1",
    completedAt: null,
  },
  evidence: [],
};

const installPrivateSnapshot = async (
  page: Page,
  owner:
    | { installationId: string; ownerKey: string }
    | null = null,
) => {
  await page.addInitScript(({ state, ownerProof }) => {
    localStorage.setItem(
      "hanzi-os-learning-state-v1",
      JSON.stringify(state),
    );
    if (ownerProof) {
      localStorage.setItem(
        "hanzi-os-sync-installation-v1",
        ownerProof.installationId,
      );
      localStorage.setItem(
        "hanzi-os-learning-owner-v1",
        ownerProof.ownerKey,
      );
    }
  }, { state: PRIVATE_STATE, ownerProof: owner });
};

const delayAnonymousSession = async (page: Page) => {
  let releaseSession: (() => void) | undefined;
  const sessionGate = new Promise<void>((resolve) => {
    releaseSession = resolve;
  });
  await page.route("**/api/session", async (route) => {
    await sessionGate;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "cache-control": "private, no-store" },
      body: JSON.stringify({
        authenticated: false,
        user: null,
        accountKey: null,
      }),
    });
  });
  return () => releaseSession?.();
};

for (const ownerCase of [
  {
    label: "missing",
    owner: null,
  },
  {
    label: "mismatched",
    owner: {
      installationId: "privacy-current-installation",
      ownerKey: "anonymous:privacy-different-installation",
    },
  },
] as const) {
  test(`quarantines cached learner data with ${ownerCase.label} anonymous owner proof`, async ({ page }) => {
    await installPrivateSnapshot(page, ownerCase.owner);
    const releaseSession = await delayAnonymousSession(page);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Đang xác minh quyền sở hữu kho học..."))
      .toBeVisible();
    await expect(page.getByText("PRIVATE VAULT LEARNER")).toHaveCount(0);

    releaseSession();
    await expect(page.getByText("Kích hoạt Thiên Mệnh")).toBeVisible();
    await expect(page.getByText("PRIVATE VAULT LEARNER")).toHaveCount(0);

    const persisted = await page.evaluate(() => {
      const quarantineRaw = localStorage.getItem(
        "hanzi-os-learning-state-v1-ownership-quarantine",
      );
      const primaryRaw = localStorage.getItem("hanzi-os-learning-state-v1");
      const installationId = localStorage.getItem(
        "hanzi-os-sync-installation-v1",
      );
      return {
        quarantine: quarantineRaw ? JSON.parse(quarantineRaw) : null,
        primary: primaryRaw ? JSON.parse(primaryRaw) : null,
        ownerKey: localStorage.getItem("hanzi-os-learning-owner-v1"),
        installationId,
      };
    });
    expect(persisted.quarantine).toMatchObject({
      schemaVersion: 1,
      reason: "anonymous-owner-proof-missing-or-invalid",
      state: {
        profile: { name: "PRIVATE VAULT LEARNER" },
      },
    });
    expect(persisted.primary?.profile).toMatchObject({
      name: "Hành giả vô danh",
      onboarded: false,
    });
    expect(persisted.ownerKey).toBe(
      `anonymous:${persisted.installationId}`,
    );
  });
}

test("resumes cached learner data for the exact persisted anonymous owner", async ({ page }) => {
  await installPrivateSnapshot(page, {
    installationId: "privacy-proven-installation",
    ownerKey: "anonymous:privacy-proven-installation",
  });
  await page.route("**/api/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "cache-control": "private, no-store" },
      body: JSON.stringify({
        authenticated: false,
        user: null,
        accountKey: null,
      }),
    });
  });

  await page.goto("/");

  await expect(page.getByText("PRIVATE VAULT LEARNER")).toBeVisible();
  expect(await page.evaluate(() =>
    localStorage.getItem(
      "hanzi-os-learning-state-v1-ownership-quarantine",
    )
  )).toBeNull();
});

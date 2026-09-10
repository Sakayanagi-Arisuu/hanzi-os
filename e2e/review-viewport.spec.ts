import { expect, test, type Page } from "@playwright/test";

const CONTENT_VERSION = "foundation-2026.08.5";
const REVIEW_WORD_ID = "hsk-vocab-00170";

test.describe.configure({ mode: "serial" });

const installDueReviewCard = async (page: Page) => {
  await page.addInitScript(({ contentVersion, wordId }) => {
    if (localStorage.getItem("hanzi-os-learning-state-v1")) return;
    const installationId = "review-viewport-browser";
    localStorage.setItem("hanzi-os-sync-installation-v1", installationId);
    localStorage.setItem(
      "hanzi-os-learning-owner-v1",
      `anonymous:${installationId}`,
    );
    localStorage.setItem("hanzi-os-learning-state-v1", JSON.stringify({
      schemaVersion: 2,
      contentVersion,
      profile: {
        name: "Hành giả vô danh",
        goal: "conversation",
        dailyMinutes: 20,
        script: "simplified",
        startingLevel: "hsk1",
        onboarded: true,
      },
      xp: 0,
      dailyXp: 0,
      streak: 0,
      lastStudyDate: null,
      completedLessons: {},
      savedWords: [wordId],
      fsrsCards: {
        [wordId]: {
          due: "2026-01-01T00:00:00.000Z",
          stability: 0,
          difficulty: 0,
          elapsed_days: 0,
          scheduled_days: 0,
          learning_steps: 0,
          reps: 0,
          lapses: 0,
          state: 0,
        },
      },
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
        completed: true,
        score: 0,
        recommendedLessonId: "boot-1",
        completedAt: "2026-01-01T00:00:00.000Z",
      },
      evidence: [],
    }));
  }, { contentVersion: CONTENT_VERSION, wordId: REVIEW_WORD_ID });
};

const installSpeechProbe = async (page: Page, options: { hangFirstRequest?: boolean } = {}) => {
  await page.addInitScript(({ hangFirstRequest }) => {
    type SpeechCall = { lang: string; text: string; volume: number };
    const probe = {
      calls: [] as SpeechCall[],
      cancelCount: 0,
      getVoicesCount: 0,
    };
    class FakeSpeechSynthesisUtterance {
      readonly text: string;
      lang = "";
      pitch = 1;
      rate = 1;
      volume = 1;
      voice: SpeechSynthesisVoice | null = null;
      onboundary: ((event: SpeechSynthesisEvent) => void) | null = null;
      onend: ((event: SpeechSynthesisEvent) => void) | null = null;
      onerror: ((event: SpeechSynthesisErrorEvent) => void) | null = null;
      onmark: ((event: SpeechSynthesisEvent) => void) | null = null;
      onpause: ((event: SpeechSynthesisEvent) => void) | null = null;
      onresume: ((event: SpeechSynthesisEvent) => void) | null = null;
      onstart: ((event: SpeechSynthesisEvent) => void) | null = null;

      constructor(text: string) { this.text = text; }

      addEventListener() { return undefined; }
      dispatchEvent() { return true; }
      removeEventListener() { return undefined; }
    }
    const synthesis = {
      cancel: () => { probe.cancelCount += 1; },
      getVoices: () => {
        probe.getVoicesCount += 1;
        return [];
      },
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      speak: (utterance: SpeechSynthesisUtterance) => {
        probe.calls.push({
          lang: utterance.lang,
          text: utterance.text,
          volume: utterance.volume,
        });
        if (hangFirstRequest && probe.calls.length === 1) return;
        queueMicrotask(() => utterance.onstart?.(new Event("start") as SpeechSynthesisEvent));
        window.setTimeout(() => utterance.onend?.(new Event("end") as SpeechSynthesisEvent), 20);
      },
    };
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: synthesis,
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: FakeSpeechSynthesisUtterance,
    });
    Object.defineProperty(window, "__reviewSpeechProbe", {
      configurable: true,
      value: probe,
    });
  }, { hangFirstRequest: Boolean(options.hangFirstRequest) });
};

const expectActionInsideViewport = async (
  page: Page,
  actionSelector: string,
) => {
  const bounds = await page.locator(actionSelector).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const mobileNav = document.querySelector<HTMLElement>(".mobile-nav");
    const mobileNavTop = mobileNav && getComputedStyle(mobileNav).display !== "none"
      ? mobileNav.getBoundingClientRect().top
      : window.innerHeight;
    return {
      bottom: rect.bottom,
      top: rect.top,
      viewportBottom: Math.min(window.innerHeight, mobileNavTop),
    };
  });
  expect(bounds.top).toBeGreaterThanOrEqual(0);
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.viewportBottom + 1);
};

for (const viewport of [
  { name: "desktop", width: 1280, height: 720 },
  { name: "mobile", width: 360, height: 740 },
]) {
  test(`keeps reveal and rating actions visible on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await installDueReviewCard(page);
    await page.goto("/review");
  await page.getByRole("button", { name: "Bắt đầu ôn", exact: true }).click();

    const revealConsole = page.locator('[data-review-action="reveal"]');
    await expect(revealConsole).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "人" })).toBeVisible();
    await expectActionInsideViewport(page, '[data-review-action="reveal"]');

    await revealConsole.getByRole("button", { name: "Hiện đáp án" }).click();

    const ratingConsole = page.locator('[data-review-action="rating"]');
    await expect(ratingConsole).toBeVisible();
    await expect(ratingConsole.getByRole("button")).toHaveCount(4);
    await expect(ratingConsole.getByRole("button", { name: /^Quên\./u })).toBeFocused();
    await expectActionInsideViewport(page, '[data-review-action="rating"]');
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    await ratingConsole.getByRole("button", { name: /^Ổn\./u }).click();
    await expect(page.getByRole("heading", {
      name: "Kết trận hoàn tất",
    })).toBeVisible();
    await expect.poll(() => page.evaluate(() => JSON.parse(
      localStorage.getItem("hanzi-os-learning-state-v1") ?? "{}",
    ).reviewCount ?? 0)).toBe(1);
  });
}

test("discovers voices without queueing a silent pronunciation", async ({ page }) => {
  await installSpeechProbe(page);
  await installDueReviewCard(page);
  await page.goto("/review");
  await page.getByRole("button", { name: "Bắt đầu ôn", exact: true }).click();

  await expect(page.getByRole("heading", { name: "人" })).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => page.evaluate(() => (
    window as unknown as { __reviewSpeechProbe: { getVoicesCount: number } }
  ).__reviewSpeechProbe.getVoicesCount)).toBeGreaterThan(0);
  expect(await page.evaluate(() => (
    window as unknown as { __reviewSpeechProbe: { calls: Array<{ text: string }> } }
  ).__reviewSpeechProbe.calls)).toEqual([]);

  await expect(page.getByRole("button", { name: "Nghe phát âm 人" })).toHaveCount(0);
  await page.getByRole("button", { name: "Hiện đáp án", exact: true }).click();
  await page.getByRole("button", { name: "Nghe phát âm 人" }).click();
  await expect.poll(() => page.evaluate(() => (
    window as unknown as {
      __reviewSpeechProbe: { calls: Array<{ lang: string; text: string; volume: number }> };
    }
  ).__reviewSpeechProbe.calls.some((call) => (
    call.text === "人" && call.lang === "zh-CN" && call.volume > 0
  )))).toBe(true);
  await expect(page.locator(".system-voice-beacon")).toHaveCount(0);
  await expect(page.locator(".memory-arena")).toHaveAttribute("data-audio-phase", "ended");
});

test("recovers when Chromium never starts the first pronunciation", async ({ page }) => {
  await installSpeechProbe(page, { hangFirstRequest: true });
  await installDueReviewCard(page);
  await page.goto("/review");
  await page.getByRole("button", { name: "Bắt đầu ôn", exact: true }).click();

  await expect(page.getByRole("heading", { name: "人" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Nghe phát âm 人" })).toHaveCount(0);
  await page.getByRole("button", { name: "Hiện đáp án", exact: true }).click();
  await page.getByRole("button", { name: "Nghe phát âm 人" }).click();

  await expect.poll(() => page.evaluate(() => (
    window as unknown as {
      __reviewSpeechProbe: {
        calls: Array<{ text: string }>;
        cancelCount: number;
      };
    }
  ).__reviewSpeechProbe.calls.filter((call) => call.text === "人").length), {
    timeout: 5_000,
  }).toBe(2);
  await expect.poll(() => page.evaluate(() => (
    window as unknown as { __reviewSpeechProbe: { cancelCount: number } }
  ).__reviewSpeechProbe.cancelCount)).toBeGreaterThan(0);
  await expect(page.locator(".memory-arena")).toHaveAttribute("data-audio-phase", "ended");
});

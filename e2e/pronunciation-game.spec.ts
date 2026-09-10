import { expect, test, type Page } from "@playwright/test";

const installFakeSpeechSynthesis = async (page: Page) => {
  await page.addInitScript(() => {
    const listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
    const synthesis = {
      cancel: () => undefined,
      getVoices: () => [],
      pause: () => undefined,
      pending: false,
      paused: false,
      resume: () => undefined,
      speaking: false,
      speak: (utterance: SpeechSynthesisUtterance) => {
        window.setTimeout(() => utterance.onstart?.(new Event("start") as SpeechSynthesisEvent), 0);
        window.setTimeout(() => utterance.onend?.(new Event("end") as SpeechSynthesisEvent), 20);
      },
      addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
        const bucket = listeners.get(type) ?? new Set<EventListenerOrEventListenerObject>();
        bucket.add(listener);
        listeners.set(type, bucket);
      },
      removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
        listeners.get(type)?.delete(listener);
      },
      dispatchEvent: (event: Event) => {
        listeners.get(event.type)?.forEach((listener) => {
          if (typeof listener === "function") listener(event);
          else listener.handleEvent(event);
        });
        return true;
      },
      onvoiceschanged: null,
    } satisfies Partial<SpeechSynthesis>;
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: synthesis });
  });
};

const installFakePcmCapture = async (page: Page, holdRecording = false) => {
  await page.addInitScript((hold) => {
    const capture = { starts: 0, trackStops: 0 };
    Object.assign(window, { __hanziPcmCapture: capture });
    const stream = {
      getTracks: () => [{ stop: () => { capture.trackStops += 1; } }],
    };
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: async () => stream },
    });

    class FakeAudioContext {
      readonly sampleRate = 16_000;
      readonly destination = {};
      readonly currentTime = 0;
      state: AudioContextState = "running";

      createMediaStreamSource() {
        return { connect: () => undefined, disconnect: () => undefined };
      }

      createScriptProcessor() {
        capture.starts += 1;
        let audioProcess: ((event: {
          inputBuffer: { getChannelData: () => Float32Array };
        }) => void) | null = null;
        const processor = {
          connect: () => undefined,
          disconnect: () => undefined,
        } as {
          connect: () => void;
          disconnect: () => void;
          onaudioprocess: typeof audioProcess;
        };
        Object.defineProperty(processor, "onaudioprocess", {
          configurable: true,
          get: () => audioProcess,
          set: (next: typeof audioProcess) => {
            audioProcess = next;
            if (!next) return;
            if (hold) return;
            const voiced = new Float32Array(9_600);
            for (let index = 0; index < voiced.length; index += 1) {
              voiced[index] = Math.sin(index / 11) * .2;
            }
            window.setTimeout(() => next({
              inputBuffer: { getChannelData: () => voiced },
            }), 0);
            window.setTimeout(() => next({
              inputBuffer: { getChannelData: () => new Float32Array(19_200) },
            }), 20);
          },
        });
        return processor;
      }

      createGain() {
        return {
          gain: {
            value: 1,
            setTargetAtTime: () => undefined,
            setValueAtTime: () => undefined,
            exponentialRampToValueAtTime: () => undefined,
            cancelScheduledValues: () => undefined,
          },
          connect: () => undefined,
          disconnect: () => undefined,
        };
      }

      createDynamicsCompressor() {
        const parameter = { value: 0 };
        return {
          threshold: parameter,
          knee: parameter,
          ratio: parameter,
          attack: parameter,
          release: parameter,
          connect: () => undefined,
          disconnect: () => undefined,
        };
      }

      async resume() { this.state = "running"; }
      async close() { this.state = "closed"; }
    }

    Object.defineProperty(window, "AudioContext", { configurable: true, value: FakeAudioContext });
    Object.defineProperty(window, "webkitAudioContext", { configurable: true, value: FakeAudioContext });
  }, holdRecording);
};

test("recording fits a laptop viewport and replay cannot cancel capture", async ({ page }) => {
  await page.setViewportSize({ width: 1321, height: 643 });
  await installFakePcmCapture(page, true);
  await finishOnboarding(page);
  await followGuide(page);
  await page.locator(".pronunciation-quest-primary").click();
  await expect(page.locator(".pronunciation-quest-primary")).toHaveText("Dừng thu & xem phản hồi");
  await expect(page.getByRole("button", { name: "Nghe lại", exact: true })).toBeDisabled();
  const geometry = await page.locator(".pronunciation-quest-arena").evaluate((arena) => {
    const copy = arena.querySelector(".jade-lesson-copy")!.getBoundingClientRect();
    const bounds = arena.getBoundingClientRect();
    return { overflow: arena.scrollHeight - arena.clientHeight, top: copy.top - bounds.top, bottom: bounds.bottom - copy.bottom };
  });
  expect(geometry.overflow).toBeLessThanOrEqual(1);
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.bottom).toBeGreaterThanOrEqual(0);
});

const finishOnboarding = async (page: Page) => {
  await installFakeSpeechSynthesis(page);
  await page.goto("/onboarding");
  const wizard = page.getByTestId("onboarding-wizard");
  await wizard.waitFor({ timeout: 20_000 }).catch(() => undefined);
  if (await wizard.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
    await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
    await page.getByRole("button", { name: "Bắt đầu Khảo Nghiệm Căn Cơ" }).click();
  }
  await page.goto("/pronunciation");
  await expect(page.getByTestId("pronunciation-source-lesson"))
    .toBeVisible({ timeout: 20_000 });
  const closeInvite = page.getByRole("button", { name: "Đóng lời mời Khảo Nghiệm Căn Cơ" });
  if (await closeInvite.isVisible().catch(() => false)) await closeInvite.click();
};

const followGuide = async (page: Page) => {
  const primary = page.locator(".pronunciation-quest-primary");
  await expect(primary).toHaveText(/Nghe từ trọng tâm/u);
  await primary.click();
  await expect(primary).toHaveText(/Nghe câu mẫu/u);
  await primary.click();
  await expect(primary).toHaveText(/Đồng ý & bắt đầu xuất chiêu|Bắt đầu xuất chiêu/u);
};

const completeCurrentMissionManually = async (page: Page, phraseCount: number) => {
  for (let index = 0; index < phraseCount; index += 1) {
    await followGuide(page);
    const options = page.locator(".pronunciation-quest-secondary details");
    if (!await options.evaluate((element) => (element as HTMLDetailsElement).open)) {
      await options.getByText("Tuỳ chọn & quyền riêng tư").click();
    }
    await options.getByRole("button", { name: "Tôi đã tự luyện · tiếp tục không chấm" }).click();
  }
};

const mockAssessment = async (page: Page, status = 200) => {
  let calls = 0;
  await page.route("**/api/speech/pronunciation/assess", async (route) => {
    calls += 1;
    const request = route.request();
    if (status !== 200) {
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "PRONUNCIATION_TIMEOUT" } }),
      });
      return;
    }
    const activityId = request.headers()["x-hanzi-pronunciation-activity-id"] ?? "";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        schemaVersion: 1,
        activityId,
        assessment: {
          provider: "azure-speech-pronunciation-assessment",
          providerApi: "short-audio-rest-v1",
          locale: "zh-CN",
          transcript: "一个人",
          aggregate: {
            accuracyScore: 76,
            fluencyScore: 68,
            completenessScore: 100,
            pronunciationScore: 78,
          },
          words: [{ word: "人", accuracyScore: 57, errorType: "None", phonemes: [] }],
          lexicalToneAssessment: "not-reported-by-provider",
          calibration: "unapproved",
          masteryEligible: false,
        },
      }),
    });
  });
  return () => calls;
};

for (const viewport of [
  { width: 1365, height: 640 },
  { width: 360, height: 640 },
]) {
  test(`linked beginner quest stays bounded at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await finishOnboarding(page);

    const source = page.getByTestId("pronunciation-source-lesson");
    await expect(source).toBeVisible();
    await expect(source).toContainText("CHỌN BÀI LUYỆN");
    await expect(source).toContainText("Bốn thanh điệu");
    await source.click();
    await expect(page.getByTestId("pronunciation-lesson-library")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Luyện nói theo Thiên Lộ" })).toBeVisible();
    await page.getByRole("button", { name: "Đóng kho bài luyện" }).click();
    await expect(page.getByRole("progressbar", { name: "Tiến độ phiên luyện đọc" }))
      .toHaveAttribute("aria-valuemax", "4");
    await expect(page.getByTestId("practice-target-chinese")).toContainText("一个人");

    const geometry = await page.evaluate(() => {
      const primary = document.querySelector(".pronunciation-quest-primary")?.getBoundingClientRect();
      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        clientHeight: document.documentElement.clientHeight,
        scrollHeight: document.documentElement.scrollHeight,
        primary: primary ? { top: primary.top, bottom: primary.bottom, height: primary.height } : null,
      };
    });
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
    expect(geometry.scrollHeight).toBeLessThanOrEqual(geometry.clientHeight + 1);
    expect(geometry.primary).not.toBeNull();
    expect(geometry.primary!.height).toBeGreaterThanOrEqual(44);
    expect(geometry.primary!.top).toBeGreaterThanOrEqual(0);
    expect(geometry.primary!.bottom).toBeLessThanOrEqual(viewport.height);
  });
}

test("one primary action auto-stops after speech and shows a large battle report", async ({ page }) => {
  await installFakePcmCapture(page);
  const calls = await mockAssessment(page);
  await finishOnboarding(page);
  await followGuide(page);

  await page.locator(".pronunciation-quest-primary").click();
  await expect(page.getByTestId("acoustic-assessment-result")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("acoustic-assessment-result")).toContainText("76");
  await expect(page.getByTestId("acoustic-assessment-result")).toContainText("Chưa đủ mẫu");
  await expect(page.getByTestId("acoustic-assessment-result")).toContainText("3/3");
  await expect(page.getByTestId("acoustic-assessment-result")).toContainText("quá ngắn để cho điểm nhịp đáng tin");
  await expect(page.locator(".pronunciation-quest-primary")).toHaveText("Sang khẩu quyết tiếp theo");
  expect(calls()).toBe(1);

  const capture = await page.evaluate(() => (
    window as typeof window & { __hanziPcmCapture?: { starts: number; trackStops: number } }
  ).__hanziPcmCapture);
  expect(capture?.starts).toBe(1);
  expect(capture?.trackStops).toBeGreaterThanOrEqual(1);
});

test("provider delay fails visibly and the same sentence can be retried", async ({ page }) => {
  await installFakePcmCapture(page);
  await mockAssessment(page, 504);
  await finishOnboarding(page);
  await followGuide(page);

  await page.locator(".pronunciation-quest-primary").click();
  await expect(page.getByTestId("acoustic-assessment-error")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".pronunciation-quest-primary")).toHaveText("Thử đọc lại");
  await expect(page.getByRole("progressbar", { name: "Tiến độ phiên luyện đọc" }))
    .toHaveAttribute("aria-valuenow", "0");
});


test("Vạn Âm completion stays in the viewport and opens its own lesson library", async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 640 });
  await finishOnboarding(page);
  await completeCurrentMissionManually(page, 4);

  const completion = page.getByTestId("pronunciation-quest-complete");
  await expect(completion).toBeVisible();
  await expect(completion).toContainText("CỘNG HƯỞNG ỔN ĐỊNH");
  await expect(completion).toContainText("Cộng hưởng hoàn tất");
  await expect(completion).toContainText("+10 XP");
  await expect(completion.getByRole("link", { name: "Thiên Lộ", exact: true })).toHaveAttribute("href", "/path");
  await expect(completion.getByRole("button", { name: "Luyện lại bài này" })).toBeVisible();
  await completion.getByRole("button", { name: "Chọn bài luyện khác" }).click();
  await expect(page.getByTestId("pronunciation-lesson-library")).toBeVisible();
  await expect(completion.locator('a[href^="/lesson/"]')).toHaveCount(0);
  await expect(completion).not.toContainText("không phải mastery");

  const geometry = await page.evaluate(() => {
    const clear = document.querySelector(".resonance-clear-screen")?.getBoundingClientRect();
    const actions = document.querySelector(".resonance-clear-actions")?.getBoundingClientRect();
    return {
      clientHeight: document.documentElement.clientHeight,
      scrollHeight: document.documentElement.scrollHeight,
      clear: clear ? { top: clear.top, bottom: clear.bottom } : null,
      actions: actions ? { top: actions.top, bottom: actions.bottom } : null,
    };
  });
  expect(geometry.scrollHeight).toBeLessThanOrEqual(geometry.clientHeight + 1);
  expect(geometry.clear).not.toBeNull();
  expect(geometry.clear!.top).toBeGreaterThanOrEqual(0);
  expect(geometry.clear!.bottom).toBeLessThanOrEqual(640);
  expect(geometry.actions!.bottom).toBeLessThanOrEqual(640);
});

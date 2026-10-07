import { expect, test, type Page } from "@playwright/test";

test.setTimeout(120_000);

async function openLearner(page: Page) {
  await page.goto("/onboarding");
  await expect(page.getByTestId("onboarding-wizard")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("button", { name: "Bắt đầu Khảo Nghiệm Căn Cơ" }).click();
  await expect(page.locator(".app-frame")).toHaveAttribute("data-awakening-family", "trial");
}

test("each learner area awakens its own art and keeps navigation and mobile bounds", async ({ page }) => {
  await openLearner(page);
  const routes = [
    ["/", "awakening"], ["/path", "path"], ["/review", "memory"],
    ["/mistakes", "repair"], ["/pronunciation", "voice"], ["/characters", "forge"],
    ["/reader", "reader"], ["/dictionary", "lexicon"], ["/exams", "trial"],
    ["/analytics", "oracle"], ["/profile", "profile"], ["/profile/premium", "premium"],
  ] as const;
  const drawings: string[] = [];
  for (const [route, family] of routes) {
    await page.goto(route);
    await expect(page.locator(".app-frame")).toHaveAttribute("data-awakening-family", family, { timeout: 30_000 });
    await expect(page.locator(".ngoc-heading strong")).toBeVisible();
    await expect(page.locator(".awakening-vignette").first()).toBeVisible({ timeout: 10000 });
    console.log("Realm host audit", route, await page.locator(".awakening-vignette").evaluateAll(nodes => nodes.map(node => ({ host: node.parentElement?.className, width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height }))));
    await page.screenshot({ path: `tmp/realm-${family}-desktop.png` });
    drawings.push(await page.locator(".awakening-seal-halo path").first().getAttribute("d") ?? "");
    expect(await page.evaluate(() => document.querySelector("#main-content")?.contains(document.activeElement))).toBe(true);
  }
  expect(new Set(drawings).size).toBe(routes.length);
  await page.setViewportSize({ width: 360, height: 800 });
  for (const route of ["/review", "/reader", "/dictionary", "/profile"]) {
    await page.goto(route);
    await expect(page.locator(".awakening-vignette").first()).toBeVisible({ timeout: 15000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `tmp/realm-mobile-${route.slice(1)}.png` });
  }
  await page.goto("/exams");
  await expect(page.locator(".dungeon-enter")).toBeVisible({ timeout: 30_000 });
  const bounds = await page.locator(".dungeon-enter").boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(734);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "tmp/awakening-motion-mobile.png" });
});

test("OS reduced motion overrides a saved cinematic setting without changing learner data", async ({ page }) => {
  await openLearner(page);
  await page.evaluate(() => localStorage.setItem("hanzi-os-system-ui-v1", JSON.stringify({ version: 3, motionMode: "cinematic" })));
  await page.reload();
  await expect(page.locator(".app-frame")).toHaveAttribute("data-system-motion", "cinematic");
  const before = await page.evaluate(() => localStorage.getItem("hanzi-os-learning-state-v1"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".app-frame")).toHaveAttribute("data-system-motion", "reduced");
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter(animation => animation.playState === "running" && !(animation instanceof CSSAnimation) && !(animation instanceof CSSTransition)).length)).toBe(0);
  expect(await page.evaluate(() => localStorage.getItem("hanzi-os-learning-state-v1"))).toBe(before);
});

test("constrained hardware chooses light rendering and releases idle animations", async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 2 }); });
  await openLearner(page);
  await expect(page.locator(".app-frame")).toHaveAttribute("data-motion-quality", "light");
  await expect(page.locator(".app-frame")).toHaveAttribute("data-system-motion", "balanced");
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.goto("/path");
  await expect(page.locator(".app-frame")).toHaveAttribute("data-awakening-family", "path", { timeout: 30_000 });
  await expect(page.locator(".app-frame")).toHaveAttribute("data-motion-quality", "light");
  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll(".app-frame *")].filter(element => getComputedStyle(element).backdropFilter !== "none").length)).toBe(0);
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter(animation => animation.playState === "running" && !(animation instanceof CSSAnimation) && !(animation instanceof CSSTransition)).length)).toBe(0);
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter(animation => animation.playState === "running").length)).toBe(0);
  const geometry = await page.evaluate(async () => {
    await document.fonts.ready;
    const cards = [...document.querySelectorAll<HTMLElement>(".lesson-node.locked")];
    const page = document.querySelector(".path-page")!;
    const optimized = page.getBoundingClientRect().height;
    cards.forEach(card => { card.style.contentVisibility = "visible"; });
    const natural = page.getBoundingClientRect().height;
    cards.forEach(card => { card.style.contentVisibility = "auto"; });
    return { count: cards.length, heightDifference: Math.abs(optimized - natural) };
  });
  expect(geometry.count).toBeGreaterThan(200);
  expect(geometry.heightDifference).toBeLessThan(4);
  const pacing = await page.evaluate(async () => {
    const runningCss = document.getAnimations().filter(animation => animation.playState === "running").map(animation => ({ name: animation instanceof CSSAnimation ? animation.animationName : "transition", iterations: animation.effect?.getTiming().iterations }));
    const samples: number[] = [];
    await new Promise<void>(resolve => {
      let previous = 0;
      const frame = (time: number) => { if (previous) samples.push(time-previous); previous=time; if (samples.length < 90) requestAnimationFrame(frame); else resolve(); };
      requestAnimationFrame(frame);
    });
    samples.sort((a,b)=>a-b);
    return { medianMs: samples[45], p95Ms: samples[85], framesOver50Ms: samples.filter(value=>value>50).length, runningCss };
  });
  console.log("Light motion / CPU 4x frame pacing (idle path, not an all-device guarantee):", pacing);
  await page.getByRole("button", { name: "Phát lại hoạt cảnh thức tỉnh" }).press("Enter");
  const activePacing = await page.evaluate(async () => {
    const samples: number[] = [];
    let maxAnimations = 0;
    const stage = document.querySelector<HTMLElement>(".main-stage")!;
    const scroller = stage.scrollHeight > stage.clientHeight + 10 ? stage : window;
    const originalY = scroller === window ? scrollY : stage.scrollTop;
    await new Promise<void>(resolve => {
      let previous = 0;
      const frame = (time: number) => {
        if (previous) samples.push(time - previous);
        previous = time;
        maxAnimations = Math.max(maxAnimations, document.getAnimations().length);
        scroller.scrollBy(0, samples.length < 45 ? 6 : -6);
        if (samples.length < 90) requestAnimationFrame(frame); else resolve();
      };
      requestAnimationFrame(frame);
    });
    scroller.scrollTo(0, originalY);
    samples.sort((a,b)=>a-b);
    return { medianMs:samples[45], p95Ms:samples[85], framesOver50Ms:samples.filter(n=>n>50).length, maxAnimations };
  });
  console.log("Active ceremony + scroll / CPU 4x:", activePacing);
  await page.screenshot({ path: "tmp/awakening-motion-light-path.png" });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
});

test("visible ceremonies replay with bounded audio and stop when muted", async ({ page }) => {
  await page.addInitScript(() => {
    const stats = { starts: 0, disconnected: 0 };
    Object.assign(window, { realmAudioStats: stats });
    const create = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function () {
      const node = create.call(this);
      const start = node.start.bind(node);
      const disconnect = node.disconnect.bind(node);
      node.start = (when?: number) => { stats.starts++; start(when); };
      node.disconnect = () => { stats.disconnected++; disconnect(); };
      return node;
    };
  });
  await openLearner(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/path");
  const art = page.locator(".lesson-node.current .awakening-vignette");
  await expect(art).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => art.evaluate(el => el.getAnimations({ subtree: true }).filter(a => a.playState === "running").length), { timeout: 10000 }).toBe(0);
  const replay = page.getByRole("button", { name: "Phát lại hoạt cảnh thức tỉnh" });
  await replay.press("Enter");
  await expect.poll(() => art.evaluate(el => el.getAnimations({ subtree: true }).filter(a => a.playState === "running").length)).toBeGreaterThan(2);
  await expect.poll(() => page.evaluate(() => (window as unknown as { realmAudioStats: {starts:number} }).realmAudioStats.starts)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => {
    const stats = (window as unknown as {realmAudioStats:{starts:number;disconnected:number}}).realmAudioStats;
    return stats.starts - stats.disconnected;
  })).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "tmp/realm-ceremony-mobile.png" });
  await page.evaluate(() => {
    const key = "hanzi-os-system-ui-v1";
    localStorage.setItem(key, JSON.stringify({ ...JSON.parse(localStorage.getItem(key) ?? "{}"), soundEnabled: false }));
  });
  await page.reload();
  await expect(art).toBeVisible({ timeout: 30_000 });
  await replay.press("Enter");
  await page.waitForTimeout(2200);
  expect(await page.evaluate(() => (window as unknown as { realmAudioStats: {starts:number} }).realmAudioStats.starts)).toBe(0);
});


test("reader ceremonies follow library, series and chapter without covering its controls", async ({ page }) => {
  await openLearner(page);
  await page.goto("/reader");
  await page.getByRole("link", { name: "Mở mô tả Thư Các Thanh Đăng" }).click();
  await expect(page.locator(".reader-series-hero .awakening-vignette")).toBeVisible();
  await page.getByRole("link", { name: "Mở chương đầu" }).click();
  await expect(page.getByTestId("reader-chapter-shell")).toBeVisible();
  await expect(page.locator(".reader-chapter-header .awakening-vignette")).toBeVisible();
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(page.getByRole("button", { name: "Hỗ trợ đọc", exact: true })).toBeInViewport();
  await expect(page.getByRole("button", { name: "Thoát phiên đọc và trở về Thư Khố" })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("lesson entry has its own ceremony without mobile horizontal overflow", async ({ page }) => {
  await openLearner(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/path");
  await page.locator("a.lesson-node.current").click();
  await expect(page.locator(".app-frame")).toHaveAttribute("data-awakening-family", "lesson");
  await expect(page.locator(".awakening-vignette").first()).toBeVisible({ timeout: 30000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "tmp/realm-lesson-mobile.png" });
});

test("forge session and profile subviews retain local art and accessible controls", async ({ page }) => {
  await openLearner(page);
  await page.goto("/characters");
  await page.locator(".guild-primary").click();
  await expect(page.locator(".forge-session")).toBeVisible({ timeout: 30000 });
  await expect(page.locator(".forge-session .awakening-vignette")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".forge-advance")).toBeInViewport();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto("/profile");
  await expect(page.locator(".sys-category-list button")).toHaveCount(4);
  const count = await page.locator(".sys-category-list button").count();
  expect(count).toBe(4);
  for (let i = 0; i < count; i++) {
    await page.locator(".sys-category-list button").nth(i).click();
    await expect(page.locator(".profile-hero .awakening-vignette")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Tổng quan", exact: true }).click();
  }
});

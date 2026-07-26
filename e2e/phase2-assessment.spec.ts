import { expect, test } from "@playwright/test";
import {
  readIndexedDbStore,
  type OwnerScopedCacheRecord,
} from "./indexedDb";

type AssessmentResumeSnapshot = {
  version: number;
  index: number;
  checked: boolean;
};

const finishOnboarding = async (page: import("@playwright/test").Page) => {
  await page.goto("/");
  await expect(page.getByRole("heading", {
    name: /Đánh thức một ngôn ngữ mới/i,
  })).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục thiết lập" }).click();
  await page.getByRole("button", { name: "Tiếp tục thiết lập" }).click();
  await page.getByRole("button", { name: "Kích hoạt HANZI.OS" }).click();
  await expect(page.getByRole("heading", {
    name: /Đánh thức tiếng Trung trong bạn/i,
  })).toBeVisible();
};

const assessmentResume = async (
  page: import("@playwright/test").Page,
) => {
  const records = await readIndexedDbStore<
    OwnerScopedCacheRecord<AssessmentResumeSnapshot>
  >(page, "assessment-resumes");
  return records.find((record) =>
    record.entryKey.startsWith("assessment:v4:")
  )?.value ?? null;
};

test("resumes anonymous screening without turning it into mastery or an unlock", async ({
  page,
}) => {
  await finishOnboarding(page);
  const completedBefore = await page.evaluate(() => {
    const state = JSON.parse(
      localStorage.getItem("hanzi-os-learning-state-v1") ?? "{}",
    );
    return state.completedLessons ?? {};
  });

  await page.goto("/assessment");
  await page.getByRole("button", {
    name: /Bắt đầu khảo nghiệm/u,
  }).click();
  await page.getByRole("radiogroup", {
    name: "Các lựa chọn cho câu 1",
  }).getByRole("radio").first().click();
  await page.getByRole("button", { name: "Xác nhận" }).click();
  await expect(page.getByRole("button", {
    name: "Câu tiếp theo",
  })).toBeVisible();

  await expect.poll(() => assessmentResume(page)).toMatchObject({
    version: 4,
    index: 0,
    checked: true,
  });

  await page.reload();
  await expect(page.getByText("1/10", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", {
    name: "Câu tiếp theo",
  })).toBeVisible();
  await page.getByRole("button", { name: "Câu tiếp theo" }).click();

  for (let question = 2; question <= 10; question += 1) {
    await page.getByRole("radiogroup", {
      name: `Các lựa chọn cho câu ${question}`,
    }).getByRole("radio").first().click();
    await page.getByRole("button", { name: "Xác nhận" }).click();
    const continuation = question === 10 ? "Hoàn tất" : "Câu tiếp theo";
    await expect(page.getByRole("button", {
      name: continuation,
    })).toBeVisible();
    await page.getByRole("button", { name: continuation }).click();
  }

  await expect(page.getByText(
    "LOCAL SCREENING COMPLETE · CALIBRATION PENDING",
    { exact: true },
  )).toBeVisible();
  await expect(page.getByRole("link", {
    name: /Tiếp tục từ nút đang mở/u,
  })).toHaveAttribute("href", "/lesson/boot-1");

  await expect.poll(() => page.evaluate(() => {
    const state = JSON.parse(
      localStorage.getItem("hanzi-os-learning-state-v1") ?? "{}",
    );
    const diagnosticEvidence = (state.evidence ?? []).filter(
      (item: { source?: unknown }) => item.source === "diagnostic",
    );
    return {
      completedLessons: state.completedLessons ?? {},
      diagnosticCompleted: state.diagnostic?.completed,
      evidenceCount: diagnosticEvidence.length,
      masteryEligible: diagnosticEvidence.map(
        (item: { masteryEligible?: unknown }) => item.masteryEligible,
      ),
    };
  })).toEqual({
    completedLessons: completedBefore,
    diagnosticCompleted: true,
    evidenceCount: 10,
    masteryEligible: Array.from({ length: 10 }, () => false),
  });
  await expect.poll(() => assessmentResume(page)).toBeNull();
});

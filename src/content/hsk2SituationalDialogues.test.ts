import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk2SituationalDialogues,
  serializeHsk2SituationalDialogues,
} from "../../scripts/content/build-hsk2-situational-dialogues.mjs";
import {
  assertValidHsk2SituationalDialoguesBundle,
  HSK2_SITUATIONAL_DIALOGUES_RELATIVE_PATH,
  loadHsk2SituationalDialoguesBundle,
  validateHsk2SituationalDialoguesBundle,
} from "./hsk2SituationalDialogues.mjs";

describe("HSK2 situational-dialogue pack", () => {
  it("authors all task/topic prompts and six-turn lesson dialogues", () => {
    const bundle = loadHsk2SituationalDialoguesBundle();
    const result = assertValidHsk2SituationalDialoguesBundle(bundle);

    expect(result.summary).toEqual({
      situationalLessons: 20,
      officialTaskDrafts: 17,
      officialTopicDrafts: 34,
      modelDialogueTurns: 120,
      guidedRoleplayItems: 20,
      audioDependentDialogues: 20,
      reviewedAudioDialogues: 0,
      reviewBatches: 20,
      approvals: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      releaseEligibleItems: 0,
    });
  });

  it("keeps corrected task/topic semantics in the primary lesson mapping", () => {
    const { pack } = loadHsk2SituationalDialoguesBundle();
    const objects = pack.lessonDialogues.find(
      (dialogue: { lessonId: string }) =>
        dialogue.lessonId === "hsk2-person-events-environment-lesson-03",
    );
    const address = pack.lessonDialogues.find(
      (dialogue: { lessonId: string }) =>
        dialogue.lessonId === "hsk2-study-work-culture-lesson-05",
    );

    expect(objects).toMatchObject({
      titleVi: "Đồ vật, màu sắc và so sánh",
      officialTaskIds: ["hsk2-task-03"],
      officialTopicIds: ["hsk2-topic-004"],
    });
    expect(address).toMatchObject({
      titleVi: "Họ tên và cách xưng hô trang trọng",
      officialTaskIds: ["hsk2-task-17"],
      officialTopicIds: ["hsk2-topic-034"],
    });
  });

  it("fails closed on missing turns, foreign vocabulary or mastery", () => {
    const bundle = loadHsk2SituationalDialoguesBundle();
    const pack = structuredClone(bundle.pack);
    pack.lessonDialogues[0].modelDialogue.turns.pop();
    pack.lessonDialogues[1].usedVocabularyIds[0] =
      "hsk-vocab-00468";
    pack.practiceItems[2].masteryEligible = true;

    const result = validateHsk2SituationalDialoguesBundle({
      ...bundle,
      pack,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "hsk2-person-events-environment-lesson-01 model dialogue is invalid",
      "hsk2-person-events-environment-lesson-02 vocabulary use hsk-vocab-00468 is invalid",
      `${pack.practiceItems[2].itemId} guided roleplay is invalid`,
      "HSK2 situational-dialogue counts are stale",
    ]));
  });

  it("keeps the generated situational artifact deterministic", () => {
    const checked = readFileSync(
      join(process.cwd(), HSK2_SITUATIONAL_DIALOGUES_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk2SituationalDialogues(buildHsk2SituationalDialogues()),
    );
  });
});

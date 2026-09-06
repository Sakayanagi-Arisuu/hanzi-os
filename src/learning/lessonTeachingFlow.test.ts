import { describe, expect, it } from "vitest";
import { RELEASED_LESSONS } from "../data/curriculum";
import { getLessonGuide } from "../data/lessonGuides";
import { getLessonTeachingGuide } from "./lessonPedagogy";
import { getRichLessonContent, RELEASED_RICH_LESSONS } from "./richLessonContent";
import {
  buildLessonTeachingFlow,
  learnerFacingCopy,
  learnerGrammarLabel,
} from "./lessonTeachingFlow";

describe("lesson teaching flow", () => {
  it("builds a lesson-specific learning contract for the full 217 lesson inventory", () => {
    expect(RELEASED_LESSONS).toHaveLength(217);

    const flows = RELEASED_LESSONS.map((lesson) => buildLessonTeachingFlow({
      lessonId: lesson.id,
      objective: lesson.objective,
      guide: getLessonTeachingGuide(lesson.id, getLessonGuide(lesson.id)),
      richContent: getRichLessonContent(lesson.id),
    }));

    for (const flow of flows) {
      expect(flow.goal.length).toBeGreaterThan(18);
      expect(flow.concept).not.toBe("Dùng từ mới trong một hành động giao tiếp hoàn chỉnh.");
      expect(flow.explanation.length).toBeGreaterThan(20);
      expect(flow.examples.length).toBeGreaterThan(0);
      expect(flow.successCheck.length).toBeGreaterThan(18);
      expect(flow.contextMethod).toHaveLength(3);
      expect(`${flow.goal} ${flow.explanation} ${flow.successCheck}`).not.toMatch(
        /mastery|review|rubric|calibration|\bform\b/iu,
      );
    }
  });

  it("keeps every rich lesson source available to the teaching canvas", () => {
    expect(RELEASED_RICH_LESSONS).toHaveLength(213);

    for (const lesson of RELEASED_RICH_LESSONS) {
      expect(lesson.dialogue.length).toBeGreaterThan(0);
      expect(lesson.grammar.length).toBeGreaterThan(0);
      expect(lesson.tasks.length).toBeGreaterThan(0);
      const sourceLesson = RELEASED_LESSONS.find((item) => item.id === lesson.lessonId);
      expect(sourceLesson).toBeDefined();
      const flow = buildLessonTeachingFlow({
        lessonId: lesson.lessonId,
        objective: sourceLesson!.objective,
        guide: getLessonTeachingGuide(lesson.lessonId, getLessonGuide(lesson.lessonId)),
        richContent: lesson,
      });
      expect(flow.successCheck).toBe(learnerFacingCopy(lesson.tasks[0]!.instructionVi));
    }
  });

  it("does not reuse a legacy guide after the rich lesson order changed", () => {
    const lesson = RELEASED_LESSONS.find((item) => item.id === "survival-1");
    const richContent = getRichLessonContent("survival-1");
    expect(lesson).toBeDefined();
    expect(richContent).not.toBeNull();

    const flow = buildLessonTeachingFlow({
      lessonId: lesson!.id,
      objective: lesson!.objective,
      guide: getLessonGuide(lesson!.id),
      richContent,
    });

    expect(flow.goal).toContain("lượt thoại");
    expect(flow.explanation).toContain("吧、了、吗、呢");
    expect(flow.explanation).not.toContain("A + 是 + B");
  });

  it("still lets an explicitly published guide override local-study scaffolding", () => {
    const lesson = RELEASED_LESSONS.find((item) => item.id === "survival-1")!;
    const guide = {
      ...getLessonGuide(lesson.id),
      concept: "Hướng dẫn đã được biên tập đúng cho bài này.",
    };
    const flow = buildLessonTeachingFlow({
      lessonId: lesson.id,
      objective: lesson.objective,
      guide,
      richContent: getRichLessonContent(lesson.id),
      preferGuide: true,
    });
    expect(flow.concept).toBe(guide.concept);
  });

  it("removes editorial and English research jargon from learner-facing rich copy", () => {
    for (const lesson of RELEASED_RICH_LESSONS) {
      const copies = [
        ...lesson.dialogue.map((turn) => turn.meaningVi),
        ...lesson.grammar.flatMap((point) => [
          learnerGrammarLabel(point),
          point.explanationVi,
          point.modelExample.meaningVi,
          point.guidedPractice.promptVi,
          point.guidedPractice.modelAnswerMeaningVi,
        ]),
        ...lesson.tasks.flatMap((task) => [
          task.titleVi,
          task.instructionVi,
          ...task.modelDialogue.map((turn) => turn.meaningVi),
        ]),
      ].map(learnerFacingCopy).join(" ");

      expect(copies).not.toMatch(
        /mastery|reviewer|human review|rubric|calibration|selection bias|confound|\bclaim\b|\bparaphrase\b|\baspect\b|\bself-check\b|\bsource\b|\bproduction\b|\bform\b/iu,
      );
    }
  });

  it("changes the reading method as lesson depth increases", () => {
    const lesson = RELEASED_LESSONS.find((item) => item.id.startsWith("hsk4-"));
    expect(lesson).toBeDefined();
    const flow = buildLessonTeachingFlow({
      lessonId: lesson!.id,
      objective: lesson!.objective,
      guide: getLessonGuide(lesson!.id),
      richContent: getRichLessonContent(lesson!.id),
    });
    expect(flow.level).toBe("hsk4");
    expect(flow.contextLabel).toContain("BẰNG CHỨNG");
    expect(flow.pitfall).toContain("bằng chứng");
  });
});

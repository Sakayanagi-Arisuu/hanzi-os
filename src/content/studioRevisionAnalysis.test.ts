import { describe, expect, it } from "vitest";
import { analyzeStudioRevision, studioReferenceCandidates } from "./studioRevisionAnalysis";

describe("Studio revision analysis", () => {
  it("turns structured changes and module links into a non-technical review summary", () => {
    const analysis = analyzeStudioRevision({
      itemType: "lesson",
      baseline: {
        title: "Chào hỏi",
        level: "hsk1",
        content: { objectiveVi: "Biết chào hỏi.", vocabulary: ["word-1"], skills: ["listening"] },
      },
      current: {
        title: "Chào hỏi và giới thiệu",
        level: "hsk1",
        content: {
          objectiveVi: "Chào hỏi và tự giới thiệu trong hội thoại ngắn.",
          vocabulary: ["word-1", "word-2"],
          prerequisites: ["lesson-boot-1"],
          skills: ["listening", "speaking"],
        },
      },
    });

    expect(analysis.affectedModules).toEqual(expect.arrayContaining(["Học", "Ôn", "Nói", "Luyện"]));
    expect(analysis.changes).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Tên nội dung", kind: "changed" }),
      expect.objectContaining({ label: "Mục tiêu bài học", kind: "changed" }),
    ]));
    expect(analysis.outboundLinks).toEqual(expect.arrayContaining([
      { kind: "lesson", value: "lesson-boot-1" },
      { kind: "vocabulary", value: "word-2" },
      { kind: "skill", value: "speaking" },
    ]));
  });

  it("extracts only stable candidate identifiers used for inbound impact checks", () => {
    expect(studioReferenceCandidates("hsk1.lesson.greeting", {
      lessonId: "lesson-01",
      title: "Không dùng tiêu đề làm khóa",
    })).toEqual(["hsk1.lesson.greeting", "lesson-01"]);
  });
});

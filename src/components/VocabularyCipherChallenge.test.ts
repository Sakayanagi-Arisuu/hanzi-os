import { describe, expect, it } from "vitest";
import { buildVocabularyChallengeQuestion, type VocabularyChallengeWord } from "./VocabularyCipherChallenge";

const words: VocabularyChallengeWord[] = [
  ["one", "老师", "老師", "lǎoshī", "giáo viên"],
  ["two", "学生", "學生", "xuésheng", "học sinh"],
  ["three", "学校", "學校", "xuéxiào", "trường học"],
  ["four", "教室", "教室", "jiàoshì", "phòng học"],
  ["five", "学习", "學習", "xuéxí", "học tập"],
].map(([id, simplified, traditional, pinyin, meaning]) => ({ id, simplified, traditional, pinyin, meaning, partOfSpeech: "danh từ" }));

describe("vocabulary cipher challenge", () => {
  it("builds four unique options with one exact answer", () => {
    const question = buildVocabularyChallengeQuestion(words, 0, "simplified")!;
    expect(new Set(question.options).size).toBe(4);
    expect(question.options.filter((option) => option === question.answer)).toHaveLength(1);
  });

  it("uses traditional forms for reverse-script rounds", () => {
    const question = buildVocabularyChallengeQuestion(words, 1, "traditional")!;
    expect(question.kind).toBe("reverse");
    expect(question.options).toContain(question.word.traditional);
  });
});

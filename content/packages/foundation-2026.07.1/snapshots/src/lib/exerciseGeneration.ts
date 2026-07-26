import {
  CONTENT_VERSION,
  RELEASED_VOCABULARY,
  WORD_BY_ID,
} from "../data/curriculum";
import type { ExerciseKind, Lesson, Skill, VocabularyItem } from "../types";
import { applyToneSandhi, formatMarkedPinyin, parseNumberedPinyin } from "./pinyin";

export type Exercise = {
  id: string;
  activityVersion: string;
  wordId?: string;
  kind: ExerciseKind;
  skill: Skill;
  instruction: string;
  prompt: string;
  promptMeta?: string;
  options: string[];
  correct: string;
  explanation: string;
  spokenText?: string;
  requiredForPass?: boolean;
};

export type RandomSource = () => number;

export const toneLabels = [
  "Thanh nhẹ · ngắn và phụ thuộc âm đứng trước",
  "Thanh 1 · cao và ngang",
  "Thanh 2 · đi lên",
  "Thanh 3 · hạ thấp; có thể nhấc lên ở cuối cụm",
  "Thanh 4 · rơi nhanh và dứt",
] as const;

export const shuffleWith = <T,>(items: readonly T[], random: RandomSource) => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
};

const makeOptions = (
  correct: string,
  candidates: readonly string[],
  random: RandomSource,
  count = 4,
) => {
  const distractors = shuffleWith(candidates.filter((item) => item !== correct), random)
    .filter((item, index, values) => values.indexOf(item) === index)
    .slice(0, count - 1);
  return shuffleWith([correct, ...distractors], random);
};

const displayCharacter = (word: VocabularyItem, script: "simplified" | "traditional") =>
  script === "traditional" ? word.traditional : word.simplified;

const toneSequence = (word: VocabularyItem) => word.syllables
  .map((syllable) => syllable.lexicalTone || "nhẹ")
  .join(" + ");

const tonePairExercise = (
  id: string,
  prompt: string,
  numbered: string,
  correct: string,
  explanation: string,
  spokenText: string,
  random: RandomSource,
): Exercise => {
  const lexical = parseNumberedPinyin(numbered);
  const surface = applyToneSandhi(lexical);
  return {
    id,
    activityVersion: `${CONTENT_VERSION}:tone-sandhi:1`,
    kind: "tone-pair",
    skill: "pronunciation",
    instruction: "Phân biệt thanh từ điển và cách đọc trong cụm",
    prompt,
    promptMeta: `Thanh từ điển ${lexical.map((item) => item.lexicalTone || "nhẹ").join(" + ")}`,
    options: makeOptions(correct, ["1 + 4", "2 + 3", "2 + 4", "3 + 3", "4 + 3", "4 + 4"], random),
    correct,
    explanation: `${explanation} Dạng từ điển vẫn giữ ${formatMarkedPinyin(lexical, " ")}; trong cụm đọc gần ${formatMarkedPinyin(surface, " ")}.`,
    spokenText,
  };
};

const buildTonePairExercises = (random: RandomSource): Exercise[] => [
  tonePairExercise(
    "sandhi-ni3-hao3",
    "nǐ hǎo → ?",
    "ni3hao3",
    "2 + 3",
    "Khi hai thanh 3 đứng liền nhau trong cùng cụm, âm đầu chuyển thành thanh 2 ở bề mặt.",
    "你好",
    random,
  ),
  tonePairExercise(
    "sandhi-bu4-shi4",
    "bù shì → ?",
    "bu4shi4",
    "2 + 4",
    "不 có thanh từ điển 4 nhưng đọc bú trước một âm tiết thanh 4.",
    "不是",
    random,
  ),
  tonePairExercise(
    "sandhi-yi1-ben3",
    "yī + thanh 3 → ?",
    "yi1ben3",
    "4 + 3",
    "一 đổi thành thanh 4 trước thanh 1, 2 hoặc 3 khi mang nghĩa số đếm trong cụm.",
    "一本",
    random,
  ),
];

export function buildExercises(
  lesson: Lesson,
  script: "simplified" | "traditional",
  random: RandomSource = Math.random,
) {
  const words = lesson.wordIds
    .map((id) => WORD_BY_ID.get(id))
    .filter((word): word is VocabularyItem => Boolean(word));
  const allMeanings = RELEASED_VOCABULARY.map((word) => word.meaning);
  const allPinyin = RELEASED_VOCABULARY.map((word) => word.pinyin);
  const activityVersion = `${lesson.contentVersion}:${lesson.id}:1`;
  const exercises: Exercise[] = [];

  words.forEach((word) => {
    const character = displayCharacter(word, script);
    exercises.push({
      id: `${word.id}-meaning`,
      activityVersion,
      wordId: word.id,
      kind: "meaning",
      skill: "vocabulary",
      instruction: "Giải mã ý nghĩa",
      prompt: character,
      promptMeta: word.partOfSpeech,
      options: makeOptions(word.meaning, allMeanings, random),
      correct: word.meaning,
      explanation: `${character} đọc là ${word.pinyin}, là ${word.partOfSpeech} mang nghĩa “${word.meaning}”. Trong câu “${word.example}”, từ này được dùng với nghĩa “${word.exampleMeaning.toLowerCase()}”.`,
    });
    exercises.push({
      id: `${word.id}-pinyin`,
      activityVersion,
      wordId: word.id,
      kind: "pinyin",
      skill: "pronunciation",
      instruction: "Chọn cách đọc từ điển chính xác",
      prompt: character,
      promptMeta: word.meaning,
      options: makeOptions(word.pinyin, allPinyin, random),
      correct: word.pinyin,
      explanation: `${character} được ghi là ${word.pinyin}, gồm ${word.syllables.length} âm tiết với chuỗi thanh từ điển ${toneSequence(word)}. Dấu thanh thuộc từng âm tiết, không đại diện cho cả từ.`,
      spokenText: character,
    });
  });

  const toneExercises = words.flatMap((word) => {
    const character = displayCharacter(word, script);
    return word.syllables.map((syllable) => ({
      id: `${word.id}-tone-${syllable.index}`,
      activityVersion,
      wordId: word.id,
      kind: "tone" as const,
      skill: "pronunciation" as const,
      instruction: "Nhận diện thanh của từng âm tiết",
      prompt: syllable.marked,
      promptMeta: `${character} · âm tiết ${syllable.index + 1}/${word.syllables.length}`,
      options: [...toneLabels],
      correct: toneLabels[syllable.lexicalTone],
      explanation: `Âm tiết ${syllable.marked} trong ${word.pinyin} mang ${toneLabels[syllable.lexicalTone].toLocaleLowerCase("vi")}. Đây là thanh từ điển; cách đọc bề mặt có thể đổi trong ngữ cảnh biến điệu.`,
      spokenText: character,
    }));
  });
  exercises.push(...toneExercises);

  words.slice(0, 2).forEach((word) => {
    const character = displayCharacter(word, script);
    exercises.push({
      id: `${word.id}-listening`,
      activityVersion,
      wordId: word.id,
      kind: "listening",
      skill: "listening",
      instruction: "Nghe và chọn nghĩa",
      prompt: "Tín hiệu âm thanh đã sẵn sàng",
      promptMeta: "Bạn có thể nghe lại trước khi trả lời",
      options: makeOptions(word.meaning, allMeanings, random),
      correct: word.meaning,
      explanation: `Bạn vừa nghe “${character}” (${word.pinyin}), nghĩa là “${word.meaning}”. Ví dụ: ${word.example} — ${word.exampleMeaning}.`,
      spokenText: character,
    });
    exercises.push({
      id: `${word.id}-recall`,
      activityVersion,
      wordId: word.id,
      kind: "recall",
      skill: "writing",
      instruction: "Tự gọi lại Hán tự",
      prompt: word.meaning,
      promptMeta: "Nhập chữ Hán tương ứng, không xem lại danh sách từ",
      options: [],
      correct: character,
      explanation: `Đáp án là ${character} (${word.pinyin}). Hãy dựng lại chữ từ âm, nghĩa và các thành phần thay vì ghi nhớ như một hình ảnh liền khối.`,
      spokenText: character,
    });
    exercises.push({
      id: `${word.id}-sentence`,
      activityVersion,
      wordId: word.id,
      kind: "sentence",
      skill: lesson.skills.includes("grammar") ? "grammar" : "reading",
      instruction: "Đọc trong ngữ cảnh",
      prompt: word.example,
      promptMeta: word.examplePinyin,
      options: makeOptions(
        word.exampleMeaning,
        RELEASED_VOCABULARY.map((item) => item.exampleMeaning),
        random,
      ),
      correct: word.exampleMeaning,
      explanation: `Câu “${word.example}” đọc là “${word.examplePinyin}” và có nghĩa “${word.exampleMeaning}”. Từ trọng tâm ${character} giữ vai trò ${word.partOfSpeech}.`,
      spokenText: word.example,
    });
  });

  const required = lesson.id === "boot-1"
    ? toneExercises.map((exercise) => ({ ...exercise, requiredForPass: true }))
    : lesson.id === "boot-4"
      ? buildTonePairExercises(random).map((exercise) => ({
          ...exercise,
          requiredForPass: true,
        }))
      : [];
  const requiredIds = new Set(required.map((exercise) => exercise.id));
  const remaining = shuffleWith(exercises.filter((exercise) => !requiredIds.has(exercise.id)), random);
  return shuffleWith([...required, ...remaining].slice(0, 10), random);
}

export const normalizeAnswer = (value: string) =>
  value.trim().toLocaleLowerCase("vi").replace(/[\s.,!?;:'"“”‘’]/gu, "");

export const answersMatch = (answer: string | null, correct: string) =>
  Boolean(answer && normalizeAnswer(answer) === normalizeAnswer(correct));

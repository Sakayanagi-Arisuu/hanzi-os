import type { LessonGuide } from "../data/lessonGuides";

const BOOT_ONE_TEACHING_GUIDE: LessonGuide = {
  concept: "Cùng một âm “ma”, đổi đường đi của giọng là đổi sang một từ khác.",
  rule: "Thanh điệu là cao độ gắn vào từng âm tiết, giống như nguyên âm hay phụ âm: mā, má, mǎ và mà không phải bốn cách nhấn cảm xúc của cùng một từ. Hãy nghe hướng đi tương đối của giọng—ngang, lên, thấp, rơi—thay vì cố hát đúng một nốt tuyệt đối.",
  examples: [
    { chinese: "妈 · 麻 · 马 · 骂", pinyin: "mā · má · mǎ · mà", meaning: "mẹ · cây gai · ngựa · mắng: âm đầu và vần giống nhau, nghĩa đổi vì thanh" },
    { chinese: "一 · 二 · 三 · 四", pinyin: "yī · èr · sān · sì", meaning: "một · hai · ba · bốn: nghe hướng giọng trước, nhận chữ sau" },
  ],
  pitfall: "Đừng lấy độ cao giọng của người khác làm chuẩn và đừng biến thanh 2 thành dấu hỏi tiếng Việt. Chỉ so đường đi trong quãng giọng thoải mái của chính bạn. Thanh 3 trong lời nói thường chỉ giữ phần thấp; bài này dùng dạng đầy đủ để nhận diện.",
  checkpoint: "Không nhìn dấu, bạn mô tả được bốn hướng giọng và phân biệt thanh 2 đi lên với thanh 4 rơi xuống.",
};

/** Adds runtime teaching depth without mutating the signed source package. */
export const getLessonTeachingGuide = (
  lessonId: string,
  sourceGuide: LessonGuide,
): LessonGuide => lessonId === "boot-1" ? BOOT_ONE_TEACHING_GUIDE : sourceGuide;

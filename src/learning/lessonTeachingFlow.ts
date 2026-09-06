import type { LessonGuide } from "../data/lessonGuides";
import { getHskLessonPathId, type HskCurriculumPathId } from "../data/hskCurriculumGraph";
import type {
  RichDialogueTurn,
  RichGrammarPoint,
  RichLessonContent,
} from "./richLessonContent";

const GENERIC_GUIDE_CONCEPT = "Dùng từ mới trong một hành động giao tiếp hoàn chỉnh.";

export const learnerFacingCopy = (value: string) => value
  .replace(/[;,]?\s*(?:và\s+)?chưa chấm mastery trước review\./giu, ".")
  .replace(/;\s*hoạt động tự kiểm không cấp mastery\./giu, ".")
  .replace(/;\s*hoạt động này không tự cấp mastery viết\./giu, ".")
  .replace(/;\s*chưa cấp mastery trước review\./giu, ".")
  .replace(/\s*mà không suy diễn mastery viết\./giu, ".")
  .replace(/;\s*nhận diện chữ không được suy thành năng lực viết\./giu, ".")
  .replace(/\s+trước khi nộp(?: cho)? reviewer/giu, " trước khi hoàn tất")
  .replace(/theo rubric HSK3 dự kiến/giu, "theo khung HSK3")
  .replace(/;\s*rubric chưa có hiệu lực trước human review\./giu, ".")
  .replace(/;\s*rubric vẫn chờ human review\./giu, ".")
  .replace(/;\s*thời gian, form và rubric chỉ có hiệu lực sau review và calibration\./giu, ".")
  .replace(/\bselection bias\b/giu, "thiên lệch chọn mẫu")
  .replace(/\bconfound\b/giu, "yếu tố gây nhiễu")
  .replace(/\bexposure\b/giu, "mức tiếp xúc")
  .replace(/\bclaim\b/giu, "kết luận")
  .replace(/\bparaphrase\b/giu, "diễn đạt lại")
  .replace(/\baspect\b/giu, "thể ngữ pháp")
  .replace(/\bself-check\b/giu, "tự kiểm")
  .replace(/\bnote\b/giu, "ghi chú")
  .replace(/\bsource\b/giu, "nguồn")
  .replace(/\bproduction\b/giu, "tạo đầu ra")
  .replace(/\bform\b/giu, "cấu trúc bài")
  .trim();

export const learnerGrammarLabel = (point: RichGrammarPoint) => {
  if (/[A-Za-zÀ-ỹ]/u.test(point.label)) return point.label;
  const firstExplanation = learnerFacingCopy(point.explanationVi)
    .split(/[.;]/u)[0]
    ?.trim() ?? "";
  if (firstExplanation.length <= 84) return firstExplanation;
  return `${firstExplanation.slice(0, 81).replace(/\s+\S*$/u, "")}…`;
};

type LearningLens = {
  contextLabel: string;
  contextTitle: string;
  contextMethod: readonly string[];
  grammarTitle: string;
  transferTitle: string;
  defaultPitfall: string;
};

const LENS_BY_LEVEL: Record<HskCurriculumPathId, LearningLens> = {
  hsk0: {
    contextLabel: "NGHE · NHÌN · BẮT CHƯỚC",
    contextTitle: "Nhận ra âm và dùng được trong một lượt nói rất ngắn",
    contextMethod: [
      "Nghe hướng âm hoặc nhịp câu trước khi nhìn Pinyin.",
      "Nói chậm theo mẫu, rồi lặp lại mà không nhìn.",
      "Đổi một từ hoặc một vai để chắc rằng bạn hiểu.",
    ],
    grammarTitle: "Điều cần nhớ để không bắt chước máy móc",
    transferTitle: "Tự nói một lượt mới",
    defaultPitfall: "Đừng chỉ đọc theo mặt chữ. Hãy nghe, che mẫu và tự gọi lại ít nhất một lần.",
  },
  hsk1: {
    contextLabel: "NGHE · HIỂU · ĐỔI VAI",
    contextTitle: "Theo dõi một tình huống giao tiếp hoàn chỉnh",
    contextMethod: [
      "Xác định ai đang nói và họ muốn làm gì.",
      "Nghe từng lượt, đối chiếu Hanzi–Pinyin–nghĩa Việt.",
      "Đổi vai và thay một chi tiết bằng thông tin của bạn.",
    ],
    grammarTitle: "Rút mẫu câu từ tình huống",
    transferTitle: "Dùng mẫu câu với thông tin của bạn",
    defaultPitfall: "Đừng học từ rời rồi đoán cả câu. Hãy giữ đúng trật tự mẫu và thay một chi tiết có chủ đích.",
  },
  hsk2: {
    contextLabel: "THEO MẠCH · HỎI TIẾP · NỐI CÂU",
    contextTitle: "Nhìn thấy quan hệ giữa các lượt và các câu",
    contextMethod: [
      "Tìm câu mở bối cảnh và thông tin mà câu sau bám vào.",
      "Đánh dấu từ nối, thời gian, nơi chốn hoặc đối tượng được nhắc lại.",
      "Kể lại bằng 2–3 câu có liên kết thay vì các câu rời.",
    ],
    grammarTitle: "Rút cấu trúc để nối ý chính xác",
    transferTitle: "Tạo một chuỗi câu mới",
    defaultPitfall: "Đừng chỉ tạo từng câu đúng riêng lẻ. Câu sau phải trả lời, bổ sung hoặc làm rõ câu trước.",
  },
  hsk3: {
    contextLabel: "Ý CHÍNH · CHI TIẾT · KỂ LẠI",
    contextTitle: "Đọc trọn đoạn và dựng lại mạch thông tin",
    contextMethod: [
      "Đọc một lượt để chốt ý chính, chưa dừng ở từng từ mới.",
      "Gắn mỗi chi tiết với người, thời điểm hoặc nguyên nhân tương ứng.",
      "Dùng ghi chú ngắn để kể lại theo thứ tự của riêng bạn.",
    ],
    grammarTitle: "Dùng cấu trúc để tổ chức đoạn",
    transferTitle: "Tóm lược hoặc viết lại có khung",
    defaultPitfall: "Đừng dịch nối từng câu rồi mất mạch đoạn. Luôn chốt ý chính và quan hệ giữa các chi tiết trước.",
  },
  hsk4: {
    contextLabel: "NGUỒN · BẰNG CHỨNG · GIỚI HẠN",
    contextTitle: "Đọc nhiều lớp thông tin trước khi kết luận",
    contextMethod: [
      "Tách dữ kiện trong nguồn khỏi diễn giải của người viết hoặc người nói.",
      "Gắn mỗi kết luận với dòng bằng chứng cụ thể.",
      "Nêu điều nguồn chưa đủ để khẳng định trước khi tóm tắt hoặc phản biện.",
    ],
    grammarTitle: "Dùng cấu trúc để diễn đạt chính xác",
    transferTitle: "Lập luận bằng dẫn chứng và giới hạn",
    defaultPitfall: "Đừng biến suy luận hợp lý thành sự thật chắc chắn. Kết luận phải có bằng chứng và nêu đúng giới hạn của nguồn.",
  },
};

export type LessonTeachingFlow = {
  level: HskCurriculumPathId;
  goal: string;
  concept: string;
  explanation: string;
  examples: Array<Omit<RichDialogueTurn, "speaker">>;
  pitfall: string;
  successCheck: string;
  contextLabel: string;
  contextTitle: string;
  contextMethod: readonly string[];
  grammarTitle: string;
  transferTitle: string;
};

export const buildLessonTeachingFlow = ({
  lessonId,
  objective,
  guide,
  richContent,
  preferGuide = false,
}: {
  lessonId: string;
  objective: string;
  guide: LessonGuide;
  richContent: RichLessonContent | null;
  preferGuide?: boolean;
}): LessonTeachingFlow => {
  const level = getHskLessonPathId(lessonId) ?? "hsk0";
  const lens = LENS_BY_LEVEL[level];
  const hasSpecificGuide = guide.concept !== GENERIC_GUIDE_CONCEPT;
  const firstGrammar = richContent?.grammar[0];
  const firstTask = richContent?.tasks[0];
  const useGuide = hasSpecificGuide && (!richContent || preferGuide);
  const richExamples = richContent?.dialogue.slice(0, 2).map((turn) => ({
    hanzi: turn.hanzi,
    pinyin: turn.pinyin,
    meaningVi: learnerFacingCopy(turn.meaningVi),
  })) ?? [];

  return {
    level,
    goal: learnerFacingCopy(objective),
    concept: useGuide
      ? guide.concept
      : firstGrammar ? learnerGrammarLabel(firstGrammar) : learnerFacingCopy(objective),
    explanation: useGuide
      ? guide.rule
      : learnerFacingCopy(firstGrammar?.explanationVi ?? guide.rule),
    examples: useGuide
      ? guide.examples.map((example) => ({
          hanzi: example.chinese,
          pinyin: example.pinyin,
          meaningVi: example.meaning,
        }))
      : richExamples,
    pitfall: useGuide ? guide.pitfall : lens.defaultPitfall,
    successCheck: learnerFacingCopy(firstTask?.instructionVi ?? guide.checkpoint),
    contextLabel: lens.contextLabel,
    contextTitle: lens.contextTitle,
    contextMethod: lens.contextMethod,
    grammarTitle: lens.grammarTitle,
    transferTitle: lens.transferTitle,
  };
};

import type { Exercise } from "../lib/exerciseGeneration";

// Local-study, AI-assisted support; humanReviewed remains false.
// Match both stimulus and answer so content revisions cannot silently reuse this support.
export const crowdedPlaceSupport = {
  humanReviewed: false,
  prompt: "这里人很多。",
  correctAnswer: "Ở đây có rất nhiều người.",
  distractors: ["Ở đây có rất ít người.", "Ở kia có rất nhiều người.", "Ở đây không có người."],
  hint: "Tách câu thành 这里 / 人 / 很多. Chú ý câu nói về nơi nào, về người hay đồ vật, và số lượng nhiều hay ít; câu không có từ phủ định.",
  explanation: "这里 nghĩa là ‘ở đây’; 人 là ‘người’; 很多 là ‘rất nhiều’. Câu mô tả số người ở nơi đang nói tới: ‘Ở đây có rất nhiều người’. ‘Rất ít’ trái với 很多; ‘ở kia’ không phải 这里; ‘không có người’ thêm ý phủ định mà câu gốc không có.",
} as const;

export function remediationLessonSupport(exercise: Exercise) {
  return exercise.kind === "sentence" && exercise.prompt === crowdedPlaceSupport.prompt
    && exercise.correct === crowdedPlaceSupport.correctAnswer ? crowdedPlaceSupport : null;
}

import type { NormalizedLessonPresentationActivityV1 } from "./normalizedLessonRuntime";

export const buildLessonAnswerFeedback = ({
  activity,
  selected,
  correct,
}: {
  activity: NormalizedLessonPresentationActivityV1;
  selected: string | null;
  correct: boolean;
}) => {
  if (!correct) {
    switch (activity.kind) {
      case "tone":
        return `Chưa khớp. Nghe lại “${activity.prompt}”; bỏ qua nghĩa và chỉ theo dõi hướng cao độ: ngang, lên, thấp hay rơi.`;
      case "listening":
        return "Chưa khớp. Nghe lại một lần, tách từng âm tiết rồi mới nối âm với nghĩa.";
      case "pinyin":
        return `Chưa khớp. Tách âm đầu, vần và dấu thanh của “${activity.prompt}” rồi thử lại ở lượt ôn.`;
      case "recall":
        return "Chưa khớp. Quay về từ mẫu, đọc âm và nghĩa rồi che mẫu để tự gọi lại một lần nữa.";
      case "sentence":
        return "Chưa khớp. Tìm chủ thể, hành động và từ chỉ thời gian hoặc phủ định trước khi đọc cả câu.";
      case "meaning":
      case "tone-pair":
        return "Chưa khớp. So lại đúng một dấu hiệu cốt lõi trong phần vừa học rồi thử ở lượt ôn.";
    }
  }

  const answer = selected?.trim() || "đáp án vừa chọn";
  switch (activity.kind) {
    case "tone":
      return `Đúng: ${answer}. Vẽ hướng đó bằng tay rồi đọc lại “${activity.prompt}” một lần để nối tai, mắt và giọng.`;
    case "pinyin":
      return `Đúng: “${activity.prompt}” đi với ${answer}. Che đáp án và tự gọi lại cách đọc một lần.`;
    case "listening":
      return `Đúng: bạn đã nối âm vừa nghe với “${answer}”. Nghe lại rồi nhại cả từ, không chỉ nhớ vị trí đáp án.`;
    case "meaning":
      return `Đúng: bạn đã nối “${activity.prompt}” với “${answer}”. Hãy tự đặt từ đó vào một cụm ngắn.`;
    case "recall":
      return `Đúng: bạn đã tự gọi lại “${answer}”. Đây là truy hồi chủ động; hãy đọc thành tiếng thêm một lần.`;
    case "sentence":
      return `Đúng: bạn đã nắm ý câu. Nêu lại bằng tiếng Việt rồi đọc câu tiếng Trung liền mạch một lần.`;
    case "tone-pair":
      return `Đúng: ${answer}. Đọc chậm từng âm rồi nối cả cặp để nghe sự thay đổi trong cụm.`;
  }
};

import type { LearningGoal } from "../types";

export type GoalPathway = {
  label: string;
  title: string;
  promise: string;
  accent: "jade" | "cyan" | "gold" | "vermilion";
  stages: readonly [string, string, string];
};

export const GOAL_PATHWAYS: Record<LearningGoal, GoalPathway> = {
  conversation: {
    label: "Giao tiếp hằng ngày",
    title: "Khẩu ngữ phản xạ",
    promise: "Biến từ và mẫu câu vừa học thành lượt nghe – nói ngắn ngay trong ngày.",
    accent: "jade",
    stages: ["Nền câu thiết yếu", "Vạn Âm Điện", "Phản xạ hội thoại"],
  },
  hsk: {
    label: "Chinh phục HSK",
    title: "Cảnh giới khảo thí",
    promise: "Khóa kiến thức theo cấp, đọc ngữ cảnh rồi tự kiểm bằng cấu trúc gần kỳ thi.",
    accent: "gold",
    stages: ["Nền HSK theo cấp", "Đọc và ôn điểm yếu", "Đại Khảo Cảnh Giới"],
  },
  career: {
    label: "Công việc và học tập",
    title: "Văn tự thực chiến",
    promise: "Ưu tiên đọc lấy thông tin, từ ngữ trang trọng và Hán tự cần cho tác vụ viết.",
    accent: "cyan",
    stages: ["Từ ngữ chuyên dụng", "Vạn Quyển Các", "Thần Văn Lô"],
  },
  travel: {
    label: "Du lịch tự chủ",
    title: "Hành trình sinh tồn",
    promise: "Gom mẫu câu chỉ đường, di chuyển và dịch vụ thành các lượt xử lý tình huống.",
    accent: "vermilion",
    stages: ["Cụm từ sinh tồn", "Nghe chỉ dẫn", "Ứng biến tại chỗ"],
  },
};

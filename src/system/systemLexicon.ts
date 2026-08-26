import type { LearningGoal } from "../types";

export const SYSTEM_LEXICON = {
  goal: { fantasy: "Thiên Mệnh", plain: "Mục tiêu học" },
  startingLevel: { fantasy: "Căn Cơ Tự Khai", plain: "Điểm xuất phát tự chọn" },
  dailyMinutes: { fantasy: "Nhịp Tu Luyện", plain: "Thời lượng học mỗi ngày" },
  path: { fantasy: "Thiên Lộ", plain: "Lộ trình bài học" },
  unit: { fantasy: "Cảnh Giới", plain: "Chặng nội dung" },
  lesson: { fantasy: "Thử Luyện", plain: "Bài học" },
  prerequisite: { fantasy: "Điều Kiện Khai Mở", plain: "Bài cần đạt trước" },
  locked: { fantasy: "Phong Ấn", plain: "Chưa đủ điều kiện" },
  unlocked: { fantasy: "Đã Khai Mở", plain: "Có thể bắt đầu" },
  xp: { fantasy: "Năng Lượng Tương Tác", plain: "XP hoạt động trong HANZI.OS" },
  evidence: { fantasy: "Tín Hiệu Học Tập", plain: "Bằng chứng quan sát đủ điều kiện" },
  observedAccuracy: { fantasy: "Chỉ Số Quan Sát", plain: "Tỷ lệ đúng trên mẫu hiện có" },
  review: { fantasy: "Ký Ức Trận", plain: "Ôn tập FSRS" },
  dueCard: { fantasy: "Mảnh Ký Ức Đến Hạn", plain: "Thẻ cần truy hồi" },
  savedWord: { fantasy: "Ấn Ký Từ Vựng", plain: "Từ đã lưu" },
  mistake: { fantasy: "Nghịch Cảnh", plain: "Lỗi cần luyện lại" },
  levelCheck: { fantasy: "Khảo Nghiệm Căn Cơ", plain: "Khảo sát điểm khởi hành" },
  result: { fantasy: "Bản Đồ Bù Khuyết", plain: "Vùng nên luyện tiếp" },
} as const;

export const SYSTEM_CLASSES: Record<LearningGoal, { title: string; plain: string }> = {
  conversation: { title: "Sứ Giả Hội Thoại", plain: "Ưu tiên giao tiếp đời sống" },
  hsk: { title: "Hành Giả Khảo Luyện", plain: "Ưu tiên kỹ năng nền HSK" },
  career: { title: "Chấp Bút Chuyên Nghiệp", plain: "Ưu tiên học tập và công việc" },
  travel: { title: "Du Hành Thông Ngôn", plain: "Ưu tiên tình huống du lịch" },
};

export const getSystemClass = (goal: LearningGoal) => SYSTEM_CLASSES[goal];

export type SystemPageName = { code: string; title: string; plain: string };

const SYSTEM_PAGE_NAMES: Record<string, SystemPageName> = {
  "/": { code: "CORE-01", title: "Thức Tỉnh Điện", plain: "Trung tâm học hôm nay" },
  "/path": { code: "PATH-02", title: "Thiên Lộ", plain: "Lộ trình bài học" },
  "/review": { code: "MEM-03", title: "Ký Ức Trận", plain: "Ôn tập FSRS" },
  "/mistakes": { code: "REMEDY-04", title: "Nghịch Cảnh Lục", plain: "Luyện lại lỗi sai" },
  "/assessment": { code: "ORIGIN-05", title: "Khảo Nghiệm Căn Cơ", plain: "Khảo sát điểm khởi hành" },
  "/assessment/hsk1": { code: "ORIGIN-HSK1", title: "Khảo Nghiệm Căn Cơ HSK1", plain: "Khảo sát điểm khởi hành" },
  "/assessment/hsk2": { code: "ORIGIN-HSK2", title: "Khảo Nghiệm Căn Cơ HSK2", plain: "Khảo sát điểm khởi hành" },
  "/assessment/hsk3": { code: "ORIGIN-HSK3", title: "Khảo Nghiệm Căn Cơ HSK3", plain: "Khảo sát điểm khởi hành" },
  "/assessment/hsk4": { code: "ORIGIN-HSK4", title: "Khảo Nghiệm Căn Cơ HSK4", plain: "Khảo sát điểm khởi hành" },
  "/exams": { code: "THI-09", title: "Phòng Luyện Đề", plain: "Khảo luyện HSK theo phiên" },
  "/pronunciation": { code: "VOICE-06", title: "Vạn Âm Điện", plain: "Luyện âm và nhận dạng giọng nói" },
  "/characters": { code: "GLYPH-07", title: "Thần Văn Lô", plain: "Phân khu Hán tự" },
  "/reader": { code: "READ-08", title: "Vạn Quyển Các", plain: "Luyện đọc" },
  "/dictionary": { code: "LEX-09", title: "Tàng Tự Khố", plain: "Tra cứu từ" },
  "/analytics": { code: "MIRROR-10", title: "Thiên Cơ Kính", plain: "Chỉ số quan sát và tiến độ" },
  "/profile": { code: "USER-11", title: "Bảng Thuộc Tính", plain: "Hồ sơ Hành Giả" },
};

export const resolveSystemPageName = (pathname: string): SystemPageName => {
  if (pathname.startsWith("/exams")) return SYSTEM_PAGE_NAMES["/exams"]!;
  if (pathname.startsWith("/characters")) return SYSTEM_PAGE_NAMES["/characters"]!;
  if (pathname.startsWith("/reader")) return SYSTEM_PAGE_NAMES["/reader"]!;
  const placementMatch = pathname.match(/^\/assessment\/placement\/hsk([1-4])$/u);
  if (placementMatch) return {
    code: `ORIGIN-HSK${placementMatch[1]}`,
    title: `Khảo Nghiệm Căn Cơ HSK${placementMatch[1]}`,
    plain: "Khảo sát điểm khởi hành",
  };
  if (pathname.startsWith("/lesson/")) {
    return { code: "TRIAL-LIVE", title: "Thử Luyện Đang Tiến Hành", plain: "Bài học hiện tại" };
  }
  return SYSTEM_PAGE_NAMES[pathname] ?? SYSTEM_PAGE_NAMES["/"]!;
};

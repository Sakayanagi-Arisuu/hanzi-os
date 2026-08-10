export const REFORGE_AREA_IDS = [
  "learn",
  "review",
  "speak",
  "practice",
  "profile",
] as const;

export type ReforgeAreaId = (typeof REFORGE_AREA_IDS)[number];

export type ReforgeProductArea = Readonly<{
  id: ReforgeAreaId;
  label: string;
  purpose: string;
}>;

const areas = Object.freeze([
  Object.freeze({
    id: "learn",
    label: "Học",
    purpose: "Trong Học, mở Hôm nay để thấy đúng một bài tiếp theo trên lộ trình HSK0–HSK4.",
  }),
  Object.freeze({
    id: "review",
    label: "Ôn",
    purpose: "Gọi lại mục đến hạn, sửa lỗi và ưu tiên chỗ còn yếu.",
  }),
  Object.freeze({
    id: "speak",
    label: "Nói",
    purpose: "Luyện Pinyin, thanh điệu, shadowing và hội thoại theo kịch bản; micro luôn là tùy chọn.",
  }),
  Object.freeze({
    id: "practice",
    label: "Luyện",
    purpose: "Viết chữ, bài đọc, cụm từ tình huống, kho từ/chữ, trò luyện và luyện đề nguyên bản.",
  }),
  Object.freeze({
    id: "profile",
    label: "Hồ sơ",
    purpose: "Xem tiến độ, mục tiêu, tài khoản, cài đặt và quyền kiểm soát dữ liệu.",
  }),
] satisfies readonly ReforgeProductArea[]);

const dailyFlow = Object.freeze([
  Object.freeze({ label: "Học / Hôm nay", detail: "Một việc quan trọng nhất" }),
  Object.freeze({ label: "Bài ngắn", detail: "Hiểu, luyện, tự gọi lại" }),
  Object.freeze({ label: "Ôn", detail: "Sửa lỗi và nhớ đúng lúc" }),
  Object.freeze({ label: "Nói hoặc Luyện", detail: "Chọn một hoạt động chuyển giao ngắn" }),
  Object.freeze({ label: "Kết phiên", detail: "Biết đã tiến bộ gì và làm gì tiếp" }),
]);

export const REFORGE_PRODUCT_CONTRACT = Object.freeze({
  name: "HANZI.OS Reforge",
  northStar: "Học tiếng Trung rõ đường, nhớ lâu, dùng được.",
  audience: "Người Việt tự học từ số 0 đến HSK4.",
  languageScope: "Mandarin Trung Quốc đại lục, chữ giản thể và Pinyin.",
  platformScope:
    "Web/PWA local-first: lõi học HSK0–HSK4 dùng ẩn danh đầy đủ và giữ tiến độ trên thiết bị; tài khoản và AI ngoài chỉ là tùy chọn.",
  deliveryStatus:
    "Đây là hợp đồng đích Reforge đang được triển khai, không phải tuyên bố mọi chức năng đã hoàn tất.",
  areas,
  dailyFlow,
  originality:
    "ChineseSkill chỉ là benchmark về nhóm chức năng, luồng học và ngưỡng chất lượng. HANZI.OS không sao chép mã nguồn, bố cục, bài học, câu hỏi, âm thanh, hình ảnh, dữ liệu đóng hay tài sản thương mại; mọi nội dung và trải nghiệm phải nguyên bản hoặc có quyền sử dụng rõ ràng.",
} as const);

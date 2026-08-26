import type { Skill } from "../types";

export type AnalyticsGatewayId =
  | "path"
  | "review"
  | "mistakes"
  | "pronunciation"
  | "reader"
  | "characters"
  | "exams"
  | "dictionary";

export type AnalyticsGateway = {
  id: AnalyticsGatewayId;
  eyebrow: string;
  title: string;
  plainLabel: string;
  to: string;
  status: string;
  tone: "jade" | "cyan" | "gold" | "violet";
};

export const ANALYTICS_SKILL_DESTINATION: Readonly<Record<Skill, string>> = {
  pronunciation: "/pronunciation",
  listening: "/pronunciation",
  speaking: "/pronunciation",
  reading: "/reader",
  writing: "/characters",
  vocabulary: "/review",
  grammar: "/path",
};

export const buildAnalyticsGateways = ({
  authenticated,
  completedCount,
  completionRate,
  dueCount,
  totalCount,
  unresolvedMistakes,
}: {
  authenticated: boolean;
  completedCount: number;
  completionRate: number;
  dueCount: number;
  totalCount: number;
  unresolvedMistakes: number;
}): AnalyticsGateway[] => [{
  id: "path",
  eyebrow: "HỌC",
  title: "Thiên Lộ",
  plainLabel: "Tiếp tục lộ trình",
  to: "/path",
  status: `${completedCount}/${totalCount} bài · ${completionRate}% lộ trình`,
  tone: "jade",
}, {
  id: "review",
  eyebrow: "ÔN",
  title: "Ký Ức Trận",
  plainLabel: "Ôn tập FSRS",
  to: "/review",
  status: authenticated
    ? "Mở lịch ôn đã đồng bộ của tài khoản"
    : dueCount > 0
      ? `${dueCount} thẻ đang đến hạn`
      : "Chưa có thẻ đến hạn trên thiết bị",
  tone: "cyan",
}, {
  id: "mistakes",
  eyebrow: "CHỮA LỖI",
  title: "Nghịch Cảnh Lục",
  plainLabel: "Luyện lại lỗi sai",
  to: "/mistakes",
  status: unresolvedMistakes > 0
    ? `${unresolvedMistakes} lỗi đang chờ phá giải`
    : "Không có lỗi cục bộ đang mở",
  tone: "gold",
}, {
  id: "pronunciation",
  eyebrow: "NÓI",
  title: "Vạn Âm Điện",
  plainLabel: "Luyện phát âm",
  to: "/pronunciation",
  status: "Luyện âm, nghe và nhiệm vụ nói",
  tone: "violet",
}, {
  id: "reader",
  eyebrow: "ĐỌC",
  title: "Vạn Quyển Các",
  plainLabel: "Đọc và tra từ",
  to: "/reader",
  status: "Đọc truyện · tra và lưu từ",
  tone: "cyan",
}, {
  id: "characters",
  eyebrow: "LUYỆN CHỮ",
  title: "Thần Văn Lô",
  plainLabel: "Tra và luyện chữ",
  to: "/characters",
  status: "Tra chữ · xem cấu tạo · luyện nét",
  tone: "gold",
}, {
  id: "exams",
  eyebrow: "LUYỆN ĐỀ",
  title: "Phòng Luyện Đề",
  plainLabel: "Mở bài luyện đề",
  to: "/exams",
  status: "Luyện đề theo tầng · xem lịch sử",
  tone: "violet",
}, {
  id: "dictionary",
  eyebrow: "TRA CỨU",
  title: "Tàng Tự Khố",
  plainLabel: "Tra chữ và từ",
  to: "/dictionary",
  status: "Tra cứu chữ và từ trong kho mở rộng",
  tone: "jade",
}];

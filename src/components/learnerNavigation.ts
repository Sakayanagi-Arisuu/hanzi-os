export type LearnerZone = 'learn' | 'review' | 'speak' | 'practice' | 'profile';

export const learnerPrimaryZones = [
  { id: 'learn', label: 'Học', lore: 'Thiên Lộ', to: '/path', icon: 'Map' },
  { id: 'review', label: 'Ôn', lore: 'Ký Ức Trận', to: '/review', icon: 'BrainCircuit' },
  { id: 'speak', label: 'Nói', lore: 'Vạn Âm Điện', to: '/pronunciation', icon: 'Mic2' },
  { id: 'practice', label: 'Luyện', lore: 'Chọn công cụ', to: null, icon: 'LayoutGrid' },
  { id: 'profile', label: 'Hồ sơ', lore: 'Bảng Thuộc Tính', to: '/profile', icon: 'Settings' },
] as const;

/** Every former destination remains local and reachable without a new route. */
export const learnerToolDestinations = [
  { to: '/characters', label: 'Thần Văn Lô', description: 'Luyện chữ', icon: 'PenTool' },
  { to: '/reader', label: 'Vạn Quyển Các', description: 'Đọc hiểu', icon: 'BookOpenText' },
  { to: '/exams', label: 'Phòng Luyện Đề', description: 'Luyện và xem kết quả đề', icon: 'Target' },
  { to: '/dictionary', label: 'Tàng Tự Khố', description: 'Tra từ và tự ôn', icon: 'Search' },
  { to: '/assessment', label: 'Khảo Nghiệm Căn Cơ', description: 'Xác định điểm khởi hành', icon: 'Target' },
  { to: '/mistakes', label: 'Nghịch Cảnh Lục', description: 'Ôn lỗi cần luyện tiếp', icon: 'Swords' },
  { to: '/', label: 'Thức Tỉnh Điện', description: 'Tổng quan hành trình', icon: 'Gauge' },
  { to: '/analytics', label: 'Thiên Cơ Kính', description: 'Xem hoạt động học', icon: 'BarChart3' },
  { to: '/profile/premium', label: 'Gói Premium', description: 'Xem quyền truy cập', icon: 'Crown' },
  { to: '/profile', label: 'Bảng Thuộc Tính', description: 'Hồ sơ và thiết lập', icon: 'Settings' },
] as const;

export function activeLearnerZone(pathname: string): LearnerZone | null {
  const path = pathname.split(/[?#]/u, 1)[0];
  const within = (base: string) => path === base || path?.startsWith(`${base}/`) === true;
  if (path === '/' || within('/path') || within('/lesson')) return 'learn';
  if (within('/review') || within('/mistakes')) return 'review';
  if (within('/pronunciation')) return 'speak';
  if (['/characters', '/reader', '/exams', '/dictionary', '/assessment'].some(within)) return 'practice';
  if (within('/profile') || within('/analytics') || within('/account/security')) return 'profile';
  return null;
}

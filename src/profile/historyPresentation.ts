import type { HistoryModule, LessonHistoryEventV1 } from '../learning/lessonHistory';

export const HISTORY_MODULE_LABELS: Record<HistoryModule, string> = { lessons: 'Bài học', review: 'Ký Ức Trận · ôn tập',
  mistakes: 'Nghịch Cảnh Lục · sửa lỗi', reader: 'Reader · đọc hiểu', assessment: 'Khảo nghiệm và luyện đề',
  dictionary: 'Tàng Tự Khố · từ điển', speech: 'Vạn Âm Điện · luyện nói', writing: 'Thần Văn Lô · luyện chữ',
  overview: 'Tổng quan', profile: 'Hồ sơ và thiết lập' };
export const HISTORY_SKILL_LABELS = { pronunciation: 'Phát âm', listening: 'Nghe', speaking: 'Nói', reading: 'Đọc',
  writing: 'Viết', vocabulary: 'Từ vựng', grammar: 'Ngữ pháp' };

export function historyDay(event: LessonHistoryEventV1) {
  if (!event.occurredAt || !Number.isFinite(Date.parse(event.occurredAt))) return 'Chưa rõ ngày thực hiện';
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Saigon', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(event.occurredAt));
}
export function historyActivityLabel(event: LessonHistoryEventV1) {
  if (event.sourceType === 'fsrs-review-grade') return 'Tự đánh giá lượt ôn';
  if (event.business?.details?.domain === 'adaptive-session') {
    const action = event.business.details.action;
    if (action === 'draft') return 'Khảo Luyện · giữ nháp câu trả lời';
      if (action === 'draft-recovery') return 'Khảo Luyện · giữ riêng nháp khi phiên thay đổi';
      if (action === 'archive') return 'Khảo Luyện · lưu trữ phiên, giữ dữ liệu';
    if (action === 'open') return 'Khảo Luyện · mở phiên luyện';
    if (action === 'next') return 'Khảo Luyện · chuyển bước hoặc khép phiên';
    if (event.business.category === 'self-review') return 'Khảo Luyện · tự đối chiếu, chưa chấm thành thạo';
    if (event.business.category === 'exposure') return 'Khảo Luyện · đọc theo ngữ cảnh';
    if (event.business.category === 'support') return 'Khảo Luyện · dùng hỗ trợ học';
  }
  const category = event.business?.category ?? (event.taskType === 'page-self-review' ? 'self-review'
    : event.taskType === 'page-exposure' ? 'exposure' : event.taskType === 'page-support' ? 'support' : 'objective');
  return { objective: 'Trả lời bài luyện', 'self-review': 'Tự ôn · không chấm mức thành thạo', support: 'Dùng hỗ trợ học',
    exposure: 'Đọc hoặc tra cứu', visit: 'Ghé khu học · không phải trả lời', preference: 'Đổi thiết lập học',
    'saved-item': 'Cập nhật mục đã lưu', session: 'Mốc phiên học · không phải đáp án' }[category];
}
export function historyOutcomeLabel(event: LessonHistoryEventV1) {
  if (event.confirmationState === 'quarantined') return 'Chưa được chấp nhận; lượt trên thiết bị vẫn được giữ';
  const pending = event.confirmationState !== 'confirmed' && event.authority === 'unknown';
  if (pending) return 'Đã giữ trên thiết bị · đang chờ xác nhận';
  if (event.outcome === 'self-review') return 'Tự khai hoặc tự đối chiếu; không phải điểm kiểm chứng';
  if (event.outcome === 'correct') return event.authority === 'server-verified' ? 'Đúng · được hệ thống kiểm chứng' : 'Đúng trong lượt luyện; không kết luận thông thạo';
  if (event.outcome === 'incorrect') return 'Cần luyện thêm ở lượt này';
  return event.confirmationState === 'confirmed' ? 'Đã ghi nhận · không có kết quả chấm đúng/sai' : 'Đã lưu trên thiết bị · chưa có kết quả chấm đúng/sai';
}
export function historySourceLink(event: LessonHistoryEventV1) {
  if (event.business?.details?.domain === 'adaptive-session') {
    const lessonId = event.sourceLessonIds[0];
    return lessonId ? { href: `/lesson/${encodeURIComponent(lessonId)}`, label: 'Mở bài nguồn của lượt luyện' }
      : { href: '/path', label: 'Về Thiên Lộ · chọn bài hiện có' };
  }
  if (event.business?.details?.domain === 'expansion') return { href: `/path/expansion/${encodeURIComponent(event.sourceId)}`, label: 'Mở chặng tự ôn gốc' };
  const lessonId = event.sourceLessonIds[0];
  if (lessonId && ['lessons', 'mistakes'].includes(event.module)) return { href: `/lesson/${encodeURIComponent(lessonId)}`, label: 'Mở bài gốc' };
  if (event.module === 'dictionary') return { href: `/dictionary?view=detail&word=${encodeURIComponent(event.itemId)}`, label: 'Mở mục từ gốc' };
  if (event.module === 'speech') return { href: `/pronunciation${lessonId ? `?lesson=${encodeURIComponent(lessonId)}` : ''}`, label: 'Mở luyện nói' };
  if (event.module === 'writing') return { href: '/characters/session?resume=1', label: 'Mở luyện chữ · tiếp tục phiên dở nếu có' };
  if (event.module === 'assessment') return event.sourceId.startsWith('device-mock:') || event.business?.details?.deviceTimed === true
    ? { href: '/exams/history', label: 'Mở lịch sử luyện đề' } : { href: '/assessment', label: 'Mở khu khảo nghiệm' };
  if (event.module === 'reader') return { href: '/reader', label: 'Mở Reader · chọn lại nguồn đã đọc' };
  const href = { lessons: '/path', review: '/review', mistakes: '/mistakes', reader: '/reader', assessment: '/exams/history',
    overview: '/', profile: '/profile?view=journey', dictionary: '/dictionary', speech: '/pronunciation', writing: '/characters' }[event.module];
  return { href, label: 'Mở khu học gốc' };
}

# Khôi phục bài đã lưu khi API nội dung gián đoạn

Ngày: 01/10/2026. Thiên Lộ/Xưởng: IN-REVIEW, chưa USER-ACCEPTED.

## Lỗi và thay đổi

Bài boot-1 có bản LessonPageDocument đã phát hành và phiên học trong IndexedDB,
nhưng khi learning runtime API thất bại, LessonTheoryPanel chọn giao diện legacy
trước khi ResumableLessonReader có cơ hội đọc phiên. Nháp không mất nhưng không
hiện trong hành trình học.

Nhánh thiếu document giờ đọc snapshot đúng owner/generation/reset epoch/lesson.
Chỉ snapshot hợp lệ được đưa vào reader hiện hành, với sourceStatus=fallback;
không hiện nút cập nhật khi chưa xác minh nội dung mới. Thiếu snapshot, snapshot
sai hoặc phiên bản tương lai vẫn dùng legacy và không ghi đè record. Khi owner
đổi, component được unmount bằng key; callback đọc cũ được hủy.

## Kiểm chứng

- Typecheck và ESLint các file thay đổi đạt.
- LessonTheoryPanel + lessonReadingSession: 11 kiểm thử đạt.
- IndexedDB owner/reset/cache: 9 kiểm thử đạt.
- Browser `scripts/content/smoke-learner-pinned-offline.ts` exit0: guest cô lập,
  viết nháp boot-1, giả lập snapshot cũ sau khi unmount để tránh autosave race;
  API chậm không hiện nút cập nhật; API bị abort vẫn giữ nháp và document cũ;
  phục hồi API và chủ động cập nhật sẽ lưu nháp cũ trong history rồi mở bản mới.
  Snapshot version999 giữ nguyên toàn record khi fallback.
- Hai lượt đầu timeout tải bài/onboarding; khởi động lại riêng Vinext, giữ D1.
  Một lượt chạy trước khi server sẵn sàng bị connection refused; lượt sau đạt.
  Chưa xác định hay tuyên bố sửa nguyên nhân server chậm.

## Giới hạn

Đây là outage của riêng API nội dung, không phải chứng nhận offline PWA toàn bộ.
Snapshot cũ là fixture trong browser cô lập, không phát hành D1 revision trong
lúc học. Không sửa nội dung, release heads, dữ liệu learner thật hay Premium.
Giữ humanReviewed:false; 217 bài nền không đổi. Còn kiểm timed learner thật,
parity Xưởng và ma trận độ sâu/checklist v0.2 trước kết luận hoàn tất.

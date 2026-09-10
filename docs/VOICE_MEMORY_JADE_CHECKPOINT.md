# Vạn Âm Điện và Ký Ức Trận — 10/09/2026

**Module:** Vạn Âm Điện / Ký Ức Trận — IN-REVIEW.

## Người học thấy gì

- Vạn Âm Điện: bố cục thu giọng vừa laptop 1321×643, trạng thái micro
  hiển thị đầy đủ; nút dừng thu diễn đạt đúng hành động. Nghe lại bị khóa
  khi đang ghi/yêu cầu micro/gửi bản thu để không hủy bản thu ngoài ý muốn.
  Mobile giữ tiến độ phiên cạnh nút chọn bài. Kho bài phân trang.
- Ký Ức Trận: hoàn thiện bề mặt ngọc và nút thao tác theo A Ngọc Lệnh;
  chữ nhiều ký tự vừa ấn ngọc, font tiếng Việt tự host hỗ trợ đầy đủ dấu.
  Nút nghe ở trên lớp thẻ nên bấm được; không phát âm trước khi hiện đáp án.
  Thông báo kết nối có hàng riêng, không phủ nội dung.
- Lịch ôn local gom cả thẻ quá hạn vào hôm nay. Hồ sơ chưa có thẻ hiển thị
  phân bố 0%; trạng thái đã ôn hết thẻ khác với trạng thái chưa kích hoạt.

## Đã kiểm

- Typecheck và ESLint các file thay đổi đạt.
- 5 file Vitest / 31 test: trình bày lịch ôn, trạng thái trống, glyph,
  thanh đánh giá và chọn bài luyện nói.
- 10 hành trình Playwright đạt qua các lượt chạy có sửa lỗi: thu giả lập ở
  1321×643; kho bài desktop/mobile; tự dừng micro và báo cáo; lỗi provider;
  kết thúc luyện nói; ôn tập desktop/mobile; nghe phát âm và phục hồi TTS.
  Các fixture nằm trong browser context riêng, không ghi đè hồ sơ người dùng.
- Browser tài khoản demo: sảnh, truy hồi có gợi ý, đối chiếu, desktop1321×643
  và mobile375×812; chữ, ví dụ, các nút đánh giá giữ trong viewport.
  Thoát về sảnh mà không gửi đánh giá cho thẻ demo đó.
- Full check còn bị chặn bởi báo cáo nội dung HSK1 level-batch stale đã có
  trước lượt này; không tự tạo lại review nội dung để vượt gate.

## Dữ liệu và asset

Không reset hoặc migration; giữ IDs, FSRS, tiến độ, .wrangler và outbox.
HSK0 4/4 (rich0/4); HSK1–4 rich40/40/55/78, tổng213/213 giữ nguyên.
Giữ các nền Ngọc Lệnh sẵn có. Phần khung/ngọc/nút là CSS/SVG trong repo.
Noto Serif dùng file tự host cùng giấy phép public/fonts/NotoSerif-OFL.txt.
Chuyển động ngắn theo thao tác; tôn trọng prefers-reduced-motion.

**Tiếp theo:** người dùng test /pronunciation và /review; chưa USER-ACCEPTED.

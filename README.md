# HANZI.OS

HANZI.OS là nền tảng học tiếng Trung theo phong cách "Thức tỉnh hệ thống", được thiết kế như nền móng cho một sản phẩm thương mại thay vì một trang tĩnh.

## Chạy dự án

```bash
npm install
npm run dev
```

Tạo và chạy build ở chế độ production (không phải bằng chứng đã deploy):

```bash
npm run build
npm run start
```

## Những gì sản phẩm hiện có

- Onboarding chọn mục tiêu, căn cơ, nhịp học và hệ chữ.
- Khảo nghiệm đầu vào cho kết quả sàng lọc mô tả chưa hiệu chỉnh; không tự định tuyến, mở prerequisite hay suy ra HSK/mastery.
- Dashboard thích nghi theo mục tiêu, lỗi mở, lịch FSRS và năng lực yếu nhất.
- Khung lộ trình có release gate; giao diện chỉ hiện nội dung beta/published, không tuyên bố độ phủ HSK vượt phần đã duyệt.
- Lesson engine có bản lĩnh hội trước bài, câu nghe, nghĩa, pinyin, thanh điệu, đọc ngữ cảnh và tự nhập Hán tự.
- Tự lưu từng đáp án và khôi phục đúng câu sau khi tải lại.
- Nghịch Cảnh Lục giữ lỗi cho đến khi tự gọi đúng hai lần liên tiếp.
- Ôn cách quãng bằng FSRS, chỉ kích hoạt từ đã học hoặc chủ động lưu; đường
  authenticated lấy queue và chấm rating phía server, giữ lịch bằng durable
  outbox và không phát XP.
- Speech synthesis và speech recognition có graceful fallback.
- Luyện viết đúng nét bằng Hanzi Writer.
- Graded reader có pinyin, dịch và tra từ tại chỗ.
- Tàng Tự Khố, danh sách từ đã lưu và Thiên Cơ Kính phân tích bảy năng lực.
- PWA cài đặt được, có offline shell và cache dữ liệu nét chữ đã dùng.
- Người dùng ẩn danh giữ dữ liệu cục bộ; mã nguồn closed-alpha cho người dùng đã xác thực có command/evidence chuẩn hóa qua D1, outbox offline và projection đa thiết bị. Đường này đã có kiểm tra cục bộ nhưng chưa được xác minh như một dịch vụ hosted.

## Tài liệu sản phẩm

- [Nghiên cứu tính năng](docs/FEATURE_RESEARCH.md)
- [Đặc tả sản phẩm](docs/PRODUCT_REQUIREMENTS.md)
- [Kiến trúc kỹ thuật](docs/ARCHITECTURE.md)
- [Hệ thống nội dung](docs/CONTENT_SYSTEM.md)
- [Mô hình làm chủ và thích ứng](docs/MASTERY_SYSTEM.md)
- [Roadmap thương mại hóa](docs/ROADMAP.md)
- [Kế hoạch đồ án HSK0-4 đang hoạt động](docs/HSK4_GRADUATION_PLAN.md)
- [Walkthrough demo local HSK0 → HSK1](docs/HSK01_LOCAL_DEMO.md)
- [Đóng gói và kiểm chứng local release candidate](docs/LOCAL_RELEASE_CANDIDATE.md)
- [Kế hoạch nâng cấp production đang tạm hoãn](docs/PRODUCTION_UPGRADE_PLAN.md)

## Ranh giới của bản foundation

Đây là một vertical slice giàu tính năng cho trải nghiệm học cốt lõi. Mã nguồn
Phase 1 đã bổ sung nền đăng nhập ChatGPT tùy chọn, D1 schema có version,
local-first outbox, idempotency, hòa giải đa thiết bị, account export schema v4
và xóa tài khoản. Restore rehearsal cục bộ hiện áp dụng 13 migration
`0000`–`0012` trên graph 26 bảng, gồm cả FSRS card/review log, Reader session
versioned và trigger khóa outbox vào đúng reset epoch. Những kiểm tra này không
thay thế hosted
provisioning, hosted backup/restore hoặc kiểm chứng đa thiết bị trên dịch vụ
thật. Người dùng ẩn danh vẫn giữ hồ sơ cục bộ. Thanh toán, CMS biên tập, audio
bản quyền, AI tutor server và chấm phát âm theo cao độ vẫn cần các phase
production tiếp theo. Transcript giọng nói luôn local-only và không đi vào
đường D1.

Ứng viên nội dung `foundation-2026.07.6` dùng schema v6 / item catalog v4 với
74 item và sanitized runtime catalog chỉ chứa nội dung đã phát hành. 25 grammar,
pronunciation, character và communicative-function item vẫn ở state `review`;
bảy character đã có source-addressed radical/IDS/stroke metadata nhưng chưa có
legal/license decision hay linguistic approval. Package chưa được promote, nên
README không tuyên bố nội dung này đã sẵn sàng production.

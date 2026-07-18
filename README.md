# HANZI.OS

HANZI.OS là nền tảng học tiếng Trung theo phong cách "Thức tỉnh hệ thống", được thiết kế như nền móng cho một sản phẩm thương mại thay vì một trang tĩnh.

## Chạy dự án

```bash
npm install
npm run dev
```

Build production:

```bash
npm run build
npm run start
```

## Những gì sản phẩm hiện có

- Onboarding chọn mục tiêu, căn cơ, nhịp học và hệ chữ.
- Khảo nghiệm đầu vào định tuyến điểm xuất phát.
- Dashboard thích nghi theo mục tiêu, lỗi mở, lịch FSRS và năng lực yếu nhất.
- Lộ trình mẫu từ Pre-HSK đến HSK 3+, sẵn cấu trúc để mở rộng theo chín cấp năng lực.
- Lesson engine có bản lĩnh hội trước bài, câu nghe, nghĩa, pinyin, thanh điệu, đọc ngữ cảnh và tự nhập Hán tự.
- Tự lưu từng đáp án và khôi phục đúng câu sau khi tải lại.
- Nghịch Cảnh Lục giữ lỗi cho đến khi tự gọi đúng hai lần liên tiếp.
- Ôn cách quãng bằng FSRS, chỉ kích hoạt từ đã học hoặc chủ động lưu.
- Speech synthesis và speech recognition có graceful fallback.
- Luyện viết đúng nét bằng Hanzi Writer.
- Graded reader có pinyin, dịch và tra từ tại chỗ.
- Tàng Tự Khố, danh sách từ đã lưu và Thiên Cơ Kính phân tích bảy năng lực.
- PWA cài đặt được, có offline shell và cache dữ liệu nét chữ đã dùng.
- Dữ liệu học và thiết lập được lưu riêng trên từng trình duyệt.

## Tài liệu sản phẩm

- [Nghiên cứu tính năng](docs/FEATURE_RESEARCH.md)
- [Đặc tả sản phẩm](docs/PRODUCT_REQUIREMENTS.md)
- [Kiến trúc kỹ thuật](docs/ARCHITECTURE.md)
- [Hệ thống nội dung](docs/CONTENT_SYSTEM.md)
- [Mô hình làm chủ và thích ứng](docs/MASTERY_SYSTEM.md)
- [Roadmap thương mại hóa](docs/ROADMAP.md)

## Ranh giới của bản foundation

Đây là một vertical slice giàu tính năng cho trải nghiệm học cốt lõi. Authentication, thanh toán, đồng bộ đa thiết bị, AI tutor chạy server, CMS biên tập, audio bản quyền và chấm phát âm theo cao độ cần backend production như mô tả trong tài liệu kiến trúc. Bản public hiện tại không chia sẻ tiến độ giữa người dùng: mỗi thiết bị có hồ sơ localStorage riêng.

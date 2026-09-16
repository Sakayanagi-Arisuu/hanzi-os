# Thiên Cơ Kính và học liệu biên tập — 11/09/2026

Trạng thái: IN-REVIEW.

## Cập nhật theo yêu cầu tiếp theo — 11/09

- Khôi phục thanh ở cả Thất Trụ và Bảng Trạng Thái: mốc hoạt động cố định
  1.000 câu khác nhau, hiển thị số đếm/mốc ngay trên thanh. Không gọi là mastery
  hoặc tỷ lệ toàn bộ kho. Đạt mốc vẫn giữ số câu thực và nhãn đã đạt mốc luyện.
- Đã phát hành local 213 bộ ngữ cảnh bằng workflow/release worker. 213 release
  job hoàn tất; đầu đọc learning nhận 213 enhancement với 6.019 mẫu bài luyện.
  2.011 mục từ nhập để biên tập vẫn là draft; từ cốt lõi đã có trên web giữ nguyên.
- Sửa consumer dùng đáp án Trung–Pinyin–Việt riêng của task; bỏ hội thoại trùng
  khi ghép vào rich lesson; giữ grammar, character và nhiệm vụ gốc.
- Sửa hợp đồng đọc package: worker đã kiểm review trước phát hành và loại trường
  review khỏi learner payload. Parser chấp nhận trường bị loại, vẫn từ chối review
  không hợp lệ nếu được gửi; repository giữ kiểm tra digest của package bất biến.
- Giao diện trong Thiên Lộ dùng ngọc trầm, vàng nhạt; điều hướng và nút hành động
  nằm trong viewport, nội dung giữa cuộn. Nhiệm vụ vận dụng có bộ chọn từng câu.
- Backup trước release ở `.wrangler/demo-backups`; rehearsal và 33 bảng dữ liệu
  ngoài nội dung/audit giữ nguyên. Audit chỉ thêm sự kiện workflow qua repository.
- Typecheck/ESLint đạt; 24 test ở năm file (có release→consumer) và ba Playwright
  analytics/preparation/practice/runtime đạt. Full check dừng ở HSK1 review stale
  đã có trước. Không push hoặc deploy.

Phát hành lại có kiểm tra idempotency:
`npx tsx scripts/demo/release-curriculum-context.mjs --apply`

Phần bên dưới ghi lại lô nhập ban đầu, trước yêu cầu phát hành tiếp theo.

Đã kiểm: TypeScript, ESLint, 11 test analytics, một test toàn lô bảo toàn nguồn,
Playwright guest so sánh hai bảng/ngày truy cập/ba viewport đều đạt.
Browser editor mở được danh sách 213 bộ và bản nháp có nút lưu.
Kiểm tra tài khoản learner qua browser còn gặp màn khôi phục tiến độ; chưa coi
đây là bằng chứng E2E tài khoản đạt. Full check có blocker HSK1 review stale từ trước.

## Chỉ số người học

Thất Trụ và Bảng Trạng Thái dùng chung `useLearnerOverview`: tiến độ Thiên Lộ,
số câu đã luyện, nghịch cảnh còn mở và tổng ngày truy cập. Bỏ thanh tương đối
theo kỹ năng có nhiều câu nhất: thanh đầy trước đây không có nghĩa thành thạo.
Số câu đã luyện không phải số câu có trong toàn bộ thư viện.

Kho hiện hành: 217 bài, 2.016 mục từ, 213 bài rich, 976 lượt hội thoại,
476 mục ngữ pháp trong bài, 1.632 câu ví dụ từ vựng khác nhau.
Không cộng các loại này thành một số câu hỏi hoặc điểm mastery.

## Lô bản nháp đã nhập vào D1 local

- 2.011 mục từ có liên kết bài học; 5 mục chưa có liên kết được giữ nguyên ngoài lô.
- 213 bộ luyện ngữ cảnh, giữ liên kết lesson/vocabulary và bản nguồn rich đầy đủ.
- 6.019 vị trí bài luyện diễn đạt theo nghĩa Việt, trên 1.620 câu mẫu khác nhau.
  Câu mẫu được tái sử dụng từ nguồn hiện hành, không phải 6.019 câu mới nguyên bản.
- Tổng 2.224 bản nháp thuộc editor demo. Tìm `curriculum-context` hoặc
  `curriculum-word` trong Xưởng Biên Tập. Đã mở bộ bài trong UI, có nút lưu.
- `humanReviewed:false`; năm bước AI review chưa được đánh dấu đạt.
  Lô này chưa phát hành vào learner runtime; không thay thế lesson đang học.

Importer dùng repository tạo draft, có backup tại `.wrangler/demo-backups`,
transaction, rehearsal rollback, kiểm tra khóa ngoại và nhập lại không trùng.
34 bảng ngoài nội dung có fingerprint giữ nguyên. Không ghi đè bản editor đã sửa.

Chạy kiểm tra nguồn/liên kết:
`npx vitest run --config scripts/demo/studio-import.vitest.config.mjs`

Chạy thử không lưu:
`npx tsx scripts/demo/import-curriculum-studio.mjs`

Nhập local:
`npx tsx scripts/demo/import-curriculum-studio.mjs --apply`

HSK0 giữ 4/4; HSK1–4 giữ 40/40/55/78 rich (213/213). Không reset tiến độ,
FSRS, lỗi, phiên học, tài khoản hoặc outbox. Chờ người dùng test; không push/deploy.

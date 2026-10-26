# Editor / Admin · Thiên Văn

Ngày 07/10/2026 · IN-REVIEW. Người dùng chọn mẫu C trong
`design-explorations/2026-10-07-editor-admin/`. Chưa USER-ACCEPTED.

## Phạm vi bản để thử

Shell xanh đêm, vàng đồng, ảnh thiên văn nguyên bản, hành động chính màu cyan,
vùng nhập sáng. Sidebar desktop, menu gọn trên mobile; giảm chuyển động theo
thiết lập thiết bị. Form chia khu vực cuộn để giữ thao tác chính trong màn hình.

Editor giữ các loại nội dung hiện có. Bản nháp chia Nội dung / Xem trước /
Kiểm tra & duyệt / Lịch sử; chuyển tab không tháo form đang soạn. Kho học liệu
có đường dẫn theo khu vực học, ảnh/âm thanh và hướng dẫn phát hành.

Admin giữ chín trang: Tổng quan, Công việc, Kho nội dung, Duyệt & phát hành,
Tài khoản & quyền, Phiên đăng nhập, Cấu hình, Nhật ký, Premium thử nghiệm.
Tài khoản dùng danh sách + chi tiết, tìm theo tên/username/email. Premium chia
năm nhóm, giữ các form và cổng xác minh hiện có.

## Đối chiếu quản lý với phía người học

| Khu vực | Công cụ hiện có / thay đổi lần này |
| --- | --- |
| Thiên Lộ | Soạn bài, ngữ pháp, giao tiếp; quy trình kiểm tra, duyệt độc lập, phát hành giữ nguyên. |
| Tàng Tự Khố | Mục từ, Pinyin, nghĩa, ví dụ, chữ liên quan; có đường dẫn trong Kho học liệu. |
| Thần Văn Lô | Hồ sơ Hán tự và nguồn nét; không tự bật nét thiếu provenance. |
| Vạn Âm Điện | Nội dung phát âm/giao tiếp; không biến TTS hoặc transcript thành điểm phát âm. |
| Vạn Quyển Các | Bài đọc ngắn và sách. Đã bổ sung mở lại sách bằng đúng editor, cập nhật cùng revision có rowVersion, giữ series/chương và nguồn; chọn bìa từ kho; chuyển chương/bước giữ nội dung; bản xem trước sách riêng. Kiểm bìa/nền trong kho trước gửi duyệt. |
| Phòng Luyện Đề | Câu hỏi và ghép bộ đề; giữ luồng review/phát hành hiện hành. |
| Ôn, lỗi, chỉ số kỹ năng | Biên tập nội dung nguồn; lịch ôn và tiến độ cá nhân là dữ liệu suy ra, không có form sửa mastery thủ công. |
| Tài khoản / Premium | Giữ role, khóa tài khoản, phiên, ví, gói/giá, quyền, hỗ trợ/hoàn và lịch sử giao dịch. Chưa mở thanh toán thật. |

## Khoảng trống còn thật

- **Khảo Nghiệm Căn Cơ:** `src/data/assessment.ts` có ngân hàng, phiên bản đề và
  scoring riêng. `exam_item` trong Studio không sửa ngân hàng đó. Đã sửa mô tả
  gây hiểu nhầm trong catalog; chưa có trình biên tập/phát hành ngân hàng đầu
  vào theo phiên bản. Cần vertical slice riêng để giữ kết quả cũ và gate evidence.
- **Cấu hình:** `maintenance_banner`, `default_daily_minutes`,
  `content_preview_enabled` hiện chỉ có repository/admin/tests, chưa có consumer
  người học. Trang Cấu hình đã nói rõ ba mục chưa tác động đến người học.
  `account_registration_mode` có consumer thật. Chưa thay runtime người học.
- Bản xem trước hiển thị **bản đã lưu**, không phải live preview của form chưa
  lưu. Preview sách cho phép đọc chương/Pinyin/nghĩa, không ghi tiến độ.

## Kiểm chứng và bảo toàn

- Typecheck, ESLint phạm vi thay đổi, test route/repository/UI; browser dùng
  context riêng với tài khoản demo, không lưu bản nháp hoặc sửa quyền/giá/ví.
- Build cuối qua; gate Premium kiểm 202 JS assets, không có 192 marker nội dung
  được bảo vệ. Ngưỡng dung lượng toàn ứng dụng có cảnh báo advisory như quy định
  trong TESTING.md, không phải đo một lượt mở trang.
- Browser kiểm CTA trong viewport 1440×900, 390×844, 812×375, chuyển tab/chương,
  mở kho ảnh, chọn tài khoản và chuyển các nhóm Premium.
- `npm run check` dừng ở manifest digest của `src/lib/exerciseGeneration.ts`
  và `src/server/authoritativeItemBank.ts`. Hai tệp không được sửa trong lượt
  này; không tự cập nhật hash để làm gate xanh.
- Dev Vinext/worker thỉnh thoảng báo `Network connection lost` (500); tải lại
  phục hồi. Không coi các lần đó là hành trình thành công.
- Không migration nội dung, không xóa `.wrangler`, không sửa tiến độ browser,
  owner/reset, FSRS, session/outbox; giữ IDs và inventory HSK0 4/4 (rich 0/4),
  HSK1–4 40/40/55/78, 213/213 rich. Không sửa `docs/reports/` hoặc `output/`.
- Asset mới có provenance tại `public/images/backoffice/PROVENANCE.md`.

Tiếp theo: người dùng thử module Editor/Admin này; chưa tuyên bố toàn bộ
khoảng trống quản trị của sản phẩm đã hoàn tất.

# Review mục tiêu hoạt động boot-1 · 15/09/2026

Phạm vi: bản nháp mục tiêu của bài Bốn thanh điệu, kế thừa 12 trang đã phát hành. Đây là AI tự rà, `humanReviewed:false`; không thay review của bản đã phát hành.

| Hoạt động | Điều thực sự kiểm tra | Giới hạn bằng chứng |
| --- | --- | --- |
| fall-check | Mô tả bắt đầu cao rồi rơi nhanh → thanh 4, phân biệt với ngang/lên/thấp | Nhận diện bằng chữ, không kiểm nghe |
| rise-check | Mô tả từ vừa lên cao → thanh 2; phân biệt thanh 1 và 4 | Nhận diện quy tắc, không đo sản xuất âm |
| transfer-check | Nhận ra dấu thanh 4 trong dà, chuyển từ âm ma sang da | Vận dụng quy tắc có mẫu trước đó; không phải recall độc lập |
| self-read | Tự đọc mā/má/mǎ/mà rồi dà và tự đối chiếu hướng, sự thoải mái, chuyển âm | Rubric tự nhận xét, không chấm phát âm |

Cả bốn liên kết `pronunciation:mandarin-tone-system`, nguồn thuộc chính boot-1. Nhãn kỹ năng mô tả chủ đề; consumer không được dùng nhãn này để biến lựa chọn chữ hoặc tự tích rubric thành evidence nghe/nói. Điểm thành thạo vẫn không tăng từ journal trang.

Đối chiếu sư phạm: hướng 55/35/214/51 trong bài là cao độ tương đối; thanh 3 có giải thích khác biệt đọc riêng/nói liền. Câu đổi âm chỉ yêu cầu nhận diện dấu, không cần biết nghĩa chữ 大. Các phương án sai giải thích hướng bị nhầm; rubric có hướng dẫn không ép giọng. Không thêm nội dung hoặc asset từ nguồn ngoài.

Điều kiện phát hành: bản nháp phải chỉ khác bản gốc ở learningTarget và metadata review; script kiểm exact document sau khi bỏ target, hash bản gốc, hash kế hoạch, hash bản nháp. Giữ revision/package cũ. Browser phải kiểm đủ bốn form mục tiêu và đáp án/feedback/rubric trong preview. Trước cập nhật release head cần giải quyết đồng bộ firstAttempt của phiên còn dùng bản cũ; hiện command mới gửi với activityVersion cũ có thể conflict, dù snapshot/queue không bị xóa.

Đây chưa phải xác nhận 461 hoạt động toàn kho đã được gán mục tiêu, chưa đủ tích hợp Nghịch Cảnh Lục/ôn, chưa chứng minh đủ HSK0–4.

## Phát hành local

Ngày 15/09/2026: revision `23f0dd27-dd36-4426-82ec-a4acb2e5b1c6` đã qua validate, submit, approve, publish và release worker. Script `scripts/demo/release-boot-activity-targets.mjs` rehearsal rollback đạt trước apply; bảo toàn 36 bảng ngoài content/audit, các head khác và package parent. Backup `.wrangler/demo-backups/before-boot-target-release-2026-09-15T09-42-42-674Z.sqlite`. Human review vẫn false.

Audit head sau phát hành: 45 bài có trang authored, 461 hoạt động, 4 có mục tiêu và 457 chưa có. Parent `955d0aac-39d1-4d51-914c-680f058fcfe8` vẫn trong immutable packages. Rehearsal repository trên D1 thật với command parent, sau khi head đã đổi: correct, duplicate cùng attemptId, revision ghi đúng parent, rollback không giữ lượt thử. Đây chưa phải hành trình browser offline qua thời điểm release.

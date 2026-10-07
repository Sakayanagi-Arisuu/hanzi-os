# Catalog luyện dùng ngữ liệu đã phát hành — 05/10/2026

IN-REVIEW; AI-assisted, `humanReviewed:false`. Đây là giao ngữ liệu cho phiên mới, không phải chứng nhận đủ HSK hoặc review người thật.

## Nội dung và consumer

Snapshot `lexical-editorial-2026.10.5` giữ 1.312 mục từ khác bản nền, lấy từ 1.315 current published vocabulary heads; ba mục không đổi không cần patch. Mỗi patch pin source revision và content digest. Không xuất nháp, không thay package foundation, không replay các release trước.

Phiên luyện local mới có marker riêng; form mới phía server dùng activity IDs/versions riêng. Nghĩa, lời giải và câu đọc được dựng từ snapshot. Catalog vẫn giữ mọi activity cũ để tiếp tục phiên cũ, chấm/outbox và xử lý Lỗi theo đúng phiên bản. Bộ âm/thanh không đổi cách đọc từ điển; adapter phát âm nhận suffix để vẫn phát đúng âm tiết được hỏi.

Ôn local dùng snapshot với presentationVersion trong metadata tự đánh giá; không thay lịch FSRS. Thẻ Ôn account mới được kích hoạt từ form mới dùng wordVersion mới. Thẻ cũ giữ version và lịch; nếu từ đã có thẻ thì không tạo thêm thẻ phiên bản khác. Consumer nhận cả hai version và đối chiếu chính xác với cardVersion. Thẻ account cũ tiếp tục dùng bản nền cùng tham khảo published sau reveal như trước; không âm thầm đổi target của thẻ cũ.

Nói chọn câu từ snapshot, activity ID và browser-transcript evidence version riêng. Giữ reward identity hiện có để không phát thưởng lần hai do thay ngữ liệu. Đây vẫn là TTS tổng hợp/tự đối chiếu/transcript, không tạo điểm phát âm native hoặc mastery nói.

Nguồn gốc vẫn là vocabulary documents trong Xưởng. Snapshot là derivative immutable cho chấm và khôi phục; sau một lần biên tập/phát hành khác phải tạo snapshot/version mới, không ghi đè bản này.

## Validation nội tại và bảo toàn

- SHA word catalog: `sha256:5096df239264d7ad56d63beaf312ab2e5aa55032beac4be8f21ebdc7d3e552da`.
- Validator read-only đối chiếu 1.312 source revisions đã release; 217 bài × hai script chữ. 121.398 presentation candidates khớp answer bank; 868 form resume local cũ/mới hợp lệ. Catalog và lựa chọn cũ bằng baseline Git HEAD trước sửa. Ba stored started forms của foundation hiện hành hợp lệ. Hai started forms package foundation-2026.08.5 không thuộc item bank hiện hành: giữ nguyên, không tuyên bố đã khôi phục package lịch sử.
- Rehearsal thật qua repository open/attempt/submit cho sáu bài, có chấm thẻ Ôn version mới. 405 thẻ có trước giữ nguyên, không tạo thẻ trùng từ; ROLLBACK giữ fingerprint 51 bảng và FK. Không có kết quả giả được lưu.
- Backup: `.wrangler/demo-backups/before-lexical-editorial-round107-rehearsal-2026-10-05T06-17-24-468Z.sqlite`.
- Rehearsal đầu không có thẻ mới vì năm bài demo đã có thẻ; không sửa ngày đến hạn để ép queue. Lần cuối thêm bài HSK2 đủ điều kiện có 21 từ chưa có thẻ. Queue limit có thể ưu tiên thẻ cũ; grade thẻ mới được đối chiếu trực tiếp với due card thật trong transaction rồi rollback.
- Không browser/timed learner/parity Xưởng/Vitest/typecheck/full check. Diff-check targeted đạt; không stage/commit/push/deploy. Local Vinext PID7904 nghe tại 127.0.0.1:3000; không migration/reset.

Giữ 217 bài 4/40/40/55/78, stable lesson/word/character IDs, tiến độ, FSRS, lỗi, saved items, session, reset scope, owner và outbox. Không đụng draft editor mới/Premium/admin/docs/reports/output. Chưa hoàn tất nhóm đối chiếu cuối.

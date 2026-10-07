# Quy chiếu, so sánh và dựng câu · bảy bài HSK2

21/09/2026 · AI self-review · humanReviewed:false. Phạm vi reference-description-comparison-01…04 và sentence-reconstruction-01…03. Đã phát hành local: 152 trang, 59 hoạt động.

## Rà năm mặt

1. Mandarin: 每位/两包 giữ đơn vị; 次 không đổi thành 年; 比 không suy 最 hoặc phủ định tuyệt đối. 的 thay danh từ chỉ khi đã nêu đối tượng; 饭做好了 không xác định người nấu. Số chênh 23−20=3, 170−160=10; transfer 22−18=4, 173−165=8. 36 row được dạy riêng, theo source ID hiện hành.
2. Pinyin: 红的/白的 đọc de; 给 gěi, 得/地 de theo vị trí; 来/去 không bổ sung nghĩa từ ảnh nền. Model tự viết có đủ Hanzi/Pinyin/Việt. Vai Mai 梅, Lan 兰, Long 龙 là tên hư cấu. Các câu từ trước theo ID phân biệt hai nghĩa 过 và 着 trạng thái; tay 手 không dùng ví dụ đồng hồ 手表.
3. Việt: 红茶 là trà đen; 3 người×2 gói=6 gói không cho số lá. 从8:00到17:00 là hai mốc, không giả số giờ lao động không nghỉ. Sĩ số hơn 30/hơn 20 giữ ước lượng, không tự đổi thành 35/25.
4. Sư phạm: bảy tình huống và transfer riêng. Ba bài dựng câu có giải thích trước chín order tasks. Prompt cố định chủ đề/vị trí thời gian để một đáp án trong order không bị hiểu thành quy tắc tiếng Trung chỉ có một trật tự; phản hồi chấp nhận tồn tại các thứ tự khác theo ngữ cảnh. Tự viết dùng rubric, không exact-match hoặc điểm mastery. Bài thứ ba đặt 我觉得 trước đánh giá sở thích để tránh khái quát cá nhân thành sự thật khách quan.
5. Nguồn: giữ ID/prerequisite/vocabulary/task/grammar/topic; sơ đồ là dữ liệu sửa được trong Xưởng. Toàn bộ words có câu đủ dài/Pinyin/Việt; chưa cập nhật từ điển nền theo lô. Không đụng package đã pin, kết quả cũ hoặc dữ liệu người dùng.

## Giới hạn

Chưa có media riêng đầy đủ; campus art chỉ trang trí. Sơ đồ/bảng chứa dữ kiện, không bắt suy từ tranh. Chưa có audio bản ngữ mới. Phần từ hỗ trợ không chứng minh đã học độc lập; số trang/hoạt động không chứng minh đủ HSK. Chỉ phát hành local sau validator, review binding, rehearsal, browser; không USER-ACCEPTED.

## Kết quả giao web

Sáu tests nội dung/helper đạt; Typecheck/ESLint/diff check đạt. Import rehearsal/apply bảo toàn 37 bảng, release rehearsal/apply bảo toàn 36 bảng/FK. Studio cả bảy bài exact document, sơ đồ, lựa chọn, cloze và sắp xếp sai→sửa đúng đạt 1.1 phút. Learner toàn lô exact runtime/prerequisite/answer/reload/transfer, sắp xếp rồi reload giữ thứ tự đạt 1.6 phút. Lượt đầu web dừng; sau khởi động lượt learner đầu lỗi vinext Network connection lost ở bài cuối. Kiểm lại toàn lô đạt, không tăng timeout/nới prerequisite/reset tài khoản.

Backup `.wrangler/demo-backups/before-authored-thien-lo-batch-release-2026-09-21T10-43-31-660Z.sqlite`. Local 78 authored, 633 activities, 176 có target/457 thiếu; không suy đủ mastery hoặc USER-ACCEPTED.

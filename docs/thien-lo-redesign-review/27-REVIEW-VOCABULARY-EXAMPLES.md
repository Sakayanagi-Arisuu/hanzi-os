# Ví dụ dùng chung cho bài học và Tàng Tự Khố

20/09/2026 · AI self-review · humanReviewed:false.

Phạm vi bốn mục từ nhập Xưởng hiện có: hsk-vocab-00480 (有时), 00351 (过), 00490 (着), 00477 (游). Chỉ thay ví dụ Trung/Pinyin/Việt bằng ví dụ trong các bài authored đã rà; giữ nghĩa, cách đọc, stable key, ID từ và liên kết bài nguồn.

- Mandarin: 有时 nói đôi khi, không dùng 有时间 để minh họa. 没去过 phủ định trải nghiệm. 拿着球 là trạng thái cầm bóng, không dùng 着急 khác âm/nghĩa. 在水里游 minh họa bơi, không lấy 旅游 làm ví dụ cho nghĩa đó.
- Pinyin: guo và zhe nhẹ trong câu đã chọn; yóu là bơi; 有时 yǒushí. Các câu có Pinyin/Việt trọn vẹn và giữ nghĩa đúng ngữ cảnh.
- Sư phạm: mỗi ví dụ có hành động hoặc tình huống, không chỉ lặp headword. Đối chiếu với review 24/26 và manuscript tương ứng; không tạo điểm mastery từ việc đọc ví dụ.
- Liên kết: projection phải xác nhận đúng sourceVocabularyIds và các bài có chứa từ. Bản Xưởng dùng mã riêng nhưng khi ghép vào từ điển giữ ID từ gốc, không tạo mục trùng; không ghép các mục từ độc lập chỉ vì giống Hanzi.
- Phát hành: script giới hạn đúng bốn mã, từ chối nếu biên tập viên đã đổi bản nháp; rehearsal rollback trước apply, backup trước apply, fingerprint dữ liệu learner và kiểm FK. Không sửa package nền đã pin hoặc các đáp án trong đề đã phát hành.

Giới hạn: bản sửa này cập nhật ví dụ qua vocabulary projection; các consumer còn trực tiếp dùng ví dụ từ package nền cần audit riêng. Chưa được gọi là đồng bộ toàn bộ FSRS/assessment từ bốn mục từ này.

Đã phát hành local: rehearsal/apply bốn mục từ, 36 bảng bảo toàn, FK đạt. Browser 25.3s xác minh runtime thật, tám đường dẫn (bốn ID gốc + bốn stable key Xưởng), ví dụ, liên kết bài và lưu bằng ID gốc qua reload. Typecheck/ESLint đạt. Không đổi progress tài khoản; thao tác lưu chỉ ở guest Playwright mới.

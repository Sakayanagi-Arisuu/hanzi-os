# Nhận diện chữ HSK1 — hình chữ là nội dung thị giác

29/09/2026 · AI-assisted self-review · `humanReviewed:false`.

Phạm vi: `characters-1..15`, đúng hai trang context/visual mỗi bài. Context chỉ có mục tiêu đọc chữ, không có tình huống hội thoại nên ảnh khuôn viên chung không giúp giải thích. Chuyển context sang focus. Trang visual có đúng một bảng đối chiếu hình chữ, chuyển split sang focus để tránh giới hạn cột. Không sinh tranh cho hình chữ vì font và node sơ đồ có thể kiểm, sửa chính xác trong Xưởng.

Các nhóm đã rà: 大/太 (chấm), 见/贝 (phần chân), 妈/吗 (trái 女/口), 你/您 (心), 他/她/它 (hình và đối tượng), 再/在 (đồng âm khác từ), 白/百 (nét ngang), 日/目 (nét trong khung), 上/下 (vị trí nét), 包/句 (phần trong), 买/卖 (十), 衣/农 (phần đầu và bên trong), 坐/做 (đồng âm khác từ), 本/木 (nét ngang gần gốc), 字/学 (phần trên). Giữ nguyên lời giải giới hạn đây là quan sát hình, không suy etymology hay thứ tự nét. Giữ 246 liên kết chữ, mọi hoạt động/rubric/target và correction 做饭 đã phát hành.

Các trang từ mẫu, nhận diện, gọi lại, vận dụng và tự kiểm không đổi: bản thân chữ, từ và ví dụ là phương tiện dạy học; chưa thêm ảnh trang trí. Không chứng nhận người học viết tay chỉ vì gõ được chữ. Đây là quyết định trình bày có phạm vi, không phải kết luận toàn bộ 217 bài đủ media hoặc mastery.

Plan pin head/hash nguồn; guard từ chối illustration hoặc cấu trúc editor đã đổi. Phát hành revision mới qua repository/worker, giữ package cũ cho phiên đang học. Xưởng có sẵn lựa chọn focus và trình sửa node nên không tạo dạng bài chỉ code mới soạn được.

Kết quả: hai regression tests, typecheck và targeted ESLint đạt. Rehearsal rollback rồi apply 15 revision bảo vệ 43 bảng, immutable parent, heads khác và FK. Browser Xưởng local 3000 kiểm đủ 30 trang: focus, không còn cảnh chung, chính xác từng nhãn chữ; 15 sơ đồ ở 375 px hiển thị và không tràn ngang. Audit D1: 217 bài giữ nguyên, 35 bài có page art, 110 scene dùng ảnh chung. Chưa kiểm riêng learner resume hoặc thao tác sửa/lưu node trong lượt này. Snapshot authoring/generator lịch sử giữ nguyên; khi tái soạn phải áp dụng `applyCharacterVisualDecision` vào bản mới trước review/release, không phát lại snapshot cũ thay current head.

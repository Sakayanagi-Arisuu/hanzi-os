# Thiên Lộ · khôi phục nghe–chép và đọc ghi chú · 01/10/2026

IN-REVIEW; browser verification, không phải evidence thành thạo người học.

Kiểm `hsk2-dictation-lesson-01` và `hsk3-personal-life-narratives-identity-transactions` trên web local bằng hai guest mới cô lập. Chỉ các context kiểm thử nhận fixture prerequisite để mở đúng bài; không sửa guest/tài khoản thật. Document kỳ vọng lấy từ release head D1 hiện tại, không dùng snapshot manuscript cũ đã thay ảnh/target.

- Nghe–chép: gọi nút giọng tổng hợp, nhập nháp, khai báo Pinyin/IME, mở/thu mẫu. Reload giữ nháp và trạng thái đã dùng hỗ trợ, mẫu vẫn thu; IndexedDB giữ everRevealed, không biến việc thu mẫu thành chưa xem đáp án. Không kiểm chất lượng âm thanh hoặc coi việc click nghe là evidence nghe hiểu.
- Đọc: chọn đoạn 2 làm bằng chứng, ghi chú và mở Pinyin. Reload giữ cả ba; document snapshot khớp bản phát hành. Chọn đoạn chỉ là ghi chú, không chấm đọc hiểu khách quan.
- Cả hai: footer/CTA nằm trong viewport ở 375×812 và 812×375, không tràn ngang. Đây không phải kiểm đủ mọi viewport/mọi dạng bài hay mô phỏng đổi revision đang học.

Lượt đầu reload dừng lâu ở trạng thái tải nội dung khi gate rộng cùng chạy; lượt chạy lại cả hai đạt. Không coi runtime/network đã được sửa. Script `scripts/content/smoke-learner-modalities.ts` giữ assertions, không bỏ kiểm khi tải lỗi. Các kiểm còn lại: timed learner, chuyển revision khi có phiên dở, offline và các mục scope v0.2.

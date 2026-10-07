# Khảo Nghiệm Căn Cơ · Ngọc Điện

Trạng thái: **IN-REVIEW** · 06/10/2026. Chưa có nghiệm thu người dùng.

## Hành trình

- Mới bắt đầu: vào HSK0. Đã từng học: chọn HSK1–4 gần năng lực tự khai.
- Mỗi tầng gồm 12 câu: 4 đọc hiểu, 4 từ vựng, 4 ngữ pháp. Chọn đáp án rồi xác nhận; “Chưa biết” là một câu trả lời hợp lệ. Đáp án và lời giải chỉ hiện sau câu cuối.
- Từ 80% tổng và từng kỹ năng từ 60%: mời thử tầng trên; có thể nhận tầng vừa làm. Từ 60% tổng: nhận tầng đang khảo sát. Thấp hơn: xác minh tầng dưới; dưới HSK1 gợi ý HSK0.
- Khi đã đi xuống từ tầng trên, không mời quay lên tầng đó ngay sau kết quả tốt ở tầng dưới.
- Kết quả chỉ định hướng, chưa được hiệu chuẩn độc lập. Không đo nghe, nói, viết; không tạo mastery, XP hoặc miễn tiên quyết. Bộ câu hiện hành vẫn `humanReviewed: false`.

## Phiên dở và dữ liệu

- Khóa lưu riêng theo owner và form; không nhận phiên toàn cục cũ làm phiên của hồ sơ đang mở.
- Hạn 7 ngày tính từ lúc bắt đầu, không gia hạn khi mở lại.
- Chụp tiến trình học lúc bắt đầu: state, owner/reset, phiên bài học IndexedDB và projection tài khoản. Đọc lại trước khi ghi câu và áp dụng kết quả.
- Nếu đã học thêm, đổi hồ sơ, reset, hết hạn hoặc thiếu thông tin đối chiếu: giữ bản cũ, yêu cầu lượt mới. Bản lỗi không bị xóa âm thầm.
- Tạo lượt mới lưu bản trước vào lịch sử, ghi lượt mới thành công rồi mới chuyển vào câu hỏi. Không tiến câu khi ghi câu trả lời thất bại.
- Người đã có bài học, lịch ôn hoặc phiên học giữ nguyên starting level và bài được đề xuất. Khảo sát lại chỉ bổ sung gợi ý củng cố. Kết quả đã nhận đóng phiên để không được nhận lại.
- Completion, streak, saved, FSRS, mistakes, lesson sessions và outbox giữ nguyên. Không migration hoặc sửa lesson/vocabulary IDs.

## Giao diện

Giữ header/sidebar HANZI.OS; nền xanh ngọc tối, mint cho hành động chính, vàng cho điểm nhấn. Dùng mockup v2 và artwork AI nguyên bản có provenance. Header và CTA của phiên nằm trong viewport; nội dung giữa cuộn. Radio hỗ trợ bàn phím, focus rõ, mobile có nút tối thiểu 44px.

## Phạm vi kiểm tra

Vitest kiểm hạn/owner/tiến trình, bảo toàn dữ liệu, resume, policy và IndexedDB. Browser kiểm chọn tầng, chọn rồi xác nhận, reload tiếp câu, kết quả, nhận hướng đi và phiên cũ sau học thêm. Xem checkpoint để biết gate đã chạy và giới hạn còn lại; không coi tài liệu này là bằng chứng nghiệm thu.

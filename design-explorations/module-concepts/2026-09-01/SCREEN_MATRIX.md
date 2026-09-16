# HANZI.OS — Ma trận concept UI cho sáu module

Ngày lập: 2026-09-01

Đây là bộ phương án thiết kế để người dùng duyệt, chưa phải asset production và
không thay đổi UI đang chạy. Mỗi màn hình bên dưới có 10 hướng A–J. Loading,
error và permission notice là trạng thái của cùng màn, không bị đếm thành trang
riêng; các thay đổi lớn về mục tiêu/tác vụ được tách thành màn riêng.

## Mười hướng mỹ thuật dùng xuyên bộ

| Mã | Hướng | Đặc trưng |
|---|---|---|
| A | Ngọc Lệnh | ngọc bích, bảng lệnh hệ thống, khung cắt góc sắc |
| B | Thiên Văn Đài | lam–cyan, quỹ đạo và tinh đồ, HUD tròn |
| C | Kim Ấn | vàng cổ trên hắc ngọc, phù ấn và kim tuyến kiềm chế |
| D | Xích Kiếp | chu sa–hổ phách, vết nứt năng lượng, dùng cho thử thách |
| E | Tử Phủ | tím chàm, tinh vân, chiều sâu không gian |
| F | Ngũ Hành | năm sắc có hệ thống, mỗi sắc chỉ mã hóa một loại dữ liệu |
| G | Sơn Hà Chiếu | thủy mặc sơn thủy được chiếu thành hologram |
| H | Thiên Cơ Khí | cơ quan đồng–ngọc, vòng máy và bánh răng phù văn |
| I | Công Hội Mạo Hiểm | bảng nhiệm vụ, huy hiệu cấp bậc, bản đồ hành trình |
| J | Hư Không Tinh Bàn | tối giản cao cấp, tinh bàn nổi, nhiều khoảng thở |

## 1. Ký Ức Trận — 4 màn × 10 = 40 mẫu

1. `MEM-01` Sảnh Ký Ức: lịch ôn, số thẻ đến hạn, dự báo 7 ngày, CTA bắt đầu.
2. `MEM-02` Truy Hồi: mặt trước thẻ; từ/câu hỏi lớn; một CTA hiện đáp án.
3. `MEM-03` Đối Chiếu: đáp án, nghĩa, câu ví dụ, dấu hint/reveal và 4 mức FSRS.
4. `MEM-04` Kết Trận: tổng kết, thẻ đã xử lý, thẻ còn lại, đồng bộ/pending.

## 2. Nghịch Cảnh Lục — 4 màn × 10 = 40 mẫu

1. `REM-01` Bản Đồ Điểm Yếu: cụm lỗi theo kỹ năng/nguồn, ưu tiên hôm nay.
2. `REM-02` Tái Đấu: một câu cần sửa, bộ lọc gọn và tiến độ phiên.
3. `REM-03` Giải Lỗi: đúng/sai, nguyên nhân, quy tắc, ví dụ đối chiếu, CTA tiếp.
4. `REM-04` Hóa Giải: lỗi đã xử lý, lỗi còn vướng, đề xuất đường học tiếp theo.

## 3. Vạn Âm Điện — 6 màn × 10 = 60 mẫu

1. `VOICE-01` Sảnh Cộng Hưởng: chọn bài đã học, nhiệm vụ ngày, thiết bị/fallback.
2. `VOICE-02` Khai Nhãn: nhìn từ trọng tâm, Pinyin, nghĩa, nghe âm mẫu.
3. `VOICE-03` Thính Âm: nghe cả câu, nhịp câu và vùng từ trọng tâm.
4. `VOICE-04` Xuất Chiêu: thu âm, waveform, trạng thái microphone, dừng/bỏ qua.
5. `VOICE-05` Giám Âm: báo cáo âm học, từ yếu, thanh điệu, giới hạn bằng chứng.
6. `VOICE-06` Cộng Hưởng Hoàn Tất: kết quả phiên, XP, luyện lại hoặc chọn bài.

## 4. Thần Văn Lô — 8 màn × 10 = 80 mẫu

1. `GLYPH-01` Sảnh Luyện Chữ: mạch đang dở, chữ đang vướng, luyện nhanh/tự chọn.
2. `GLYPH-02` Kho Chọn Chữ: tìm, lọc HSK, chọn 3–5 chữ, CTA khai lò.
3. `GLYPH-03` Nhìn Xuyên Cấu Trúc: bộ thủ, phần thân, tái hợp chữ.
4. `GLYPH-04` Đoán Nét: chọn hướng nét then chốt và nhận phản hồi.
5. `GLYPH-05` Viết Theo Mẫu: canvas thứ tự nét, trợ giúp có ghi nhận.
6. `GLYPH-06` Tự Viết: recall không mẫu; lối thoát viết giấy/bàn phím.
7. `GLYPH-07` Văn Cảnh: chọn đúng chữ trong từ/câu thực tế.
8. `GLYPH-08` Mạch Chữ Hoàn Thành: kết quả, chữ cần luyện lại, đường quay về bài.

## 5. Tàng Tự Khố — 4 màn × 10 = 40 mẫu

1. `LEX-01` Khám Phá: ô tìm kiếm, lọc, danh sách kết quả, mục gần đây.
2. `LEX-02` Hồ Sơ Mục Từ: chữ, Pinyin, nghĩa, lượng từ, ví dụ, từ liên quan.
3. `LEX-03` Tra Cứu Theo Bài: phạm vi bài hiện tại và thử thách tra ít nhất 3 từ.
4. `LEX-04` Ngọc Giản Đã Lưu: bộ từ đã lưu, nhóm theo mục tiêu và CTA ôn.

## 6. Cấu Hình Hệ Thống — 5 màn × 10 = 50 mẫu

Màn dài hiện tại được thay bằng kiến trúc 5 trang ngắn; điều hướng cục bộ luôn
hiện, thiết lập được tự động lưu và mỗi trang chỉ có một hành động chính nổi bật.

1. `SYS-01` Tổng Quan: danh tính, cấp hệ thống, trạng thái sync, lối vào 4 nhóm.
2. `SYS-02` Hành Trình: tên, Thiên Mệnh, thời lượng, căn cơ, hệ chữ.
3. `SYS-03` Hiển Thị & Trợ Năng: light/dark, tương phản, motion, cỡ chữ.
4. `SYS-04` Âm Thanh & Giọng: loa, giọng tổng hợp, tốc độ, nghe thử và microphone.
5. `SYS-05` Tài Khoản & Dữ Liệu: danh tính, nơi lưu, export/import, đăng xuất và vùng nguy hiểm thu gọn.

## Ràng buộc chung cho mọi ảnh

- Desktop 16:9, không có khung trình duyệt; giữ rail trái và status bar của
  HANZI.OS nhưng không sao chép bố cục nội dung cũ.
- UI sản phẩm khả thi bằng HTML/CSS/SVG, không phải concept art giả giao diện.
- Chữ Việt ngắn, phân cấp rõ, một CTA chính, tương phản WCAG AA.
- Tối đa 2–3 điểm phát sáng có chủ đích; không phủ neon/glass lên mọi khối.
- Lore tu tiên/mạo hiểm giả là lớp thẩm mỹ; tác vụ phổ thông vẫn đọc hiểu ngay.
- Motion được minh họa bằng trạng thái tĩnh và phải có bản reduced-motion khi triển khai.
- Không logo bên thứ ba, không watermark, không dữ liệu backend/ID/hash lộ ra UI.

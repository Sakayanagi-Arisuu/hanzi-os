# HANZI.OS — Bộ concept 6 module

Trạng thái: **IN-REVIEW**
Phạm vi: 31 màn hình × 10 hướng mỹ thuật = **310 concept**. Sáu ảnh trong
`current/` chỉ là ảnh chụp hiện trạng dùng làm mốc đối chiếu, không tính vào 310
concept. Bộ này phục vụ duyệt thiết kế; chưa thay đổi giao diện sản phẩm.

Mở [`index.html`](./index.html) để lọc theo module, màn hình và hướng A–J, sau đó
bấm vào ảnh để xem toàn màn hình và dùng phím mũi tên để chuyển mẫu.

## Cấu trúc

| Module | Màn hình | Concept |
|---|---:|---:|
| Ký Ức Trận | 4 | 40 |
| Nghịch Cảnh Lục | 4 | 40 |
| Vạn Âm Điện | 6 | 60 |
| Thần Văn Lô | 8 | 80 |
| Tàng Tự Khố | 4 | 40 |
| Cấu Hình Hệ Thống | 5 | 50 |
| **Tổng** | **31** | **310** |

Danh sách chức năng của từng màn nằm trong
[`SCREEN_MATRIX.md`](./SCREEN_MATRIX.md).

## Hướng A–J

- **A — Ngọc Lệnh:** hắc ngọc, ray ngọc bích, cạnh cắt sắc.
- **B — Thiên Văn Đài:** lam–cyan, quỹ đạo, tinh đồ và HUD quan trắc.
- **C — Kim Ấn:** hắc ngọc, vàng cổ, phù ấn kiềm chế.
- **D — Xích Kiếp:** chu sa, hổ phách và cảm giác vượt thử thách.
- **E — Tử Phủ:** tím chàm, tinh vân và chiều sâu huyền cảnh.
- **F — Ngũ Hành:** màu ngũ hành mang ý nghĩa theo trạng thái.
- **G — Sơn Hà Chiếu:** light mode ngà khoáng, thủy mặc và ngọc nhạt.
- **H — Thiên Cơ Khí:** cơ quan đồng–ngọc, vòng máy và ray khắc.
- **I — Công Hội Mạo Hiểm:** sổ nhiệm vụ, huy hiệu và dấu mốc hành trình.
- **J — Hư Không Tinh Bàn:** tối giản, tinh bàn và nhiều khoảng thở.

## Lưu ý QA trước khi triển khai

- Ảnh AI là tài liệu **art direction và bố cục**, không phải nguồn sự thật cho
  nội dung. Toàn bộ chữ, số liệu và trạng thái phải lấy từ runtime đã kiểm duyệt.
- Một số mẫu `LEX-02` minh họa bộ thủ/nguồn gốc chữ do AI suy diễn. Không được
  đưa các giải thích đó vào sản phẩm trước khi biên tập viên học thuật duyệt.
- Trong `LEX-03`, “Đã gặp” chỉ là bằng chứng đã tiếp xúc. Khi triển khai dùng icon
  lịch sử/trung tính, không dùng dấu check khiến người học hiểu nhầm là đã thành thạo.
- Hint, reveal, phiên đã gặp và speech-to-text không tự tạo mastery. Giọng trình
  duyệt phải được ghi rõ là âm tổng hợp; không gọi là audio bản ngữ.
- Các mẫu light mode G dùng nền ngà khoáng thay vì trắng tinh; vẫn phải kiểm tra
  WCAG AA, focus, touch target 44×44 px và `prefers-reduced-motion` khi code.
- Mọi thao tác reset/xóa dữ liệu cần xác nhận, nêu đúng phạm vi và bảo toàn dữ
  liệu ngoài phạm vi đã chọn.

## Cách chốt

Có thể chốt một hướng xuyên module, hoặc phối hợp theo màn. Cú pháp ngắn gọn:
`MEM-02 B`, `VOICE-04 H`, `GLYPH-05 A`, `LEX-01 G`, `SYS-03 G`.
Nếu chốt phối hợp, ưu tiên giữ cùng typography, spacing và shell; chỉ đổi vật liệu,
màu nhấn và motif để tránh cảm giác sáu sản phẩm rời rạc.

# Nghịch Cảnh Lục · Thiên Văn Đài

Trạng thái: IN-REVIEW · 10/09/2026. Người dùng chọn bộ B Thiên Văn Đài.

## Thay đổi

- Tinh đồ DOM/SVG với quỹ đạo, tâm tổng dấu vết và mọi kỹ năng có dữ liệu.
- Danh sách tối đa năm lỗi giữ thứ tự repository; nguồn và biểu đồ bảy ngày
  dùng projection hiện hành. Tổng là số lần sai tích lũy, không phải mastery.
- Màn luyện dùng đáp án hai cột, khung giải thích có chiều sâu và CTA cố định.
- Nền tinh vân riêng, xanh navy/cyan/ngọc. Chuyển cảnh ngắn, không animation
  trang trí liên tục; tôn trọng prefers-reduced-motion.

## Asset và provenance

## Kiểm tra 10/09/2026

- Typecheck, targeted ESLint, 3 file / 13 Vitest đạt (gồm đủ bảy kỹ năng và empty state).
- Browser account demo đi qua Map → Tái đấu → Giải lỗi → Hóa giải → Luyện tiếp.
  Kiểm tra nghĩa, Pinyin, tự nhập chữ, đáp án sai; cả năm lượt dùng gợi ý và
  tổng kết giữ cả năm lỗi luyện lại, không ghi thành tự nhớ độc lập.
- Mobile 375×812: không tràn ngang, CTA luyện/summary nằm trên thanh điều hướng.
  Laptop và desktop: kiểm chart, danh sách, khung trả lời và giải thích.
- Full `npm run check` dừng tại lỗi có sẵn ngoài module:
  `content/review/hsk1-level-batch-local-study-review.json is stale`.
- Không sửa nội dung/ID, reset D1, FSRS hoặc browser storage. Lượt smoke ghi
  năm attempt có gợi ý vào tài khoản demo qua API hiện hành; không xóa dữ liệu.
  Inventory HSK0 4/4 và HSK1–4 rich 213/213 giữ nguyên.

`public/rem-celestial-nebula-v1.png` tạo bằng image_gen tích hợp ngày 10/09/2026.
Ảnh trang trí nguyên bản, không chứa dữ liệu người học hay chữ; SVG/HTML giữ
toàn bộ nội dung và thao tác. Không phải asset hoặc nội dung ChineseSkill.

Prompt: Use case stylized-concept. Create an original premium celestial observatory website background, landscape 1536x1024. Deep midnight navy cosmic sky, delicate sparse blue-white stars, subtle teal nebula wisps drifting diagonally, a luminous misty blue halo in lower left with fine faint astronomical arcs, dramatic depth and restrained luxurious sci-fi fantasy atmosphere. Right half and top must remain very dark calm navy for readable interface panels. Crisp pinpoints, soft atmospheric light, not a busy dense grid. No text, numbers, letters, symbols, UI panels, planets, characters, buildings, borders or watermark. This is a backdrop only; functional star map and icons will be drawn in HTML/SVG. Color palette midnight #030c19, sapphire #123d60, icy cyan #78dcf4, very subtle jade. Avoid red and purple.

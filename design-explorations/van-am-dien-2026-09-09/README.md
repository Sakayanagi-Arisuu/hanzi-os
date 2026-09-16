# Vạn Âm Điện — ba hướng thử nghiệm, chưa duyệt

Ngày 09/09/2026. Tạo bằng built-in image_gen, không dùng API/CLI fallback.
Mỗi board gồm chọn bài, luyện nói, phản hồi. Đây là ảnh ý tưởng, không phải
giao diện đã triển khai hoặc bằng chứng chức năng. Không dùng chữ, câu học,
đường thanh, logo tự sinh trong ảnh làm nội dung production. Ảnh có sai khác
chữ giản/phồn thể, Pinyin và đường thanh; cần lấy dữ liệu canonical khi code.

- A-cong-huong-ngoc.png: ngọc/jade, vòng cộng hưởng quanh microphone.
- B-pho-am-quang.png: phòng thu số, phổ âm ngang cyan.
- C-dai-thanh-van.png: đồ thị thanh vận jade/gold, bố cục editorial.

Đề xuất: nhận diện A + transport/waveform B. Canvas/Web Audio chỉ phản ứng
với tín hiệu thực khi có consent. Không animate giả để ngụ ý đang thu.
Không biến transcript thành điểm phát âm. Giữ reduced-motion và giải pháp
không microphone. Header/CTA cố định, phân trang kho bài; chỉ middle content
scroll khi viewport nhỏ hoặc nội dung thật sự dài.

Audit đọc code: selectPronunciationLessonOptions chỉ lấy active path,
passedLessonIds/isLessonPassed, cap theo startingLevel và câu ví dụ hợp lệ.
Đây là khác biệt với bài unlocked ở Thiên Lộ; chưa chứng minh riêng điều kiện
nào làm tài khoản hiện tại còn đúng 4 bài. Chưa thay selector/DB/progress.
Trước sửa cần dùng chung projection/unlock policy và giữ source lesson ID;
phân biệt đã học, mở để luyện, chưa mở, chưa có câu luyện hợp lệ.

Không cam kết pixel-identical từ ảnh sinh. Chốt art direction rồi dựng
prototype code tại viewport thật và dùng screenshot của chính code làm mẫu
nghiệm thu; các trạng thái thu/phân tích/thất bại phải hoạt động thật.

# Đồ vật, thời tiết và môi trường · HSK2

20/09/2026 · AI self-review · humanReviewed:false. Phạm vi ba bài person-events-environment-03/04/05, 28 trang, 13 từ gốc, chín hoạt động. Đã phát hành local sau review và kiểm bên dưới.

## Rà năm mặt

1. Mandarin: so chiều dài bằng 比…长, giá bằng 比…贵. 的 thay danh từ áo khi đã rõ đối tượng. Nếu trời mưa dùng 如果…就…, giữ 可能 theo dự báo. Tách địa điểm + 有 + vật với vật + 在 + địa điểm; phân biệt 旁边/对面, 张/间. Đã rút câu vị trí quá dài thành 商店就在房子旁边 cho đúng mức HSK2.
2. Pinyin: 长 cháng chỉ chiều dài, 便宜 piányi, 衣服 yīfu, 房子 fángzi; 一/不 có biến điệu trong ví dụ. Mẫu, hội thoại và vận dụng có Hanzi/Pinyin/nghĩa Việt.
3. Việt: tối đa bao gồm bằng giới hạn. Áo xanh 65 cm/100 tệ đạt 65 cm/110 tệ; chuyển giao áo trắng 60 cm/90 tệ đạt 62 cm/95 tệ, áo đen rẻ hơn nhưng dài quá. Không dịch 阴 thành đang mưa, 可能 thành chắc chắn, 对面 thành cạnh.
4. Sư phạm: mỗi bài có dữ kiện riêng bằng comparison/timeline sửa được trong Xưởng. Vận dụng đổi màu/giá/kích thước; đổi ngày/giờ/hoạt động; đổi trường thành thư viện, cửa sổ thành cửa, một thành hai giường. Đáp án nhiễu kiểm quyết định sai chứ không chỉ nhận dạng câu đã đọc. Rubric tự đối chiếu không cấp mastery.
5. Nguồn: giữ nguyên ID, tiên quyết, từ/ngữ pháp/task/topic; sửa ví dụ 那样/床/间/面 từ ví dụ cụt hoặc không đúng nghĩa cần dạy. 面 được giải thích là thành tố phương vị, không giả vờ là lượng từ giường. Từ điển nền chưa được thay trong lô này.

## Giới hạn và phát hành

Ảnh campus còn chung, được ghi rõ chỉ trang trí; bảng/sơ đồ là căn cứ thông tin. Không có audio người bản ngữ mới. Bài tập ở trang là luyện có hỗ trợ, chưa chứng minh recall độc lập hoặc đủ phủ HSK2. Chỉ phát hành local sau validation, binding review, kiểm bảo toàn dữ liệu và browser.

## Kiểm giao lên web

Hai Vitest đạt: source IDs/prerequisite/editor parity, ví dụ đủ câu, đáp án nhiễu, cloze và self-review. Typecheck/ESLint/diff check đạt. Import rehearsal/apply giữ 37 bảng; release rehearsal/apply giữ 36 bảng/FK. Studio cả ba bài exact payload→sơ đồ→feedback đạt 22.7 giây. Learner khóa trước prerequisite→exact runtime→đáp án→reload→model đạt 38.7 giây. Guest test riêng, không sửa tiến độ người dùng.

Backup: `.wrangler/demo-backups/before-authored-thien-lo-batch-release-2026-09-20T14-19-38-889Z.sqlite`. Kho local hiện 60 authored, 508 hoạt động (51 có target/457 thiếu). Không tuyên bố đủ HSK hoặc USER-ACCEPTED.

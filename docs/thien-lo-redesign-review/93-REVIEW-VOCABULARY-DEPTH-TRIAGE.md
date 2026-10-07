# Rà độ sâu từ vựng: phân biệt ID với ngữ cảnh học

01/10/2026. IN-REVIEW; không phải chứng nhận phủ đủ HSK0–4.

Nguồn đối chiếu là inventory syllabus HSK 2026 đã pin (2.000 từ), wordIds
của curriculum, trang từ current local release heads và ví dụ từ điển hiện hành.
Script read-only: scripts/content/audit-vocabulary-teaching-context.mjs.
Chi tiết ID/bài/trang/ví dụ trong vocabulary-context-triage.json.

| Cấp | Số từ | Không thấy trong trang của bài gắn ID | Không thấy trong trang học toàn kho | Không có ví dụ từ điển |
|---|---:|---:|---:|---:|
| HSK1 | 300 | 0 | 0 | 0 |
| HSK2 | 200 | 0 | 0 | 0 |
| HSK3 | 500 | 182 | 95 | 0 |
| HSK4 | 1.000 | 569 | 254 | 0 |

Đây là dò chuỗi để chọn nội dung cần đọc, chưa phân tích đủ nghĩa/collocation,
cách viết thay thế hoặc các consumer bài tập ngoài lessonPages. Có chữ trong
một khối không có nghĩa từ ấy đã được dạy; không thấy chữ trong trang cũng
không có nghĩa từ không tồn tại trong hệ thống.

## Các trường hợp đã đọc

- 阿姨: có ví dụ trong từ điển và có mặt ở ba bài khác; không kết luận thiếu
  toàn hệ thống chỉ vì các bài gắn wordId không chứa từ trong trang của chúng.
- 矮: ví dụ từ điển có người thấp và sợ cao, nhưng không thấy trong trang học;
  khi bổ sung nên tách rõ thấp về chiều cao với sợ độ cao, tránh gợi quan hệ
  nhân quả sai. Dạy đối chiếu 矮/高 trong ngữ cảnh chiều cao.
- 爱人: ví dụ hiện tại nói “王老师和爱人终于决定结婚”. Với Mainland Mandarin,
  cần ưu tiên nghĩa vợ/chồng đã kết hôn; câu này không phù hợp làm mẫu nhập môn
  cho nghĩa đó. Cần sửa ví dụ thành tình huống vợ/chồng rõ ràng và đưa cách dùng
  vào bài gia đình, phân biệt người yêu với phối ngẫu. Chưa ghi đã sửa.
- 笔记本: ví dụ ghi kế hoạch vào sổ tay dùng nghĩa phù hợp; cần đảm bảo bài
  phân biệt sổ tay với nghĩa máy tính xách tay trong ngữ cảnh tương ứng.
- 比如: có ví dụ trong bài HSK4 nhưng từ thuộc HSK3; cần có lần dạy/luyện ngay
  trong cấp HSK3 thay vì dựa vào việc xuất hiện muộn ở cấp sau.

## Thứ tự xử lý tiếp

1. Đọc/rà 95+254 ứng viên không thấy trong trang học toàn kho; dùng ví dụ đã có
   nếu tự nhiên, sửa mẫu sai, thêm ngữ cảnh + yêu cầu tự vận dụng đúng chủ đề.
2. Rà nhóm xuất hiện ở bài khác: gắn lại việc dạy với bài/cấp phù hợp khi cần,
   giữ stable word IDs để Ôn/Từ điển/Lỗi vẫn liên thông.
3. Rà các nghĩa/cấu trúc trong inventory ngữ pháp, không lấy một mẫu chung làm
   đại diện cho toàn bộ các mục của cùng grammar row.

Không chạy test suite/browser theo yêu cầu mới. Chưa phát hành sửa từ vựng ở
lượt này; chỉ supplement nền Pinyin boot-3 đã phát hành. humanReviewed:false.

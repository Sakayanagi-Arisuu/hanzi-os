# Xin chào đầu tiên — review local

Ngày 12/09/2026. Bài boot-2, tám trang nguyên bản; humanReviewed:false.

## Năm pass AI self-review

- Mandarin/Pinyin: 你好 là lời chào; 你好吗 hỏi tình trạng, không được mô tả như
  câu bắt buộc cho mọi lần gặp. 我很好 là đáp lời hỏi thăm, không thay lời chào.
  我/你 được giải thích theo người nói/người nghe. 好你 và 我好 chỉ xuất hiện
  như đáp án sai có giải thích rõ ngữ cảnh. Nǐ hǎo giữ dạng từ điển; trang
  thanh điệu giải thích thanh đầu đổi khi nói liền. Wǒ hěn hǎo giữ dạng từ
  điển của cụm ba thanh 3, không yêu cầu người mới tự suy cách đọc từ dấu.
- Tiếng Việt: 好 được giải thích tốt/ổn; 你好 dịch cả cụm Xin chào, không dịch
  máy móc thành bạn tốt. 很 trong mẫu 我很好 không bị buộc dịch “rất” ở mọi
  ngữ cảnh. Nghĩa của lời hỏi thăm và lời đáp khớp tình huống.
- Độ khó/sư phạm: ba từ cốt lõi ni/hao/wo đều được dạy, mẫu ngắn hai lượt.
  吗 và 很 có hỗ trợ và không bị kiểm recall độc lập. Bài có đổi vai đại từ,
  phân biệt cụm, chọn lời đáp, xếp chữ, rồi tình huống sinh hoạt khác. Tranh
  campus chỉ tạo bối cảnh, sơ đồ đổi vai mang thông tin phục vụ bài tập.
- Đáp án: B nói với A thì 你 chỉ A; 我 chỉ B. Chào đáp lại là 你好, thứ tự
  you→good; không có đáp án trùng. Rubric hai lượt cho phép Pinyin như hỗ trợ,
  không cấp điểm viết chữ hoặc phát âm. Mở lời và đáp cùng câu vẫn đúng.
- Coverage/nguyên bản: giữ boot-2, prerequisite boot-1, ni/hao/wo và kỹ năng
  hiện hành. Hai từ hỗ trợ không tự thêm vào inventory mastery. Nội dung,
  câu hỏi và sơ đồ được biên soạn cho HANZI.OS, không lấy bài của benchmark.
  Giọng trình duyệt là tổng hợp; không native audio hoặc điểm nói. Ảnh chủ đề
  dùng chung theo docs/THIEN_LO_ASSET_PROVENANCE.md.

## Phạm vi được duyệt local

Review áp dụng riêng bản manuscript khóa bởi digest JSON tương ứng; không
chứng nhận kho HSK0 đầy đủ. Mục tiêu bài nhập môn là dùng được lời chào và
nhận ra đại từ, không phải thành thạo âm đầu/biến điệu. Hoạt động nhận diện có
hỗ trợ khác kiểm nhớ độc lập. Chấm phát âm và kết quả trì hoãn chưa triển khai
trong khối trang này. Xưởng có thể sửa mọi trang, nội dung, đáp án, rubric và
sơ đồ bằng cùng schema. Cần validator, rehearsal/release và browser trước khi
gọi là bài đã kiểm xong trên web.

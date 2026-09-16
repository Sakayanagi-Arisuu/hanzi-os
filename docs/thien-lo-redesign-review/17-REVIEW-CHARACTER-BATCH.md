# Rà lô nhận diện chữ characters-1 đến characters-15

Ngày 14/09/2026. AI self-review cho học local; humanReviewed: false.
Phạm vi quyết định này là nội dung nhận diện và gọi lại chữ có hỗ trợ, không
phải nghiệm thu toàn bộ redesign, bài viết tay độc lập hoặc chứng nhận HSK.

## Nội dung đã đối chiếu

15 bài giữ 246 character IDs, từ, kỹ năng và tiên quyết nền; 300 trang do
Xưởng biên tập được. Mỗi bài có cặp hình đối chiếu riêng, từ mẫu Trung–Pinyin–
Việt, các nhóm tối đa bốn chữ, nhận diện khi còn mẫu, gọi lại sau khi đã học
các nhóm, phân biệt theo nghĩa/âm, tình huống mới và hướng dẫn tự đối chiếu.
246 lượt gọi lại không cộng thành bằng chứng viết độc lập. Các mục chép còn
mẫu được ghi rõ là có hỗ trợ.

| Bài | Hình cần phân biệt | Vận dụng riêng đã rà |
| --- | --- | --- |
| characters-1 | 大 / 太 | 我是大学生。 Phân biệt người học với trường đại học |
| characters-2 | 见 / 贝 | 明天见！ Hẹn gặp ngày mai |
| characters-3 | 妈 / 吗 | 这是你的妈妈吗？ Danh từ và trợ từ câu hỏi |
| characters-4 | 你 / 您 | 您好吗？ Hỏi thăm người lớn tuổi |
| characters-5 | 他 / 她 / 它 | 她是老师。 Đối tượng nữ đã xác định |
| characters-6 | 再 / 在 | 我在家。再见！ Vị trí và lần gặp sau |
| characters-7 | 白 / 百 | 我白天上学。 Thời gian trước hoạt động |
| characters-8 | 日 / 目 | 星期日见！ Chấp nhận cách nói 星期天 trong tự đối chiếu |
| characters-9 | 上 / 下 | 下午见！ Đổi lời hẹn từ sáng sang chiều |
| characters-10 | 包 / 句 | 我想吃包子。 Gọi món với khung hỗ trợ |
| characters-11 | 买 / 卖 | 我想买书。 Giữ đúng ý định mua |
| characters-12 | 衣 / 农 | 我想买衣服。 Quần áo và chữ 衣 |
| characters-13 | 坐 / 做 | 我坐车去学校。 Phương tiện trước đích đến |
| characters-14 | 本 / 木 | 我有两本书。 Hai trước lượng từ |
| characters-15 | 字 / 学 | 我学写汉字。 Hoạt động học viết |

## Các lượt rà và sửa

1. Mandarin/Pinyin: đọc 15 cặp trọng tâm, 30 cụm ví dụ, 246 cặp từ–nghĩa–âm
   trong lượt gọi lại và 15 câu vận dụng. Âm chữ riêng không lấy nguyên âm
   cả từ. 六, 谁, neutral tone và Erhua giữ theo từ nguồn. Sáu trường hợp
   客/气/谁/要/条/玩 đã có giải thích ngoại lệ ngay trong payload; 谁 có hai
   cách đọc, 儿 trong 面条儿/好玩儿 không bị tách thành âm tiết độc lập.
   一 trong 一本书 dùng thanh từ điển ở cụm tham khảo; không lấy đó làm
   chuẩn chấm âm thanh. Bản tự viết có Pinyin và nghĩa của cả câu.
2. Tiếng Việt: phân biệt nghĩa cả từ với nghĩa chữ, mẹ với trợ từ 吗,
   mua/bán, ngồi/làm, lượng từ 本. Các thuật ngữ hình là quan sát hiện đại,
   không kể chuyện từ nguyên hay bịa quy tắc thứ tự nét.
3. Sư phạm: từ mẫu xuất hiện trước lượt gọi lại, có hỗ trợ từ vựng trong
   tình huống chuyển đổi. Không dùng một yêu cầu chung “chọn hai từ” cho cả
   lô. Câu hẹn 下午 là thay đổi từ 上午; 两本书 thay số lượng từ 一本书.
   Tự đối chiếu câu mở chấp nhận cách nói khác đúng ý, không so chuỗi với mẫu.
4. Đáp án: che mọi lần xuất hiện chữ lặp như 妈妈/爸爸; phần nghĩa và âm
   của recall không lộ Hanzi. 15 câu chọn có vị trí đúng phân bố 5/5/5.
   Câu điền trọng tâm bổ sung cách đọc để xác định từ cần nhớ. Riêng chủ
   nhật giải thích 星期天 đúng nghĩa nhưng không khớp âm xīngqīrì được hỏi.
   Câu chỉ hỏi “làm, zuò” chấp nhận cả 做 và 作; giải thích phân biệt 做饭 /
   工作 theo từ. Không chấp nhận 坐 mang nghĩa ngồi ở câu này.
5. Liên kết và nguồn: giữ IDs từ nguồn rich, không tạo hay sửa stroke data.
   Đối chiếu schema, vocabulary, prerequisites, skills, character inventory
   bằng test. Chỉ dùng kho nguồn hiện có và giải thích/tình huống tự soạn,
   không lấy nội dung hoặc bố cục độc quyền từ benchmark.

Các lỗi nêu trên đã sửa trong bản soạn; không còn lỗi nội dung đã biết ngăn
phát hành local lô này. JSON review khóa digest chính xác của payload đã rà.
Script ghi nhận review chỉ dành cho lô này, không tự chứng nhận đầu vào khác.

## Bằng chứng và giới hạn

- 11 test nội dung/hoạt động đạt sau sửa đáp án. Browser Xưởng đã mở ba bài
  đại diện (3/9/14), đối chiếu payload, nhập câu và mở đáp án/rubric thành công.
- Release còn phải chạy schema, digest, projection, backup, transaction,
  fingerprint, FK và hành trình learner sau khi phát hành. Văn bản này không
  thay kết quả của các gate đó.
- Cảnh minh họa còn dùng bộ chung, chưa đủ yêu cầu minh họa riêng toàn kho.
  Phiên đọc lưu vị trí/câu trả lời nhưng bài tập trang chưa nối đầy đủ vào
  ôn/lỗi/thống kê. Các phần này vẫn thuộc goal đang mở.
- Xem hết 300 trang hoặc làm đúng khi có Pinyin/IME không chứng minh mastery.
  Đây là nhận diện/gọi lại có hỗ trợ, không thay luyện viết có stroke data.

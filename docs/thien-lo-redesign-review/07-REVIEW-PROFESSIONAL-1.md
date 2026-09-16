# Rà bài Trường học và cấp học — bản trang v2

Ngày: 12/09/2026. AI-assisted local study; **humanReviewed:false**.
Phạm vi chỉ professional-1, không phải chứng nhận HSK1 hoặc cả kho bài.

## Nội dung đã đọc và đối chiếu

- Mandarin: phân biệt 小学/小学生, 中学/中学生, 大学/大学生;
  学校 gọi trường, 学生 gọi người học, 上学 là hoạt động. 我是大学生 và
  我在大学上学 khác nhau về vai trò/nơi học. 哪个学校 là cách hỏi giao tiếp
  dùng được; không suy từ 中学 ra một cấp lớp cụ thể ở Việt Nam.
- Pinyin: đối chiếu chín từ đích với WORD_BY_ID; 学生 dùng xuésheng,
  các từ ghép 小学生/中学生/大学生 dùng shēng; 吗 và 个 trong 哪个 nhẹ.
  Câu mẫu ghi dấu từ điển, không tuyên bố TTS là âm native.
- Tiếng Việt: các ví dụ nói đúng vai trò và nơi học; câu hỏi trường, vai trò,
  nội dung học được phân biệt trong phản hồi. Đáp án câu mở là một phương án.
- Sư phạm: gặp nhiệm vụ → hội thoại → đối chiếu từ → cấu trúc → hỏi tiếp →
  tự ghép/nhớ → chuyển vai → tự nhắc. Không yêu cầu mọi bài theo cấu trúc này.
  Câu lựa chọn có một đáp án theo ý định cho trước; câu nhiễu khác nghĩa hoặc
  sai cấu trúc có giải thích. Sắp xếp dùng đủ bốn mảnh; điền chỗ trống cần
  大学生. Câu mở đối chiếu ba tiêu chí, không tự chấm năng lực nói.
- Nguồn/độ khó: giữ chín word IDs và prerequisite journey-2; rà closure 25
  bài trước có 我/你/是/吗/在/哪个/什么. 学习 và 汉语 chưa nằm trong closure,
  đã thêm scaffold trong trang hỏi tiếp. Cả chín từ đích được giới thiệu;
  điều này không chứng minh mastery của từng từ sau một lần xem.
- Nguyên bản: lời dẫn, sơ đồ so sánh, nhiệm vụ và phản hồi do đợt biên soạn
  này tạo; hội thoại lấy nguồn rich hiện hành của HANZI.OS. Ảnh campus là
  minh họa nguyên bản dùng chung, xem THIEN_LO_ASSET_PROVENANCE.md;
  chưa phải hoàn tất minh họa riêng toàn kho.

## Các thiếu sót đã sửa

1. Thiếu giải thích trường/người/hoạt động ở đầu bài: thêm 学校/学生/上学
   cùng hai câu mẫu. Resolved.
2. Mặc định đã biết 学习/汉语: thêm nghĩa/Pinyin và phân biệt với 上学.
   Resolved.
3. Preview bản đầy đủ gây SSR error từ nút âm của LessonDepthPanel: thêm
   client boundary và dùng reader mới cho revision có lessonPages. Resolved.
4. Nhân bản dùng chung mã đáp án có thể trộn draft: clone tạo mã mới và remap
   answerIds; regression test giữ nguyên bản gốc và đáp án bản sao. Resolved.

## Giới hạn phát hành mẫu

Khối activity chỉ tự luyện/feedback và giữ nháp; chưa thay ngân hàng Thử Luyện
hoặc cấp mastery. Kết quả Thử Luyện vẫn đi hệ thống hiện có. Ảnh dùng chung,
links tới các module ngoài từ điển và evidence cho khối mới còn trong scope
tiếp theo. Cho phép phát hành local mẫu theo yêu cầu triển khai, không ghi
toàn module hoàn tất hoặc USER-ACCEPTED. Không public deploy.

Hồ sơ JSON kèm digest khóa đúng payload trước review; khi nội dung thay đổi
phải rà lại. Không tự chạy lại tạo digest để vượt kiểm tra stale.

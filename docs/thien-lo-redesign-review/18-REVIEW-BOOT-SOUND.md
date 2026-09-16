# Hai bài nhập môn âm: boot-3 và boot-4

AI self-review ngày 14/09/2026, học local, humanReviewed:false. Phạm vi review
là nội dung giải thích, nhận diện có chữ và vận dụng quy tắc; không xác nhận
chất lượng phát âm hoặc hoàn tất bộ học âm có audio người thật.

## Nội dung và rà soát

boot-3: tách vị trí lưỡi, luồng hơi và thanh điệu. j/q/x dùng vùng mặt trước
lưỡi; zh/ch/sh đầu lưỡi nâng phía sau lợi; z/c/s phía trước hơn. Không chỉ
dẫn cuộn lưỡi sâu. So bật hơi trong j/q, zh/ch, z/c; x/sh/s là âm xát, không
gọi chúng là phiên bản bật hơi của âm tắc-xát. Giải thích i không có cùng
cách phát âm trong tất cả nhóm. Mẫu 谢谢 xièxie, 鸡 jī, 七 qī, 西 xī,
中国 Zhōngguó, 吃 chī, 四 sì có nghĩa Việt; dùng jī/qī cùng thanh 1 để
tập trung luồng hơi. Các từ mới chỉ hỗ trợ quan sát, không ép nhớ hết trước
khi được học tiếp. Câu vận dụng là cảm ơn người nhặt giúp sách, tự mô tả x
và âm tiết thứ hai nhẹ. Rubric không tự chấm giọng.

boot-4: dòng từ mẫu giữ thanh từ điển, phần chú giải nói rõ cách đọc liền.
Đã đối chiếu 你好 nǐ hǎo → ní hǎo, 很好 hěn hǎo → hén hǎo,
可以 kě yǐ → ké yǐ. Không mở rộng máy móc sang mọi chuỗi ba thanh 3.
不是 bù shì → bú shì, 不好 bù hǎo không đổi theo quy tắc trước thanh 4,
不要 có chú thích nghĩa tùy câu. 一 trước thanh 4 đọc yí; trước thanh
1/2/3 đọc yì. 一个 ghi rõ gè thanh 4 trong mẫu và chú thích khả năng đọc
nhẹ, tránh lấy TTS từng thiết bị làm trọng tài. 一天/一年/一本书 có ghi
thanh gốc và cách nói. 第一 dì yī giữ thanh 1; 第 đứng trước không phải
tác nhân đổi thanh của 一.

Nhiệm vụ chuyển đổi đã sửa từ lặp 一年 sang từ mới 一起: cung cấp nghĩa
“cùng nhau” và thanh gốc yī qǐ, yêu cầu dự đoán yì qǐ và giải thích 起
thanh 3. Đáp án chỉ xuất hiện khi tự đối chiếu. Không dạy từ mới bằng mẫu
đã giải sẵn trước nhiệm vụ rồi gọi đó là transfer chưa từng gặp.

## Đáp án, nguồn và khả năng biên tập

- 7 câu chọn trong trang có một đáp án theo yêu cầu, feedback từng phương án;
  câu hỏi về vị trí lưỡi được ghi là hiểu quy tắc, không phải nghe phân biệt.
- Bốn câu cấu trúc dùng chung có đáp án Mandarin/Pinyin/nghĩa đầy đủ, câu hỏi
  nêu từ hỗ trợ khi cần. Không nhét đáp án tiếng Việt vào trường Mandarin.
- Câu tự quan sát và hai nhiệm vụ cuối dùng rubric, không so chuỗi mở với
  mẫu để phát sinh điểm độc lập. Không yêu cầu microphone.
- Nội dung do AI soạn từ mục tiêu nguồn hiện có; không sao chép lesson,
  layout hoặc asset benchmark. Giữ ID, từ, kỹ năng, tiên quyết của hai bài.
- 16 trang dùng renderer và trình soạn Xưởng chung; sơ đồ là dữ liệu có thể
  sửa nhãn/mô tả, không hardcode cảnh học riêng cho từng route.
- 3 test schema/nguồn/quy tắc/transfer và loại phản hồi đạt. Browser Xưởng
  đã đối chiếu payload cả hai bài, xem sơ đồ và feedback câu chọn. Release
  vẫn cần digest, projection, transaction/FK và kiểm learner sau phát hành.

## Phần chưa được review này chứng minh

Chưa có mẫu âm người thật, hình khẩu hình chuyên biệt hay chấm phát âm.
Cảnh sound hiện dùng chung; đây không phải hoàn tất yêu cầu media toàn kho.
Các trang mới chưa nối đầy đủ evidence vào ôn/lỗi/thống kê. Không lấy kết
quả bấm chọn hoặc TTS làm bằng chứng nghe/nói đã thành thạo. Các phần đó
vẫn thuộc goal v0.2 đang mở. Không có lỗi nội dung đã biết ngăn phát hành
local phạm vi trên; review JSON khóa digest của đúng hai payload đã rà.

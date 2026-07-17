# Mô hình làm chủ và thích ứng của HANZI.OS

## Mục tiêu

Hệ thống không tối ưu số câu đã bấm hoặc thời gian ở lại ứng dụng. Mục tiêu chính là xác suất người học có thể tự gọi lại và sử dụng kiến thức trong ngữ cảnh phù hợp với đích đã chọn: giao tiếp, HSK, công việc hoặc du lịch.

## Vòng học chuẩn

1. **Lĩnh hội:** đọc khái niệm, quy tắc, ví dụ, điểm mù và checkpoint trước bài.
2. **Truy hồi:** trả lời câu nhận diện lẫn câu tự nhập mà không nhìn đáp án.
3. **Chẩn đoán:** ghi bằng chứng theo câu, từ, dạng bài và kỹ năng.
4. **Bổ trợ:** đưa lỗi vào Nghịch Cảnh Lục cùng lời giải cụ thể.
5. **Tái kiểm tra:** yêu cầu hai lần tự gọi đúng liên tiếp để đóng lỗi.
6. **Khai mở:** chỉ mở nút kế tiếp khi best score đạt tối thiểu 70%.
7. **Duy trì:** từ đã học đi vào lịch FSRS và quay lại gần thời điểm quên dự kiến.

## Mô hình dữ liệu năng lực

Mỗi bằng chứng trả lời cập nhật ba lớp:

- `knowledge[lessonId:questionId]`: số lượt, số đúng, chuỗi đúng, mastery và lần gặp cuối.
- `skillMastery`: bảy năng lực độc lập gồm phát âm, nghe, nói, đọc, viết, từ vựng và ngữ pháp.
- `mistakes`: lỗi mở, số lần tái phạm, chuỗi sửa đúng và trạng thái đã giải quyết.

Mastery của một câu là trung bình có trọng số giữa trạng thái trước và kết quả mới; chuỗi đúng tạo phần thưởng nhỏ nhưng không thể bù một câu sai. Điểm sẵn sàng mục tiêu là tổng có trọng số của bảy kỹ năng theo mục tiêu cộng một phần tiến độ Thiên Lộ.

## Quy tắc nhiệm vụ hằng ngày

Thứ tự ưu tiên hiện tại:

1. Lỗi chưa đóng, vì đó là bằng chứng rõ nhất về điểm nghẽn.
2. Bài tiếp theo đang mở và chưa đạt ngưỡng mastery.
3. Thẻ FSRS đến hạn, chỉ từ kiến thức đã học hoặc chủ động lưu.
4. Bài bổ trợ theo mục tiêu và kỹ năng yếu nhất.
5. Khảo nghiệm căn cơ khi chưa có dữ liệu đủ tin cậy.

## Chống gián đoạn

- Learning state được ghi vào `localStorage` sau mỗi thao tác có ý nghĩa.
- Phiên bài học lưu cả bộ câu đã random, vị trí, đáp án, trạng thái chấm và điểm tạm.
- Khảo nghiệm đầu vào lưu câu đang làm và đáp án đã chọn.
- PWA precache giao diện, bundle và hình chủ đạo; dữ liệu nét chữ đã tải được cache theo runtime.
- Không dùng `alert()` hoặc `confirm()`. Phản hồi dùng toast không chặn luồng; thao tác nguy hiểm dùng modal trong ứng dụng.

## Quy tắc XP

- Lần đầu đạt mastery nhận toàn bộ XP của bài.
- Lần đầu chưa đạt nhận 25% để ghi nhận nỗ lực.
- Lượt lặp lại nhận 20%; người học từng trượt vẫn nhận phần thưởng mastery đầy đủ khi lần đầu vượt 70%.
- Chữa lỗi đúng và ôn FSRS có phần thưởng nhỏ, nhưng XP không thay thế chỉ số năng lực.

## Ranh giới bản public hiện tại

Mỗi trình duyệt là một hồ sơ độc lập. Link public không làm người khác thấy hoặc ghi đè tiến độ của chủ sở hữu. Đồng bộ đa thiết bị, tài khoản, lớp học, thanh toán và dashboard vận hành cần backend production.

Kiến trúc thương mại nên bổ sung theo thứ tự: danh tính và cloud sync; content CMS và item analytics; dịch vụ audio/chấm cao độ; subscription; teacher console; experimentation và anti-cheat. Mô hình local hiện tại giữ API hành động đủ rõ để thay lớp lưu trữ mà không phải viết lại UI học.

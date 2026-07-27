# Mô hình làm chủ và thích ứng của HANZI.OS

## Mục tiêu

Hệ thống không tối ưu số câu đã bấm hoặc thời gian ở lại ứng dụng. Mục tiêu chính là xác suất người học có thể tự gọi lại và sử dụng kiến thức trong ngữ cảnh phù hợp với đích đã chọn: giao tiếp, HSK, công việc hoặc du lịch.

## Vòng học chuẩn

1. **Lĩnh hội:** đọc khái niệm, quy tắc, ví dụ, điểm mù và checkpoint trước bài.
2. **Truy hồi:** trả lời câu nhận diện lẫn câu tự nhập mà không nhìn đáp án.
3. **Chẩn đoán:** ghi bằng chứng theo câu, từ, dạng bài và kỹ năng.
4. **Bổ trợ:** đưa lỗi vào Nghịch Cảnh Lục cùng lời giải cụ thể.
5. **Tái kiểm tra:** yêu cầu hai lần tự gọi đúng liên tiếp để đóng lỗi.
6. **Khai mở:** chỉ mở nút kế tiếp khi lesson session nộp đủ toàn bộ form do server phát hành, gate score từ lượt fresh/unhinted đạt tối thiểu 70% và tập item bắt buộc cũng đạt tối thiểu 70%.
7. **Duy trì:** từ đã học đi vào lịch FSRS và quay lại gần thời điểm quên dự kiến.

## Mô hình dữ liệu năng lực

Projection local tương thích có ba lớp sau:

- `knowledge[lessonId:questionId]`: số lượt, số đúng, chuỗi đúng, mastery và lần gặp cuối.
- `skillMastery`: bảy năng lực độc lập gồm phát âm, nghe, nói, đọc, viết, từ vựng và ngữ pháp.
- `mistakes`: lỗi mở, số lần tái phạm, chuỗi sửa đúng và trạng thái đã giải quyết.

Mastery local của một câu là trung bình có trọng số giữa trạng thái trước và kết
quả mới; chuỗi đúng tạo phần thưởng nhỏ nhưng không thể bù một câu sai. Đây
không phải authority cloud. Khi đã authenticated, lesson progress và thống kê
evidence trên UI được dựng từ normalized projection của server; XP, streak,
mistake aggregate và FSRS local không được nâng thành mastery cloud.
Authenticated Review có authority riêng để đọc queue và cập nhật lịch FSRS phía
server, nhưng rating vẫn được lưu như evidence `unverified`,
`masteryEligible: false` và không tạo XP.

Ở boundary phía server, trình duyệt không được tự tuyên bố kết quả. Server có thể đối chiếu snapshot legacy với `activityVersion` và answer key để lưu kết quả mô tả, nhưng toàn bộ evidence đi qua `/api/sync` vẫn là `unverified`: nó không tạo knowledge, skill mastery, diagnostic route, lesson completion hay prerequisite unlock. Chỉ command attempt chuẩn hóa gắn với session phía server mới có thể dựng `outcome`, `score`, `verified` và `masteryEligible` có thẩm quyền. Stroke quiz, remediation tự báo và browser speech vẫn được lưu như practice nhưng không được nâng thành verified mastery nếu server không có tín hiệu khách quan để chấm.

Evidence objective đã commit là immutable theo idempotency key. Khi cùng key có
payload khác, server giữ bản đã lưu; một evidence ID mới cho activity đã thấy
luôn bị đánh dấu prior exposure, kể cả khi client backdate timestamp. Trạng thái
này được giữ qua pull, retry, merge và tái chấm nên không thể farm mastery bằng
cách sắp lại thời gian hoặc phát lại response cũ.

Một câu chỉ tác động đúng skill được khai báo trong item bank. Lượt có hint hoặc
exposure lặp lại có thể ghi accuracy/practice nhưng không tạo thêm mastery
evidence. Reader authenticated được server chấm khách quan nhưng vẫn
mastery-ineligible cho tới khi có reader session versioned kiểm soát support và
exposure.

Thẻ Review authoritative chỉ được kích hoạt từ một lesson session đã
`submitted/passed` của exact released content chứa đúng word/version. Queue chỉ
trả thẻ đến hạn trong đúng owner, reset epoch, enrollment, modality và scheduler
version. Grade phải khớp offer gồm card revision, word/version, content/reset
và scheduler; server còn phải xác minh lại release cùng activation session
trước khi chạy `ts-fsrs` với fuzz tắt rồi ghi card, review log,
attempt/evidence, outbox event và sync marker trong một batch.

Khảo sát anonymous vẫn là flow local, uncalibrated và mastery-ineligible.
Khảo sát authenticated dùng session/form/attempt/submission chuẩn hóa của server
và projection V2 không chứa learner response, answer key hay item-level outcome.
Kết quả chỉ hiển thị `k/n` và khoảng Wilson 95% theo bảy skill; speaking/writing
không có evidence thì hiển thị chưa được đo. Kết quả không tạo routing, không mở
prerequisite, không map HSK và không được gọi là calibrated mastery.

## Quy tắc nhiệm vụ hằng ngày

Thứ tự ưu tiên hiện tại:

1. Lỗi chưa đóng, vì đó là bằng chứng rõ nhất về điểm nghẽn.
2. Bài tiếp theo đang mở và chưa đạt ngưỡng mastery.
3. Thẻ FSRS đến hạn, chỉ từ kiến thức đã học hoặc chủ động lưu.
4. Bài bổ trợ theo mục tiêu và kỹ năng yếu nhất.
5. Khảo nghiệm căn cơ khi chưa có dữ liệu đủ tin cậy.

## Chống gián đoạn

- `LearningState` schema v2 primary/recovery hiện vẫn được ghi vào
  `localStorage` sau mỗi thao tác có ý nghĩa. IndexedDB giữ checkpoint đồng bộ,
  outbox và cache resume/projection có owner/reset-epoch fence; không được mô tả
  các cache này như nguồn mastery authority.
- Phiên bài học lưu cả bộ câu đã random, vị trí, đáp án, trạng thái chấm và điểm tạm.
- Khảo nghiệm đầu vào lưu câu đang làm và đáp án đã chọn.
- Với account, outbox/resume/projection nằm trong IndexedDB theo
  owner/reset epoch. Review grade cũng được ghi durable trước khi UI chuyển thẻ;
  cache review queue chỉ là preview/resume và phải được server xác nhận lại trước
  khi grade. Active lesson hoặc assessment session từ thiết bị khác chỉ được
  adopt từ projection đã kiểm tra đúng owner, manifest và cursor; client không
  tạo server receipt giả.
- Persisted state do ứng dụng đọc lại đúng schema, owner/reset epoch,
  content manifest và cursor được tin cậy **chỉ để tiếp tục trải nghiệm** sau
  reload hoặc adoption. Sự tin cậy này không biến đáp án, điểm hay aggregate do
  client lưu thành mastery evidence có thẩm quyền.
- Mọi backup/export được người dùng chọn để import, snapshot compatibility,
  legacy state hoặc browser storage có thể bị sửa đều là input không tin cậy.
  Import phải qua validation/migration, không được tự tạo correctness,
  completion, XP, mastery hay prerequisite unlock; chỉ command/evidence được
  server xác minh theo đúng version mới có thể tạo authority tương ứng.
- PWA precache giao diện, bundle và hình chủ đạo; dữ liệu nét chữ đã tải được cache theo runtime.
- Không dùng `alert()` hoặc `confirm()`. Phản hồi dùng toast không chặn luồng;
  thao tác nguy hiểm trong profile, lesson và assessment dùng dialog chung có
  focus ban đầu, Tab trap, Escape và focus restore.
- Regression cục bộ bao phủ thao tác radio bằng phím mũi tên/Home/End, menu
  mobile với focus trap/Escape/focus restore và chuyển focus về nội dung chính,
  kiểm tra tràn ngang cùng chế độ reduced motion. Đây là coverage kỹ thuật cục
  bộ, không phải chứng nhận accessibility production; kiểm thử thiết bị thật,
  screen reader và audit độc lập vẫn còn thiếu.

## Quy tắc XP

Các tỷ lệ dưới đây mô tả reward projection local hiện có, không phải ledger
authority cloud:

- Lần đầu đạt mastery nhận toàn bộ XP của bài.
- Lần đầu chưa đạt nhận 25% để ghi nhận nỗ lực.
- Lượt lặp lại nhận 20%; người học từng trượt vẫn nhận phần thưởng mastery đầy đủ khi lần đầu vượt 70%.
- Chữa lỗi đúng và ôn FSRS local có thể có phần thưởng UX nhỏ, nhưng XP không
  thay thế chỉ số năng lực. Authenticated review grade hiện không ghi XP.

## Ranh giới closed alpha hiện tại

Người học có thể tiếp tục local-only. Mã nguồn cũng có đường đăng nhập ChatGPT
và sync D1 closed alpha; authenticated lesson, Reader, assessment và Review đã
nối normalized command outbox/projection hoặc queue, trong khi `/api/sync` tiếp
tục là compatibility snapshot. Các đường này có regression cục bộ nhưng chưa
được xác minh như dịch vụ hosted. Export schema v4, account deletion và restore
rehearsal qua 12 migration/25 bảng đã bao phủ assessment, Reader cùng
Review/FSRS graph;
hosted restore vẫn chưa được thực hiện. Speech
transcript luôn local-only, `unverified` và mastery-ineligible. URL điều hướng
không mang owner state, nên việc chia sẻ URL không tự làm lộ tiến độ trong mô
hình nguồn hiện tại; điều này chưa thay thế privacy test trên dịch vụ hosted.

Ứng viên `foundation-2026.07.5` vẫn chưa được promote và không có linguistic
approval. Chưa được tuyên bố account recovery public cho đến khi SIWC cung cấp
immutable subject hoặc có luồng liên kết danh tính đã xác minh; email hiện tại
có thể thay đổi. Chưa được tuyên bố HSK/goal coverage, mastery confidence hay
calibrated assessment trước khi content review, pilot thresholds và item
analytics tương ứng hoàn tất.

## Phase 2A: khảo sát nền tảng chưa hiệu chỉnh

Item khảo sát có version riêng, construct, modality, nhóm tương đương và nhóm
exposure. Metadata difficulty và discrimination để `null`, review là `pending` và
calibration là `uncalibrated` cho tới khi có bằng chứng pilot thật. Stimulus nghe
do browser TTS tổng hợp chỉ là practice, không được tính vào ước lượng.

Một form chỉ được cấp khi toàn bộ blueprint có thể dùng các exposure group chưa
thấy và item server-confidential đủ điều kiện. Nếu bank chưa có form tương
đương, hệ thống fail closed. Lượt đã lộ đáp án không thể trở thành evidence mới;
hiện cũng không có assessment routing để thay đổi. Speaking và writing được
hiển thị là chưa được đo thay vì suy ra từ câu nhận diện.

Giao diện có thể hiển thị `k/n` và khoảng Wilson 95% của độ chính xác quan sát
theo từng skill. Đây là thống kê mô tả cho evidence objective, first-exposure;
không phải calibrated mastery probability, không phải HSK mapping và không mở
prerequisite. Ngưỡng reliability, routing accuracy và item discrimination vẫn
phải được cố định rồi kiểm chứng bằng cohort pilot trước mọi tuyên bố production.

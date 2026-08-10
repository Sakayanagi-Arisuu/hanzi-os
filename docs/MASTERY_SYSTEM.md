# Hợp đồng mastery, coverage và ôn tập

Cập nhật: **10/08/2026**. Đây là policy hiện hành cho learner state; UI có thể
đổi nhưng không được làm yếu các ranh giới bằng chứng dưới đây.

## 1. Năm khái niệm phải tách riêng

- **Exposure:** người học đã thấy item/phương thức nào.
- **Attempt:** một phản hồi có version, provenance và điều kiện trợ giúp.
- **Coverage:** phần inventory có ít nhất evidence phù hợp; item duy nhất, không
  tăng vì lặp cùng item.
- **Mastery:** ước lượng dựa trên evidence đúng kỹ năng, đủ mẫu và phân tán theo
  thời gian; không phải phần trăm câu vừa làm đúng.
- **Reward:** XP/streak dùng tạo động lực, không mở prerequisite hay thay mastery.

UI người học ưu tiên diễn đạt đơn giản: `đúng k/n`, `đã luyện n mục`, `đến hạn ôn`.
Confidence interval, hash, receipt, schema và protocol chỉ dành cho phân tích/dev.

## 2. Evidence theo kỹ năng

Bảy bucket được theo dõi độc lập: phát âm, nghe, nói, đọc, viết, từ vựng và ngữ
pháp. Chỉ activity thực sự đo bucket nào mới được ghi evidence cho bucket đó.

- nghe rồi chọn nghĩa không tạo evidence nói;
- speech-to-text transcript không đủ để chấm phát âm/thanh điệu;
- nhận dạng/chọn Hanzi không chứng minh viết nét;
- browser TTS là fallback nghe, không phải native audio hoặc evidence nói;
- hint, reveal, prior exposure và IME assistance phải được ghi và không dùng như
  independent recall;
- backup/import/legacy evidence có thể giữ lịch sử nhưng không tự nâng mastery.

Evidence tối thiểu cần stable learner/owner scope, item và version, activity và
version, skill, outcome/method, thời gian, assistance/exposure, content provenance
và idempotency key.

## 3. Vòng học

```text
Input/knowledge card
  -> practice có hướng dẫn
  -> independent recall
  -> feedback + remediation
  -> evidence hợp lệ
  -> FSRS/review schedule
  -> recall trễ tạo evidence mới
```

Sai có giá trị đi vào mistake/review. Đúng sau reveal chỉ đóng practice, không
được biến thành recall độc lập. Lặp một form không làm tăng knowledge coverage.

## 4. FSRS và queue ôn

- Card dùng stable knowledge item ID/version và tách modality khi cần.
- Review grade được persist durable trước khi UI chuyển card.
- Retry/cùng idempotency key là no-op; cùng key nhưng body khác là conflict.
- Queue ưu tiên card đến hạn, lỗi gần đây và kỹ năng thiếu evidence; không spam
  item chỉ vì dễ tạo điểm.
- Guest lưu local; account có adapter server. Owner/reset-epoch fence phải được
  kiểm trước restore/adoption/sync.

FSRS dự báo thời điểm ôn, không tự chứng minh mastery. Rating tự khai và lịch ôn
chỉ là một nguồn evidence với reliability phù hợp.

## 5. Coverage và báo tiến độ

Mẫu số là inventory item có activity thật trong runtime; item chỉ nằm trong
draft/JSON không được tính. Tử số là unique item có evidence đúng skill và đủ
điều kiện exposure/assistance.

Khi mẫu còn nhỏ, UI hiển thị số mẫu thay vì thanh 100%. Mastery chỉ hiện sau
ngưỡng mẫu và phân tán thời gian được định nghĩa, có test. Speaking/writing chưa
đo được phải nói “chưa có lượt đo”, không suy từ vocabulary/recognition.

## 6. XP và streak

XP là reward projection local, không phải ledger năng lực. Có thể thưởng cho
nỗ lực, completion, chữa lỗi hoặc ôn đúng hạn, nhưng:

- không cộng coverage/mastery;
- không mở bài thay prerequisite evidence;
- retry không nhân đôi;
- UI không dùng XP làm lời giải thích “đã thành thạo”.

Streak ghi nhịp tham gia theo ngày và phải chịu cùng owner/time-zone/reset
contract. Mất streak không xóa evidence học.

## 7. Migration và kiểm thử bắt buộc

Mọi thay đổi evidence/mastery/FSRS cần fixture cho guest, learner account,
retry, multi-tab, reload, restore, owner switch và legacy import. Giữ stable ID,
old schedule/history và measurement eligibility. Nếu không đọc được version cũ,
fail closed và giữ dữ liệu inspectable thay vì reset âm thầm.

Chỉ claim phát âm, thanh điệu, HSK readiness hoặc calibrated mastery sau khi có
rubric, corpus/provider, pilot threshold và validation tương ứng. Unit test xanh
không thay thế cohort/usability evidence.

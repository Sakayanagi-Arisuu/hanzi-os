# Inventory HSK0–HSK4 và hợp đồng migration

Cập nhật: **10/08/2026**. Tài liệu này bảo toàn inventory/content contract khi
sửa từng module. Nó không phải backlog và không chứng minh chất lượng sư phạm chỉ
bằng số lesson.

## 1. Inventory chuẩn đang dùng

Nguồn materialize tại `content/sources/hsk-syllabus-2026/inventory.json`.

| Cấp | Từ vựng | Chữ nhận dạng | Ngữ pháp | Nhiệm vụ | Chủ đề |
| --- | ---: | ---: | ---: | ---: | ---: |
| HSK1 | 300 | 246 | 66 | 15 | 30 |
| HSK2 | 200 | 125 | 75 | 17 | 34 |
| HSK3 | 500 | 284 | 96 | 22 | 54 |
| HSK4 | 1.000 | 441 | 95 | 30 | 77 |
| Tổng | **2.000** | **1.096** | **332** | **84** | **195** |

Runtime có thêm 16 vocabulary ID demo/bridge, nên tổng runtime là **2.016**.
Inventory chỉ là phạm vi cần phủ; không chứng minh item đã có đủ ngữ cảnh,
activity, recall trễ, audio, nét viết hoặc human/native review.

## 2. Nội dung learner-visible phải giữ

| Cấp | Lesson | Rich Lesson UI |
| --- | ---: | ---: |
| HSK0 | **4/4** | **0/4** |
| HSK1 | **40/40** | **40/40** |
| HSK2 | **40/40** | **40/40** |
| HSK3 | **55/55** | **55/55** |
| HSK4 | **78/78** | **78/78** |
| HSK1–4 | **213/213** | **213/213** |

Package hiện hành là `foundation-2026.08.7`, tổng 217 lesson runtime. “Rich” ở
đây chỉ có nghĩa adapter hiện hành giao lesson qua Lesson UI giàu hoạt động; mỗi
module vẫn phải kiểm độ sâu, tính đúng, mobile/keyboard và restore bằng journey
thật.

Không tự sửa các số trên. Nếu audit phát hiện drift, ghi validator/source và
regression cụ thể vào checkpoint rồi mới cập nhật bảng.

## 3. Assessment đang có

- Level check local: HSK1 50 câu, HSK2 60 câu, HSK3 54 câu, HSK4 72 câu.
- Mock practice: hai form A/B cho mỗi HSK1–4, mỗi form 12 câu và 18–35 phút.
- Mock 12 câu là bài luyện nguyên bản rút gọn, **không phải đề đã thi và không
  phải cấu trúc đầy đủ của kỳ thi HSK**.

Khi sửa assessment, chỉ dùng cấu trúc/mẫu chính thức được công khai hợp lệ làm
tham chiếu. Item, distractor, giải thích và media phải nguyên bản hoặc có giấy
phép/provenance rõ.

## 4. Invariant migration

1. Giữ stable lesson/item/knowledge/card ID khi semantics không đổi; đổi ID cần
   alias map deterministic và test.
2. Attempt giữ content/schema/activity version, idempotency key, timestamp và
   đúng skill evidence; retry không nhân đôi.
3. Bảo toàn completion, mistake, bookmark, FSRS, streak, session dở, reset epoch,
   owner scope và IndexedDB outbox.
4. Guest↔account migration không chiếm nhầm state của owner khác và không
   dual-write vô thời hạn.
5. Không unlock/recommend/count content chưa learner-visible và đã qua gate
   runtime tương ứng.
6. XP, streak, exposure, coverage và mastery là các khái niệm riêng.
7. Browser TTS không phải evidence nói; nhận dạng Hanzi không phải evidence viết
   nét; hint/reveal/IME trợ giúp không phải independent recall.
8. FSRS chỉ đổi sau migration fixture và so sánh lịch mẫu; không reset để đơn
   giản hóa UI.
9. Giữ `humanReviewed: false` tới khi review thật bind đúng artifact/version.
10. Không xóa package/generator/artifact trước khi `rg` xác nhận hết consumer,
    có rollback path và regression test.

## 5. Khi nào một lesson được xác nhận ở module mới

- mục tiêu, prerequisite, level mapping và thời lượng kỳ vọng rõ;
- Hanzi/Pinyin/nghĩa Việt/ví dụ đúng ngữ cảnh;
- có input dễ hiểu, practice có giàn đỡ và independent recall;
- đáp án, distractor, giải thích và remediation hợp lệ;
- activity tạo evidence đúng kỹ năng và không làm progress tăng phi thực tế;
- fallback mic/IME/handwriting không chặn người học;
- dùng được bằng touch/mobile, keyboard và reduced motion;
- deep link, reload/restore, local state và account adapter không chớp/mất dữ liệu;
- validator/test trực tiếp xanh và browser smoke đi trọn journey.

Pipeline nội dung vẫn dùng các trạng thái:

`DRAFT → VALIDATED → AI-REVIEWED → RUNTIME-WIRED → UI-INTEGRATED → COMMITTED`

Chỉ `UI-INTEGRATED` và `COMMITTED` được tính là learner-visible. Generated JSON,
draft, review payload hoặc test xanh mà chưa nối runtime không được cộng coverage.

## 6. Phạm vi và báo cáo

Critical path là Mainland Mandarin, giao diện tiếng Việt, HSK0–HSK4 và
local-first web/PWA. Taiwan Mandarin, Cantonese, native mobile, commerce và
hosted production chỉ mở khi người dùng đổi phạm vi.

Sau mỗi module, báo:

- hành vi người học vừa dùng được và journey đã kiểm;
- module nào đang `CHỜ TEST`, `ĐÃ DUYỆT` hoặc `CÒN LỖI`;
- toàn bộ số HSK0–4 ở bảng bảo toàn nội dung;
- external dependency còn thiếu như native review/audio, thiết bị, ASR/provider
  hoặc credential thật.

Không dùng snapshot roadmap cũ hay số task làm phần trăm parity.

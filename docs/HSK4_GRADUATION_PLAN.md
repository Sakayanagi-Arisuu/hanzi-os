# Kế hoạch HANZI.OS — bản đồ án/tự học HSK0 đến HSK4

Cập nhật: 01/08/2026

Production thương mại, CMS và Sites nằm ngoài critical path cho đến khi người
dùng chủ động mở lại.

## 1. Tóm tắt dễ đọc

Nền local-first ổn định. B1-B4 đã đưa toàn bộ HSK1-4 lên Path và shared rich
Lesson UI; bốn level check chạy end-to-end mà không giả làm chứng nhận.

- **Sẵn sàng toàn dự án: 95/100 (95%)**.
- **HSK0:** 4 bridge, rich 0/4.
- **HSK1:** 40/40 learner-visible, rich 40/40.
- **HSK2:** 40/40 learner-visible, rich 40/40.
- **HSK3:** 55/55 learner-visible, rich 55/55.
- **HSK4:** 78/78 learner-visible, rich 78/78.
- **Toàn HSK1-4 learner-visible:** 213/213 (100%).

95% là readiness toàn dự án; riêng kho bài HSK1-4 đã đạt 100% learner-visible.
5 điểm còn lại thuộc đóng gói đồ án local, không phải nội dung còn thiếu.

## 2. Phạm vi inventory

| Level | Blueprint | Vocabulary tăng thêm | Character | Grammar | Task | Topic |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| HSK1 | 40 | 300 | 246 | 66 | 15 | 30 |
| HSK2 | 40 | 200 | 125 | 75 | 17 | 34 |
| HSK3 | 55 | 500 | 284 | 96 | 22 | 54 |
| HSK4 | 78 | 1.000 | 441 | 95 | 30 | 77 |
| **Tổng** | **213** | **2.000** | **1.096** | **332** | **84** | **195** |

Inventory/draft chỉ là nguồn đích; chỉ bài `UI-INTEGRATED` hoặc `COMMITTED`
mới được tính learner-visible.

## 3. Trạng thái người học nhìn thấy

| Level | Learner-visible | Rich Lesson UI | Level check | Kết luận |
| --- | ---: | ---: | --- | --- |
| HSK0 | 4 bridge | 0/4 | diagnostic nền | lát cầu nối dùng được |
| HSK1 | **40/40** | **40/40** | 50 câu local E2E | hoàn thành B1 local |
| HSK2 | **40/40** | **40/40** | 60 câu local E2E | hoàn thành B2 local |
| HSK3 | **55/55** | **55/55** | 54 câu local E2E | hoàn thành B3 local |
| HSK4 | **78/78** | **78/78** | 72 câu local E2E | hoàn thành B4 local |

HSK4 local phủ đủ 1.000 từ, 441 chữ, 95 ngữ pháp, 30 nhiệm vụ và 77 chủ đề.
78 bài rich gồm 36 deep comprehension, 24 summary/argument và 18 timed
integration; package hiện hành là `foundation-2026.08.4`. Browser TTS chỉ là
synthetic practice và toàn bộ HSK1-4 giữ `humanReviewed: false`.

“Hoàn thành HSK1/2/3/4” ở đây chỉ có nghĩa hoàn thành level tự học local theo
inventory đã pin. Nó không phải production release, native review hay chứng
nhận tương đương kỳ thi HSK chính thức.

## 4. Định nghĩa hoàn thành level

Một level chỉ hoàn thành khi toàn bộ blueprint học được trên UI; coverage đạt
100%; nội dung có độ sâu đúng cấp; prerequisite/progress/persistence đúng;
level check chạy end-to-end theo evidence policy; targeted checks, full boundary
gate và E2E đã xác nhận; checkpoint + roadmap được cập nhật và commit cùng batch.

## 5. Kế hoạch batch-first

### B0 — daily-life và dọn tài liệu

**Hoàn thành.** Package `foundation-2026.07.8` giữ immutable.

### B1 — toàn bộ HSK1

**Hoàn thành tại readiness 88%.** 40/40 bài learner-visible và rich; phủ
300/246/66/15/30; level check 50 câu không cấp mastery/waiver.

### B2 — toàn bộ HSK2

**Hoàn thành tại readiness 91%.** 40/40 bài learner-visible và rich; phủ
200/125/75/17/34; level check 60 câu end-to-end; prerequisite HSK1→HSK2,
progress và persistence giữ đúng.

### B3 — toàn bộ HSK3

**Hoàn thành tại readiness 93%.**

- 55/55 bài learner-visible và rich;
- 25 paragraph input, 15 narration, 15 guided production;
- phủ 500 vocabulary, 284 character, 96 grammar, 22 task, 54 topic;
- 400 dòng paragraph, 90 dòng narration, 92 đơn vị prompt nguồn và 410 lượt
  văn bản/hội thoại trên rich UI;
- prerequisite HSK2→HSK3, progress và persistence giữ đúng;
- level check 54 câu end-to-end, không cấp mastery/waiver;
- full boundary gate và E2E chạy đúng một lượt; fixture/timing drift được sửa
  và xác nhận lại bằng targeted rerun;
- Sites, production, commerce, CMS và human-review workflow giữ nguyên trạng.

### B4 — toàn bộ HSK4

**Hoàn thành tại readiness 95%.**

- 78/78 bài learner-visible và rich;
- 36 deep comprehension, 24 summary/argument, 18 timed integration;
- phủ 1.000 vocabulary, 441 character, 95 grammar, 30 task, 77 topic;
- 216 đoạn dài, 106 đơn vị prompt và 234 lượt văn bản/hội thoại trên rich UI;
- prerequisite HSK3→HSK4, progress và persistence giữ đúng;
- level check 72 câu end-to-end, không cấp mastery/waiver;
- full boundary gate và E2E chạy đúng một lượt; generated, expectation và
  fixture drift được sửa rồi xác nhận bằng targeted rerun;
- Sites, production, commerce, CMS và human-review workflow giữ nguyên trạng.

### B5 — đóng gói đồ án local

**Batch duy nhất tiếp theo.** Đóng local release candidate từ package `.08.4`,
xác nhận Lighthouse/audit và handoff đồ án. Full check, E2E, mobile, keyboard,
reduced-motion và restore đã có evidence B4; Sites/deployment chỉ chạy sau lệnh
riêng của người dùng.

## 6. Thước đo sẵn sàng toàn dự án

| Trụ cột | Tối đa | Hiện tại | Ý nghĩa |
| --- | ---: | ---: | --- |
| A. Ứng dụng/offline learning loop | 20 | 19 | lesson/reader/review, persistence, offline, UX |
| B. Mastery/evidence/remediation | 15 | 12 | FSRS, evidence theo skill, sửa lỗi |
| C. Lộ trình HSK0-4 khác biệt | 15 | 15 | 5 path, 18 unit, blueprint/prerequisite |
| D. Nội dung học được trong runtime | 30 | 30 | HSK0 bridge + toàn bộ HSK1-4 rich |
| E. Assessment/mock | 10 | 10 | HSK1-4 level check E2E |
| F. Đồ án/QA/local release | 10 | 9 | demo/gates mạnh; final package còn mở |
| **Tổng** | **100** | **95** | **Sẵn sàng toàn dự án: 95%** |

Trụ cột D chỉ tăng khi bài mới lên UI. Generated content, test count và số dòng
không tạo điểm.

## 7. Ranh giới nguồn và review

AI được phép viết nội dung gốc và self-review năm pass cho local. UI công bố
`humanReviewed: false`; browser TTS không phải native audio/mastery; production
gate tiếp tục fail-closed. Không mở Sites, commerce, CMS hoặc workflow human
review trong các content batch.

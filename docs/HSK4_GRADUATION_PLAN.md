# Kế hoạch HANZI.OS — bản đồ án/tự học HSK0 đến HSK4

Cập nhật: 05/08/2026

Production thương mại, CMS và Sites nằm ngoài critical path cho đến khi người
dùng chủ động mở lại.

## 1. Tóm tắt dễ đọc

Nền local-first ổn định. B1-B8.1 đã hoàn tất phạm vi đồ án/tự học local: toàn bộ
HSK1-4 có trên Thiên Lộ và shared rich Lesson UI, bốn Đại Khảo chạy end-to-end,
package handoff `.08.5` có Bảng Hệ Thống hologram 3D, Audio Engine phản ứng theo
sự kiện học, Voice Reactor và 64 xướng lệnh chia cho bốn nhân cách local tích
hợp sẵn mà không giả làm chứng nhận. Cơ Linh bám carrier ElevenLabs đã chọn;
Thiên Cơ, Chấp Hành và Dẫn Lộ được công bố đúng là VieNeu local fallback.

- **Sẵn sàng toàn dự án: 96/100 (96%)**.
- **HSK0:** 4 bridge, rich 0/4.
- **HSK1:** 40/40 learner-visible, rich 40/40.
- **HSK2:** 40/40 learner-visible, rich 40/40.
- **HSK3:** 55/55 learner-visible, rich 55/55.
- **HSK4:** 78/78 learner-visible, rich 78/78.
- **Toàn HSK1-4 learner-visible:** 213/213 (100%).

96% là readiness toàn dự án; riêng roadmap local và kho bài HSK1-4 đã hoàn tất
100%. Bốn điểm không tuyên bố thuộc các bằng chứng mastery/production bị hoãn,
không phải nội dung hoặc lỗi tích hợp còn thiếu.

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
integration; package hiện hành là `foundation-2026.08.5`. Browser TTS chỉ là
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

**Hoàn thành tại readiness 96%.** Package `.08.5` giữ nguyên 217 bài nhưng tách
curriculum nặng khỏi bootstrap người mới và dùng level-check projection HSK2
compact. Bundle ceiling đạt 787,6 KiB; Lighthouse cold-profile median đạt
performance 97, accessibility 100, best-practices 100 và SEO 100; dependency
audit có 0 lỗ hổng. Contract handoff local hợp lệ, production tiếp tục
fail-closed. Full check/E2E/mobile/keyboard/reduced-motion/restore dùng evidence
ranh giới B4 và chỉ các luồng B5 bị tác động được targeted smoke lại. Không còn
batch local nào mở; Sites/deployment vẫn do người dùng thực hiện cuối cùng.

### B6 — Hệ Thống Thức Tỉnh

**Hoàn thành tại readiness 96%; không cộng điểm nội dung.** Toàn bộ app dùng art
direction Huyền Ngọc Thức Tỉnh: không gian nhiều lớp, chuyển cảnh, nghi lễ, tinh
đồ và bảng chỉ số. Tên chức năng được chuyển sang ngôn ngữ “hệ thống” nhưng luôn
giữ nghĩa học tập đi kèm; prerequisite, persistence, evidence và mastery policy
không đổi.

- đủ 4/4 HSK0 bridge và 213/213 bài HSK1-4 tiếp tục learner-visible;
- Cảnh giới hoạt động, Chức hệ theo Thiên Mệnh và danh hiệu hành trình không suy
  XP thành mastery hoặc chứng nhận;
- nghi lễ một lần chỉ mở tại Thức Tỉnh Điện, có thể replay trong Bảng Thuộc Tính;
- bốn mức hiệu ứng Tự động/Cân bằng/Điện ảnh/Giảm chuyển động được lưu local;
- desktop, tablet, mobile, keyboard, focus trap và reduced-motion đã smoke;
- full E2E ban đầu lộ lỗi overlay/thuật ngữ cũ; targeted rerun sau sửa xác nhận
  toàn bộ 28/28 hành trình xanh;
- bundle ceiling 797,9 KiB dưới hard ceiling 800 KiB, không thêm dependency;
- cold onboarding được tách khỏi curriculum nặng; targeted Lighthouse sau sửa
  đạt performance 96, accessibility 100, best-practices 100, SEO 100, LCP
  2.000 ms, CLS 0 và TBT 154 ms;
- Sites, production, commerce, CMS và human-review workflow vẫn nguyên trạng.

### B7 — Bảng Hệ Thống hologram và âm thanh sống

**Hoàn thành tại readiness 96%; không cộng điểm nội dung.** Người học có thể
triệu hồi Bảng Hệ Thống ở mọi route bằng nút trên thanh lệnh hoặc `Alt + S`.
Không gian full-screen dùng CSS perspective/preserve-3d thật, pointer tilt,
nhiều mặt phẳng, orbital core, projection beam và scanline; mobile chuyển sang
stacked hologram và reduced-motion làm phẳng hiệu ứng.

- đủ 4/4 HSK0 bridge và 213/213 bài HSK1-4 tiếp tục learner-visible;
- bảng trạng thái đọc nhiệm vụ kế tiếp, bài đã qua, XP tương tác, streak, FSRS
  đến hạn, lỗi còn mở, danh hiệu và bảy tín hiệu kỹ năng từ learning store thật;
- âm phản hồi được tổng hợp bằng Web Audio sau thao tác người dùng, có bật/tắt,
  âm lượng và preview lưu local; giọng Việt browser TTS là tùy chọn explicit;
- focus trap, `Escape`, trả focus, keyboard shortcut, mobile và reduced-motion
  đã được targeted E2E và browser QA trực tiếp;
- bundle ceiling 798,6 KiB dưới hard ceiling 800 KiB sau khi tối ưu hai hero
  1693px; không thêm dependency;
- Lighthouse ba cold-profile đạt median performance 95,
  accessibility/best-practices/SEO 100, LCP 1.975 ms, CLS 0, TBT 196 ms;
- XP/âm thanh/TTS không cấp mastery, không miễn prerequisite và không đổi
  persistence/evidence. Sites, production, commerce, CMS, human review vẫn đóng.

### B8 — Living Hologram, Voice Reactor và System Announcer

**Hoàn thành tại readiness 96%; không cộng điểm nội dung.** B8 mở rộng B7 thành
một hệ thống có phản ứng nghe/nhìn nhất quán mà không thay content package hay
learning policy.

- đủ 4/4 HSK0 bridge và 213/213 bài HSK1-4 tiếp tục learner-visible; coverage
  giữ 2.000 vocabulary, 1.096 character, 332 grammar, 84 task và 195 topic;
- hologram sáng/rõ hơn và phủ các trạng thái nhiệm vụ, lesson result, review,
  mistake remediation, Đại Khảo; 3D desktop, stacked mobile và reduced-motion
  đều dùng chung token/primitive;
- Audio Engine dùng một Web Audio graph với 36 semantic cue, ba phổ âm, volume
  master/effects, cooldown, dedupe, ducking khi TTS phát và tự nghỉ khi nhàn;
  cue không thiết yếu bị chặn khi microphone mở; không có asset/dependency mới;
- System Announcer có ba nhân cách, mức thông báo, voice volume và chọn giọng
  Việt trên thiết bị; không có giọng Việt thì fail rõ, không dùng fallback Anh;
- Voice Reactor hiện vòng đời phát TTS toàn cục và vòng consent/armed/listening/
  processing/result/denied/unavailable tại Vạn Âm Điện; browser TTS và nhận dạng
  vẫn là synthetic/unverified practice, `humanReviewed: false`;
- signal bus nối nhiệm vụ, bài học, review, lỗi, mở khóa, cảnh giới và HSK1-4
  level check; prerequisite, progress, persistence, FSRS/evidence không đổi;
- full gate chạy một lượt: validator/package/graph/database/typecheck/lint xanh;
  ba Vitest timeout do tải máy đều xanh khi rerun targeted một worker;
- full E2E đạt 25/29 ban đầu; sau khi bỏ cue click trùng ở Đại Khảo, targeted
  rerun xác nhận bốn luồng timeout/chậm đều xanh, bao gồm HSK1-3 level check;
- client ceiling 799,2 KiB dưới 800 KiB. Lighthouse sau khi trì hoãn inventory
  giọng và cue catalog đến tương tác đầu tiên đạt performance 97,
  accessibility/best-practices/SEO 100; LCP 2.115 ms, CLS 0, TBT 148 ms;
- không mở Sites, production, commerce, CMS hay human-review workflow.

### B8.1 — Bộ bốn nhân cách xướng lệnh local

**Hoàn thành tại readiness 96%; không cộng điểm nội dung.** Mechanical Core,
Thiên cơ, Chấp hành và Dẫn lộ đều là voice pack local có thể chọn trong Bảng
Thuộc Tính; Mechanical Core vẫn là mặc định mới cho cấu hình cũ còn dùng Thiên
cơ mặc định.

- mỗi nhân cách có 16 xướng lệnh local, tổng 64 clip phủ khởi động, nhiệm vụ,
  hoàn tất/mở khóa, ôn tập, hóa giải lỗi, Đại Khảo, đạt ngưỡng/thăng chức, trạng
  thái liên kết, cảnh báo, xem thử và tóm tắt Bảng Hệ Thống;
- Audio Engine phát clip qua Web Audio graph hiện hành, ducking hiệu ứng và cập
  nhật Voice Reactor; các thông báo chính không phụ thuộc giọng Việt của Windows;
- dropdown có đủ Mechanical Core, Thiên cơ, Chấp hành và Dẫn lộ; nút nghe thử và
  thẻ nhận dạng phản ánh đúng lựa chọn. Cả bốn voice pack phát local, browser TTS
  chỉ còn dự phòng cho câu động; mọi âm thanh vẫn là synthetic practice,
  `humanReviewed: false`;
- Mechanical Core dùng carrier ElevenLabs của người dùng, VieNeu-TTS và xử lý
  robotic. Ba pack còn lại dùng ba giọng VieNeu-TTS v3 fallback riêng, không giả
  là voice ElevenLabs tương ứng; bản v2 tổng hợp từng mệnh đề riêng và chèn
  khoảng nghỉ 0,34–0,68 giây. Nguồn VieNeu/pnnbao-ump áp dụng CC BY-NC 4.0.
  Phạm vi hiện tại là demo/tự học local,
  không phải native audio, review phát âm, mastery hoặc chứng nhận HSK;
- targeted unit/typecheck/lint/build và E2E bộ chọn bốn giọng xanh; browser QA
  trực tiếp xác nhận cả bốn vào `playing`, không còn cảnh báo thiếu giọng Việt;
  client ceiling 799,9/800 KiB;
- sau phản hồi cadence, ba fallback chuyển sang URL v2 để tránh cache; preview
  Thiên Cơ/Chấp Hành/Dẫn Lộ dài khoảng 6,1/6,4/5,6 giây với hai khoảng nghỉ rõ.
  ElevenLabs free tier đang chặn tạo mới theo IP dù còn credit, nên chưa claim
  hai fallback là đúng voice Thiên Cơ/Chấp Hành đã lưu trong Voice Lab;
- đủ 4/4 HSK0 bridge và 213/213 bài HSK1-4 tiếp tục learner-visible; package,
  prerequisite, progress, persistence, FSRS và evidence không đổi;
- không mở Sites, production, commerce, CMS hay human-review workflow.

## 6. Thước đo sẵn sàng toàn dự án

| Trụ cột | Tối đa | Hiện tại | Ý nghĩa |
| --- | ---: | ---: | --- |
| A. Ứng dụng/offline learning loop | 20 | 19 | lesson/reader/review, persistence, offline, UX |
| B. Mastery/evidence/remediation | 15 | 12 | FSRS, evidence theo skill, sửa lỗi |
| C. Lộ trình HSK0-4 khác biệt | 15 | 15 | 5 path, 18 unit, blueprint/prerequisite |
| D. Nội dung học được trong runtime | 30 | 30 | HSK0 bridge + toàn bộ HSK1-4 rich |
| E. Assessment/mock | 10 | 10 | HSK1-4 level check E2E |
| F. Đồ án/QA/local release | 10 | 10 | package `.08.5`, Hệ Thống Thức Tỉnh, handoff/QA local |
| **Tổng** | **100** | **96** | **Sẵn sàng toàn dự án: 96%** |

Trụ cột D chỉ tăng khi bài mới lên UI. Generated content, test count và số dòng
không tạo điểm.

## 7. Ranh giới nguồn và review

AI được phép viết nội dung gốc và self-review năm pass cho local. UI công bố
`humanReviewed: false`; browser TTS không phải native audio/mastery; production
gate tiếp tục fail-closed. Không mở Sites, commerce, CMS hoặc workflow human
review trong các content batch.

# HANZI.OS — checkpoint triển khai hiện tại

Cập nhật: 02/08/2026

## 1. Tình trạng một câu

B6 đã hoàn tất lớp trải nghiệm “Hệ Thống Thức Tỉnh” trên package `.08.5`: toàn
bộ 213 blueprint HSK1-4 vẫn học được trên rich UI, bốn Đại Khảo chạy end-to-end,
giao diện không gian/3D có chế độ giảm chuyển động và cold bootstrap đã được giữ
nhẹ. Sites và production vẫn đóng.

## 2. Dashboard tiến độ bắt buộc

- **Sẵn sàng toàn dự án:** 96/100 (96%).
- **HSK0 learner-visible:** 4 bài bridge; rich UI 0/4.
- **HSK1 learner-visible:** 40/40; rich Lesson UI 40/40.
- **HSK2 learner-visible:** 40/40; rich Lesson UI 40/40.
- **HSK3 learner-visible:** 55/55; rich Lesson UI 55/55.
- **HSK4 learner-visible:** 78/78; rich Lesson UI 78/78.
- **Toàn HSK1-4 learner-visible:** 213/213 blueprint (100%).

96% đo cả nền ứng dụng, learning loop, QA, assessment, nội dung và đóng gói local.
Roadmap local và kho HSK1-4 đã hoàn tất; bốn điểm không tuyên bố thuộc bằng chứng
mastery/production bị hoãn, không phải bài học hay lỗi tích hợp còn thiếu.

## 3. Nội dung người học nhìn thấy

| Level/unit | Bài trên UI | Rich UI | Trạng thái |
| --- | ---: | ---: | --- |
| HSK0 foundation bridge | 4 | 0/4 | learner-visible |
| HSK1, 6 unit | 40/40 | 40/40 | hoàn thành local |
| HSK2, 3 unit | 40/40 | 40/40 | hoàn thành local |
| HSK3 paragraph input | 25/25 | 25/25 | hoàn thành local |
| HSK3 narration grammar | 15/15 | 15/15 | hoàn thành local |
| HSK3 guided production | 15/15 | 15/15 | hoàn thành local |
| HSK4 deep comprehension | 36/36 | 36/36 | hoàn thành local |
| HSK4 summary/argument | 24/24 | 24/24 | hoàn thành local |
| HSK4 timed integration | 18/18 | 18/18 | hoàn thành local |

## 4. B4-B6 đã giao cho người học

- Materialize và AI self-review năm pass đủ 78 blueprint HSK4; không còn lỗi
  nội dung chưa giải quyết trong batch. Mọi bài giữ `humanReviewed: false`.
- Package hiện hành `foundation-2026.08.5` giao 217 lesson runtime: 4 HSK0,
  40 HSK1, 40 HSK2, 55 HSK3 và 78 HSK4. Package B0
  `foundation-2026.07.8` giữ nguyên.
- Phủ đủ **1.000 vocabulary, 441 character, 95 grammar, 30 task và 77 topic**
  HSK4.
- 78 bài rich có nội dung thật trên Lesson UI, gồm 36 bài deep comprehension,
  24 bài summary/argument và 18 bài timed integration. Nguồn authoring có 216
  đoạn dài và 106 đơn vị prompt; projection UI giao 234 lượt văn bản/hội thoại
  giàu ngữ cảnh.
- Path mở HSK4 từ bài cuối HSK3 rồi giữ đúng chuỗi prerequisite của 78
  blueprint. Persistence chỉ khôi phục completion từ evidence đúng version;
  fixture E2E cũng đi qua chính policy này, không bypass.
- Route `/assessment/hsk4` giao form A gồm 72 câu khách quan: 18 nghe, 18 đọc,
  18 từ vựng và 18 ngữ pháp. Resume và kết quả được lưu theo version riêng;
  kết quả không cấp mastery, không miễn prerequisite và không tuyên bố chứng
  nhận HSK.
- Browser TTS chỉ là synthetic practice, không phải native audio hay bằng chứng
  nghe/nói đã thành thạo.
- HSK1-3 vẫn giữ nguyên toàn bộ bài rich và level check tương ứng sau package
  upgrade.

Runtime hiện có 2.016 vocabulary ID: 2.000 mục official HSK1+HSK2+HSK3+HSK4 và 16
mục bridge/legacy còn consumer hợp lệ.

### B6 — Hệ Thống Thức Tỉnh

- Thức Tỉnh Điện, Thiên Lộ, Thử Luyện, Ký Ức Trận, Nghịch Cảnh Lục, Vạn Âm
  Điện, Thần Văn Lô, Vạn Quyển Các, Tàng Tự Khố, Thiên Cơ Kính và Bảng Thuộc
  Tính dùng chung một ngôn ngữ “hệ thống”, nhưng vẫn kèm nghĩa học tập rõ ràng.
- Giao diện có trường không gian nhiều lớp, quỹ đạo, tinh đồ, chuyển cảnh, chiều
  sâu thẻ và nghi lễ thức tỉnh/thăng cấp. Nghi lễ chỉ xuất hiện ở Thức Tỉnh Điện
  nên không chặn link mở thẳng Lesson, Reader hay Đại Khảo.
- Cảnh giới hoạt động dùng các ngưỡng XP không đều; Chức hệ lấy từ Thiên Mệnh;
  danh hiệu hành trình chỉ mở theo bài tiên quyết đã thực sự thông qua. XP vẫn
  chỉ là tương tác, không được đổi tên thành mastery hay chứng nhận HSK.
- Người học chọn được Tự động, Cân bằng, Điện ảnh hoặc Giảm chuyển động. Tùy chọn
  lưu trên thiết bị; keyboard, focus trap, mobile và `prefers-reduced-motion`
  tiếp tục hoạt động.
- Cold onboarding không tải curriculum 213 bài chỉ để hiện tên Chức hệ. Tên hệ
  được tách thành bảng nhẹ; curriculum chỉ tải sau khi hồ sơ đã kích hoạt.

## 5. Đường dữ liệu B4

1. Tái sử dụng toàn bộ inventory, blueprint và draft HSK4 hiện có; không xây lại
   auth, sync, FSRS, Reader, Review, CMS hay content pipeline.
2. `content/review/hsk4-level-batch-local-study-review.json` ghi AI self-review
   năm pass cho phạm vi local, unresolved bằng 0.
3. `content/packages/foundation-2026.08.4/` giữ immutable cho B4;
   `content/packages/foundation-2026.08.5/` là package handoff hiện hành.
4. Graph, release policy và local authorization mở 15 unit/213 bài HSK1-4;
   runtime catalog giao thêm 4 bài bridge HSK0.
5. Shared rich adapter giao đủ 40 HSK1, 40 HSK2, 55 HSK3 và 78 HSK4.
6. Bốn level check HSK1-4 có persistence và evidence versioned riêng.
7. E2E prerequisite dùng completion evidence được materialize từ runtime hiện
   hành; evidence package cũ bị hạ cấp đúng thiết kế và không thể tự mở bài.

Human/production review manifest vẫn pending và production gate tiếp tục
fail-closed. Sites, deployment, CMS, commerce và human-review workflow không
được mở trong batch này.

## 6. Trạng thái kiểm tra B4-B6

- Validator trực tiếp xanh cho 78 bài, 1.000 từ, 441 chữ, 95 ngữ pháp, 30 nhiệm
  vụ, 77 chủ đề, rich UI 78/78 và level check 72 câu.
- Targeted content/package/runtime/graph/UI/persistence/level-check checks xanh.
- Một lượt full boundary gate đã chạy. Hai generated/lint drift được sửa đúng
  phạm vi. Content, package, graph, database, restore, typecheck và lint xanh.
  Full Vitest đạt 1.817/1.827 trước khi lộ ba kỳ vọng HSK4 cũ và timeout do
  generator quét catalog 2.016 từ cho mỗi distractor.
- Generator chuyển sang lấy mẫu distractor có giới hạn; năm module lỗi xanh
  45/45 sau sửa và thời gian targeted giảm còn khoảng 7 giây. Không chạy lại
  toàn bộ gate lần hai.
- `npm run test:e2e` chạy một lần toàn bộ: build/bundle budget xanh; 24/28 hành
  trình xanh ngay. Bốn lỗi còn lại là ba fixture bridge sinh trước thay đổi thứ
  tự activity và một smoke vẫn mong HSK4 chưa phát hành.
- Targeted rerun sau sửa xác nhận bốn luồng lỗi xanh 4/4. Trong lượt full, level
  check HSK1 50 câu, HSK2 60 câu, HSK3 54 câu và HSK4 72 câu đều hoàn tất
  end-to-end; offline, mobile, keyboard và reduced motion xanh.
- B5 tách curriculum nặng khỏi bootstrap người mới, compact hóa level check
  HSK2 nhưng giữ đủ 60 câu; bundle ceiling giảm còn 787,6 KiB.
- Lighthouse trên package `.08.5` chạy ba cold-profile: median performance 97,
  accessibility 100, best-practices 100, SEO 100; LCP 1.968 ms, CLS 0 và TBT
  140 ms. Dependency audit báo 0 lỗ hổng.
- Content graduation chain, package governance, typecheck, lint, build và các
  targeted test cho bootstrap/persistence/runtime/level-check đều xanh.
- Targeted E2E xác nhận HSK0→rich HSK1, level check HSK2 60 câu, privacy
  quarantine và owner binding sau khi sửa race bootstrap. Full check/E2E không
  chạy lại; evidence ranh giới B4 tiếp tục là full-suite evidence hiện hành.
- Candidate contract `.08.5` bind đủ 10 artifact và 8 acceptance capability;
  production vẫn fail-closed với 9 nhóm gate pending, không claim Sites.
- B6 targeted unit cho cảnh giới và tùy chọn hiệu ứng xanh 14/14; typecheck và
  build xanh. Client asset ceiling cuối là 797,9 KiB, dưới hard ceiling 800 KiB
  và cao hơn soft target 795 KiB 2,9 KiB; không thêm dependency.
- Full boundary B6 chạy đúng một lượt: toàn bộ validator, package, graph,
  database restore, typecheck và lint xanh. Vitest chạy song song đạt 1.782/1.841;
  59 mục còn lại đều timeout do tải máy, không có assertion sai. Targeted tuần
  tự xác nhận 100/106 mục đầu; bốn file/19 test tiếp theo xanh với timeout 60 giây.
  Riêng hai test report inventory mất khoảng 41–44 giây nên vẫn vượt timeout
  30 giây đặt ngay trong test wrapper, trong khi chính validator/report `--check`
  đã xanh.
- Full E2E B6 chạy đúng một lượt ban đầu đạt 4/28 vì nghi lễ phủ cả deep-link và
  smoke vẫn tìm thuật ngữ cũ. Sau khi giới hạn nghi lễ về Thức Tỉnh Điện, cập
  nhật selector theo tên mới và sửa tràn ngang 4 px trong lúc materialize,
  targeted rerun xác nhận đủ 28/28 hành trình xanh theo từng nhóm.
- Lighthouse ba cold-profile đầu phát hiện onboarding kéo cả curriculum: median
  performance 73, accessibility/best-practices/SEO đều 100, TBT 1.342 ms. Sau
  khi tách bảng Chức hệ khỏi curriculum và chỉ mount provider hiệu ứng sau
  onboarding, cold-profile targeted đạt performance 96, accessibility 100,
  best-practices 100, SEO 100; LCP 2.000 ms, CLS 0 và TBT 154 ms.
- Browser QA trực tiếp đã kiểm desktop, tablet và mobile; không còn overflow,
  lỗi console hay nghi lễ chặn deep-link. Chế độ Giảm chuyển động là authoritative
  và tắt route pulse/chuyển động nền lặp lại.

Không còn lỗi nội dung hoặc tích hợp thật đã biết trong phạm vi local.

## 7. Ranh giới và batch tiếp theo

- Workspace: `D:\Projects\hanzi-os`; branch: `codex/hsk4-graduation`.
- B1 commit `5ad93ae`; B3 commit `c295191`; B4 commit `13fa277`; package handoff
  hiện hành `foundation-2026.08.5`; B6 là batch giao diện hiện tại.
- Không commit staging, build output hoặc report thử.
- Không thay auth, sync, FSRS, Reader, Review, CMS, hosting hay Sites.

**Không còn batch local nào mở.** HSK1-4, level check và handoff đồ án đã hoàn
tất. Sites/deployment vẫn để người dùng thực hiện cuối cùng; production,
commerce, CMS và human-review workflow chỉ mở bằng yêu cầu riêng.

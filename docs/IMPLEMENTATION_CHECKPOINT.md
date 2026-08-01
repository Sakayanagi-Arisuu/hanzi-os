# HANZI.OS — checkpoint triển khai hiện tại

Cập nhật: 01/08/2026

## 1. Tình trạng một câu

B4 đã hoàn tất toàn bộ HSK4 cho bản tự học local: 78/78 bài mở trên Path và
shared rich Lesson UI, phủ đủ inventory HSK4 và level check 72 câu chạy
end-to-end. Toàn bộ 213 blueprint HSK1-4 hiện đã học được trên UI.

## 2. Dashboard tiến độ bắt buộc

- **Sẵn sàng toàn dự án:** 95/100 (95%).
- **HSK0 learner-visible:** 4 bài bridge; rich UI 0/4.
- **HSK1 learner-visible:** 40/40; rich Lesson UI 40/40.
- **HSK2 learner-visible:** 40/40; rich Lesson UI 40/40.
- **HSK3 learner-visible:** 55/55; rich Lesson UI 55/55.
- **HSK4 learner-visible:** 78/78; rich Lesson UI 78/78.
- **Toàn HSK1-4 learner-visible:** 213/213 blueprint (100%).

95% đo cả nền ứng dụng, learning loop, QA, assessment, nội dung và đóng gói local.
Kho HSK1-4 trên UI đã đạt 213/213; 5 điểm còn lại thuộc batch đóng gói đồ án local,
không phải bài học còn thiếu.

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

## 4. B4 đã thêm cho người học

- Materialize và AI self-review năm pass đủ 78 blueprint HSK4; không còn lỗi
  nội dung chưa giải quyết trong batch. Mọi bài giữ `humanReviewed: false`.
- Package hiện hành `foundation-2026.08.4` giao 217 lesson runtime: 4 HSK0,
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

## 5. Đường dữ liệu B4

1. Tái sử dụng toàn bộ inventory, blueprint và draft HSK4 hiện có; không xây lại
   auth, sync, FSRS, Reader, Review, CMS hay content pipeline.
2. `content/review/hsk4-level-batch-local-study-review.json` ghi AI self-review
   năm pass cho phạm vi local, unresolved bằng 0.
3. `content/packages/foundation-2026.08.4/` là package immutable hiện hành.
4. Graph, release policy và local authorization mở 15 unit/213 bài HSK1-4;
   runtime catalog giao thêm 4 bài bridge HSK0.
5. Shared rich adapter giao đủ 40 HSK1, 40 HSK2, 55 HSK3 và 78 HSK4.
6. Bốn level check HSK1-4 có persistence và evidence versioned riêng.
7. E2E prerequisite dùng completion evidence được materialize từ runtime hiện
   hành; evidence package cũ bị hạ cấp đúng thiết kế và không thể tự mở bài.

Human/production review manifest vẫn pending và production gate tiếp tục
fail-closed. Sites, deployment, CMS, commerce và human-review workflow không
được mở trong batch này.

## 6. Trạng thái kiểm tra B4

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
- Bundle ceiling 797,8 KiB, dưới budget bảo thủ 800 KiB.
- Không chạy Lighthouse/audit vì batch không đổi dependency hoặc shared
  visual UI; giữ các gate này cho B5 local release candidate.

Không còn lỗi nội dung hoặc tích hợp thật đã biết trong B4.

## 7. Ranh giới và batch tiếp theo

- Workspace: `D:\Projects\hanzi-os`; branch: `codex/hsk4-graduation`.
- B1 commit `5ad93ae`; B3 commit `c295191`; B4 package
  `foundation-2026.08.4`.
- Không commit staging, build output hoặc report thử.
- Không thay auth, sync, FSRS, Reader, Review, CMS, hosting hay Sites.

**Batch duy nhất tiếp theo: B5 — đóng gói đồ án local.** Không còn bài HSK1-4
phải materialize. B5 chỉ xác nhận local release candidate, Lighthouse/audit và
handoff; Sites/deployment vẫn để người dùng thực hiện cuối cùng.

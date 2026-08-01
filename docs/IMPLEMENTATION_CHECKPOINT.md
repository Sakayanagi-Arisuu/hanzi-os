# HANZI.OS — checkpoint triển khai hiện tại

Cập nhật: 01/08/2026

## 1. Tình trạng một câu

B3 đã hoàn tất toàn bộ HSK3 cho bản tự học local: 55/55 bài mở trên Path và
shared rich Lesson UI, phủ đủ inventory HSK3 và level check 54 câu chạy
end-to-end. HSK4 vẫn chỉ là inventory/blueprint/draft, chưa được tính
learner-visible.

## 2. Dashboard tiến độ bắt buộc

- **Sẵn sàng toàn dự án:** 93/100 (93%).
- **HSK0 learner-visible:** 4 bài bridge; rich UI 0/4.
- **HSK1 learner-visible:** 40/40; rich Lesson UI 40/40.
- **HSK2 learner-visible:** 40/40; rich Lesson UI 40/40.
- **HSK3 learner-visible:** 55/55; rich Lesson UI 55/55.
- **HSK4 learner-visible:** 0/78; rich Lesson UI 0/78.
- **Toàn HSK1-4 learner-visible:** 135/213 blueprint (63,4%).

93% đo cả nền ứng dụng, learning loop, QA, assessment và nội dung. 135/213 mới
là tiến độ đưa kho HSK1-4 lên giao diện để người học thực sự mở và học được.

## 3. Nội dung người học nhìn thấy

| Level/unit | Bài trên UI | Rich UI | Trạng thái |
| --- | ---: | ---: | --- |
| HSK0 foundation bridge | 4 | 0/4 | learner-visible |
| HSK1, 6 unit | 40/40 | 40/40 | hoàn thành local |
| HSK2, 3 unit | 40/40 | 40/40 | hoàn thành local |
| HSK3 paragraph input | 25/25 | 25/25 | hoàn thành local |
| HSK3 narration grammar | 15/15 | 15/15 | hoàn thành local |
| HSK3 guided production | 15/15 | 15/15 | hoàn thành local |
| HSK4 | 0/78 | 0/78 | learner-hidden |

## 4. B3 đã thêm cho người học

- Materialize và AI self-review năm pass đủ 55 blueprint HSK3; không còn lỗi
  nội dung chưa giải quyết trong batch. Mọi bài giữ `humanReviewed: false`.
- Package hiện hành `foundation-2026.08.3` giao 139 lesson runtime: 4 HSK0,
  40 HSK1, 40 HSK2 và 55 HSK3. Package B0 `foundation-2026.07.8` giữ nguyên.
- Phủ đủ **500 vocabulary, 284 character, 96 grammar, 22 task và 54 topic**
  HSK3.
- 55 bài rich có nội dung thật trên Lesson UI, gồm 25 bài paragraph input,
  15 bài narration và 15 bài guided production. Nguồn authoring chứa 400 dòng
  paragraph, 90 dòng narration và 92 đơn vị prompt; projection UI giao 410
  lượt văn bản/hội thoại giàu ngữ cảnh.
- Path mở HSK3 từ bài cuối HSK2 rồi giữ đúng chuỗi prerequisite của 55
  blueprint. Persistence chỉ khôi phục completion từ evidence đúng version;
  fixture E2E cũng đi qua chính policy này, không bypass.
- Route `/assessment/hsk3` giao form A gồm 54 câu khách quan: 12 nghe, 12 đọc,
  15 từ vựng và 15 ngữ pháp. Resume và kết quả được lưu theo version riêng;
  kết quả không cấp mastery, không miễn prerequisite và không tuyên bố chứng
  nhận HSK.
- Browser TTS chỉ là synthetic practice, không phải native audio hay bằng chứng
  nghe/nói đã thành thạo.
- HSK1 và HSK2 vẫn giữ 40/40 bài, 40/40 rich UI và level check tương ứng sau
  package upgrade.

Runtime hiện có 1.016 vocabulary ID: 1.000 mục official HSK1+HSK2+HSK3 và 16
mục bridge/legacy còn consumer hợp lệ.

## 5. Đường dữ liệu B3

1. Tái sử dụng toàn bộ inventory, blueprint và draft HSK3 hiện có; không xây lại
   auth, sync, FSRS, Reader, Review, CMS hay content pipeline.
2. `content/review/hsk3-level-batch-local-study-review.json` ghi AI self-review
   năm pass cho phạm vi local, unresolved bằng 0.
3. `content/packages/foundation-2026.08.3/` là package immutable hiện hành.
4. Graph, release policy và local authorization mở 12 unit/135 bài HSK1-3;
   runtime catalog giao thêm 4 bài bridge HSK0 và tiếp tục khóa HSK4.
5. Shared rich adapter giao đủ 40 HSK1, 40 HSK2 và 55 HSK3.
6. Ba level check HSK1-3 có persistence và evidence versioned riêng.
7. E2E prerequisite dùng completion evidence được materialize từ runtime hiện
   hành; evidence package cũ bị hạ cấp đúng thiết kế và không thể tự mở bài.

Human/production review manifest vẫn pending và production gate tiếp tục
fail-closed. Sites, deployment, CMS, commerce và human-review workflow không
được mở trong batch này.

## 6. Trạng thái kiểm tra B3

- Validator trực tiếp xanh cho 55 bài, 500 từ, 284 chữ, 96 ngữ pháp, 22 nhiệm
  vụ, 54 chủ đề, rich UI 55/55 và level check 54 câu.
- Targeted content/package/runtime/graph/UI/persistence/level-check checks xanh.
- Một lượt `npm run check` đã chạy tại ranh giới batch. Precheck, lockfile,
  typecheck, lint, content, graph, database và restore xanh. Full Vitest đạt
  1.727/1.743 trước khi lộ 14 fixture package chưa biết `.08.3` và hai timeout
  do quét catalog 139 bài.
- Sau khi sửa đúng phạm vi, ba cụm Vitest liên quan xanh 48/48. Không chạy lại
  toàn bộ gate lần hai theo quy tắc chỉ chạy full gate một lần ở ranh giới.
- `npm run test:e2e` chạy một lần toàn bộ: build và bundle budget xanh; 23/26
  hành trình xanh ngay. Ba lỗi còn lại là hai fixture prerequisite mang version
  cũ và một smoke HSK1 làm dư nhiều lesson sau mục tiêu cầu nối.
- Targeted rerun sau sửa xác nhận rich HSK2/3 xanh 2/2 và smoke HSK0→rich HSK1
  xanh 1/1. Trong lượt full, level check HSK1 50 câu, HSK2 60 câu và HSK3 54
  câu đều hoàn tất end-to-end; offline, mobile, keyboard và reduced motion xanh.
- Không chạy Lighthouse/audit vì batch không đổi dependency hoặc shared
  performance; giữ các gate này cho local release candidate.

Không còn lỗi nội dung hoặc tích hợp thật đã biết trong B3.

## 7. Ranh giới và batch tiếp theo

- Workspace: `D:\Projects\hanzi-os`; branch: `codex/hsk4-graduation`.
- B1 commit `5ad93ae`; B2 package `foundation-2026.08.2`; B3 package
  `foundation-2026.08.3`.
- Không commit staging, build output hoặc report thử.
- Không thay auth, sync, FSRS, Reader, Review, CMS, hosting hay Sites.

**Batch duy nhất tiếp theo: B4 — toàn bộ HSK4 (78 blueprint)**, batch-first:
deep comprehension, summary/argument và timed integration; phủ 1.000 vocabulary,
441 character, 95 grammar, 30 task, 77 topic; đưa 78/78 bài lên rich Lesson UI
và tích hợp level check HSK4 end-to-end.

# HANZI.OS — checkpoint triển khai hiện tại

Cập nhật: 01/08/2026

## 1. Tình trạng một câu

B2 đã hoàn tất toàn bộ HSK2 cho bản tự học local: 40/40 bài mở trên Path và
Lesson UI, cả 40 bài có nội dung chuyên sâu; level check 60 câu chạy end-to-end.
HSK3-4 vẫn chỉ có inventory/blueprint/draft và chưa được tính learner-visible.

## 2. Dashboard tiến độ bắt buộc

- **Sẵn sàng toàn dự án:** 91/100 (91%).
- **HSK0 learner-visible:** 4 bài bridge; rich UI 0/4.
- **HSK1 learner-visible:** 40/40; rich Lesson UI 40/40.
- **HSK2 learner-visible:** 40/40; rich Lesson UI 40/40.
- **HSK3 learner-visible:** 0/55; rich Lesson UI 0/55.
- **HSK4 learner-visible:** 0/78; rich Lesson UI 0/78.
- **Toàn HSK1-4 learner-visible:** 80/213 blueprint (37,6%).

91% đo cả nền ứng dụng, learning loop, QA, assessment và nội dung. 80/213 mới
là tiến độ đưa kho HSK1-4 lên giao diện cho người học.

## 3. Nội dung người học nhìn thấy

| Level/unit | Bài trên UI | Rich UI | Trạng thái |
| --- | ---: | ---: | --- |
| HSK0 foundation bridge | 4 | 0/4 | learner-visible |
| HSK1, 6 unit | 40/40 | 40/40 | hoàn thành local |
| HSK2 situational dialogue | 20/20 | 20/20 | hoàn thành local |
| HSK2 sentence chains | 10/10 | 10/10 | hoàn thành local |
| HSK2 short-text production | 10/10 | 10/10 | hoàn thành local |
| HSK3 | 0/55 | 0/55 | learner-hidden |
| HSK4 | 0/78 | 0/78 | learner-hidden |

## 4. B2 đã thêm cho người học

- Materialize và AI self-review năm pass đủ 40 blueprint HSK2; mọi bài giữ
  `humanReviewed: false`, local-only và không suy ra production/native review.
- Package hiện hành `foundation-2026.08.2` giao 84 lesson runtime: 4 HSK0,
  40 HSK1 và 40 HSK2. Package B0 `foundation-2026.07.8` giữ nguyên.
- Phủ đủ **200 vocabulary, 125 character, 75 grammar, 17 task và 34 topic** HSK2.
- Rich Lesson UI HSK2 có 200 lượt hội thoại, 75 điểm ngữ pháp chính thức,
  17 nhiệm vụ, 34 chủ đề, 125 chữ và 104 đơn vị luyện short text.
- Path mở HSK2 theo prerequisite từ bài cuối HSK1 qua đủ ba unit; persistence
  chỉ giữ tiến độ có evidence hợp lệ và resume đúng sau reload.
- Route `/assessment/hsk2` giao form A gồm 60 câu khách quan: 15 nghe, 15 đọc,
  15 từ vựng và 15 ngữ pháp. Kết quả không cấp mastery, không miễn prerequisite
  và không tuyên bố chứng nhận HSK.
- Browser TTS chỉ là synthetic practice, không phải native audio hay bằng chứng
  nghe/nói đã thành thạo.
- HSK1 vẫn giữ 40/40 bài, 40/40 rich UI và level check 50 câu sau package upgrade.

Runtime hiện có 516 vocabulary ID: 500 mục official HSK1+HSK2 và 16 mục
bridge/legacy còn consumer hợp lệ.

## 5. Đường dữ liệu B2

1. Nguồn HSK2 hiện có trong `content/drafts/hsk2-*` được tái sử dụng.
2. `content/review/hsk2-level-batch-local-study-review.json` giữ AI self-review
   năm pass cho phạm vi local.
3. `content/packages/foundation-2026.08.2/` là package immutable hiện hành.
4. Graph, release policy và local authorization mở 9 unit/80 bài HSK1+2, tiếp
   tục khóa HSK3-4.
5. Runtime catalog giao 84 lesson; rich adapter giao 40 bài HSK1 và 40 bài HSK2.
6. HSK2 level check có persistence và evidence versioned riêng.
7. UI smoke dùng evidence hợp lệ của bài cuối HSK1 để chứng minh prerequisite
   mở đúng bài đầu HSK2, không dùng bypass.

Human/production review manifest vẫn pending và production gate tiếp tục
fail-closed. Sites, deployment, CMS, commerce và human-review workflow không
được mở trong batch này.

## 6. Trạng thái kiểm tra B2

- Validator trực tiếp xanh cho 40 bài, 200 từ, 125 chữ, 75 ngữ pháp, 17 nhiệm
  vụ, 34 chủ đề, 60 câu level check và 104 đơn vị short text.
- Targeted content/runtime/graph/UI/persistence/level-check checks xanh.
- Một lượt `npm run check` đã chạy tại ranh giới batch. Precheck, typecheck,
  lint, content, graph, database và restore đều xanh; full Vitest đạt
  1.681/1.683 trước khi lộ hai drift do số lesson tăng.
- Hai drift là kỳ vọng đếm speaking lesson cũ và timeout 10 giây của test tạo
  form cho mọi released lesson. Sau khi sửa đúng phạm vi, 25/25 test liên quan
  xanh; production build và bundle budget xanh trong lượt E2E.
- `npm run test:e2e` chạy một lần toàn bộ và **24/24 hành trình xanh**, gồm
  rich HSK2, prerequisite thật, resume/hoàn tất 60 câu level check, persistence,
  offline, mobile, keyboard và reduced motion.
- Không chạy Lighthouse/audit vì batch không đổi dependency hoặc shared
  performance; giữ các gate này cho local release candidate.

## 7. Ranh giới và batch tiếp theo

- Workspace: `D:\Projects\hanzi-os`; branch: `codex/hsk4-graduation`.
- B1 đã commit tại `5ad93ae`; B2 dùng package `foundation-2026.08.2`.
- Không commit staging, build output hoặc report thử.
- Không thay auth, sync, FSRS, Reader, Review, CMS hay hosting.

**Batch duy nhất tiếp theo: B3 — toàn bộ HSK3 (55 blueprint)**, batch-first:
paragraph input, narration và guided production; phủ 500 vocabulary, 284
character, 96 grammar, 22 task, 54 topic; đưa 55/55 bài lên rich Lesson UI và
tích hợp level check HSK3 end-to-end.

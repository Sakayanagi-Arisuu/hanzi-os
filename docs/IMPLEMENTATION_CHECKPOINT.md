# HANZI.OS — checkpoint triển khai hiện tại

Cập nhật: 01/08/2026

Tài liệu này ghi trạng thái thật tại commit hiện tại: người học đang dùng được
gì, tiến độ được tính ra sao và level batch nào cần làm tiếp. Git history giữ
chi tiết các lát cũ; không chép nhật ký dài vào đây.

## 1. Tình trạng một câu

B1 đã hoàn tất toàn bộ HSK1 cho bản tự học local: 40/40 bài mở được trên Path và
Lesson UI, cả 40 bài đều có nội dung chuyên sâu; level check 50 câu chạy
end-to-end. HSK2-4 có inventory và blueprint/draft nhưng chưa được đưa lên UI.

## 2. Dashboard tiến độ bắt buộc

- **Sẵn sàng toàn dự án:** 88/100 (88%).
- **HSK0 learner-visible:** 4 bài cầu nối; rich UI 0/4.
- **HSK1 learner-visible:** 40/40 blueprint (100%).
- **HSK1 rich Lesson UI:** 40/40 (100%).
- **Toàn HSK1-4 learner-visible:** 40/213 blueprint (18,8%).
- **HSK2:** 0/40; **HSK3:** 0/55; **HSK4:** 0/78.

Con số 88% đo cả nền ứng dụng, kiến trúc, QA và nội dung. Con số 40/213 mới là
tốc độ đưa kho HSK1-4 lên giao diện cho người học.

## 3. Nội dung người học nhìn thấy

| Level/unit | Bài trên UI | Rich UI | Trạng thái |
| --- | ---: | ---: | --- |
| HSK0 foundation bridge | 4 | 0 | learner-visible |
| HSK1 personal exchange | 9 | 9 | hoàn thành local |
| HSK1 time/place/events | 6 | 6 | hoàn thành local |
| HSK1 daily life | 4 | 4 | hoàn thành local |
| HSK1 travel/leisure | 2 | 2 | hoàn thành local |
| HSK1 study/work | 4 | 4 | hoàn thành local |
| HSK1 character foundation | 15 | 15 | hoàn thành local |
| HSK2 | 0/40 | 0 | learner-hidden |
| HSK3 | 0/55 | 0 | learner-hidden |
| HSK4 | 0/78 | 0 | learner-hidden |

## 4. B1 đã thêm cho người học

- Materialize và AI self-review năm pass toàn bộ 40 blueprint HSK1; disclosure
  giữ `humanReviewed: false` và không suy ra production/native review.
- Package immutable hiện tại là `foundation-2026.08.1`: 44 bài runtime gồm 4
  bridge HSK0 và 40 bài HSK1.
- Phủ đủ inventory HSK1 trên bài học: **300 vocabulary, 246 character, 66
  grammar, 15 task và 30 topic**.
- Rich Lesson UI có 40/40 bài, 132 lượt hội thoại mẫu, giải thích ngữ pháp trong
  ngữ cảnh, guided self-check và nhiệm vụ giao tiếp/nhận diện chữ phù hợp bài.
- Path mở bài theo chuỗi prerequisite từ `boot-4` qua đủ sáu unit HSK1; lesson
  chưa đủ prerequisite vẫn fail-closed.
- Tiến độ HSK1 cũ hợp lệ được giữ khi nâng package; reload tiếp tục đúng lesson
  session, đáp án và evidence đã lưu.
- Card level check HSK1 mở route `/assessment/hsk1`: 50 câu gồm 15 nghe, 15 đọc,
  10 từ vựng và 10 ngữ pháp; phiên làm được lưu và tiếp tục sau reload.
- Kết quả level check chỉ mô tả độ chính xác quan sát, không cấp mastery, không
  miễn prerequisite và không tuyên bố chứng nhận HSK.
- Browser TTS chỉ là âm thanh luyện tập tổng hợp, không phải audio bản ngữ hay
  bằng chứng phát âm/nghe đã thành thạo.

Runtime vocabulary có 316 ID: đủ 300 mục official HSK1 và 16 mục bridge/legacy
vẫn còn consumer hợp lệ. Bốn orphan alias cũ đã được loại khỏi runtime; mục
`越南` ngoài inventory tiếp tục được báo rõ, không được tính vào coverage HSK1.

## 5. Đường dữ liệu B1

1. `content/drafts/hsk1-*` giữ inventory, blueprint và authoring source đã có.
2. `content/review/hsk1-level-batch-local-study-review.json` giữ kết quả AI
   self-review năm pass cho phạm vi local.
3. `content/packages/foundation-2026.08.1/` là package immutable hiện hành.
4. Local authorization, curriculum graph và release policy mở đúng 6 unit/40
   bài HSK1 nhưng tiếp tục khóa HSK2-4.
5. Sanitized runtime catalog giao 44 bài cho adapter; rich artifact giao 40 bài
   HSK1 cho shared Lesson UI.
6. `src/data/hsk1LevelCheck.ts` và `src/screens/Hsk1LevelCheckPage.tsx` giao level
   check có persistence, versioning và disclosure local-only.
7. Path, Lesson UI và E2E mở nội dung thật thay vì chỉ xác nhận JSON tồn tại.

Review manifest dành cho human/production vẫn pending và không được dùng để
suy ra production eligibility. Nó không phủ định authorization tự học local đã
được AI review và công bố rõ `humanReviewed: false`.

## 6. Trạng thái kiểm tra B1

- Validator trực tiếp xác nhận 40 bài, 300 từ, 246 chữ, 66 điểm ngữ pháp, 15
  nhiệm vụ, 30 chủ đề và 50 câu level check.
- Targeted Vitest cho content/runtime/graph/UI/persistence/level check xanh; các
  fixture từng giả định HSK1 còn ở draft đã được cập nhật theo release hiện tại.
- `npm run check`: **xanh**, gồm typecheck, lint, content gates, D1 restore,
  **231 file / 1.637 test**, production build và bundle budget.
- `npm run test:e2e` được chạy một lần toàn bộ: 19/22 xanh ở lượt đầu; ba lỗi là
  fixture/selector E2E cũ và init script tự ghi đè state khi reload. Sau khi sửa,
  đúng các spec lỗi đều xanh, gồm persistence đủ 50/50 evidence và walkthrough
  HSK0 → rich HSK1.
- Không chạy Lighthouse/audit vì batch không đổi shared performance hay
  dependency; giữ hai gate này cho local release candidate theo playbook.
- `git diff --check` và kiểm tra staging được chạy lại ngay trước commit.

## 7. Dọn repo và ranh giới

- Staging `content/runtime/hsk1-level-package-input/` đã bị xóa sau khi package
  immutable được tạo; không commit staging, build output hay report thử.
- Package B0 `foundation-2026.07.8` được giữ nguyên, không tạo lại và không review
  lại `daily-1…4`.
- Workspace: `D:\Projects\hanzi-os`; branch: `codex/hsk4-graduation`.
- Base B1: `6c836cf`.
- Không deploy, không tạo Sites version, không sửa hosting, commerce, CMS, auth,
  sync, FSRS, Reader hay Review.

## 8. Batch duy nhất tiếp theo

**B2 — tích hợp toàn bộ HSK2 như một level batch**:

- dùng đủ 40 blueprint hiện có trong situational dialogue, sentence chains và
  short-text production;
- phủ 200 vocabulary tăng thêm, 125 character, 75 grammar, 17 task và 34 topic;
- materialize, AI self-review năm pass, package/authorize/runtime-wire một lô;
- đưa 40/40 bài lên Path và rich Lesson UI với độ sâu HSK2;
- tích hợp level check HSK2 end-to-end;
- chỉ chạy full check và E2E sau khi targeted checks của cả level đã xanh.

Không tính draft/generated/test là bài learner-visible và không mở B3 trước khi
B2 đạt `UI-INTEGRATED -> COMMITTED`.

# HANZI.OS — checkpoint triển khai hiện tại

Cập nhật: 01/08/2026

Tài liệu này trả lời ba câu hỏi: người học đang dùng được gì, code đang ở đâu,
và agent tiếp theo phải làm gì. Git history giữ chi tiết các lát cắt cũ; không
chép nhật ký dài vào đây.

## 1. Tình trạng một câu

Nền ứng dụng đã ổn định; HSK0 có lát nền và HSK1 có 14 bài learner-visible,
trong đó 10 bài đã có nội dung chuyên sâu trên Lesson UI. HSK2-4 có inventory,
scope và blueprint/draft nhưng chưa được đưa lên UI.

## 2. Dashboard tiến độ

- **Sẵn sàng toàn dự án:** 82/100 (82%).
- **HSK1 learner-visible:** 14/40 blueprint (35%).
- **HSK1 rich Lesson UI:** 10/40 (25%).
- **Toàn HSK1-4 learner-visible:** 14/213 blueprint (6,6%).
- **HSK2:** 0/40; **HSK3:** 0/55; **HSK4:** 0/78.
- **HSK0:** 4 bài cầu nối đang dùng được; 12 pronunciation draft tồn tại.

Con số 82% đo cả nền ứng dụng/kiến trúc/QA. Con số 14/213 mới phản ánh tốc độ
đưa kho HSK1-4 lên giao diện.

## 3. Bảng nội dung người học nhìn thấy

| Level/unit | Bài trên UI | Rich UI | Trạng thái |
| --- | ---: | ---: | --- |
| HSK0 foundation bridge | 4 | 0 | learner-visible |
| HSK1 personal exchange | 4 | 0 | learner-visible, lesson cơ bản |
| HSK1 time/place/events | 6 | 6 | hoàn thành local |
| HSK1 daily life | 4 | 4 | hoàn thành local trong B0 |
| HSK1 travel/leisure | 0 | 0 | draft/blueprint |
| HSK1 study/work | 0 | 0 | draft/blueprint |
| HSK1 character foundation | 0 target blueprint; 2 source lesson bị khóa | 0 | chưa authorize |
| HSK2 | 0/40 | 0 | learner-hidden |
| HSK3 | 0/55 | 0 | learner-hidden |
| HSK4 | 0/78 | 0 | learner-hidden |

## 4. Lát B0 đã hoàn thành

`hsk1-daily-life` đã được xử lý như một feature learner-facing, không chỉ là
data warehouse:

- AI-assisted self-review 5 pass cho 286 source target;
- sửa 4 nhóm lỗi: lượng từ, hội thoại mua hàng, động từ ly hợp và Erhua/tone
  sandhi;
- immutable package `foundation-2026.07.8` thêm 54 lexeme và 4 lesson;
- runtime vocabulary hiện 155 ID; 154 ánh xạ inventory, `越南` là mục ngoài
  inventory đang được báo rõ;
- local authorization chỉ mở 4 bài sau 6 bài time/place prerequisite;
- rich payload gồm 16 lượt hội thoại, 5 grammar point + guided self-check, 10
  topic, 5 nhiệm vụ giao tiếp và 20 lượt thoại nhiệm vụ;
- browser TTS được gắn nhãn synthetic và không cấp mastery;
- promotion queue trỏ tới `hsk1-travel-leisure`.

## 5. Bằng chứng bài daily-life đã nối vào UI

Đường dữ liệu:

1. `content/packages/foundation-2026.07.8/` — package immutable.
2. `content/curriculum/hsk0-4-local-study-authorizations.json` — authorization.
3. `content/runtime/hsk0-4-runtime-catalog.json` — runtime catalog sanitized.
4. `content/runtime/hsk1-daily-life-rich-lessons.json` — rich presentation.
5. `src/learning/richLessonContent.ts` — merge artifact time/place + daily.
6. Hai Lesson screen dùng shared rich adapter.
7. `e2e/hsk01-local-demo.spec.ts` mở `daily-1` sau prerequisite và kiểm tra nội
   dung `这个多少钱？`, `我要三个。` cùng mục “Nhiệm vụ giao tiếp”.

Nếu app không hiển thị, phải coi đó là integration regression. Không tạo lại
nội dung trước khi kiểm tra bảy mắt xích trên.

## 6. Thay đổi kỹ thuật nhỏ đi kèm B0

- Pinyin parser chấp nhận Erhua final kết thúc bằng `r` như `miàntiáor` và
  `yìdiǎnr`.
- Validation cho phép learner-visible tone sandhi chuẩn trong khi numbered
  internal syllable vẫn giữ lexical tone.
- Loại 4 alias vocabulary cũ `cha`, `he`, `kan`, `you` khỏi package/runtime và
  hidden lesson references để tránh ID mastery giả.
- Test fixture cũ đang được cập nhật từ 10 lên 14 bài HSK1 và từ 105 lên 155
  runtime vocabulary.

## 7. Dọn dẹp đã thực hiện

- Thư mục staging `content/runtime/daily-life-package-input/` đã được chuyển ra
  ngoài repo sau khi package immutable được tạo; nó không được commit.
- Roadmap/checkpoint cũ dài hơn 2.300 dòng, chủ yếu là nhật ký lặp, đã được thay
  bằng tài liệu hiện tại. Nội dung lịch sử vẫn phục hồi được từ Git.
- `docs/ROADMAP.md` marketing/production trùng lặp được xóa; nguồn production
  duy nhất là `docs/PRODUCTION_UPGRADE_PLAN.md`.
- Các script production deferred chưa bị xóa vì `verify:production` vẫn tham
  chiếu chúng; chúng chỉ bị loại khỏi critical path.

## 8. Trạng thái kiểm tra B0

- Targeted package/graph/release/persistence/content validation: **9 file,
  139/139 test qua**.
- Local-study/content precheck: package `.07.8`, 4 daily-life lesson, 54 lexeme,
  286 source target, 10 authorized rich lesson và runtime 18 lesson đều hợp lệ.
- Typecheck và lint: qua.
- Toàn bộ Vitest: **229 file, 1.607/1.607 test qua**.
- D1 restore rehearsal: 14 migration, 26 table, integrity/foreign key/write qua.
- Production build và bundle budget: qua; Brotli client JS/CSS 287,3 KiB,
  conservative ceiling 413,7 KiB.
- Learner UI walkthrough: **1/1 Playwright qua trong 1,9 phút**; luồng hoàn
  thành prerequisite thật rồi mở `daily-1` và kiểm tra rich dialogue/task.
- `git diff --check`: chạy ngay trước commit.

Lighthouse/audit không chạy lại ở B0 vì không đổi shared visual/performance hay
dependency; chúng được giữ cho local release candidate theo playbook mới.

## 9. Branch và ranh giới

- Workspace: `D:\Projects\hanzi-os`
- Branch: `codex/hsk4-graduation`
- Commit trước B0: `4cef075` — rich HSK1 time/place lesson content.
- Checkpoint B0: commit chứa chính file này; dùng `git log -1` để lấy SHA sau
  khi checkout, không hard-code một hash tự tham chiếu.
- Base lịch sử lúc chuyển repo: `5cc7867`.
- Không deploy, không tạo Sites version và không sửa hosting.
- `.openai/hosting.json` giữ nguyên cho bước cuối do người dùng quyết định.

## 10. Batch tiếp theo sau B0

Không tiếp tục chỉ làm 2 bài travel/leisure rồi dừng. Batch tiếp theo là **B1 —
hoàn tất toàn bộ HSK1**:

- lấy 40 HSK1 blueprint làm danh sách đích;
- materialize phần còn thiếu theo cả level;
- review 5 pass theo unit, sửa lỗi theo nhóm;
- package/authorize/runtime-wire một lô lớn;
- đưa 40/40 lên shared Lesson UI;
- phủ 300 vocabulary, 246 character, 66 grammar, 15 task và 30 topic;
- chạy level check HSK1 end-to-end;
- chạy full gate một lần ở cuối level và commit.

Mục tiêu thấy được sau B1: Path HSK1 có đủ lộ trình từ personal exchange đến
study/work và character foundation; người dùng không cần đọc file JSON để biết
nội dung tồn tại.

## 11. Những việc không được làm ở batch tiếp theo

- Không xây lại auth, sync, FSRS, Reader, Review hoặc lesson engine.
- Không mở Sites/commerce/production/CMS.
- Không dựng human reviewer/audio-rights workflow cho bản local.
- Không chạy full check lặp lại sau từng file.
- Không cộng tiến độ cho draft/generated/test nếu UI chưa mở bài.
- Không tạo thêm tài liệu nhật ký dài; cập nhật bảng và kết quả hiện tại.

## 12. Mẫu handoff bắt buộc

Khi dừng phiên, agent ghi:

- commit/branch và worktree sạch hay không;
- project readiness A%; learner-visible X/Y từng level;
- bài/unit mới thực sự hiện trên UI;
- targeted/full/E2E đã chạy và kết quả;
- file staging nào đã xóa;
- batch duy nhất cần làm tiếp.

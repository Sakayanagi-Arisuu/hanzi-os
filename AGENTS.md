# HANZI.OS — hướng dẫn bắt buộc cho mọi agent

## 1. Mục tiêu đang hoạt động: Reforge 2026

Tái cấu trúc HANZI.OS thành ứng dụng tự học **Mainland Mandarin HSK0–HSK4**
local-first, dễ dùng và có chiều sâu chức năng/sư phạm tương đương kiến trúc học
của ChineseSkill. Đây là benchmark năng lực, không phải yêu cầu sao chép sản phẩm.

- Phải dùng code, nội dung, audio, hình ảnh, wording và thương hiệu nguyên bản.
- Không sao chép lesson, distractor, media, mascot, screenshot, trade dress hoặc
  reverse-engineer thuật toán/dữ liệu độc quyền của ChineseSkill.
- Chủ đề “hệ thống thức tỉnh hologram” là lớp thẩm mỹ và lore. Nhãn điều hướng,
  trạng thái và hành động chính phải dùng tiếng Việt trực tiếp, dễ hiểu.
- Production thương mại, payment, Sites và CMS không nằm trên critical path,
  trừ khi một task được duyệt nêu rõ phụ thuộc hosted/provider.

Mốc cũ `96/100` chỉ mô tả roadmap foundation tự định nghĩa trước Reforge. Không
được dùng nó để nói sản phẩm đã hoàn thiện 96% theo benchmark mới.

## 2. Thứ tự đọc trước khi làm

1. `docs/IMPLEMENTATION_CHECKPOINT.md` — trạng thái thật và freeze policy.
2. `docs/PRODUCT_VISION.md` — north star, phạm vi và definition of done.
3. `docs/CHINESESKILL_BENCHMARK.md` — bằng chứng, giới hạn và ma trận gap.
4. `docs/RESTRUCTURE_MASTER_PLAN.md` — 100 task và dependency đang hoạt động.
5. `docs/HSK4_GRADUATION_PLAN.md` — inventory nội dung legacy cần bảo toàn.
6. `docs/CONTENT_DELIVERY_PLAYBOOK.md` — chỉ đọc khi chuyển đổi/soạn nội dung.
7. `docs/ARCHITECTURE.md` — chỉ là bản đồ implementation hiện tại cho tới khi
   task kiến trúc tương ứng được nghiệm thu.

Chỉ đọc `docs/PRODUCTION_UPGRADE_PLAN.md` khi người dùng chủ động mở lại
production. Không lấy tài liệu lịch sử làm source of truth nếu mâu thuẫn với sáu
tài liệu đầu tiên.

## 3. Cách thực thi master plan

- Làm theo ID `T001`–`T100`, dependency và milestone trong master plan.
- Một task chỉ được đánh dấu `ACCEPTED` khi kết quả learner-visible, dữ liệu,
  migration (nếu có), kiểm thử và tài liệu đều đạt acceptance của task.
- Tạo JSON, protocol, API, test, số dòng code hoặc mock UI chưa nối runtime
  không phải là task hoàn thành.
- Không mở task downstream khi dependency chưa được nghiệm thu.
- Mỗi thời điểm chỉ có một milestone chính đang thực thi; có thể song song các
  subtask độc lập trong milestone bằng sub-agent.
- Bug correctness/data-loss/a11y nghiêm trọng được sửa ngay và phải có
  regression test; yêu cầu thẩm mỹ nhỏ được map vào task phù hợp thay vì tiếp tục
  vá chồng lên UI legacy.
- Không viết lại từ số 0. Ưu tiên adapter/migration quanh lõi tốt, rồi xóa legacy
  chỉ sau khi consumer mới và rollback đã được kiểm chứng.

## 4. Nguyên tắc trải nghiệm bắt buộc

- Information architecture đích có tối đa năm vùng người học: **Học, Ôn, Nói,
  Luyện, Hồ sơ**.
- Mỗi màn hình có một hành động chính rõ; thông tin nâng cao dùng progressive
  disclosure.
- Main Course là đường học chính. Reader, kho từ/chữ, phrasebook, drill, game và
  đề luyện nằm trong vùng Luyện, không cạnh tranh với đường học.
- Mobile-first; touch target tối thiểu 44×44 px; keyboard/focus rõ; semantic HTML;
  contrast đạt WCAG AA; hỗ trợ `prefers-reduced-motion`.
- Không dùng animation trang trí liên tục, flicker, route overlay, thông báo
  nghiệp vụ, ID/protocol/hash/receipt hay jargon backend trong UI người học.
- Không dùng tên fantasy làm nhãn chức năng duy nhất. Có thể giữ làm subtitle,
  tên chương hoặc lore không cản trở thao tác.
- Hệ thống phải có escape hatch cho mic, IME và handwriting: chọn token, nhập
  Pinyin, bỏ qua có disclosure hoặc chuyển modality tương đương.

## 5. Tính đúng đắn học tập

- XP, streak, số câu làm và coverage không phải mastery.
- Mastery phải dựa trên evidence đúng kỹ năng, đủ mẫu, item duy nhất và phân tán
  theo thời gian; lặp cùng item không làm tăng độ phủ.
- Hint, prior exposure, reveal hoặc IME trợ giúp phải được ghi nhận và không được
  dùng để vượt gate recall độc lập.
- Browser TTS chỉ là fallback nghe/đọc, không được gọi là audio native hoặc bằng
  chứng nói/phát âm.
- Speech-to-text transcript không đủ để tuyên bố chấm phát âm/thanh điệu. Chỉ mở
  claim khi có rubric, provider/corpus, consent và validation tương ứng.
- Handwriting chỉ được mở cho chữ có dữ liệu stroke provenance hợp lệ.
- Nội dung AI-assisted phải giữ `humanReviewed: false`; không tuyên bố tương
  đương giáo viên/native review cho tới khi review thật hoàn tất.
- Không tuyên bố “đủ HSKx” chỉ từ lesson count. Phải có inventory coverage,
  activity coverage, UI journey và checkpoint/assessment end-to-end.

## 6. Dữ liệu và migration

- Bảo toàn stable lesson/vocabulary/character IDs hoặc cung cấp alias map có test.
- Không làm mất completion, streak, saved items, FSRS, mistakes, reset epoch,
  owner scope, session dở dang hoặc IndexedDB outbox.
- Legacy evidence có thể giữ làm lịch sử nhưng không tự nâng thành mastery ở mô
  hình mới.
- Một learner UI duy nhất phải phục vụ guest và account; repository/sync là
  adapter bên dưới, không tạo hai trải nghiệm khác nhau.
- Không dual-write lâu dài. Mọi cutover phải có fence, rollback và fixture cho
  guest, learner, editor, admin.
- Không xóa package/snapshot/code legacy trước khi `rg` xác nhận hết consumer và
  task cleanup tương ứng đã có rollback artifact.

## 7. Hai nhóm số tiến độ bắt buộc phải báo

Mỗi checkpoint/commit phải nêu cả:

1. **Reforge parity:** `X/100 task ACCEPTED`, milestone hiện tại và blocker thật.
2. **Nội dung learner-visible legacy được bảo toàn:**
   - HSK0 `4/4` (rich `0/4`);
   - HSK1 `40/40` rich;
   - HSK2 `40/40` rich;
   - HSK3 `55/55` rich;
   - HSK4 `78/78` rich;
   - tổng HSK1–4 `213/213` rich.

Nếu số thay đổi, phải nêu nguồn/validator. Báo riêng external dependency chưa đạt
(native review/audio/video, ASR, AI provider, hosted sync...) để không tạo cảm giác
“100 task = tự động có mọi tài sản bên ngoài”.

## 8. Kiểm thử theo rủi ro

Trong task:

- Chạy validator/test trực tiếp của schema, adapter, activity hoặc screen vừa đổi.
- Chạy `npm run typecheck` khi đổi TypeScript/runtime/UI.
- Mỗi bug correctness/data-loss phải có regression test.

Tại ranh giới milestone:

```powershell
npm run check
npm run test:e2e
```

Chạy `npm run test:lighthouse` khi đổi shared UI/performance hoặc đóng release
candidate. Chạy `npm audit --omit=dev` khi dependency đổi hoặc ở release boundary.
`npm run verify:production` phải tiếp tục fail-closed trừ khi production được mở
lại rõ ràng. Không dùng force flag để bỏ qua gate lỗi.

## 9. Skill routing

- Research/UX benchmark/web smoke: `browser:control-in-app-browser`.
- Windows/device/manual journey: `computer-use:computer-use` khi thật sự cần.
- IA, heuristic, accessibility: `ui-ux-pro-max`.
- Component/UI implementation: `ui-styling`; token/spec: `design-system`.
- Hologram brand/art direction: `brand`/`design`; bitmap gốc: `imagegen`.
- Chỉ dùng skill khi task khớp trigger và phải đọc đầy đủ `SKILL.md` trước khi
  hành động.

Máy đã có **CPython 3.13.14** và **pip 26.1.2**, được quản lý qua `uv`; lệnh
`python` dùng được trong terminal mới. Script tra cứu của `ui-ux-pro-max` đã chạy
được. Không cài thêm package hệ thống hoặc thay runtime mặc định nếu task không
cần và người dùng chưa cho phép.

## 10. Dọn repo và tài liệu

- Không commit `docs/reports/`, `output/`, build output, staging, export hoặc report
  thử.
- `docs/README.md` phân loại source of truth và tài liệu lịch sử.
- Mỗi commit cập nhật đồng thời `docs/IMPLEMENTATION_CHECKPOINT.md` và
  `docs/RESTRUCTURE_MASTER_PLAN.md`; nếu đổi content inventory thì cập nhật thêm
  `docs/HSK4_GRADUATION_PLAN.md`.
- Git history giữ nhật ký cũ; source-of-truth hiện tại không được biến thành
  append-only log dài hàng trăm dòng.
- Một commit cho một task hoặc cụm task nguyên tử trong cùng milestone; message mô
  tả kết quả learner-facing.
- Trước commit: `git diff --check`, kiểm tra staging chính xác và ghi đúng gate đã
  chạy. Không stage/commit thay đổi của người dùng ngoài phạm vi.

## 11. Mẫu cập nhật cho người dùng

- **Đã thay đổi cho người học:** hành vi/màn hình nào dễ dùng hoặc học sâu hơn.
- **Task:** ID nào đã `ACCEPTED`, bằng chứng quan sát được.
- **Nội dung giữ được:** HSK0…4 theo số ở mục 7.
- **Đang làm:** một milestone và outcome kế tiếp.
- **Còn vướng:** dependency nội dung/kỹ thuật/bên ngoài thật.
- **Tiến độ:** `X/100`, không dùng phần trăm foundation cũ làm parity.

Không báo số test, số file hoặc số dòng như một thành quả độc lập.

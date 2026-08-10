# HANZI.OS — hướng dẫn bắt buộc cho mọi agent

## 1. Cách làm đang hoạt động

HANZI.OS được cải tiến **từng module, có người dùng test giữa các module**. Không
chạy lại backlog 100 task và không tự suy ra phần trăm hoàn thiện.

Quy trình cho mỗi lượt:

1. đọc `docs/IMPLEMENTATION_CHECKPOINT.md` và module người dùng vừa chọn;
2. audit hành trình thật, dữ liệu và consumer của module đó;
3. sửa trọn một vertical slice nhỏ, không vá lan sang module khác;
4. chạy gate đúng rủi ro và bật web cho người dùng test;
5. chỉ ghi `USER-ACCEPTED` sau khi người dùng xác nhận.

ChineseSkill chỉ là benchmark về taxonomy chức năng, luồng học và ngưỡng chất
lượng. Cấm sao chép code, layout, lesson, câu hỏi, media, dữ liệu đóng, thương
hiệu hoặc thuật toán độc quyền. UX, nội dung và asset HANZI.OS phải nguyên bản
hoặc có provenance/license rõ.

## 2. Nguồn sự thật

Đọc theo nhu cầu, không nạp toàn bộ repo vào ngữ cảnh:

1. `docs/IMPLEMENTATION_CHECKPOINT.md` — sổ module và trạng thái thật;
2. `docs/ARCHITECTURE.md` — bản đồ thư mục, runtime và dữ liệu;
3. `docs/TESTING.md` — cách chạy/test local;
4. `docs/PRODUCT_VISION.md` — phạm vi và nguyên tắc sản phẩm;
5. `docs/CHINESESKILL_BENCHMARK.md` — tài liệu tham chiếu, không phải backlog;
6. `docs/HSK4_GRADUATION_PLAN.md` — inventory nội dung cần bảo toàn;
7. `docs/CONTENT_DELIVERY_PLAYBOOK.md` — chỉ đọc khi đổi/soạn nội dung.

`docs/README.md` phân loại toàn bộ tài liệu còn sống. Git history là nơi tra tài
liệu đã xóa; không tạo thư mục archive mới trong source tree.

## 3. Phạm vi và trải nghiệm

- Mainland Mandarin, chữ giản thể + Pinyin, UI tiếng Việt, HSK0–HSK4,
  local-first web/PWA.
- Tối đa năm vùng người học: **Học, Ôn, Nói, Luyện, Hồ sơ**.
- Một màn hình có một hành động chính; thông tin nâng cao dùng progressive
  disclosure; nhãn chức năng phải rõ, lore hologram chỉ là lớp thẩm mỹ.
- Mobile-first, touch target tối thiểu 44×44 px, keyboard/focus rõ, WCAG AA và
  `prefers-reduced-motion`.
- Không route overlay/flicker, animation trang trí liên tục, jargon backend,
  receipt/hash/ID hoặc thông báo nghiệp vụ trong UI người học.
- Có escape hatch cho microphone, IME và handwriting.

Production thương mại, payment, CMS, Sites và public hosting ngoài phạm vi trừ
khi người dùng chủ động mở lại.

## 4. Tính đúng đắn học tập

- XP, streak, số câu và coverage không phải mastery.
- Mastery cần evidence đúng kỹ năng, đủ mẫu, item duy nhất và phân tán theo thời
  gian; lặp cùng item không tăng độ phủ.
- Hint, reveal, prior exposure và IME trợ giúp phải được ghi nhận và không vượt
  gate recall độc lập.
- Browser TTS chỉ là synthetic fallback, không phải audio native hay evidence
  nói/phát âm. Transcript speech-to-text không tự thành điểm phát âm/thanh điệu.
- Handwriting chỉ mở với stroke data có provenance. Nội dung AI-assisted giữ
  `humanReviewed: false` tới khi có review thật.
- Không tuyên bố đủ HSK chỉ từ lesson count.

## 5. Dữ liệu không được làm mất

- Giữ stable lesson/vocabulary/character IDs hoặc migration alias có test.
- Không mất completion, streak, saved item, FSRS, mistakes, owner/reset scope,
  session dở dang hoặc outbox.
- Guest và account dùng một learner UI; repository/sync chỉ là adapter.
- Không xóa package, snapshot, migration hay code legacy trước khi `rg` chứng
  minh hết consumer và có regression/rollback phù hợp.
- **Không xóa `.wrangler/` trong cleanup:** đây là D1 local, có thể chứa tài
  khoản, role và dữ liệu server local. Browser progress nằm trong localStorage /
  IndexedDB của browser và cũng phải được bảo toàn khi test.
- Không sửa/xóa/stage/commit `docs/reports/` hoặc `output/` của người dùng.

Inventory learner-visible cần giữ, trừ khi audit/migration có evidence mới:

- HSK0 `4/4` (rich `0/4`);
- HSK1 `40/40`, HSK2 `40/40`, HSK3 `55/55`, HSK4 `78/78` rich;
- tổng HSK1–4 `213/213` rich.

## 6. Kiểm thử và công cụ

- Trước sửa: `git status --short`, xác định file user-owned và consumer.
- Trong module: targeted validator/Vitest/Playwright; chạy `npm run typecheck`
  khi đổi TypeScript/runtime/UI.
- Ở ranh giới module lớn: `npm run check` và hành trình browser thật; chạy E2E,
  Lighthouse/audit khi loại thay đổi yêu cầu.
- `verify:production` phải fail-closed khi production chưa được mở.
- Dùng skill theo đúng trigger và đọc trọn `SKILL.md`: browser smoke/research dùng
  `browser:control-in-app-browser`; Windows/device dùng `computer-use`; UX/a11y
  dùng `ui-ux-pro-max`; UI/token dùng `ui-styling`/`design-system`.
- Không cài package hệ thống, plugin hoặc thay tài khoản bên ngoài nếu người dùng
  chưa cho phép cụ thể.

## 7. Báo cáo và commit

Mỗi checkpoint chỉ cần:

- **Module:** tên + `NOT-REVIEWED | IN-REVIEW | USER-ACCEPTED | BLOCKED`;
- **Người học thấy gì:** hành vi đã thay đổi;
- **Đã kiểm:** hành trình/gate có ý nghĩa;
- **Dữ liệu giữ được:** inventory ở trên và sự cố/migration nếu có;
- **Tiếp theo:** chờ người dùng test hoặc đúng một module được chọn.

Commit theo coherent module/mốc cleanup, không theo mỗi chỉnh CSS. Trước commit
chạy `git diff --check`, rà staging và không đưa build/cache/report vào Git.
Không push/deploy nếu người dùng chưa yêu cầu.

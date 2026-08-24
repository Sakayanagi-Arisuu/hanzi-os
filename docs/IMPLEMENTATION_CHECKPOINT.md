# HANZI.OS — Implementation checkpoint

**Cập nhật:** 10/08/2026

**Cách làm:** từng module, người dùng test trước khi chuyển module

**Phạm vi:** Mainland Mandarin, chữ giản thể + Pinyin, UI tiếng Việt, HSK0–HSK4,
local-first web/PWA

## 1. Quyết định hiện hành

Chủ dự án đã dừng cách tự chạy kế hoạch 100 task vì khó quan sát sản phẩm và dễ
lệch mục tiêu qua các phiên dài. Từ checkpoint này:

- không dùng số `X/100` làm tiến độ;
- chỉ có một module sản phẩm được chỉnh tại một thời điểm;
- sau mỗi module phải bật web, mô tả hành trình test ngắn và chờ người dùng duyệt;
- ChineseSkill vẫn là benchmark tham khảo, không phải mẫu để sao chép;
- tài liệu cũ đã được loại khỏi working tree, Git history là archive.

Trạng thái module chỉ gồm:

- `NOT-REVIEWED`: có code nhưng chưa được rà/test theo luồng mới;
- `IN-REVIEW`: đang chỉnh hoặc đang chờ người dùng test;
- `USER-ACCEPTED`: người dùng đã test và chấp nhận phiên bản hiện tại;
- `BLOCKED`: thiếu dependency thật và có điều kiện mở khóa rõ.

## 2. Sổ module duy nhất

| Module | Trạng thái | Hành trình cần test trước khi duyệt |
|---|---|---|
| Nền tảng repo và tài liệu | `IN-REVIEW` | Cấu trúc dễ hiểu, web local chạy, không mất content/migration |
| Onboarding và shell điều hướng | `NOT-REVIEWED` | Người mới vào học; desktop/mobile; không chớp màn; tối đa 5 vùng rõ |
| Học — lộ trình và bài học | `NOT-REVIEWED` | Mở bài, làm hoạt động, feedback, hoàn tất, reload/resume |
| Ôn — FSRS và lỗi sai | `NOT-REVIEWED` | Thẻ đến hạn, reveal/rating, lỗi sai, reload không nhân đôi evidence |
| Nói và phát âm | `NOT-REVIEWED` | Có/không microphone; disclosure TTS/ASR đúng; fallback dùng được |
| Luyện chữ và handwriting | `NOT-REVIEWED` | Tra chữ theo ngữ cảnh; chỉ mở stroke có provenance; có IME escape hatch |
| Reader, từ điển và mục đã lưu | `IN-REVIEW` | Đọc, tra Trung–Việt, lưu, tạo deck; guest/account cùng trải nghiệm |
| Tiến độ và Thất Trụ | `NOT-REVIEWED` | Coverage unique; mastery đúng kỹ năng; không dùng XP thay mastery |
| Luyện đề và assessment | `NOT-REVIEWED` | Nguồn/cấu trúc rõ; không lộ đáp án; resume/submit/retry đúng |
| Tài khoản và phân quyền | `NOT-REVIEWED` | Đăng ký/đăng nhập HANZI.OS; learner/editor/admin đúng màn hình |
| Offline, backup và sync | `NOT-REVIEWED` | Offline shell; export/import; owner/reset/outbox không mất dữ liệu |

Module tiếp theo do người dùng chọn sau khi test web; không tự mở nhiều module
song song.

### Vạn Quyển Các Mốc 1 đang chờ người dùng duyệt — 24/08/2026

- `/reader` mở thẳng Thư Khố thay vì sheet/modal: 25 quyển nguyên bản đang khám
  phá được, chia 8 nhóm tu tiên, trùng sinh, light novel, bí ẩn, khoa huyễn,
  triết lý, võ hiệp và đời sống. Tìm kiếm/lọc nằm ngay trong trang; chọn bìa mở
  mô tả và mục lục, rồi vào phiên đọc immersive để tra từ Trung–Việt.
- `Thư Các Thanh Đăng` có 6 chương liên tục HSK2–3, mỗi chương 350–650 Hán tự;
  24 quyển còn lại có một chương mở đầu đọc được. Toàn bộ là nội dung nguyên bản
  AI-assisted, `humanReviewed:false`, không sao chép truyện, chương hay thương
  hiệu đóng. Truyện `first-day` cùng stable ID vẫn tương thích qua deep link
  nhưng đã ẩn khỏi trải nghiệm Thư Khố mới.
- Tiến độ đọc local-first theo owner/generation/reset: vị trí đoạn, chế độ đọc,
  completion, replay idempotent và adoption guest→account. Race khi khôi phục
  chế độ đọc đã được khóa để observer không ghi đè dữ liệu trước khi scope sẵn
  sàng. Lookup/TTS/Pinyin/bản dịch là hỗ trợ, không tạo mastery/evidence; lưu từ
  cốt lõi dùng đúng một FSRS card hiện hành.
- Rights manifest fail-closed đủ text/translation/image/audio/provenance/license.
  Bìa chính là SVG code-native, 24 bìa thư mục là HTML/CSS code-native; browser
  TTS chỉ là fallback opt-in và không autoplay trong mọi route `/reader`.
- Evidence Reader: 15 test file/120 test unit+protocol+repository+outbox xanh;
  E2E production 7/7 xanh cho guest/account, khám phá → mô tả/mục lục → đọc →
  tra từ, lookup→FSRS, reload/offline, completion → chương sau → exit → replay,
  focus/Escape/reduced-motion và viewport `1365×640`, `360×640`, `390×844`.
  Browser smoke xác nhận không còn dialog khám phá hay tràn ngang. Content
  precheck giữ HSK1–4 `40/40 + 40/40 + 55/55 + 78/78 = 213/213` rich.
- `npm run check` vẫn dừng tại hai lỗi typecheck có sẵn ngoài Reader ở
  `DashboardPage.tsx` (thiếu nhãn `dictionary`) và `PathPage.tsx` (`hsk0` chưa
  nằm trong union đích). Production artifact build thành công; gate bundle hiện
  hành dừng ở `880,5 KiB > 800 KiB` trên cây commit sạch; không sửa lan
  module/budget trong mốc này.
- Trạng thái giữ `IN-REVIEW`; chỉ chuyển `USER-ACCEPTED` sau khi chủ dự án test
  web và xác nhận.

## 3. Inventory learner-visible cần bảo toàn

| Cấp | Bài learner-visible | Rich |
|---|---:|---:|
| HSK0 | 4/4 | 0/4 |
| HSK1 | 40/40 | 40/40 |
| HSK2 | 40/40 | 40/40 |
| HSK3 | 55/55 | 55/55 |
| HSK4 | 78/78 | 78/78 |
| HSK1–4 | 213/213 | 213/213 |

Runtime package hiện hành là `foundation-2026.08.5`. Các package lịch sử vẫn là
lineage/fixture/rollback nên không được xóa chỉ vì trùng dữ liệu. `content/` và
`public/` đã được audit: chưa có tracked artifact nào đủ bằng chứng để xóa an
toàn trong lượt cleanup này.

Các con số 2.016 vocabulary ID, 1.096 character-in-context và 332 grammar source
row là inventory kỹ thuật/nguồn; không tự chứng minh mastery hay độ phủ sư phạm.

## 4. Trạng thái nền tảng hiện tại

- Web: Vinext/Next-style routes trong `app/`, learner runtime trong `src/`.
- Guest progress: localStorage + IndexedDB, local-first.
- Account server local: D1 qua Wrangler; migration bất biến tới `0020`, 21
  migration và 39 app table trong restore rehearsal gần nhất.
- Auth local: tài khoản HANZI.OS hoạt động; Google/Facebook fail-closed cho đến
  khi có OAuth credential/public origin. Demo role: learner, editor, admin.
- Local runtime: schema D1 đã dựng lại, ba demo account đã seed và dev server
  đã smoke tại `http://localhost:3000` sau cleanup.
- Content: browser TTS chỉ là fallback; native audio/human review/ASR calibrated/
  AI provider vẫn là dependency riêng, không được tuyên bố đã có.
- Hosting/production: tạm đóng; binding Sites cũ đã bị loại khỏi source tree.

## 5. Sự cố dữ liệu local trong cleanup 10/08/2026

Lệnh cleanup ban đầu đã xóa nhầm `.wrangler/` vì coi đó là cache. Thư mục này có
D1 local (khoảng 4,27 MB, cập nhật trong ngày), nên tài khoản/role/dữ liệu server
local tùy biến có thể đã mất nếu không có backup ngoài repo.

- Browser guest progress không nằm trong `.wrangler/`, nên không bị lệnh này xóa.
- Không tìm thấy backup D1 rõ ràng trong workspace tại thời điểm audit.
- Script cleanup đã được sửa fail-safe để **luôn giữ `.wrangler/`**.
- Schema và ba demo account đã được dựng lại trước khi bàn giao web; dữ liệu
  account local tùy biến không được tuyên bố khôi phục nếu không có backup.

Sự cố này phải được giữ trong checkpoint cho tới khi người dùng xác nhận không
cần phục hồi thêm.

## 6. Cleanup được phép và không được phép

Được xóa khi đã chứng minh không có consumer:

- build/cache/log có thể tạo lại;
- component/CSS/dependency mồ côi;
- UI thử nghiệm đã bị chiến lược mới thay thế;
- tài liệu stale có nội dung đã được source-of-truth mới thay thế.

Không xóa/di chuyển hàng loạt:

- `content/`, `public/`, `config/`, `drizzle/` và package lineage;
- state/browser storage hay `.wrangler/`;
- các cặp UI guest/account đang live trước khi có adapter + regression journey;
- `docs/reports/` và `output/` của người dùng.

## 7. Điều kiện đóng lượt cleanup

- tài liệu không còn buộc phiên sau quay lại kế hoạch 100 task;
- root/directory/module map rõ và không có link living-doc bị hỏng;
- component/animation thử nghiệm đã chứng minh dead được loại bỏ;
- targeted test, typecheck/build phù hợp xanh;
- D1 local/schema/demo được dựng lại;
- web chạy ở localhost và hành trình thật được smoke qua browser;
- người dùng nhận URL và chọn module tiếp theo.

# HANZI.OS — Implementation checkpoint

**Cập nhật:** 05/09/2026

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
| Onboarding và shell điều hướng | `IN-REVIEW` | Người mới vào học; desktop/mobile; không chớp màn; tối đa 5 vùng rõ |
| Học — lộ trình và bài học | `IN-REVIEW` | Mở bài, học theo chặng, làm hoạt động, feedback, hoàn tất, reload/resume |
| Ôn — FSRS và lỗi sai | `IN-REVIEW` | Thẻ đến hạn, reveal/rating, lỗi sai, reload không nhân đôi evidence |
| Nói và phát âm | `IN-REVIEW` | Có/không microphone; disclosure TTS/ASR đúng; fallback dùng được |
| Luyện chữ và handwriting | `IN-REVIEW` | Tra chữ theo ngữ cảnh; luyện đúng thứ tự nét; có IME/touch escape hatch |
| Reader, từ điển và mục đã lưu | `IN-REVIEW` | Đọc, tra Trung–Việt, lưu, tạo deck; guest/account cùng trải nghiệm |
| Tiến độ và Thất Trụ | `IN-REVIEW` | Coverage unique; mastery đúng kỹ năng; không dùng XP thay mastery |
| Luyện đề và assessment | `IN-REVIEW` | Nguồn/cấu trúc rõ; không lộ đáp án; resume/submit/retry đúng |
| Tài khoản và phân quyền | `IN-REVIEW` | Đăng ký/đăng nhập HANZI.OS; learner/editor/admin đúng màn hình |
| Biên Tập Viện | `IN-REVIEW` | Soạn → kiểm định → gửi duyệt → sửa/duyệt → phát hành; nội dung tới đúng module learner |
| Cổng Quản Trị | `IN-REVIEW` | Phân công/SLA, duyệt độc lập, release/replay, user/role/session/settings/audit |
| Offline, backup và sync | `NOT-REVIEWED` | Offline shell; export/import; owner/reset/outbox không mất dữ liệu |

Module tiếp theo do người dùng chọn sau khi test web; không tự mở nhiều module
song song.

### Ôn — Ký Ức Trận Ngọc Lệnh — 05/09/2026

- **Module:** Ôn — FSRS và lỗi sai — `IN-REVIEW`; bốn màn MEM-01 đến MEM-04
  đã triển khai theo hướng A · Ngọc Lệnh, chưa ghi `USER-ACCEPTED` trước khi
  chủ dự án tự xem và thử trọn phiên.
- **Người học thấy gì:** thanh điều hướng desktop có thể thu gọn và nhớ lựa
  chọn; MEM-01 là Sảnh Ký Ức với lịch đến hạn, dự báo bảy ngày và phân bố lịch
  FSRS; MEM-02 buộc tự truy hồi trước khi xem; MEM-03 mới mở Pinyin, nghĩa,
  ví dụ, âm thanh và bốn mức tự đánh giá; MEM-04 tách số tự nhớ, dùng gợi ý,
  thẻ yếu, trạng thái đồng bộ và lịch ôn kế tiếp. Nhãn pha trong toolbar và ấn
  ký nay đổi đúng `MEM-02 · TRUY HỒI` / `MEM-03 · ĐỐI CHIẾU` thay vì ghi cố
  định một mã. Light mode vẫn giữ giếng ký ức tối có chữ sáng để không mất
  tương phản.
- **Đã kiểm:** browser thật trên tài khoản demo học xong `boot-1` xác nhận
  MEM-01 đọc dữ liệu thật `4` thẻ đến hạn, `4` thẻ kích hoạt, dự báo hôm nay
  `4`, không dùng mock. Thanh điều hướng thu gọn và route `/path` không vỡ.
  `npm run typecheck`, targeted ESLint và `10/10` targeted Vitest xanh; một lượt
  test song song từng timeout do máy quá tải, chạy riêng lại hoàn tất trong
  `933 ms`. Browser smoke MEM-02 → MEM-04 bị chặn ở hạ tầng dev khi worker
  Miniflare báo `Network connection lost`; đây là nợ runtime cần tái kiểm trước
  khi nghiệm thu, không được che bằng dữ liệu tĩnh.
- **Dữ liệu giữ được:** browser test chỉ tạo bốn thẻ FSRS từ bài `boot-1` trên
  tài khoản demo local; không seed mastery, không xóa `.wrangler/`, không sửa
  stable ID hay inventory. HSK0 vẫn `4/4`; HSK1 `40/40`, HSK2 `40/40`, HSK3
  `55/55`, HSK4 `78/78`, tổng HSK1–4 `213/213` rich.
- **Tiếp theo:** gallery `310` concept đã mở riêng tại
  `http://localhost:4173/index.html` để chủ dự án chọn đúng một module kế tiếp;
  Ký Ức Trận vẫn giữ `IN-REVIEW` cho tới khi có xác nhận thật.

### Học — Tiên Môn đa diện và lesson shell thoáng — 01/09/2026

- **Module:** Học — lộ trình và bài học — `IN-REVIEW`; đây là vòng tinh chỉnh
  trực tiếp theo ảnh người dùng, chưa ghi `USER-ACCEPTED`.
- **Người học thấy gì:** Mỗi HSK là một **Mục HSK/Tiên Môn** lớn, đa diện mười
  cạnh thay cho card bốn cạnh, có đường kết giới lồng, vân hologram, năm hệ màu
  ngọc–lam–kim–tím–chu sa, trạng thái, số cảnh giới/bí quyển và tiến độ. Mỗi
  Chương/Cảnh giới nhỏ hơn, lùi vào hai bên và nối với Mục bằng linh mạch; nhãn
  `MỤC HSK` và `CHƯƠNG` làm rõ phân cấp chức năng, lore không che nghĩa.
- **Màn học:** bỏ hoàn toàn dải header rỗng và footer “Hoàn tất phần học ở trên”;
  nút về Thiên Lộ/thời lượng được gấp vào khung mục tiêu, còn CTA xác nhận và
  `Bước vào Thử Luyện` nằm ngay trong điều hướng của chặng cuối. Ô mục tiêu lặp
  ở cột phải cũng được bỏ để nội dung dùng trọn chiều ngang. Tài khoản đăng nhập
  vẫn khóa CTA và hiện `Đang mở phiên…` trong lúc tạo session, tránh gửi hai lần.
- **Đã kiểm:** targeted ESLint, `git diff --check`, `npm run typecheck`, `5 file/
  27 test` và production build đều xanh; bundle ceiling bảo thủ vẫn `1023,9
  KiB` (`958,2 KiB` client JS/CSS Brotli + hero `65,7 KiB`) mà không nới gate.
  Browser thật light/dark xác nhận `5` Mục, `16` Chương, `217` bài và không có
  console warning/error. Ở desktop Mục rộng `1011 px`, cao `224–254 px`, Chương
  rộng `841 px`, cao `191 px`; ở `390×844` Mục cao `303 px`, Chương `250 px`,
  không tràn ngang. Luồng lý thuyết đi đủ ba chặng và đổi đúng từ `Đã hiểu · sẵn
  sàng thử` sang `Bước vào Thử Luyện` mà không còn footer cũ.
- **Dữ liệu giữ được:** smoke trên origin chính chỉ đọc lại đúng session
  `boot-1` đang dở ở câu `2/10`; luồng CTA mới được thử trên origin local tách
  biệt, không reset/abandon/submit dữ liệu thật. `.wrangler/`, localStorage/
  IndexedDB, stable ID, completion, streak, saved item, FSRS, mistakes, outbox,
  `docs/reports/` và `output/` không bị sửa/xóa. Inventory vẫn HSK0 `4/4`, HSK1
  `40/40`, HSK2 `40/40`, HSK3 `55/55`, HSK4 `78/78`.
- **Tiếp theo:** chủ dự án test `/path` ở light/dark và `/lesson/boot-1`; chỉ sau
  phản hồi thật mới cân tiếp chi tiết thị giác hoặc ghi `USER-ACCEPTED`.

### Học — khôi phục toàn bộ Thiên Lộ và viết lại luồng học — 31/08/2026

- **Module:** Học — lộ trình và bài học — `IN-REVIEW`; giao diện trước khi khôi
  phục đã được giữ tại ref Git `refs/codex/backups/path-current-20260831`, còn
  thiết kế danh sách dọc được truy lại từ commit `2193573`. Chưa ghi
  `USER-ACCEPTED` trước khi chủ dự án tự học thử.
- **Người học thấy gì:** Thiên Lộ lại là một hành trình dọc liên tục gồm đủ `5`
  tầng, `16` cảnh giới và `217` bài. Bài chưa tới vẫn hiện để người học biết toàn
  bộ lộ trình nhưng giữ khóa thật; không đổi điều kiện mở bài. Bên trong bài học
  được thay bằng luồng gọn `Đích đến & nguyên tắc → Từ neo trong câu → Đọc/nghe
  trọn mẫu (khi có) → Tự diễn đạt`; mỗi màn chỉ có một quyết định chính, phần
  bài tập chi tiết và mẫu trả lời được thu gọn dần.
- **Phân cấp Mạo Hiểm Giả:** mỗi tầng HSK nay là một cổng chiến dịch riêng với
  huy hiệu chặng, trạng thái có biểu tượng + nhãn chữ và tổng bài đã đạt; mỗi
  cảnh giới là một bảng nhiệm vụ hologram có ấn số, mã cảnh giới, tiêu đề
  Việt–Trung và tiến độ riêng. Light mode dùng nền sáng xanh ngọc dịu nhưng giữ
  các bảng nhiệm vụ tối để bảo toàn chất hệ thống và độ tương phản; tên bài bị
  khóa không còn mờ theo màu nền tối. Không thêm animation trang trí liên tục.
- **Nội dung học:** cả `213` bài rich dùng đúng hội thoại, toàn bộ điểm ngữ pháp
  và nhiệm vụ giao tiếp của chính bài thay vì mẫu hướng dẫn legacy gắn nhầm ID.
  Bài `survival-1` không còn nhận nhầm mẫu `A + 是 + B`; nhãn ngữ pháp nguồn khó
  đọc được đổi thành tiêu đề tiếng Việt, thuật ngữ nội bộ như mastery/reviewer/
  rubric/calibration không còn lộ cho người học. Phương pháp đọc tăng dần từ
  nghe–bắt chước ở HSK0 tới nguồn–bằng chứng–giới hạn ở HSK4. Bài Bốn thanh
  điệu giải thích cao độ tương đối, bốn đường giọng, lỗi dễ nhầm và bắt buộc tự
  kiểm trước khi sang chặng.
- **Đã kiểm:** hồi quy Thiên Lộ/runtime/nội dung/resume/journey xanh `11 file/
  280 test`; lát cắt phân cấp mới xanh thêm `3 file/25 test`, `npm run
  typecheck`, targeted ESLint, `git diff --check` và production build. Bundle
  ceiling bảo thủ đạt `1023,9 KiB` (`958,2 KiB` client JS/CSS Brotli + hero
  `65,7 KiB`) mà không nới gate. Browser thật light/dark xác nhận đủ `5` tầng,
  `16` cảnh giới và `217` bài, không có lỗi mới sau reload, không tràn ngang ở
  desktop hoặc `390×844`; panel bài học cao `440 px`, thanh hành động nằm trong
  viewport và mọi nút thấy được đạt tối thiểu `44 px`.
- **Cleanup có bằng chứng:** bỏ selector của catalog thử nghiệm, kho mở rộng từ
  cũ, transfer lane/next-realm cũ và các declaration 3D bị ghi đè sau khi `rg`
  xác nhận không còn consumer; không xóa content, package hay migration.
- **Dữ liệu giữ được:** browser smoke quay lại đúng phiên `boot-1` đang dở ở câu
  `2/10`, không abandon/reset/submit. `.wrangler/`, localStorage/IndexedDB,
  stable ID, completion, streak, saved item, FSRS, mistakes, owner/reset scope,
  session dở dang, outbox, `docs/reports/` và `output/` được giữ. Inventory vẫn
  HSK0 `4/4` (rich `0/4`), HSK1 `40/40`, HSK2 `40/40`, HSK3 `55/55`, HSK4
  `78/78`, tổng HSK1–4 `213/213` rich.
- **Tiếp theo:** chủ dự án test `/path` ở light/dark, cuộn qua cổng HSK0–HSK4,
  kiểm các cảnh giới và bài bị khóa; sau đó vào `Bốn thanh điệu`, đi hết ba
  chặng lý thuyết rồi tiếp tục câu đang dở. Chỉ ghi `USER-ACCEPTED` sau phản hồi
  thật.

### Kho nội dung Admin/Editor đồng bộ với learner — 31/08/2026

- **Module:** Biên Tập Viện + Cổng Quản Trị — `IN-REVIEW`; phản hồi mới được
  xử lý trong đúng lát cắt kho nội dung, chưa chuyển `USER-ACCEPTED` trước khi
  người dùng xem lại `/admin/content` và `/studio`.
- **Người dùng thấy gì:** Admin và Editor không còn hiểu `0 revision D1` là
  `0 nội dung người học`. Hai lớp được tách rõ: kho learner hiện có `217` bài
  học, `2.016` mục từ, `476` điểm ngữ pháp trong bài, `227` nhiệm vụ giao tiếp,
  `1.096` Hán tự trong bài, `5` chuyên đề âm, `1` bài đọc ngắn, `25` bộ sách,
  `422` câu hỏi nguồn và `24` bộ đề; phía dưới vẫn báo riêng bản nháp/chờ duyệt/
  bản đã phát hành từ Biên Tập Viện. Màn chọn nhóm, chọn loại và màn soạn cũng
  cho biết quy mô nội dung nền tương ứng; empty state giải thích kho learner
  vẫn nguyên vẹn khi xưởng chưa có revision.
- **Tự đồng bộ:** projection server đọc trực tiếp từ cùng consumer của
  curriculum, rich lesson, Reader và exam bank ở mỗi lần build/runtime; thêm
  bài, sách hoặc đề vào nguồn hiện hành sẽ cập nhật số mà không cần seed/copy
  sang D1. Type contract buộc mọi loại nội dung Studio có một projection; test
  buộc mọi authoring route hiện hành có baseline khác 0. Phiên bản mutable của
  xưởng được giữ riêng nên không nhân đôi stable ID hoặc gọi nội dung nền là
  revision biên tập.
- **Đã kiểm:** targeted inventory/Studio/repository/Reader/rich-content xanh
  `6 file/50 test`; lượt chốt đường biên server xanh `2 file/12 test`;
  `npm run typecheck`, targeted ESLint, `git diff --check` và production build
  đều xanh. Bundle ceiling bảo thủ `1023,9 KiB` (`958,2 KiB` client JS/CSS
  Brotli + hero `65,7 KiB`). Browser thật xác nhận `/admin/content`, `/studio`,
  nhóm bài học và màn soạn bài ở light/dark: số đúng, không console error,
  không tràn ngang và không có control thấy được dưới `44 px` tại viewport
  khả dụng `639×552`.
- **Dữ liệu giữ được:** không seed/migrate D1, không tạo revision và không chạm
  tiến độ học. `.wrangler/`, localStorage/IndexedDB học tập, stable ID,
  completion, streak, saved item, FSRS, mistakes, owner/reset scope, session dở
  dang, outbox, `docs/reports/` và `output/` được giữ. Inventory vẫn HSK0 `4/4`
  (rich `0/4`), HSK1 `40/40`, HSK2 `40/40`, HSK3 `55/55`, HSK4 `78/78`, tổng
  HSK1–4 `213/213` rich.
- **Tiếp theo:** người dùng test `/admin/content`, sau đó mở `/studio`, chọn
  một nhóm và một loại nội dung; chỉ ghi `USER-ACCEPTED` sau xác nhận thật.

### Admin + Biên Tập Viện + RBAC — phản hồi mở lại module — 31/08/2026

- **Module:** Tài khoản và phân quyền + Biên Tập Viện + Cổng Quản Trị —
  `IN-REVIEW`. Lần nghiệm thu 30/08 bên dưới vẫn là mốc lịch sử, nhưng phản hồi
  mới cho thấy đích đăng nhập theo vai trò và dashboard vận hành chưa đạt nên ba
  module được mở lại; chưa chuyển về `USER-ACCEPTED` trước khi người dùng test.
- **Người dùng thấy gì:** đăng nhập từ một route người học như `/path` không còn
  kéo tài khoản chuyên trách về Thiên Lộ: Editor vào `/studio`, Admin vào
  `/admin`. Deep-link hợp lệ trong đúng back-office và `/account` vẫn được giữ
  cho step-up; topbar Admin/Studio không còn mời tài khoản chuyên trách quay về
  không gian học. Chính sách áp dụng cho HANZI.OS, email OTP, passkey và callback
  Google/Facebook khi các provider đó được cấu hình.
- **Dashboard dữ liệu thật:** phần đầu `/admin` hiển thị tài khoản hiện có, phiên
  chưa thu hồi/chưa hết hạn, tài khoản có hoạt động học đã đồng bộ và số tương
  tác học trong 7 ngày. Biểu đồ cột chồng theo ngày tách đăng nhập/học/biên tập,
  có chú giải và bảng số liệu thay thế; biểu đồ cơ cấu tài khoản tách active,
  locked, editor và admin. Số liệu lấy trực tiếp từ D1/audit/attempt/workflow;
  guest/local không bị theo dõi và UI nói rõ giới hạn này, không dựng visitor,
  DAU hoặc conversion giả. Biểu đồ content/release cũ vẫn dùng dữ liệu Studio
  thật và giữ empty state khi chưa có revision phát hành.
- **Đã kiểm:** `6 test file/31 test` RBAC/Admin/Auth xanh, `npm run typecheck`,
  ESLint các file đổi và production build xanh. Bundle ceiling bảo thủ vẫn
  `1023,8 KiB` (`958,0 KiB` client JS/CSS Brotli + hero `65,7 KiB`). Browser
  thật xác nhận cả `/signin?returnTo=/path` → `/studio` cho Editor và → `/admin`
  cho Admin; dashboard desktop `1280 px`, mobile `375×812`, light/dark không
  tràn ngang và không có console error.
- **Dữ liệu giữ được:** browser smoke chỉ tạo thêm hai phiên đăng nhập demo cùng
  audit sign-in tương ứng; không tạo/sửa content và không chạm tiến độ học.
  `.wrangler/`, localStorage, IndexedDB, stable ID, completion, streak, FSRS,
  mistakes, owner/reset scope, session dở dang, outbox, `docs/reports/` và
  `output/` đều được giữ. Inventory vẫn HSK0 `4/4` (rich `0/4`), HSK1 `40/40`,
  HSK2 `40/40`, HSK3 `55/55`, HSK4 `78/78`, tổng HSK1–4 `213/213` rich.
- **Tiếp theo:** chờ người dùng đăng nhập thử Editor/Admin và duyệt số liệu
  dashboard trên web local; chỉ sau xác nhận mới đổi ba module về
  `USER-ACCEPTED`.

### Admin + Biên Tập Viện + RBAC — người dùng đã nghiệm thu — 30/08/2026

- **Module:** Tài khoản và phân quyền + Biên Tập Viện + Cổng Quản Trị —
  `USER-ACCEPTED`; chủ dự án xác nhận `duyệt module` ngày 30/08/2026 sau lượt
  bàn giao web và ba hành trình kiểm thử Admin/Editor/RBAC.
- **Người dùng thấy gì:** light mode back-office dùng canvas jade-mist và các
  lớp surface phân cấp thay cho nền trắng phẳng; chữ, trạng thái, focus và CTA
  giữ tương phản rõ. Dashboard Admin diễn giải đúng trạng thái chưa có dữ liệu,
  các danh sách người dùng/phiên/nhật ký/workflow/phát hành có lọc và phân trang
  thật. Biên Tập Viện mở bản nháp bài học trống theo đúng bài đích, không còn
  lén chèn nội dung demo `A 是 B`; biểu mẫu chia `Định vị → Biên soạn → Tự kiểm
  & lưu`, phần dài thu gọn dần và tự mở đúng vùng khi validation lỗi.
- **Phân quyền:** Editor được đọc workspace, tạo/sửa/tự kiểm/gửi duyệt nhưng
  không được duyệt hoặc phát hành; Admin được duyệt/phát hành và quản lý
  user/session/settings/audit nhưng không đóng vai người soạn. Trang quyền hiển
  thị ma trận server-derived; các route quản trị dùng permission cụ thể thay vì
  một gate chung mơ hồ. Browser thật đã xác nhận Editor bị chặn tại `/admin`
  nhưng vẫn soạn được tại `/studio?create=lesson`, sau đó khôi phục phiên Admin.
- **Đã kiểm:** `npm run typecheck`, ESLint toàn repo và `6 test file/53 test`
  cho Studio/RBAC/Admin đều xanh. Production build xanh với ceiling bảo thủ
  `1023,0 KiB` dưới gate `1024 KiB`. Browser desktop `1280×720` và mobile
  `390×844` xác nhận Admin không tràn ngang, không có touch target dưới `44px`;
  smoke light mode sau cleanup tại Thiên Cơ Kính, Nghịch Cảnh Lục, Vạn Âm Điện
  và Vạn Quyển Các không có alert/runtime error hay regression layout.
- **Cleanup có bằng chứng:** loại các họ CSS `adversity-*`, `acoustic-*`,
  `analytics-*` và `authenticated-reader-*` của UI cũ sau khi `rg` chứng minh
  không còn class consumer; các màn hình thay thế có stylesheet riêng và đã
  được browser smoke. Không giảm chất lượng hero và không nới bundle budget.
- **Gate toàn repo còn biết:** `npm run check` dừng tại HSK1 với
  `communicative collection source binding is stale`. Đây là debt nguồn nội
  dung có sẵn và là đầu vào cần audit ở lát cắt Thiên Lộ kế tiếp, không được vá
  chéo trong module back-office.
- **Dữ liệu giữ được:** không tạo bản nháp/content mutation trong browser test;
  chỉ có sự kiện đăng nhập/đăng xuất demo. Không chạm `.wrangler/`, localStorage,
  IndexedDB, `docs/reports/`, `output/`, stable ID, completion, streak, FSRS,
  mistakes, owner/reset scope, session dở dang hoặc outbox. Inventory vẫn HSK0
  `4/4` (rich `0/4`), HSK1 `40/40`, HSK2 `40/40`, HSK3 `55/55`, HSK4 `78/78`,
  tổng HSK1–4 `213/213` rich.
- **Tiếp theo:** mở đúng một module **Học — lộ trình và bài học** để đại tu nội
  dung cùng trải nghiệm từng bài Thiên Lộ; các module khác giữ nguyên trạng thái.

### Học — Thiên Lộ, lát cắt briefing sư phạm — chờ người dùng duyệt — 30/08/2026

- **Module:** Học — lộ trình và bài học — `IN-REVIEW`; đây là vertical slice
  đầu tiên của Thiên Lộ, chưa phải nghiệm thu toàn bộ 217 bài.
- **Người học thấy gì:** briefing light mode dùng surface jade-mist sáng vừa,
  chữ mực xanh đậm và không còn terminal tối ghép vào trang sáng. Luồng bắt buộc
  là `Hiểu nguyên tắc → Nắm từ trọng tâm → Gặp trong ngữ cảnh (khi có rich
  content) → Xem cách làm`; hội thoại có nghe từng lượt, nghĩa Việt, một mẫu câu
  cốt lõi và bài tự nói trước khi mở đáp án. Bài lớn chỉ đưa tối đa 8 từ neo;
  phiên đã khóa hiển thị đúng các word ID thật, inventory còn lại chỉ là tham
  khảo nên không còn cảm giác phải học dồn hàng chục tới hàng trăm từ.
- **Tính đúng đắn:** sửa lỗi câu trả lời cuối đạt ngưỡng 70% nhưng receipt dùng
  điểm cũ; điểm gate nay tính từ `nextAnswers` trước khi ghi journey. Hint vẫn
  không được nâng thành recall độc lập. Không đổi thuật toán tạo form để tránh
  làm hỏng resume phiên local/account đang dở.
- **Viewport và PWA:** briefing thường chỉ có một vùng cuộn ngoài; compact review
  mới có vùng cuộn riêng. CTA luôn nằm trong viewport, mọi control thấy được đạt
  tối thiểu 44 px, không tràn ngang. Voice Reactor và lời boot tiếng Việt bị tắt
  riêng trên `/lesson/*`; banner phục hồi PWA chuyển lên mép trên nên không còn
  chặn nút hành động ở mobile.
- **Đã kiểm:** 5 file/239 test trọng điểm xanh; `npm run typecheck`, ESLint toàn
  repo, HSK1 communicative pack check/validator và production build xanh. Bundle
  ceiling bảo thủ `1023,8 KiB` dưới gate `1024 KiB`. Playwright production mobile
  light/reduced-motion `390×844` xanh: không cuộn lồng, không tràn ngang, CTA
  trong viewport, nền thẻ đủ sáng và không có Voice Reactor.
- **Cleanup có bằng chứng:** bỏ CSS Graded Reader và activity/priority dashboard
  cũ sau khi `rg` xác nhận không còn consumer; Reader và Analytics hiện dùng
  stylesheet/module mới. Không xóa file dữ liệu, migration, `.wrangler/`,
  `docs/reports/` hoặc `output/`.
- **Dữ liệu giữ được:** content report vẫn có 2.016 vocabulary và 217 runtime
  lessons; inventory learner-visible giữ HSK0 `4/4` (rich `0/4`), HSK1 `40/40`,
  HSK2 `40/40`, HSK3 `55/55`, HSK4 `78/78`, tổng HSK1–4 `213/213` rich. Stable
  ID, completion, streak, saved item, FSRS, mistakes, owner/reset scope, session
  dở dang và outbox không đổi.
- **Nợ bị giảng viên trừ điểm:** package vẫn chỉ là `closed-alpha`, thiếu
  contentOwner/sourceLicense/native review/audio; report còn 14 record hash
  provenance cũ ở 7 mục character. Một số rich dialogue vượt 6 lượt và taxonomy
  ngữ pháp còn nhãn nguồn khó hiểu. Full `precheck` đã sửa canonical hash-only
  cho chuỗi HSK1 tới local-study package nhưng hiện dừng ở
  `hsk1-daily-life-local-study-review.json is stale`; lát cắt kế tiếp phải tiếp
  tục đúng builder/validator. Các lỗi này phải xử lý bằng lát cắt biên tập có
  review/provenance thật, không được giả mạo `humanReviewed`.
- **Tiếp theo:** chủ dự án test `/lesson/boot-1` ở light mode, đi hết bốn chặng
  của một bài HSK1 có hội thoại và thử mở lý thuyết giữa phiên. Chỉ sau xác nhận
  mới chuyển module sang `USER-ACCEPTED` hoặc mở lát cắt Thiên Lộ kế tiếp.

### Light mode — hệ thức tỉnh hologram sáng đang chờ người dùng duyệt — 28/08/2026

- **Module:** Onboarding và shell điều hướng — `IN-REVIEW`; chưa đổi thành
  `USER-ACCEPTED` trước khi chủ dự án tự xem và xác nhận.
- **Người học thấy gì:** light mode dùng canvas jade-mist thay cho nền trắng,
  panel chỉ sáng hơn một bậc và mực xanh đậm thay toàn bộ chữ vốn dành cho nền
  tối. Ký Ức Trận, Thất Trụ, Thiên Lộ, Nghịch Cảnh Lục, Vạn Âm Điện, Thần Văn
  Lô, Vạn Quyển Các, Tàng Tự Khố, Thiên Cơ Kính, Phòng Luyện Đề và Hồ sơ đã có
  surface/foreground đồng bộ; vùng hologram tối còn lại luôn có chữ sáng.
- **Đã kiểm:** `npm run typecheck` xanh. Browser thật rà toàn bộ learner routes
  trên desktop, chuyển dark/light và smoke mobile `390×844` tại `/review`,
  `/exams`, `/dictionary`; không tràn ngang và CTA vẫn nằm trong viewport. Build
  đã biên dịch đủ năm môi trường nhưng gate bundle cuối báo `1027,1 KiB`, vượt
  ngân sách `1024 KiB` `3,1 KiB`; không nới ngân sách trong lát cắt giao diện.
- **Gate toàn repo:** `npm run check` dừng sớm ở artifact nội dung HSK1 có sẵn
  với lỗi `communicative collection source binding is stale`; không regenerate
  content ngoài lát cắt theme. Dev runtime và các API learner đã kiểm đều trả
  `200/304`, không có lỗi CSS/runtime mới trong hành trình smoke.
- **Dữ liệu giữ được:** không xóa/chạm `.wrangler/`, localStorage, IndexedDB,
  `docs/reports/` hay `output/`; không đổi stable ID, completion, streak, saved
  item, FSRS, mistakes, owner/reset scope, session dở dang hoặc outbox. Inventory
  learner-visible vẫn HSK0 `4/4` (rich `0/4`), HSK1 `40/40`, HSK2 `40/40`,
  HSK3 `55/55`, HSK4 `78/78`, tổng HSK1–4 `213/213` rich.
- **Tiếp theo:** chủ dự án test light mode tại `/`, `/review`, `/pronunciation`
  và `/profile`; chỉ chỉnh tiếp tone/độ đậm nếu có feedback cụ thể rồi mới duyệt.

### Light mode + back-office tối giản + AI Vạn Quyển Các — 28/08/2026

- **Module:** Biên Tập Viện và Cổng Quản Trị — `IN-REVIEW`; chưa đổi thành
  `USER-ACCEPTED` trước khi chủ dự án nghiệm thu.
- **Giao diện:** thêm light/dark mode toàn hệ thống; Admin mở vào dashboard có
  ba việc cần làm, số liệu và biểu đồ; Biên Tập Viện tách theo nhóm nội dung,
  chỉ hiện công cụ thuộc nhóm đã chọn và thu gọn tìm kiếm nâng cao.
- **Vạn Quyển Các:** bước đầu chỉ cần tên sách, tên chương và bản thảo tiếng
  Trung; adapter Gemini server-only tạo Pinyin cùng nghĩa tiếng Việt, sau đó bắt
  buộc Editor xem lại trước khi lưu. Không có API key vẫn có đường nhập thủ công.
  Nội dung AI luôn giữ `humanReviewed: false` cho tới review thật.
- **An toàn dữ liệu:** giữ schema và stable ID Reader hiện hành; không chạm
  `.wrangler/`, localStorage, IndexedDB hay inventory HSK0–HSK4.
- **Đã kiểm:** typecheck, ESLint và production build xanh; bundle ceiling
  `1021,1 KiB` dưới gate `1024 KiB`. Bộ regression back-office/Reader trước đó
  xanh `63/63`; lượt chốt adapter AI, quyền Admin/Editor và repository xanh
  `27/27`. Browser thật đã kiểm light mode tại Thiên Lộ, Vạn Quyển Các và màn
  Soạn sách; viewport `390×844` không tràn ngang và không có touch target dưới
  44 px.

### Biên Tập Viện + Cổng Quản Trị hoàn tất triển khai, chờ một lượt nghiệm thu — 27/08/2026

- **Module:** Biên Tập Viện và Cổng Quản Trị — `IN-REVIEW`. Theo yêu cầu trực
  tiếp của chủ dự án, lượt này khép toàn bộ chương trình back-office trước rồi
  mới bàn giao một lần; không chuyển `USER-ACCEPTED` khi chưa có xác nhận thật.
- **Workflow chuẩn:** Editor chọn module/bài nguồn → soạn và xem trước → chạy
  kiểm định năm chiều → gửi revision bất biến → Admin/người duyệt độc lập yêu
  cầu sửa hoặc phê duyệt sau step-up → release worker phát hành và theo dõi sức
  khỏe/replay. Phân công, người chịu trách nhiệm và SLA nằm trong Cổng Quản Trị;
  draft không tự xuất hiện cho người học.
- **Phạm vi biên soạn:** biểu mẫu chuyên môn cho từ vựng, Hán tự, ngữ pháp,
  phát âm, nhiệm vụ giao tiếp, bài đọc ngắn, bài học, câu hỏi luyện đề và bộ đề;
  sách nhiều chương dùng Bàn biên soạn Reader riêng. Bài học cho phép chọn đúng
  lesson ID hiện hành rồi soạn mục tiêu, lý thuyết, hội thoại, ngữ pháp, bài tập
  hướng dẫn, kỹ năng và liên kết nguồn. Thao tác “xóa” nghiệp vụ dùng archive/
  supersede hoặc fork revision, không hard-delete stable ID hay tiến độ learner.
- **Projection learner:** vocabulary đi vào Tàng Tự Khố/nguồn ôn theo bài;
  character vào Thần Văn Lô; pronunciation vào Vạn Âm Điện; lesson, grammar và
  communicative function làm giàu đúng bài Thiên Lộ; graded text/series đi vào
  Vạn Quyển Các; exam item/form đi vào bank và cửa Phòng Luyện Đề. Projection
  được lọc và dựng ở server; runtime công khai từ chối `exam_item`/`exam_form`,
  đáp án đúng và revision pin chỉ tồn tại ở server. Khi D1 chưa có gói publish,
  các module tiếp tục dùng inventory built-in hiện hành, không bị rỗng dữ liệu.
- **Admin:** command center responsive có workflow, queue/SLA, coverage module,
  user/role, session, settings, release health/replay và audit. Quyền draft,
  validate, submit, approve, publish tách riêng; approve/publish và thao tác nhạy
  cảm yêu cầu step-up. Bulk validate/submit, diff, tìm kiếm, filter, pagination,
  archive và recovery release đều giữ ranh giới server.
- **Đã kiểm:** `17 file/88 test` workflow/repository/route/release/exam/projection
  xanh; `11 file/53 test` inventory, learning journey, Reader và preview xanh;
  `npm run typecheck`, `npm run lint`, production build và bundle gate xanh.
  Browser thật kiểm tra desktop/mobile cho `/admin`, `/studio`, `/path`,
  `/lesson/boot-1`, `/dictionary`, `/characters`, `/pronunciation`: không console
  error, không tràn ngang; Admin/Studio có touch target tối thiểu 44 px và header/
  action của phiên học vẫn trong viewport. Build ceiling hiện `1024,0 KiB`
  (`954,8 KiB` client Brotli + `69,2 KiB` hero), đúng giới hạn nhưng gần sát trần.
- **Giới hạn gate toàn repo:** lượt full `npm test` còn dừng ở các generated
  curriculum artifact đã lệch source binding/deterministic JSON từ working tree
  có sẵn, ví dụ `hsk1CommunicativeUnitPacks.test.ts`. Không tự regenerate hoặc
  ghi đè lô content ngoài lát cắt vì chưa có bằng chứng migration/provenance an
  toàn; các gate trực tiếp của back-office và consumer đều đã xanh.
- **Dữ liệu giữ được:** không xóa/chạm `.wrangler/`, localStorage, IndexedDB,
  `docs/reports/` hay `output/`; không đổi stable lesson/vocabulary/character ID,
  completion, streak, saved item, FSRS, mistakes, owner/reset scope, session dở
  dang hoặc outbox. Inventory learner-visible vẫn HSK0 `4/4` (rich `0/4`), HSK1
  `40/40`, HSK2 `40/40`, HSK3 `55/55`, HSK4 `78/78`, tổng HSK1–4 `213/213` rich.
- **Tiếp theo:** chủ dự án nghiệm thu một lượt từ `/studio` và `/admin` tới các
  module learner; chỉ sau xác nhận mới đổi hai module sang `USER-ACCEPTED`.

### Cổng Quản Trị — tách trang cho người không chuyên — 27/08/2026

- **Module:** Cổng Quản Trị — `IN-REVIEW`. Trang `/admin` nay chỉ là bảng việc
  trong ngày; các thao tác đã tách thành tám điểm vào có tên tiếng Việt rõ ràng:
  Tổng quan, Công việc, Kho nội dung, Duyệt & phát hành, Tài khoản & quyền,
  Phiên đăng nhập, Cấu hình và Nhật ký hoạt động.
- **Luồng làm việc:** Admin bắt đầu ở Tổng quan → xử lý hàng Công việc → mở
  revision trong Biên Tập Viện để duyệt → theo dõi phát hành hoặc khôi phục gói
  lỗi. Editor vẫn soạn toàn bộ loại nội dung tại `/studio`; Cổng Quản Trị chỉ
  điều phối, bảo vệ quyền và không thay learner progress. Mỗi form có nút quay
  lại đúng trang đang làm, nhãn phổ thông và chi tiết kỹ thuật ẩn sau mở rộng.
- **Trải nghiệm:** dùng một shell chung với điều hướng cố định, breadcrumb,
  nhóm “Công việc hàng ngày / Quản trị hệ thống”, số việc cần xử lý, empty state
  và cảnh báo step-up. Giao diện mobile chuyển thành danh sách dọc; mọi liên kết,
  nút, ô nhập và trạng thái tập trung đạt tối thiểu `44×44px`, có focus rõ và
  tôn trọng `prefers-reduced-motion`.
- **Đã kiểm:** `AdminShell.test.tsx` cùng targeted route tests `13/13` xanh;
  `npm run typecheck`, `npm run lint`, `npm run build` và bundle gate xanh ở
  `1023,4 KiB`. Browser smoke thật kiểm tra đủ tám route Admin ở desktop
  `1366×768` và mobile `390×844`: đúng heading/điều hướng, không tràn ngang,
  không có control nhỏ hơn `44px`; `/studio` vẫn mở được ở mobile.
- **Gate toàn repo:** `npm run check` đã chạy tới bộ kiểm định curriculum nền
  nhưng dừng ở artifact HSK1 có sẵn với lỗi `communicative collection source
  binding is stale` trong `hsk1UnitRuntimeProjection.mjs`. Không regenerate hoặc
  ghi đè artifact này trong lát cắt Admin vì sẽ vượt phạm vi và có nguy cơ đổi
  nội dung learner; targeted back-office/Studio và production build vẫn xanh.
- **Dữ liệu giữ được:** chỉ thêm IA, shell, trang server và return-path cho form;
  không xóa/chạm `.wrangler/`, localStorage, IndexedDB, `docs/reports/` hay
  `output/`; giữ stable lesson/vocabulary/character ID, completion, streak,
  saved item, FSRS, mistakes, owner/reset scope, session dở dang và outbox.
  Inventory learner-visible vẫn HSK0 `4/4` (rich `0/4`), HSK1 `40/40`, HSK2
  `40/40`, HSK3 `55/55`, HSK4 `78/78`, tổng HSK1–4 `213/213` rich.
- **Tiếp theo:** chủ dự án nghiệm thu một lượt từ `/admin` → Công việc → Duyệt
  & phát hành và `/studio`; chỉ sau xác nhận thật mới đổi module sang
  `USER-ACCEPTED`.

### Biên Tập Viện — xưởng soạn nội dung task-first cho non-tech — 27/08/2026

- **Module:** Biên Tập Viện — `IN-REVIEW`. Trang `/studio` được thiết kế lại để
  bắt đầu bằng câu hỏi “Hôm nay bạn muốn soạn gì?” thay cho bản đồ trạng thái,
  thống kê và các nhóm chức năng lặp lại. Mỗi mục chỉ xuất hiện một lần trong
  đúng năm nhóm: Bài học & kiến thức, Giao tiếp & phát âm, Hán tự, Bài đọc và
  Luyện đề.
- **Luồng soạn:** mười thẻ tác vụ dẫn tới mười loại nội dung bằng nhãn tiếng
  Việt phổ thông; `create=` chỉ dùng để mở biểu mẫu, còn `filterType=` chỉ dùng
  để lọc thư viện, tránh mở nhầm form khi đang tìm bản nháp. Màn hình soạn có
  tiêu đề module, đường quay lại, ba bước Nhập nội dung → Tự kiểm tra → Lưu bản
  nháp và đánh dấu rõ ô bắt buộc. Phần “Sau khi tôi lưu, nội dung đi đâu?” giải
  thích workflow kiểm định/phê duyệt/phát hành bằng `details` có thể mở khi cần.
- **Phân quyền:** Admin nhìn thấy lối sang Cổng Quản Trị nhưng không được tạo
  draft; Editor mới dùng biểu mẫu chuyên môn. Ranh giới quyền và toàn bộ
  workflow server hiện hành không đổi.
- **Đã kiểm:** 3 test file/27 test Studio form–catalog–route xanh; `npm run
  typecheck`, `npm run lint`, `npm run build` và bundle gate xanh ở `1024,0 KiB`.
  Browser smoke thật xác nhận `/studio` có 5 nhóm/10 tác vụ, không còn selector
  layout cũ, không tràn ngang, touch target tối thiểu 44 px và không console error
  ở desktop/mobile `390×844`; luồng `create=lesson` và `filterType=grammar` không
  lẫn nhau.
- **Dữ liệu giữ được:** chỉ đổi catalog/URL/markup/CSS của xưởng; không đổi
  stable lesson/vocabulary/character ID, completion, streak, saved item, FSRS,
  mistakes, owner/reset scope, session dở dang, outbox hay projection learner.
  Inventory vẫn HSK0 `4/4` (rich `0/4`), HSK1 `40/40`, HSK2 `40/40`, HSK3
  `55/55`, HSK4 `78/78`, tổng HSK1–4 `213/213` rich.
- **Tiếp theo:** chủ dự án nghiệm thu một lượt từ `/studio` và `/admin`; chỉ sau
  xác nhận mới chuyển module sang `USER-ACCEPTED`.

### Vạn Quyển Các Mốc 3 đang chờ người dùng duyệt — 25/08/2026

- Thư khố giữ 25 stable series ID và mở rộng thành **250 chương đọc được**: mỗi
  quyển có trọn 10 chương, nối theo tuyến truyện riêng. Stable chapter ID cũ,
  completion, vị trí đọc, Sổ Từ, owner/generation/reset và guest→account adoption
  được giữ nguyên. Nội dung mới là AI-assisted, `humanReviewed:false`, không được
  dùng làm mastery/evidence.
- Cả 25 quyển có **25 bìa minh họa riêng theo nội dung**, tạo bằng OpenAI built-in
  image generation, tối ưu WebP `720×1080` tổng khoảng 2,54 MB. Bìa không còn Hán
  tự lớn ở giữa; 25 tệp có 25 hash khác nhau và rights manifest ghi provenance,
  phạm vi sử dụng cùng trạng thái review fail-closed.
- Reader tokenizer bao toàn bộ Hán tự bằng token có thể bấm, ưu tiên cụm từ rồi
  fallback từng chữ. Lookup sâu dùng kho CVDICT + HSK mở rộng gồm **119.048 bề mặt
  tiếng Trung có thể tra**, trong đó 11.093 mục tải tức thời và 119.043 mục exact
  lookup chia 64 shard. Cụm `熄灭` được browser smoke xác nhận tra ra Pinyin,
  phồn thể và nghĩa Việt ngay ở Chương 10 rồi mở cùng hồ sơ trong Tàng Tự Khố.
  Mục tham chiếu có thể lưu vào Sổ Từ nhưng không tự tạo mastery/FSRS.
- Biên tập viên có `/studio/library` theo luồng gian hàng: nhập hồ sơ sách, URL
  bìa, thể loại/HSK, thêm/bớt chương và đoạn Trung–Pinyin–Vi, khai provenance và
  xác nhận quyền. Server yêu cầu `content:drafts:write`; sách mới đi qua draft →
  validation → submission → approval → publish của Content Studio và learner API
  chỉ đọc revision `published`. Mã sách built-in được chặn trùng.
- Gate Mốc 3: `build-mega-lexicon --check` và validator toàn bộ 64 shard xanh;
  targeted ESLint xanh; 4 test file/20 test Reader–lexicon–editorial xanh, bao đủ
  250 chapter shard và mọi Hán tự trong mỗi đoạn. Browser smoke thật xác nhận 25
  bìa M3 tải đủ ở 720 px, không còn cover sigil, 250 chương, deep link Chương 10,
  lookup `熄灭`, Tàng Tự Khố 119.048 mục và form biên tập; viewport editor
  `360×640` không tràn ngang, touch target nhỏ nhất 44 px.
- `npm run typecheck` không có lỗi do Mốc 3 nhưng vẫn dừng ở đúng hai lỗi có sẵn
  ngoài Reader tại `DashboardPage.tsx` (thiếu nhãn `dictionary`) và `PathPage.tsx`
  (`hsk0` chưa nằm trong union đích). Inventory HSK1–4 không đổi:
  `40/40 + 40/40 + 55/55 + 78/78 = 213/213` rich.
- Trạng thái Mốc 3 là `IN-REVIEW`; chờ chủ dự án test web trước khi duyệt.

### Vạn Quyển Các Mốc 2 đang chờ người dùng duyệt — 24/08/2026

- Thư khố giữ nguyên 25 quyển khám phá được và tăng từ 30 lên 54 chương: `Thư
  Các Thanh Đăng` giữ 6 chương; cả 24 quyển còn lại đều có Chương 2 nguyên bản
  nối đúng tuyến truyện mở đầu. Stable series/chapter ID cũ, completion, vị trí
  đọc, chế độ đọc và FSRS hiện hành được giữ nguyên; nội dung mới tiếp tục là
  AI-assisted, `humanReviewed:false`.
- Tokenizer Reader nay phủ toàn bộ chữ Hán trong mọi đoạn, ưu tiên cụm từ dài
  nhất từ kho released HSK rồi mới hạ xuống từng chữ. Từ cốt lõi vẫn lưu vào khu
  Ôn/FSRS; chữ hoặc cụm ngoài giáo trình mở thẻ ngữ cảnh, tra sâu qua Tàng Tự
  Khố và lưu riêng trong `Sổ Từ Vạn Quyển`, không tự tạo mastery/evidence.
- Tiến độ Reader schema V2 đọc tương thích document cũ không có `savedEntries`;
  Sổ Từ mới vẫn scope theo owner/generation/reset và được adoption guest→account
  cùng tiến độ chương. UI cho phép nghe, tra sâu, bỏ lưu; touch target, focus và
  disclosure về Pinyin/FSRS đều rõ.
- Năm minh họa bìa dọc nguyên bản được tạo bằng OpenAI built-in image generation
  theo art direction HANZI.OS, tối ưu WebP tổng khoảng 510 KiB. Ảnh không chứa
  chữ; tên sách, Hán tự và ấn ký vẫn dựng bằng HTML/CSS để rõ, accessible và giữ
  nguyên identity từng quyển. Rights manifest ghi rõ provenance và vẫn
  `humanReviewed:false`.
- Đã kiểm 6 test file/39 test Reader xanh; validator tải đủ 55 chapter shard kể
  cả deep link legacy và chứng minh số Hán tự lookupable bằng đúng tổng số Hán
  tự trong từng đoạn. Targeted ESLint và `git diff --check` xanh. Browser smoke
  thật xác nhận 54 chương, mục lục hai chương, click chữ `谢` ngoài giáo trình →
  lưu → mở lại trong Sổ Từ; desktop/mobile `390×844` không tràn ngang. E2E Reader
  đã bổ sung hành trình này cho production run kế tiếp.
- `npm run typecheck` không còn lỗi do Mốc 2, nhưng full gate vẫn dừng ở hai lỗi
  có sẵn ngoài Reader tại `DashboardPage.tsx` (thiếu nhãn `dictionary`) và
  `PathPage.tsx` (`hsk0` chưa nằm trong union đích). Inventory HSK1–4 không đổi:
  `40/40 + 40/40 + 55/55 + 78/78 = 213/213` rich.
- Trạng thái Mốc 2 là `IN-REVIEW`; chờ chủ dự án test web trước khi duyệt.

### Vạn Quyển Các Mốc 1 — USER-ACCEPTED 24/08/2026

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
- Chủ dự án xác nhận “cực kì hài lòng” sau khi test; Mốc 1 chuyển
  `USER-ACCEPTED` ngày 24/08/2026.

### Onboarding đang chờ người dùng duyệt — 11/08/2026

- Người mới vào `/` thấy trang giới thiệu tổng quan trước khi phải chọn mục tiêu;
  `/welcome` luôn mở lại được trang này mà không xóa tiến độ.
- Landing hiện trình bày đúng năm khu vực Học/Ôn/Nói/Luyện/Hồ sơ, các module
  thật bên trong và inventory hiện hành; phong cách “hệ thống thức tỉnh” được
  thể hiện bằng bản đồ lõi hologram tĩnh, không dùng hiệu ứng trang trí liên tục.
- Thiết lập được rút còn ba bước rõ: mục tiêu, điểm bắt đầu, thời lượng/tên tùy
  chọn. Tên để trống trở về `Hành giả vô danh`; chữ giản thể + Pinyin là mặc
  định của lộ trình hiện hành.
- Nút cuối `Bắt đầu Khảo Nghiệm Căn Cơ` mở thẳng `/assessment`; lễ danh hiệu sau thiết
  lập đã bỏ để không chặn luồng bằng một hộp thông báo chỉ có tác dụng đóng.
- Thanh hành động nằm ngoài vùng nội dung cuộn nên luôn dùng được tại desktop
  thấp `1365×640` và mobile thấp `360×640`; không còn panel nghiêng hay vòng quay
  trang trí liên tục.
- Evidence hiện tại: `e2e/onboarding-entry.spec.ts` 4/4 xanh ở desktop thấp,
  mobile thấp, keyboard và reduced-motion; `npm run typecheck`, targeted ESLint
  và build xanh. Bundle ceiling `799,1 KiB` dưới gate `800 KiB`. Full check gần
  nhất trước chỉnh copy/landing vẫn xanh với 270 test file/1.976 test.
- Inventory nội dung không đổi. Chỉ chuyển `USER-ACCEPTED` sau khi chủ dự án tự
  test và xác nhận.

### Thức Tỉnh Điện đang chờ người dùng duyệt — 12/08/2026

- Dashboard `/` sau onboarding là một sân khấu hologram thống nhất gồm năm cửa sổ chức
  năng: **Thức tỉnh**, **Trạng thái**, **Chỉ thị**, **Thất Trụ** và **Thiên Lộ**. Thanh tab
  phía trên đã bỏ; chỉ một cửa sổ xuất hiện tại một thời điểm và nội dung, CTA, dữ liệu học
  cũ được giữ nguyên.
- Hai nút mũi tên ở hai cạnh chuyển cửa sổ trước/sau; bàn phím dùng ArrowLeft/ArrowRight,
  Home/End khi focus vùng carousel. Cửa sổ tự luân phiên sau đúng 5 giây; cụm trạng thái
  và nút dừng ở đáy đã bỏ theo phản hồi người dùng. Tự chuyển vẫn tạm dừng khi hành giả
  hover/focus sân khấu hoặc trang bị ẩn, đồng thời tắt hẳn với `prefers-reduced-motion`.
- Bốn cửa sổ chức năng sau màn mở đầu đã được thiết kế lại theo cùng một hệ hologram
  purpose-first: mỗi cửa sổ có câu giải thích mục đích, một điểm nhấn lớn và đúng một CTA
  chính. **Trạng thái** ghép thiên mệnh với bento chỉ số hôm nay; **Chỉ thị** tôn một nhiệm vụ
  ưu tiên và hạ hàng đợi xuống vai trò phụ; **Thất Trụ** phân biệt tín hiệu đo được, chưa đủ
  tín hiệu và kênh luyện chưa có phép đo; **Thiên Lộ** nêu bài kế tiếp và preview các chặng gần vị trí hiện
  tại thay vì co toàn bộ lộ trình thành một chấm giữa màn hình.
- Nhãn tròn `THẤT TRỤ · TÍN HIỆU HỌC TẬP` được căn giữa chủ động và khóa không tự wrap lệch.
  Chế độ tài khoản không còn biến tín hiệu `insufficient` thành khuyến nghị trụ yếu giả;
  XP, streak và breadth vẫn không được diễn giải thành mastery.
- **Nhiệm vụ nói** hiển thị đồng nhất với sáu trụ còn lại về màu, thanh tín hiệu, trạng thái
  và bố cục; không có card nhấn, CTA hay kiểu trình bày riêng. Phép đo vẫn fail-closed:
  transcript trình duyệt không tạo phần trăm hay kết luận năng lực nói.
- `Chi tiết bằng chứng` của Thất Trụ nay mở thành một hồ sơ hologram nằm tuyệt đối bên trong
  cửa sổ, giữ nguyên hình học của header và bản đồ phía sau. Hồ sơ có đủ bảy trụ, vùng cuộn
  nội bộ, nút đóng 44 px, phím `Escape`, khóa focus và trả focus về nút mở; mở/đóng không còn
  tạo thêm grid row, cuộn trang hay làm nội dung phía trên bị ép/cắt.
- **Chỉ Thị** và **Thiên Lộ** dùng jade–teal làm màu cấu trúc chung cho khung, đường sáng và
  CTA. Vàng chỉ còn nhấn ưu tiên/phần thưởng trong Chỉ Thị; cyan chỉ còn biểu thị tiến độ và
  chặng hiện tại trong Thiên Lộ, không còn phủ vàng/magenta lên toàn cửa sổ.
- Toàn bộ Thức Tỉnh Điện nằm giữa command bar và điều hướng mobile, không còn cuộn trang
  dọc/ngang tại desktop thấp `1365×640` và mobile thấp `360×640`. Touch target hai nút
  mũi tên tối thiểu 44 px; focus ring và quan hệ `carousel`/`slide` có ngữ nghĩa đầy đủ.
- Evidence hiện tại: E2E carousel/autoplay/reduced-motion, hierarchy/CTA và palette jade–teal
  trước đó xanh; targeted Nói + disclosure Thất Trụ dạng overlay, đóng bằng chuột/Escape,
  focus, hình học và visual parity của cả bảy trụ trên desktop/mobile `3/3` xanh. Signal
  policy `10/10`, `npm run typecheck`, targeted ESLint và build xanh. Bundle ceiling
  `797,9 KiB` dưới gate `800 KiB`; không còn selector hay CTA riêng cho trụ Nói.
- Inventory learner-visible và state local/account không đổi. Chỉ chuyển `USER-ACCEPTED`
  sau khi chủ dự án tự test và xác nhận trải nghiệm.

### Khảo Nghiệm Căn Cơ đang chờ người dùng duyệt — 11/08/2026

- `/assessment` không còn phụ thuộc form 10 câu có thể cạn; mọi guest/account
  đều vào cùng cổng **Khảo Nghiệm Căn Cơ**.
- Cổng được tách thành hai màn hình: giới thiệu ngắn rồi chọn tầng. Nút chuyển
  màn hình và nút mở tầng luôn nằm trong vùng nhìn thấy ở desktop/mobile thấp,
  không cần cuộn trang để tiếp tục.
- Khi vào không gian học mà chưa hoàn tất Khảo Nghiệm, hệ thống hiện lời mời có
  hành động ở góc phải trên và phát một câu xướng lệnh local; có nút nghe lại,
  đóng hoặc mở thẳng Khảo Nghiệm. Nếu có phiên đang dở, lời mời ghi rõ tầng/câu
  đã lưu và mở thẳng lại đúng phiên đó; mỗi phiên Khảo Nghiệm chỉ nhắc một lần
  trong phiên trình duyệt.
- Hành giả chọn tầng HSK1–HSK4 làm gợi ý định tuyến. Mỗi cổng dùng 12 câu nguyên
  bản (4 đọc, 4 từ vựng, 4 ngữ pháp), lưu phiên local và không lộ đúng/sai hay
  đáp án trước kết quả.
- Chạm một đáp án sẽ lưu ngay rồi tự chuyển sang câu kế tiếp; không còn bước
  trung gian `Đã ghi nhận`/`Câu tiếp theo`. Rời trang hoặc
  đóng trình duyệt rồi mở lại đúng tầng sẽ tiếp tục đúng câu trên cùng thiết bị;
  phiên local này không tự chuyển sang thiết bị khác và sẽ mất khi hành giả chủ
  động xóa toàn bộ dữ liệu HANZI.OS.
- Xếp tầng đi theo bậc thang: kết quả mạnh chỉ mở Khảo Nghiệm tầng trên; kết quả
  yếu dẫn xuống tầng dưới để xác minh; chỉ tầng đã xác minh mới được nhận làm
  điểm khởi hành. Nút `Ta chưa biết gì · bắt đầu từ số 0` ghi nhận lựa chọn bỏ
  qua và mở thẳng bài HSK0 đầu tiên.
- Khung tham chiếu chính thức: [GF0025-2021 của Bộ Giáo dục Trung Quốc](https://jsj.moe.gov.cn/n2/7001/7001/1573.shtml),
  [mô tả năng lực HSK 3.0 của CTI](https://hsk.cn-bj.ufileos.com/3.0/HSK3.0%E8%80%83%E8%AF%95%E8%83%BD%E5%8A%9B%E6%8F%8F%E8%BF%B0.pdf)
  và [cấu trúc HSK hiện hành](https://www.chinesetest.cn/HSK/1?type=1).
- HSK 3.0 cấp 1–6 vẫn ở giai đoạn thử nghiệm trong thông báo CTI hiện hành;
  kết quả HANZI.OS chỉ là **điểm khởi hành đề xuất**, không phải điểm/chứng chỉ
  HSK. Bank chưa được hiệu chuẩn thống kê độc lập; TTS không tham gia xếp tầng,
  nói và viết được ghi rõ là chưa khảo sát.
- Các runner Khảo Nghiệm, luyện đề, Reader theo phiên và bài học dùng chung khung
  viewport an toàn: header/lựa chọn quan trọng luôn tiếp cận được; vùng câu hỏi ở giữa tự
  cuộn khi màn hình thấp. Geometry đã khóa ở desktop `1365×640` và mobile
  `360×640`, bao gồm biên phía trên thanh điều hướng mobile.
- Evidence hiện tại: policy, trạng thái bỏ qua, parser resume và storage lifecycle
  `18/18` Vitest xanh. E2E cổng Khảo Nghiệm, niêm phong đáp án, tự chuyển câu,
  resume qua lời mời, bỏ qua HSK0 và viewport đều xanh; hành trình HSK1 đủ 50 câu
  `1/1` xanh; keyboard radio targeted `1/1` xanh; typecheck/ESLint/build xanh.
  Bundle ceiling `788,4 KiB` dưới gate `800 KiB`. Full mobile suite song song còn có timeout
  ở các test shell/voice cũ không thuộc lát cắt; không dùng chúng để tuyên bố
  module đã được người dùng chấp nhận.
- Inventory nội dung không đổi. Module chỉ chuyển `USER-ACCEPTED` sau khi chủ dự
  án làm thử, nhận lộ trình và xác nhận trải nghiệm.

### Biên Tập Viện và ranh giới kho nội dung đang chờ người dùng duyệt — 21/08/2026

- Audit chốt lại hai vai trò khác nhau: **Tàng Tự Khố** tra và ôn cả từ/cụm từ
  với Pinyin, nghĩa Việt, ví dụ và lưu ôn; **Thần Văn Lô** quan sát từng Hán tự,
  cách đọc và ngữ cảnh chứa chữ. Hai màn hình đã có nhãn chức năng phổ thông và
  liên kết chéo để người dùng không còn phải đoán theo lore.
- Ghi chú lịch sử của lát cắt Biên Tập Viện: thời điểm đó chỉ có `7` chữ mẫu.
  Trạng thái phát hành hiện hành đã được thay thế bởi checkpoint 22/08 bên dưới:
  `1.096` chữ có geometry practice-only, bàn nét dung sai và IME escape hatch.
- `/studio` giữ nguyên role `content_editor`, kho revision, audit và workflow
  draft → validate → submit → approve → publish, nhưng thay ô JSON bằng sáu biểu
  mẫu có hướng dẫn: từ/cụm từ, Hán tự, ngữ pháp, bài học, câu luyện đề và bộ đề.
  Biên tập viên chỉ nhập Trung–Pinyin–Việt, thêm/xóa ví dụ hoặc bài tập, tự kiểm
  chất lượng rồi tạo bản nháp; learner runtime vẫn chỉ đọc bản đã phát hành.
- Tại checkpoint dựng Biên Tập Viện, inventory learner-visible chưa bị phóng đại:
  `2.016` từ mục HSK0–4, `1.096`
  Hán tự nhận diện và `213` khung bài học. Snapshot CC-CEDICT hiện có `124.725`
  entry chỉ là nguồn ứng viên, trạng thái `latest-non-verified-editor-export`,
  legal review còn pending; entry chưa có nghĩa/ví dụ Việt được duyệt không được
  tự động đưa sang người học.
- Browser thật xác nhận editor demo mở được `/studio`, đổi phân khu sang đúng
  form, desktop và mobile `390×844` không vỡ; thanh tạo bản nháp sticky luôn nằm
  trong vùng bấm. Không submit bản nháp nên D1, audit log và learner progress
  không phát sinh dữ liệu thử.
- Evidence: typecheck và targeted ESLint xanh; targeted Vitest `14/14`, riêng
  release boundary Thần Văn Lô `3/3`; production build biên dịch đủ route nhưng
  bundle gate toàn app vẫn fail ở `837,8 KiB`, vượt Phase 0 `37,8 KiB` (trước lát
  cắt đã vượt `28,2 KiB`). Module chỉ chuyển `USER-ACCEPTED` sau khi chủ dự án
  dùng thử vai trò Biên tập viên và xác nhận.

### Biên Tập Viện và Cổng Quản Trị — vận hành thư khố quy mô lớn đang chờ người dùng duyệt — 27/08/2026

- **Module: `IN-REVIEW`.** Mốc dang dở sau khi mất lịch sử đã được khôi phục
  thành một vertical slice vận hành hoàn chỉnh: chín biểu mẫu chuyên môn và bàn
  sách nhiều chương cho editor non-tech; bản đồ biên soạn chỉ rõ nguồn nội dung
  của Thiên Lộ, Ôn/lỗi sai, Vạn Âm Điện, Thần Văn Lô, Vạn Quyển Các, Khảo
  Nghiệm/Luyện đề, Tàng Tự Khố và bảy kỹ năng. Chỉ số mastery, lịch FSRS và tiến
  độ cá nhân tiếp tục là dữ liệu hệ thống, không phải trường editor được nhập.
- Thư khố Studio không còn dừng ở `100/200` revision đầu: tìm theo tiêu đề hoặc
  stable key có escape wildcard, lọc theo phân khu/trạng thái/cấp/người phụ trách,
  đếm toàn bộ kết quả và phân trang `48` mục. Component test của biểu mẫu Studio
  nay được Vitest thu thập thật thay vì bị cấu hình cũ bỏ qua.
- Cổng Admin có hàng duyệt và hàng phát hành truy vấn độc lập; dashboard coverage
  dùng toàn bộ D1 thay vì danh sách gần đây. Hàng phối hợp được xếp bằng SQL theo
  quá hạn → ưu tiên → hạn xử lý, giữ lịch sử phân công/reviewer/SLA append-only;
  bulk validate/submit, diff ảnh hưởng, release health và replay sự cố đều giữ
  permission, same-origin, step-up và request-size boundary phía server.
- Ranh giới learner giữ nguyên: editor không vào được deep-link Admin; draft,
  validated, submitted và approved không xuất hiện với người học; chỉ published
  head được projection. Không schema hay state completion, streak, FSRS,
  mistakes, saved item, session dở dang, outbox, localStorage/IndexedDB nào bị
  sửa. `.wrangler/` được giữ nguyên; browser smoke chỉ tạo một audit đăng nhập
  demo Admin, không tạo revision hay evidence học mới; learner shell chỉ chạy
  nhịp đồng bộ nền bình thường khi mở Thiên Lộ.
- Đã kiểm: targeted Editor/Admin `37/37` Vitest và learner/content invariant
  `26/26` xanh; typecheck, targeted ESLint, `db:check`, `git diff --check` và
  production build xanh. Browser thật ở `1280×720` và `360×720` xác nhận Studio,
  Admin và Thiên Lộ không tràn ngang, control đạt tối thiểu `44×44`, phân quyền
  editor→admin bị chặn và Thiên Lộ còn HSK0 `4/4`, HSK1 `40/40`. `npm run check`
  toàn repo vẫn fail sớm vì artifact communicative collection đang stale trong
  các thay đổi nội dung ngoài lát cắt; không mở rộng sửa sang module người học ở
  mốc này.
- Mốc chỉ chuyển `USER-ACCEPTED` sau khi chủ dự án thử luồng editor/admin. Việc
  đưa published overlay của từng loại nội dung vào mọi consumer learner còn lại
  là vertical slice kế tiếp vì chạm trực tiếp runtime người học và cần một lượt
  nghiệm thu riêng.

### Tàng Tự Khố nhận mục từ đã phát hành từ Biên Tập Viện đang chờ người dùng duyệt — 27/08/2026

- **Module: `IN-REVIEW`.** Consumer learner đầu tiên ngoài mock exam/Reader series
  đã được nối với projection của Biên Tập Viện: `/dictionary` tải riêng loại
  `vocabulary` từ `/api/content/runtime?type=vocabulary`, chỉ chấp nhận manifest
  `published-only` của release worker và từ chối toàn bộ overlay nếu contract hoặc
  bất kỳ item nào sai. Kho cốt lõi/mở rộng hiện hành luôn là fallback.
- Stable key mới tạo thêm một mục tra cứu; stable key trùng mục hiện có cập nhật
  Trung–Pinyin–Việt và ví dụ nhưng giữ `isCore`, chữ phồn thể, từ loại, lượng từ,
  liên kết bài học và saved-item ID cũ. Mục Studio hiện nhãn **BIÊN TẬP**, nguồn
  và ngày phát hành bằng ngôn ngữ phổ thông; mục mới chưa gắn bài không tự vào
  Ký Ức Trận, không tạo XP, mastery hay evidence.
- Trạng thái tải chỉ hiện sau `350 ms` để tránh nháy; success/fallback dùng
  `role=status`. Nếu projection gián đoạn, UI nói rõ kho hiện tại vẫn dùng được.
  Nút `Đã lưu` được nâng từ `42` lên chuẩn touch target `44 px` trong CSS scoped
  của Tàng Tự Khố.
- D1 local hiện có `0` vocabulary package đang phát hành nên browser smoke không
  tạo revision thử. Nhánh có package publish, digest fence, published-head swap,
  manifest sai, item sai, stable-key overlay và request `no-store` được kiểm bằng
  D1/test cô lập; draft vẫn vô hình.
- Đã kiểm: targeted publication/learner invariant `51/51` Vitest, typecheck,
  targeted ESLint, `db:check`, production build và `git diff --check` xanh.
  Browser thật ở `1280×720`, `360×720` và landscape `720×360` xác nhận 11.093 mục
  fallback, tìm `你好` đúng `1` kết quả, không tràn ngang, `177` control của module
  đạt tối thiểu `44 px` và không có console error. `npm run check` vẫn dừng ở
  artifact HSK1 ngoài lát cắt: `communicative collection source binding is stale`.
- Inventory HSK0 `4/4`, HSK1 `40/40`, HSK2 `40/40`, HSK3 `55/55`, HSK4 `78/78`
  (`213/213` rich) và stable learner IDs không đổi. Mốc kế tiếp sau nghiệm thu là
  published `graded_text` → Vạn Quyển Các; chưa tự mở rộng sang runtime bài học.

### Vạn Quyển Các nhận bài đọc ngắn đã phát hành từ Biên Tập Viện đang chờ người dùng duyệt — 27/08/2026

- **Module: `IN-REVIEW`.** Editor non-tech có thể soạn trọn một bài đọc ngắn:
  tiêu đề Trung, tóm tắt Việt, thời lượng, liên kết bài học nguồn, các đoạn
  Trung–Pinyin–Việt, câu hỏi đọc hiểu có lời giải và hồ sơ provenance/quyền sử
  dụng. Stable key được chiếu thành Reader series/chapter ID xác định nên sửa nội
  dung không làm gãy deep-link hoặc tiến độ đã có.
- Vạn Quyển Các chỉ nhận published head loại `graded_text`. Mỗi item phải qua đủ
  năm review pass, quyền sử dụng, lesson link, alignment, câu hỏi và digest/version
  fence; item lỗi bị bỏ riêng, API/database lỗi fail-closed. D1 local hiện có `0`
  graded text đã phát hành nên không tạo dữ liệu thử; `25` quyển/`250` chương tích
  hợp và toàn bộ tiến độ cũ vẫn là fallback nguyên vẹn.
- Bài phát hành hiện như một quyển Reader HSK0–4 có provenance rõ. Khảo Luyện giữ
  lựa chọn đầu tiên, số lần thử và việc đã lộ lời giải; chỉ cho hoàn thành sau khi
  trả lời đúng hết nhưng luôn ghi `measurementEligible:false` và
  `masteryClaimed:false`. Trường comprehension mới là optional trong schema tiến
  độ v2, giữ tương thích completion, bookmark, saved entry, owner/reset scope và
  phiên đọc dở; chỉ reset lần thử chưa hoàn tất khi content version thực sự đổi.
- Loading/offline có thông báo và retry, không biến kho rỗng hợp lệ thành lỗi.
  Header và CTA phiên đọc vẫn cố định trong viewport; hit-area tra chữ thực tế
  `45×60 px`, các control khác tối thiểu `44 px`. Bản CSS Reader bị đóng gói trùng
  trong global bundle đã được loại sau audit consumer; stylesheet lazy đang dùng
  được giữ nguyên, đưa ceiling từ `1026,1` xuống `1020,8 KiB` dưới gate `1024 KiB`.
- Đã kiểm: targeted Reader/Studio/repository `8 file/37 test` xanh (bài quét toàn
  bộ `250` chương chạy riêng `9/9` sau một lần chạm timeout do tranh CPU), invariant
  learner `3 file/26 test`, typecheck, targeted ESLint, `db:check`, production
  build và `git diff --check` xanh. Browser thật tại `1280×720`, `360×720` và
  landscape `720×360` không tràn ngang, không console error, header/footer luôn
  trong viewport. `npm run check` vẫn fail sớm ngoài lát cắt ở
  `communicative collection source binding is stale`; `content:validate` riêng
  còn báo checksum nguồn lịch sử không khớp từ package `foundation-2026.07.6`,
  nên không tự tái sinh package/checksum người dùng trong module Reader.
- Inventory HSK0 `4/4`, HSK1 `40/40`, HSK2 `40/40`, HSK3 `55/55`, HSK4 `78/78`
  và HSK1–4 `213/213` rich không đổi. Sau khi người dùng nghiệm thu, vertical slice
  kế tiếp là published `lesson` → Thiên Lộ để editor bắt đầu điều khiển toàn bộ lộ
  trình mà không thay thế hay làm mất runtime bài học hiện hành.

### Thiên Lộ nhận bài học đã phát hành từ Biên Tập Viện đang chờ người dùng duyệt — 27/08/2026

- **Module: `IN-REVIEW`.** Biểu mẫu bài học cho editor non-tech nay chọn trực
  tiếp một stable lesson đích trong toàn bộ lộ trình: HSK0 `4`, HSK1 `40`, HSK2
  `40`, HSK3 `55`, HSK4 `78`. Editor biên soạn tiêu đề Trung, mục tiêu, khái
  niệm, quy tắc, lỗi thường gặp, checkpoint, hội thoại Trung–Pinyin–Việt, điểm
  ngữ pháp và thực hành có đáp án Trung–Pinyin–Việt. Prerequisite, từ cốt lõi và
  kỹ năng runtime được lấy nguyên vẹn từ bài đích thay vì cho nhập tay; đổi cấp
  sẽ tải đúng inventory của cấp đó.
- Một bài published chỉ phủ lớp trình bày của đúng lesson ID hiện hành. Tên,
  mục tiêu, lý thuyết ba chặng và disclosure nội dung sâu được chiếu sang Thiên
  Lộ/phiên bài học; activity bank, phiên làm bài, ngưỡng đạt, XP, graph khóa mở,
  `contentVersion` và quan hệ dữ liệu vẫn do runtime cốt lõi quyết định. Hai
  stable item không được cùng phát hành vào một lesson đích; phải lưu trữ bản cũ
  trước. Guest và account dùng cùng projection.
- Projection chỉ đọc published head loại `lesson`, kiểm tra release boundary,
  revision/digest metadata, level–lesson binding, năm pass, `humanReviewed:false`,
  graph/từ/kỹ năng exact-match và toàn bộ nội dung Trung–Pinyin–Việt. Manifest
  lỗi hoặc API/D1 không sẵn sàng fail-closed về bài cốt lõi, hiện thông báo có
  nút thử lại và không chặn học. D1 local hiện có `0` lesson published nên không
  tạo dữ liệu giả; Thiên Lộ hiện hành được giữ nguyên làm fallback.
- Đã kiểm: typecheck, targeted ESLint, `303/303` targeted Vitest cho Studio,
  preview, validator, release worker/repository, projection, graph, local/account
  lesson runtime và content inventory; `git diff --check` xanh. Production build
  xanh ở `1023,6/1024 KiB`. Browser thật `1280×720` và `360×720` xác nhận Thiên
  Lộ/phiên bài học không tràn ngang, control trong module đạt tối thiểu `44 px`,
  topbar/CTA phiên luôn trong viewport, Studio card mobile không tràn và không có
  console error. `npm run check` vẫn dừng đúng debt ngoài lát cắt:
  `communicative collection source binding is stale`.
- Dữ liệu giữ được: stable lesson/vocabulary/character ID, completion, streak,
  saved item, FSRS, mistakes, owner/reset scope, phiên dở, outbox,
  localStorage/IndexedDB và D1 `.wrangler/` không đổi. Inventory HSK0 `4/4`,
  HSK1 `40/40`, HSK2 `40/40`, HSK3 `55/55`, HSK4 `78/78` và HSK1–4
  `213/213` rich không đổi. Chờ chủ dự án test editor → publish → Thiên Lộ trước
  khi chuyển `USER-ACCEPTED` hoặc chọn đúng một module kế tiếp.

### Thiên Lộ, Thần Văn Lô và Tàng Tự Khố đang chờ người dùng duyệt — 22/08/2026

- Thiên Lộ nay luôn dựng **cảnh giới kế tiếp** từ chính runtime graph: hiện số
  bài đã đạt/tổng bài tiên quyết, số còn thiếu, quy tắc mỗi bài đạt từ `70%`, và
  xác nhận Đại Khảo không phải khóa mở. Regression khóa đủ HSK1→2, HSK2→3 và
  HSK3→4. Bốn Thiên Mệnh giữ một xương sống HSK để bảo toàn prerequisite nhưng
  có lane vận dụng, ba chặng, màu và module đích riêng; đổi mục tiêu không xóa
  completion.

- Kho mở rộng không còn là một lối rẽ đứng trước Thiên Lộ. `1.459` mục HSK1–4
  được gắn đúng một lần vào `213` bài rich hiện hữu, mỗi bài có `1–16` từ mở
  rộng và giữ nguyên stable lesson ID/khóa tiên quyết. Chặng **Học từ** cho phép
  chuyển giữa từ trọng tâm của thử luyện và từ mở rộng trong bài, rồi đi thẳng
  sang Vạn Âm Điện, Thần Văn Lô hoặc Tàng Tự Khố với lesson context. `7.618` mục
  HSK5–9/hiện đại chỉ xuất hiện ở kho nâng cao sau khi chọn cảnh giới HSK4.
- Tàng Tự Khố trở thành luồng tra Trung–Việt thực tế cho `11.093` mục: tìm theo
  giản thể/phồn thể/Pinyin/nghĩa Việt; xem các nghĩa đánh số, từ loại, lượng từ,
  ví dụ, chữ cấu thành, từ liên quan và nguồn. Khi đi từ bài học, từ điển lọc
  đúng từ trọng tâm + pack mở rộng của bài và vẫn có nút mở toàn kho. Artifact
  lớn chỉ tải khi cần, danh sách chỉ dựng tối đa 160 hàng mỗi lượt.
- Tàng Tự Khố có thêm **Mê Trận Từ Nghĩa** 10 ải, luân phiên bẫy nghĩa, chọn
  ngược Việt→Hán và bẫy Pinyin. Distractor ưu tiên gần từ loại/độ dài; phiên chỉ
  tự kiểm, không tự tạo XP hoặc mastery. Khi vào phiên, hero thu lại và CTA luôn
  nằm trên mobile navigation.
- Thần Văn Lô phát hành bàn thứ tự nét cho toàn bộ `1.096` Hán tự có trong bốn
  package rich HSK1–4. Geometry tự host từ `hanzi-writer-data@2.0.1` theo APL;
  manifest khóa practice-only, không chấm chữ đẹp và không tạo mastery. Bàn nét
  kiểm tra thứ tự/hướng với dung sai, có xem mẫu, bỏ qua nét khó, viết lại và
  hoạt động bằng chuột/touch/bút. Link từ bài/từ điển mở chế độ luyện tập trung:
  desktop và mobile đều thấy bàn cùng ba hành động mà không phải kéo tìm CTA.
- UI Thần Văn Lô được dựng lại thành năm bàn progressive-disclosure: **Nhận
  diện, Giải cấu trúc, Dẫn nét, Truy ảnh, Đấu tự**. Chỉ một bàn hiện mỗi lượt;
  vào bàn thao tác sẽ thu hero, giữ mode/action trong viewport. Radical strokes
  được phân lớp từ field có provenance; Truy ảnh giấu đường dẫn và chỉ hé sau
  hai lần lệch; Đấu tự dùng ngữ cảnh của chính kho đã phát hành.
- Hệ chữ không còn bị onboarding ép ngầm về giản thể: người học chọn giản/phồn
  ngay lúc thiết lập. Bài học, ôn, đọc và từ điển tiếp tục dùng script của hồ
  sơ; Thần Văn Lô hiển thị cặp phồn thể để nhận diện nhưng bàn viết chỉ dùng
  geometry giản thể tương ứng khi chưa có stroke data phồn thể đã kiểm chứng.
- Nguồn kho từ vẫn ghim revision/hash: `ivankra/hsk30` (MIT) và CVDICT của
  Phong Phan (CC BY-SA 4.0, dẫn xuất CC-CEDICT). Lớp tham chiếu giữ
  `humanReviewed:false`, `measurement/mastery/xp/production:false`; số lượng
  không được biến thành tuyên bố thông thạo hoặc bao phủ sư phạm đã duyệt.
- Gate mới: TypeScript và ESLint xanh; `27/27` targeted Vitest xanh (runtime HSK,
  four-goal journey, boundary chữ, cặp giản–phồn và mê trận). Browser thật xác
  nhận desktop và mobile `390×844` không tràn ngang; bàn Dẫn nét thấy đủ ba
  hành động, Mê Trận thấy đủ bốn đáp án + CTA và chuyển đúng `01/10 → 02/10`.
- Stable lesson/vocabulary/character ID, `2.016` từ cốt lõi, `217` bài,
  completion, streak, FSRS, mistakes, outbox, localStorage/IndexedDB và D1
  `.wrangler/` không đổi. Generator/validator khóa `1.459/213/7.618`; sync khóa
  đúng `1.096` geometry. Typecheck, targeted ESLint và `43/43` targeted Vitest
  xanh. Browser thật xác nhận từ điển lesson-scope `36` kết quả, bàn chữ `你` có
  đủ `7` nét, desktop `1280×720` và mobile `390×844` không tràn ngang, không có
  console error. Production build biên dịch đủ toàn bộ route nhưng gate tài sản
  toàn app fail ở `851,1 KiB`, vượt budget Phase 0 `51,1 KiB`; đây là debt bundle
  chung (trước lát cắt đã fail `844,1 KiB`), không phải lỗi biên dịch của module.

### Thần Văn Lô — Lò tôi luyện hình thể đang chờ người dùng duyệt — 22/08/2026

- Lát cắt này thay thế giao diện năm tab cũ bằng hai route rõ vai trò: **Sảnh
  Thần Văn** tại `/characters` để chọn phiên và **Lò Tôi Luyện** tại
  `/characters/session` để thao tác. Trong phiên, thanh tiến độ và thanh hành
  động luôn ở trong viewport; chỉ sân luyện giữa cuộn. Sảnh có đúng một CTA
  chính, lối vào từ Thiên Lộ, luyện nhanh, tiếp tục phiên dở và bộ chọn riêng
  3–5 chữ.
- Mỗi chữ đi qua năm pha có mục tiêu khác nhau: **Soi cấu trúc → Đoán hướng nét
  → Dẫn nét → Viết từ trí nhớ → Kích hoạt trong ngữ cảnh**. Gợi ý thích ứng L0–L5
  tăng khi sai/dùng trợ giúp và giảm khi làm đúng; nét người học màu cyan được
  đối chiếu với nét chuẩn màu vàng theo điểm đầu, hướng, thân và điểm cuối. Tác
  vụ viết luôn có đường thoát `Viết trên giấy`, chọn nét tiếp theo, xem mẫu và
  bỏ qua nét khó; các đường thoát chỉ ghi evidence luyện tập, không tự tạo XP
  hay mastery.
- Bàn cấu trúc dùng geometry có provenance để tách bộ/phần còn lại và yêu cầu
  tái hợp chữ, không suy diễn từ nguyên. Bài ngữ cảnh ưu tiên cặp dễ nhầm đã xác
  minh. `Nghe chữ` chỉ đọc đúng một Hán tự; `Nghe từ` đọc riêng từ ngữ cảnh.
  Kết quả nêu chữ cần luyện lại và chữ đã viết trên giấy, không thưởng XP giả.
- Adapter lesson giữ nguyên deep link cũ `?char=` và nhận được cả rich lesson ID
  lẫn lesson Thiên Lộ thông thường qua `wordIds`; phiên `boot-1` đã được thử từ
  đầu đến kết quả với đúng bốn chữ `你/人/二/一`, có đường trở về **Bốn thanh
  điệu**. Reload giữ nguyên chữ/pha hiện tại và Back trở về Sảnh có CTA tiếp tục
  phiên dở.
- Dữ liệu vẫn là toàn bộ `1.096` Hán tự đã phát hành và `213` rich lesson; stable
  lesson/vocabulary/character ID, completion, streak, FSRS, mistakes, outbox,
  localStorage/IndexedDB và D1 `.wrangler/` không đổi. Stroke geometry tiếp tục
  fail-closed theo provenance; invalid geometry và lỗi tải có retry regression.
- Gate module xanh: targeted ESLint không warning; `18/18` targeted Vitest; hành
  trình browser thật hoàn tất phiên custom 3 chữ và phiên Thiên Lộ 4 chữ, kiểm
  deep link/reload/Back/audio tách biệt. Bảy viewport `360×640`, `390×844`,
  `844×390`, `768×1024`, `1024×768`, `1365×768`, `1440×900` không tràn ngang,
  CTA luôn trong viewport và chỉ sân luyện là vùng cuộn. `npm run check` đi qua
  toàn bộ precheck nội dung và lockfile rồi dừng ở hai lỗi TypeScript có sẵn
  ngoài module: `DashboardPage` thiếu nhãn `dictionary` và `PathPage` chưa nhận
  path id `hsk0`; không mở rộng lát cắt sang hai module này.
- Phản hồi trực quan ngày `23/08/2026`: Sảnh đầu tiên bị từ chối vì headline
  cao `321px`, lõi chữ `470px` và CTA rơi xuống dưới viewport `1365×644`. Hero
  đã được dựng lại thành bảng điều khiển thấp: tiêu đề tối đa hai dòng, lõi
  `292px`, CTA kết thúc tại y=`431`. Browser kiểm lại `360×640`, `390×844`,
  `844×390`, `1365×644`, `1440×900`: CTA luôn hiện, không tràn ngang, touch
  target nhỏ nhất `44px`, console không warning/error. Trạng thái tiếp tục là
  `IN-REVIEW` vì cần người dùng duyệt lại art direction mới.
- Phản hồi phương pháp ngày `23/08/2026`: pha 4 **Tái Tạo** nay luôn bắt đầu ở
  L0 với bàn trống, bất kể mức trợ giúp còn lại từ pha Rèn Nét. Không còn glyph,
  lưới, hình học nét hay đường vàng ngầm; nét cyan của người học được giữ lại
  trong khi viết. Gợi ý chủ động chỉ hiện/ẩn một glyph mờ; đường chuẩn vàng chỉ
  xuất hiện sau khi hoàn tất để đối chiếu. Gate ở lát cắt kế tiếp thay thế số
  liệu kiểm thử của thay đổi ban đầu này.
- Phản hồi tinh gọn ngày `23/08/2026`: **Rèn Nét** không còn bắt người học lặp
  tới khi khớp máy; một nét có đủ chuyển động được ghi đúng một lần rồi chuyển
  tiếp, sai lệch chỉ trở thành evidence cần ôn. Nút khởi động lại giữa lượt,
  thang L0–L5, chữ lặp ở command bar, vòng trang trí bàn viết và hai lối thay thế
  hiển thị đồng thời đã được bỏ/gom vào `Cách khác`. **Tái Tạo** có đúng một gợi
  ý `Hiện chữ mờ`: browser xác nhận glyph xuất hiện nhưng `grid=0`, `guide=0`,
  `stroke-shape=0`. Desktop `1280×720` và mobile `390×844` không tràn ngang,
  CTA luôn trong viewport, mọi control trong phiên đạt tối thiểu `44px`. Gate
  module cập nhật `22/22` Vitest, targeted ESLint và `git diff --check` sạch;
  typecheck toàn repo vẫn chỉ còn hai lỗi có sẵn ngoài module ở `DashboardPage`
  và `PathPage`.
- Trạng thái vẫn là `IN-REVIEW`; chỉ chuyển `USER-ACCEPTED` sau khi người dùng
  tự hoàn tất một phiên và xác nhận trải nghiệm.

### Phòng Luyện Đề — mở rộng cửa và luồng biên tập đang chờ người dùng duyệt — 25/08/2026

- Runner được cân lại theo phản hồi trực quan ngày 26/08: nhãn phần, tiêu đề,
  audio, đáp án và nội dung dock dùng chung một trục rộng tối đa `900px`; đáp án
  nằm gần câu hỏi thay vì bị ghim xuống đáy khoảng trống. HSK1–2 chia đúng hai
  cột tiến độ, HSK3–4 chia ba cột, không còn ô trống làm HUD lệch. Browser thật
  xác nhận các biên desktop trùng nhau; viewport `390×844` không tràn ngang,
  bốn đáp án cao `56px`, CTA cao `50px` và nằm trên mobile nav.
- Theo phản hồi trực quan ngày 26/08, bản xếp ba phòng theo tam giác đã được
  hoàn nguyên về room map desktop 2×2 cũ: HSK3–4 dùng ba ô Nghe/Đọc/Viết và
  chừa ô thứ tư; HSK1–2 vẫn dùng hai ô Nghe/Đọc. Hai dòng thống kê quy mô ở
  hero và tiêu đề tầng đã được bỏ hoàn toàn để màn hình trở lại gọn như trước.
  Cụm icon, tên và mô tả trong mọi phòng HSK1–4 nay được căn đúng tâm hai trục;
  đo browser cho toàn bộ phòng, cửa A–F và ô thông số đều lệch tâm `0px`, số thứ
  tự phòng vẫn giữ ở góc.
- Mỗi tầng nay có sáu cửa dựng sẵn A–F đúng quy mô: HSK1 `40/40`, HSK2
  `60/55`, HSK3 `80/90`, HSK4 `100/105`; tổng `24` form và `1.680` vị trí câu.
  Các form là những cách sắp xếp bất biến từ kho `422` câu nguồn nguyên bản:
  không lặp câu bên trong cùng một form, nhưng có tái sử dụng có chủ đích giữa
  các form khác nhau và UI nói rõ số câu nguồn thay vì giả nhận `1.680` câu duy
  nhất.
- Cửa G–L không render khi chưa được phát hành, không còn slot `Chờ biên tập`
  trong giao diện người học. Studio
  `/studio?type=exam_form#new-draft` cho `content_editor/admin` chọn tầng và cửa,
  dùng một nguồn cấp độ duy nhất rồi tự áp số câu, thời gian, coverage
  Nghe/Đọc/Viết chính xác; A–F bị khóa để tránh ghi đè. Chỉ revision đã duyệt,
  publish và đi qua release projection thì cửa mới tự xuất hiện ở catalog.
  Blueprint gắn revision bất biến để phiên đang dở vẫn resume
  được sau khi editor xuất bản revision mới hoặc archive cửa hiện tại.
- Gate: validator reject thiếu/thừa câu, sai thời gian, sai coverage, item nguồn
  không tồn tại, trùng item trong form và trùng cửa đã publish. Targeted Vitest
  `5 file/21 test` gồm hành trình editor → duyệt → publish → release → catalog
  learner và resume blueprint cũ; targeted ESLint sạch. Typecheck không có lỗi
  mới trong lát cắt, vẫn dừng ở đúng hai lỗi có sẵn ngoài module tại
  `DashboardPage.tsx` và `PathPage.tsx`. Browser thật mở thẳng Cửa F HSK1, phục
  hồi đúng phiên `40` câu với phần Nghe `20` + Đọc `20` sau khi khởi động sạch
  dev server. Lượt hoàn nguyên chạy thêm `3 file/12 test`, targeted ESLint sạch;
  browser thật `1280×720` xác nhận HSK4 về lưới ba ô trên room map 2×2, chỉ có
  sáu radio A–F, không còn thống kê/slot chờ và không có console warning/error.
  Mobile `390×844` không tràn ngang, CTA còn trong viewport và cửa thấp nhất
  `49px`.
- Recovery phiên thật ngày 26/08: một cửa HSK đang dở trước đây chặn mọi cửa
  khác vì assessment chỉ cho một phiên active, còn các form A–F tái dùng kho câu
  lại va vào exposure ledger một-lần của bài đo năng lực. Catalog nay đưa người
  học về đúng cửa active thay vì cố commit phiên thứ hai; luyện đề practice-only
  không ghi thêm exposure mastery, nhưng form/attempt/outbox vẫn giữ đủ audit.
  Phiên đã hết giờ mà item-version cũ không còn chấm được sẽ được khép bằng trạng
  thái `abandoned` qua protocol chuẩn, không xóa session/exposure, rồi quay lại
  cửa vừa chọn. Browser thật trên Chrome đã phục hồi phiên HSK3/B cũ, mở runner
  HSK3/B mới `80` câu với radio thao tác được; targeted gate `5 file/26 test`
  và ESLint sạch. Typecheck toàn repo vẫn chỉ dừng ở hai lỗi có sẵn ngoài module
  tại `DashboardPage.tsx` và `PathPage.tsx`.
- `33` form mini compatibility, stable ID/version, D1 `.wrangler/`, localStorage,
  IndexedDB, outbox, history và mọi phiên đang dở không bị xóa hay migration.
  Trạng thái `IN-REVIEW`; chỉ chuyển `USER-ACCEPTED` sau khi người dùng duyệt
  giao diện hoàn nguyên và thử thêm cửa A–F.

### Phòng Luyện Đề — đề mô phỏng đúng quy mô HSK đang chờ người dùng duyệt — 25/08/2026

- Recovery sau lượt thử thật: Cốc Cốc vẫn báo `Invalid or unexpected token`
  dù hard reload vì service worker `v12` bypass route `/exams` nhưng tiếp tục
  stale-cache module Vite dưới `/src`, `/app` và `/node_modules`. Ngoài worker
  `v13` không còn giữ path development, recovery `v14` nay được nhúng vào HTML
  server trước entry browser: trên `localhost` nó xóa riêng cache `hanzi-os-*`,
  unregister worker và reload có chặn tối đa tới khi controller rời hẳn. Entry
  `/exams` cũng dùng URL version mới để buộc cache-miss ngay cả khi worker v12
  còn giữ module cũ. LocalStorage, IndexedDB, D1 và phiên luyện đề không nằm
  trong cleanup này. Lượt thử tiếp theo cho thấy client-side navigation không
  chạy lại HTML recovery và `/review` cũng lỗi cùng lazy graph; recovery `v15`
  vì vậy thêm trang tĩnh `/dev-recover.html` độc lập React/Vinext. Hai lazy route
  `/exams` và `/review` tự chuyển qua trang này khi gặp đúng `SyntaxError`, dọn
  worker/cache rồi quay lại route ban đầu; có marker chống vòng lặp. Gate
  recovery gồm `node --check`, targeted ESLint/diff-check, `4 file/41 test`,
  typecheck không còn lỗi trong lát cắt; hai lỗi còn lại vẫn ở `DashboardPage`
  và `PathPage` ngoài module.
- Cửa A HSK1 và mọi cửa 12 câu cũ giữ nguyên blueprint/form/item version để
  resume hoặc nộp phiên dở. API attempt/submit nay chọn bank theo chính session
  ID thay vì ép phiên v1 qua definition mới; hai phiên local đang dở HSK1 A và
  HSK3 B được audit read-only, JSON đều hợp lệ và không bị reset/xóa.
- `Bước vào Cửa` mở thẳng runner, tự phát đề hoặc phục hồi phiên cũ; bỏ màn
  briefing trung gian. Runner dùng bố cục phiên thi: header cố định có đề/phần,
  đồng hồ và tiến độ; vùng câu hỏi giữa cuộn; dock lưu đáp án cố định ở đáy.
  Lỗi response không phải JSON được đổi thành hướng phục hồi tiếng Việt, không
  còn lộ `Invalid or unexpected token` cho người học.
- Catalog mới chỉ công bố form đủ câu nguồn không lặp: HSK1 A `40 câu/40 phút`,
  HSK2 A–B `60/55`, HSK3 A `80/90`, HSK4 A `100/105`; tổng `5 form/340 câu`
  từ kho `422` câu. Phân phần bám cấu trúc HSK hiện hành: HSK1–2 Nghe/Đọc,
  HSK3–4 Nghe/Đọc/Viết. Các cửa mini còn lại chỉ nằm trong compatibility bank,
  không bị xóa và không còn được quảng bá như đề chuẩn.
- Giới hạn form answer-free được nâng có chặn từ 40 lên 100 để chứa HSK4. Câu
  nghe vẫn dùng browser TTS practice-only và không tạo mastery; phần Viết HSK3–4
  hiện mô phỏng cấu trúc bằng câu objective nguyên bản của kho, chưa giả nhận là
  constructed-response hoặc đề/chứng chỉ chính thức.
- Gate module: alternate-bank build/check `186/186` xanh; targeted ESLint và
  `git diff --check` xanh; `7 test file/23 test` gồm protocol 100 câu, bank,
  answer boundary, route, retry và legacy v1 resume xanh. Browser thật
  `1280×720` xác nhận catalog không cuộn/tràn, CTA trong viewport và touch target
  nhỏ nhất `50px`. `npm run check` đi hết precheck inventory `213/213` rich rồi
  dừng ở đúng hai lỗi TypeScript có sẵn ngoài module tại `DashboardPage.tsx` và
  `PathPage.tsx`; không mở rộng lát cắt sang hai module đó.
- Trạng thái `IN-REVIEW`; chờ chủ dự án thử Cửa A HSK1 cũ, sau đó mở một đề mới
  ở HSK1–4 trước khi chuyển `USER-ACCEPTED`.

### Phòng Luyện Đề — kho cửa dungeon đang chờ người dùng duyệt — 21/08/2026

- Người dùng đã xác nhận ưng phong cách dungeon hiện tại; lát cắt này giữ nguyên
  ngôn ngữ thiết kế và mở rộng phần nội dung/chọn cửa, chưa đổi module sang
  `USER-ACCEPTED` vì kho đề mới vẫn cần người dùng làm thử.
- Audit tìm thấy `236` câu trắc nghiệm đang ở runtime và `186` câu form B đã soạn
  trong các assessment HSK2–4 nhưng chưa được chiếu sang Phòng Luyện Đề. Projection
  mới đưa tổng kho nguồn lên `422` câu, trong đó `396` câu được chia thành `33` cửa
  12 câu cân bằng Nghe/Đọc/Từ vựng/Ngữ pháp: HSK1 `3 cửa/36 câu`, HSK2 `10/120`,
  HSK3 `8/96`, HSK4 `12/144`.
- `26` câu còn lệch phân bố kỹ năng được giữ làm dự trữ; không lặp cùng câu qua
  nhiều cửa và không hoán vị đáp án để làm số lượng trông lớn hơn. Validator khóa
  uniqueness theo source item version, coverage `3 câu/kỹ năng/cửa`, bốn phương án
  khác nhau, đáp án hợp lệ, giải thích và lesson gợi ý tồn tại.
- Cửa A/B cũ giữ nguyên blueprint, form version, item order và storage key; cửa
  C–L chỉ thêm mới. Session đang dở, history, XP, outbox, localStorage/IndexedDB và
  D1 `.wrangler/` không bị migration hay xóa dữ liệu.
- Registry nguồn phân tách rõ: GF0025-2021, Chinese Test Service và HSK Mock dùng
  làm chuẩn cấu trúc/năng lực; Hanzii, SuperTest, PREP và Thanhmaihsk dùng làm
  benchmark workflow hướng tới người Việt. Không nhập câu hỏi hay audio bên ngoài;
  nguồn chưa rõ license chỉ được tham chiếu để tự biên soạn nội dung nguyên bản.
- Catalog hiển thị quy mô thật và số cửa theo tầng. HSK4 A–L cuộn trong vùng chọn
  riêng; header, nút vào cửa và điều hướng mobile luôn nằm trong viewport. Test
  browser thật `1365×640` và `360×640` xác nhận parent không tự cuộn, Cửa L mở đúng
  `/exams/hsk4/l`, touch target tối thiểu `48px`, ArrowLeft chuyển cửa đúng và không
  có console error; không mở session mới nên không sinh XP/attempt.
- Evidence: projection write/check/validate `186/186`, targeted Vitest `17/17`,
  typecheck và targeted ESLint xanh, API local trả `33/396/422`, `git diff --check`
  sạch. Production build biên dịch đủ route nhưng gate cuối vẫn fail tại ceiling
  `828,2 KiB`, vượt budget Phase 0 `28,2 KiB`; trước lát cắt này ceiling đã vượt
  `27,8 KiB`, nên đây vẫn là debt bundle toàn app cần xử lý riêng.

### Học — lý thuyết trước, Thử Luyện sau đang chờ người dùng duyệt — 17/08/2026

- Mỗi bài nay dùng cùng hợp đồng ba chặng **Hiểu nguyên tắc → Học từ sẽ gặp →
  Xem cách làm**. Chỉ một chặng xuất hiện tại một thời điểm; nút vào Thử Luyện
  chỉ mở sau khi người học đi hết ba chặng. Danh sách từ và dạng bài trong phần
  dạy được lấy trực tiếp từ lesson/form thật, không phải ví dụ trang trí tách rời.
- Riêng `boot-1` được rà lại theo đúng mục tiêu nhập môn thanh điệu: lý thuyết có
  năm đường cao độ trực quan, bốn từ thật `一 / 人 / 你 / 二`, âm mẫu từ/câu,
  Pinyin/nghĩa và ghi chú rõ `一 yī` đổi gần `yí` trong `一个人`. Phiên mới chỉ
  tạo 10 hoạt động đã được chuẩn bị: 4 nhận diện thanh, 4 Pinyin và 2 nghe từ;
  không còn hỏi viết chữ, nghĩa độc lập hoặc đọc câu trước khi dạy.
- Mở lại `Lý thuyết` giữa một câu chưa chấm sẽ đánh dấu câu đó là **có trợ giúp**;
  kết quả vẫn được lưu để học nhưng không được dùng như truy hồi độc lập. Guest
  và account dùng cùng panel và cùng quy tắc này.
- Catalog đầy đủ vẫn giữ các activity cũ để phiên đang học dở tiếp tục được;
  việc lọc chỉ áp dụng khi tạo form mới. Stable lesson/activity ID, completion,
  evidence, FSRS, mistake, owner/reset scope và inventory HSK không đổi.
- Evidence hiện tại: generator/coverage/normalized-runtime targeted `39/39`
  Vitest xanh; typecheck và targeted ESLint xanh; build xanh với ceiling
  `796,3 KiB` dưới gate `800 KiB`. Browser smoke người mới ở `1365×640` và
  `360×640` không có page scroll, CTA cố định và touch target ≥44 px; E2E
  resume chính xác `1/1` và action dock desktop/mobile `1/1` xanh.
- Module chỉ chuyển `USER-ACCEPTED` sau khi chủ dự án tự học lại `boot-1` và xác
  nhận phần dạy đủ rõ trước phần tự làm.

### Tiến độ và Thất Trụ đang chờ người dùng duyệt — 11/08/2026

- Dashboard và trang phân tích mặc định chỉ hiện tên bảy trụ cùng thanh đo. Số
  lượng cụ thể và vòng tổng hợp nằm trong nút `Chi tiết` căn giữa, đóng mặc định
  và dùng được bằng bàn phím/mobile. Công thức kỹ thuật không xuất hiện trong UI.
- Tín hiệu Căn Cơ dùng policy `wilson-confidence-v1`: chỉ nhận activity objective
  đúng skill/version, đã xác minh và không dùng gợi ý; cần ít nhất 6 activity
  khác nhau, từ ít nhất hai phiên trải qua 24 giờ. Điểm là cận dưới Wilson 95%
  có hệ số độ tin cậy mẫu tới 24 activity, nên mẫu nhỏ không thể đẩy thanh lên
  nhanh. Cùng activity chỉ chiếm một mẫu; kết quả độc lập gần nhất có thể kéo
  tín hiệu lên hoặc xuống, không suy chéo sang kỹ năng khác.
- Phiên bài học mới được phân bổ cân bằng: mỗi kỹ năng mà bài thực sự hỗ trợ có
  ít nhất một hoạt động trước khi lấp đủ 10 câu. Catalog, ID, version, phiên dở
  dang và denominator không đổi.
- Trụ Nói hiển thị bình thường như sáu trụ còn lại nhưng vẫn chưa tạo phép đo năng lực;
  không dùng TTS hoặc transcript để tạo số giả. Rich content hiện có chưa được dùng để tăng
  denominator vì còn
  `humanReviewed:false`/`measurementEligible:false`; cần một lô content review
  riêng trước khi phát hành thêm hoạt động đo được.
- Projection tài khoản V4 chưa mang outcome/session/time đủ cho tín hiệu thống
  kê, nên giao diện account dùng trạng thái `Đang hợp nhất chiến tích`, không
  biến dữ liệu cũ thành 0% và không diễn giải sai aggregate cũ. Projection mới
  là lát cắt server riêng.
- Evidence hiện tại: signal policy + generator targeted `19/19` Vitest xanh;
  generator/resume/local và normalized runtime/server repository `270` test xanh; E2E disclosure,
  keyboard và mobile `360×640` `2/2` xanh; typecheck, targeted ESLint và build
  xanh; bundle ceiling `789,3 KiB` dưới gate `800 KiB`. Inventory
  learner-visible không đổi.

### Học — Thiên Lộ và bài “Bốn thanh điệu” đang chờ người dùng duyệt — 31/08/2026

- **Module:** Học — kho Thiên Lộ và luồng học trong bài.
- **Trạng thái:** `IN-REVIEW`; chưa ghi `USER-ACCEPTED` trước khi chủ dự án tự
  học lại và xác nhận.
- **Người học thấy gì:** Thiên Lộ luôn hiện đủ 217 bài theo đúng năm chặng
  `4/40/40/55/78`; bài tương lai vẫn cho xem tên, mục tiêu và thời lượng nhưng
  bị khóa theo authority runtime. Bài `boot-1` được tổ chức lại thành bốn bước
  `Hiểu một ý → Từ cần dùng → Thấy trong câu → Tự làm thử`; phần thanh điệu có
  công thức âm tiết, thang cao độ 1–5, bốn đường giọng 55/35/214/51, cử chỉ,
  ví dụ `妈/麻/马/骂`, quy trình nghe ba bước, thanh nhẹ và câu kiểm tra bắt
  buộc chọn đúng Thanh 4 trước khi đi tiếp. Phiên bài học không còn bị lời mời
  Khảo Nghiệm Căn Cơ che phủ.
- **Đã kiểm:** targeted Vitest 6 file/24 test, typecheck, targeted ESLint và
  production build đều xanh; conservative client asset ceiling `1023,8 KiB`.
  Browser thật xác nhận desktop có 217 card/216 card khóa và không tràn ngang;
  mobile `390×844` vẫn có đủ bốn tone card, bốn đáp án kiểm tra, CTA 44 px,
  không overlay và không tràn ngang. Câu sai/đúng của kiểm tra khái niệm đã được
  smoke để xác nhận gate; feedback câu luyện thanh điệu dùng dấu hiệu truy hồi
  cụ thể thay cho thông báo chung chung.
- **Gate còn đỏ ngoài lát cắt:** `npm run check` dừng vì
  `content/review/hsk1-time-place-events-local-study-review.json` đã stale từ
  worktree nội dung đang dở. Full Vitest hiện có 253 file/2.054 test xanh và 78
  file/234 test đỏ, chủ yếu là chuỗi provenance/generated content HSK1–4 stale
  có sẵn; guide ký digest đã được giữ nguyên và targeted suite của lát cắt này
  xanh. Không tái sinh hay ghi đè các draft/review thuộc phiên khác.
- **Dữ liệu giữ được:** stable lesson/activity ID, unlock authority, completion,
  phiên dở, FSRS, mistake và inventory rich HSK1–4 `213/213` không bị đổi;
  `.wrangler/` không bị xóa. Browser smoke đã mở phiên `boot-1` local tới câu
  `2/10` nhưng không hoàn tất bài hoặc mở khóa bài kế tiếp.
- **Tiếp theo:** chủ dự án test `/path`, xem kho khóa và học lại `boot-1`; chỉ
  sau xác nhận mới chuyển module này sang `USER-ACCEPTED`.

### Học — Ấn Phổ Thiên Lộ và neo bài đang học — 01/09/2026

- **Module:** Học — lộ trình và bài học.
- **Trạng thái:** `IN-REVIEW`; người dùng đã xác nhận hướng mỹ thuật đẹp nhưng
  banner/điểm neo mới vẫn chờ test cuối trước khi ghi `USER-ACCEPTED`.
- **Người học thấy gì:** `/path` dùng hệ hình `Linh Thú Ấn Phổ` nguyên bản:
  Mục HSK là đại ấn lớn, chương là cảnh giới nhỏ hơn và từng bài là bí quyển
  gọn. Banner đầu trang đã đổi sang mẫu G `Thiên Thư Khai Quyển`: cuộn thiên thư
  dùng crop cao phân giải `1460×363` từ đúng mockup G, giữ tỉ lệ `588:146`, sơn
  thủy, năm ấn HSK0–HSK4, lệnh bài và pháp trận đúng ảnh chốt ở cả dark/light;
  crop mới bỏ đường chỉ thừa bên trái và giữ đủ mép trục cuộn bên phải.
  Tên bài `ĐANG TU LUYỆN` và tỷ số `bài đã thông qua` không bị đóng cứng trong
  ảnh: hai lớp HTML `aria-live` che chữ mẫu và lấy trực tiếp `currentLesson`,
  `completedCount` và tổng catalog. Nền hai lớp dữ liệu dùng lõi che kín chữ mẫu,
  feather theo sắc ngọc của ảnh nên không còn mảng vá vuông hoặc bóng chữ cũ;
  vòng tiến độ được căn theo tâm pháp trận và nhãn hai dòng tăng cỡ chữ. Mục HSK
  và các card bài đã chốt không đổi;
  chỉ số chương hiển thị La Mã, còn số bài vẫn giữ dạng `01`, `02`, `03`. Mỗi
  lần đi từ module khác vào Thiên Lộ, node bài hiện tại có
  `aria-current="step"` và tự được đưa vào vùng nhìn thấy nếu đang nằm ngoài
  viewport; không cuộn lại khi node vốn đã hiện, và dùng cuộn tức thời khi người
  học bật giảm chuyển động.
- **Đã kiểm:** typecheck, targeted ESLint và Vitest lộ trình/hành trình `3 file / 25 test`
  xanh; `git diff --check` sạch. Browser thật xác nhận dark/light desktop
  `1366×643` và mobile `390×844`: không tràn ngang, artwork giữ đúng tỉ lệ,
  DOM hiển thị đúng `ĐANG TU LUYỆN · Bốn thanh điệu` và `0/217 · bài đã thông
  qua`; ảnh desktop xác nhận hai trục cuộn không bị cắt, không còn đường viền
  trái, lớp dữ liệu không lộ mép và nội dung nằm giữa pháp trận. Node hiện tại
  nằm trong viewport, reduced-motion tắt animation và
  inventory DOM đủ `5` Mục HSK / `16` chương / `217` bài.
- **Gate còn đỏ ngoài lát cắt:** production build biên dịch xong nhưng bundle
  gate toàn repo báo `1026,3 KiB`, vượt trần `1024 KiB` đúng `2,3 KiB`; không nới
  trần để che lỗi. `npm run check` vẫn còn blocker review HSK1 stale đã ghi ở
  checkpoint trước và không bị tái sinh trong lát cắt giao diện này.
- **Dữ liệu giữ được:** không đổi stable lesson ID, unlock authority, completion,
  session dở, FSRS, mistakes, localStorage/IndexedDB hoặc `.wrangler/`; inventory
  learner-visible vẫn là `4/40/40/55/78`, tổng `217`.
- **Tiếp theo:** chủ dự án mở lại `/path`, kiểm banner và hành vi neo đúng bài
  đang học; chỉ sau xác nhận mới đổi module này sang `USER-ACCEPTED`.

### Nghịch Cảnh Lục — Thiên Văn Đài bị từ chối khi review — 05/09/2026

- **Module:** Nghịch Cảnh Lục / REM. **Trạng thái:** `BLOCKED`; chủ dự án đã từ
  chối bản giao diện vì độ tương đồng thấp và có ảnh Cốc Cốc chỉ còn lớp nền hệ
  thống, không có shell hoặc nội dung `/mistakes`.
- **Người học thấy gì:** tại vùng nội dung Cốc Cốc khoảng `1321×643`, giao diện
  không đạt bộ ảnh chuẩn `1672×940`. Vòng tái hiện độc lập ở cùng viewport có
  render shell và DOM sống, nhưng rơi về layout desktop cơ sở, rail mở rộng
  `258 px`, command bar `70 px` và nội dung bị ép/cắt; đây vẫn là kết quả không
  chấp nhận được.
- **Đã kiểm:** precision pass hiện chỉ kích hoạt với
  `(min-width: 1281px) and (min-height: 760px)`, nên không chạy trong viewport
  Cốc Cốc ở ảnh lỗi. Kết nối điều khiển trực tiếp cửa sổ Cốc Cốc timeout hai lần;
  không có bằng chứng để tuyên bố lỗi nền-trống riêng của Cốc Cốc đã được sửa.
  Tuyên bố đối chiếu thành công trước đó bị rút lại.
- **Dữ liệu giữ được:** không thay đổi D1, localStorage/IndexedDB, `.wrangler/`,
  stable lesson/vocabulary/character ID, completion, streak, saved item, FSRS,
  mistakes, owner/reset scope, phiên dở hoặc outbox trong vòng chẩn đoán này.
  Inventory vẫn là HSK0 `4/4`, HSK1 `40/40`, HSK2 `40/40`, HSK3 `55/55`, HSK4
  `78/78` và HSK1–4 `213/213` rich.
- **Tiếp theo:** dừng triển khai theo yêu cầu của chủ dự án. Không gọi lại module
  này là pixel-perfect hoặc `USER-ACCEPTED`. Chỉ mở lại khi tiêu chí được đổi
  thành một viewport/dataset chuẩn có sai số đo được, vì pixel tuyệt đối trên dữ
  liệu động và nhiều tỉ lệ màn hình chỉ đạt được bằng ảnh tĩnh, trái yêu cầu sản
  phẩm.

### Nghịch Cảnh Lục — Thiên Văn Đài mở lại để người dùng duyệt — 05/09/2026

- **Module:** Nghịch Cảnh Lục / toàn bộ REM-01 đến REM-04.
- **Trạng thái:** `IN-REVIEW`; checkpoint này thay cho kết luận `BLOCKED` ở
  lần review trước, nhưng chưa ghi `USER-ACCEPTED` trước khi chủ dự án test.
- **Người học thấy gì:** REM-01 là bản đồ sao động với vùng kỹ năng, mức cảnh
  báo lấy từ số lần sai, danh sách ưu tiên, nguồn và dấu vết bảy ngày; nhãn thứ
  tự sinh theo ngày thật thay vì đóng cứng theo mockup. REM-02 `Tái đấu`, REM-03
  `Giải lỗi` và REM-04 `Hóa giải` dùng cùng sân Thiên Văn Đài; câu hỏi, đáp án,
  gợi ý, kết quả, giải thích, tiến độ và tổng kết đều là DOM sống. Dùng gợi ý
  được ghi nhận và không được nâng thành mastery. Rail thu gọn theo mockup ở
  desktop; laptop thấp có bố cục riêng; mobile giữ header/hành động trong
  viewport và chỉ cuộn nội dung giữa.
- **Đã kiểm:** typecheck và targeted ESLint xanh; Vitest REM + bundle boundary
  `2 file / 8 test` xanh; `git diff --check` không có whitespace error. Browser
  chạy thật bằng tài khoản `learner.demo` qua đủ bốn pha tại `1674×942`,
  `1365×643` và `390×844`; mọi POST `/api/learning/attempts` trả `201`. Ở canvas
  chuẩn, rail/header/content đo đúng `103/85/857 px`, card Giải lỗi
  `1040×450`, card Hóa giải `1040×340`, dải trạng thái `117 px`; ở laptop rail
  `86 px`, header `70 px`, content `573 px`, không còn chồng CTA. `npm run check`
  dừng ngoài lát cắt tại
  `content/review/hsk1-daily-life-local-study-review.json is stale`.
- **Dữ liệu giữ được:** D1 local có fixture review tách biệt gồm `18` attempt,
  `5` signal và `18` evidence verified; toàn bộ evidence fixture giữ
  `mastery_eligible=0`. Lượt browser cập nhật qua repository/server thật, không
  dùng số mock trong UI. Không xóa `.wrangler/`, localStorage/IndexedDB, stable
  ID, completion, streak, saved item, FSRS, mistake, owner/reset scope, phiên dở
  hoặc outbox; inventory vẫn là HSK0 `4/4`, HSK1 `40/40`, HSK2 `40/40`, HSK3
  `55/55`, HSK4 `78/78` và HSK1–4 rich `213/213`.
- **Tiếp theo:** chủ dự án test `/mistakes` trên server local đang bật; chỉ sau
  xác nhận mới đổi module này sang `USER-ACCEPTED` và chuyển sang module kế.

## 3. Inventory learner-visible cần bảo toàn

| Cấp | Bài learner-visible | Rich |
|---|---:|---:|
| HSK0 | 4/4 | 0/4 |
| HSK1 | 40/40 | 40/40 |
| HSK2 | 40/40 | 40/40 |
| HSK3 | 55/55 | 55/55 |
| HSK4 | 78/78 | 78/78 |
| HSK1–4 | 213/213 | 213/213 |

Runtime package hiện hành là `foundation-2026.08.7`. Các package lịch sử vẫn là
lineage/fixture/rollback nên không được xóa chỉ vì trùng dữ liệu. `content/` và
`public/` đã được audit: chưa có tracked artifact nào đủ bằng chứng để xóa an
toàn trong lượt cleanup này.

Các con số 2.016 vocabulary ID cốt lõi, 11.093 mục từ tra cứu tổng hợp, 1.096
character-in-context và 332 grammar source row là inventory kỹ thuật/nguồn;
không tự chứng minh mastery hay độ phủ sư phạm. `390` ải/chuyên đề nâng cao nằm
ngoài `217` bài cốt lõi; `1.459` mục HSK1–4 mở rộng đã được phân bổ vào `213`
bài rich nhưng vẫn giữ trạng thái tham chiếu, không tự tạo mastery hoặc XP.

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

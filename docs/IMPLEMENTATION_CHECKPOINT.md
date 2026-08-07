# HANZI.OS — checkpoint triển khai hiện tại

Cập nhật: 07/08/2026

## 1. Tình trạng một câu

M1-M4 của phạm vi mở rộng đã hoàn tất danh tính đa phương thức, vòng đời phiên,
kiểm soát vận hành, Content Studio local và Mock Exam HSK1-4:
người học tiếp tục dùng guest/local hoặc đăng nhập bằng Google, mã email một lần
và passkey; Sign in with ChatGPT được giữ làm nhà cung cấp tương thích. Một
`users.id` nội bộ có thể mang nhiều danh tính chỉ sau xác minh tường minh, không
tự gộp chỉ vì email giống nhau. D1/SQLite lưu hash phiên/challenge, phiên có thể
được xem và thu hồi trên UI; bearer token không đi vào localStorage. Vai trò
ba vai trò `learner`/`content_editor`/`admin` có quyền máy chủ tách biệt; Cổng
Quản Trị quản lý role, khóa tài khoản, phiên, cấu hình allowlist và audit
append-only. Thao tác nhạy cảm bắt buộc step-up first-party mới xác minh; trigger
D1 bảo vệ admin cuối cùng. Content Studio giao đủ workflow
`draft → validated → submitted → approved → published → archived`, revision,
validation năm pass, preview, diff và lịch sử. Quản Khố tạo/sửa/validate/submit;
Điều Hành duyệt/phát hành; learner chỉ đọc projection đã published. Bản đã phát
hành là bất biến và phải fork revision mới để sửa. `/exams` hiện giao hai form
A/B có version cho từng level HSK1-4, chấm điểm và giới hạn thời gian phía máy
chủ, resume, lịch sử, breakdown bốn kỹ năng và gợi ý bài học thật. Đây là Mock
Exam riêng, không lấy bốn Level Check hiện có để đếm thay. B8.1 vẫn giữ nguyên
bộ bốn nhân cách xướng lệnh local trong Bảng Thuộc Tính:
Mechanical Core, Thiên cơ, Chấp hành và Dẫn lộ đều có 16 xướng lệnh riêng, tổng
64 clip synthetic. Các lệnh hệ thống chính không còn phụ thuộc giọng Việt của
Windows; browser TTS chỉ còn là dự phòng cho câu động. Cơ Linh dùng carrier từ
voice ElevenLabs người dùng đã chọn; ba nhân cách còn lại là VieNeu local
fallback v2 có khoảng nghỉ rõ, không được trình bày như voice ElevenLabs tương
ứng. Toàn bộ 213 blueprint
HSK1-4 vẫn học được trên rich UI, bốn Level Check và tám form Mock Exam đều mở
được theo đúng ranh giới xác thực. Sites và production vẫn đóng.

## 2. Dashboard tiến độ bắt buộc

- **Sẵn sàng toàn dự án:** 96/100 (96%).
- **Sẵn sàng phạm vi mở rộng M1-M5:** 94/100 (M1-M4 hoàn thành).
- **Đếm phạm vi mở rộng:** login 4/4; roles 3/3; Content Studio workflow 6/6;
  Mock Exam 4/4 level và 8/8 form; Content Release Worker 0/1.
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

## 4. B4-B9 đã giao cho người học

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

### B7 — Bảng Hệ Thống hologram sống

- Thanh lệnh ở mọi điện có nút **Triệu hồi** và phím tắt `Alt + S`. Bảng mở như
  một không gian hologram toàn màn hình: thẻ thân phận ở lớp nổi trung tâm, hai
  bảng nhiệm vụ/chỉ số xoay ở hai mặt phẳng, phía sau có vòng quỹ đạo, tia chiếu
  và scanline. Pointer điều khiển tilt/translate theo chiều sâu; không dùng
  Three.js hoặc dependency mới.
- Bảng không diễn dữ liệu mẫu: nó đọc tên, Chức hệ, Cảnh giới hoạt động, danh
  hiệu hành trình, XP tương tác, streak, bài đã thông qua, ký ức FSRS đến hạn,
  Nghịch Cảnh còn mở, Thử Luyện kế tiếp và bảy tín hiệu kỹ năng từ store hiện
  hành. XP/chỉ số vẫn có disclosure không phải mastery hay chứng nhận HSK.
- Mobile đưa thẻ thân phận lên trước rồi xếp hai bảng còn lại trong luồng cuộn;
  keyboard có focus trap, `Escape` thu hồi và trả focus về nút triệu hồi. Chế độ
  Giảm chuyển động làm phẳng 3D và tắt scanline/chuyển động lặp lại.
- Web Audio tạo cue ngắn cho triệu hồi, thu hồi, chọn, điều hướng, xác nhận,
  cảnh báo và thăng cấp ngay trong trình duyệt. Không tải audio asset và không
  autoplay trước thao tác người dùng. Bảng Thuộc Tính cho bật/tắt, chỉnh âm
  lượng, thử liên kết và mở giọng Việt browser TTS theo yêu cầu rõ ràng.
- Browser TTS vẫn là synthetic practice, `humanReviewed: false`; âm thanh và
  hiệu ứng không được dùng làm evidence hay thay đổi prerequisite/persistence.

### B8 — Living Hologram, Voice Reactor và System Announcer

- Hologram dùng bộ token sáng/chiều sâu thống nhất và tương phản cao hơn cho
  Bảng Hệ Thống, thẻ nhiệm vụ, kết quả bài học, Ký Ức Trận, Nghịch Cảnh Lục và
  Đại Khảo. Desktop giữ các lớp 3D/scan/quỹ đạo; mobile xếp luồng rõ; reduced
  motion tắt chuyển động lặp nhưng không làm mất thông tin hay thao tác.
- Một Audio Engine dùng duy nhất một Web Audio graph, master/effects gain và
  compressor; catalog có 36 cue cho thức tỉnh, online, triệu hồi, nhiệm vụ,
  đúng/sai, hoàn tất bài, mở khóa, ôn tập, hóa giải lỗi, Đại Khảo, đạt ngưỡng,
  thăng cấp và vòng đời phát/thu giọng. Cue được cooldown/dedupe và giảm nền khi
  TTS đang nói, tự nghỉ khi nhàn và chặn cue không thiết yếu lúc microphone mở;
  Đại Khảo bỏ âm click trùng nhưng vẫn giữ cue đúng/sai/hoàn tất.
- System Announcer chỉ hoạt động sau khi người học bật rõ ràng. Bảng Thuộc Tính
  cho chỉnh master/effects/voice volume, ba phổ âm, ba nhân cách xướng lệnh,
  mức thông báo và giọng Việt có sẵn trên thiết bị. Không có giọng Việt thì báo
  thiếu thay vì tự rơi sang giọng Anh; khởi động đầu tiên có lời chào thức tỉnh.
- Voice Reactor dùng chung cho browser TTS và Vạn Âm Điện: hiện chuẩn bị, đang
  phát, kết thúc, hủy/lỗi; luồng nhận dạng hiện armed, listening, processing,
  result, denied hoặc unavailable. Quyền microphone vẫn cần consent hiện hữu;
  transcript/độ khớp chỉ là quan sát chưa xác minh, không phải speaking mastery.
- Signal bus nối âm thanh/xướng lệnh vào nhiệm vụ, lesson local và authenticated,
  review, mistake remediation, mở khóa, thăng cảnh giới và cả bốn level check.
  Prerequisite, persistence, FSRS, evidence version và chính sách mastery không
  đổi; không thêm dependency runtime hay production workflow.

### B8.1 — Bộ bốn nhân cách xướng lệnh local

- Mỗi nhân cách có 16 xướng lệnh cho khởi động, kích hoạt nhiệm vụ, hoàn tất bài,
  mở Thiên Lộ, dọn hàng đợi ôn tập, hóa giải lỗi, bắt đầu/hoàn tất Đại Khảo, đạt
  ngưỡng, thăng chức, mất/khôi phục liên kết, cảnh báo, xem thử và tóm tắt trạng
  thái. Tổng 64 clip phát trực tiếp qua Audio Engine và làm Voice Reactor chuyển
  `preparing → playing → idle`.
- Dropdown **Nhân cách xướng lệnh** có đủ bốn lựa chọn: **Cơ Linh · Mechanical
  Core**, Thiên cơ, Chấp hành và Dẫn lộ. Nút **Nghe thử giọng đang chọn** phát
  đúng engine của lựa chọn hiện tại; thẻ nhận dạng cũng đổi theo lựa chọn.
- Cả bốn nhân cách đều phát được khi Windows không có giọng Việt. Browser TTS
  chỉ còn là dự phòng cho câu động không có clip định trước.
- Mechanical Core dùng carrier tạo trong tài khoản ElevenLabs của người dùng,
  clone local bằng VieNeu-TTS rồi xử lý robotic. Thiên cơ, Chấp hành và Dẫn lộ
  hiện dùng ba giọng VieNeu-TTS v3 fallback riêng với xử lý âm phù hợp từng nhân
  cách; chúng không phải ba voice ElevenLabs tương ứng. Bản v2 tổng hợp từng
  mệnh đề riêng và chèn khoảng nghỉ 0,34–0,68 giây để không đọc dính câu. Nguồn
  VieNeu/pnnbao-ump áp dụng CC BY-NC 4.0. Phạm vi là demo/tự học local,
  synthetic, `humanReviewed: false`; không phải native audio, review phát âm,
  mastery hay chứng nhận HSK.
- Không thay package nội dung, prerequisite, progress, persistence, FSRS hay
  evidence. Không mở Sites, production, commerce, CMS hoặc human-review workflow.

### B9 — Đăng nhập và phân quyền ứng dụng

- Dữ liệu học ẩn danh vẫn local-first: `localStorage` giữ projection học;
  `IndexedDB` giữ checkpoint/outbox. Tài khoản, đồng bộ và RBAC phía máy chủ dùng
  Cloudflare D1 theo SQLite dialect qua Drizzle; không thêm kho dữ liệu thứ ba.
- Sign in with ChatGPT tiếp tục cung cấp email/tên qua header tin cậy phía máy
  chủ. HANZI.OS không nhận hoặc lưu mật khẩu; API không tin `userId` do client
  gửi lên.
- Migration `0014_gigantic_diamondback.sql` thêm `user_roles`. Mọi tài khoản có
  baseline `learner`; email trong biến máy chủ `HANZI_OS_ADMIN_EMAILS` được
  bootstrap `admin`. Quản trị viên có thể cấp/thu admin cho tài khoản khác;
  không thể tự thu quyền đang dùng.
- `/admin` là trang server-rendered, dùng được không cần JavaScript và không làm
  tăng bundle học. JSON API và form mutation đều kiểm tra xác thực, quyền phía
  máy chủ, origin, kích thước/kiểu body và trạng thái đích. Cổng chỉ hiển thị
  email, trạng thái, vai trò; không đọc dữ liệu học tenant khác.
- Account export schema tăng lên v6 để gồm role của chính tài khoản; xóa tài
  khoản dọn cả role graph. Các tài khoản cũ tự nhận baseline khi đăng nhập sau
  migration.
- Không thay package nội dung, prerequisite, progress, persistence, FSRS,
  Reader, Review hay evidence. Không mở Sites, production, commerce, CMS hoặc
  human-review workflow.

### M1 — Danh tính đa phương thức và vòng đời tài khoản

- Guest/local tiếp tục học đầy đủ; đăng nhập first-party có Google Authorization
  Code + PKCE, `state`/`nonce` và callback URI khớp tuyệt đối; email dùng mã một
  lần hết hạn 10 phút; passkey yêu cầu user verification và RP/origin chính xác.
- `users.id` tiếp tục là khóa nội bộ ổn định. `auth_identities` nhận nhiều provider
  nhưng không truy email để auto-link. Link/unlink cần phiên hiện tại mới xác
  minh và ceremony của chính provider; không thể gỡ danh tính cuối cùng.
- Cookie phiên dùng tiền tố `__Host-`, `HttpOnly`, `Secure`, `SameSite=Lax` và D1
  chỉ lưu SHA-256 digest. UI `/account/security` liệt kê phương thức, thiết bị và
  cho thu hồi phiên; `/signin` tách rõ Google, email, passkey, ChatGPT và học ẩn
  danh.
- Tiến độ guest được đưa vào cùng `local-import`/idempotency của sync hiện có sau
  đăng nhập; không thêm kho dữ liệu, không thay learning evidence hoặc suy XP
  thành mastery.
- Login đạt 4/4 (guest/local, Google, email OTP, passkey); vai trò giữ 2/3;
  workflow 0/6; Mock Exam 0/4 level và 0/8 form; worker 0/1.
- Targeted identity/session/duplicate-email/CSRF/cookie/passkey/OAuth/sync/export,
  migration 16 file/30 bảng, typecheck, lint và build xanh. UI smoke desktop và
  mobile 390 px không tràn ngang, không có lỗi console. Hero 1693 px được nén
  lại sau so sánh trực quan để client ceiling giữ **798,7/800 KiB**.
- Không mở Sites, production, commerce, classroom/B2B, multi-tenant hoặc
  microservices. Hai báo cáo Word trong `docs/reports/` giữ nguyên ngoài commit.

### M2 — Role, config và audit

- Ba vai trò đã hoạt động đúng tên và đúng quyền: Hành Giả chỉ học/tự quản lý;
  Quản Khố Nội Dung có nền quyền draft/validate/submit nhưng chưa có Studio ở
  M2; Điều Hành Hệ Thống có control plane riêng và không đọc tiến độ học riêng.
- Role change, khóa/mở tài khoản, revoke phiên và ghi cấu hình đều kiểm tra quyền
  phía server, origin chính xác và step-up bằng phiên Google/email/passkey trong
  10 phút. Phiên ChatGPT tương thích một mình không đủ cho mutation nhạy cảm.
- Revision trên user/setting chặn stale write. Ứng dụng chặn tự thu admin/tự khóa;
  trigger D1 chặn thu, khóa hoặc xóa quản trị viên hoạt động cuối cùng ngay cả
  khi có hai phiên thao tác đồng thời. Tài khoản locked không thể đăng nhập để tự
  đổi ngược về active và toàn bộ phiên của tài khoản bị thu hồi.
- `system_settings` chỉ nhận bốn key không bí mật: registration mode, preview
  flag dành cho M3, nhịp học mặc định và maintenance banner; OAuth secret,
  encryption key hay key lạ bị cả repository và CHECK constraint từ chối.
- `audit_events` nhận category auth/account/role/config/approval/publication;
  auth, role, account và config hiện đã ghi event. Trigger append-only chặn
  UPDATE/DELETE; approval/publication sẽ được M3 dùng khi workflow thật mở.
- UI `/admin` giao bốn vùng users/roles, sessions, config và audit; Content Studio
  không bị nhét vào Cổng Quản Trị. `/signin?returnTo=/admin&stepUp=1` giữ đúng
  return path và ẩn provider ChatGPT không đủ step-up.
- Migration rehearsal xanh **17 migration/32 bảng**, targeted permission,
  forbidden, last-admin, lock, audit immutability và concurrency xanh;
  typecheck/lint/build xanh, client ceiling **798,8/800 KiB**. Browser smoke xác
  nhận `/admin` fail-closed và luồng step-up render đúng, không lỗi tích hợp đã biết.
- Login giữ 4/4; roles đạt 3/3; workflow 0/6; Mock Exam 0/4 level, 0/8 form;
  worker 0/1. Phạm vi học tập cũ vẫn 96%, không cộng bài hoặc mastery.

### M3 — CMS-lite Content Studio

- `/studio` là workspace server-rendered riêng cho Quản Khố Nội Dung và Điều
  Hành Hệ Thống, gồm danh sách/lọc, editor JSON có mẫu khởi tạo, validation,
  preview, diff hai revision, approval queue và lịch sử workflow. Route không
  bị nhét vào Cổng Quản Trị và service worker không cache dữ liệu Studio.
- Năm loại item đã có chung vòng đời: vocabulary, character, grammar, lesson và
  exam item. Workflow đạt 6/6 trạng thái `draft`, `validated`, `submitted`,
  `approved`, `published`, `archived`; mỗi revision lưu canonical JSON, SHA-256,
  validation artifact/digest, người tạo và chuỗi event append-only.
- Validator yêu cầu trường tiếng Trung/Pinyin/nghĩa Việt theo ngữ cảnh, đáp án,
  distractor và giải thích thích hợp; AI self-review công bố đủ năm pass
  accuracy/level fit/pedagogy/answer integrity/originality và luôn giữ
  `humanReviewed: false`. Browser TTS tiếp tục chỉ là synthetic practice.
- Quyền máy chủ tách create/edit/validate/submit khỏi approve/publish. Origin,
  body bound, idempotency key và optimistic concurrency đều fail-closed; stale
  write và bước nhảy sai trạng thái bị từ chối.
- Revision đã published/archived được D1 trigger bảo vệ khỏi sửa/xóa. Chỉnh nội
  dung đã phát hành bắt buộc fork; phát hành revision thay thế tự archive bản cũ
  và ghi audit publication/approval. Chỉ có một revision published đang hoạt
  động cho mỗi stable item key.
- API learner `/api/content/runtime` chỉ trả projection đã published cùng
  manifest hash xác định; draft/validated/submitted/approved không bị expose,
  recommend hoặc count. Exam projection loại đáp án, answer index và giải thích.
  M3 chưa phát hành item Studio mới nên số bài learner-visible không đổi.
- Targeted repository/route/preview/authorization/service-worker đạt 31/31;
  Drizzle check, restore rehearsal **19 migration/35 bảng**, typecheck, lint và
  build xanh, client ceiling **798,9/800 KiB**. Browser smoke xác nhận `/studio`
  khóa đúng khi chưa đăng nhập, không tràn ngang; workflow
  editor→admin→learner được kiểm tra qua integration regression và preview dùng
  chính `LessonDepthPanel` hiện hành.
- Login giữ 4/4; roles 3/3; workflow đạt 6/6; Mock Exam 0/4 level, 0/8 form;
  worker 0/1. Readiness mở rộng đạt 89%, learning scope cũ vẫn 96%; HSK0 4/4,
  HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 và rich HSK1-4 213/213.

### M4 — HSK1-4 Mock Exam

- `/exams` giao một batch duy nhất gồm HSK1, HSK2, HSK3 và HSK4; mỗi level có
  form A/B có version, tổng **4/4 level và 8/8 form**. Mỗi form có 12 câu cân
  bằng nghe, đọc, từ vựng và ngữ pháp, tương ứng 96 vị trí câu hỏi từ các bank
  AI-reviewed hiện có; đây không phải 96 bài học mới và không làm tăng số bài
  learner-visible.
- Mock Exam tách khỏi Level Check cả route, form/session version và kết quả.
  Client chỉ nhận manifest không đáp án; bank có đáp án nằm server-only và có
  boundary test chặn import ngược vào bundle người học.
- Luồng thi tái sử dụng assessment session/exposure/attempt/skill result/scoring
  hiện hành. Máy chủ giữ deadline, chặn attempt đến muộn, cho nộp phần đã làm
  khi hết giờ và giữ idempotency cho mở phiên, từng câu và submit; duplicate
  submit trả đúng terminal receipt thay vì chấm hai lần.
- Người học có hướng dẫn, đồng hồ, resume đúng form/version, kết quả theo bốn kỹ
  năng, điểm yếu, review đáp án sau khi nộp và gợi ý tới lesson ID đang có thật.
  Lịch sử giữ form/item/content version đã thi nên bản form mới không viết lại
  kết quả cũ.
- Mock Exam không phát XP/mastery, không mở prerequisite và không tạo learning
  evidence. Phần nghe dùng browser TTS synthetic, `humanReviewed: false`; UI
  nói rõ đây không phải đề chính thức hay chứng nhận HSK.
- Content Studio thêm `exam_form` bên cạnh `exam_item`: Quản Khố có thể tạo,
  validate và submit draft form; Điều Hành mới approve/publish qua workflow 6/6
  đã có. M4 chưa thay runtime bằng bản Studio nên worker vẫn 0/1.
- Targeted bank/repository/route/timeout/resume/duplicate/version/leakage/
  recommendation/preview/service-worker đạt **41/41**; typecheck, lint và build
  xanh, client ceiling **796,4/800 KiB**. Browser smoke trên production harness
  xác nhận catalog đủ 8 form, không lộ đáp án, không tràn ngang và auth gate
  đúng cho cả HSK1-4 trên desktop/mobile.
- Không thêm migration: restore baseline giữ **19 migration/35 bảng**. Login
  giữ 4/4; roles 3/3; workflow 6/6; Mock Exam đạt 4/4 level và 8/8 form; worker
  0/1. Readiness mở rộng đạt 94%, readiness toàn dự án giữ 96%; HSK0 4/4,
  HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 và rich HSK1-4 213/213.

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

## 6. Trạng thái kiểm tra B4-B9

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
- B7 targeted unit cho migration tùy chọn hiệu ứng/âm thanh và cảnh giới xanh;
  typecheck, lint phần thay đổi và build đều xanh. Targeted E2E xác nhận Bảng
  Hệ Thống dùng tín hiệu thật, không tràn mobile, giữ focus, đóng bằng `Escape`
  và mở lại bằng `Alt + S`.
- Browser QA B7 đã kiểm desktop 3-panel, mobile stacked flow, Profile audio,
  bật/tắt âm và reduced-motion trực tiếp trên web local. Hero AVIF/WebP 1693px
  được nén lại sau so sánh trực quan; client ceiling còn **798,6 KiB**, dưới
  hard ceiling 800 KiB và không thêm dependency.
- Lighthouse B7 chạy ba cold-profile: median performance **95**,
  accessibility/best-practices/SEO đều **100**; LCP 1.975 ms, CLS 0 và TBT
  196 ms.
- B8 targeted validator/unit/typecheck/build xanh; browser QA trực tiếp xác nhận
  Bảng Hệ Thống, cấu hình Audio Engine v2 và hai Voice Reactor trên Vạn Âm Điện
  hiển thị đúng ở viewport mobile, không có lỗi console. Không kích hoạt quyền
  microphone trong QA tự động.
- Full boundary B8 chạy một lượt: toàn bộ content/package/catalog/graph/database
  restore/typecheck/lint xanh. Vitest đạt 1.844/1.847 trong lượt song song; ba
  mục còn lại đều timeout 10 giây do tranh tài nguyên, không có assertion sai,
  và targeted một worker xác nhận cả ba module xanh sau đó.
- Full E2E B8 chạy một lượt đạt 25/29 ngay. Ba Đại Khảo dài chạm timeout vì cue
  click chung bị lặp cùng cue đúng/sai; một onboarding chậm đồng bộ ngẫu nhiên.
  Sau khi bỏ cue trùng trong riêng phòng Đại Khảo, targeted rerun xác nhận HSK1
  50 câu, HSK2 60 câu, HSK3 54 câu và onboarding lịch sử đều xanh; HSK4 72 câu
  đã hoàn tất ngay trong full run.
- Build cuối giữ client ceiling **799,2 KiB** dưới hard ceiling 800 KiB. Lượt
  Lighthouse đầu đạt performance 92 vì speech subsystem khởi tạo lúc tải; sau
  khi trì hoãn inventory giọng và cue catalog đến tương tác đầu tiên, cold-profile
  cuối đạt median performance **97**, accessibility/best-practices/SEO **100**;
  LCP 2.115 ms, CLS 0 và TBT 148 ms.
- B8.1 targeted unit, typecheck, lint và build xanh; client ceiling **799,9 KiB**
  dưới hard ceiling 800 KiB. Targeted E2E xác nhận đủ 64 MP3 local, đúng
  `audio/mpeg`, và cả bốn lựa chọn phát được khi thiết bị không có giọng Việt.
  Browser QA trực tiếp trên Chrome đã nghe thử Mechanical Core, Thiên cơ, Chấp
  hành và Dẫn lộ: cả bốn đều đưa Voice Reactor vào `playing`, không hiện cảnh
  báo thiếu giọng Việt và không còn lỗi tích hợp audio local đã biết.
- Hiệu chỉnh cadence sau phản hồi người dùng giữ Cơ Linh ở pack gốc; ba fallback
  đổi sang URL v2 để bỏ cache file cũ. Preview Thiên Cơ/Chấp Hành/Dẫn Lộ lần lượt
  dài khoảng 6,1/6,4/5,6 giây với hai khoảng nghỉ đo được. ElevenLabs free tier
  chặn tạo mới theo IP dù tài khoản còn credit, nên chưa tuyên bố hai fallback
  Thiên Cơ và Chấp Hành là đúng voice đã lưu trong Voice Lab.
- B9 targeted RBAC/schema/session/sync/account-export checks, Drizzle check,
  typecheck và lint xanh. Build giao `/admin`, form fallback và hai admin API;
  client ceiling giữ **799,9/800 KiB**.
- Full check chạy đúng một lượt: toàn bộ content/package/graph và Drizzle check
  xanh, sau đó dừng tại rehearsal vì kỳ vọng cũ chỉ nhận 14 migration đến
  `0013`. Rehearsal đã được nâng cho 15 migration/27 bảng, seed và xác minh cả
  `learner`/`admin`; targeted rerun xanh. Không chạy lại toàn bộ cổng lần hai.
- Full E2E chạy đúng một lượt và xanh **30/30**: HSK0→HSK4, bốn level check,
  prerequisite, persistence, privacy quarantine, offline, mobile, keyboard,
  reduced-motion và bốn voice pack đều giữ đúng. Build trong E2E giữ client
  ceiling trong hard budget 800 KiB.
- M1 targeted identity/session/duplicate-email/CSRF/cookie/passkey/OAuth/sync,
  export, Drizzle check, restore rehearsal 16 migration/30 bảng, typecheck, lint
  và build xanh ở client ceiling 798,7/800 KiB. Snapshot provenance tạm chuyển
  khỏi `.vite` do Vinext sở hữu
  sang vùng Wrangler đã ignore để pha kết thúc seal được build local. Browser
  smoke xác nhận `/signin` ở desktop/mobile và
  `/account/security` fail-closed khi chưa đăng nhập. Full boundary gate được để
  đúng ranh giới sau M1-M5 theo yêu cầu mở rộng.
- M2 targeted role/permission/forbidden/step-up/last-admin/account-lock/session,
  setting allowlist/audit immutability/concurrency xanh; Drizzle check và restore
  rehearsal 17 migration/32 bảng xanh. Typecheck, lint, build xanh với client
  ceiling 798,8/800 KiB. Browser smoke xác nhận Cổng Quản Trị khóa khi chưa đăng
  nhập và đường xác minh lại giữ `/admin` qua Google/email/passkey.
- M3 targeted repository/route/preview/authorization/service-worker xanh 31/31;
  Drizzle check và restore rehearsal 19 migration/35 bảng xanh. Typecheck, lint
  và build giao đủ Studio/API ở client ceiling 798,9/800 KiB. Browser smoke xác
  nhận `/studio` khóa fail-closed khi chưa đăng nhập và desktop không tràn ngang.
  Không chạy full check/E2E tại M3; hai cổng này giữ đúng ranh giới sau M1-M5.
- M4 targeted bank/repository/route/assessment timeout/resume/duplicate submit/
  version invariance/leakage/recommendation/Studio preview/service-worker xanh
  41/41; typecheck, lint và build xanh ở client ceiling 796,4/800 KiB. Browser
  smoke production harness xác nhận `/exams` có đủ 8 form và cả bốn level khóa
  đúng ở auth gate trên desktop/mobile, không tràn ngang hay lỗi browser. Full
  check/E2E vẫn giữ đúng ranh giới sau M1-M5.

Không còn lỗi nội dung hoặc tích hợp thật đã biết trong phạm vi local.

## 7. Ranh giới và batch tiếp theo

- Workspace: `D:\Projects\hanzi-os`; branch: `codex/hsk4-graduation`.
- B1 commit `5ad93ae`; B3 commit `c295191`; B4 commit `13fa277`; package handoff
  hiện hành `foundation-2026.08.5`; B8.1 là batch giọng Cơ Linh hiện tại.
- Không commit staging, build output hoặc report thử.
- Không thay learning evidence, FSRS, Reader, Review, hosting hay Sites; M4 chỉ
  mở Mock Exam local đã được người dùng chủ động yêu cầu.

**Batch lớn tiếp theo là M5 — Content Release Worker.** M5 sẽ giao đúng một
worker idempotent đưa revision đã approved/published qua projection/runtime có
version, audit và rollback an toàn; không mở thêm hạ tầng hay CMS thương mại.
Sites, deployment production, commerce, CMS thương mại và human-review workflow
vẫn đóng.

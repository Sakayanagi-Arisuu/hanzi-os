# Benchmark ChineseSkill cho HANZI.OS Reforge

**Ngày khóa nghiên cứu:** 10/08/2026
**Mục đích:** học cấu trúc sản phẩm và phương pháp sư phạm để xây một triển khai
độc lập cho Mandarin HSK0–HSK4
**Không phải:** tài liệu sao chép nội dung/UI hoặc khẳng định đã kiểm thử mọi
tính năng trả phí trên thiết bị thật

## 1. Phương pháp và giới hạn bằng chứng

Nghiên cứu kết hợp trang sản phẩm/store, web course công khai, support, điều
khoản, release note, nghiên cứu lịch sử và review bên thứ ba. Mỗi capability
canonical ở mục 4 dùng đúng một nhãn quyết định:

- **`OBSERVED`:** đã thao tác hoặc đếm trực tiếp trên bề mặt web chính thức công
  khai; screenshot/listing marketing không đủ để nhận nhãn này;
- **`OFFICIAL_CLAIM`:** website, store, support hoặc nhà phát triển công bố,
  nhưng hành vi/chất lượng chưa được kiểm định độc lập;
- **`UNVERIFIED`:** thuật toán, độ chính xác, coverage hoặc hành vi cần thuê bao,
  tài khoản, thiết bị hay benchmark mà chưa có bằng chứng;
- **`OUT_OF_SCOPE`:** có thể tồn tại ở sản phẩm đối chiếu nhưng chủ động nằm
  ngoài Goal Mainland Mandarin HSK0–HSK4 local-first.

Media công khai chỉ chứng minh một bề mặt đã được trình bày, không chứng minh
runtime, scoring hay coverage. Nguồn secondary/lịch sử chỉ sinh giả thuyết và
câu hỏi kiểm thử; chúng không nâng claim 2026 thành `OBSERVED`.

Không cài ứng dụng, mua thuê bao hay đăng nhập tài khoản ChineseSkill trong lượt
nghiên cứu này. Vì vậy tài liệu không gọi nội dung premium hoặc scoring nội bộ
là “đã xác minh”.

## 2. Sổ nguồn

| Mã nguồn | Nguồn | Loại bằng chứng | Trạng thái/ngày truy cập | Dùng để xác nhận và giới hạn |
| --- | --- | --- | --- | --- |
| `CS-HOME` | [Trang chủ ChineseSkill](https://www.chineseskill.com/home) | Official site claim | Mở trực tiếp 10/08/2026 | Claim zero→HSK4, bài 15 phút, kỹ năng, hoạt động, class note và đa thiết bị; không chứng minh chất lượng/catalog |
| `CS-WEB` | [Web course công khai](https://www.chineseskill.com/learn-chinese/cn/en) | Direct public observation | Không đăng nhập, đếm trực tiếp 10/08/2026 | 75 topic node, 11 TestOut và Finish trên public map; không suy catalog/thuật toán mobile 2026 |
| `CS-PRICE` | [Bảng giá chính thức](https://www.chineseskill.com/learnchinese/pricing) | Official site claim | Mở trực tiếp 10/08/2026 | Giá và danh sách Main/SRS/Pinyin/Tone/AI/Booster; entitlement Premium/Premium+ theo vùng/nền tảng vẫn chưa xác minh |
| `CS-SUPPORT` | [Support](https://support.chineseskill.com/en/support/solutions), [TestOut](https://support.chineseskill.com/en/support/solutions/articles/70000154975-what-is-testout-) và [login](https://support.chineseskill.com/en/support/solutions/articles/70000154972-how-can-i-check-my-login-method-) | Official support claim, historical | Hai bài chi tiết ghi modified 25/04/2021; truy cập 10/08/2026 | Ý nghĩa TestOut/login lúc tài liệu được viết; không mặc định là hành vi app hiện hành |
| `CS-GPLAY` | [Google Play](https://play.google.com/store/apps/details?hl=en-US&id=com.chineseskill) | Official-store claim | Truy cập 10/08/2026; listing hiển thị updated 07/08/2026 | Ba course, Main/Review/AI/Booster, script, media, SRS, speech, offline, league; không kiểm định chất lượng |
| `CS-APPSTORE` | [Apple App Store](https://apps.apple.com/us/app/chineseskill-learn-chinese/id777111034) | Official-store claim | Truy cập 10/08/2026; version 9.6.5 hiển thị “Jul 25” không kèm năm | Bite-size, speech, handwriting, story/listening, native media, sync/offline và release claim; không xác minh scoring/premium |
| `CS-LEGAL` | [Điều khoản](https://www.chineseskill.com/terms-conditions-html) và [riêng tư](https://www.chineseskill.com/privacypolicy-html) | Official policy claim | Truy cập 10/08/2026 | Biên tài khoản/dịch vụ/dữ liệu và ranh giới IP; không chứng minh UX học |
| `CALL-EJ` | [Bài báo CALL-EJ](https://callej.org/index.php/journal/article/download/41/28/170) | Historical secondary | Truy cập 10/08/2026; nghiên cứu phiên bản 5.1.2, chưa tái xác minh năm xuất bản | Chỉ dùng cho giả thuyết sư phạm lịch sử; ngoài phạm vi mô tả UI 2026 |
| `DEV-TONE` | [Bài đăng cộng đồng về tone](https://www.reddit.com/r/ChineseLanguage/comments/1pisqk8/we_have_free_tone_training_lessons_in_our_app/) | Unverified developer/community claim | Truy cập 10/08/2026 | Gợi ý segment/pitch contour; không phải tài liệu kỹ thuật hay benchmark accuracy |
| `ALR-REVIEW` | [All Language Resources](https://www.alllanguageresources.com/chineseskill-review-duolingo-style-app-learning-chinese/) | Secondary/historical | Truy cập 10/08/2026 | Chỉ sinh câu hỏi kiểm thử; không làm nguồn feature hiện hành |
| `LV-REVIEW` | [LanguaVibe](https://languavibe.com/chineseskill-review/) | Secondary/unverified | Truy cập 10/08/2026 | Chỉ sinh giả thuyết usability; không làm nguồn sự thật |
| `HZ-CHECKPOINT` | [Checkpoint HANZI.OS](IMPLEMENTATION_CHECKPOINT.md) | Internal audited baseline | Commit gần nhất | Số liệu/runtime hiện có; không phải evidence cho ChineseSkill |
| `VISION-SCOPE` | [Product Vision](PRODUCT_VISION.md) | Internal scope contract | 10/08/2026 | Phạm vi bắt buộc và các mục chủ động ngoài Goal |

Store là tài liệu marketing, không phải đặc tả. Mọi capability sẽ được kiểm thử
lại bằng prototype/acceptance của HANZI.OS thay vì giả định claim của đối chiếu
là đúng tuyệt đối.

## 3. Taxonomy năng lực hiện hành

### 3.1 Course và lộ trình chính

`CS-GPLAY` và `CS-APPSTORE` hiện công bố Mainland Mandarin, Taiwan Mandarin và
Hong Kong Cantonese. Đây là `OFFICIAL_CLAIM`. Phạm vi HANZI.OS chỉ benchmark
**Mainland Mandarin**; lựa chọn nhiều course là `OUT_OF_SCOPE`.

### 3.2 Lesson engine

`CS-HOME`, `CS-GPLAY` và `CS-APPSTORE` mô tả bài ngắn, game-based/adaptive,
speech, handwriting, knowledge card và nhiều mode. Đây chỉ là
`OFFICIAL_CLAIM`. `CS-WEB` xác nhận trực tiếp public map có 75 topic node, 11
TestOut và Finish; map này không đủ để xác nhận dạng activity, thuật toán,
mastery hay catalog mobile. Chuỗi giải thích → luyện có hướng dẫn → tự gọi lại →
phục hồi lỗi là quyết định thiết kế của HANZI.OS cần tự nghiệm thu, không phải
kết quả reverse engineering ChineseSkill.

### 3.3 Review

`CS-GPLAY` công bố SRS, nhiều mode ôn, bookmark và SRS trong một số Booster.
Việc các module dùng chung scheduler/item identity vẫn `UNVERIFIED`; HANZI.OS
chọn một scheduler chung như tiêu chí kiến trúc riêng.

### 3.4 AI Tutor

`CS-GPLAY` công bố hơn 100 chủ đề, phản hồi ngữ pháp/cách diễn đạt và điều khiển
personality, tốc độ, độ khó. Đây là `OFFICIAL_CLAIM`; model, chất lượng,
guardrail, privacy, chi phí và offline đều `UNVERIFIED`.

### 3.5 Booster

`CS-GPLAY` chia phần mở rộng thành các module sau; toàn bộ là
`OFFICIAL_CLAIM`, không phải inventory đã được nhóm mở và đếm:

- Travel Phrasebook có audio, chỉnh tốc độ và SRS;
- Fluency Builder gồm hội thoại HSK1–HSK5 và SRS;
- HSK Word Bank HSK1–HSK6;
- HSK Character Bank New HSK1–HSK9, search, custom deck và SRS;
- Practice Zone với game từ vựng, ngữ pháp và xây câu.

`CS-APPSTORE` còn công bố graded stories/listening. Việc dùng một item qua nhiều
ngữ cảnh là giả thuyết thiết kế HANZI.OS sẽ đo bằng evidence, không suy từ số
module marketing.

### 3.6 Script, media, offline và tiến độ

`CS-GPLAY`/`CS-APPSTORE` công bố Pinyin/Zhuyin/Jyutping/Characters, tone marks,
native media, offline, sync, league và badge. Đây là `OFFICIAL_CLAIM`; module
nào thực sự offline, conflict resolution và tác động của gamification vẫn
`UNVERIFIED`. HANZI.OS chỉ giữ giản thể + Pinyin; league/social là
`OUT_OF_SCOPE`.

## 4. Ma trận capability → nguồn → task → acceptance

Mỗi dòng dùng đúng một nhãn quyết định. Cột giới hạn ghi rõ phần nào vẫn chưa
biết; một `OFFICIAL_CLAIM` không được tự nâng thành behavior đã kiểm thử.

| Mã | Năng lực | Phân loại | Bằng chứng và giới hạn | Nguồn | Task đích | Tiêu chí nghiệm thu HANZI.OS |
| --- | --- | --- | --- | --- | --- | --- |
| `CAP-001` | Chọn nhiều course | `OUT_OF_SCOPE` | Store công bố Mainland/Taiwan/Cantonese; Goal chỉ author Mainland | `CS-GPLAY`, `CS-APPSTORE`, `VISION-SCOPE` | `T001`, `T002` | Không author/migrate Taiwan, Cantonese hoặc HSK5+ trong 100 task; đổi scope cần quyết định mới của người dùng |
| `CAP-002` | Lộ trình chính | `OBSERVED` | Public web map có 75 topic, 11 TestOut và Finish; số lesson/coverage mobile chưa biết | `CS-WEB`, `CS-GPLAY` | `T017`, `T018`, `T049`, `T050` | Học/Hôm nay có một CTA, lock reason rõ, resume một chạm và Main Course chạy end-to-end trên mobile |
| `CAP-003` | Lesson ngắn đa hoạt động | `OFFICIAL_CLAIM` | Site/store claim bite-size, game/adaptive; activity algorithm chưa xác minh | `CS-HOME`, `CS-GPLAY`, `CS-APPSTORE`, `CALL-EJ` | `T010`, `T031`, `T032`, `T040`, `T041`, `T042`, `T047`, `T050` | Một session trong budget bài ngắn T010 đi qua giải thích, luyện có hướng dẫn, retrieval, feedback và remediation trên frame dùng chung |
| `CAP-004` | Knowledge card | `OFFICIAL_CLAIM` | Home/store/release media claim card/class note; độ đầy đủ catalog chưa biết | `CS-HOME`, `CS-GPLAY`, `CS-APPSTORE` | `T024`, `T040` | Mỗi unit có card mục tiêu/mẫu/ngữ pháp/chữ-âm, mở lại được không mất state; thiếu explanation thì package bị chặn |
| `CAP-005` | Native audio/video | `OFFICIAL_CLAIM` | Store claim native media; tỷ lệ, license và QA toàn catalog chưa xác minh | `CS-HOME`, `CS-GPLAY`, `CS-APPSTORE` | `T051`, `T052`, `T053`, `T054`, `T060` | Media chấm điểm có provenance/license, human QA và player accessible; TTS synthetic chỉ là hỗ trợ được gắn nhãn, không tính điểm hay gọi là native |
| `CAP-006` | Giáo trình thanh điệu | `OFFICIAL_CLAIM` | Store công bố Tone Training/Pinyin course; coverage/hiệu quả chưa xác minh | `CS-GPLAY`, `CS-APPSTORE` | `T055`, `T056`, `T058`, `T060` | HSK0 tone course đi từ perception đến production, minimal pair và câu; micro luôn có phương án thay thế |
| `CAP-007` | Độ chính xác chấm phát âm/thanh điệu | `UNVERIFIED` | Store/dev claim automatic assessment, segment/pitch; không có benchmark accuracy độc lập | `CS-GPLAY`, `DEV-TONE` | `T010`, `T057`, `T060`, `T097` | Benchmark giọng thật human-label đạt ngưỡng có phiên bản trong quality budget; confidence thấp không sinh mastery và chuyển sang tự nghe/so mẫu |
| `CAP-008` | Speaking/micro interaction | `OFFICIAL_CLAIM` | Store claim speech recognition/assessment; browser/device support chưa biết | `CS-GPLAY`, `CS-APPSTORE` | `T056`, `T058`, `T060` | Capture có consent, evidence nói tách transcript, scripted fallback dùng được và không chặn người không có micro |
| `CAP-009` | Handwriting | `OFFICIAL_CLAIM` | Store claim handwriting mỗi unit; recognizer/tolerance/remediation chưa xác minh | `CS-GPLAY`, `CS-APPSTORE` | `T059`, `T060`, `T075` | Canvas mouse/touch/pen có stroke data licensed, guide/replay/undo và recall; ghi rõ không chấm, không suy writing mastery |
| `CAP-010` | Review/SRS | `OFFICIAL_CLAIM` | Store claim SRS/mode; scheduler, retention target và migration chưa biết | `CS-GPLAY`, `CS-HOME` | `T062`, `T063`, `T064`, `T067`, `T068`, `T069`, `T070` | Một scheduler giữ due/stability/difficulty qua lesson/library/account; queue dedupe và Ôn chạy end-to-end |
| `CAP-011` | Bookmark/custom deck | `OFFICIAL_CLAIM` | Store claim bookmark/search/custom deck; dedupe/export chưa xác minh | `CS-GPLAY` | `T065`, `T066` | Bookmark xuyên module; deck tạo/sửa/xóa/dedupe, backup/restore và dùng chung item identity với FSRS |
| `CAP-012` | AI Tutor | `OFFICIAL_CLAIM` | Store claim 100+ topic/feedback/controls; model, accuracy, privacy, offline và entitlement chưa biết | `CS-GPLAY`, `CS-PRICE` | `T081`, `T082`, `T083`, `T084`, `T085` | Catalog 100+ kịch bản gốc có scripted local fallback; AI ngoài tùy chọn, output có schema/guardrail/eval và không chặn học khi provider lỗi |
| `CAP-013` | Booster/library | `OFFICIAL_CLAIM` | Store/pricing liệt kê Phrasebook, Fluency, Bank, Practice Zone; inventory/free overlap chưa biết | `CS-GPLAY`, `CS-PRICE` | `T071`, `T072`, `T073`, `T074`, `T075`, `T076`, `T077`, `T078`, `T079`, `T080` | Hub Luyện theo mục đích mở các catalog gốc, search/bookmark/SRS thống nhất và content pack chạy airplane mode |
| `CAP-014` | Graded stories/listening | `OFFICIAL_CLAIM` | App Store claim story/listening theo level; số lượng/calibration/transcript coverage chưa biết | `CS-APPSTORE` | `T010`, `T068`, `T079`, `T080` | Reader corpus HSK0–4 đạt target đã khóa trong quality budget, human QA, audio/transcript/gloss/comprehension/bookmark và offline sau tải |
| `CAP-015` | Offline/sync | `OFFICIAL_CLAIM` | Store claim offline/cross-device; module coverage, conflict, export/restore chưa biết | `CS-GPLAY`, `CS-APPSTORE`, `CS-SUPPORT` | `T005`, `T044`, `T045`, `T080`, `T092`, `T093` | Fixture cũ migrate/restore không mất dữ liệu; resume/idempotency đúng; pack offline và merge guest/account deterministic |
| `CAP-016` | Bề mặt TestOut công khai | `OBSERVED` | Chỉ quan sát 11 nút TestOut trên public map; support giải thích skip từ 2021 nhưng behavior placement hiện hành không thuộc claim đã quan sát | `CS-WEB`, `CS-SUPPORT` | `T049`, `T089` | HANZI.OS tự nghiệm thu guest chọn mục tiêu/thời gian/điểm xuất phát, placement calibrated và chỉ mở khóa khi có evidence; vào Học không cần account |
| `CAP-017` | League/social/paywall | `OUT_OF_SCOPE` | Store/pricing công bố league, badge, subscription; không phải điều kiện học cốt lõi local | `CS-GPLAY`, `CS-PRICE`, `VISION-SCOPE` | `T002`, `T048`, `T100` | Chỉ giữ động lực nhẹ nếu không che nội dung; không xây social league, paywall hoặc commerce trong local release |
| `CAP-018` | App iOS/Android native | `OUT_OF_SCOPE` | Store chứng minh native app tồn tại; Goal HANZI.OS là responsive web/PWA | `CS-GPLAY`, `CS-APPSTORE`, `VISION-SCOPE` | `T002`, `T010`, `T016`, `T098` | PWA 360 px/desktop, keyboard/touch/device matrix đạt budget T010; không tạo native app trong 100 task |

## 5. Pattern đáng kiểm chứng, không phải kết luận hiệu quả

### Giả thuyết thiết kế cần HANZI.OS tự đo

- Đặt thanh điệu, Pinyin và chữ viết trong lõi có thể giảm khoảng trống đặc thù
  tiếng Trung; T055–T060 phải chứng minh bằng task success và evidence đúng kỹ năng.
- Một điểm vào Học, một queue Ôn và hub Luyện theo mục đích có thể giảm lạc hướng;
  T011/T012/T050 phải đo thay vì suy từ taxonomy đối chiếu.
- Dùng một item identity qua lesson, hội thoại, reader, bank, game và FSRS có thể
  tạo chiều sâu; coverage chỉ tăng khi người học thật sự tương tác, không tăng vì
  item xuất hiện trong inventory.
- Giải thích trước, guided practice rồi retrieval/remediation có thể giảm ma sát;
  T024/T031–T050 phải so bằng fixture và usability.
- Script, tốc độ audio và fallback modality có thể giúp nhiều thiết bị/người học
  tiếp tục; T043/T054/T060/T098 phải đo trên ma trận đã khóa.
- Native media/offline chỉ là giá trị thật khi provenance, QA, download, resume và
  fallback chạy được; store claim không thay cho acceptance HANZI.OS.

### Điểm yếu/rủi ro không nên sao chép

- Breadth lớn dễ tạo nhiều entry point và làm người mới không biết bắt đầu đâu;
  HANZI.OS phải giữ một CTA “Tiếp tục” và đúng năm khu vực.
- Speech/tone/AI được marketing mạnh nhưng thuật toán và độ chính xác không công
  khai; HANZI.OS không được dùng nhãn mastery khi chưa hiệu chuẩn.
- Paywall, league và mở rộng nhiều course có thể làm lệch mục tiêu học; chúng
  không thuộc parity HSK0–HSK4 local-first.
- Bắt chước surface UI sẽ mang theo cả giới hạn của đối chiếu và tạo rủi ro sở
  hữu trí tuệ; chỉ học cấu trúc vấn đề–giải pháp.

## 6. Ma trận khoảng cách HANZI.OS

Quy ước trạng thái:

- **Keep:** giữ lõi/dữ liệu, nhưng vẫn phải chạy acceptance mới;
- **Rebuild:** giữ được một phần domain logic, thay mô hình trải nghiệm hoặc
  cách đo;
- **New:** chưa có năng lực learner-facing đủ dùng;
- **Defer:** chủ động ngoài phạm vi 100 task, không tính vào hoàn thành.

| Mã | Năng lực/gap | Bằng chứng HANZI.OS hiện tại | Trạng thái | Trace nguồn/capability | Task đích và acceptance |
| --- | --- | --- | --- | --- | --- |
| `GAP-001` | Inventory HSK0–HSK4 | 4 bridge + 213 rich lesson; 2.016 từ, 1.096 chữ, 332 ngữ pháp | **Keep** | `CAP-002`, `HZ-CHECKPOINT` | `T021`, `T027`, `T028`, `T029`, `T030`, `T097` — manifest/mapping audit đủ 100%; chỉ tính item có activity và người học thật sự luyện |
| `GAP-002` | Prerequisite/version/content gate | Package, prerequisite, authorization và validator đã có | **Keep** | `CAP-002`, `HZ-CHECKPOINT` | `T004`, `T021`, `T025`, `T049` — giữ stable ID/version, không mở draft và mọi lock có lý do/đường đi tiếp |
| `GAP-003` | Offline persistence/evidence | IndexedDB/outbox/idempotency/recovery đã có | **Keep** | `CAP-015`, `HZ-CHECKPOINT` | `T005`, `T008`, `T044`, `T045`, `T092`, `T093` — reload/offline/account migration không mất hoặc nhân đôi attempt/FSRS/bookmark |
| `GAP-004` | FSRS review | Scheduler và màn Ôn legacy có sẵn | **Keep** | `CAP-010`, `HZ-CHECKPOINT` | `T062`, `T063`, `T064`, `T065`, `T066`, `T067`, `T068`, `T069`, `T070` — một item graph/scheduler, queue dedupe và Ôn end-to-end |
| `GAP-005` | Mistake remediation | Evidence và luồng luyện lại legacy có sẵn | **Keep** | `CAP-003`, `CAP-010`, `HZ-CHECKPOINT` | `T040`, `T047`, `T067`, `T070` — lỗi có giải thích, luyện lại và delayed recall trước khi ghi đã khắc phục |
| `GAP-006` | Assessment session/versioning | Level Check HSK1–4, session và receipt có sẵn | **Keep** | `CAP-016`, `HZ-CHECKPOINT` | `T045`, `T086`, `T087`, `T088`, `T089` — blueprint/version/idempotency đúng và client/payload không lộ key/explanation trước submit |
| `GAP-007` | Lộ trình course | Unit, khóa/mở và lesson link legacy có sẵn | **Rebuild** | `CAP-002`, `HZ-CHECKPOINT` | `T017`, `T018`, `T049`, `T050` — map mobile dễ đọc, objective/prerequisite/lock rõ, resume một chạm và full slice xanh |
| `GAP-008` | IA và navigation | Khoảng 10 đích fantasy; mobile có menu cạnh tranh | **Rebuild** | `VISION-SCOPE`, `HZ-CHECKPOINT` | `T012`, `T015`, `T016` — đúng năm khu vực, nhãn phổ thông là chính và không có điều hướng cấp một thứ sáu |
| `GAP-009` | Dashboard/daily loop | Nhiều panel/metric/hologram cùng cạnh tranh | **Rebuild** | `CAP-002`, `CAP-010`, `CAP-013`, `HZ-CHECKPOINT` | `T017`, `T048`, `T050`, `T063` — một CTA tiếp tục, việc đến hạn/kết phiên rõ và chi tiết mở dần |
| `GAP-010` | Lesson presentation | Rich UI dài, mode chưa thành engine nhất quán | **Rebuild** | `CAP-003`, `CAP-004`, `HZ-CHECKPOINT` | `T024`, `T031`, `T032`, `T040`, `T041`, `T042`, `T047`, `T048`, `T050` — card ngắn giải thích→guided→retrieval→remediation dùng chung frame |
| `GAP-011` | Exercise engine | Select/order/input/check rải theo màn | **Rebuild** | `CAP-003`, `CAP-006`, `CAP-008`, `CAP-009`, `HZ-CHECKPOINT` | `T023`, `T031`, `T032`, `T033`, `T034`, `T035`, `T036`, `T037`, `T038`, `T039`, `T040`, `T058`, `T059`, `T060` — registry schema-driven, accessible và evidence đúng kỹ năng |
| `GAP-012` | Nhập chữ Hán | Pinyin→Hanzi helper chỉ ở một số input | **Rebuild** | `CAP-009`, `HZ-CHECKPOINT` | `T039`, `T059`, `T060` — helper dùng chung có Pinyin candidates/keyboard/touch và fallback không cần OS IME |
| `GAP-013` | Pronunciation | Browser speech/TTS và phase UI chưa đủ scoring | **Rebuild** | `CAP-006`, `CAP-007`, `CAP-008`, `HZ-CHECKPOINT` | `T010`, `T055`, `T056`, `T057`, `T058`, `T060` — transcript tách acoustic evidence, calibration human-label theo quality budget và confidence thấp có fallback |
| `GAP-014` | Character learning | Catalog nhận dạng 1.096 chữ, chưa có curriculum viết/recall | **Rebuild** | `CAP-009`, `CAP-010`, `CAP-013`, `HZ-CHECKPOINT` | `T059`, `T062`, `T066`, `T075` — component/radical, licensed stroke guide, recall/SRS theo level và không giả chấm nét |
| `GAP-015` | Reader | Text, inspector, question và persistence legacy có sẵn | **Rebuild** | `CAP-014`, `HZ-CHECKPOINT` | `T065`, `T068`, `T079`, `T080` — graded corpus gốc có audio/transcript/gloss/question/bookmark/Ôn và offline |
| `GAP-016` | Dictionary/word bank | Catalog 2.016 mục legacy có sẵn | **Rebuild** | `CAP-011`, `CAP-013`, `HZ-CHECKPOINT` | `T065`, `T066`, `T074`, `T076` — HSK/chủ đề, ví dụ/audio/search/activity/deck cùng stable item ID |
| `GAP-017` | Analytics/mastery | Thất Trụ còn tách khỏi vòng học, dễ gây hiểu sai mẫu nhỏ | **Rebuild** | `VISION-SCOPE`, `HZ-CHECKPOINT` | `T046`, `T061`, `T062`, `T069` — coverage/accuracy/confidence/retention tách biệt, có mẫu số và “cần thêm lượt” khi thiếu evidence |
| `GAP-018` | Mock exam | 8 form × 12 câu, 18–35 phút; không phải đề đầy đủ | **Rebuild** | `VISION-SCOPE`, `HZ-CHECKPOINT` | `T086`, `T087`, `T088`, `T089` — mini practice tách khỏi full blueprint/thời lượng công bố; item/audio gốc, không gọi đề thật |
| `GAP-019` | Hologram/motion | 3D/scan/overlay; reduced-motion mới một phần | **Rebuild** | `VISION-SCOPE`, `HZ-CHECKPOINT` | `T010`, `T014`, `T019`, `T020`, `T098` — semantic token, không flicker/layout shift, reduced-motion và performance budget xanh |
| `GAP-020` | Account UI | Guest/HANZI.OS local hoạt động; OAuth public chưa có credential | **Rebuild** | `CAP-015`, `CS-SUPPORT`, `HZ-CHECKPOINT` | `T006`, `T091`, `T092`, `T095` — đăng ký/đăng nhập/phục hồi rõ, guest không bị chặn và merge dữ liệu có preview/rollback |
| `GAP-021` | Knowledge cards | Nội dung sâu có nhưng chưa là bước dạy nhất quán | **New** | `CAP-004`, `HZ-CHECKPOINT` | `T024`, `T040` — card mục tiêu/mẫu/ngữ pháp/chữ-âm trước activity, mở lại được và explanation thiếu sẽ fail validator |
| `GAP-022` | Bookmark và custom deck | Chưa có trải nghiệm xuyên module | **New** | `CAP-011`, `HZ-CHECKPOINT` | `T062`, `T065`, `T066` — bookmark mọi item; deck CRUD/dedupe/backup dùng chung FSRS identity |
| `GAP-023` | Phrasebook | Chưa có module tình huống dùng nhanh | **New** | `CAP-013`, `HZ-CHECKPOINT` | `T010`, `T072`, `T080` — taxonomy/corpus target khóa ở T010/T072, câu gốc human-QA, audio/tốc độ/pin/Ôn và offline |
| `GAP-024` | Fluency/dialogue builder | Rich lesson có dialogue nhưng chưa có catalog độc lập | **New** | `CAP-013`, `HZ-CHECKPOINT` | `T010`, `T073`, `T080` — corpus target theo level khóa trong quality budget, role-play/shadowing/biến thể/SRS và không nhân bản dialogue main course |
| `GAP-025` | Practice Zone games | Chưa có bộ game dùng chung | **New** | `CAP-013`, `HZ-CHECKPOINT` | `T077`, `T078`, `T080` — game ngắn dùng inventory thật, keyboard/mobile/offline; score game không thành mastery |
| `GAP-026` | Tone training chuyên biệt | Có phrase pronunciation, chưa có curriculum hiệu chuẩn | **New** | `CAP-006`, `CAP-007`, `CAP-008`, `HZ-CHECKPOINT` | `T055`, `T056`, `T057`, `T058`, `T060` — perception→production→minimal pair→câu, acoustic evidence và fallback không micro |
| `GAP-027` | Handwriting engine | Chưa có canvas xuyên character curriculum | **New** | `CAP-009`, `HZ-CHECKPOINT` | `T059`, `T060`, `T075` — touch/mouse/pen, licensed stroke guide/replay/undo/recall; practice không chấm và không suy writing mastery |
| `GAP-028` | AI/conversation tutor | Trợ lý legacy chưa là hội thoại sư phạm | **New** | `CAP-012`, `HZ-CHECKPOINT` | `T081`, `T082`, `T083`, `T084`, `T085`, `T090` — catalog 100+ kịch bản gốc có scripted local fallback, adapter AI tùy chọn, guardrail/eval và tab Nói end-to-end |
| `GAP-029` | Native/licensed audio | Chủ yếu browser TTS synthetic | **New** | `CAP-005`, `HZ-CHECKPOINT` | `T051`, `T052`, `T054`, `T060` — audio người thật có consent/license/human QA cho nội dung chấm; TTS synthetic chỉ hỗ trợ có nhãn, không tính điểm hay gọi native |
| `GAP-030` | Course placement/onboarding | Onboarding lore-heavy, placement chưa theo evidence | **New** | `CAP-016`, `HZ-CHECKPOINT` | `T049`, `T089`, `T095` — guest chọn goal/time/start, diagnostic calibrated, vào Học không cần account và mở khóa theo rule |
| `GAP-031` | Public Google/Facebook OAuth | Route/config có sẵn, chưa có domain/credential public | **Defer** | `CS-SUPPORT`, `VISION-SCOPE`, `HZ-CHECKPOINT` | `T091` — UI fail-closed và chỉ bật khi chủ dự án có domain/credential; không là blocker local release |
| `GAP-032` | Taiwan/Cantonese/HSK5+ | Không thuộc inventory khóa | **Defer** | `CAP-001`, `VISION-SCOPE` | `T001`, `T002`, `T099` — giữ biên mở rộng nhưng không author/migrate content ngoài Mainland HSK0–4 |
| `GAP-033` | League/social/paywall/commerce | Chỉ có XP/streak local nhẹ | **Defer** | `CAP-017`, `VISION-SCOPE`, `HZ-CHECKPOINT` | `T002`, `T048`, `T100` — động lực không che nội dung/không mở mastery; không xây league/social/paywall/commerce |
| `GAP-034` | Native iOS/Android | HANZI.OS là web/PWA | **Defer** | `CAP-018`, `VISION-SCOPE`, `HZ-CHECKPOINT` | `T002`, `T016`, `T098` — hoàn thiện responsive PWA và device matrix; native app là roadmap ngoài Goal |
| `GAP-035` | Local role workspace | Learner/editor/admin foundations có, UX role chưa nghiệm thu | **Rebuild** | `HZ-CHECKPOINT` | `T094` — learner/mentor/reviewer/admin vào dashboard có nhiệm vụ thật, deny-by-default và không đổi role client-side |
| `GAP-036` | Production CMS/ops/hosting | Admin/Studio/worker legacy tồn tại nhưng production bị hoãn | **Defer** | `VISION-SCOPE`, `HZ-CHECKPOINT` | `T002`, `T099`, `T100` — bảo toàn contract hiện có, chỉ sửa blocker correctness; không mở project hosted CMS/ops mới |

## 7. Ranh giới sở hữu trí tuệ

### Được phép học và áp dụng

- taxonomy tính năng, vấn đề người học và nguyên tắc sư phạm công khai;
- pattern phổ quát: spaced repetition, retrieval practice, lesson ngắn, card giải
  thích, bottom navigation, audio speed, input fallback;
- phạm vi HSK và nguồn inventory chính thức/mở có provenance;
- kết quả usability do HANZI.OS tự đo trên implementation độc lập.

### Không được phép lấy

- câu hỏi, đáp án, distractor, dialogue, story, bản dịch hoặc explanation cụ thể;
- audio, video, screenshot, illustration, icon, animation, font hoặc asset brand;
- tên thương hiệu, copy marketing, bố cục pixel-for-pixel và “look and feel” gây
  nhầm lẫn về liên hệ với ChineseSkill;
- API private, payload, database, model prompt, scoring threshold hoặc nội dung
  thu được bằng reverse engineering/scraping;
- đề thi có bản quyền hoặc lời tuyên bố “đề thật” khi chỉ là mô phỏng tự soạn.

Mỗi nội dung HANZI.OS phải có nguồn phạm vi, tác giả/quy trình sinh, giấy phép
media và trạng thái review. ChineseSkill chỉ là **benchmark cạnh tranh**, không
là nguồn nội dung.

## 8. Kết luận quyết định

HANZI.OS không thiếu toàn bộ nền móng: package HSK0–HSK4, versioning, local
persistence, FSRS, Reader và assessment infrastructure đáng giữ. Khoảng cách lớn
nhất là **kiến trúc trải nghiệm, engine bài ngắn đa phương thức, quality/media và
độ tái sử dụng inventory**, không phải thêm nhiều dashboard hay route.

Do đó Reforge phải giữ lõi dữ liệu đúng, đóng băng feature vận hành không phục vụ
người học, rồi xây lại từ vòng học hằng ngày ra ngoài. Mỗi task chỉ hoàn thành khi
người học dùng được trên UI và acceptance đo được; con số roadmap cũ không được
dùng làm bằng chứng parity.

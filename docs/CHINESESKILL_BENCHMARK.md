# Benchmark ChineseSkill cho HANZI.OS Reforge

**Ngày khóa nghiên cứu:** 10/08/2026
**Mục đích:** học cấu trúc sản phẩm và phương pháp sư phạm để xây một triển khai
độc lập cho Mandarin HSK0–HSK4
**Không phải:** tài liệu sao chép nội dung/UI hoặc khẳng định đã kiểm thử mọi
tính năng trả phí trên thiết bị thật

## 1. Phương pháp và giới hạn bằng chứng

Nghiên cứu kết hợp trang store hiện hành, release note, điều khoản chính thức,
ảnh/video walkthrough công khai, bài báo học thuật lịch sử và phản hồi người
dùng. Mỗi kết luận dùng một trong ba nhãn:

- **Quan sát:** nhìn thấy trực tiếp trong listing, screenshot hoặc walkthrough;
- **Tuyên bố chính thức:** nhà phát triển mô tả nhưng nhóm chưa kiểm định độc lập;
- **Chưa biết:** thuật toán, độ chính xác, số lượng hoặc hành vi cần tài khoản,
  thuê bao hay thiết bị thật để xác nhận.

Không cài ứng dụng, mua thuê bao hay đăng nhập tài khoản ChineseSkill trong lượt
nghiên cứu này. Vì vậy tài liệu không gọi nội dung premium hoặc scoring nội bộ
là “đã xác minh”.

## 2. Sổ nguồn

| Nguồn | Trạng thái tại ngày khóa | Dùng để xác nhận | Độ tin cậy và giới hạn |
| --- | --- | --- | --- |
| [Trang chủ ChineseSkill](https://www.chineseskill.com/home) | Trang sản phẩm chính thức hiện hành | Cấu trúc Main Course, Review, AI Tutor, Booster và định vị sản phẩm | **Cao** cho taxonomy được công bố; không chứng minh chất lượng từng bài |
| [Web course công khai](https://www.chineseskill.com/learn-chinese/cn/en) | Đã thao tác trực tiếp không đăng nhập ngày 10/08/2026 | 75 unit chủ đề, 11 TestOut, khóa tuần tự, lesson đầu và phản hồi trong bài | **Cao** cho web public đã quan sát; có thể là nhánh legacy, không dùng để suy số lesson mobile 2026 |
| [Bảng giá chính thức](https://www.chineseskill.com/learnchinese/pricing) | Trang pricing hiện hành | Phân tầng Core/Premium và Premium+/AI–Booster | **Cao** cho gói được công bố; entitlement cụ thể vẫn có thể khác theo nền tảng/khu vực |
| [Support chính thức](https://support.chineseskill.com/en/support/solutions), [TestOut](https://support.chineseskill.com/en/support/solutions/articles/70000154975-what-is-testout-) và [phương thức đăng nhập](https://support.chineseskill.com/en/support/solutions/articles/70000154972-how-can-i-check-my-login-method-) | Knowledge base chính thức | Cơ chế TestOut và giới hạn account/login giữa nền tảng | **Cao** cho hướng dẫn hỗ trợ; bài viết có thể không phản ánh mọi thay đổi UI mới nhất |
| [Google Play — ChineseSkill](https://play.google.com/store/apps/details?hl=en-US&id=com.chineseskill) | Listing hiện hành, cập nhật 31/07/2026 | Ba course, Main Course, Review, AI Tutor, Booster, script, offline, game/progress | **Cao** cho feature được nhà phát triển công bố; **trung bình** cho chất lượng thực tế |
| [Apple App Store — ChineseSkill](https://apps.apple.com/us/app/chineseskill-learn-chinese/id777111034) | Version history và listing iOS hiện hành | Bite-size lesson, speech recognition, handwriting, stories/listening, native media, sync/offline | **Cao** cho phạm vi công bố; chưa xác minh hành vi premium/cross-device |
| [Điều khoản chính thức](https://www.chineseskill.com/terms-conditions-html) và [chính sách riêng tư](https://www.chineseskill.com/privacypolicy-html) | Trang pháp lý chính thức | Biên giới tài khoản, dịch vụ và dữ liệu | **Cao** cho chính sách được công bố; không mô tả chi tiết UX học |
| [Bài báo CALL-EJ về ChineseSkill](https://callej.org/index.php/journal/article/download/41/28/170) | Nghiên cứu phiên bản 5.1.2, mang tính lịch sử | Mô hình Learn/Review/Challenge/Immersion, lesson/tips/game và kết quả nghiên cứu | **Trung bình** cho tư duy sư phạm; **không dùng** để mô tả UI 2026 |
| [Giải thích tone training của nhà phát triển](https://www.reddit.com/r/ChineseLanguage/comments/1pisqk8/we_have_free_tone_training_lessons_in_our_app/) | Bài đăng cộng đồng của đội phát triển | Claim tách phụ âm/nguyên âm và đường cao độ thanh điệu | **Trung bình**; chưa có benchmark độc lập về độ chính xác |
| [All Language Resources review](https://www.alllanguageresources.com/chineseskill-review-duolingo-style-app-learning-chinese/) | Walkthrough/review bên thứ ba | Dạng bài, nhịp lesson và nhận xét sử dụng | **Thấp–trung bình**; có thể phản ánh phiên bản cũ |
| [LanguaVibe review](https://languavibe.com/chineseskill-review/) | Review bên thứ ba | Góc nhìn usability, ưu/nhược điểm | **Thấp–trung bình**; dùng để tìm câu hỏi kiểm thử, không làm nguồn sự thật |

Store là tài liệu marketing, không phải đặc tả. Mọi capability sẽ được kiểm thử
lại bằng prototype/acceptance của HANZI.OS thay vì giả định claim của đối chiếu
là đúng tuyệt đối.

## 3. Taxonomy năng lực hiện hành

### 3.1 Course và lộ trình chính

[Google Play](https://play.google.com/store/apps/details?hl=en-US&id=com.chineseskill)
hiện công bố Mainland Mandarin, Taiwan Mandarin và Hong Kong Cantonese. Phạm vi
HANZI.OS chỉ benchmark **Mainland Mandarin**: lộ trình ngữ pháp tới mức tương
đương HSK4/TOCFL, bài ngắn theo chủ đề, audio/video người bản ngữ, tone training,
handwriting theo unit và vocabulary theo tình huống.

### 3.2 Lesson engine

[App Store](https://apps.apple.com/us/app/chineseskill-learn-chinese/id777111034)
mô tả game-based bite-size lessons, speech recognition, handwriting, immersive
lessons và adaptive practice. Quan sát public walkthrough cho thấy giá trị không
nằm ở một bài dài nhiều chữ, mà ở chuỗi bước ngắn: giới thiệu → nhận diện → ghép
nghĩa/âm → sắp câu → gọi lại → phản hồi.

Trong web course công khai, nhóm đã trực tiếp mở unit **Hello**, thấy ba lesson
tuần tự, một mục Speaking và Class Notes. Các bước đầu gồm chọn tranh/nghĩa,
nghe–học, chọn audio/nghĩa và phản hồi tức thì kèm Hanzi, Pinyin, nghĩa và nút
nghe lại. Quan sát này xác nhận nhịp tương tác, nhưng không được dùng để kết luận
web legacy và mobile hiện hành có cùng catalog hoặc thuật toán.

### 3.3 Review

Google Play công bố SRS tích hợp, nhiều mode ôn và review mục đã bookmark. Đây
là một hệ thống xuyên course và Booster, không phải màn flashcard đứng riêng.

### 3.4 AI Tutor

Listing hiện hành công bố hơn 100 chủ đề hội thoại, phản hồi ngay về ngữ pháp và
cách diễn đạt, cùng lựa chọn personality, tốc độ và độ khó. Đây là **claim chính
thức**; chất lượng phản hồi, guardrail, chi phí và khả năng offline chưa biết.

### 3.5 Booster

Google Play chia phần mở rộng thành các module có mục tiêu rõ:

- Travel Phrasebook có audio, chỉnh tốc độ và SRS;
- Fluency Builder gồm hội thoại HSK1–HSK5 và SRS;
- HSK Word Bank HSK1–HSK6;
- HSK Character Bank New HSK1–HSK9, search, custom deck và SRS;
- Practice Zone với game từ vựng, ngữ pháp và xây câu.

App Store còn công bố graded stories/listening. Cấu trúc này cho thấy “độ phủ”
không chỉ là số lesson chính mà còn là nhiều cách tái sử dụng cùng kiến thức.

### 3.6 Script, media, offline và tiến độ

Store công bố Pinyin/Zhuyin/Jyutping/Characters, tone marks, native audio/video,
offline learning, đồng bộ thiết bị, league và badge. HANZI.OS chỉ cần giản thể +
Pinyin trong phạm vi hiện tại; league xã hội không phải năng lực học cốt lõi.

## 4. Điều quan sát được, điều chỉ được công bố, điều chưa biết

| Năng lực | Quan sát công khai | Tuyên bố chính thức hiện hành | Chưa biết/cần kiểm chứng |
| --- | --- | --- | --- |
| Chọn course | Card Mainland/Taiwan/Cantonese trên media store | Có ba course | Logic placement/chuyển course và migration tiến độ |
| Lộ trình chính | Bản đồ bài/unit, trạng thái khóa và CTA lesson | Grammar path tới HSK4/TOCFL | Số lesson Mainland hiện hành và coverage từng item |
| Lesson ngắn | Chuỗi card/tương tác, phản hồi trực tiếp | Game-based, bite-size, adaptive | Thuật toán adaptive và ngưỡng mastery |
| Knowledge card | Release media cho course mới thể hiện card kiến thức | Card giải thích trước/lẫn trong lesson | Độ đầy đủ/ngôn ngữ của toàn bộ Mainland course |
| Nghe/media | Nút phát, video/audio trong listing | Native audio và video | Tỷ lệ native trên toàn catalog, quy trình QA và license |
| Thanh điệu | UI tone drill và visualization công khai | Chấm segment + pitch contour theo bài đăng dev | Sai số theo micro/accent/noise; benchmark người bản ngữ |
| Nói | Tương tác micro trong walkthrough | Speech recognition | Chấm transcript hay phát âm; hỗ trợ browser/device nào |
| Viết chữ | Bề mặt tracing/handwriting trong media | Handwriting mỗi unit | Nhận dạng stroke/order, tolerance và remediation |
| SRS | Review queue/mode được trình bày | SRS xuyên course/Booster | Scheduler, retention target và dữ liệu migrate |
| Bookmark/custom deck | Entry trong mô tả bank/review | Bookmark review, custom character decks | Quy tắc dedupe/share/export |
| AI Tutor | Entry và màn hội thoại trong media store | 100+ topic, feedback, personality/speed/difficulty | Model, độ đúng, privacy, offline và giới hạn thuê bao |
| Booster | Catalog module được liệt kê rõ | Phrasebook, Fluency, Word/Character Bank, games | Số item dùng được miễn phí và overlap với Main Course |
| Stories/listening | Được giới thiệu trong App Store | Graded stories/listening | Số lượng, level calibration và transcript coverage |
| Offline/sync | Badge/claim trên store | Offline và cross-device progress | Những module offline, conflict resolution, export/restore |
| Gamification | Badge/league/progress visuals | League và badge | Tác động học thật; không phải điều kiện parity cốt lõi |

## 5. Vì sao mô hình này hiệu quả

### Điểm mạnh có thể học

- **Ngôn ngữ-specific:** thanh điệu, Pinyin và chữ viết là lõi, không phải add-on.
- **Mỗi lần vào app có đích rõ:** lộ trình chính cho người mới; Booster cho nhu
  cầu cụ thể; Review gom việc đến hạn.
- **Một inventory, nhiều ngữ cảnh:** từ/chữ quay lại trong lesson, hội thoại,
  story, bank, game và SRS, nên độ phủ sâu hơn số lesson bề mặt.
- **Scaffolding tốt:** kiến thức được giải thích trước khi buộc người học tự gọi
  lại; bài ngắn giảm chi phí bắt đầu.
- **Điều khiển đầu vào:** script, tốc độ audio và khả năng bỏ qua mode không phù
  hợp giúp nhiều loại thiết bị/người học tiếp tục được.
- **Native media và offline** là giá trị sản phẩm rõ ràng nếu claim được thực thi
  nhất quán.

### Điểm yếu/rủi ro không nên sao chép

- Breadth lớn dễ tạo nhiều entry point và làm người mới không biết bắt đầu đâu;
  HANZI.OS phải giữ một CTA “Tiếp tục” và đúng năm khu vực.
- Review trên store có người thích độ toàn diện nhưng cũng có phản hồi về video
  mới khó theo dõi và audio đôi lúc không nhất quán; đây là tín hiệu cần QA, không
  phải kết luận thống kê.
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

| Năng lực benchmark | Bằng chứng HANZI.OS hiện tại | Trạng thái | Đích nghiệm thu Reforge |
| --- | --- | --- | --- |
| Inventory HSK0–HSK4 | 4 bridge + 213 rich lesson; 2.016 từ, 1.096 chữ, 332 ngữ pháp | **Keep** | Audit lại từng mapping/activity; chỉ tính item người học thật sự luyện |
| Prerequisite/version/content gate | Package, prerequisite, authorization và validator đã có | **Keep** | Giữ ID/version, đơn giản hóa lỗi learner-facing, không mở draft |
| Offline persistence/evidence | Local store, IndexedDB/outbox/idempotency và recovery đã có | **Keep** | Một vòng học không mất/nhân đôi dữ liệu qua reload/offline/account migration |
| FSRS review | Ký Ức Trận và scheduler có sẵn | **Keep** | Review dùng cùng item graph cho lesson, bank, bookmark và lỗi |
| Mistake remediation | Nghịch Cảnh Lục có evidence và luồng luyện lại | **Keep** | Gom vào Ôn, giải thích lỗi và xác nhận gọi lại trễ trước khi “đã khắc phục” |
| Assessment session/versioning | Level Check HSK1–4, session và receipt có sẵn | **Keep** | Tái dùng hạ tầng cho blueprint kiểm tra mới, không lộ đáp án trước submit |
| Lộ trình course | Thiên Lộ có unit, khóa/mở và lesson link | **Rebuild** | Bản đồ dễ đọc, objective/prerequisite rõ, không che bài đầu, mobile-first |
| IA và navigation | Sidebar có khoảng 10 đích với tên fantasy; mobile dùng menu phụ | **Rebuild** | Đúng 5 khu vực Học (landing Hôm nay)/Ôn/Nói/Luyện/Hồ sơ; tên phổ thông là nhãn chính |
| Dashboard/daily loop | Thức Tỉnh Điện có nhiều panel, metric, hệ thống hologram | **Rebuild** | Một CTA tiếp tục, việc đến hạn và kết phiên rõ; chi tiết mở dần |
| Lesson presentation | Shared rich UI có nội dung nhưng dài và mode chưa thành engine nhất quán | **Rebuild** | Chuỗi card ngắn: giải thích → guided practice → retrieval → remediation |
| Exercise engine | Có select/order/input/lesson checks rải theo màn | **Rebuild** | Registry schema-driven cho nghe, nghĩa, sắp câu, cloze, dictation, nói, viết, đọc |
| Nhập chữ Hán | Có trợ lý Pinyin→Hanzi ở một số input | **Rebuild** | Input helper dùng chung: Pinyin candidates, chọn chữ, viết tay/fallback mọi bài |
| Pronunciation | Vạn Âm Điện dùng browser speech/TTS và phase UI | **Rebuild** | Tách transcript khỏi pronunciation; contour thanh điệu có calibration và fallback |
| Character learning | Thần Văn Lô chủ yếu là catalog nhận dạng 1.096 chữ | **Rebuild** | Character bank + component/radical + tracing/recall + SRS theo level |
| Reader | Vạn Quyển Các có text, inspector, question và persistence | **Rebuild** | Graded story/dialogue catalog, audio/transcript, bookmark và item handoff sang Ôn |
| Dictionary/word bank | Tàng Tự Khố có catalog 2.016 mục | **Rebuild** | Word Bank theo HSK/chủ đề, ví dụ/audio, search, activity và custom deck |
| Analytics/mastery | Thất Trụ đã chuyển sang lượt hợp lệ nhưng bề mặt vẫn tách khỏi vòng học | **Rebuild** | Độ phủ unique item + retention + evidence theo kỹ năng, không phần trăm non trẻ |
| Mock exam | 8 form × 12 câu, 18–35 phút; không phải đề đầy đủ | **Rebuild** | Tách mini practice khỏi mô phỏng đúng blueprint/thời lượng công bố; câu hỏi gốc |
| Hologram/motion | 3D/scan/signal/voice overlays; đã có reduced-motion một phần | **Rebuild** | Semantic tokens, motion tiết chế, không route flicker, reduced-motion đầy đủ |
| Account UI | Guest/local và HANZI.OS hoạt động; Google/Facebook chờ config | **Rebuild** | Luồng đăng ký/đăng nhập/phục hồi đơn giản; guest không bị chặn học |
| Knowledge cards | Nội dung sâu có thể tồn tại trong lesson nhưng chưa là bước dạy nhất quán | **New** | Card mục tiêu, mẫu câu, grammar, chữ/âm trước activity; mở lại được khi cần |
| Bookmark và custom deck | Chưa có trải nghiệm learner-facing xuyên module | **New** | Bookmark mọi item; tạo/sửa/xóa deck; dedupe và đưa vào FSRS |
| Phrasebook | Chưa có module theo tình huống dùng nhanh | **New** | Phrasebook gốc theo chủ đề HSK0–4, audio, tốc độ, pin và ôn |
| Fluency/dialogue builder | Dialogue có trong rich lesson nhưng chưa thành catalog luyện độc lập | **New** | Hội thoại phân cấp với role-play, shadowing, biến thể và SRS handoff |
| Practice Zone games | Chưa có bộ game chung ngoài các exercise trong lesson | **New** | Game ngắn dùng inventory thật; điểm game không tự thành mastery |
| Tone training chuyên biệt | Có pronunciation phrase, chưa có curriculum thanh điệu hiệu chuẩn | **New** | HSK0 tone course: perception → production → minimal pairs → câu, có acoustic evidence |
| Handwriting engine | Chưa có tracing/recognition dùng được xuyên character curriculum | **New** | Canvas touch/mouse, stroke-order hint, tolerance, recall và non-IME fallback |
| AI/conversation tutor | Nút/trợ lý hiện tại không tương đương hội thoại sư phạm | **New** | 100+ kịch bản gốc có local state machine; AI adapter tùy chọn và guardrail |
| Native/licensed audio | Chủ yếu browser TTS synthetic | **New** | Audio người thật được thu/duyệt/cấp quyền cho nội dung chấm nghe; TTS chỉ preview |
| Course placement/onboarding | Có onboarding hệ thống nhưng chưa placement theo mục tiêu/năng lực | **New** | Chọn mục tiêu, thời gian, trình độ; diagnostic chỉ mở khóa khi có bằng chứng |
| Public Google/Facebook OAuth | Route/config có sẵn nhưng localhost chưa chứng minh public flow | **Defer** | Chỉ bật khi chủ dự án có domain/credential; không là blocker local release |
| Taiwan/Cantonese/HSK5+ | Không thuộc inventory khóa | **Defer** | Không làm trong 100 task; kiến trúc có thể mở rộng nhưng không author content |
| League/social/paywall/commerce | XP/streak local có, không có social product hoàn chỉnh | **Defer** | Giữ streak nhẹ nếu hữu ích; không xây league/paywall trong đồ án local |
| Native iOS/Android | Web/PWA | **Defer** | Hoàn thiện responsive PWA; app native là roadmap riêng |
| Admin/CMS/production ops | Admin, role, Studio và worker đã có nhưng không tăng giá trị phiên học ngay | **Defer** | Bảo toàn, chỉ sửa blocker correctness; không mở dự án hạ tầng mới |

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

# Benchmark ChineseSkill cho HANZI.OS

**Kiểm tra nguồn:** 10/08/2026.

**Mục đích:** định nghĩa taxonomy chức năng và ngưỡng chất lượng để kiểm thử
HANZI.OS; không phải đặc tả sao chép ChineseSkill.

## 1. Cách đọc bằng chứng

- **Observed:** trực tiếp thấy trên trang/web công khai ở ngày kiểm tra.
- **Claimed:** nhà phát hành/store/support mô tả; chưa phải bằng chứng chất lượng
  hoặc hành vi runtime.
- **Historical:** mô tả phiên bản cũ, chỉ dùng sinh giả thuyết.
- **Unverified:** nguồn cộng đồng/thứ cấp, không dùng làm source of truth.

Không có quan sát đăng nhập đầy đủ trên mobile app trong audit này. Vì vậy các
chi tiết paywall, thuật toán SRS, chấm phát âm, catalog item và hành vi Premium
không được khẳng định nếu nguồn chỉ nêu tên tính năng.

## 2. Sổ nguồn

| ID | Nguồn | Loại và giới hạn |
| --- | --- | --- |
| `CS-HOME` | [Trang chủ ChineseSkill](https://www.chineseskill.com/home) | Claimed: zero→HSK4, bài ngắn, nhiều kỹ năng và đa thiết bị; không chứng minh coverage/chất lượng. |
| `CS-WEB` | [Web course công khai](https://www.chineseskill.com/learn-chinese/cn/en) | Observed: map công khai có topic node, TestOut và đích hoàn thành tại ngày kiểm tra; không suy ra catalog mobile. |
| `CS-PRICE` | [Bảng giá](https://www.chineseskill.com/learnchinese/pricing) | Claimed: Main Course, SRS, Pinyin, Tone, AI và Booster; entitlement theo nền tảng chưa xác minh. |
| `CS-SUPPORT` | [Support](https://support.chineseskill.com/en/support/solutions), [TestOut](https://support.chineseskill.com/en/support/solutions/articles/70000154975-what-is-testout-), [login](https://support.chineseskill.com/en/support/solutions/articles/70000154972-how-can-i-check-my-login-method-) | Historical/claimed; hai bài chi tiết ghi sửa 25/04/2021. |
| `CS-GPLAY` | [Google Play](https://play.google.com/store/apps/details?hl=en-US&id=com.chineseskill) | Claimed trên store: course/review/AI/booster/script/media/SRS/speech/offline/league. |
| `CS-APPSTORE` | [Apple App Store](https://apps.apple.com/us/app/chineseskill-learn-chinese/id777111034) | Claimed trên store: bài ngắn, speech, handwriting, story/listening, native media, sync/offline. |
| `CS-LEGAL` | [Điều khoản](https://www.chineseskill.com/terms-conditions-html), [riêng tư](https://www.chineseskill.com/privacypolicy-html) | Policy về tài khoản/dịch vụ/dữ liệu/IP; không chứng minh UX học. |
| `CALL-EJ` | [CALL-EJ paper](https://callej.org/index.php/journal/article/download/41/28/170) | Historical secondary về phiên bản cũ; không mô tả UI 2026. |
| `DEV-TONE` | [Bài cộng đồng về tone](https://www.reddit.com/r/ChineseLanguage/comments/1pisqk8/we_have_free_tone_training_lessons_in_our_app/) | Unverified; chỉ gợi ý câu hỏi kiểm thử segment/pitch. |

## 3. Taxonomy năng lực dùng làm benchmark

### Course và bài học

- một lộ trình chính theo cấp độ, nhìn được prerequisite và bước tiếp theo;
- placement/TestOut có giới hạn, không tự cấp mastery chỉ từ tự khai;
- bài ngắn có mục tiêu, input/knowledge card trước recall;
- phối hợp từ, chữ, Pinyin, ngữ pháp, nghe, nói, đọc và viết theo độ khó;
- nhiều activity type, feedback giải thích lỗi và remediation trong cùng journey.

### Ôn và ghi nhớ

- SRS/FSRS cho item có stable ID/version;
- mistake review, bookmark và deck cá nhân không nhân bản knowledge item;
- queue ưu tiên theo hạn, kỹ năng và lỗi; XP/streak tách khỏi mastery;
- số liệu cho biết mẫu evidence và coverage, không đổi vài lượt thành 100%.

### Nói, thanh điệu và hội thoại

- khóa Pinyin/thanh điệu có contrast, perception và production;
- shadowing/hội thoại có script, transcript và fallback không dùng microphone;
- transcript speech-to-text không được gọi là điểm phát âm;
- claim acoustic/tone scoring chỉ mở khi có provider/corpus, rubric, consent và
  validation phù hợp.

### Luyện mở rộng

- handwriting có stroke provenance và fallback chọn token/Pinyin;
- Reader/story/listening gắn lookup, saved item và comprehension;
- phrasebook, kho từ/chữ, drill/game phục vụ Main Course thay vì tranh CTA;
- luyện đề theo cấu trúc công khai hợp lệ, item nguyên bản, không quảng bá mock
  rút gọn là “đề thật”.

### Tiến độ, tài khoản và offline

- học guest đầy đủ, reload/offline/restore không mất hành trình;
- một learner UI cho guest/account, sync là adapter bên dưới;
- cài đặt script, âm thanh, accessibility và dữ liệu dễ tìm;
- account/provider không trở thành điểm lỗi duy nhất của lõi học.

## 4. Ma trận benchmark theo module HANZI.OS

Trạng thái trong bảng là câu hỏi nghiệm thu, không phải tuyên bố module đã hoàn
thiện. Trạng thái thật của phiên làm việc nằm ở `IMPLEMENTATION_CHECKPOINT.md`.

| Module | Ngưỡng parity cần quan sát trên HANZI.OS | Bằng chứng chính |
| --- | --- | --- |
| Onboarding & shell | Người mới hiểu sản phẩm, chọn mục tiêu và thấy một CTA tiếp tục; tối đa năm vùng rõ nghĩa | Browser smoke + usability |
| Course & lesson | HSK0–4 mở theo prerequisite; mỗi bài có teach→guided→recall→feedback→finish | Runtime journey + content audit |
| Review & mistakes | FSRS, lỗi, bookmark/deck dùng chung ID; queue phục hồi được | State/evidence test + UI journey |
| Pronunciation & speech | Pinyin/tone/listening/speaking tách modality và nói đúng giới hạn scoring | Device/fallback smoke + provenance |
| Characters & handwriting | Stroke data có quyền/provenance; không có IME vẫn hoàn thành được | Content gate + touch/keyboard test |
| Reader & dictionary | Đọc trong ngữ cảnh, lookup, lưu và ôn lại được | End-to-end journey |
| Progress & analytics | Coverage/mastery theo evidence đủ mẫu; không lộ CI/jargon dev ở learner UI | Policy test + comprehension review |
| Assessment | Level check/mock có blueprint rõ, resume, lịch sử và claim trung thực | Form/session/scoring test |
| Account, roles & Studio | Guest học được; HANZI.OS local dùng được; OAuth chưa cấu hình nói rõ; role có UI và server auth | Role/deep-link/API smoke |
| Offline, backup & sync | Reload, offline, export/import và guest↔account không mất/chiếm nhầm state | Recovery fixtures + browser smoke |

## 5. Pattern nên học, không nên sao chép

Có thể áp dụng:

- taxonomy chức năng, nhịp lesson, progressive disclosure và một đường học chính;
- ý tưởng đo activation, completion, recall trễ, time-to-resume và task success;
- heuristic về bài ngắn, xen kẽ modality, sửa lỗi và review đúng hạn;
- yêu cầu offline, accessibility, recovery và minh bạch claim.

Không được lấy:

- source code, API, schema/data đóng hoặc thuật toán độc quyền;
- layout/pixel, trade dress, mascot, icon, screenshot hoặc tên thương mại;
- lesson text, câu hỏi, distractor, audio/video/ảnh và media trong app;
- catalog trích xuất bằng reverse engineering hoặc nội dung premium;
- tuyên bố marketing của ChineseSkill làm bằng chứng HANZI.OS đã đạt hiệu quả.

Mọi wording, activity, item và asset của HANZI.OS phải nguyên bản hoặc có
license/provenance rõ. Nguồn HSK công khai chỉ dùng để hiểu cấu trúc/inventory;
không biến câu hỏi có bản quyền thành ngân hàng đề.

## 6. Những điều phải tự kiểm chứng

- người mới có hoàn thành bài đầu mà không được hướng dẫn trực tiếp không;
- lesson length có tạo recall thật hay chỉ tạo nhiều lượt chạm;
- error explanation/remediation có giảm lại cùng lỗi sau 1 và 7 ngày không;
- queue ôn có ưu tiên đúng item yếu mà không spam lặp;
- fallback mic/IME/handwriting có giữ được mục tiêu học tương đương không;
- reduced motion/mobile/offline có chạy trọn journey không;
- số mastery/coverage người học hiểu đúng và có đủ evidence không.

ChineseSkill là mốc để đặt câu hỏi và ngưỡng trải nghiệm. Quyết định cuối phải
dựa trên Product Vision, dữ liệu/claim hợp lệ của HANZI.OS và kiểm thử với người
dùng của chính sản phẩm.

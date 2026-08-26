# HANZI.OS Reforge — tầm nhìn sản phẩm

**Trạng thái:** nguồn định hướng sản phẩm cho giai đoạn tái cấu trúc
**Cập nhật:** 10/08/2026
**Phạm vi:** Mandarin Trung Quốc đại lục, giao diện tiếng Việt, HSK0–HSK4,
local-first

## 1. Đích đến

HANZI.OS là ứng dụng tự học tiếng Trung có chiều sâu tương đương một sản phẩm
chuyên biệt như ChineseSkill trong **phạm vi Mandarin HSK0–HSK4**, nhưng dùng
nội dung, mã nguồn, âm thanh, hình ảnh và nhận diện thương hiệu do HANZI.OS tự
tạo hoặc có quyền sử dụng.

“Hệ thống thức tỉnh hologram” là lớp nhận diện cảm xúc: nó làm hành trình học
thú vị hơn nhưng không được che nghĩa, làm rối điều hướng, gây chớp/giật hoặc
biến thuật ngữ nghiệp vụ thành nội dung người học phải hiểu.

### Hợp đồng sản phẩm canonical

- **North-star:** Học tiếng Trung rõ đường, nhớ lâu, dùng được.
- **Người học:** Người Việt tự học từ số 0 đến HSK4.
- **Ngôn ngữ:** Mandarin Trung Quốc đại lục, chữ giản thể và Pinyin.
- **Nền tảng:** Web/PWA local-first; lõi học HSK0–HSK4 dùng ẩn danh đầy đủ và
  giữ tiến độ trên thiết bị; tài khoản và AI ngoài chỉ là tùy chọn.
- **Trạng thái:** Đây là hợp đồng đích Reforge đang được triển khai, không phải tuyên bố mọi chức năng đã hoàn tất.
- **Năm khu vực duy nhất:** **Học**, **Ôn**, **Nói**, **Luyện**, **Hồ sơ**.
- **Vòng học chính:** Học/Hôm nay → bài ngắn → Ôn → Nói hoặc Luyện → kết phiên.
- **Ranh giới:** ChineseSkill chỉ là benchmark chức năng và ngưỡng chất lượng;
  HANZI.OS dùng trải nghiệm, nội dung và tài sản nguyên bản hoặc có quyền sử dụng.

## 2. “Tương đương ChineseSkill” nghĩa là gì

Mục tiêu là **parity về công năng và phương pháp học**, không phải bản sao:

- một lộ trình chính theo cấp độ, bài ngắn và mục tiêu rõ;
- dạy đồng thời từ vựng, chữ Hán, Pinyin, ngữ pháp, nghe, nói, đọc và viết;
- knowledge card trước khi kiểm tra, nhiều dạng tương tác trong cùng một bài;
- ôn giãn cách, sửa lỗi, đánh dấu và bộ thẻ cá nhân;
- luyện thanh điệu, phát âm, hội thoại, viết chữ và đọc theo ngữ cảnh;
- kho mở rộng gồm cụm từ, hội thoại, từ, chữ, bài đọc và trò luyện;
- tiến độ trung thực theo bằng chứng kỹ năng, hoạt động offline và phục hồi được.

Không xem là parity nếu chỉ có cùng tên màn hình, cùng số bài, nhiều animation,
hoặc dữ liệu đã sinh nhưng người học chưa mở và hoàn thành được trên UI.

## 3. Phạm vi sản phẩm khóa cứng

| Thuộc tính | Quyết định |
| --- | --- |
| Người học | Người Việt bắt đầu từ số 0 đến tự học HSK4 |
| Ngôn ngữ đích | Mandarin Trung Quốc đại lục, chữ giản thể và Pinyin |
| Nền tảng | Web/PWA responsive, local-first; desktop và mobile dùng cùng lõi |
| Nội dung lõi | 4 bài HSK0 và 213 bài HSK1–HSK4 đang có, phải kiểm định lại độ sâu |
| Inventory khóa | 2.016 mục từ, 1.096 chữ, 332 điểm ngữ pháp; chỉ tính mục được luyện thật |
| Danh tính | Học ẩn danh/local đầy đủ; tài khoản HANZI.OS để phục hồi và đồng bộ |
| AI | Trợ luyện hội thoại có kịch bản local; adapter AI ngoài là tùy chọn, không là điểm lỗi duy nhất |
| Chủ đề | Hologram tiết chế, dễ đọc, giảm chuyển động được, không thay ngôn ngữ chức năng |

## 4. Kiến trúc thông tin: đúng năm khu vực

Mọi chức năng learner-facing phải nằm trong năm khu vực chính; mobile không có
thêm một hệ điều hướng cạnh tranh.

| Khu vực | Việc người học đến để làm | Nội dung nằm bên trong |
| --- | --- | --- |
| **Học** | Biết ngay nên làm gì tiếp và đi theo lộ trình HSK0–HSK4 | Landing “Hôm nay” với một CTA “Tiếp tục”, rồi bản đồ khóa học, unit, lesson, knowledge card và checkpoint |
| **Ôn** | Gọi lại và sửa chỗ yếu | FSRS, lỗi, bookmark, bộ thẻ cá nhân, ôn theo kỹ năng |
| **Nói** | Luyện thanh điệu và giao tiếp có phản hồi | Khóa Pinyin/thanh điệu, shadowing, phát âm, hội thoại theo kịch bản và AI tutor tùy chọn |
| **Luyện** | Dùng kiến thức ngoài lộ trình | Viết chữ, Reader, phrasebook, kho từ/chữ, game và luyện đề |
| **Hồ sơ** | Xem mục tiêu và kiểm soát ứng dụng | Tiến độ, tài khoản, âm thanh, script, accessibility và dữ liệu |

### Giọng hệ thống canonical

- HANZI.OS nói bằng giọng **hệ thống · nhiệm vụ · chuyển sinh · tu luyện**; các
  thuật ngữ cốt lõi gồm **Khảo Luyện, Thí Luyện, Thử Luyện, Mạo Hiểm Giả, Hành
  Giả, Cảnh Giới, Thiên Lộ, Ký Ức Trận**.
- Danh tính guest mặc định và fallback luôn là **Hành giả vô danh**; không tự
  đổi thành “Người học HANZI.OS”.
- Navigation cấp cao vẫn là **Học, Ôn, Nói, Luyện, Hồ sơ**. Thuật ngữ lore được
  dùng trong tiêu đề, nhiệm vụ và phản hồi, nhưng lần xuất hiện dễ mơ hồ phải có
  lời giải nghĩa ngắn, ví dụ “Khảo Luyện · khảo sát trình độ”.
- Giọng hệ thống không được biến receipt, schema, hash, CI hay policy nội bộ
  thành thông báo cho người học.

## 5. Vòng học hằng ngày

Một phiên chuẩn kéo dài 10–20 phút và không buộc người học tự ghép nhiều màn:

1. Mở **Học** ở landing **Hôm nay** và thấy đúng một việc quan trọng nhất.
2. Học một lesson 5–10 phút: hiểu trước, luyện có hướng dẫn, rồi tự gọi lại.
3. Nhận giải thích ngay cho lỗi; lỗi có giá trị mới đi vào hàng ôn.
4. Ôn 3–7 mục FSRS đến hạn, ưu tiên kỹ năng yếu và không suy mastery từ XP.
5. Làm một hoạt động chuyển giao ngắn: nói, viết, đọc hoặc hội thoại.
6. Kết phiên bằng điều đã tiến bộ và việc kế tiếp; không hiện log, CI, receipt,
   schema, confidence interval hay trạng thái nội bộ.

Người học luôn có thể bỏ qua micro/loa, tắt hiệu ứng và tiếp tục offline mà
không mất tiến độ.

## 6. Nguyên tắc trải nghiệm bắt buộc

- **Nội dung trước chủ đề:** câu hỏi, đáp án và phản hồi là lớp thị giác nổi bật
  nhất; hologram không được cạnh tranh sự chú ý.
- **Một hành động chính:** mỗi màn chỉ có một CTA nổi trội; tính năng phụ mở theo
  progressive disclosure.
- **Ổn định:** không chớp route phục hồi, không tự cuộn, không layout shift khi
  dữ liệu/tài khoản được nạp; animation chỉ giải thích thay đổi trạng thái.
- **Mobile-first:** vùng chạm tối thiểu 44 × 44 px, tối đa năm mục điều hướng,
  không phụ thuộc hover, bàn phím vật lý hoặc màn hình rộng.
- **Nhập tiếng Trung có trợ giúp:** Pinyin→Hanzi, lựa chọn ký tự, viết tay hoặc
  đáp án thay thế phải có ngay tại bài; không giả định máy đã cài IME Trung.
- **Tiến độ trung thực:** hiển thị số bằng chứng hợp lệ và độ phủ inventory;
  không đổi vài lần làm bài thành “100% thành thạo”.
- **Âm thanh trung thực:** browser TTS chỉ là hỗ trợ nghe; không được gắn nhãn
  giọng bản ngữ hoặc bằng chứng phát âm. Điểm thanh điệu cần tín hiệu âm học và
  ngưỡng đã hiệu chuẩn, không chỉ transcript của speech recognition.
- **Accessible by default:** WCAG 2.2 AA, keyboard/focus rõ, contrast đạt chuẩn,
  phụ đề/transcript và `prefers-reduced-motion` đầy đủ.
- **Ngôn ngữ người học:** không đưa thuật ngữ dev, policy hay disclaimer dài vào
  luồng thường; thông tin pháp lý nằm đúng trang Trợ giúp/Thông tin.

### Hướng thị giác khóa cho Reforge

- Nền OLED tối, chữ sáng có độ tương phản cao; cyan/emerald là accent chính và
  glow chỉ dùng để báo trạng thái hoặc dẫn mắt, không phủ liên tục toàn màn hình.
- UI tiếng Việt dùng **Be Vietnam Pro**; Hanzi/Pinyin ưu tiên **Noto Sans SC** với
  fallback hệ thống rõ ràng. Không dùng font hoạt hình cho nội dung học dài.
- Không dùng scanline, glitch, flicker, hạt chạy nền hoặc parallax liên tục.
  Chuyển động phản hồi giữ trong khoảng 150–300 ms và tắt được bằng
  `prefers-reduced-motion`.
- Focus keyboard phải nhìn thấy rõ (viền tương phản khoảng 3 px); touch target
  tối thiểu 44 × 44 px; màu không được là tín hiệu duy nhất.

## 7. Cổng hoàn thành sản phẩm

Chỉ được tuyên bố “hoàn thiện Reforge HSK0–HSK4” khi tất cả cổng sau cùng xanh.

### 7.1 Nội dung học được

- HSK0 **4/4** và HSK1–HSK4 **213/213** đều mở được trên cùng rich Lesson UI;
- đủ 2.016 mục từ, 1.096 chữ và 332 điểm ngữ pháp được map tới lesson, hoạt động
  chấm được và ôn trễ; không tính inventory chỉ có trong JSON;
- mỗi lesson có mục tiêu/prerequisite, knowledge card, ngữ cảnh tự nhiên, ít
  nhất ba phương thức luyện phù hợp, đáp án–distractor–giải thích và remediation;
- mỗi item có provenance, năm pass AI self-review và công bố
  `humanReviewed: false` trong metadata; không ngụ ý chứng nhận HSK chính thức;
- bài nghe chấm điểm dùng audio do con người thu/duyệt và có quyền sử dụng;
  TTS chỉ còn vai trò preview/hỗ trợ.

### 7.2 Lõi học tập

- vòng Học/Hôm nay → Lesson → Ôn → Nói hoặc Luyện → kết phiên chạy end-to-end khi online,
  offline, reload giữa chừng và sau khi đổi guest↔account;
- bằng chứng tách đúng bảy kỹ năng; XP/streak không mở mastery;
- FSRS, lỗi, bookmark và bộ thẻ cá nhân dùng chung item ID/version, không nhân
  đôi attempt khi retry;
- phát âm/thanh điệu, viết chữ, hội thoại, Reader và luyện đề đều có ít nhất một
  luồng hoàn chỉnh, phản hồi hữu ích và fallback không chặn người học.

### 7.3 UX và chất lượng

- đúng năm khu vực chính, không quá một CTA nổi trội trên mỗi trạng thái;
- không còn route flicker hoặc lớp hiệu ứng gây giật trong smoke 30 phút;
- mobile 360 px không tràn ngang; keyboard, screen reader và reduced-motion qua
  checklist; các màn cốt lõi đạt WCAG 2.2 AA;
- ít nhất 5 người chưa biết repo hoàn thành “học bài đầu”, “ôn lỗi”, “luyện phát
  âm”, “tìm chữ” và “tiếp tục phiên dở” với tỷ lệ thành công ≥80% mà không được
  hướng dẫn trực tiếp;
- targeted validator/test và UI smoke xanh cho từng lô; full gate xanh một lần
  tại ranh giới release candidate.

### 7.4 Pháp lý và khả năng tự chủ

- không có nội dung, audio/video, ảnh, screenshot, tên gọi hoặc asset sao chép
  từ ChineseSkill; nguồn tham khảo và giấy phép được lưu theo artifact;
- ứng dụng local không phụ thuộc ChatGPT Plus, Sites hay một phiên Codex để chạy;
- tài khoản Google/Facebook chỉ bật khi có domain và OAuth credential của chủ dự
  án; guest và HANZI.OS local vẫn học đầy đủ khi chúng chưa bật.

### 7.5 Kế hoạch thực thi

- toàn bộ module trong checkpoint được người dùng kiểm thử và xác nhận bằng
  journey/acceptance quan sát được;
- mỗi thời điểm chỉ mở một module chính; không chuyển module khi luồng đang kiểm
  còn lỗi correctness, data-loss, accessibility hoặc UX chặn thao tác;
- capability bắt buộc trong benchmark phải có runtime/UI evidence; “đã code
  nhưng chưa thử” không được tính là hoàn thành.

## 8. Thước đo tiến độ mới

Con số **96/100** trước đây chỉ đo roadmap kỹ thuật đã đóng. Nó không đo khả năng
tìm đường, chất lượng sư phạm, audio bản ngữ, độ đúng của chấm phát âm hoặc mức
người học dùng được. Vì vậy:

- không tiếp tục báo phần trăm/tổng task làm thước đo parity;
- tiến độ chính là trạng thái module `CHỜ TEST`, `ĐÃ DUYỆT` hoặc `CÒN LỖI`, kèm
  journey mà người dùng thật sự làm được;
- luôn báo riêng nội dung UI theo HSK0, HSK1, HSK2, HSK3, HSK4;
- báo riêng lesson qua audit sâu, item có activity thật, capability đã kiểm và
  kết quả usability gần nhất;
- không quy đổi code, generated JSON, số test hoặc màn hình chưa nối runtime
  thành tiến độ sản phẩm.

## 9. Ngoài phạm vi local product hiện tại

- khóa học Taiwan Mandarin, Cantonese, HSK5+ hoặc ngôn ngữ giao diện ngoài Việt;
- sao chép giao diện, nội dung, media, API hoặc mô hình thương mại ChineseSkill;
- app iOS/Android native, league xã hội, quảng cáo, paywall và commerce;
- production deployment, vận hành đa tenant, marketplace và CMS quy mô lớn;
- tuyên bố “giọng bản ngữ”, “AI chấm phát âm chuẩn” hoặc “đề thi thật” khi chưa
  có nguồn, quyền sử dụng và kiểm định tương ứng.

Các mục ngoài phạm vi chỉ được mở khi người dùng chủ động thay đổi tầm nhìn và
module critical path hiện tại không bị bỏ dở để chạy theo tính năng mới.

# HANZI.OS — Implementation checkpoint

**Cập nhật:** 24/08/2026

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
| Offline, backup và sync | `NOT-REVIEWED` | Offline shell; export/import; owner/reset/outbox không mất dữ liệu |

Module tiếp theo do người dùng chọn sau khi test web; không tự mở nhiều module
song song.

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

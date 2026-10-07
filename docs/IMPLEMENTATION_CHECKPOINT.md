# HANZI.OS — Implementation checkpoint

## Ký Ức Trận / Bảng Trạng Thái · phản hồi xác minh và thứ tự giọng · 07/10/2026

- **Module:** Review verification / status voice — IN-REVIEW.
- **Người học thấy gì:** Tách xác minh đang chạy khỏi thất bại khi còn cache; hai bước khôi phục/xác minh và CTA phù hợp trạng thái mạng. Thành công chuyển vào lượt ôn. Giọng chào chờ hai frame và hoạt cảnh mở hữu hạn; đóng bảng hủy lời chào.
- **Đã kiểm:** Typecheck, targeted lint qua; browser mở được bảng. Chưa tái hiện cache tài khoản của người dùng và chưa nghe trên Cốc Cốc. Full check của mốc Git dừng tại 7 lỗi unused-vars có trước trong scripts/demo; không coi toàn bộ workspace đã qua gate.
- **Dữ liệu giữ được:** Không đổi cache/owner/reset/evidence/ví hoặc inventory 4/40/40/55/78, 213 rich. Không sửa docs/reports/output hay dữ liệu .wrangler.
- **Tiếp theo:** Người dùng test retry và thứ tự giọng trên Cốc Cốc; commit/push nhánh hiện tại theo yêu cầu, không deploy.

## Vạn Quyển Các · hình khối sách · 07/10/2026

- **Module:** Reader library / cover — IN-REVIEW.
- **Người học thấy gì:** Giữ ảnh bìa, thêm gáy cong với rãnh đóng sách, lớp giấy cạnh phải/đáy và bìa sau. Độ dày nằm trong footprint, bóng tĩnh; hover/focus chỉ dịch nhẹ, bỏ chuyển động filter.
- **Đã kiểm:** Typecheck và scoped diff-check qua. Browser thư viện 1280×800, mobile 375×812 và bìa nhỏ trang mô tả; không tràn ngang mobile, mép giấy không chồng tên. Giữ quy tắc reduced-motion sẵn có. Ảnh tmp/reader-books-desktop.png.
- **Dữ liệu giữ được:** Chỉ sửa CSS, giữ ảnh/nội dung/IDs/tiến độ/ví/session/outbox; inventory 4/40/40/55/78, 213 rich không đổi. Không migration/commit/push/deploy.
- **Tiếp theo:** Web local port 3000 đang chạy, chờ người dùng test tạo hình sách.

## Bảng Triệu Hồi · tự phát giọng khi mở · 07/10/2026

- **Module:** Bảng Triệu Hồi / âm thanh — IN-REVIEW.
- **Người học thấy gì:** Nút Triệu hồi và Alt+S gọi lời chào “Đồng bộ hồ sơ hoàn tất, bảng trạng thái sẵn sàng.” ngay trong thao tác mở, dùng clip status.summary theo voice profile hiện có. Bỏ effect đọc lời cũ sau 250ms; giữ mute/volume, không tự bật thông báo giọng cho các module khác.
- **Đã kiểm:** Browser mở bằng nút, Escape đóng và Alt+S mở lại; file mechanical-core-v1/status-summary.mp3 trả 200 sau mở, không cần bấm đọc. Chưa xác nhận âm phát ra loa trên Cốc Cốc của người dùng. Typecheck, targeted lint và 3 voice-pack test qua.
- **Dữ liệu giữ được:** Chỉ đổi điểm gọi announce; không thay profile preferences, learner data, ví, session/outbox hoặc inventory 4/40/40/55/78, 213 rich. Không commit/push/deploy.
- **Tiếp theo:** Người dùng mở Bảng Triệu Hồi để nghe thử; chưa USER-ACCEPTED.

## Thiên Lộ · màn chuẩn bị nội dung bài · 07/10/2026

- **Module:** Lesson content loading — IN-REVIEW.
- **Người học thấy gì:** Thay dòng chữ trong khung trống bằng học quyển ngọc/vàng, tên bài, trạng thái tải, khung chờ nội dung và nút về Thiên Lộ. Hai trạng thái đọc cache/khôi phục vị trí dùng cùng khung, thông báo riêng. Không phần trăm giả, không trì hoãn tải hoặc thay đổi luồng ready/fallback.
- **Đã kiểm:** Typecheck, targeted lint và 11 test sequence/reading session qua; scoped diff-check qua. Browser bài boot-1 ở trạng thái tải thực (tạm giữ riêng Fetch projection learning) và chuyển sang reader khi có dữ liệu; desktop 1280×720, mobile 375×812, landscape 812×375 không tràn ngang, back 44px, phần giữa không cuộn ở các kích thước này. Reduced-motion tắt cả hai animation. Đã gỡ interception/media/viewport thử nghiệm. Ảnh tmp/lesson-content-loading-desktop.png và tmp/lesson-content-loading-mobile.png. Một lần mở trực tiếp gặp worker network error, reload phục hồi.
- **Dữ liệu giữ được:** Chỉ thay UI loading của LessonTheoryPanel và ResumableLessonReader; giữ owner scope, cache, drafts, attempts, session/outbox, IDs và inventory 4/40/40/55/78, 213 rich. Không sửa API/content/.wrangler/docs/reports/output; không commit/push/deploy.
- **Tiếp theo:** Web local đang bật để người dùng mở bài test; chưa USER-ACCEPTED.

## Header · bỏ nhãn Premium lặp · 07/10/2026

- **Module:** Header — IN-REVIEW.
- **Người học thấy gì:** Nút Premium đổi dòng nhỏ từ “KHÁM PHÁ PREMIUM” thành “KHÁM PHÁ”, giữ chữ Premium lớn.
- **Đã kiểm:** Browser xác nhận hai dòng “KHÁM PHÁ / Premium”; ảnh tmp/premium-header-label.png. Typecheck qua.
- **Dữ liệu giữ được:** Chỉ sửa nhãn; không đổi dữ liệu, quyền, giao dịch hoặc inventory 4/40/40/55/78 và 213 rich.
- **Tiếp theo:** Chờ người dùng test; chưa USER-ACCEPTED.

## Premium · khung hình đầu, quyền luyện đề và giá VNĐ · 07/10/2026

- **Module:** Premium UI + giá niêm yết quản trị — IN-REVIEW.
- **Người học thấy gì:** Đưa hero lên cao, rút gọn thẻ gói; hiển thị cả tháng/năm và quyền mở bài Thiên Lộ HSK4 cùng cửa Phòng Luyện Đề đánh dấu Premium. Ví Hanzi chuyển lên góc đầu trang, mở popup giao dịch. Mobile dùng hai ô kỳ hạn cạnh nhau. Theo ủy quyền chọn giá của người dùng: 79.000đ/tháng, 699.000đ/năm; admin chỉnh giá VNĐ độc lập với giá Hanzi ở /admin/premium. Chỉ niêm yết giá, thanh toán tiền thật chưa mở.
- **Đã kiểm:** Typecheck, targeted ESLint, db:check và scoped diff-check qua; 15 test repository/admin/boundary qua, gồm rollback khi audit lỗi, chặn thiếu step-up/cross-origin/giá sai, giá VNĐ không sửa ví hoặc giá Hanzi. Browser 1280×640: hero kết thúc ở 529 px, thẻ gói 636 px, CTA 525 px; mobile 360×800: CTA 627 px, thanh điều hướng bắt đầu 734 px, không tràn ngang. Nút ví mới mở/đóng popup đúng. Ảnh tmp/premium-first-viewport-desktop.png và tmp/premium-first-viewport-mobile.png. Chưa kiểm form admin bằng tài khoản quản trị trên browser; luồng ghi đã kiểm bằng test.
- **Dữ liệu giữ được:** Migration 0034 chỉ thêm bảng premium_vnd_prices và hai giá ban đầu; không sửa wallet/orders/progress/FSRS/session/outbox/owner/reset. Inventory HSK0 4/4; HSK1–4 40/40/55/78, 213 rich giữ nguyên. Không đụng docs/reports/output; giữ .wrangler. Không commit/push/deploy.
- **Tiếp theo:** Web local đang bật để người dùng test Premium; chưa USER-ACCEPTED.

## Premium · khôi phục gói năm và trung tâm tài khoản · 07/10/2026

- **Module:** Premium UI — IN-REVIEW.
- **Người học thấy gì:** Khôi phục cả gói tháng/năm, giữ giá theo server; gói chưa có giá hiện rõ trạng thái. Phần cuối có ba thẻ chức năng: Ví & giao dịch, Gói học của bạn, Trung tâm hỗ trợ. Mỗi thẻ mở native modal dialog, header/footer cố định, nội dung cuộn; hỗ trợ Escape và trả focus bằng native dialog. Form hỗ trợ giữ bản nháp khi đóng/mở trong cùng trang.
- **Đã kiểm:** Typecheck và targeted lint qua. Browser desktop xác nhận cả gói tháng/năm và ba popup; Escape đóng và trả focus đúng thẻ mở. Mobile 360×800: dialog 340 px, footer nằm trong viewport; bản nháp hỗ trợ còn sau đóng/mở, đã xóa bản nháp test không gửi. Ảnh tmp/premium-service-center.png và tmp/premium-wallet-popup.png. Dev port 3000 chạy sau một lần khởi động lỗi worker; chưa kiểm giao dịch có tiền trong browser.
- **Dữ liệu giữ được:** Không đổi giá, số dư, giao dịch, API, nội dung, ID, progress/FSRS/session/outbox/owner/reset; inventory 4/40/40/55/78 và 213 rich giữ nguyên. Không migration/commit/push/deploy, không đụng docs/reports/output/.wrangler.
- **Tiếp theo:** Đã mở Premium local cho người dùng test; chưa USER-ACCEPTED.

## Premium · căn bố cục và hoàn thiện cuối trang · 06/10/2026

- **Module:** Premium UI — IN-REVIEW theo phản hồi bố cục lệch và lịch sử sơ sài.
- **Người học thấy gì:** Bỏ khoảng đệm hero 180 px, căn hai cột theo đầu khối; tăng nền tối phía sau chữ. Bổ sung ba thẻ quyền lợi/điều kiện, FAQ rõ trạng thái mở, hai cột cao độc lập. Lịch sử ví có tên nghiệp vụ/cấp thưởng, thời gian, số xu tăng giảm; ban đầu bốn giao dịch, xem thêm tối đa 50 dòng do API cung cấp. Có trạng thái trống và form hỗ trợ được căn chỉnh.
- **Đã kiểm:** Typecheck, targeted ESLint qua. Browser desktop và mobile 390×844: không tràn ngang, panel 343 px, input/textarea 301 px; mở/đóng form hỗ trợ đúng. Browser hiện dùng tài khoản ví 0, chưa kiểm trực quan danh sách nhiều giao dịch trên tài khoản có 1.400 xu của người dùng; không bơm dữ liệu test vào ví thật. Ảnh tmp/premium-aligned-hero.png và tmp/premium-refined-aftercare.png.
- **Dữ liệu giữ được:** Không thay đổi mua/hoàn/số dư, migration, content hoặc tiến độ. Inventory 4/40/40/55/78 và 213 rich giữ nguyên. Không đụng docs/reports/output/.wrangler; không commit/push/deploy.
- **Tiếp theo:** Chờ người dùng test Premium local; chưa USER-ACCEPTED.

## Premium · tiên cung và ví Hanzi nổi bật · 06/10/2026

- **Module:** Premium UI — IN-REVIEW.
- **Người học thấy gì:** Tạo ảnh nền nguyên bản bằng image_gen trước khi code; tiên cung ngọc/vàng, hero thoáng và thẻ gói tương phản. Ví có số dư lớn, thiếu xu hoặc số dư dự kiến sau đổi. Ẩn kỳ hạn chưa niêm yết giá; giữ gói tháng và các kỳ hạn đã cấu hình. Quyền lợi, FAQ, lịch sử và hỗ trợ còn nguyên.
- **Đã kiểm:** Typecheck qua; browser desktop 1280×720 và mobile 390×844 không tràn ngang; số dư 0 từ tài khoản kiểm tra, giá 1.000, nút đổi bị khóa đúng. Không thực hiện giao dịch thật. Ảnh WebP 216.486 byte, static, không thêm animation liên tục. Local commerce có lỗi tải tạm thời rồi tự khôi phục; không coi là nghiệm thu hiệu năng backend.
- **Dữ liệu giữ được:** Không đổi API mua/hoàn, nội dung/IDs/progress/FSRS/session/outbox/owner/reset hoặc số dư thực. Inventory HSK0 4/4; HSK1–4 40/40/55/78 và 213 rich giữ nguyên. Không migration/commit/push/deploy. Asset và provenance ở public/images/premium/.
- **Tiếp theo:** Mở trang Premium local cho người dùng test; chưa USER-ACCEPTED.

## Bảo Khố Thăng Cấp · Hanzi xu đổi Premium tháng · 06/10/2026

- **Module:** Dashboard cấp độ → thưởng → ví → Premium tháng — IN-REVIEW. Người dùng chọn đổi trọn gói tháng, không giảm giá hay đổi từng ngày.
- **Người học thấy gì:** Thay Bản đồ nhịp học bằng Bảo Khố Thăng Cấp: cấp/XP tới cấp tiếp theo, thưởng chờ nhận, ví và giá gói tháng. Chính sách ban đầu 500 XP/cấp, 100 xu cho mỗi cấp từ cấp 2; nhận các mốc đã đạt theo XP server. Dùng ví và luồng mua Premium tháng hiện có, không mở production/public payment.
- **Tính đúng:** Chỉ server quyết định mốc/giá trị thưởng theo tài khoản; khóa mốc level:N độc lập reset epoch để không farm lại sau reset. Mỗi ghi xu và ledger nằm cùng D1 batch, có reset fence và giới hạn số mốc mỗi request. API chặn guest/cross-origin, giới hạn tần suất. UI bỏ các ô trộn streak local/lịch ôn trống.
- **Đã kiểm:** 19 test thưởng/route/Premium qua gồm retry, concurrency, rollback, reset, owner isolation, migration giữ ledger/giá đã cấu hình và mua Premium tháng từ xu thưởng. Typecheck, targeted lint, db:check và scoped diff-check qua. Full check qua inventory/typecheck rồi dừng ở 7 unused-vars có trước trong scripts content/demo. Browser 1280×720: thẻ thưởng 221/221 px, không tràn; mobile 360×800: không tràn ngang, CTA 44 px trong viewport, thẻ phụ cuộn riêng không cắt chữ. Gói tháng được chọn, giá 1.000 xu, nút đổi khóa đúng khi ví 0. Ảnh tmp/level-rewards-final.png. API local lần đầu mất 39 giây; chưa coi là nghiệm thu hiệu năng backend.
- **Dữ liệu giữ được:** Migration 0033 mở rộng kind level_reward bằng sao chép toàn bộ ledger cũ, giữ PK/unique/FK và balance. Không đổi nội dung/IDs/progress/FSRS/session/outbox; inventory 4/40/40/55/78, 213 rich giữ nguyên. Không đụng docs/reports/output, không xóa .wrangler, không commit/push/deploy.
- **Tiếp theo:** Migration 0033 đã áp dụng local; xác minh kind mới và giá tháng 1.000 xu. Backup logic phạm vi ví tại tmp/pre-level-rewards-wallets.json; ví/ledger/order đều 0 dòng trước và sau. Bản backup SQLite đầy đủ bị gián đoạn, không coi là bản khôi phục hợp lệ. Dev port 3000 đang chạy, browser mở Bảo Khố; chờ người dùng test, chưa USER-ACCEPTED.

## Thất Trụ · rút gọn chỉ còn phần trăm · 06/10/2026

- **Module:** Thất Trụ ở ba consumer — IN-REVIEW.
- **Người học thấy gì:** Bỏ số câu/tổng câu và lượt luyện khỏi các hàng Thất Trụ, chỉ giữ tên kỹ năng, phần trăm và thanh tiến độ. Bảng Triệu Hồi căn tên/% cùng hàng, thanh ngay bên dưới; rút gọn chú thích.
- **Đã kiểm:** Browser desktop xác nhận các hàng không chồng chữ; ảnh tmp/pillars-percent-only.jpg. Giữ mô tả chi tiết cho trình đọc màn hình, giữ nguyên công thức và nguồn số liệu.
- **Dữ liệu giữ được:** Không đổi dữ liệu/nội dung/IDs/tiến độ; inventory 4/40/40/55/78, 213 rich giữ nguyên. Không migration/commit/push/deploy.
- **Tiếp theo:** Chờ người dùng test.

## Thất Trụ thống nhất + Tinh Đồ Cảnh Giới + tâm hiệu ứng Thiên Lộ · 06/10/2026

- **Module:** Slice theo phản hồi tại Thức Tỉnh Điện / Bảng Triệu Hồi / Thiên Cơ Kính / Thiên Lộ — IN-REVIEW.
- **Người học thấy gì:** Ba Thất Trụ cùng usePracticeCoverage và PracticeCoverageMeter: câu khác nhau đã luyện / kho câu phát hành thực có, không dùng mốc 1.000 hay bằng chứng đủ gate thay thế tiến độ luyện. Giữ bằng chứng năng lực trong phần chi tiết riêng. Tải lại theo cursor/evidence identity, không theo object sync thay đổi; mẫu số khử alias cùng cách với tử số. Tinh Đồ Cảnh Giới thay thẻ bài kế tiếp bằng cảnh giới hiện tại và chặng đã vượt/đang mở/phía trước; hiển thị toàn bộ chặng phát hành thay vì chỉ cấp khởi đầu. Hoạt cảnh bài Thiên Lộ neo vào icon, bỏ offset px của cả thẻ. Dời ghi kích thước containment sang RAF hữu hạn để tránh ResizeObserver loop khi đổi viewport.
- **Đã kiểm:** 13 Vitest (practicePercent + practiceCoverageRoute) qua, targeted ESLint/typecheck qua. Browser tài khoản local đối chiếu cả bảy chuỗi câu/tỷ lệ ở ba nơi bằng nhau. Tâm icon/hoạt cảnh lệch 0 px theo cả hai trục ở desktop và mobile 360 px; mobile không tràn ngang. Desktop Tinh Đồ hiển thị 16 chặng, nút mở Thiên Lộ không bị cắt; giữ scroll vùng danh sách trên mobile. Ảnh tmp/dashboard-realm-map.jpg, tmp/dashboard-pillars-unified.jpg, tmp/path-centered-vignette.jpg. Dev có Network connection lost/500 tạm thời, reload khôi phục; kho câu tải chậm khoảng 8–29 giây trên local, chưa coi là tối ưu tốc độ API.
- **Dữ liệu giữ được:** Không sửa nội dung, IDs, completion/streak/saved/FSRS/mistakes/session/outbox/owner/reset; không migration. Inventory 4/40/40/55/78, 213 rich giữ nguyên. Không đụng docs/reports/output/.wrangler, không commit/push/deploy.
- **Tiếp theo:** Chờ người dùng test bản local; chưa USER-ACCEPTED.

## Cấu hình hệ thống · hàng cuối xem trước · 06/10/2026

- **Module:** Cấu hình hệ thống — IN-REVIEW.
- **Người học thấy gì:** Thu gọn padding/gap tổng quan, đặt hoạt cảnh header ở góc với kích thước 88 px (mobile 64 px); bảng xem trước giữ bốn hàng tối thiểu 30 px và nút mở tối thiểu 44 px. Giọng đang chọn không bị nút vàng chèn ép.
- **Đã kiểm:** Typecheck và scoped diff-check qua. Browser guest local 1280×600: document/page/preview không tràn chiều cao, hàng cuối cách nút 11 px; 1320×644: document 644/644, page 556/556, preview 297/297. Mobile 390×844 không tràn ngang, bảng xem trước không tràn; giữ luồng cuộn mobile hiện có. Đã trả viewport bình thường và mở trang local cho người dùng test.
- **Dữ liệu giữ được:** Chỉ CSS trình bày; không đổi IDs/content/completion/streak/saved/FSRS/mistakes/session/outbox/owner/reset hay tùy chọn âm thanh. Inventory HSK0 4/4 và HSK1–4 40/40/55/78, 213 rich giữ nguyên; không migration/reset/commit/push/deploy.
- **Tiếp theo:** Chờ người dùng test bố cục; chưa USER-ACCEPTED.

## Tàng Tự Khố + nhãn Nghịch Cảnh Lục · 06/10/2026

- **Module:** Hai chỉnh sửa bố cục theo phản hồi — IN-REVIEW.
- **Người học thấy gì:** Hoạt cảnh Tàng Tự Khố chuyển từ float 132 px sang vùng absolute 88 px (mobile 64 px) trong header, có paint containment để các nét chuyển động không làm nở vùng cuộn. Nhãn bộ đếm Nghịch Cảnh Lục chia hai dòng căn giữa, phân cấp chữ và số rõ hơn.
- **Đã kiểm:** Typecheck, ESLint RemediationAtlas và scoped diff-check qua. Ảnh local nhãn mới tại tmp/rem-core-label-refined.jpg. Browser Tàng Tự Khố 1280×720: vùng nội dung clientHeight = scrollHeight = 632 px, document 720 px; 24 mẫu trong khoảng 2 giây sau phát lại hoạt cảnh đều không tràn chiều cao. Ảnh tmp/dictionary-overflow-fixed.jpg. Dev đã khởi động lại thành công, mở port 3000; chưa đo lại mobile ở lượt này.
- **Dữ liệu giữ được:** Chỉ đổi JSX/CSS trình bày; không đổi nội dung/IDs/progress/session/FSRS/outbox/owner/reset; inventory 4/40/40/55/78 và 213 rich giữ nguyên. Không migration/reset/commit/push/deploy.
- **Tiếp theo:** Đã mở Tàng Tự Khố local cho người dùng test; chưa USER-ACCEPTED.

## Vạn Âm Điện + Nghịch Cảnh Lục · làm thoáng tâm hiệu ứng · 06/10/2026

- **Module:** Artwork motion của hai module — IN-REVIEW. Người dùng thích hoạt ảnh, yêu cầu bỏ chi tiết che micro và con số.
- **Người học thấy gì:** Bỏ cột âm/đường khiên nằm giữa; thay bằng nét ngắn và cung sáng ở viền. Clip tĩnh giữ vùng tâm trống cả lúc các nhóm đang chuyển động; số liệu và caption nằm trên lớp trang trí. Giữ thời lượng, trigger, âm thanh và chuyển động hữu hạn hiện có.
- **Đã kiểm:** Browser local xác nhận cả hai màn hình hiển thị rõ micro/số; ảnh tmp/realm-voice-clean.jpg và tmp/realm-repair-clean.jpg. Không đổi dữ liệu để tạo số 66 của ảnh người dùng; browser kiểm tra đang là guest 0 lỗi.
- **Dữ liệu giữ được:** Không đổi nội dung/IDs/progress/session/FSRS/outbox/owner/reset; giữ inventory 4/40/40/55/78 và 213 rich; không migration/reset/commit/push/deploy.
- **Tiếp theo:** Chờ người dùng test hai chi tiết đã sửa; chưa USER-ACCEPTED.

## Hoạt cảnh + âm thanh theo module · 06/10/2026

- **Module:** Motion/audio dùng chung cho learner UI — IN-REVIEW, chưa được người dùng nghiệm thu.
- **Người học thấy gì:** Hoạt cảnh hữu hạn khoảng 2 giây với pháp trận/kiếm, tinh thể ký ức, lò chữ, sách, cổng khảo luyện, khiên, tinh đồ, ấn hồ sơ và vương miện. Phát lại bằng ấn ở header. Đã rà và bổ sung host thực trong 12 khu vực chính, gồm những khu vực trước đây chỉ có hoa văn header; thêm host ở bài học guest/account, quyển/chương đọc, phiên luyện chữ và câu khảo luyện. SVG nguyên bản; 13 motif âm tổng hợp dùng chung AudioContext hiện có, theo âm lượng/tắt tiếng, chỉ phát sau tương tác, không khởi phát trong bài nghe/thu âm; âm hoạt cảnh đang chạy dừng khi audio học được ưu tiên. Giới hạn nốt đồng thời/cooldown, ngắt node khi kết thúc và khi tắt tiếng. Không có âm nền hay vòng trang trí vô hạn mới.
- **Hiệu năng:** Chỉ mount tối đa 2 hoạt cảnh nhìn thấy (máy yếu 1), bản nhẹ tối đa 3 nhóm chuyển động; tạm dừng/hủy khi khuất hoặc tab ẩn. Không quét lại tập observer khi chỉ đổi chữ. Thiên Lộ đo kích thước thật của thẻ khóa bằng ResizeObserver rồi dùng content-visibility:auto để bỏ render phần ngoài màn hình, không xóa nội dung/link hoặc đo lại mỗi khung. Giữ nền núi mây và quy tắc fixed/scroll đã khôi phục.
- **Đã kiểm:** 23 Vitest/5 file, targeted lint, typecheck và build cuối/premium bundle boundary qua. E2E 7 test qua qua các lượt targeted: 12 khu vực có artwork thực, mobile 360 px, reduced-motion, state preservation, audio tạo/giải phóng node và tắt tiếng, luồng thư viện → quyển → chương, cửa vào bài học mobile, phiên luyện chữ và bốn subview Hồ sơ. Thẻ khóa >200 còn nguyên và chênh lệch chiều cao trang giữa native containment và layout tự nhiên <4 px. Mẫu CPU4×: idle median/p95 16.7 ms, 0/90 khung >50 ms; vừa chạy hoạt cảnh vừa cuộn median16.7/p95 33.4 ms, 1/90 khung >50 ms, tối đa9 animations. Trước tối ưu containment/giới hạn lớp, mẫu hoạt động cùng bài test có p95116.6 ms, 11/90 khung >50 ms; đây là mẫu local, không cam kết mọi thiết bị. Full check qua inventory/typecheck rồi dừng ở 7 unused-vars có trước trong scripts content/demo. Harness production vẫn có thông báo cài ngoại tuyến lỗi/API fallback; không coi là nghiệm thu offline/backend. Chưa đánh giá cảm nhận âm bằng nghe trực tiếp và chưa test mọi trạng thái từng phiên.
- **Dữ liệu giữ được:** Không đổi content, ID, completion/streak/saved/FSRS/mistakes/session/outbox/owner/reset; không migration/reset. Inventory 4/40/40/55/78, 213 rich giữ nguyên. Giữ .wrangler, docs/reports, output và dirty work có trước; không commit/push/deploy.
- **Tiếp theo:** Đã chốt gate bài học/luyện chữ/cấu hình; mở lại dev local port3000. Browser thật xác nhận Vạn Quyển Các hiển thị và nút phát lại hoạt cảnh hoạt động; ảnh tmp/realm-reader-local-final.jpg. Dev có lỗi Network connection lost ở lần tải đầu, reload đã khôi phục; không reset dữ liệu. Chờ người dùng test âm/hoạt cảnh các module. Public/auth/admin/studio không thuộc lượt UI người học này; chưa USER-ACCEPTED.

## Thiên Lộ · khôi phục nền núi mây sau tối ưu motion · 06/10/2026

- **Module:** Thiên Lộ UI — IN-REVIEW, chờ người dùng test lại.
- **Người học thấy gì:** Gỡ override background-attachment của chế độ light đã khiến ảnh cover bị phóng theo chiều dài danh sách bài trên desktop. Trả đúng cách hiển thị nền núi mây đã chốt trước: fixed trên desktop, quy tắc nền mobile cũ giữ nguyên.
- **Đã kiểm:** Browser local desktop 1320×800 xác nhận computed attachment fixed và núi mây hiện rõ; ở viewport 668 px dùng đúng quy tắc mobile auto 100vh/repeat-y. Ảnh tmp/path-background-restored.jpg; đã trả viewport về bình thường. Chỉ đổi CSS, không đổi TypeScript/runtime học tập.
- **Dữ liệu giữ được:** Không đổi asset/nội dung/IDs/progress/session/FSRS/outbox, không migration/reset; giữ inventory 4/40/40/55/78, 213 rich, .wrangler, docs/reports/output và dirty work có trước.
- **Tiếp theo:** Người dùng test lại nền Thiên Lộ local; chưa USER-ACCEPTED, không commit/push/deploy.

## Hoạt ảnh thức tỉnh · ngôn ngữ riêng theo khu vực và chế độ máy yếu · 06/10/2026

- **Module:** Hệ hoạt ảnh dùng chung cho learner UI — IN-REVIEW, chờ người dùng test.
- **Người học thấy gì:** 13 nhóm hình vẽ/choreography riêng cho Thức Tỉnh Điện, Thiên Lộ, bài học, Ôn, lỗi sai, Nói, Luyện chữ, Đọc, từ điển, khảo luyện, phân tích, Hồ sơ và Premium. SVG nguyên bản: đường/sương, mảnh ký ức, sóng âm, nét/tia sáng, trang sách, cổng/ấn, khiên, vòng thuộc tính. Header đổi hoa văn theo khu vực; artwork trong nội dung xuất hiện tại host thích hợp, không phủ màn hình. Chuyển câu/trang/reveal và thao tác kích hoạt chuyển động hữu hạn. Máy ít lõi/RAM hoặc tiết kiệm dữ liệu dùng bản nhẹ; mẫu nhịp khung hình chậm giảm chất lượng. Giới hạn animation/observer, hủy khi ẩn/offscreen, bỏ blur và vệt quét rail/bóng lọc/nền cố định trên bản nhẹ. Reduced-motion của OS luôn được ưu tiên, kể cả đã chọn Cinematic.
- **Đã kiểm:** Typecheck, targeted ESLint, 16 Vitest/3 file qua. E2E bản production: 12 route có family/hoa văn khác nhau, focus trong main, mobile 360×800 giữ CTA trên nav/không tràn ngang; reduced-motion không đổi bytes learning state; giả lập 2 lõi + CPU chậm 4 lần chọn light và không còn backdrop-filter. Full check xác nhận inventory rồi dừng ở 7 unused-vars có sẵn tại scripts content/demo ngoài module. Lighthouse 3 lần trên public landing chưa đạt: median P49/A11y99/BP93/SEO66, LCP62566ms, CLS0.027, TBT1275ms; có ảnh lớn/carousel và CSP asset origin ở harness. Đây không phải phép đo các phiên học. Phép đo frame pacing trước khi bỏ railScan còn median50–66.6ms/p95≈100ms ở idle path CPU4×; không tuyên bố mọi máy yếu mượt hoặc mọi màn hình đã audit. Build cuối và 3/3 E2E qua sau sửa railScan; tại mốc idle không còn animation chạy nhưng phép đo CPU4× 90 khung tiếp theo vẫn median66.6ms/p9583.4ms (48 khung >50ms, có toast mới). Mục tiêu mượt trên máy yếu chưa được chứng minh. Browser local xác nhận Thiên Lộ có vignette, quality light và 0 animation chạy khi nghỉ; chuyển Phòng Luyện Đề/chọn HSK2 đổi hoa văn trial và giữ focus. Dev khởi động chậm/có Network connection lost, cửa đề chưa tải xong nên chưa nghiệm thu luồng mở đề local. Đã mở lại Thiên Lộ cho người dùng, ảnh tmp/awakening-motion-local-path.jpg. Report riêng tại tmp/awakening-lighthouse.json, không ghi docs/reports/output.
- **Dữ liệu giữ được:** Không đổi nội dung, lesson/vocabulary/character IDs, completion, streak, saved, FSRS, mistakes, session/outbox/owner/reset hoặc migration; inventory HSK0 4/4 (0 rich), HSK1–4 40/40/55/78, 213/213 rich giữ nguyên. Browser E2E dùng guest/storage riêng, không reset tài khoản/browser người dùng; giữ .wrangler, docs/reports, output và mọi dirty work có trước.
- **Tiếp theo:** Người dùng test các khu vực learner local và phản hồi hoạt ảnh/độ mượt; public/auth/admin/studio chưa được thiết kế hoạt ảnh riêng, chưa audit mọi trạng thái phiên. Chưa USER-ACCEPTED, không commit/push/deploy.

## Phòng Luyện Đề · cửa miễn phí/Premium và Xưởng soạn đề · 06/10/2026

- **Module:** Phòng Luyện Đề — IN-REVIEW, chờ người dùng test.
- **Người học thấy gì:** Mỗi HSK1–4 mặc định A/B/C miễn phí; D–L Premium khi đã có đề phát hành. Cửa khóa dẫn tới Premium; API mở/khôi phục kiểm quyền trước khi trả câu hỏi. Xưởng có mục Bộ đề và quyền truy cập: người có quyền phát hành đổi riêng từng cửa với audit; biên tập viên chọn miễn phí/Premium trong bản nháp. Soạn câu bằng biểu mẫu, ghép đề G–L và thay từng câu theo nội dung, không nhập mã; câu phát hành được ghim theo revision, kiểm định chống câu thiếu/sai cấp. Sửa danh sách cửa co về chiều cao 0 trên viewport thấp. Nhãn header/sidebar dùng Khám phá Premium/Gói Premium, bỏ HSK4.
- **Đã kiểm:** Typecheck và targeted ESLint qua; 28 test quyền/server/authoring/bank/UI, 24 test Studio/route và 4 test route đổi quyền đề qua. Browser xác nhận cửa D có CTA Premium, deep link D bị chặn, Xưởng tạo nháp cửa I 40 câu miễn phí, reload giữ quyền/câu; đổi sang Premium và lưu thành công. Giữ bản nháp kiểm tra chưa phát hành. Mobile 390×844 không tràn ngang, cửa cao 49 px, CTA nằm trên bottom nav; HSK4 giữ A/B/C miễn phí. Desktop 1320×800 xác nhận nhãn Premium không gắn HSK4. Ảnh: tmp/mock-exams-mobile-final.png và tmp/mock-exams-desktop-final.png. Full check qua validator inventory rồi dừng ở lint: 7 lỗi unused-vars có sẵn trong scripts ngoài module; artifact QA cũ do agent tạo đã dọn và lint lại chỉ còn 7 lỗi đó.
- **Dữ liệu giữ được:** Migration 0032 chỉ thêm bảng quyền cửa, đã áp dụng local; không đổi/xóa completion, streak, FSRS, saved, mistakes, session/outbox/owner hoặc IDs. Phiên đã cấp vẫn ghi/nộp được, lịch sử giữ nguyên. Giữ 4/40/40/55/78 và 213 rich, .wrangler, docs/reports, output; không commit/push/deploy. Premium vẫn dùng cơ chế sandbox local hiện có, chưa payment production.
- **Tiếp theo:** Người dùng test /exams và /studio/exams; chưa USER-ACCEPTED.

## Thiên Lộ · thông tin banner và bỏ nền đen · 06/10/2026

- **Module:** Thiên Lộ UI — USER-ACCEPTED. Người dùng xác nhận “oke tốt rồi” và chuyển sang Phòng Luyện Đề.
- **Người học thấy gì:** Tên bài xuống dòng đầy đủ trong thẻ ngọc, số bài thông qua lấy từ completion/catalog hiện tại. Giữ phần thông tin người dùng vừa chốt; bỏ nền và bóng hình chữ nhật quanh banner, dùng SVG mask theo đường viền cuộn gốc để nền núi mây hiện quanh mép. Không thay ảnh gốc hoặc chuyển tên bài xuống dải thông tin mới.
- **Đã kiểm:** Typecheck, targeted ESLint và scoped diff-check qua; browser desktop 1320 px và mobile 390 px xác nhận nền banner trong suốt, mask tải, không tràn ngang và vòng đếm hiển thị. Ảnh desktop: tmp/path-banner-no-black-desktop.png.
- **Dữ liệu giữ được:** Không đổi content/IDs/progress/FSRS/session/outbox/owner, không reset/migration; giữ inventory 4/40/40/55/78, 213 rich và các thay đổi Header 02/Premium/triệu hồi. Không đụng .wrangler, docs/reports, output.
- **Tiếp theo:** Module Phòng Luyện Đề theo yêu cầu người dùng, không commit/push/deploy.

## Thiên Lộ · logo đầu mục và ảnh nền, giữ banner · 06/10/2026

- **Module:** Thiên Lộ UI — IN-REVIEW, chờ người dùng test.
- **Người học thấy gì:** Chỉ thay logo đầu mục HSK0–HSK4 bằng năm ảnh riêng rồng/hạc/hổ/phượng/kỳ lân; bỏ dịch trái, căn giữa ngang/dọc trong vùng logo. Khung tự giãn đủ chứa logo và chữ; đường trang trí không xuyên chữ khi khung cao hơn. Thêm ảnh nền núi mây tông ngọc cho Thiên Lộ. Banner path-celestial-scroll-g.png, nhãn bài/số bài và tự cuộn giữ nguyên để chỉnh sau.
- **Đã kiểm:** Typecheck và scoped diff-check qua. Browser desktop xác nhận năm nguồn ảnh riêng tải thành công và tâm logo trùng tâm khung theo chiều dọc; mobile 390×844 không tràn ngang, logo trùng tâm vùng chứa cả hai chiều. Ảnh: tmp/path-level-logos-desktop.png, tmp/path-level-logos-mobile.png. Chưa USER-ACCEPTED.
- **Dữ liệu giữ được:** Chỉ đổi asset/CSS/logo, không đổi content/IDs/progress/FSRS/session/outbox/owner, không migration/reset. Giữ inventory 4/40/40/55/78, 213 rich, .wrangler, docs/reports, output và các sửa Header 02/triệu hồi/Premium. Asset nguyên bản từ built-in image_gen và prompt/provenance lưu trong public/art/thien-lo/.
- **Tiếp theo:** Người dùng test http://127.0.0.1:3000/path; banner để lượt sau. Không commit/push/deploy.

## Thiên Lộ · trả giao diện trước theo yêu cầu · 06/10/2026

- **Module:** Thiên Lộ UI — IN-REVIEW. Người dùng không chọn bản banner/logo mới và yêu cầu trả giao diện trước.
- **Người học thấy gì:** Khôi phục banner path-celestial-scroll-g.png, nhãn bài/số bài cũ, logo SpiritBeastSeal, bố cục cũ và tự cuộn tới bài đang học. Gỡ import PathJourney.css/PathJourneyBanner khỏi trang. Giữ sửa Premium có trước, Header 02, triệu hồi và các module khác.
- **Đã kiểm:** Typecheck và scoped diff-check qua; diff PathPage chỉ còn năm dòng Premium có trước lần thiết kế bị rút.
- **Dữ liệu giữ được:** Không đổi content/IDs/progress/FSRS/session/outbox/owner hoặc migration/reset; giữ inventory 4/40/40/55/78 và 213 rich. Ảnh thử nghiệm vẫn lưu nhưng không còn được trang sử dụng. Không đụng .wrangler, docs/reports, output; không commit/push/deploy.
- **Tiếp theo:** Người dùng test bản local; bản thiết kế Thiên Lộ ở checkpoint dưới đã được rút khỏi giao diện đang chạy, chưa USER-ACCEPTED.

## Khảo Nghiệm Căn Cơ · Ngọc Điện và bảo toàn Thiên Lộ · 06/10/2026

- **Ảnh giao diện thực tế:** tmp/placement-ngoc-dien-final.jpg; desktop 1320×644 không tràn ngang, CTA nằm trong viewport. Đã trả viewport về mặc định và mở cổng để người dùng test.
- **Module:** Khảo Nghiệm Căn Cơ — IN-REVIEW, chờ người dùng test.
- **Người học thấy gì:** Giao diện Ngọc Điện tối theo mockup v2, giữ header/sidebar hiện tại; giới thiệu → chọn HSK1–4 → 12 câu/tầng → kết quả theo đọc/từ/ngữ pháp. Chọn rồi xác nhận, có “Chưa biết”, xem lời giải sau câu cuối. Kết quả gợi ý thử tầng trên/xác minh tầng dưới; đã đi xuống không bị mời quay lên ngay. Nghe/nói/viết chưa được đo; không cấp mastery hay miễn tiên quyết.
- **Phiên dở:** Lưu riêng từng owner/form, hết hạn sau 7 ngày từ lúc bắt đầu. Đối chiếu state, phiên học IndexedDB, projection tài khoản và reset trước khi ghi câu/nhận kết quả. Học thêm hoặc đổi hành trình thì chặn phiên cũ và mời lượt mới; bản cũ giữ lại. Người đã học giữ starting level và bài đề xuất, chỉ nhận gợi ý củng cố. Ghi thành công mới tiến câu; kết quả đã nhận đóng phiên, chặn bấm nhận lặp.
- **Đã kiểm:** 31/31 targeted Vitest qua (policy, resume, lifetime/owner, preservation, IndexedDB owner/reset và storage); typecheck, targeted ESLint và scoped diff-check qua. Browser thật: chọn tầng, phím mũi tên/radio, xác nhận rồi tiến câu, reload tiếp câu, 0/12 và nhận HSK0; học xen giữa làm phiên cũ bị chặn, làm lại/lưu gợi ý trở về đúng Thiên Lộ. Mobile 390×844 và 360×800: CTA phiên/kết quả nằm trên bottom nav, nội dung giữa cuộn. Full check qua precheck inventory/lockfile/typecheck rồi dừng tại 7 lỗi unused-vars có sẵn trong script content/demo ngoài module. Web local có lúc dừng vì EBUSY file watch và lỗi Miniflare khi tải lại; đã khôi phục để kiểm hành trình. Chưa pixel-diff để tuyên bố giống ảnh 100%, chưa calibration/người dùng nghiệm thu.
- **Dữ liệu giữ được:** Không migration/reset, không đổi nội dung/IDs/completion/streak/saved/FSRS/mistakes/lesson sessions/outbox; giữ .wrangler, docs/reports, output. Inventory HSK0 4/4 (0 rich), HSK1–4 40/40/55/78, 213/213 rich được precheck xác nhận. Artwork AI nguyên bản có provenance, WebP 307 KB. Không commit/push/deploy.
- **Tiếp theo:** Test http://127.0.0.1:3000/assessment; phản hồi giao diện và luồng khảo nghiệm. Chưa USER-ACCEPTED. Thiết kế/quy tắc: docs/design/placement-ngoc-dien/.

## Thiên Lộ · banner sống và năm logo HSK riêng · 06/10/2026

- **Module:** Thiên Lộ UI — IN-REVIEW, chờ người dùng test.
- **Người học thấy gì:** Banner cuộn ngọc có lớp sương/ánh sáng chuyển động, đánh dấu chặng đang học và chặng đã thông qua từ dữ liệu thật; số bài theo catalog phát hành. Tên bài đang học hiển thị đầy đủ, xuống dòng và có nút Học tiếp. Thêm nền ngọc tối cho trang. HSK0 rồng, HSK1 hạc, HSK2 hổ, HSK3 phượng, HSK4 kỳ lân dùng năm ảnh tạo riêng, cùng kích thước/đường tâm ở banner và đầu mục. Có dừng chuyển động, tự dừng khi ngoài màn hình và hỗ trợ reduced-motion.
- **Đã kiểm:** 4/4 targeted Vitest cho banner/catalog, gồm fixture tiến độ HSK2/HSK3, tên bài dài, hoàn tất và năm asset khác nhau; typecheck và targeted ESLint qua. Browser desktop: đủ năm WebP tải thành công, logo ngang hàng; mobile kiểm tra tên bài không bị cắt và logo cùng y. Đã kiểm tra nút dừng, transform chuyển động thật và reduced-motion. Ảnh desktop: tmp/thien-lo-desktop-final.png. Full check còn 7 lỗi script ngoài module đã ghi ở checkpoint trước.
- **Dữ liệu giữ được:** Chỉ đổi trình bày và asset; không migration/reset hoặc đổi content, IDs, completion, FSRS, saved/mistakes/session/outbox/owner. Giữ 217 bài (4/40/40/55/78), HSK1–4 213/213 rich, .wrangler, docs/reports và output. Các sửa Header 02/Thức Tỉnh Điện/triệu hồi trước được giữ. Prompt và nguồn ảnh tại public/art/thien-lo/provenance.json và level-seals.provenance.json; ảnh gốc PNG cùng bản WebP nằm trong workspace.
- **Tiếp theo:** Web local http://127.0.0.1:3000/path mở để người dùng test; chưa USER-ACCEPTED, không commit/push/deploy.

## Bảng triệu hồi · sửa mất phần trăm Thất Trụ · 06/10/2026

- **Module:** Bảng triệu hồi — IN-REVIEW, chờ người dùng test.
- **Người học thấy gì:** Bảy số phần trăm hiển thị lại; mở lại bảng giữ kết quả trong lúc cập nhật cùng owner/reset. Tính câu duy nhất đã luyện trên tổng câu đã phát hành của từng kỹ năng, không dùng mốc 1.000. Giữ hai bảng cánh cân nhau và hiệu ứng 3D; các thay đổi Header 02/cửa sổ Thức Tỉnh Điện/cấu hình ở checkpoint trước vẫn giữ.
- **Đã kiểm:** 16 targeted Vitest qua cho công thức, catalog, cache và route; thêm kiểm tra đọc nguồn đề theo lô đạt, parity ID/kỹ năng với bộ chấm, từ chối digest sai/bản nháp. Typecheck và targeted ESLint qua. Browser thật hiển thị Phát âm <0,1% từ một câu đã luyện, sáu trụ chưa luyện 0%; đóng/mở lại không mất %. Tổng câu khớp trước tối ưu: 21098/1595/909/2198/1745/10088/827 theo pronunciation/listening/speaking/reading/writing/vocabulary/grammar. Local lần đầu sau restart cần khoảng 39 giây gồm biên dịch; cache khoảng 1,7 giây. Đọc theo lô giữ immutable digest fence, không đưa đáp án vào API. Ảnh kiểm tra: tmp/ngoc-summon-percent-final.jpg. Full check vẫn có 7 lỗi lint script ngoài phạm vi đã ghi ở checkpoint trước.
- **Dữ liệu giữ được:** Không migration/reset hoặc thay nội dung, IDs, progress, FSRS, session/outbox; giữ .wrangler, docs/reports, output và inventory HSK0 4/4, HSK1–4 213/213 rich. Không commit/push/deploy.
- **Tiếp theo:** Web http://localhost:3000 mở sẵn để người dùng test; chưa USER-ACCEPTED.

## Bảng triệu hồi · khôi phục 3D và cân hai bảng cánh · 05/10/2026

- **Module:** Bảng triệu hồi — IN-REVIEW.
- **Người học thấy gì:** Khôi phục perspective, hiệu ứng xuất hiện và nghiêng theo con trỏ trên desktop thấp; hai bảng Nhiệm vụ/Thất Trụ dùng chung chiều rộng và chiều cao, góc nghiêng đối xứng. Bảy hàng Thất Trụ giãn theo khung, bỏ ô vuông quanh nhãn âm/thính; giữ công thức phần trăm đã sửa.
- **Đã kiểm:** Browser 1320×644: hai khung ngoài cùng 337×420 px, không tràn nội dung, không che footer; transform matrix3d và góc/con trỏ thay đổi thật khi tương tác. Mobile giữ bố cục cuộn giữa và reduced-motion giữ tắt chuyển động theo tùy chọn.
- **Dữ liệu giữ được:** Chỉ sửa CSS, không thay dữ liệu/IDs/tiến độ/.wrangler hoặc nội dung; giữ HSK0 4/4, HSK1–4 213/213 rich.
- **Tiếp theo:** Người dùng test lại hiệu ứng và tỷ lệ hai bảng; chưa USER-ACCEPTED.

## Ngọc điện · Header 02, cửa sổ Thức Tỉnh Điện và bảng triệu hồi · 05/10/2026

- **Module:** Giao diện hệ thống — IN-REVIEW, chờ người dùng test.
- **Người học thấy gì:** Một Header 02 với Premium và hồ sơ gọn hơn; loading Ngọc điện; bốn cửa sổ sau hero đầu dùng nền/ngôn ngữ thị giác Ngọc điện, giữ nút trước/sau và chu kỳ 5 giây. Sửa CTA bị cắt và chồng chữ ở desktop thấp/mobile. Cấu hình đủ mục 1–4, không cuộn lồng ở desktop 1320×644. Triệu hồi có bảy hàng Thất Trụ đồng bộ, bỏ nút đọc riêng và gọi đọc tự động mỗi lần mở (tôn trọng tùy chọn giọng; cần giọng Việt của thiết bị).
- **Phần trăm:** Bỏ mốc 1.000. Đếm giao của câu đã luyện với ngân hàng câu đã phát hành theo kỹ năng; khử trùng lặp câu/revision lexical và nguồn diagnostic, nhận thêm page activities có learningTarget và đề đã phát hành. Tài khoản đọc đúng owner/reset epoch; guest dùng evidence và bản lưu trang trên thiết bị. Chỉ trả ID, không đáp án. Câu ngoài ngân hàng/không gán kỹ năng không được tự suy ra; lỗi tải hiện —, không giả 0%. Đây là độ phủ luyện, không phải mastery.
- **Đã kiểm:** 20 Vitest qua cho Header, công thức/khử trùng lặp, parity ngân hàng bài học, API guest/owner/reset/fail-closed; typecheck và targeted ESLint qua. Browser desktop 1320×644 và mobile 390×844: bốn cửa sổ, CTA, cấu hình, Premium, mở/đóng triệu hồi/Escape; sửa overlap mobile. Chưa xác minh âm thanh nghe được trên máy người dùng. Full `npm run check` bị chặn bởi 7 lỗi unused-vars có sẵn ở script nội dung/demo ngoài phạm vi.
- **Dữ liệu giữ được:** Không sửa nội dung, IDs, progress, FSRS, session, outbox hoặc reset; không migration. Giữ inventory HSK0 4/4, HSK1–4 213/213 rich, .wrangler, docs/reports và output. Chưa commit/push/deploy.
- **Tiếp theo:** Test bản local http://127.0.0.1:3000 và phản hồi giao diện; chưa USER-ACCEPTED.

## Thiên Lộ · khép 14 nhóm biên tập dự kiến và giao local · 05/10/2026

- **Module:** Thiên Lộ — IN-REVIEW theo quy ước nghiệm thu, chưa USER-ACCEPTED. Đã khép14/14 nhóm biên tập dự kiến; không suy mọi câu/nghĩa phụ đã rà hoặc đủ HSK từ con số này.
- **Người học thấy gì:** Catalog luyện/Ôn/Nói mới đã nhận1.312 mục từ đã phát hành với version riêng; Lỗi resolve đúng version. Lô108 APPLY thêm3 trang/7 mẫu về giáo dục gia đình trong bài campus-education, có mẫu Trung/Pinyin/Việt, phân biệt/feedback, đoạn đọc ngắn và vận dụng khác ngữ cảnh. Không thêm lesson hoặc replay. Hồ sơ201–203 ghi phạm vi và giới hạn; local http://127.0.0.1:3000.
- **Đã rà/kiểm:** Đọc current bài campus-education cùng5 yêu cầu nhiệm vụ gia đình trong PDF hash trùng nguồn pin. Validation catalog read-only và rehearsal rollback sáu phiên/grade thẻ mới giữ51 bảng/405 thẻ cũ; lô108 release giữ43 bảng/heads khác/immutable parent/FK. Final audit đủ217 current heads,2.000 word tuples không thiếu bộ trường,0 job release chờ; đây không phải proof ngữ nghĩa/mastery. Không browser/timed learner/parity/Vitest/typecheck/full check. Những phạm vi đọc/rà trước nằm trong hồ sơ gốc, không gọi lượt cuối đã đọc lại toàn kho.
- **Dữ liệu giữ được:**217 bài4/40/40/55/78, stable IDs/progress/FSRS/lỗi/saved/session/outbox/owner/reset scope, draft editor/Premium/admin/.wrangler/docs/reports/output. Phiên/thẻ cũ giữ bản nền; hai form08.5 giữ nguyên, chưa thuộc resolver08.7. humanReviewed:false; không USER-ACCEPTED/stage/commit/push/deploy.
- **Tiếp theo:** Người học dùng bản local; xử lý issue nội dung cụ thể nếu phát hiện, không tự mở lại backlog kiểm thử đã bỏ. Automation nội dung đã xác minhPAUSED;get_goal trảgoal:null. Không tuyên bố có tiến trình goal nền hoặc tự khởi động vòng lặp tiếp.

## Thiên Lộ · catalog ngữ liệu cho phiên mới · 05/10/2026

- **Module:** Thiên Lộ — IN-REVIEW; còn nhóm đối chiếu cuối.
- **Người học thấy gì:** Catalog lexical-editorial-2026.10.5 pin 1.312 mục từ đã sửa/phát hành trong Xưởng. Luyện local/account mới dùng nghĩa/mẫu/lời giải mới với ID/version riêng; phiên cũ giữ catalog nền. Ôn local và thẻ account mới dùng bản mới, thẻ cũ giữ FSRS/version, không tạo hai thẻ cùng từ. Nói dùng câu mới và activity version riêng; Lỗi resolve đúng version của câu gốc. Không thêm bài/trang, không replay. Hồ sơ201.
- **Đã kiểm:** Validation nội tại read-only source/digest/answer/options, catalog cũ khớp baseline; 217 bài × hai script, 868 resume forms. Ba started forms package hiện hành hợp lệ; hai form package08.5 giữ nguyên nhưng chưa thuộc resolver hiện hành. Rehearsal open/attempt/submit sáu bài và grade thẻ mới, ROLLBACK giữ51 bảng/FK cùng405 thẻ cũ. Backup trong .wrangler; không browser/timed learner/parity/Vitest/typecheck/full check.
- **Dữ liệu giữ được:**217 bài4/40/40/55/78, IDs/progress/FSRS/lỗi/saved/session/outbox/owner/reset scope, draft editor/Premium/admin/.wrangler/docs/reports/output. humanReviewed:false; không USER-ACCEPTED/commit/push/deploy. Web local PID7904 tại http://127.0.0.1:3000, không migration/reset.
- **Tiếp theo:**13/14 nhóm dự kiến đã khép. Còn một nhóm đối chiếu cuối để đọc các điểm còn mở và xử lý thiếu hụt thật; không suy toàn bộ ngữ liệu đã rà từ số candidates hay snapshots. Automation lần xác minh gần nhấtPAUSED,goal:null; không tuyên bố nền chạy.

## Thiên Lộ · khép lượt đọc nghĩa HSK1 · 05/10/2026

- **Module:** Thiên Lộ — IN-REVIEW; chưa hoàn tất toàn phạm vi.
- **Người học thấy gì:** Lô106 APPLY35 mục/44 mẫu HSK1,7 nghĩa cùng word blocks9 bài; tổng44 revisions. Hồ sơ200 và receipt giữ nguồn/backup. Không thêm bài/trang hoặc replay.
- **Đã rà/kiểm:** Đọc đủ300 tripleHSK1 hiện hành/fallback để sửa các nghĩa và ngữ cảnh đã nêu. Không suy mọi cách dùng/ngữ pháp/toàn40bài đã rà. Rehearsal rollback/validation nội tại/backup/APPLY giữ43 bảng/heads khác/parents/FK; không browser/timed learner/parity/Vitest/typecheck/full check.
- **Dữ liệu giữ được:**217 bài4/40/40/55/78,IDs/progress/FSRS/lỗi/session/outbox/owner,draft editor/Premium/admin/.wrangler/docs/reports/output;humanReviewed:false,không USER-ACCEPTED/commit/push/deploy.
- **Tiếp theo:** Kế hoạch14 nhóm đã khép12. Còn2 nhóm dự kiến:catalog luyện phiên mới và đối chiếu cuối/phát hành. Đã đọc consumerexerciseGeneration/authoritativeItemBank/attemptScoring/resumeProtocol/normalizedLessonRuntime/lessonSessionRepository/reviewProtocol/reviewQueueRepository:catalog nền và phiên đang pin chặt cùngversion; chưa thayngữ liệu chấm hoặc protocol,không gọi đồng bộcatalogxong. Thiếu hụt thực tế có thể phát sinh ở đối chiếu cuối. Automation lần xác minh gần nhấtPAUSED,goal:null;không tuyên bố nền chạy.


## Thiên Lộ · đề B và bản sao ngữ liệu · 05/10/2026

- **Module:** Thiên Lộ — IN-REVIEW; chưa hoàn tất toàn phạm vi.
- **Người học thấy gì:** Lô101–105 APPLY. Cửa H HSK2/3/4 có60/80/100 câu cho phiên mới; phát hành119 exam items mới và3 forms, reuse revisions cũ. Sửa7 khối nghĩa/7 bài cùng11 mục từ/11 mẫu/3 bài. Hồ sơ195–199 giữ receipts/backup; không replay.
- **Đã rà/kiểm:** Đọc60 HSK2 B,23 HSK3 B còn lại,36 HSK4 B từ/ngữ pháp; sửa15 grammar HSK3 và36 lời giải/cue HSK4. Đối chiếu48 phrase nguồn cũ trong217 current lesson heads:0literal hits, không suy toàn kho sạch. Đọc đầy đủcampus-education và13 triples còn khớp để chọn11 sửa. Validation/rehearsal/backup/immutable reuse/head guards/43 bảng/FK/public answer redaction đạt. Pinned restore với source archived đã rehearsal bằng transition đúng workflow và ROLLBACK cho4 cửaG, definitions giữ nguyên; helper cho phép published hoặc archived với digest fence. Một thử SQL trực tiếp bị immutable trigger từ chối và rollback, không gỡ trigger. Không kiểm thử đã bỏ.
- **Dữ liệu giữ được:**217 bài4/40/40/55/78, stable IDs/progress/FSRS/lỗi/session/outbox/owner, draft editor/Premium/admin/.wrangler/docs/reports/output;humanReviewed:false. Không USER-ACCEPTED/commit/push/deploy.
- **Tiếp theo:** Kế hoạch14 nhóm đã khép11; còn3 nhóm dự kiến:nghĩa/cách dùngHSK1,catalog luyện phiên mới,đối chiếu cuối/phát hành. Các nhóm khép có phạm vi cụ thể ở hồ sơ, không gọi mọi nghĩa phụ/Pinyin toàn bank/toàn217bài đã rà. Thiếu hụt thật có thể tăng số nhóm. Automation lần đọc gần nhấtPAUSED,goal:null; không tuyên bố nền chạy hoặc hoàn tất.


## Thiên Lộ · khép lượt đọc từ điển HSK3 · 05/10/2026

- **Module:** Thiên Lộ — IN-REVIEW; chưa hoàn tất toàn phạm vi.
- **Người học thấy gì:** Lô95–100 APPLY,141 mục HSK3/150 mẫu,191 revisions gồm word blocks liên kết; sửa32 nghĩa theo ngữ cảnh/từ loại pinned. Không tăng bài/trang; không replay. Hồ sơ189–194 giữ receipts/backup. Hồ sơ189 giữ hậu tốROUND92 do metadata đã pin, nguồn thực tế round95.
- **Đã rà/kiểm:** Đọc300 triple00701–01000; đọc bù00633–00643 nối mốc186. Đây là lượt đọc nghĩa/ví dụ, không chứng minh đã dạy đủ mọi nghĩa phụ/nguồn dài/đáp án. Validation nội tại/rehearsal rollback/backup/APPLY bảo toàn43 bảng/parents/heads/FK. Không chạy các kiểm thử đã bỏ.
- **Dữ liệu giữ được:**217 bài4/40/40/55/78, stable IDs/progress/FSRS/lỗi/session/outbox/owner, draft editor/Premium/admin/.wrangler/docs/reports/output. humanReviewed:false; không USER-ACCEPTED/commit/push/deploy.
- **Tiếp theo:** Kế hoạch đã báo người dùng14 nhóm, khép6 nhóm dictionary; còn8 nhóm dự kiến:3 assessment B,2 nguồn dài/bản sao và đáp án,1 nghĩa/cách dùng HSK1,1 catalog luyện phiên mới,1 đối chiếu cuối/phát hành. Số nhóm là dự kiến, không phải phần trăm hay chứng minh đầy đủ toàn HSK; thiếu hụt thật có thể tăng phạm vi. Automation lần xác minh gần nhấtPAUSED, goal:null.


## Thiên Lộ · bốn cửa khảo luyện cho phiên mới · 05/10/2026

- **Module:** Thiên Lộ — IN-REVIEW; toàn phạm vi nội dung HSK0–4 chưa hoàn tất.
- **Người học thấy gì:** Lô90–94 đã APPLY, không replay. Thêm cửa G HSK1/2/3/4 gồm40/60/80/100 câu từ revisions mới qua Xưởng và API khảo luyện hiện hành. Sửa lời giải/nguồn/cue,15 câu grammar HSK3 cùng ngữ cảnh,20 câu đọc/nghe có căn cứ;13 mục HSK1 và33 mục HSK3 được sửa ví dụ. Giữ đề/phiên cũ; không gọi các cửa A–F đã sửa hoặc số câu là mastery.
- **Đã rà/kiểm:** Hồ sơ184–188 giữ phạm vi đọc/revisions/backup. Đọc50 HSK1,60 HSK2,54 HSK3 A+31 nguồn B chọn,72 HSK4 A+36 nghe/đọc B. Nguồn B chưa chọn/Pinyin toàn bank vẫn mở. Validation nội tại/rehearsal rollback/backup/APPLY giữ43 bảng, heads/forms cũ/FK, pin/restore và public answer redaction. Không browser/timed learner/parity/Vitest/typecheck/full check; chưa browser các cửa G.
- **Dữ liệu giữ được:**217 bài4/40/40/55/78, stable IDs/progress/FSRS/lỗi/session/outbox/owner, nháp editor/Premium/admin/.wrangler/docs/reports/output. humanReviewed:false; không USER-ACCEPTED/commit/push/deploy.
- **Còn mở:** Nghĩa/độ sâu và các bản sao nguồn dài HSK1–3, các mẫu/Pinyin còn lại, nguồn assessment B chưa chọn và versioned catalog luyện tương lai. Không mở lại backlog kiểm thử đã bỏ. Automation được đọc05/10:automation.toml xác nhận PAUSED; get_goal trảgoal:null. Chưa bật lại/dừng automation trong lượt này, không tuyên bố có việc nền đang chạy.

## Thiên Lộ · bộ đánh giá HSK4 cho phiên mới · 05/10/2026

- **Module:** Thiên Lộ — IN-REVIEW; nội dung HSK0–4 chưa hoàn tất.
- **Người học thấy gì:** Lô91 APPLY108 câu và cửa G HSK4 gồm100 câu qua Xưởng/module khảo luyện hiện hành; sửa lời giải sai nguồn, dữ kiện tự thêm, cue ngữ pháp và câu 不是一定. Giữ đề/phiên cũ; không gọi mọi assessment đã sửa. Nghe TTS/viết chọn đáp án vẫn là luyện local, không chứng nhận/mastery.
- **Đã rà/kiểm:**72 câu form A và36 nghe/đọc form B; không gồm36 từ vựng/ngữ pháp form B hoặc HSK1–3. Validation nội tại phát hiện/sửa giới hạn Hanzi hai ký tự và resolver cần private answers của đúng released revision. Rehearsal rollback rồi APPLY109, pin/hash/restore/public answer redaction/FK/43 bảng đạt; hồ sơ185. Không chạy các kiểm thử đã bỏ; chưa browser cửa G.
- **Dữ liệu giữ được:**217 bài4/40/40/55/78, old heads/forms, stable IDs/progress/FSRS/lỗi/session/outbox/owner, drafts editor/Premium/admin/.wrangler/docs/reports/output; humanReviewed:false, không USER-ACCEPTED/commit/push/deploy.
- **Còn mở:** Độ sâu/nghĩa HSK1/HSK3, assessment HSK1–3 và nguồn HSK4 form B còn lại, mẫu/Pinyin và versioned catalog luyện tương lai. Không replay85–91. Automation chưa dừng; trạng thái automation/goal ngày05/10 chưa xác minh.
- **Mốc92:** APPLY33 mục HSK3/37 mẫu, sửa4 nghĩa theo từ loại pinned và word blocks trong15 bài; tổng48 revisions, hồ sơ186. Rehearsal/backup/apply giữ43 bảng/heads/parents/FK. Không tự sửa nguồn dài/đáp án phiên cũ. Đã đọc50 câu assessment HSK1 và60 HSK2 (phần reading01–03 từng cắt đã đọc lại); đang sửa nghĩa Việt衣服/件, thoại màu–độ dài, 还有/还在 và so sánh thiếu mốc để giao phiên mới. Chưa tính assessment HSK1/2 đã phát hành.
- **Mốc93:** Đã APPLY110 câu và hai cửa G HSK1/HSK2 (40/60 câu),112 revisions; hồ sơ187. Sửa các vấn đề trên, lời giải25 câu grammar và ánh xạ bài nguồn HSK1 cho publications mới. Validation/rehearsal/backup/apply/pin/restore/public answer redaction giữ43 bảng, old forms/heads/FK; không kiểm thử đã bỏ. Đang rà assessment HSK3; chưa gọi các nguồn form B HSK2–4 đã rà toàn bộ.

## Thiên Lộ · ngữ pháp HSK2 và ví dụ từ điển · 05/10/2026

- **Module:** Thiên Lộ — IN-REVIEW; nội dung HSK0–4 chưa hoàn tất, không tự suy phần trăm hay ETA.
- **Người học thấy gì:** Lô85–89 đã APPLY, không replay. Lô85–87 thêm56 câu phân biệt và56 vận dụng vào tám bài HSK2, không tăng trang. Lô88 sửa 花 động từ và 近 tính từ trong Từ điển/bài; thêm hai mẫu, một câu phân biệt và một vận dụng ở shopping03; sửa dấu tách âm tiết/Pinyin tiền. Lô89 sửa61 mục từ/65 mẫu và bản sao word blocks trong38 bài. Cùng lô83–84 trước đó,75 nhóm grammar HSK2 đã có phần luyện bổ sung; con số không chứng minh đủ mọi nghĩa hay đủ HSK.
- **Đã rà/phát hành:** Đọc note/mẫu/guided practice/cloze của75 nhóm HSK2; đọc hội thoại, giải thích, câu chọn/cloze/order và vận dụng trong20 bài chủ đề/10 bài kỹ năng,200 ví dụ mục từ HSK2 để chọn sửa. Output nhóm daily từng bị cắt đã đọc lại phần rút gọn và riêng phần daily03. Không gọi mọi word blocks, ảnh/diagram, Pinyin toàn kho, metadata/exercise nền hoặc assessment đã rà. Hồ sơ179–183 giữ phạm vi/receipts. Lô89 đã xác minh99/99 heads và không có job release đang chờ.
- **Đã kiểm:** Validation nội tại, rehearsal rollback, backup/apply, immutable parents, heads ngoài lô, FK và43 bảng bảo toàn. Lô88 bị từ chối cờ AI review chưa hoàn tất rồi rollback/sửa; lô89 rehearsal đầu chưa drain đủ99 đã rollback, sau sửa có giới hạn đạt99. Không browser/timed learner/parity Xưởng/Vitest/typecheck/full check theo yêu cầu.
- **Dữ liệu giữ được:**217 bài4/40/40/55/78, stable IDs/progress/FSRS/lỗi/session/outbox/owner; giữ draft editor mới/Premium/admin/.wrangler/docs/reports/output. humanReviewed:false, không USER-ACCEPTED/commit/push/deploy.
- **Mốc90:** Đã APPLY 19 mẫu/13 mục HSK1 (10 mục pinned và3 bridge), cập nhật word blocks trong9 bài, tổng22 revisions; hồ sơ184 và receipt giữ danh sách/backup. Không tăng trang hoặc thay catalog chấm của phiên cũ; không replay.
- **Còn mở:** Rà nghĩa/độ sâu HSK1 và HSK3 còn lại, assessment HSK1–4 (đã thấy giải thích HSK4 sao chép sai phạm vi nguồn), các mẫu/Pinyin cũ và giao catalog tương lai có phiên bản an toàn. Tham khảo projection trong Ôn/Nói/Lỗi đã nối, nhưng scoring catalog/target của phiên cũ còn giữ bản nền. Chưa dừng automation vì chưa hoàn tất; chưa xác minh trạng thái automation/goal trong lượt05/10, không tuyên bố nền đang chạy.

## Thiên Lộ · HSK1 câu cơ bản và HSK2 vận dụng · 04/10/2026

- **Module:** Thiên Lộ — IN-REVIEW; nội dung HSK0–4 chưa hoàn tất.
- **Người học thấy gì:** Lô79–84 đã apply, không replay. HSK1 thêm26 trang/7 bài: vị ngữ danh từ, nơi+是/有+số lượng, cách gọi 小, năng nguyện/phạm vi phủ định/chính phản, chuỗi động từ/一下/hai tân ngữ. Sửa 下午 lời đáp thiếu ngữ cảnh trong week và phát hành mục Từ điển; 很 được diễn giải là phó từ. HSK2 thêm19 câu phân biệt/19 vận dụng vào các trang practice của2 bài aspect/state, thêm4 mẫu mốc thời gian; không tăng trang. Sửa so sánh có mốc rõ, tuổi chênh lệch và dịch 着/听歌. Hồ sơ172–177 giữ revision/backup.
- **Đã rà/phát hành:** Đọc current heads trước sửa. Đọc rule/grammar/dialogue/activity của journey1/2, professional1–4;10 nhóm grammar và các activity của aspect01;9 nhóm grammar/practice của aspect02. Chỉ phạm vi ghi trong hồ sơ, không gọi40 bài HSK2 hay mọi Pinyin/diagram đã rà. Rehearsal/validation nội tại/backup/apply giữ43 bảng, heads khác, parents immutable và FK. Không browser/timed learner/Xưởng parity/Vitest/typecheck/full check.
- **Giao ngữ liệu bổ trợ:** Đã nối tham khảo projection vocabulary theo stable word ID ở Ôn sau reveal, Nói và Lỗi sau submit; Từ điển mở đúng word hoặc lesson đã có. Source/diff đọc và diff-check, chưa browser/typecheck theo yêu cầu. Hồ sơ178. Không đổi câu target, scoring catalog, version, lệnh chấm hoặc outbox/FSRS của phiên cũ; đây là bổ trợ, chưa tuyên bố catalog tương lai đã đổi ngữ liệu.
- **Dữ liệu giữ được:**217 bài4/40/40/55/78, stable IDs/progress/FSRS/lỗi/session/outbox/owner; giữ nháp editor mới, Premium/admin, .wrangler, docs/reports và output. humanReviewed:false, không USER-ACCEPTED/commit/push/deploy.
- **Tiếp theo:** Độ sâu/nghĩa/ngữ pháp/task/topic HSK1–3, mẫu/Pinyin và assessment chưa rà, catalog tương lai có phiên bản an toàn. Đang đọc nhóm clause-linking HSK2. Automation giữ ACTIVE theo mốc đã xác minh trước, chưa dừng vì phạm vi chưa hoàn tất; không tuyên bố goal tool đang chạy.

## Thiên Lộ · precision và các bài tích hợp HSK4 · 04/10/2026

- **Module:** Thiên Lộ — IN-REVIEW; phạm vi nội dung HSK0–4 chưa hoàn tất.
- **Người học thấy gì:** Lô65–76 đã apply. Lô66–69 bổ sung24 nhóm grammar/4 bài precision:74 mẫu,57 câu chọn,24 vận dụng, net+48 trang. Tổng chuỗi223 trang/35 bài độc nhất có bổ sung ròng; không suy đủ HSK/mastery. Lô70–75 sửa nhiệm vụ/mẫu/giải thích ở17 bài integration (written02 đã đọc, chưa có sửa trong lượt này), thêm câu phân loại có dữ liệu thật, bảng kiểm, nhãn từng đoạn, mẫu viết đủ độ dài có Pinyin/Việt, đơn vị nói theo giây, mức chắc chắn và trình tự nguồn. Lô72 cũng sửa vận dụng đã ghi/sẽ ghi ở precision04. Lô76 sửa21 trường/5 bài dùng chung nguồn giao lưu/du ký: không bịa tỷ lệ thắng tăng khi thiếu baseline; di tích khác cổ tích. Hồ sơ158–169 giữ receipts; không replay.
- **Đã rà:** Đọc note/mẫu/câu chọn/giải thích/vận dụng của24 nhóm precision. Đọc Hán tự và hoạt động của18 bài integration thuộc6 nhóm (inference3, synthesis3, written3, spoken3, structure3, sectional3); một số nguồn dùng chung đã đọc trước. Đọc nghĩa Việt đầy đủ ở inference và synthesis01; không gọi đã rà mọi Pinyin/Việt/consumer của18 bài. Các mẫu cũ còn thiếu Pinyin, task/topic/meaning HSK1–3 và assessment HSK4 vẫn mở.
- **Đã kiểm:** Rehearsal/validation nội tại/backup/apply mỗi lô giữ43 bảng, heads khác, immutable parents và FK. Không browser/timed learner/Xưởng parity/Vitest/typecheck/full check theo yêu cầu. Cổng3000 đang listener PID13020; chỉ xác nhận server, chưa browser journey.
- **Dữ liệu giữ được:**217 bài4/40/40/55/78, stable IDs, progress/FSRS/lỗi/session/outbox/owner; giữ nháp mới, Premium/admin, .wrangler, docs/reports và output. humanReviewed:false; không USER-ACCEPTED/commit/push/deploy.
- **Mốc mới:** Lô77 apply5 trang/2 bài HSK1 số lượng và thời tiết;4 khối mẫu,6 câu chọn,2 vận dụng. Rà sáu bài time-place-events, chưa gọi mọi Pinyin/diagram/dictionary đã rà. Row032 gắn ở weather là 数量短语 trong inventory, cần rà ánh xạ grammar; source target mới dùng từ đã liên kết. Rehearsal đầu77 bị validator từ chối stage/kind/ID, rollback rồi sửa đúng schema, rehearsal/apply đạt. Hồ sơ170 giữ receipt. Còn ngữ liệu 下午 thiếu lượt hỏi khi đứng riêng.
- **Mốc78:** Đã apply4 danh sách sourceGrammarIds đúng nội dung đang dạy: số lượng, thứ/buổi, giờ/thời lượng và thời tiết/vị trí. Không đổi trang/đáp án/timer/IDs; hồ sơ171. Liên kết này không chứng minh đủ mọi nghĩa của row. Còn cần bổ sung 小 ở calendar, mẫu 处所+是/有+数量短语 ở location và luyện vị ngữ danh từ ở week; mẫu 下午 thiếu lượt hỏi cần sửa.
- **Tiếp theo:** Độ sâu ngữ pháp/task/topic/meaning HSK1–3, các mẫu và assessment còn thiếu rà, giao ngữ liệu cho Ôn/Nói/Lỗi theo phiên bản an toàn. Automation nội dung đã được bật lại theo yêu cầu tiếp tục; automation_update và automation.toml cùng xác nhận ACTIVE, lịch mỗi giờ và prompt/phạm vi giữ nguyên. get_goal hiện trả goal:null, không có goal tool nền đang chạy; automation là cơ chế nối việc, chỉ dừng khi thật sự hoàn tất.

## Thiên Lộ · nhượng bộ, điều kiện và đối chiếu nguồn · 04/10/2026

- **Module:** Thiên Lộ — IN-REVIEW; nội dung HSK0–4 chưa hoàn tất.
- **Người học thấy gì:** Lô51/53/54/57 đã phát hành12 nhóm ngữ pháp về bị động/đánh giá, vai trò/sai khiến, nhượng bộ và điều kiện. Tăng24 trang trong các bài hiện có, tổng chuỗi117 trang/24 bài có bổ sung ròng. Lô52 sửa40 trường Pinyin/3 bài. Lô55 sửa7 hoạt động tiệm bánh/lễ hội: loại dữ kiện bịa, sửa đáp án audit0, viết lại5 mẫu Trung/Pinyin/Việt và rubric. Lô56 sửa45 trường Pinyin/7 bài, gồm 垃圾 lājī, 拥挤 yōngjǐ và lỗi còn sót trong mẫu mới. Số trang không chứng minh đủ HSK/mastery.
- **Đã rà/phát hành:** Hồ sơ144–150 có revision/backup; các lô51–57 đã apply, không replay. Đọc sáu đoạn và hoạt động ngoài grammar của argument-02..04; argument-03/04 đang soạn sửa chung lô58, chưa phát hành. Lô57 hoàn tất bốn nhóm grammar argument-02; grammar argument-03/04 và stance vẫn còn. Validation/rehearsal/backup/apply giữ43 bảng, heads khác, immutable parents và FK; không chạy kiểm thử đã bỏ. Không coi các bài dùng chung nguồn đã được rà mọi hoạt động.
- **Dữ liệu giữ được:**217 bài4/40/40/55/78, stable IDs, progress/FSRS/lỗi/session/outbox; giữ drafts mới, Premium/admin, .wrangler, docs/reports và output. humanReviewed:false; không USER-ACCEPTED/commit/push/deploy.
- **Mốc nối tiếp:** Lô58 đã apply14 hoạt động/2 bài argument-03/04, hồ sơ151. Lô59 apply8 nhóm grammar/2 bài này,16 mẫu/16 câu chọn/8 vận dụng, net+16. Lô60 apply9 nhóm stance-01/02,18 mẫu/18 câu chọn/9 vận dụng, net+18; tổng chuỗi151 trang/28 bài bổ sung ròng, không chứng minh mastery. Hồ sơ152–153 giữ revision/backup. Lô61 đang rehearsal56 trường Pinyin/16 bài cho các lỗi đọc đã xác định; không coi là rà hết Pinyin. Đã đọc nguồn,7 hoạt động và4 grammar stance-03, đang xử lý; stance-04/05 còn chưa rà đầy đủ. Stance-02 còn lỗi mẫu Việt gọi thử ba tháng chưa xong dù nguồn có kết quả.
- **Mốc mới nhất:** Lô61 apply56 trường/16 bài; lô62 apply4 nhóm stance03 (8 mẫu/8 câu chọn/4 vận dụng, net+8); lô63 apply8 nhóm stance04/05 (16/16/8, net+16). Tổng chuỗi175 trang/31 bài có bổ sung ròng, không suy đủ HSK. Đã đọc nguồn và hoạt động ngoài grammar cả5 bài stance; toàn bộ grammar của nhóm này được soạn lại. Lô64 apply16 trường/3 bài: thử3 tháng đã có kết quả, ≤100 chữ, ranh giới mở rộng/so sánh, ổn định mùa đông và quan sát môi trường. Hồ sơ154–157 giữ receipts. Lô65 đã rehearsal54 trường/14 bài, đang apply: 卡住 qiǎ zhù, 行程 xíngchéng, 空调 kōngtiáo, 质量 zhìliàng, 将 jiāng, 成为 chéngwéi, 得 de và 古迹 là di tích. Không gọi mọi hoạt động ở các bài dùng chung đã rà toàn bộ. Một rehearsal62 từng bị database locked khi61 còn chạy; chưa ghi, sau61 hoàn tất rerun và apply đạt.
- **Tiếp theo:** Hoàn tất65 rồi grammar precision01/03/04/05, HSK1–3 và ma trận task/topic/meaning. Ôn/Nói/Lỗi còn cần giao nội dung theo phiên bản an toàn; chưa gọi liên thông hoàn tất. Automation chưa dừng vì phạm vi còn mở; chưa xác minh goal nền đang chạy.

## Thiên Lộ · đối chiếu nguồn và bổ sung ngữ pháp · 04/10/2026

- **Module:** Thiên Lộ — IN-REVIEW; phạm vi nội dung HSK0–4 chưa hoàn tất.
- **Người học thấy gì:** Lô35/37 sửa12 hoạt động ở precision-05/06, gồm đảo ngày–tối, nhầm báo cáo ho với số khách, tự thêm số người và phủ nhận thỏa thuận gia đình đã có. Lô36/38 sửa80 trường Pinyin ở các bản dùng chung. Lô39 bổ sung sáu nhóm mức độ/khả năng/định lượng:19 mẫu,17 câu chọn,6 vận dụng. Lô40 sửa39 trường 广播 guǎngbō, gồm lỗi còn sót sau lô36. Lô41–43 sửa141 trường/bản sao về nguồn nghệ thuật, thể thao và giao lưu, giữ điều kiện giả định, tự báo cáo, tỷ lệ, thời lượng và giới hạn nhân quả. Lô44 thêm chín nhóm liên kết:19 mẫu,18 câu chọn,9 vận dụng. Tổng chuỗi bổ sung ròng81 trang/17 bài, không phải chứng minh mastery/đủ HSK.
- **Đã rà/phát hành:** Hồ sơ128–137 có revision/backup. Đọc toàn bộ nguồn và hoạt động ngoài grammar precision-05/06, information-order-cohesion-02..05; grammar precision-06 và information-02..04 được soạn lại. Không gọi mọi hoạt động của các bài dùng chung đã rà. Lô45 đã apply56 thay đổi/4 bài văn hóa; lô46 apply45 thay đổi/3 bài khoa học. Lô47 apply bốn nhóm grammar ở information-05/event-01:11 mẫu,10 câu chọn,4 vận dụng, net+8 trang; tổng chuỗi89 trang/19 bài. Hồ sơ138–140 giữ revisions. Lô48 apply53 thay đổi/3 bài cỏ biển/đường mòn; lô49 apply hai nhóm 把 thời lượng/số lần/cách thức (6 mẫu,6 câu chọn,2 vận dụng, net+4 trang). Tổng chuỗi93 trang/20 bài, hồ sơ141–142. Lô50 apply51 thay đổi/4 bài dữ liệu công/chợ; đang apply51 và đã soạn52/53, chưa tính các lô này vào tổng. Release giữ43 bảng/heads khác/parents/FK; không chạy các kiểm thử đã bỏ.
- **Dữ liệu giữ được:**217 bài4/40/40/55/78, IDs, progress/FSRS/lỗi/session/outbox; drafts mới, Premium/admin, .wrangler, docs/reports và output. humanReviewed:false, không USER-ACCEPTED/commit/push/deploy.
- **Tiếp theo:** Hoàn tất lô48/49, tiếp rà nhóm event-agency-voice/argument-logic/stance và ngữ pháp còn lại HSK1–4. Consumer Ôn/Nói/Lỗi vẫn cần giao ngữ liệu theo phiên bản an toàn; không tuyên bố đồng bộ xong. Không dừng automation vì còn việc, không khẳng định goal nền đang chạy.


## Thiên Lộ · sửa đối chiếu nguồn, rubric và phó từ · 04/10/2026

- **Module:** Thiên Lộ — IN-REVIEW; chưa hoàn tất toàn phạm vi nội dung.
- **Người học thấy gì:** 24 bài HSK4 có rubric phản biện rõ vai trò ý kiến đối lập. precision-reference-quantity-02 sửa bảy hoạt động có mẫu/tiêu chí sai nguồn sân bay và lịch sử gia đình; năm mẫu mới có Trung/Pinyin/Việt. Ba bài chung nguồn sửa43 trường Pinyin. Sáu nhóm phó từ có28 mẫu,16 câu chọn,6 vận dụng mới; net+12 trang (bài18→30).
- **Đã rà/phát hành:** Lô24–27 apply với backup và validation nội tại; hồ sơ117–120 giữ revisions. Đọc đủ sáu đoạn nguồn, sáu grammar và bảy hoạt động của bài sửa; đọc24 câu hỏi/counterargument/boundary để sửa rubric, không gọi rà toàn văn24 bài. Giữ43 bảng, parent packages, heads ngoài lô, FK. Không chạy kiểm thử đã bỏ.
- **Dữ liệu giữ được:** 217 bài nền 4/40/40/55/78, stable IDs, FSRS/tiến độ/lỗi/phiên/outbox. Giữ Premium/admin và mọi draft mới; humanReviewed:false, không USER-ACCEPTED/commit/push/deploy. Tổng bổ sung trong chuỗi ngữ liệu là51 trang/13 bài, không phải mastery.
- **Tiếp theo:** Đối chiếu đáp án với toàn văn nguồn các bài HSK4 còn lại, tiếp độ sâu ngữ pháp HSK1–4 và nối ngữ liệu vào Ôn/Nói/Lỗi theo phiên bản an toàn. Lô28 đã sửa64 trường/7 bài dùng ba đoạn nguồn: 夏夜/市中心, 种树 zhòng, 操作熟练, 报销 hoàn trả chi phí, mua trùng dụng cụ/nhàn rỗi; hồ sơ121. Lô29 sửa7 hoạt động precision-01 để bám bảng dịch vụ và bến xe, năm mẫu Trung/Pinyin/Việt. Lô30 sửa34 trường Pinyin/3 bài dùng cùng sáu đoạn; hồ sơ122–123. Lô31 sửa6 hoạt động precision-03 tự thêm chi tiết ngoài nguồn; năm mẫu mới Trung/Pinyin/Việt. Lô32 sửa37 trường Pinyin/3 bài nguồn cầu cổ/thầy Trần, gồm 咳 ké, 长 cháng, 危险 wēixiǎn, 改为 wéi; hồ sơ124–125. Lô33 sửa7 hoạt động precision-04; lô34 sửa43 trường Pinyin/3 bài, hồ sơ126–127. Đã bật lại Vinext trực tiếp cổng3000 PID6624/session24110, không migration, chỉ xác nhận listener chưa browser. Lô35 sửa7 hoạt động precision-05; lô36 sửa40 trường Pinyin/3 bài, hồ sơ128–129. Lô37 sửa5 hoạt động precision-06: thỏa thuận3 tháng đã có, không tự thêm số người đêm đọc; lô38 sửa40 trường Pinyin/5 bài, hồ sơ130–131. Đã đọc sáu nhóm grammar precision-06 và phát hành lô39 (19 mẫu,17 câu chọn,6 vận dụng; net+12 trang, hồ sơ132; tổng chuỗi63 trang/14 bài). Tiếp các bài summary khác và grammar chưa rà sâu. Phát hiện 广播 còn bị đọc guǎngbò trong nguồn khác và một phần lô36; đang chuẩn bị sửa lô40, không coi lần rà trước không còn lỗi. Chưa dừng automation hoặc xác nhận goal nền.

## Thiên Lộ · hoàn tất thay ví dụ giữ chỗ HSK4 trong Từ điển · 02/10/2026

- **Module:** Thiên Lộ — IN-REVIEW; toàn phạm vi nội dung chưa hoàn tất.
- **Người học thấy gì:** Lô 17–23 phát hành thêm 705 mục từ HSK4, tổng 1.000/1.000 có ví dụ theo ngữ cảnh và nghĩa Việt được biên tập trong Xưởng/Từ điển. Giữ 12 sửa HSK3 và 39 trang bổ sung/12 bài từ các lô trước. Không suy đủ mọi nghĩa hoặc đủ HSK từ con số này.
- **Đã rà/phát hành:** Đọc/soạn các triple Trung/Pinyin/Việt và nghĩa Việt của 705 mục còn lại; hồ sơ110–116 giữ revision. Rehearsal/backup/apply đạt, 43 bảng/parents/heads khác/FK giữ nguyên. Current heads xác nhận 1.000 HSK4, không còn mẫu câu meta đã khoanh vùng. Không chạy các đợt kiểm thử đã bỏ.
- **Dữ liệu giữ được:** 217 bài nền 4/40/40/55/78, stable IDs, FSRS/tiến độ/lỗi/phiên/outbox, mọi draft mới và Premium/admin. humanReviewed:false; không USER-ACCEPTED/commit/push/deploy.
- **Tiếp theo:** Rà ngữ pháp/nhiệm vụ/chủ đề HSK1–4 và độ sâu bài học; giao ngữ liệu mới vào Ôn/Nói/Lỗi mà không đổi đáp án/phiên cũ. Snapshot fallback chưa nối runtime; chưa tuyên bố đồng bộ consumer. Chưa dừng automation vì phạm vi chưa hoàn tất, không khẳng định goal nền đang chạy.

## Thiên Lộ · sửa nghĩa, ngữ cảnh và liên từ HSK4 · 02/10/2026

- **Module:** Thiên Lộ — IN-REVIEW; phạm vi nội dung HSK0–4 chưa hoàn tất.
- **Người học thấy gì:** Các lô dictionary HSK4 3/5/6/7/9/12/13/16 đã sửa và phát hành 295 mục; cùng 12 HSK3 là 307 mục mới trong chuỗi này. Lô 16 giữ riêng 生1 động từ và 生2 tính từ theo syllabus trang 121. Thêm 6 trang/2 bài đối chiếu 既然/如果 và hai nghĩa 尽管. Lô 14 soạn lại ba nhóm liên từ (16 mẫu, 13 câu luyện, ba vận dụng), tăng thêm 6 trang/1 bài; tổng bổ sung ròng trong chuỗi là 39 trang/12 bài. Lô 8 sửa 16 trường Pinyin/4 bài; lô 11 sửa 52 trường và bản sao/4 bài về múa bóng, mẫu suy luận 既然 và Pinyin; lô 15 sửa 18 trường Pinyin/3 bài dùng đoạn nền tảng tự học. Không cộng số revision thành số bài độc nhất.
- **Đã rà/phát hành:** Hồ sơ 94–109, các plan tới round16 đã apply; không replay. Đã đọc gloss cả 1.000 HSK4 để triage, chưa rà đủ mọi nghĩa/cách dùng. Đọc toàn văn Hán tự/Việt và câu hỏi/giải thích của arts-process-timeline, nature-comparison-variation và information-order-cohesion-01; chưa gọi rà đủ mọi Pinyin/options. Lô 14 từng bị validation từ chối ID hàng syllabus, đã rollback rồi giữ source grammar registry gốc; lượt sau đạt. Release rehearsal/backup/apply, validation nội tại, 43 bảng/parents/heads ngoài lô/FK giữ nguyên. Không browser/Vitest/typecheck/full check. Đã bật Vinext trực tiếp trên DB hiện có (không chạy migration), cổng3000 listener PID14952/session23391; đây chỉ là xác nhận server lên, không phải browser journey.
- **Còn thiếu:** 705 ví dụ HSK4 nền vẫn là câu meta, cần soạn ngữ cảnh; ma trận ngữ pháp/nhiệm vụ/chủ đề HSK1–4 chưa rà đủ. Từ điển/Xưởng nhận bản sửa nhưng Ôn/Nói/bài tập legacy còn dùng curriculum nền. Chưa nối snapshot fallback vì thay trực tiếp gây drift đáp án và tái dựng phiên; không tuyên bố liên thông xong.
- **Dữ liệu giữ được:** 217 bài nền 4/40/40/55/78, stable IDs, tiến độ/FSRS/lỗi/phiên/outbox; giữ mọi draft mới, Premium/admin, .wrangler, docs/reports và output. humanReviewed:false, không USER-ACCEPTED/commit/push/deploy.
- **Tiếp theo:** Tiếp xử lý 705 câu meta HSK4 và các nhóm ngữ pháp còn gộp nhiều mục; nhóm liên từ information-order-cohesion-01 đã xử lý lô 14. Tiếp tục giải quyết consumer có phiên bản mà không thay nội dung phiên cũ. Không dừng automation vì chưa hoàn tất, chưa xác minh trạng thái goal nền.

## Thiên Lộ · ngữ liệu HSK3 và lỗi nghĩa HSK4 · 01/10/2026

- **Module:** Thiên Lộ — IN-REVIEW, chưa hoàn tất nội dung HSK0–4.
- **Người học thấy gì:** Hai lô HSK3 thêm 21 trang/7 bài, sửa 12 mục từ; HSK4 sửa nghĩa/ví dụ 40 mục từ và thêm 6 trang/2 bài dạy 白酒/博士. Tổng lượt này 27 trang/9 bài, 52 mục từ mới được sửa/phát hành. Nội dung đọc được qua release heads và biên tập được trong Xưởng.
- **Đã rà/phát hành:** Hồ sơ 94–97; bốn plan round1–4 đã apply, không replay. Validation nội tại, backup, 43 bảng bảo toàn, heads ngoài lô/parents/FK. Không chạy browser, Vitest, typecheck, full check. Đọc 95 triple ứng viên HSK3 và 70 triple ứng viên HSK4 để chọn sửa, chưa rà đủ toàn kho.
- **Thiếu hụt mới:** Cả 1.000 ví dụ HSK4 của package nền dùng câu meta “X là từ trọng tâm”. Đã sửa 40 trong projection Từ điển, còn 960; không suy số từ vắng khỏi bài. Nghĩa sai gồm 白酒, 博士, 大巴, 感动/感人, 歌声… Đã xuất snapshot 56 mục (gồm 4 HSK2 cũ) nhưng **chưa nối curriculum**: thay trực tiếp làm drift đáp án/version và mất khả năng tái dựng phiên cũ. Đã gỡ thử nghiệm runtime, không thay package nền hoặc dữ liệu phiên. Ôn/Nói/bài tập legacy vẫn còn đọc bản nền; versioned delivery là việc chưa xong.
- **Dữ liệu giữ được:** 217 bài nền 4/40/40/55/78, stable IDs, FSRS/progress/lỗi/session/outbox. Giữ Premium/admin, docs/reports, output, .wrangler; humanReviewed:false, chưa USER-ACCEPTED, không push/deploy.
- **Tiếp theo:** Tiếp sửa từ vựng HSK4 theo chủ đề, kiểm ngữ nghĩa các bài đã phát hành và ma trận ngữ pháp/nhiệm vụ/chủ đề; giải quyết versioned content delivery trước khi gọi đồng bộ Ôn/Lỗi hoàn tất. Không dừng automation khi phạm vi còn mở; chưa xác minh goal nền.

## Thiên Lộ · từ vựng HSK3, nghĩa và ngữ cảnh lô 1 · 01/10/2026

- **Module:** Thiên Lộ — IN-REVIEW, chưa hoàn tất phạm vi nội dung HSK0–4.
- **Người học thấy gì:** 12 trang/4 bài HSK3 dạy và luyện 矮, 爱人, 笔记本, 比如; sửa hai mục từ 矮/爱人 trong Xưởng/Từ điển. Có mẫu, giải thích, câu chọn và vận dụng khác ngữ cảnh; không tăng số bài. Snapshot fallback đã xuất nhưng chưa nối consumer curriculum (xem mốc mới nhất).
- **Đã rà/phát hành:** Current release heads và consumer; AI tự rà Trung/Pinyin/Việt/đáp án. 6 revision apply thành công với backup, validation nội tại, 43 bảng bảo toàn, parent packages/head khác/FK. Hồ sơ 94 ghi revision và giới hạn. Không chạy browser/Vitest/typecheck/full check. Đọc thêm 95 ví dụ ứng viên HSK3 để chọn lô tiếp, chưa coi đã rà đủ mọi nghĩa/ngữ cảnh.
- **Dữ liệu giữ được:** 217 bài nền 4/40/40/55/78, IDs, package nền và dữ liệu người học; không sửa Premium/admin, docs/reports hoặc output. humanReviewed:false, chưa USER-ACCEPTED, không push/deploy.
- **Tiếp theo:** Tiếp sửa ngữ liệu và độ sâu từ vựng theo nhóm, rồi ma trận ngữ pháp/nhiệm vụ/chủ đề HSK1–4. Không replay Pinyin boot-3 hoặc lô vocabulary-context-round1. Chưa dừng automation vì phạm vi chưa hoàn tất; không tuyên bố goal nền đang chạy.

## Thiên Lộ · thu gọn scope và bổ sung nền Pinyin · 01/10/2026

- **Module:** Thiên Lộ — IN-REVIEW. Người dùng yêu cầu phần còn lại chỉ rà độ sâu/tính đúng/độ phủ HSK0–4 và bổ sung nếu thiếu; bỏ các đợt kiểm thử còn lại. Không tiếp tục timed learner, browser/full check hoặc parity Xưởng như điều kiện hoàn thành mới. Automation đã cập nhật theo phạm vi này; không tự USER-ACCEPTED.
- **Người học thấy gì:** boot-3 có thêm 9 trang dạy cấu tạo âm tiết, nguyên âm/vần, b/p–d/t–g/k, đuôi mũi, u/ü/y/w, đặt dấu, tự kiểm và vận dụng 旅行. Giữ tất cả trang/khối/targets cũ; dùng loại khối Xưởng đang hỗ trợ. Không cộng điểm phát âm từ tự đọc/hiểu ký hiệu.
- **Đã rà/phát hành:** Đọc bốn manuscript HSK0, soạn/rà supplement ở boot-pinyin-foundations.mjs; hồ sơ 92. Apply local exit0, revision 7e57e0f9-1be6-4797-b138-7910ee151d26, backup và 43 bảng được giữ; validation nội tại của release repository. Không chạy test suite/browser/typecheck theo yêu cầu mới.
- **Dữ liệu giữ được:** 217 bài nền, không đổi lesson IDs hay dữ liệu học; humanReviewed:false, không push/deploy. Không thêm bài chỉ để tăng số lượng.
- **Tiếp theo:** Rà nội dung HSK1–4. Triage 2.000 từ: tất cả có lesson assignment; 182 từ HSK3 và 569 từ HSK4 chưa có literal occurrence trong trang của các bài gắn ID. Đối chiếu toàn kho còn 95/254 ứng viên không thấy trong lessonPages, nhưng đều có ví dụ từ điển. Hồ sơ 93 đọc năm trường hợp, xác định ví dụ 爱人 cần sửa nghĩa phối ngẫu; chưa phát hành sửa từ vựng. Không tuyên bố hoàn tất độ phủ từ phép dò chuỗi. Tiếp đọc/rà các ứng viên và bổ sung ngữ cảnh đúng cấp, không quay lại backlog kiểm thử đã bỏ.

## Thiên Lộ/Xưởng · inventory cấu trúc bản phát hành · 01/10/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; chưa hoàn tất v0.2.
- **Người học thấy gì:** Không đổi nội dung hoặc UI trong lượt audit này.
- **Đã kiểm:** Audit read-only các release heads: 217 document hợp lệ, 3.065 trang, 1.676 activity đều có learningTarget, 44 activity có đồng hồ; không bài nào thiếu stage practice hoặc transfer. Script audit-published-learning-depth.ts, typecheck/ESLint đạt; chi tiết từng ID/revision trong published-learning-depth-audit.json thuộc hồ sơ redesign. Đây là cấu trúc, không chứng minh 1.676 câu độc nhất, target đúng ngữ nghĩa, đủ HSK hoặc mastery.
- **Dữ liệu giữ được:** Không ghi D1, không đổi release/learner data; humanReviewed:false, chưa USER-ACCEPTED, không push/deploy.
- **Tiếp theo:** Kiểm timed learner thật và ma trận độ sâu ngữ nghĩa, parity Xưởng theo checklist v0.2; không tính audit cấu trúc này là nghiệm thu nội dung.

## Thiên Lộ/Xưởng · khôi phục reader khi API gián đoạn · 01/10/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; toàn scope v0.2 chưa hoàn tất.
- **Người học thấy gì:** Bài chỉ có document đã phát hành (như boot-1) mở lại đúng bản học và nháp đã lưu khi API nội dung thất bại, thay vì rơi thẳng về giao diện legacy. Snapshot không hợp lệ/phiên bản tương lai không bị ghi đè.
- **Đã kiểm:** Typecheck/ESLint đạt; 11 test panel/session và 9 test IndexedDB đạt. Browser guest cô lập: API chậm, API outage, nháp cũ, chủ động cập nhật/giữ history và version999 đạt. Hồ sơ 91 ghi rõ đây là API-only outage và fixture snapshot cũ, chưa phải full offline PWA. Server có timeout; khởi động lại Vinext, lượt sau đạt, chưa tuyên bố sửa nguyên nhân chậm.
- **Dữ liệu giữ được:** 217 baseline (4/40/40/55/78), không đổi content heads/IDs/progress/FSRS/lỗi/owner/outbox/D1. humanReviewed:false; không push/deploy, chưa USER-ACCEPTED.
- **Tiếp theo:** Timed learner, parity Xưởng và ma trận độ sâu/toàn checklist v0.2. Goal tool đang paused; không tuyên bố goal nền đang chạy hoặc hoàn tất.

## Thiên Lộ/Xưởng · khép lỗ trống học liệu thị giác HSK4 · 01/10/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; chưa hoàn tất toàn scope v0.2.
- **Người học thấy gì:** Phát hành thêm 18 bài summary với 36 trang sơ đồ cuối bài và 18 bài integration với 60 trang đối chiếu sau tự luyện. Sơ đồ khớp toàn văn nguồn, có provenance, sửa được trong Xưởng; giữ nhiệm vụ, đáp án, đồng hồ, targets và trang cũ. Không coi sơ đồ tái sử dụng là ảnh mới độc nhất.
- **Đã kiểm:** Rehearsal/backup/apply mỗi lô 18 giữ 43 bảng, parent packages/head khác/FK. Regression 42 bài so nút với sơ đồ nguồn và bảo toàn trang cũ đạt; typecheck/ESLint đạt. Browser summary đủ36 trang/18 bài đạt nhãn/ý nghĩa/mobile375. Browser integration đủ60 trang/18 bài đạt nhãn/ý nghĩa/mobile375. Hồ sơ 89/90.
- **Dữ liệu giữ được:** 217 baseline/published (4/40/40/55/78), ID/progress/FSRS/lỗi/phiên/owner/outbox. Audit mới: 217 bài có ít nhất một ảnh hoặc sơ đồ, 79 bài có page art, 0 scene dùng nền chung, 0 bài thiếu cả image/diagram. Đây chỉ là inventory học liệu, không chứng minh review đủ sâu, đủ HSK hoặc mastery. humanReviewed:false; không push/deploy, chưa USER-ACCEPTED.
- **Tiếp theo:** Kiểm ma trận độ sâu/nhu cầu thêm bài, timed learner, pinned revision/offline, parity Xưởng và đối chiếu toàn checklist v0.2. Không replay các plan đã apply. Giữ báo cáo full check timeout và rerun riêng ở mốc dưới.

## Thiên Lộ/Xưởng · gate rộng và lô sơ đồ lập luận đang thử · 01/10/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; chưa hoàn tất v0.2.
- **Người học thấy gì:** Giữ các bản Pinyin và 12 trang sơ đồ đã phát hành. Đã chuẩn bị 36 trang sơ đồ cuối bài cho 18 bài stance/event/cohesion/concession; chưa coi phát hành khi rehearsal/apply chưa xong.
- **Đã kiểm:** Full check qua validator/lint/typecheck/restore, test 429 file đạt và 1 file lỗi timeout 10 giây/EBUSY tại generateReleaseEvidence. Chạy riêng file đó đạt 21/21; full command vẫn exit1. Build riêng đã tạo dist/build-provenance.json; mất process handle sau thay đổi môi trường nên không khẳng định exit của command. Kiểm lại bundle/Premium boundary exit0, cảnh báo advisory 1045.4 KiB. Regression lô sơ đồ 24 bài đạt; gate lô 18 và rehearsal đang chạy.
- **Dữ liệu giữ được:** 217 bài nền, không push/deploy; .wrangler và dữ liệu học được giữ. humanReviewed:false; chưa USER-ACCEPTED.
- **Tiếp theo:** Hoàn thành rehearsal/apply/browser 18 bài từ plan summary-map v1, tiếp 18 bài tích hợp còn cần quyết định thị giác và các yêu cầu v0.2. Server cũ đã dừng sau thay đổi môi trường; đã bật lại Vinext cổng3000, không reset D1.

## Thiên Lộ/Xưởng · sơ đồ đối chiếu diễn đạt chính xác HSK4 · 01/10/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; phạm vi v0.2 còn mở.
- **Người học thấy gì:** Sáu bài precision-reference-quantity có 12 sơ đồ theo đúng nguồn đọc để đối chiếu sau tự viết; dùng khối diagram biên tập được, giữ các trang cũ và bài vận dụng. Có hướng dẫn không coi sơ đồ là đáp án duy nhất/điểm năng lực.
- **Đã kiểm:** Rehearsal/backup/apply 6 revision giữ 43 bảng/parent packages/head khác/FK; 3 regression Pinyin và sơ đồ đạt; typecheck/ESLint/diff check đạt. Browser 12 trang, đúng nhãn/ý nghĩa và mobile375 đạt. Hồ sơ 87. Thêm browser learner nghe–chép HSK2/đọc HSK3: nháp, lịch sử hỗ trợ, snapshot và footer mobile/ngang đạt trong guest cô lập với prerequisite fixture; lượt đầu tải lâu, lượt sau đạt, không tuyên bố sửa runtime. Hồ sơ 88. Full check đang chạy, chưa ghi đạt. Audit sơ đồ v1 được khóa giữ nguyên vì release plan tham chiếu; không ghi đè khi audit tiếp.
- **Dữ liệu giữ được:** 217 bài nền, IDs/progress/FSRS/lỗi/phiên/owner/outbox; giữ hai lô sửa Pinyin trước. humanReviewed:false; chưa USER-ACCEPTED, không push/deploy.
- **Tiếp theo:** Còn 36 bài HSK4 chưa có image/diagram cần quyết định học liệu theo mục tiêu (không mặc định thêm sơ đồ vào assessment); tiếp kiểm learner modalities, parity Xưởng và ma trận độ sâu theo v0.2. Chưa hoàn tất toàn goal.

## Thiên Lộ/Xưởng · Pinyin nguồn HSK4 và audit sơ đồ · 01/10/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; scope v0.2 chưa hoàn tất.
- **Người học thấy gì:** Phát hành 5 revision sửa 14 trường Pinyin, tiếp 21 revision sửa 59 trường ở 10 đoạn nguồn: hái/huán, cháng/zhǎng, gěi/jǐ, zūnzhòng và tách từ. Đồng bộ bài nguồn và bài tổng hợp; giữ Hanzi, nghĩa, đáp án, targets.
- **Đã kiểm:** Hai regression test đạt; typecheck, ESLint và diff check đạt. Rehearsal/backup/apply giữ 43 bảng, parent packages, head khác/FK. Browser Xưởng dùng renderer chung đạt 5 trang + 23 trang/21 bài, Pinyin thực tế và mobile375. Lượt đầu endpoint demo và render lỗi; render báo Network connection lost, chạy lại đạt; chưa coi lỗi runtime đã sửa. Hồ sơ 85/86. Audit hiện tại không còn bảy mẫu lỗi Pinyin đã khoanh vùng, không suy hết lỗi toàn kho.
- **Dữ liệu giữ được:** 217 baseline (4/40/40/55/78), không đổi IDs/progress/FSRS/lỗi/phiên/owner/outbox; humanReviewed:false. Không push/deploy, chưa USER-ACCEPTED.
- **Tiếp theo:** 42 bài HSK4 thiếu image/diagram có 108 nguồn đọc khớp nguyên văn với sơ đồ nguồn; mới audit, chưa gắn sơ đồ. Rà quyết định sư phạm (không lộ đáp án phần tự luyện), tiếp learner modalities/parity Xưởng và toàn scope v0.2. Không replay hai lô Pinyin đã apply.

## Thiên Lộ/Xưởng · đóng cảnh nền chung HSK2 · 01/10/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW, toàn scope v0.2 còn mở.
- **Người học thấy gì:** Mười revision/20 trang cuối thuộc HSK2 reference, reconstruction, travel có ảnh riêng; các giá trị số, vị trí và kế hoạch hiển thị bằng caption biên tập được. Không thay targets hoặc bài tập, giữ sửa lời đáp travel-02.
- **Đã kiểm:** Rehearsal/backup/apply 5+5 giữ 43 bảng, parent packages, head khác/FK; browser 10+10 trang tải ảnh/caption/mobile375 đạt; typecheck/ESLint đạt. Hồ sơ 83/84; prompt/gốc trong drafts, WebP trong public/lessons/ngoc-dien.
- **Dữ liệu giữ được:** 217 baseline/published (4/40/40/55/78), ID/progress/FSRS/lỗi/phiên/owner/outbox. Audit: 79 bài có page art; scene/dialogue dùng ảnh chung = 0. Không đồng nhất hết fallback với hoàn tất sư phạm; 42 bài HSK4 chưa có image/diagram cần rà quyết định học liệu. humanReviewed:false; chưa USER-ACCEPTED, không push/deploy.
- **Tiếp theo:** Rà 42 bài HSK4 chưa có học liệu thị giác; kiểm các luồng learner dictation/reading/timed, pinned revision và parity Xưởng trong phạm vi v0.2. Web local cổng 3000 đang chạy; không phát hành lại các plan đã apply.

## Thiên Lộ/Xưởng · môi trường, ngữ pháp và lời đáp địa điểm HSK2 · 01/10/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 chưa hoàn tất.
- **Người học thấy gì:** Phát hành 11 revision/22 trang ảnh đúng ngữ cảnh nhóm person-events-environment, aspect-time, clause-linking, complements-motion. Một revision travel-leisure-02 sửa lời đáp địa điểm, đồng bộ Hanzi/Pinyin/Việt giữa dialogue và trang học. Kho Xưởng có đủ ảnh và caption.
- **Đã kiểm:** Rehearsal/backup/apply 5+6+1 giữ 43 bảng, parent packages, head khác/FK. Browser 10+12 trang ảnh và câu địa điểm đạt; regression correction 1/1, typecheck/ESLint đạt. Server cũ dừng sau thay đổi môi trường; khởi động lại Vinext cổng 3000, không sửa/xóa D1. Chưa coi lỗi Network connection lost cũ đã được sửa. Hồ sơ 80/81/82.
- **Dữ liệu giữ được:** 217 baseline/published (4/40/40/55/78), IDs/tiến độ/FSRS/lỗi/phiên/owner/outbox không đổi. 69 bài có page art, 20 scene chung thuộc 10 bài HSK2; không suy đủ năng lực hoặc đủ scope từ số liệu này. humanReviewed:false; không push/deploy, chưa USER-ACCEPTED.
- **Tiếp theo:** Năm ảnh travel/reference đã sinh, xem và lưu WebP/prompt-results nhưng chưa gắn/phát hành; tiếp tục 10 bài cuối dùng cảnh chung rồi kiểm các yêu cầu v0.2 còn thiếu.

## Thiên Lộ/Xưởng · năm bài HSK2 học tập–văn hóa · 30/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW, scope v0.2 còn mở.
- **Người học thấy gì:** Năm revision study-work-culture-01..05 phát hành local với 10 trang có ảnh/chú thích đúng từng bối cảnh; ảnh chọn được trong Xưởng.
- **Đã kiểm:** Rehearsal/backup/apply giữ 43 bảng, parent packages, head khác/FK; browser 10 trang tải ảnh/caption/mobile đạt; typecheck/ESLint đạt. Hồ sơ 79, prompt và PNG gốc lưu đủ.
- **Dữ liệu giữ được:** 217 bài nền, IDs và tiến độ/FSRS/lỗi/phiên/owner/outbox giữ nguyên; 58 bài có page art, 42 scene chung còn lại trong 21 bài HSK2. humanReviewed:false; không push/deploy, chưa USER-ACCEPTED.
- **Tiếp theo:** Tiếp tục 21 bài còn cảnh chung. Đang sửa lời đáp địa điểm trong travel-leisure-02: rehearsal đạt nhưng chưa apply; không tính sửa nội dung này đã phát hành.

## Thiên Lộ/Xưởng · bảy bài HSK2 có ảnh theo ngữ cảnh · 30/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; toàn scope v0.2 chưa hoàn tất.
- **Người học thấy gì:** Phát hành local 7 revision/14 trang context–hội thoại: daily-needs-family-01..05 và travel-leisure-03/04. Bảy ảnh riêng cho nhờ mở cửa, bàn bữa tối, chọn quần, hỏi sức khỏe, gia đình, chuẩn bị chuyến bay, hẹn thể thao. Caption thật và kho Xưởng hỗ trợ biên tập; không đổi nội dung bài vận dụng/targets.
- **Đã kiểm:** Full check kết thúc đạt (426 test files, 2621 tests, build) trước lô media mới; typecheck/targeted ESLint/diff check sau lô đạt. Rehearsal/backup/apply 3+4 giữ 43 bảng bảo vệ, parent packages, heads khác và FK. Browser Xưởng 6+8 trang đạt tải ảnh/caption/mobile 375 px; lượt life đầu Network connection lost, chạy lại đạt, lỗi runner chưa giải quyết. Hồ sơ 77/78 và prompt nguồn đã lưu.
- **Dữ liệu giữ được:** 217 bài nền phát hành, HSK0–4 4/40/40/55/78; ID/tiến độ/FSRS/lỗi/phiên/owner/outbox giữ nguyên. 53 bài có page art, 52 scene chung còn lại trong 26 bài HSK2. Không suy mastery từ inventory; humanReviewed:false. Không push/deploy, chưa USER-ACCEPTED.
- **Tiếp theo:** Tiếp tục ảnh/ngữ cảnh của 26 bài HSK2 còn lại và kiểm toàn scope Thiên Lộ/Xưởng; không phát hành lại bảy kế hoạch đã áp dụng.

## Thiên Lộ/Xưởng · học tập/công việc, di chuyển/giải trí và mở đầu HSK0 · 30/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 còn mở.
- **Người học thấy gì:** Phát hành local 10 revision/17 trang: professional-2..4 có ba cảnh riêng ở mission/hội thoại; journey-1 hội thoại đúng nhà–taxi–trường; journey-2 ảnh hai người xem phim/nghe nhạc; hai sơ đồ journey focus; professional-1 listen gắn cảnh trường; boot-2 hai trang chào hỏi có ảnh riêng; boot-1/3/4 intro focus cho kiến thức âm/thanh. Không thay nội dung câu/target/đáp án/rubric hoặc gắn tranh lộ dữ kiện vào tự luyện.
- **Đã kiểm:** Rehearsal/backup/apply 3+3+4 revision đạt, giữ 43 bảng bảo vệ, parent packages, head khác, FK. Browser 6 trang professional + 4 trang ảnh journey/trường kèm hai sơ đồ + 5 trang boot đạt, ảnh tải thật, caption mobile và không tràn ngang. Typecheck/ESLint/diff check đạt. Hồ sơ 74/75/76 và prompt/gốc ảnh lưu trong drafts. Full check đang chạy, chưa ghi đạt.
- **Dữ liệu giữ được:** 217 bài nền (4/40/40/55/78), IDs, progress/FSRS/lỗi/phiên/owner/outbox không đổi. 46 bài có page art, 66 scene chung còn lại thuộc HSK2; không đồng nhất inventory với đủ chất lượng/mastery. humanReviewed:false; không push/deploy.
- **Tiếp theo:** Gate rộng và lô hình ảnh/ngữ cảnh HSK2, tiếp tục kiểm liên thông và Xưởng trong scope v0.2. Chưa USER-ACCEPTED.


## Thiên Lộ/Xưởng · hoàn thiện media nhóm thời gian–vị trí và biên tập chú thích · 30/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 chưa hoàn tất.
- **Người học thấy gì:** Phát hành local thêm 6 revision/11 trang của nhóm thời gian–vị trí: thời tiết ở nhà, hai sách/mã 203, lịch học–nghỉ–gặp bạn, ngày hẹn, giờ học, cốc gần–xa. Kết hợp ảnh sách–mèo và 6 sơ đồ focus đã phát hành, nhóm có học liệu theo từng tình huống. Không dùng tranh chứa đáp án cho trang tự luyện. Kho Xưởng có 6 ảnh mới và caption bằng chữ thật; giữ ảnh/sơ đồ trước.
- **Xưởng/renderer:** Chỉnh caption/focal point sau chọn ảnh ngay trong khối và minh họa trang; chọn media cho trang không làm rơi caption/focal metadata. Schema optional tương thích bài cũ, validation chặn giá trị sai. Caption mobile/ngang không bị ẩn/đè ảnh. Nhãn người nói không gán 甲 cho mọi “Lượt 2”/câu mẫu, chỉ A/B mới hiện 甲/乙.
- **Đã kiểm:** Rehearsal/backup/apply cả lô giữ 43 bảng bảo vệ, parent packages, head khác và FK. Browser 2 trang weather + 4 numbers/week + 5 remaining đạt, ảnh tải thật và mobile không tràn. Xưởng QA cùng nháp `1b46e15d-d319-466d-9cbb-82d2c1198518`: tải/reuse media, sửa caption/focal, save/reload/preview, usage reference; cả khối ảnh và minh họa trang kiểm 3 viewport đạt, release heads không đổi. Typecheck, ESLint/diff check; schema/renderer 11 test đạt. Local runner từng Network connection lost, lượt lại đạt; chưa kết luận runtime đã sửa.
- **Dữ liệu giữ được:** 217 bài nền (4/40/40/55/78), IDs/targets/Hanzi/Pinyin/Việt/đáp án/rubric và tiến độ/FSRS/lỗi/phiên/owner/outbox giữ nguyên. Audit 41 bài có page art, 83 scene chung còn lại; không dùng số này làm thước đo hoàn tất sư phạm. humanReviewed:false. Hồ sơ 71/72/73, prompt/gốc ảnh được lưu. Không push/deploy.
- **Tiếp theo:** Hoàn thiện các cảnh HSK1 công việc/học tập và HSK2 còn thiếu, cùng kiểm learner các dạng chưa đủ evidence; chưa USER-ACCEPTED.


## Thiên Lộ/Xưởng · chú thích ảnh và bảo toàn tự đối chiếu · 30/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; toàn bộ goal v0.2 chưa hoàn tất.
- **Người học thấy gì:** Khối ảnh hiển thị caption đã lưu trong metadata Xưởng bằng figcaption. Ảnh có chú thích dùng luồng nội dung bình thường để chữ không bị ảnh định vị tuyệt đối đè lên. Không thay ảnh riêng của trang hay sửa release payload.
- **Đã kiểm:** Typecheck và targeted ESLint đạt; StudioContentPreview 4/4, gồm metadata qua schema/renderer. Browser guest mới không seed progress kiểm boot-1: viết rubric dở, reload giữ chữ, tiêu chí ẩn trước đối chiếu, tích tiêu chí/reload giữ, sửa câu không được chấm tự động; tra từ, 10 câu luyện, kết quả, sửa lỗi thật và reload; CTA ở desktop/mobile/ngang đạt. Script chờ màn tải xong tối đa 30 giây thay ngưỡng 5 giây; các lượt đầu dừng khi app còn loading, không coi là mất dữ liệu hay đã sửa tốc độ runtime. Caption mới kiểm renderer, chưa có browser upload/caption toàn vòng.
- **Dữ liệu giữ được:** Không sửa D1 hoặc release heads; giữ 217 bài nền (4/40/40/55/78), ID/tiến độ/FSRS/lỗi/phiên/owner/outbox. Các sửa đổi user/task khác giữ nguyên; không push/deploy.
- **Tiếp theo:** Tiếp tục media theo bài và kiểm Xưởng upload/metadata cùng các dạng learner còn thiếu; chưa USER-ACCEPTED.


## Thiên Lộ/Xưởng · minh họa đúng vị trí sách và mèo · 30/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 còn mở.
- **Người học thấy gì:** Trang hội thoại bài hsk1-time-place-events-05-location có ảnh riêng sách trên bàn, mèo dưới bàn. Ảnh được chọn trong Xưởng, có alt/provenance; sơ đồ vừa phát hành giữ nguyên. Context cần hình khác cho hai cốc gần–xa, chưa tính hoàn tất.
- **Đã kiểm:** Rehearsal/backup/apply revision 1/1, 43 bảng bảo vệ, parent packages, head khác và FK đạt; typecheck/lint/diff check đạt. Browser Xưởng local 3000 tải ảnh đúng revision, mobile 375 px không tràn ngang. Hồ sơ `70-REVIEW-LOCATION-ART.md`.
- **Dữ liệu giữ được:** Giữ 217 bài nền (4/40/40/55/78), IDs, targets, nội dung và tiến độ/FSRS/lỗi/phiên/owner/outbox. humanReviewed:false; không push/deploy.
- **Tiếp theo:** Tiếp tục minh họa theo tình huống cùng kiểm learner/Xưởng trong toàn scope; không USER-ACCEPTED.


## Thiên Lộ/Xưởng · sáu sơ đồ thời gian–vị trí dùng đủ vùng học · 30/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 chưa hoàn tất.
- **Người học thấy gì:** Sáu trang sơ đồ số lượng, ngày tháng, lịch tuần, giờ/thời lượng, vị trí và nơi cư trú dùng layout focus, không bị ảnh cảnh chung chiếm vùng đọc. Nội dung sơ đồ vẫn biên tập được trong Xưởng; context/hội thoại chưa được tính là hoàn tất media.
- **Đã kiểm:** Phát hành local 6/6 revision sau rehearsal/backup, giữ 43 bảng bảo vệ, parent packages và các head ngoài phạm vi; FK đạt. Typecheck, targeted ESLint, diff check đạt. Browser kiểm cả sáu trang từ revision đã phát hành, nhãn chính xác, mobile 375 px không tràn ngang. Lượt browser đầu lỗi lấy tài khoản demo; API sau đó trả 200 và chạy lại đạt, chưa tuyên bố đã sửa runtime gián đoạn. Hồ sơ `69-REVIEW-TIME-PLACE-DIAGRAMS.md`.
- **Dữ liệu giữ được:** IDs, target, Hanzi/Pinyin/Việt, đáp án/rubric, D1 tiến độ/FSRS/lỗi/phiên/owner/outbox không đổi. Giữ 217 bài nền (4/40/40/55/78); 35 bài có page art, scene chung 101 → 95. Giữ humanReviewed:false.
- **Tiếp theo:** Tiếp tục media theo tình huống và kiểm hành trình learner/Xưởng trong scope v0.2; chưa USER-ACCEPTED, không push/deploy.


## Thiên Lộ/Xưởng · chín hội thoại sinh tồn dùng cảnh đúng tình huống · 30/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 chưa hoàn tất.
- **Người học thấy gì:** Phát hành 9 revision `survival-1..9`: trang hội thoại không quay về cảnh campus/city chung. survival-1 có tranh trả sách/cảm ơn mới; tám bài còn lại chọn ảnh riêng của cùng tình huống context, không kế thừa tự động giữa các trang khác cảnh. Ảnh mới có trong kho Xưởng, alt/provenance, `humanReviewed:false`.
- **Đã kiểm:** Kế hoạch pin revision/hash, diễn tập rollback rồi backup/apply cả 9 bài, giữ 43 bảng bảo vệ, package cha, head khác và FK. Typecheck, targeted ESLint, diff check đạt. Browser Xưởng local 3000 kiểm 9 ảnh tải thật, nút nghe tổng hợp và mở lời thoại từng mục, mobile 375 px không tràn ngang. Hồ sơ `68-REVIEW-SURVIVAL-DIALOGUE-VISUALS.md`; prompt/gốc ảnh trong `lesson-scene-generation-2026-09-30-book.json`.
- **Dữ liệu giữ được:** Giữ Hanzi/Pinyin/Việt, target, đáp án/rubric, IDs, nội dung sửa vai survival-1 và D1 học/tiến độ/FSRS/lỗi/phiên/owner/outbox. 217 bài nền giữ nguyên, HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78. Audit D1: 35 bài có page art; scene chung giảm 110 → 101. Không coi giảm ảnh chung là chứng nhận hoàn tất sư phạm.
- **Tiếp theo:** Tiếp tục các cảnh và sơ đồ thời gian–vị trí/công việc cùng kiểm learner toàn scope; chưa USER-ACCEPTED, không push/deploy.

## Xưởng · lưu rubric và ảnh riêng rồi xem đúng bản đã sửa · 30/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 chưa hoàn tất.
- **Editor thấy gì:** Trên cùng nháp QA chưa phát hành của lượt trước, chuyển lựa chọn sang tự viết/rubric, thêm tiêu chí và hướng dẫn, chọn ảnh quầy táo và sửa alt bằng biểu mẫu. Lưu/reload giữ rubric/ảnh; preview tải đúng ảnh, ẩn tiêu chí trước khi đối chiếu và mở đúng tiêu chí sau khi nhập.
- **Đã kiểm:** `smoke-studio-edit-roundtrip.ts --resume` đã mở rộng và đạt cả sơ đồ/đáp án/phản hồi/rubric/ảnh, lưu/reload/preview, mobile 375 px; typecheck và ESLint đạt. Toàn bộ release heads trước/sau giữ nguyên. Lượt chạy cùng lúc typecheck gặp lại Miniflare Network connection lost khi mở trang; kiểm lại sau các gate trên cùng server đạt, chưa xác định nguyên nhân hay tuyên bố lỗi đã sửa.
- **Dữ liệu giữ được:** Tái dùng revision QA `1b46e15d-d319-466d-9cbb-82d2c1198518`, không thêm nháp trùng, không phát hành. Giữ 217 bài nền, HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 cùng D1 học/ID/tiến độ/FSRS/lỗi/phiên/owner/outbox. QA là kiểm khả năng biên tập, không review nội dung người học.
- **Tiếp theo:** Tiếp tục media theo bối cảnh toàn kho và learner các dạng bài; rà lỗi server local tái diễn nếu chặn hành trình. Chưa USER-ACCEPTED, không push/deploy.

## Xưởng · lưu và mở lại sơ đồ, đáp án, phản hồi · 30/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 chưa hoàn tất.
- **Người học/editor thấy gì:** Đã kiểm sửa nhãn/ghi chú sơ đồ, nội dung lựa chọn, đáp án đúng và phản hồi trong biểu mẫu Xưởng; lưu, reload và preview dùng đúng giá trị mới. Dùng bản QA riêng chưa phát hành từ hai trang daily-1, không sửa release hiện hành.
- **Đã kiểm:** `smoke-studio-edit-roundtrip.ts --resume` đạt cả lưu/reload/preview và mobile 375 px không tràn ngang. Đối chiếu toàn bộ content_release_heads trước/sau không đổi. Script tạo nháp một lần rồi tiếp tục cùng revision `1b46e15d-d319-466d-9cbb-82d2c1198518`; giữ nháp QA có nhãn rõ để kiểm lại, không phát hành/xóa. Lượt đầu redirect và một lượt mở trang gặp Miniflare Network connection lost; sau server khởi động lại và hydration hoàn tất, hành trình đạt. Sửa selector test để phân biệt preview đang soạn với preview hiện tại; không sửa production để né lỗi. ESLint, typecheck và diff check đạt.
- **Dữ liệu giữ được:** Không đổi 217 release heads, stable IDs, D1 học, tiến độ/FSRS/lỗi/phiên/owner/outbox; HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 giữ nguyên. Đây là kiểm editor, không phải human review nội dung.
- **Tiếp theo:** Tiếp tục rubric/media và liên kết module theo phạm vi v0.2; 110 scene còn dùng ảnh chung ở audit trước. Chưa USER-ACCEPTED, không push/deploy.

## Thiên Lộ · lỗi từ Thử Luyện tới Nghịch Cảnh Lục · 29/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; kiểm consumer Nghịch Cảnh Lục trong phạm vi liên thông.
- **Người học thấy gì:** Không đổi UI/runtime; xác minh luồng lỗi thật bằng guest mới: trả lời sai một câu boot-1, hoàn tất 10 câu, mở Nghịch Cảnh Lục thấy đúng prompt, tự trả lời đúng không hint và tải lại giữ đã xử lý.
- **Đã kiểm:** `smoke-learner-study-trial.ts --mistakes` đạt toàn hành trình học/tra từ/luyện/kết quả và hóa giải. Queue lấy bản ghi lỗi do bài luyện tạo; correctedStreak=1 và nút bắt đầu hóa giải khóa khi không còn lỗi chưa xử lý sau reload. Kết quả này chỉ chứng minh tự sửa trong lượt, không mastery dài hạn. Typecheck và targeted ESLint đạt.
- **Dữ liệu giữ được:** Browser context cô lập, không seed evidence/completion, không đăng nhập account hay sửa D1 học. 217 bài nền và inventory HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 giữ nguyên; chưa mở rộng kết luận sang rubric tự đối chiếu hoặc mọi activity trang.
- **Tiếp theo:** Tiếp tục learner/nháp Xưởng theo dạng hoạt động khác và media còn thiếu; goal v0.2 vẫn mở, chưa USER-ACCEPTED, không push/deploy.

## Thiên Lộ · kiểm guest học–tra từ–luyện–kết quả · 29/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 chưa hoàn tất.
- **Người học thấy gì:** Không đổi UI trong lượt này; bổ sung hành trình kiểm browser thật cho boot-1 trên server local. Guest mới đọc trang phát hành, trả lời hoạt động, tải lại giữ lựa chọn, mở từ điển đúng bài trong tab mới, vào Thử Luyện, xem lại lý thuyết/quay lại đúng câu, tải lại phiên, trả lời 10 câu và tới kết quả có giải thích giới hạn mastery.
- **Đã kiểm:** `smoke-learner-study-trial.ts` đạt, typecheck và targeted ESLint đạt. Thanh trả lời/kết quả nằm trong viewport 1280×800, 375×812 và 812×375. Browser context cô lập, không seed completion/evidence. Web trước lượt đã dừng (không listener/process); bật lại `npm run dev`, không migration mới. Lượt đầu lỗi 500 Network connection lost tại reload do Miniflare; chạy lại cùng server đạt toàn hành trình, chưa kết luận sửa nguyên nhân. Server local 3000 tiếp tục chạy.
- **Dữ liệu giữ được:** Không sửa nội dung/D1 học hoặc browser người dùng; toàn bộ tiến trình test thuộc guest cô lập. Inventory 217 bài giữ nguyên (HSK0 4, HSK1 40, HSK2 40, HSK3 55, HSK4 78). Không suy kết quả boot-1 thành kiểm toàn bộ bài hay linked module.
- **Tiếp theo:** Tiếp tục kiểm các revision gần đây ở learner và nháp Xưởng, nội dung/media còn thiếu theo phạm vi v0.2; còn 110 scene dùng cảnh chung ở audit trước. Không USER-ACCEPTED, không push/deploy.

## Thiên Lộ/Xưởng · tập trung hình chữ ở 15 bài nhận diện · 29/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 chưa hoàn tất.
- **Người học thấy gì:** Phát hành 15 revision `characters-1..15`, đổi layout 30 trang context/visual sang focus. Bỏ ảnh khuôn viên chung ở phần mục tiêu, mở khung bảng so sánh hình chữ 大/太, 妈/吗…; nội dung bảng và hoạt động giữ nguyên, Xưởng vẫn chỉnh từng node/nhãn/lời giải.
- **Đã kiểm:** Hai regression tests, typecheck và targeted ESLint đạt. Rehearsal rollback rồi backup/apply bảo vệ 43 bảng, parent package, head khác và FK. Browser Xưởng local 3000 kiểm đủ 30 trang focus và 15 bảng chữ chính xác ở desktop/375 px, không tràn ngang. Chưa kiểm riêng learner resume hoặc sửa/lưu node trong lượt này. Hồ sơ `67-REVIEW-CHARACTER-VISUALS.md`.
- **Dữ liệu giữ được:** 217 bài nền, HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78; giữ 246 character links, target, rubric, correction 做饭 và mọi ID/tiến độ/FSRS/lỗi/phiên/owner/outbox. `humanReviewed:false`. Audit D1: 35 bài có page art, 110 scene còn chung (trước 125); không quy đổi sang mastery hay phần trăm hoàn thiện.
- **Tiếp theo:** Rà cảnh/diagram các nhóm thời gian–vị trí và sinh tồn; kiểm learner/nháp/reload/liên kết module theo v0.2. Chưa USER-ACCEPTED, không push/deploy.

## Gói học · thiết kế lại trang Premium · 29/09/2026

- **Module:** Trang chọn gói Premium HSK4 — IN-REVIEW.
- **Người học thấy gì:** Quyền lợi HSK4 và thẻ chọn kỳ hạn xuất hiện ở đầu trang, dùng màu ngọc/vàng cùng hệ thống. Giá Hanzi lấy từ cấu hình; ví và lưu ý điểm thử nằm cạnh nút xác nhận. Lịch sử ví, đơn/hoàn và hỗ trợ được thu gọn phía dưới, có FAQ về phạm vi và hết hạn. Thanh tiêu đề nay ghi Premium HSK4.
- **Đã kiểm:** TypeScript và ESLint đạt. Browser Chromium trên local 3000 ở 1366×644 và 375×812: không tràn ngang, nút mua ở màn đầu và trên thanh mobile; chọn năm khi thiếu điểm khóa nút, chọn tháng gửi đúng gói/giá. Mock API cô lập kiểm mua ví, trạng thái chưa có giá với tạo/xác nhận sandbox và khách chưa đăng nhập; không tạo giao dịch D1. Đã xem ảnh dark/light và chỉnh nền/độ tương phản light. Đây là kiểm giao diện và kết nối handler, không phải giao dịch tiền thật.
- **Dữ liệu giữ được:** Không đổi migration, giá admin, số dư hoặc nội dung học. Inventory HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 rich và tiến độ giữ nguyên.
- **Tiếp theo:** người dùng xem lại trang Premium; VNPAY/payOS vẫn để cuối. Chưa USER-ACCEPTED, chưa mở bán.

## Thiên Lộ/Xưởng · bốn bài đời sống có cảnh đúng ngữ cảnh và sơ đồ rộng · 29/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 chưa hoàn tất.
- **Người học thấy gì:** Phát hành local bốn revision `daily-1..4`, đổi 11 trang. Thêm ba tranh quầy táo, mua áo/tiền thừa, phòng chờ khám; chọn đích danh tranh phù hợp cho context và dialogue của bốn bài. Bốn trang visual dành khung focus cho sơ đồ sẵn có, không còn tranh chung chiếm diện tích. Ảnh mới có trong danh mục Xưởng, alt/provenance; `humanReviewed:false`.
- **Đã kiểm:** Hai regression test, targeted ESLint, typecheck trước smoke đạt. Rehearsal rollback rồi backup/apply bảo vệ 43 bảng, parent package, head khác và FK. Browser Xưởng local 3000 kiểm tám trang ảnh tải đúng, desktop/375 px và bốn sơ đồ không còn scene chung đạt. Chưa gọi đây là kiểm trọn learner học–luyện–kết quả. Hồ sơ `66-REVIEW-DAILY-VISUALS.md`, prompt/gốc ở `lesson-scene-generation-2026-09-29-daily.json`.
- **Dữ liệu giữ được:** 217 bài nền; HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78. Không đổi target, đáp án, rubric, ID, tiến độ/FSRS/lỗi/phiên/owner/outbox. Audit D1 nay 35 bài có page art, 125 scene dùng ảnh chung (trước 136). Pending visual review trong script vẫn mặc định tổng 217, chưa phản ánh quyết định từng bài; không coi con số này là đo chất lượng.
- **Tiếp theo:** Tiếp tục quyết định hình theo từng bài và kiểm learner/khôi phục nháp/liên kết module theo phạm vi đã chốt. Không USER-ACCEPTED, không push/deploy.

## Thiên Lộ/Xưởng · sửa vai cảm ơn/xin lỗi trong vận dụng · 29/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 chưa hoàn tất.
- **Người học thấy gì:** Bài `survival-1` đã phát hành revision local mới. Mẫu vận dụng tách sáu lượt A/B, chỉ rõ người giữ cửa và va chạm: 谢谢 → 不客气, 对不起 → 没关系, rồi hẹn mai gặp. Đề đầy đủ ngay tại ô viết; không còn chuỗi ba câu khiến người mới tưởng 没关系 đáp lời cảm ơn. Generator nối cùng lớp hiệu chỉnh cho lần soạn lại sau; snapshot/review lịch sử giữ nguyên.
- **Đã kiểm:** Hai regression test đạt, typecheck, targeted ESLint và diff check đạt. Release diễn tập rollback rồi backup/apply, bảo vệ 43 bảng, head khác, immutable parent và khóa ngoại. Browser Xưởng local 3000 đạt: đề đúng, mẫu ẩn trước đối chiếu, đủ vai sau nhập, mobile 375 px không tràn ngang. Chưa kiểm riêng learner resume của revision này; không gọi studio preview là hành trình learner đầy đủ. Hồ sơ `65-REVIEW-SURVIVAL-POLITENESS.md`.
- **Dữ liệu giữ được:** Không đổi lesson/page/block IDs, target, rubric, cảnh riêng, dữ liệu học hoặc inventory HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78. Tổng phát hành vẫn 217 bài/1.676 hoạt động có target; giữ `humanReviewed:false`, không tự ghi USER-ACCEPTED.
- **Tiếp theo:** Tiếp tục hình theo bối cảnh (mốc audit trước: 136 scene dùng ảnh chung), rà hành trình learner/nháp/reload và liên kết module theo v0.2. Không push/deploy; automation còn cần tiếp tục.

## Thiên Lộ/Xưởng · gate target đạt và ba cảnh HSK1 phát hành local · 29/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 chưa hoàn tất.
- **Người học thấy gì:** Trang mở bài `daily-2` có quán ăn sáng/gọi nước; `journey-1` có hai điểm nhìn nhà–trường và taxi; `professional-1` có hai học sinh làm quen trước trường trung học. Ba tranh nguyên bản đã nhập danh mục chọn ảnh Xưởng, có alt/provenance và `humanReviewed:false`. Không tự lan ảnh qua các trang có bối cảnh khác.
- **Đã kiểm:** `npm run check` sau lô target đạt validator/typecheck/lint/test/restore/build, premium boundary đạt; build còn cảnh báo advisory toàn app vượt khoảng 25 KiB. Sau bổ sung ảnh, typecheck đạt. Ba revision hình đã diễn tập rollback rồi apply, bảo vệ 43 bảng ngoài content/audit, immutable parent, head khác và khóa ngoại. Browser Xưởng trên local 3000 qua cả ba ảnh: đúng src, tải ảnh thật, hiển thị và không tràn ngang ở 375 px. Server 3003 thử mới lỗi D1 khi có server 3000 hoạt động; kiểm lại trên 3000 đạt, đã dừng phiên 3003 do lượt này tạo.
- **Dữ liệu giữ được:** 217 bài, 1.676/1.676 hoạt động có target; audit hình D1 nay 32 bài có page art, 136 trang scene còn ảnh chung, 217 quyết định thị giác chưa hoàn tất. Giữ IDs, nội dung/đáp án/rubric, tiến độ/FSRS/lỗi/phiên/owner/outbox và inventory HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78. Hồ sơ hình tại `64-REVIEW-HSK1-SCENES.md`.
- **Tiếp theo:** Tiếp tục quyết định hình từng bài theo ngữ cảnh; sửa mẫu survival-1 và kiểm hành trình người học/khôi phục nháp/liên kết module. Chưa USER-ACCEPTED; không push/deploy.

## Giao diện chung · dark-only và bỏ nền trang trí · 29/09/2026

- **Module:** Giao diện chung — IN-REVIEW.
- **Người học thấy gì:** Chỉ còn giao diện tối ngay từ HTML đầu tiên, không theo theme thiết bị/thiết lập cũ. Gỡ 443 rule CSS của palette sáng/nút theme, script chuyển theme và metadata sáng ở learner/Admin/Xưởng. Bỏ nền lưới, quỹ đạo, quầng sáng, chữ Hán chìm chung; xóa SystemAtmosphere và useSystemMotion sau khi rà consumer, bỏ pointermove/requestAnimationFrame và animation riêng của nền. Giữ nền riêng từng module; cập nhật mô tả tùy chọn chuyển động.
- **Đã kiểm:** Typecheck sau thay đổi đạt; targeted ESLint và diff check đạt. Playwright dark-only desktop 1440×900/mobile 375×812 đạt: giả lập thiết bị sáng và preference cũ, nền phẳng/không atmosphere, CTA trong viewport, trả lời bài boot-1 rồi reload giữ lựa chọn. Browser thật trang /profile/premium xác nhận nền tối phẳng. Full npm run check đã chạy nhưng bị ngắt giữa validator HSK3, nên chưa chứng nhận full test/build/Lighthouse. Web local http://localhost:3000 đang chạy.
- **Dữ liệu giữ được:** Không thay nội dung/ID/migration hay D1/browser người dùng. HSK0 4/4 (rich 0/4), HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 rich; tổng HSK1–4 213/213 giữ nguyên. Completion, streak, FSRS, saved item, mistakes, owner/reset scope, phiên và outbox không bị sửa. Ghi chép lịch sử dưới đây giữ nguyên; theme sáng chỉ còn là fixture kiểm tương thích cũ.
- **Tiếp theo:** Người dùng test giao diện chung; chưa USER-ACCEPTED. Không commit/push/deploy.


## Gói học · lối vào Premium hiện rõ trên mọi màn người học · 29/09/2026

- **Module:** Điều hướng gói Premium HSK4 — IN-REVIEW.
- **Người học thấy gì:** Trang Hồ sơ nay đặt thẻ “Mở bài Thiên Lộ HSK4 với Premium” thành một hàng riêng, không còn bị bảng cấu hình đè. Thanh trái desktop có nút Gói Premium HSK4 kể cả khi thu gọn; điện thoại có nút Premium trên thanh trên cùng và mục trong “Khác”. Các lối này dẫn thẳng tới trang chọn kỳ hạn/mua bằng Ví Hanzi thử nghiệm.
- **Đã kiểm:** TypeScript, targeted ESLint và diff check đạt. Trình duyệt Chromium trên web local cổng 3000 ở 1366×768 và 375×812, giảm chuyển động: thẻ Hồ sơ nằm trọn viewport, tâm bấm không bị lớp khác che; bấm thẻ và nút điều hướng toàn cục đều tới trang gói, tiêu đề trang hiển thị. Kiểm cả thanh trái thu gọn. Dev server cũ bị lỗi tải module động; đã khởi động lại phiên sạch trên cổng 3000 và chạy lại hành trình đạt.
- **Dữ liệu giữ được:** Chỉ đổi điều hướng và CSS; không sửa D1, gói, ví, quyền bài hoặc tiến độ. Inventory rich HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 giữ nguyên.
- **Tiếp theo:** người dùng kiểm lối vào trên trình duyệt của mình. Admin local đã có hồ sơ khách, ví/giá, quyền bài, hoàn/từ chối và hỗ trợ; báo cáo doanh thu thật, SLA/tranh chấp và VNPAY/payOS chưa hoàn thiện. Chưa USER-ACCEPTED, không mở bán.

## Thiên Lộ/Xưởng · toàn bộ hoạt động đã có target biên tập, chưa đồng nghĩa mastery · 29/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 chưa hoàn tất.
- **Người học thấy gì:** 10 bài đời sống/thời gian/vị trí HSK1, 2 bài hành trình, 4 bài học tập/công việc HSK1 và bài nối đoạn HSK3 đầu tiên giữ nguyên nội dung/đáp án nhưng Xưởng nay có thêm 60 target theo đúng nguồn từng câu. Các rubric tự viết/tự luyện vẫn là tự đối chiếu; câu `第二天` cho phép giải thích bằng tiếng Việt nên là đọc hiểu, không bị gán thành chấm viết tiếng Trung.
- **Đã kiểm:** Ba kế hoạch exact và self-review `humanReviewed:false` ở `61–63-REVIEW-*.md`; generator `--check`, targeted Vitest và typecheck đạt. Mỗi lô đã ghi review hash, diễn tập rollback rồi apply với backup D1, bảo vệ 43 bảng ngoài content/audit, parent immutable, head khác và khóa ngoại. Browser Xưởng local 3003 qua 10 bài everyday, 6 bài journey/professional và bài HSK3: lựa chọn sai→đúng, preview, 375 px không tràn ngang. Audit đọc D1 release heads xác nhận 217 bài, 1.676 hoạt động, **1.676 có target, 0 thiếu**. Full `npm run check` và audit hành trình người học/hình/liên kết vẫn ở bước tiếp.
- **Dữ liệu giữ được:** Lesson/page/block IDs, đáp án, rubric, ảnh đã phát hành, completion, FSRS, lỗi, phiên, owner, outbox và inventory rich HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 giữ nguyên. Target metadata không phải evidence độc lập hay chứng nhận đủ HSK; `humanReviewed:false`.
- **Tiếp theo:** Chạy full gate; rà lỗi ngữ liệu còn biết (mẫu `survival-1`), kiểm hành trình học/nháp/reload và liên thông module; xử lý 217 quyết định hình theo ngữ cảnh, 139 scene còn dùng ảnh chung. Chưa USER-ACCEPTED, không push/deploy.

## Thiên Lộ/Xưởng · 9 bài sinh tồn HSK1 có target, giữ ảnh riêng · 29/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 chưa hoàn tất.
- **Người học thấy gì:** 9 bài `survival-1..9` giữ nguyên câu, đáp án, rubric và ảnh cảnh riêng; Xưởng có thêm 27 mục tiêu/nguồn exact cho câu chọn, điền và vận dụng tự soát. 写, 再 và 还没 không bị gán nhầm vocabulary ID không thuộc bài.
- **Đã kiểm:** Kế hoạch exact 9 bài/27 target, review AI-assisted `humanReviewed:false` ở `60-REVIEW-SURVIVAL-TARGETS.md`, generator `--check`, targeted Vitest và typecheck đạt. Guard xác nhận chỉ 9 ảnh scene riêng là phần chênh giữa bản thảo và head; script giữ ảnh trên revision mới. D1 diễn tập rollback rồi apply có backup, bảo vệ 43 bảng ngoài content/audit, parent immutable, head khác và khóa ngoại. Browser Xưởng local 3003 qua cả 9 bài: sai→đúng, editor preview và 375 px không tràn ngang.
- **Dữ liệu giữ được:** 217/217 bài nền phát hành local; D1 audit **1.616/1.676** hoạt động có target, **60 thiếu**. 9 ảnh đã phát hành giữ nguyên, cùng lesson/page/block IDs, completion, FSRS, lỗi, phiên, owner, outbox và inventory rich HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78. Target chưa thành evidence/mastery; mẫu rubric survival-1 còn cần ngữ cảnh rõ hơn ở vòng rà sư phạm.
- **Tiếp theo:** Rà 60 hoạt động còn thiếu theo nhóm daily/time-place, journey, professional và HSK3 cohesion; sửa ngữ liệu có vấn đề trước khi tuyên bố hoàn tất nội dung. Rà hình và liên kết module/hành trình người học. Chưa USER-ACCEPTED, không push/deploy.

## Thiên Lộ/Xưởng · 35 rubric tự luyện trình bày HSK4 có target · 29/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 chưa hoàn tất.
- **Người học thấy gì:** 30 bài HSK4 thuộc bảy nhóm giữ nguyên nội dung và nháp; Xưởng có thêm 35 target gắn với nhiệm vụ tự tập nói/ghi dàn ý. Rubric vẫn chỉ tự đối chiếu, không thu âm hoặc chấm nói.
- **Đã kiểm:** Kế hoạch exact 30 bài/35 target, review AI-assisted `humanReviewed:false` ở `59-REVIEW-HSK4-SELF-SPEAKING-TARGETS.md`, generator `--check`, targeted Vitest và typecheck đạt. D1 diễn tập rollback rồi apply có backup, giữ 43 bảng ngoài content/audit, parent immutable, head khác và khóa ngoại. Browser Xưởng local 3003 qua một bài của mỗi nhóm (7 bài): nhập bản viết, mở tiêu chí tự kiểm và 375 px không tràn ngang.
- **Dữ liệu giữ được:** 217/217 bài nền, 1.676 hoạt động; sau lô này 1.589 có target và 87 thiếu, trước lô sinh tồn ngay trên. ID, answer/rubric, learner state và inventory rich HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 giữ nguyên. `skill:'speaking'` là nhãn mục tiêu tự luyện, không tạo điểm phát âm, nghe hoặc mastery độc lập.
- **Tiếp theo:** Xử lý các gap cũ theo chủ đề và kiểm hành trình/hình/liên kết module. Không USER-ACCEPTED, không push/deploy.

## Thiên Lộ/Xưởng · 15 bài chữ HSK1 có target và một câu hết mơ hồ · 29/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 chưa hoàn tất.
- **Người học thấy gì:** 15 bài chữ HSK1 giữ nguyên 356 hoạt động và ID nhưng Xưởng nay có target/source riêng cho mỗi câu tìm chữ, nhớ chữ, chọn hình, điền sau mẫu và vận dụng. Riêng `characters-13`, câu “làm · zuò: □” trước đây chấp nhận cả 做/作 đã đổi thành “nấu cơm · zuòfàn: □饭”, chỉ nhận 做; lời giải nêu rõ 作 không thay được trong 做饭. Phiên cũ vẫn gắn revision/đáp án cũ.
- **Đã kiểm:** Kế hoạch exact 15 bài/356 target và bản tự rà AI-assisted ở `58-REVIEW-CHARACTER-TARGETS.md`, `humanReviewed:false`; một correction kiểm exact trước/sau. Diễn tập rollback rồi apply có backup D1, bảo vệ 43 bảng ngoài content/audit, immutable parent packages, release heads khác và khóa ngoại. Browser Xưởng local 3003 qua cả 15 bài: sai→đúng, bản sửa 做/作, 375 px không tràn ngang. `npm run check` đạt: validator, typecheck, lint, restore D1, 418 file/2.608 test và build; premium client boundary đạt. Build toàn app còn vượt advisory 1024 KiB khoảng 25 KiB.
- **Dữ liệu giữ được:** 217/217 bài nền vẫn local. Audit D1 mới: **1.554/1.676** hoạt động có target, **122 thiếu**; 15 bài chữ đạt 356/356. ID, completion, FSRS, lỗi, phiên, owner, outbox, D1 và inventory rich HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 giữ nguyên. 29 bài có page art, 139 trang scene còn dùng ảnh chung; 217 quyết định biên tập hình chưa xong. Target là liên kết biên tập, không chứng minh nhớ độc lập hay viết tay.
- **Tiếp theo:** Rà 87 hoạt động cũ còn thiếu theo nhóm tình huống và 35 rubric HSK4 chưa có target, không gán nghe/nói/mastery bừa; rà hình theo ngữ cảnh và kiểm liên kết module. Chưa USER-ACCEPTED, không push/deploy.

## Thiên Lộ/Xưởng · mục tiêu hoạt động boot-2/3/4 · 29/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 chưa hoàn tất.
- **Người học thấy gì:** Ba bài HSK0 chào hỏi, âm đầu và biến điệu giữ nguyên câu hỏi/đáp án/rubric nhưng được liên kết đúng 14 mục tiêu và nguồn trong Xưởng; người học vẫn thấy bài như trước, không có điểm nghe/nói hoặc mastery mới từ bài tự soát. Editor có thể sửa target cùng nội dung trong revision tương lai.
- **Đã kiểm:** Tự rà từng prompt, phương án, phản hồi và nguồn ở `57-REVIEW-BOOT-2-4-TARGETS.md`, `humanReviewed:false`; review hash và validator 14 mapping đạt. D1 diễn tập rollback rồi apply có backup, giữ 43 bảng ngoài content/audit, các head khác, immutable parent packages, khóa ngoại. Browser Xưởng local 3003 qua cả ba bài: câu sai→đúng và phản hồi đúng, viewport 375 px không tràn ngang. Targeted Vitest 3 file/5 test, typecheck và targeted ESLint đạt. Full `npm run check` ở mốc ngay dưới đã đạt trước lô metadata này; chưa lặp full suite sau lô nhỏ.
- **Dữ liệu giữ được:** 217/217 bài nền vẫn phát hành local. Audit mới: 1.198/1.676 hoạt động có target, **478 thiếu**; ba bài boot-2/3/4 nay 14/14 có target. Giữ lesson/page/block IDs, đáp án, tiến độ/FSRS/lỗi/phiên/owner/outbox và D1 local; không đổi inventory rich HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78. Hình vẫn 29 bài có page art, 139 trang scene dùng ảnh chung, 217 quyết định biên tập chưa xong.
- **Tiếp theo:** Rà target theo câu/nguồn ở các lô còn thiếu, ưu tiên hoạt động có bằng chứng thực rồi phân loại rubric tự soát; tiếp tục hình theo bối cảnh và liên kết module. Không USER-ACCEPTED, không push/deploy.

## Thiên Lộ/Xưởng · 217 bài nền phát hành local, reader có giờ dùng được · 29/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 chưa hoàn tất.
- **Người học thấy gì:** 42 bài HSK4 còn lại (24 tóm tắt/lập luận, 18 tích hợp) đã được biên soạn, tự rà AI-assisted và phát hành local theo sáu lô mỗi nhóm; tổng nền HSK0–4 nay 217/217 bài có trang authored trong Xưởng và runtime. Nhiệm vụ tích hợp dùng nhiều nguồn, sơ đồ, bài viết/nói tự đối chiếu và đồng hồ tự luyện; transcript đọc và TTS tổng hợp không thành bằng chứng nghe/nói. Sửa chiều cao bản xem trước Xưởng để hoạt động có giờ không bị khung 245 px che mất.
- **Đã kiểm:** Audit release heads D1 đọc-only xác nhận 217 bài, 1.676 hoạt động; import/release các lô trước có diễn tập rollback, bảo vệ 44/43 bảng và kiểm khóa ngoại. Browser local 3003 qua ba lô tích hợp có giờ: bản đã phát hành khớp Xưởng, guest HSK4 trả 403, nút canh giờ bấm và đếm được, khung hoạt động cao hữu dụng, màn 375 px không tràn ngang. `npm run check` đạt: validator, typecheck, lint, restore D1, 416 test files/2.605 tests và build; premium client boundary đạt. Build toàn app vượt ngưỡng advisory 1024 KiB khoảng 25 KiB, không phải lỗi boundary Premium.
- **Dữ liệu giữ được:** Inventory HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 rich; lesson/vocabulary IDs và tiến độ/FSRS/lỗi/phiên/owner/outbox không đổi. D1 không bị xóa; browser fixture cô lập. `humanReviewed:false`, không tuyên bố đủ năng lực HSK từ số bài. Audit learning target: 1.184/1.676 hoạt động có target, **492 thiếu** (457 tồn trước hai lô HSK4 cuối và 35 ở hai lô này, gồm bài rubric tự đối chiếu không được gán evidence nghe/nói bừa). Audit hình: 29 bài có page art, 139 trang scene còn dùng ảnh chung, cả 217 bài chờ quyết định biên tập hình theo bối cảnh.
- **Tiếp theo:** Rà và bổ sung target theo từng câu/đáp án/nguồn, phân biệt bài tự luyện không tạo mastery; thay cảnh dùng chung bằng hình hoặc phương tiện dạy học đúng nội dung khi có quyết định biên tập. Kiểm thêm hành trình người học có giờ, nháp sau reload và liên kết module sau các sửa tiếp theo. Không USER-ACCEPTED, không push/deploy; goal còn mở.

## Thiên Lộ/Xưởng · 36 bài HSK4 đọc sâu, sáu chủ đề · 28/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 chưa hoàn tất.
- **Người học thấy gì:** Sáu lô HSK4 đọc sâu về đời sống/cộng đồng, giáo dục/công việc, thiên nhiên/công nghệ, xã hội/kinh tế, nghệ thuật/thể thao và văn hóa/lịch sử đã phát hành local: 36 bài, 684 trang, 396 hoạt động. Mỗi bài dùng hai ngữ liệu riêng, Hanzi/Pinyin/Việt, hai sơ đồ bằng chứng, mười câu hỏi có đáp án và phản hồi, bài tổng hợp có rubric; Xưởng biên tập được các khối, sơ đồ, câu, đáp án và rubric. Nguồn B là transcript đọc với TTS tổng hợp, không tính nghe độc lập; xem mẫu bài viết không tự cấp mastery viết. Hồ sơ tự rà từng lô ở `docs/thien-lo-redesign-review/45–50-REVIEW-HSK4-*.md`.
- **Đã kiểm:** Source/schema và review hash từng lô; import diễn tập/áp dụng bảo vệ 44 bảng, release diễn tập/áp dụng bảo vệ 43 bảng và kiểm khóa ngoại, backup D1 trước apply. Browser dev local 3003 cho cả sáu lô: exact document đã phát hành, quyền HSK4 guest 403, Xưởng hiện sơ đồ và 375 px không tràn ngang. TypeScript, targeted ESLint, validators nguồn sáu chủ đề đạt; `npm run build` sau source binding đạt, premium client boundary không lộ nội dung, toàn app vượt advisory 1024 KiB khoảng 24,4 KiB. Chưa chạy lại full `npm run check` sau các lô chỉ đổi nội dung và script; full suite trước đó từng bị một test timeout dưới tải đồng thời, test riêng đạt 23/23. Smoke mới xác nhận bản xem trước revision đã khóa, chờ hydration trước khi chọn trang.
- **Dữ liệu giữ được:** Runtime D1 có **175/217** bài nền đã phát hành local: HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 **36/78**. Có 1.307 hoạt động trang, 850 có target và 457 cũ chưa có. Inventory rich HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 giữ nguyên. Lesson/vocabulary IDs và tiến độ/FSRS/lỗi/phiên/owner/outbox không thay; browser fixture cô lập. AI-assisted `humanReviewed:false`; nguồn long-form gốc vẫn chưa đạt production review và audio bản ngữ.
- **Tiếp theo:** 42 HSK4 còn lại: 24 bài tóm tắt/lập luận và 18 bài tích hợp theo thời gian. Cần biên soạn/rà/phát hành các lô này, sau đó xử lý 457 target cũ và quyết định hình riêng theo bối cảnh. Không coi 175 bài hoặc số trang là đủ năng lực HSK; chưa USER-ACCEPTED, không push/deploy.

## Thiên Lộ/Xưởng · 14 bài HSK3 ghi ý, kể lại, viết và giải thích · 28/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 chưa hoàn tất.
- **Người học thấy gì:** 14 bài sản xuất HSK3 còn lại đã có trang authored trên local: 112 trang/42 hoạt động. Bài ghi ý chính (3), khôi phục liên kết đoạn (2), kể lại sự kiện (3), viết đoạn (3), giải thích lựa chọn có giới hạn (3) dùng ngữ liệu đã học, sơ đồ dữ kiện, câu kiểm hiểu với phản hồi, chỗ điền, nhiệm vụ mới và rubric tự đối chiếu. Nội dung nguồn và `sourceLessonIds` nối tới bài đã phát hành; Xưởng sửa được văn bản, sơ đồ, hoạt động, đáp án và rubric. Nhãn sơ đồ đã sửa thành Hán tự/Pinyin thay vì lặp nghĩa Việt. Bản tự rà ở `docs/thien-lo-redesign-review/44-REVIEW-HSK3-PRODUCTION.md`.
- **Đã kiểm:** Builder/source/schema và review hash 14 bài; import diễn tập/áp dụng giữ 44 bảng, release diễn tập/áp dụng giữ 43 bảng và khóa ngoại, backup D1 trước apply. Sửa nhãn sơ đồ bằng revision có rehearsal/apply, chỉ cho phép đổi nhãn/Pinyin, bảo vệ nội dung và dữ liệu học. Browser dev local 3003 đạt cả 14 bài: khóa tiên quyết gồm bài cohesion 01 nằm ngoài lô, exact runtime, đọc/sơ đồ, câu sai→đúng, nháp IDB sau reload; mobile 375 px không tràn ngang; Xưởng preview cùng renderer. TypeScript, targeted ESLint, `npm run build`, test lỗi chạy riêng 23/23 và diff check đạt. `npm run check` đã chạy qua các validator, typecheck, lint và content validate nhưng gặp một test `contentCommand` quá thời gian khi dev server chạy đồng thời; dừng full suite sau lỗi, test đó đạt 23/23 khi chạy riêng. Web local 3003 đã bật lại và runtime API trả 200.
- **Dữ liệu giữ được:** 139/217 bài nền có trang authored phát hành local, HSK3 55/55; còn 78 HSK4. Runtime 911 hoạt động: 454 có learning target, 457 cũ chưa có. Audit hình: 29 bài có page art, 139 trang còn dùng cảnh chung, 217 quyết định hình chưa được ký duyệt; sơ đồ không được tính thành ảnh đã duyệt. Inventory HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 rich giữ nguyên. Không thay lesson/vocabulary IDs, completion, FSRS/mistakes/session/owner/outbox. Browser fixture cô lập; AI-assisted `humanReviewed:false`. Bài luyện nói dùng dàn ý/tự đối chiếu, chưa có chấm phát âm độc lập.
- **Tiếp theo:** HSK4 gồm 36 bài đọc sâu, 24 bài tóm tắt/lập luận, 18 bài tích hợp theo thời gian. Sáu nguồn văn bản dài có 216 đoạn; file nguồn không nhúng Pinyin nhưng kho hỗ trợ riêng khớp đủ 216/216 dòng. Cần rà cách đọc, câu hỏi và bài vận dụng theo chủ đề trước khi phát hành, không phát hành nguyên scaffold. Sau đó rà 457 target cũ và hình theo bối cảnh. Chưa USER-ACCEPTED, không push/deploy; không có căn cứ cam kết toàn bộ phần còn lại xong trong ngày.

## Thiên Lộ/Xưởng · chín bài HSK3 sự kiện, so sánh và liên kết câu · 28/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 chưa hoàn tất.
- **Người học thấy gì:** Chín bài event/complements, comparison và discourse đã có nội dung mới trên local: 129 trang, 75 hoạt động, 48 điểm ngữ pháp; mỗi bài có sáu đoạn Hanzi/Pinyin/nghĩa Việt, sơ đồ riêng, câu kiểm hiểu với phản hồi, bài điền và viết vận dụng theo dữ kiện mới. Sửa cách dùng bổ ngữ/tồn hiện, phạm vi số tăng thêm, dự đoán khác sự kiện, lựa chọn khác thứ tự, điều kiện cần khác điều kiện đủ. Toàn bộ khối, sơ đồ, đáp án và rubric nằm trong tài liệu Xưởng có thể biên tập. Tự rà ở `docs/thien-lo-redesign-review/43-REVIEW-HSK3-GRAMMAR-FINISH.md`.
- **Đã kiểm:** Builder và source/schema validator cả chín bài; review hash AI-assisted; TypeScript và targeted ESLint đạt. Import diễn tập/áp dụng giữ 44 bảng; release diễn tập/áp dụng giữ 43 bảng và khóa ngoại, có backup D1 trước mỗi áp dụng. Browser dev local 3003 đạt cho cả chín bài: khóa tiên quyết, exact runtime so với bản soạn, đọc/sơ đồ, trả lời sai→đúng, grammar đầu/cuối, nháp IndexedDB sau reload; mobile 375 px không tràn ngang; Xưởng nhận exact document và preview cùng renderer. Không chạy lại full build cho lô chỉ đổi nội dung/công cụ soạn; production local runner còn hạn chế đã ghi ở mốc trước.
- **Dữ liệu giữ được:** 125/217 bài nền có trang authored được phát hành local, HSK3 41/55; còn 92 bài nền (14 HSK3, 78 HSK4). Runtime 869 hoạt động: 412 có learning target, 457 cũ còn thiếu. Audit hình vẫn 29 bài có page art, 139 trang dùng cảnh chung, 217 quyết định hình cần rà; chín sơ đồ mới không được tính là hoàn tất ảnh toàn kho. Nền HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 rich giữ nguyên. Không đổi lesson/vocabulary IDs, completion, FSRS/mistakes/session/owner/outbox; fixture chỉ nằm trong browser cô lập. AI-assisted `humanReviewed:false`. Nguồn `hsk3-task-13` lệch chủ đề trong inventory cũ được giữ ID nhưng không dùng làm target của câu mới.
- **Tiếp theo:** làm lô 14 bài sản xuất HSK3 còn lại (ghi ý chính, liên kết đoạn, kể lại, viết đoạn, giải thích), giữ bài cohesion 01 đã phát hành; sau đó HSK4. Tiếp tục rà 457 target cũ và hình theo bối cảnh. Chưa USER-ACCEPTED, không push/deploy; chưa đủ căn cứ cam kết hoàn tất toàn bộ trong ngày.

## Thiên Lộ/Xưởng · ba bài HSK3 tình thái, thời điểm và góc nhìn · 27/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 chưa hoàn tất.
- **Người học thấy gì:** Ba bài theo chuỗi sau nhóm quy chiếu nay có 18 trang/bài: sáu đoạn Hanzi/Pinyin/nghĩa Việt, sơ đồ thông tin riêng, câu đọc hiểu có phản hồi, chỗ điền chính, chín điểm ngữ pháp gắn exact grammar ID và bài viết vận dụng ở tình huống mới. Tổng 36 hoạt động; 27 trang ngữ pháp có prompt/đáp án/feedback riêng. Bài 01 phân biệt dấu hiệu, lời khuyên, bắt buộc và không cần; bài 02 tách mục đích, căn cứ, điều kiện và góc nhìn; bài 03 giữ phạm vi thời gian của phủ định và thái độ từng người. Xưởng lưu/preview được sơ đồ, câu, nguồn và rubric; tự rà ở `docs/thien-lo-redesign-review/42-REVIEW-HSK3-MODALITY.md`.
- **Đã kiểm:** Builder/validator và review hash AI-assisted 3 bài; import diễn tập/áp dụng giữ 44 bảng, release diễn tập/áp dụng giữ 43 bảng và khóa ngoại, có backup D1 trước mỗi áp dụng. Browser trên dev local cổng 3003 đạt hành trình khóa tiên quyết, exact runtime cả ba bài, văn bản/sơ đồ/câu sai→đúng, grammar đầu/cuối mỗi bài, nháp IndexedDB sau reload, mobile 375 px không tràn ngang và Xưởng preview cùng renderer. TypeScript, targeted ESLint, `npm run build`, diff check đạt; bundle toàn app vượt advisory 1024 KiB 24,5 KiB. `vinext start` trên cổng 3001/3002 trả HTML cho asset và runtime 503 trong phiên này, nên browser evidence lấy từ dev local 3003; chưa coi production local runner là đã thông qua.
- **Dữ liệu giữ được:** 116/217 bài có trang authored local, HSK3 32/55; còn 101 bài nền. Runtime 794 hoạt động: 337 có learning target, 457 cũ còn thiếu. Audit hình: 29 bài có page art, 139 trang dùng cảnh chung, 217 quyết định hình chưa được ký duyệt. Inventory HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 rich không đổi. Không đổi lesson/vocabulary IDs, completion, FSRS/mistakes/session/owner/outbox; fixture chỉ trong browser cô lập. AI-assisted `humanReviewed:false`.
- **Tiếp theo:** nhóm HSK3 event/complements theo tiên quyết, rồi comparison/discourse và bài sản xuất HSK3, sau đó HSK4. Rà 457 target cũ theo câu hỏi/đáp án/nguồn và quyết định hình ảnh theo bài; sửa runner production local riêng trước khi dùng kết quả đó làm gate. Chưa USER-ACCEPTED, không push/deploy.

## Gói học · từ chối yêu cầu hoàn Ví Hanzi · 27/09/2026

- **Module:** Vận hành hoàn điểm Ví Hanzi — IN-REVIEW.
- **Người học thấy gì:** Admin có thể từ chối một yêu cầu hoàn Ví Hanzi với lý do; người học thấy lý do trong lịch sử gói và được hướng tới yêu cầu hỗ trợ. Đơn vẫn còn hiệu lực, số dư không đổi; yêu cầu đã từ chối rời hàng chờ và không thể gửi lại cùng đơn.
- **Đã kiểm:** 15 test liên quan đạt, gồm phân quyền step-up, chặn nguồn khác, từ chối lặp, quyền/số dư giữ nguyên, audit lỗi rollback. `db:check`, targeted ESLint và restore rehearsal 32 migration/51 bảng đạt. Đã sao lưu D1 local trước khi áp migration 0031; áp migration local thành công, `/api/commerce` và `/profile/premium` trên web local cổng 3000 trả 200. Typecheck toàn repo đang vướng lỗi ngoài module ở `scripts/content/smoke-hsk3-modality.ts:54` (`row.value` có thể undefined); chưa có browser kiểm hai vai trò cho nhánh từ chối.
- **Dữ liệu giữ được:** Backup `.wrangler/demo-backups/before-refund-rejection-0031-*`; migration chỉ thêm ba cột nullable, không đổi đơn cũ, ví, lesson ID, tiến độ/FSRS/session/outbox. Inventory HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 rich giữ nguyên.
- **Tiếp theo:** người dùng test luồng từ chối trên web local và chốt chính sách tranh chấp/SLA cho điểm thử. VNPAY/payOS ở cuối; chưa USER-ACCEPTED, chưa mở bán.

## Thiên Lộ/Xưởng · ba bài HSK3 quy chiếu, lượng từ và hành trình · 27/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 chưa hoàn tất.
- **Người học thấy gì:** Ba bài theo chuỗi sau văn hóa nay có 16 trang/bài: sáu đoạn Hanzi/Pinyin/nghĩa Việt, sơ đồ dữ kiện riêng, câu hiểu văn bản, bài điền chính, bảy điểm ngữ pháp có nguồn riêng và bài viết với dữ kiện mới. Tổng 30 hoạt động; 21 trang ngữ pháp gắn exact grammar ID và feedback. Xưởng lưu/preview được đúng tài liệu, sơ đồ, đáp án và rubric; những sửa câu nguồn và ranh giới ước lượng được ghi ở `docs/thien-lo-redesign-review/41-REVIEW-HSK3-REFERENCE.md`.
- **Đã kiểm:** Builder/validator và AI-assisted review hash 3 bài; import rehearsal/apply giữ 44 bảng, release rehearsal/apply giữ 43 bảng và FK, có backup D1 trước apply. Browser trên server production local cổng 3001 đạt 2/2: khóa tiên quyết, exact runtime ba bài, đọc/sơ đồ/câu sai→đúng, điểm ngữ pháp đầu/cuối mỗi bài, nháp IDB sau reload và mobile 375 px không tràn ngang; Xưởng nhận exact document và preview cùng renderer. TypeScript, targeted ESLint đạt. Dev server từng có lỗi Vinext RSC worker `Network connection lost`, nên kết luận browser lấy từ server production local ổn định; không lẫn lỗi worker với kết quả học.
- **Dữ liệu giữ được:** 113/217 bài có trang authored local, HSK3 29/55; còn 104 bài nền. Runtime 758 hoạt động: 301 có learning target, 457 cũ còn thiếu. Audit hình: 29 bài có page art, 139 trang dùng cảnh chung, 217 quyết định thị giác chưa được ký duyệt. Nền HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 rich không đổi. Không thay lesson/vocabulary IDs, tiến độ thật, FSRS/mistakes/session/owner/outbox; fixture browser cô lập. AI-assisted `humanReviewed:false`.
- **Tiếp theo:** nhóm HSK3 modality/time/viewpoint gồm ba bài theo tiên quyết, rồi event/comparison/discourse và bài sản xuất HSK3; sau đó HSK4 theo lô. Tiếp tục xử lý 457 target và audit hình riêng; chưa USER-ACCEPTED, không push/deploy.

## Gói học · hồ sơ khách hàng và vận hành thử nghiệm · 27/09/2026

- **Module:** Quản trị thương mại Premium HSK4 — IN-REVIEW.
- **Người học thấy gì:** không đổi màn học; admin tra chính xác tên đăng nhập hoặc mã tài khoản, xem hạn Premium, đơn của cả hai luồng thử nghiệm, số dư và biến động Ví Hanzi, yêu cầu hỗ trợ trong cùng hồ sơ. Bảng quản trị thêm số lượt mua bằng ví, tài khoản từng mua từ hai lượt, gói hết hạn trong 7 ngày và hàng hỗ trợ; không gọi đó là doanh thu.
- **Đã kiểm:** 13 test liên quan, gồm tra đúng chủ sở hữu, không trả kết quả theo tên một phần, gộp đơn và tính gói sắp hết hạn; TypeScript và ESLint đạt. Playwright local bằng phiên `admin.demo` cô lập mở `/admin/premium?walletUserId=learner.demo` trên port 3000, thấy hồ sơ; tra sai trả không tìm thấy; đăng xuất phiên kiểm thử. `npm run check` đạt 415 test files/2597 tests, restore rehearsal, build và kiểm bundle Premium; cảnh báo bundle toàn app vẫn là advisory. Web local port 3000 trả `/api/commerce` 200 sau khi bật lại.
- **Dữ liệu giữ được:** chỉ thêm truy vấn đọc/UI/tài liệu, không migration hoặc sửa ví/đơn/progress của tài khoản. Inventory HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 rich giữ nguyên.
- **Tiếp theo:** người dùng kiểm hồ sơ quản trị và quy trình hỗ trợ/hoàn trên local; phần chính sách từ chối hoàn, SLA, thông báo và giao dịch VND còn cần quyết định riêng. VNPAY/payOS vẫn để cuối; chưa USER-ACCEPTED.

## Gói học · chốt giá mua và yêu cầu hoàn Ví Hanzi · 27/09/2026

- **Module:** Ví Hanzi/checkout HSK4 — IN-REVIEW.
- **Người học thấy gì:** Nếu admin đổi giá trong lúc mua, không trừ ví và nhắc tải lại giá; đơn sandbox không thu tiền cũ không còn nút xác nhận khi đã bật giá Hanzi, nhưng vẫn hủy được. Yêu cầu hoàn Ví Hanzi thất bại được báo là xung đột khi đơn không còn hợp lệ.
- **Đã kiểm:** 18 test liên quan đạt, gồm mô phỏng đổi giá ngay sau bước đọc, audit yêu cầu hoàn lỗi thì hàng chờ rollback; typecheck và targeted ESLint đạt. `npm run check` dừng ở TypeScript của `scripts/content/author-hsk3-reference.ts` (modelExample thiếu `speaker`), ngoài module này; phần commerce không báo lỗi. Web local port 3001 `/api/commerce` trả 200, trang gói học tải được Ví Hanzi của phiên hiện có. Chưa có browser end-to-end mua/hoàn bằng hai tài khoản thật.
- **Dữ liệu giữ được:** Không migration, không sửa D1 local hay dữ liệu học; test dùng SQLite cô lập. Inventory HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 rich giữ nguyên.
- **Tiếp theo:** người dùng nghiệm thu luồng Ví Hanzi trên web local; VNPAY/payOS để cuối. Chưa USER-ACCEPTED.

## Thiên Lộ/Xưởng · năm bài HSK3 văn hóa và so sánh · 27/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 chưa hoàn tất.
- **Người học thấy gì:** Năm bài ẩm thực/khẩu vị, dụng cụ bàn ăn, lịch Trung thu một gia đình, hai địa điểm và so sánh cách tiếp khách nay có 9 trang/bài. Mỗi bài có bốn đoạn Hanzi/Pinyin/nghĩa Việt, sơ đồ dữ kiện riêng, câu chọn có phản hồi, chỗ điền và bài viết dùng tình huống mới. Sơ đồ, nguồn và hoạt động đều nằm trong tài liệu Xưởng có thể biên tập. Các ví dụ cá nhân không được trình bày thành quy tắc của cả vùng hoặc quốc gia.
- **Đã kiểm:** Builder/validator 5 bài, 45 trang/15 hoạt động; import rehearsal/apply bảo vệ 44 bảng, release rehearsal/apply bảo vệ 43 bảng và FK, có backup D1 trước apply. Playwright trên web local 2/2: khóa tiên quyết, exact runtime cả năm, văn bản/sơ đồ/feedback sai→đúng/nháp sau reload, mobile 375 px không tràn ngang; Xưởng mở exact document và preview sơ đồ. TypeScript, targeted ESLint, diff check đạt. `npm run check` 414 files/2592 tests và build đạt trước khi thêm lô văn hóa; lô mới được kiểm bằng các gate riêng trên.
- **Dữ liệu giữ được:** 110/217 bài có trang authored local, HSK3 26/55; còn 107 bài nền. Runtime có 728 hoạt động, 271 có learning target, 457 cũ còn thiếu. Audit thị giác: 29 bài có page art, 139 trang còn dùng cảnh chung, 217 quyết định biên tập hình chưa được ký duyệt. Nền HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 rich vẫn giữ. Không đổi lesson/vocabulary IDs, tiến độ thật, FSRS, mistakes, session, owner hay outbox. Fixture chỉ trong browser cô lập; AI-assisted giữ `humanReviewed:false`, bản rà ở `docs/thien-lo-redesign-review/40-REVIEW-HSK3-CULTURE.md`.
- **Tiếp theo:** tiếp tục các nhóm HSK3 diễn ngôn/tổng hợp và HSK4 theo lô; rà 457 target theo câu hỏi, đáp án và nguồn; quyết định hình ảnh phù hợp từng bài. Chưa USER-ACCEPTED, không push/deploy.

## Gói học · tổng hợp quản trị Ví Hanzi · 26/09/2026

- **Module:** Quản trị Gói học/Ví Hanzi — IN-REVIEW.
- **Người học thấy gì:** Không đổi luồng mua; admin thấy giao dịch Ví Hanzi trong tổng số giao dịch, số tài khoản, gói còn hiệu lực, lượt hoàn và bảng 200 giao dịch gần đây. Bảng ghi rõ phương thức Hanzi hay sandbox không thu tiền; số yêu cầu chờ xử lý gồm cả hai loại.
- **Đã kiểm:** Test repository với một tài khoản mua ở hai phương thức và một đơn Ví Hanzi đã hoàn; 9 test liên quan đạt, TypeScript/ESLint/diff check đạt. Web local `/api/commerce` trả 200; trang `/profile/premium` tải ví tài khoản hiện hành trong browser. Chưa kiểm browser admin và mua/hoàn bằng hai tài khoản thật.
- **Dữ liệu giữ được:** Chỉ sửa truy vấn đọc và hiển thị quản trị, không migration hay ghi D1; inventory bài/tiến độ không đổi.
- **Tiếp theo:** người dùng kiểm trang quản trị và hành trình Ví Hanzi; sau đó xử lý phát hiện trong cùng module. VNPAY/payOS để cuối theo yêu cầu; chưa USER-ACCEPTED.

## Gói học · Ví Hanzi và quyền bài Thiên Lộ · 26/09/2026

- **Module:** Ví Hanzi và quyền bài Thiên Lộ — IN-REVIEW.
- **Người học thấy gì:** Ví Hanzi hiển thị số dư/lịch sử; admin cấp/thu hồi điểm thử, đặt giá Hanzi tháng/năm. Khi giá đã đặt và ví đủ điểm, người học có thể mua gói HSK4 bằng ví; yêu cầu hoàn qua admin trả lại đúng điểm đã trừ. VNPAY và VietQR qua payOS được ghi rõ là chưa cấu hình. Admin có thể mở Free hoặc trả lại Premium cho từng bài Thiên Lộ HSK4; HSK0–3, từ điển, chữ Hán và đề luyện giữ quyền hiện có.
- **Đã kiểm:** Vitest sổ cái, mua/hoàn, idempotency, thiếu số dư, owner, giá thay đổi khi mua và rollback khi audit lỗi; kiểm quyền bài mặc định/override. `npm run check` đạt 413 test files/2586 tests, build và kiểm bundle Premium; restore rehearsal 31 migration/51 bảng, export/delete tài khoản. Browser mobile 375×812 với API mô phỏng xác nhận bấm mua gói 80 Hanzi và số dư 100→20; API local guest `/api/commerce` trả 200, ranh giới mặc định bài HSK4/Khảo Nghiệm đạt. Migration local 0028–0030 đã áp sau khi sao lưu D1. Chưa có browser end-to-end tài khoản/admin với ví thật; một test cũ tìm thẻ Khảo Nghiệm HSK4 trên trang Thiên Lộ bị stale do thẻ không còn ở trang ấy. `verify:production` fail-closed với 23 blocker.
- **Dữ liệu giữ được:** D1 local được sao lưu trong `.wrangler/demo-backups/before-wallet-0028-*`, `before-wallet-0029-*`, `before-access-0030-*`; không xóa tiến độ, FSRS, phiên học hoặc outbox. Inventory nền HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 rich không đổi.
- **Tiếp theo:** người dùng test web local và xác nhận quyền bài/giá Hanzi; tiếp tục cổng tiền thật khi có merchant sandbox, secret, domain callback và giá VND. Chưa USER-ACCEPTED, không mở production.

## Gói học · đối chiếu Chương 5 báo cáo gốc · 25/09/2026

- **Module:** Phạm vi hướng doanh nghiệp — IN-REVIEW.
- **Người học thấy gì:** không đổi code; quyền Premium tiếp tục chỉ áp cho bài Thiên Lộ HSK4. Đề xuất rộng trong báo cáo gốc về khóa thêm thư viện, luyện đề và tra cứu đã được chỉ thị mới của chủ sản phẩm thay thế.
- **Đã kiểm:** đọc đủ 10 trang PDF báo cáo, đặc biệt bảng quyền lợi trang 9 và danh sách module/ba giai đoạn trang 10; đối chiếu với code và `docs/PREMIUM_COMMERCE.md`. Đã ghi rõ các module vẫn cần làm: thanh toán đã xác minh, gia hạn/hết hạn, hỗ trợ/hoàn tiền và chỉ số kinh doanh từ giao dịch thật. Bảng sandbox không được gọi là doanh thu.
- **Dữ liệu giữ được:** chỉ cập nhật tài liệu; không chạm D1, người học, nội dung hoặc ID. Inventory HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 rich không đổi.
- **Tiếp theo:** cần chủ sản phẩm chốt điều kiện thương mại và merchant sandbox/domain callback; sau đó triển khai provider, đối soát, báo cáo thật và pilot theo gate production. Chưa USER-ACCEPTED.

## Gói học · hết hạn quyền bài trên browser · 25/09/2026

- **Module:** Vòng đời hết hạn bài Thiên Lộ HSK4 — IN-REVIEW.
- **Người học thấy gì:** khi hạn gói do server cấp trôi qua, màn bài HSK4 đóng và mời xem gói; Khảo Nghiệm Căn Cơ HSK4 vẫn mở.
- **Đã kiểm:** Playwright/Chromium mobile 375×812, reduced motion, guest đã onboarding: giả response commerce đầu tiên `active:true` với hạn 1,2 giây, response refresh `active:false`; chờ qua hạn xác nhận màn Premium và có ít nhất hai lần đọc commerce, không đóng sớm trước hạn; API level check HSK4 vẫn 200. Lượt đầu vào thẳng URL với browser mới dừng ở màn chào (fixture thiếu onboarding), sau khi sửa fixture chạy lại đạt. Đây là kiểm countdown/client; server expiry đã được kiểm bởi policy/repository, chưa phải provider thật.
- **Dữ liệu giữ được:** browser context cô lập, không tạo tài khoản hoặc đổi D1; progress/FSRS/session/outbox và inventory HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 rich không đổi.
- **Tiếp theo:** kiểm hết hạn bằng entitlement provider đã xác minh sau khi chốt giá/cổng/chính sách và có merchant sandbox; chưa USER-ACCEPTED.

## Gói học · kiểm xuất/xóa dữ liệu giao dịch theo tài khoản · 25/09/2026

- **Module:** Bảo toàn dữ liệu gói Premium sandbox — IN-REVIEW.
- **Người học thấy gì:** bản xuất tài khoản có đơn sandbox và yêu cầu hoàn; khi xóa tài khoản, đơn và ticket của đúng chủ sở hữu được xóa, dữ liệu tài khoản khác giữ nguyên.
- **Đã kiểm:** bổ sung fixture đơn đã kích hoạt và yêu cầu hoàn vào test export, đơn của cả hai chủ vào test xóa; `src/server/syncRepository.test.ts` đạt 9/9. `npm run test:restore` đạt 28 migration/46 bảng, integrity và FK; typecheck, ESLint đạt. Đây là dữ liệu thử nghiệm; chính sách lưu chứng từ giao dịch thật vẫn cần quyết định pháp lý trước production.
- **Dữ liệu giữ được:** test chỉ dùng SQLite cô lập, không đụng D1 local, progress/FSRS/session/outbox hoặc content ID; inventory HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 rich không đổi.
- **Tiếp theo:** xác định quy tắc lưu/chuyển ẩn danh chứng từ thanh toán thật cùng quyết định giá/provider/hoàn tiền; chưa USER-ACCEPTED.

## Gói học · khóa sandbox trên môi trường public · 25/09/2026

- **Module:** Biên môi trường quyền bài Thiên Lộ HSK4 — IN-REVIEW.
- **Người học thấy gì:** không đổi hành vi local; giao dịch thử nghiệm không thể mở bài HSK4 trong môi trường production. Bài HSK0–HSK3 không hỏi commerce.
- **Đã kiểm:** regression test đặt `NODE_ENV=production` ngay trên URL localhost và xác nhận `requestPremiumAccess` trả false trước khi đọc D1/tài khoản/ledger; kiểm localhost development được nhận diện sandbox và HSK0–HSK3 trả `null` ở premium gate. 2 file/5 test scope đạt, typecheck và ESLint đạt. Đây chưa phải tích hợp thanh toán production.
- **Dữ liệu giữ được:** không chạm D1, progress/FSRS/session/outbox hoặc content ID; inventory HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 rich không đổi.
- **Tiếp theo:** dùng quyết định giá/cổng/chính sách và merchant sandbox để thiết kế luồng thanh toán đã xác minh, tách hẳn ledger thật khỏi sandbox; chưa USER-ACCEPTED.

## Gói học · rà điều kiện production và đồng bộ tài liệu phạm vi · 25/09/2026

- **Module:** Ranh giới phát hành Premium — IN-REVIEW.
- **Người học thấy gì:** không đổi giao diện; tài liệu kiến trúc, tầm nhìn và kiểm thử nay nói đúng phạm vi đã chốt: chỉ bài Thiên Lộ HSK4 cần Premium, còn từ điển, chữ Hán, khảo nghiệm, đề luyện HSK4 và khu khác giữ nguyên.
- **Đã kiểm:** `node scripts/verify-production-readiness.mjs` fail-closed đúng kỳ vọng với 23 blocker của package `foundation-2026.08.7`; có native review, provenance/license, pilot assessment, identity/recovery, hosted restore, independent security/privacy, vận hành, load/a11y/performance và ownership/hosting. Tài liệu commerce đã cập nhật bằng chứng browser admin sandbox vừa đạt; chưa có provider callback/hoàn tiền thật. Không dùng các test local để nhận production.
- **Dữ liệu giữ được:** chỉ sửa tài liệu, không chạm D1, progress/FSRS/session/outbox hay content ID; inventory HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 rich không đổi.
- **Tiếp theo:** chờ chốt giá/cổng/chính sách và merchant sandbox/domain callback; hoàn thiện các gate production bằng bằng chứng thật trước mở bán. Chưa USER-ACCEPTED.

## Gói học · browser quản trị hoàn và hỗ trợ sandbox · 25/09/2026

- **Module:** Hành trình quản trị Premium thử nghiệm — IN-REVIEW.
- **Người học thấy gì:** sau khi quản trị hoàn giao dịch thử nghiệm, bài Thiên Lộ HSK4 lại yêu cầu Premium; yêu cầu hỗ trợ có phản hồi trong tài khoản. Các khu HSK4 khác giữ cách dùng bình thường.
- **Đã kiểm:** Playwright/Chromium trên web local: tài khoản thử đăng ký, kích hoạt gói sandbox, gửi yêu cầu hoàn và hỗ trợ; `admin.demo` đăng nhập phiên mới, trang `/admin/premium` mở, nút hoàn trả thông báo thành công; API rich bài HSK4 của người học đổi 200 → 403, snapshot gói `active:false`; quản trị phản hồi hỗ trợ trên trang và API người học trả ticket `answered`. Tài khoản thử xóa API 200; phiên admin demo đăng xuất API 200. Đây là giao dịch không thu tiền, không chứng minh callback/hoàn tiền provider thật.
- **Dữ liệu giữ được:** không reset progress/FSRS/session/outbox hoặc thay tài khoản demo; chỉ tạo rồi xóa tài khoản thử và đăng xuất phiên admin vừa tạo. Inventory HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 rich không đổi.
- **Tiếp theo:** chốt giá, provider, chính sách hoàn và merchant sandbox/domain callback trước tích hợp thanh toán thật; production vẫn fail-closed. Chưa USER-ACCEPTED.

## Gói học · phản hồi hỗ trợ có audit nguyên tử · 25/09/2026

- **Module:** Hỗ trợ Premium ở Cổng Quản Trị — IN-REVIEW.
- **Người học thấy gì:** khi quản trị phản hồi yêu cầu hỗ trợ, trạng thái yêu cầu và dấu vết quản trị cùng thành công hoặc cùng được hoàn tác; không có phản hồi đã lưu mà thiếu audit.
- **Đã kiểm:** test SQLite memory cố tình làm audit insert thất bại xác nhận ticket vẫn mở, retry thành công tạo đúng một sự kiện và phản hồi lần hai bị chặn; route test xác nhận `commerce:manage`, step-up, chặn cross-origin và phản hồi quá ngắn. 2 file/6 test mới đạt; cùng 3 file commerce liên quan là 11 test đạt, typecheck, ESLint và `git diff --check` đạt. Web local `/admin/premium` trả 200; chưa kiểm phiên admin thật trên browser.
- **Dữ liệu giữ được:** không chạm D1 local, progress, FSRS, session hay outbox; inventory HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 rich không đổi.
- **Tiếp theo:** kiểm admin step-up end-to-end bằng tài khoản thử cô lập; cần chủ sản phẩm chốt giá/provider/chính sách và merchant sandbox trước khi tích hợp thanh toán thật. Chưa USER-ACCEPTED.

## Gói học · phân quyền quản trị giao dịch thử nghiệm · 25/09/2026

- **Module:** Quản trị giao dịch Premium — IN-REVIEW.
- **Người học thấy gì:** không đổi phạm vi quyền học; chỉ bài Thiên Lộ HSK4 cần Premium. Trang quản trị gói, thao tác hoàn và phản hồi hỗ trợ dùng quyền `commerce:manage` riêng thay vì quyền đọc tài khoản. Hoàn giao dịch vẫn đòi xác minh lại phiên quản trị.
- **Đã kiểm:** 4 file Vitest/13 test đạt, gồm route hoàn kiểm quyền, step-up, chặn cross-origin và audit actor; `npm run typecheck`, ESLint các file đổi và `git diff --check` đạt. Chưa kiểm admin step-up bằng browser thật hoặc hoàn tiền qua provider.
- **Dữ liệu giữ được:** không chạm D1 local, tiến độ, FSRS, session hay outbox; inventory HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 rich không đổi.
- **Tiếp theo:** kiểm admin end-to-end trong môi trường thử cô lập; chốt giá, provider, chính sách hoàn và merchant sandbox trước tích hợp thanh toán thật. Chưa USER-ACCEPTED.

## Gói học · hoàn sandbox và audit nguyên tử · 25/09/2026

- **Module:** Quản trị hoàn giao dịch thử nghiệm — IN-REVIEW.
- **Người học thấy gì:** khi quản trị hoàn giao dịch, quyền bài Thiên Lộ HSK4 và dấu vết quản trị được ghi cùng một transaction; lỗi ghi audit không để giao dịch bị hoàn một nửa rồi hiện thông báo thất bại.
- **Đã kiểm:** route quản trị gọi `refundWithAudit`; test SQLite D1 batch chủ động làm audit insert thất bại xác nhận ledger rollback, quyền còn active, rồi retry thành công tạo đúng một audit event và thu hồi quyền; lần hoàn lặp bị chặn. 5 test repository đạt, typecheck, ESLint, build và gate bundle 184 JS asset/192 marker bài HSK4 đạt. Chưa kiểm trên browser bằng tài khoản admin step-up hoặc provider hoàn tiền thật.
- **Dữ liệu giữ được:** không migration và không chạm D1 local; chỉ dùng SQLite memory trong test. Inventory HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 rich không đổi.
- **Tiếp theo:** kiểm admin step-up end-to-end ở môi trường thử cô lập; chốt phương án giá/provider/chính sách hoàn và merchant sandbox trước tích hợp thật. Chưa USER-ACCEPTED.

## Gói học · yêu cầu hoàn và thu hồi quyền bài HSK4 · 25/09/2026

- **Module:** Vòng đời quyền bài Thiên Lộ HSK4 — IN-REVIEW.
- **Người học thấy gì:** gửi yêu cầu hoàn vẫn học bài HSK4 trong lúc chờ xử lý; khi server xác nhận quyền đã thu hồi, màn bài trở lại thông báo Premium. Khảo Nghiệm Căn Cơ HSK4 vẫn mở.
- **Đã kiểm:** browser tài khoản thử mới: guest bài HSK4 403, khảo nghiệm 72 câu/chữ 441 mục 200, đề HSK4 trả 200 sau đăng nhập trước khi mua; sandbox pay mở rich lesson 200; request-refund thành công nhưng rich lesson vẫn 200; response commerce giả `active:false` khi focus đóng màn bài, khảo nghiệm vẫn hiện. Tài khoản thử xóa API 200. Test repository mới xác nhận access giữ active khi chỉ request-refund và thành inactive sau admin refund; 6 test commerce/policy, typecheck, ESLint đạt. Chưa kiểm admin refund thật trên browser hoặc callback provider.
- **Dữ liệu giữ được:** chỉ tạo rồi xóa tài khoản thử; không migration, reset hay thay tiến độ/FSRS/session của người dùng khác. Inventory HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 rich không đổi.
- **Tiếp theo:** kiểm admin refund end-to-end với tài khoản quản trị cô lập. Phương án cụ thể để chốt đã ghi ở `docs/PREMIUM_COMMERCE.md`: VNPAY PAY, 99.000đ/tháng, 790.000đ/năm, gia hạn chủ động, cửa sổ yêu cầu hoàn 7 ngày nếu chưa dùng bài HSK4; chưa áp dụng giá hay chính sách vào code. Cần chủ sản phẩm chốt và cung cấp merchant sandbox/domain trước tích hợp thanh toán thật; chưa USER-ACCEPTED.

## Gói học · browser tài khoản thử theo phạm vi bài Thiên Lộ · 25/09/2026

- **Module:** Quyền bài học Thiên Lộ HSK4 — IN-REVIEW.
- **Người học thấy gì:** khách chưa mua thấy màn Premium ở bài Thiên Lộ HSK4, nhưng Khảo Nghiệm Căn Cơ, chữ HSK4 và đề mô phỏng vẫn mở. Khi mua gói thử, API bài HSK4 mở; nếu chưa học bài tiên quyết, màn vẫn báo Cảnh Giới chưa mở theo lộ trình.
- **Đã kiểm:** browser 375 px với tài khoản thử mới: guest rich lesson 403, khảo nghiệm 72 câu 200, chữ 441 mục 200; sau đăng ký/onboarding/enrollment, đề HSK4 trả 200 trước khi mua; mua sandbox mở rich lesson 200; màn bài chuyển từ khóa Premium sang khóa tiên quyết, không tự vượt lộ trình; yêu cầu hoàn thử nghiệm được ghi nhận. Tài khoản thử xóa qua API trả 200. Script cô lập `tmp/premium-lesson-scope-smoke.mjs` đạt; lượt đầu thiếu onboarding, lượt hai đợi nội dung bài dù tài khoản chưa đạt tiên quyết, cả hai là lỗi kỳ vọng fixture và đã chỉnh trước lượt đạt.
- **Dữ liệu giữ được:** chỉ tạo rồi xóa tài khoản thử; không thay catalog, ID, completion, FSRS, session hoặc dữ liệu người dùng khác. Inventory HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 rich không đổi.
- **Tiếp theo:** kiểm thu hồi quyền sau admin hoàn tiền và hết hạn với account cô lập, giá/cổng/chính sách hoàn để chốt trước thanh toán thật; chờ người dùng nghiệm thu, chưa USER-ACCEPTED.

## Gói học · chốt lại phạm vi Premium theo người dùng · 25/09/2026

- **Module:** Biên quyền Thiên Lộ HSK4 — IN-REVIEW.
- **Người học thấy gì:** chỉ bài học HSK4 trong Thiên Lộ cần Premium; từ điển, chữ Hán, Khảo Nghiệm Căn Cơ HSK4 và đề mô phỏng HSK4 vẫn dùng như bình thường. Màn gói và Hồ sơ nói rõ ranh giới này.
- **Đã kiểm:** catalog nền/kho từ mở rộng HSK4 được giữ công khai đúng phạm vi; bỏ audit chặn production cho chúng và endpoint catalog trả phí không cần thiết. Route boundary chỉ chặn `/lesson/<bài HSK4>`. Local guest: level check 200, chữ 200, runtime vocabulary HSK4 200, mock exam trả 401 do yêu cầu đăng nhập chứ không phải gói, rich lesson và runtime lesson HSK4 trả 403. Phát hiện 78 communicative function HSK4 gắn trực tiếp với bài Thiên Lộ từng lọt qua raw runtime; nay guest nhận 0 item ở route đó. Targeted tests, typecheck, ESLint, build và Chromium guest (bài khóa/Khảo Nghiệm mở) đạt; build quét 184 JS asset và 192 marker rich bài HSK4 vắng mặt. `npm run check` đã qua validator, D1 và restore nhưng lượt Vitest song song timeout 1 test provenance (10 giây, temp EBUSY); file đó chạy riêng đạt 21/21, toàn Vitest một worker đạt 407 file/2.566 test. Web local cổng 3000 trả 200, `git diff --check` đạt.
- **Dữ liệu giữ được:** không sửa catalog, D1, ID, progress, FSRS, session hay outbox; inventory HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 rich không đổi.
- **Tiếp theo:** người dùng test tại `http://localhost:3000` các màn bài HSK4/Khảo Nghiệm/chữ/đề; kiểm thêm browser paid/hoàn/hết hạn theo ranh giới mới, sau đó chốt giá/provider/chính sách hoàn trước thanh toán thật. Chưa USER-ACCEPTED.

## Gói học · đóng màn Premium đúng lúc hết hạn · 25/09/2026

- **Module:** Vòng đời quyền HSK4 trên client — IN-REVIEW.
- **Người học thấy gì:** màn HSK4 tự đóng tại thời hạn server cấp, không đợi lượt kiểm tra gói định kỳ 30 giây; đồng hồ máy người học lệch giờ không kéo dài quyền. Lượt gia hạn hoặc đổi quyền vẫn được làm mới từ server.
- **Đã kiểm:** 2 test chính sách thời hạn với đồng hồ lệch, 5 test gồm ledger đạt; typecheck, ESLint và build đạt. Browser 375 px chặn thử response commerce có thời hạn ngắn, xác nhận màn quyền Premium hiện trước lượt poll 30 giây; đây là kiểm UI với response giả, không phải bài thử thanh toán thật. Gate bundle 183 JS asset/264 marker vẫn đạt.
- **Dữ liệu giữ được:** không migration, không thay order, completion, FSRS hay session. Inventory HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 rich không đổi.
- **Tiếp theo:** kiểm thu hồi do hoàn tiền và cache nội dung đã tải với tài khoản thử cô lập; chờ người dùng test, chưa USER-ACCEPTED.

## Gói học · khóa phiên đề mô phỏng theo cấp độ và form · 25/09/2026

- **Module:** Đề mô phỏng HSK4 Premium — IN-REVIEW.
- **Người học thấy gì:** câu trả lời và nộp đề chỉ được xử lý khi phiên server phát thuộc đúng cấp độ/form trên URL. Đổi URL sang HSK3 hoặc form khác không còn dùng được phiên HSK4 để ghi câu trả lời hoặc chấm đề.
- **Đã kiểm:** test repository kiểm phiên HSK4 bị từ chối khi đưa qua đường HSK3, đồng thời phiên HSK3 vẫn mở lại đúng form; 4 test trong file đạt, typecheck, ESLint và build đạt. Build gate 183 JS asset/264 marker HSK4 đạt. Browser 390 px với tài khoản thử đã onboarding, đồng bộ và kích hoạt enrollment qua API: mua sandbox, mở phiên HSK4 thật, lưu một đáp án, thử ghi/nộp qua URL HSK3 và form B đều 409, phiên gốc vẫn `started`; chạy lại script sạch đạt. Tài khoản thử đã xóa qua API. Lượt browser đầu thiếu enrollment là lỗi fixture, không phải bằng chứng đạt.
- **Dữ liệu giữ được:** không sửa D1 hay các phiên người học hiện có; chỉ kiểm ràng buộc trước khi dùng phiên. Inventory HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 rich giữ nguyên.
- **Tiếp theo:** rà hết hạn/hoàn tiền và cache nội dung đã tải; chờ người dùng test, chưa USER-ACCEPTED.

## Gói học · media phát hành HSK4 có kiểm quyền · 25/09/2026

- **Module:** Biên phân phối media Premium — IN-REVIEW.
- **Người học thấy gì:** media từ gói phát hành chỉ thuộc HSK4 yêu cầu quyền Premium trước khi trả byte; phản hồi không được lưu cache công khai. Media thuộc HSK0–HSK3 vẫn đọc công khai; media không xác định được cấp độ chỉ mở cho Xưởng đã xác thực.
- **Đã kiểm:** 7 test repository/route kiểm guest bị chặn trước khi đọc byte, phản hồi HSK4 `private, no-store`, HSK0–3 cache công khai, media không rõ cấp độ đóng; typecheck, ESLint và build đạt. Gate bundle vẫn quét 183 JS asset/264 marker HSK4 vắng mặt. Web local trả HSK3 200, HSK4 guest 403; đang chạy cổng 3000. Chưa có media HSK4 phát hành trong D1 local để kiểm hành trình media HSK4 thật trên browser.
- **Dữ liệu giữ được:** không sửa D1, ID, package phát hành hoặc learner state. Inventory nền HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 rich không đổi.
- **Tiếp theo:** audit tiếp các consumer HSK4 khác và cache/offline sau hết hạn; chờ người dùng test module, chưa USER-ACCEPTED.

## Gói học · hỗ trợ Premium theo tài khoản · 25/09/2026

- **Module:** Hỗ trợ Premium — IN-REVIEW, chờ người dùng test.
- **Người học thấy gì:** trong Hồ sơ → Premium, tài khoản đăng nhập có thể gửi vấn đề quyền truy cập, gói/giao dịch hoặc lỗi kỹ thuật, xem trạng thái và phản hồi sau khi tải lại. Quản trị viên có hàng chờ và form trả lời cần xác minh lại. Guest được hướng dẫn đăng nhập.
- **Đã kiểm:** typecheck, ESLint, `db:check`, 11 test repository liên quan, rehearsal 28 migration/46 bảng/FK/integrity đạt. Browser 375 px kiểm guest 401, tài khoản thử gửi ticket, reload vẫn thấy, export chứa ticket, xóa tài khoản thử thành công. Gate toàn repo đạt: 404 file / 2.557 test, production build và kiểm bundle HSK4.
- **Dữ liệu giữ được:** backup D1 trước migration 0027 tại `tmp/before-premium-support-2026-09-25.sqlite`, integrity `ok`; migration local áp dụng thành công. Export schema v10 và delete account bao gồm ticket; rehearsal khôi phục đúng phản hồi. Inventory HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 rich không đổi; không reset progress, FSRS, mistakes, session hay outbox.
- **Tiếp theo:** người dùng test tại `http://localhost:3000/profile/premium`; chưa USER-ACCEPTED. Cần chốt giá, provider và chính sách hoàn tiền trước tích hợp thanh toán thật; chưa mở bán hoặc public deploy.

## Gói học · HSK0–HSK3 miễn phí, HSK4 Premium thử nghiệm · 25/09/2026

- **Module:** Gói học/Premium HSK4 — IN-REVIEW, chờ người dùng test.
- **Người học thấy gì:** HSK0–HSK3 tiếp tục miễn phí; HSK4 có màn kiểm quyền và trang gói trong Hồ sơ. Tài khoản có thể tạo/xác nhận giao dịch **thử nghiệm local, không thu tiền** theo kỳ hạn một tháng hoặc một năm, gia hạn chủ động, xem lịch sử và yêu cầu hoàn. Nội dung rich của bài, 72 câu Khảo Nghiệm cấp độ và 441 mục chữ HSK4 được tải qua API kiểm quyền; guest không nhận payload. Quản trị viên có danh sách giao dịch/yêu cầu hoàn thử nghiệm. Hết hạn hoặc hoàn giao dịch không xóa tiến độ học.
- **Đã kiểm:** typecheck, ESLint, `db:check`, `test:restore` và production build đạt; toàn bộ 403 file / 2.555 test đạt sau khi tách nội dung HSK4. Browser smoke kiểm guest HSK3 được mở, HSK4 API rich/level-check/characters trả 403; tài khoản thử nghiệm kích hoạt rồi cả ba API trả 200, mở route bài và khảo nghiệm HSK4, yêu cầu hoàn, mobile 375 px không tràn ngang. Tài khoản test đã xóa qua API. Build check quét 183 client JS assets, 264 marker payload HSK4 vắng mặt; rich chunk giảm từ khoảng 1,6 MB xuống 830 KB. Báo cáo quản trị nay tính trên toàn ledger thay vì chỉ 200 dòng gần nhất; test 201 giao dịch xác nhận yêu cầu hoàn cũ vẫn hiện. Hoàn lặp bị chặn để không ghi audit thành công lần nữa. `verify:production` fail-closed với 23 blocker còn thiếu evidence.
- **Dữ liệu giữ được:** sao lưu D1 local tại `tmp/before-hsk4-premium-sandbox-2026-09-25.sqlite` trước migration 0026; restore rehearsal bảo toàn 45 bảng, FK/integrity. Giữ inventory HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 rich; 100/217 authored local theo checkpoint trước, HSK4 chưa authored mới. Không reset progress, FSRS, mistakes, session hay outbox.
- **Giới hạn và tiếp theo:** chưa có giá/cổng thanh toán thật, không mở bán hay public deploy. Metadata/ID HSK4 vẫn công khai trong `curriculum-*.js` để hiển thị lộ trình; 264 marker bundle không phải audit đầy đủ mọi payload. Cần rà toàn bộ consumer/asset HSK4, kể cả đề mock, và bảo đảm cache/offline/phiên hết hạn không lộ nội dung trước production. Nội dung HSK4 chưa human-reviewed. Phương án VNPAY/MoMo, giá, gia hạn và hoàn tiền cùng threat model đã ghi trong `docs/PREMIUM_COMMERCE.md` để người dùng chốt; `verify:production` còn 23 blocker. Chờ người dùng test web local; chưa USER-ACCEPTED.

## Thiên Lộ/Xưởng · năm bài HSK3 đời sống–xã hội và thể thao · 27/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 còn mở.
- **Người học thấy gì:** Năm bài `hsk3-society-arts-sports-reports-*` đã phát hành local, mỗi bài chín trang gồm ngữ liệu mới, một sơ đồ dữ kiện có thể sửa trong Xưởng, luyện chọn/điền có phản hồi và viết với bối cảnh mới. Bài phân biệt thói quen đổi cách nhưng không mất, công năng ba tầng đã mở so với khảo sát tháng sau, ý định tập thêm so với việc đã làm, buổi thử thể thao so với thi đấu và tỉ số hiệp đầu so với chung cuộc. Sơ đồ thời gian/quy trình/so sánh là học liệu thị giác đúng dữ kiện thay cho ảnh bối cảnh lặp lại.
- **Đã kiểm:** Builder/validator 5 bài, 45 trang/15 hoạt động và nguồn target trong bài; import rehearsal/apply giữ 44 bảng, release rehearsal/apply giữ 43 bảng và FK, có backup D1 trước mỗi apply. Playwright trên web local 2/2: khóa trước tiên quyết, exact runtime cho cả năm, đọc/sơ đồ/feedback sai→đúng/nháp viết sau reload, mobile 375 px không tràn ngang; Xưởng mở exact document, nhận diagram, preview cùng renderer. TypeScript/ESLint/diff check đạt. `npm run check` đạt 414 test files/2592 tests và build.
- **Dữ liệu giữ được:** 105/217 bài có trang authored local, HSK3 21/55; 112 bài còn lại. Audit 713 hoạt động: 256 có target, 457 cũ còn thiếu. Nền HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 rich không đổi. Không thay ID, graph, tiến độ thật, FSRS/mistakes/session/outbox; fixture browser cô lập không dùng trong tài khoản. Backup `.wrangler/demo-backups/before-authored-thien-lo-batch-release-2026-09-27T03-24-20-588Z.sqlite`. AI-assisted giữ `humanReviewed:false`; bản rà ở `docs/thien-lo-redesign-review/39-REVIEW-HSK3-SOCIETY.md`.
- **Tiếp theo:** tiếp tục HSK3 các dạng diễn ngôn/tổng hợp và HSK4 theo lô; rà 457 target bằng nội dung/đáp án thật và xử lý 217 quyết định thị giác. Chưa USER-ACCEPTED, không push/deploy.

## Thiên Lộ/Xưởng · hàng đợi biên tập mục tiêu hoạt động · 26/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 còn mở.
- **Người học thấy gì:** Chưa đổi bài đã phát hành. Trong Xưởng, biên tập viên thấy số hoạt động đã gắn mục tiêu/nguồn của bài, số còn thiếu theo từng trang và có thể nhảy thẳng đến hoạt động tiếp theo cần rà; phần chọn mục tiêu tự mở. Đây là tăng tốc biên tập có kiểm soát, không tự gán kỹ năng từ dạng câu hỏi.
- **Đã kiểm:** Browser Studio trên web local cổng 3000: tạo nháp bài âm HSK0, nhảy tới hoạt động thiếu mục tiêu, gắn nguồn phát âm, lưu, tải lại, xác nhận đáp án giữ nguyên; Playwright 1/1 đạt. TypeScript, ESLint và diff check đạt.
- **Dữ liệu giữ được:** Chỉ thêm điều hướng editor; không sửa release head hoặc trạng thái học. Audit hiện tại vẫn 100/217 bài có trang phát hành local, 457/698 hoạt động chưa có learning target; không gọi đó là đã xử lý. Inventory HSK0 4/4, HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78 rich không đổi.
- **Tiếp theo:** dùng hàng đợi để rà nội dung/đáp án/nguồn theo lô và tạo revision mới; song song chuyển các nhóm bài HSK3–4 còn lại lên trải nghiệm học, rồi kiểm browser theo nhóm. Chưa USER-ACCEPTED.

## Xưởng · hoàn tác giữ vị trí trang · 25/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal còn mở.
- **Người học/biên tập viên thấy gì:** hoàn tác trong trình soạn khôi phục cả tài liệu và trang đang chọn, không luôn nhảy về trang đầu. Áp dụng cho chỉnh nội dung, thêm/xóa/nhân bản/đổi thứ tự. Một mức hoàn tác như trước.
- **Đã kiểm:** typecheck/ESLint đạt; test nhân bản giữ đáp án/ID riêng đạt. Browser nháp cô lập đã qua nhân bản → xóa trang → hoàn tác → đúng tiêu đề/vị trí và exact document → lưu → mở preview trên mobile, 24.1 giây. Log `tmp/studio-undo-browser-final.log`. Hai lượt trước lỗi Vinext `Network connection lost`; lượt sau đạt khi web local PID 1788 phục vụ ổn định, không bỏ assertion.
- **Dữ liệu giữ được:** không thay release lesson hoặc learner state; chỉ nháp browser riêng. Vẫn 100/217 authored; không commit/push/deploy.
- **Tiếp theo:** tiếp tục nội dung/media và Xưởng theo goal toàn phạm vi. Chưa USER-ACCEPTED.

## Thiên Lộ/Xưởng · năm bài thiên nhiên–môi trường và khung kết quả mobile · 23/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 còn mở.
- **Người học thấy gì:** năm bài nature-environment-explanations đã phát hành local, 42 trang/15 hoạt động; năm cảnh riêng, hai bản đồ dữ liệu khác nhau cho học/vận dụng. Nội dung phân biệt khí hậu/dự báo, dọn xong/duy trì, nhóm con khảo sát/ý định/hành động, hướng cố định/vị trí, quan sát cây/kết luận. Màn kết quả mobile và ngang thấp ẩn bản đồ trang trí khi chưa đạt hoặc đã nhận thưởng; giữ rương chưa nhận, xác nhận thưởng bằng chữ và CTA.
- **Đã kiểm:** 6 tests ba lô HSK3 đạt; typecheck/ESLint đạt sau sửa type của trang bản đồ. Import rehearsal/apply giữ 37 bảng; release rehearsal/apply giữ 36 bảng/FK. Studio năm bài exact-document/ảnh/cloze preview đạt 45.8 giây. Learner cả năm bài đạt 1.4 phút: lock trước evidence fixture guest cô lập, exact runtime, ảnh tải, tọa độ hai bản đồ, ghi chú/bằng chứng/Pinyin/reload, choice sai→đúng, viết→reload→rubric. Lượt đầu API trả lỗi Network thay JSON; Studio sau đó đạt, chạy lại riêng learner đạt, không restart/reset hoặc bỏ assertion. Logs `tmp/nature-{browser,learner}.log`. Khung kết quả hai browser journeys đạt 1.2 phút trước đó; xem ảnh mobile retry xác nhận bỏ vùng bản đồ, giữ đủ nội dung và nút. Log `tmp/result-compact-browser.log`.
- **Dữ liệu giữ được:** local 100/217 authored, còn 117; HSK3 16/55, HSK4 chưa authored mới. Nền HSK0 4 + HSK1–4 213 rich giữ. Audit 698 activities/241 target/457 thiếu; 29 bài có published page art, còn 139 scene/dialogue pages dùng ảnh chung; chưa chứng minh editorial visual review toàn kho. Backup `.wrangler/demo-backups/before-authored-thien-lo-batch-release-2026-09-23T02-04-00-971Z.sqlite`. Giữ ID, prerequisite và 83/72/79/71/67 vocabulary links. HumanReviewed:false; không reset learner state. Review 38; prompt/original ảnh tại `content/drafts/lesson-scenes-hsk3-nature-2026-09-23.json`.
- **Tiếp theo:** HSK3 văn hóa/xã hội, các dạng tổng hợp và HSK4; tiếp tục UI/Xưởng/media/liên thông theo phạm vi gốc. Chưa USER-ACCEPTED, không commit/push/deploy. Web local đã xác nhận PID 11108 trong lượt này.

## Thiên Lộ/Xưởng · đồng bộ lối ôn ở màn kết quả · 22/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal còn mở.
- **Người học thấy gì:** tài khoản đăng nhập có lối “Xem câu cần ôn” tới `/mistakes` khi chưa vượt ải, giống guest. Màn thành công hướng dẫn đúng bước tiếp theo được truyền vào, không luôn quảng bá Vạn Âm Điện khi nút đi nơi khác. Không đổi scoring/reward hoặc graph.
- **Đã kiểm:** 7/7 tests kết quả và prerequisite fixture; typecheck/ESLint đạt. Browser ba hành trình đạt 1.3 phút: toàn lô HSK2 học tập/công việc, guest retry và reward; CTA trong viewport desktop 1440×900, mobile 375×812, ngang 812×375. Xem ảnh mobile retry xác nhận nút ôn/làm lại rõ; phần hình bản đồ phía trên vẫn tốn chỗ, chưa coi giao diện hoàn tất. Account link đã kiểm wiring/source và component; chưa thêm lượt account terminal mới. Web local PID 11108, log `tmp/result-links-browser.log`; lượt đầu chạy trước listener sẵn sàng lỗi connection refused, lượt sau kiểm listener rồi chạy đạt.
- **Dữ liệu giữ được:** không mutation dữ liệu nội dung hoặc tài khoản; inventory vẫn 95/217 authored, nền 217. Phát hiện fixture HSK3 ở lượt trước ghi đè tên fixture HSK2: đã tách `hsk3-study-work-prerequisite-evidence.json`, tái tạo fixture HSK2 từ graph và thêm test closure cho cả hai. Đây là evidence giả trong browser test cô lập, không dữ liệu người học thật. Không commit/push/deploy.
- **Tiếp theo:** tiếp tục nội dung/media HSK3–4 và trải nghiệm Thiên Lộ/Xưởng; màn kết quả vẫn cần tối ưu vùng bản đồ ở mobile. Chưa USER-ACCEPTED.

## Thiên Lộ/Xưởng · lô học tập/công việc và giảm công việc lặp · 22/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 còn mở, chưa USER-ACCEPTED.
- **Người học thấy gì:** năm bài study-work-accounts đã phát hành local: 40 trang, 15 hoạt động đọc/viết, năm cảnh nguyên bản riêng. Phân biệt phương pháp/kết quả học; vai trò mẹ–con–giáo viên; manh mối/kết quả tìm đồ; phân công/chờ xác nhận; trải nghiệm/nghề nghiệp dự định. Có bài đọc bốn đoạn, bằng chứng/ghi chú, tám từ trọng tâm, quan hệ câu, choice/cloze, vận dụng đổi dữ kiện và rubric. Tất cả trong schema Xưởng.
- **Đã kiểm:** 4/4 tests hai lô HSK3, typecheck và ESLint đạt. Tách `build-narrative-batch.ts` dùng chung HSK3/4; tạo lại personal khớp từng byte, không đổi bản phát hành. Browser spec dùng lựa chọn lô `THIEN_LO_NARRATIVE_BATCH=study-work`, giữ mặc định personal. Import rehearsal/apply bảo toàn 37 bảng; release rehearsal/apply bảo toàn 36 bảng/FK. Browser cả năm learner + Studio đạt 2.3 phút: exact runtime/document, prerequisite lock trước fixture guest cô lập, ảnh tải, evidence/Pinyin/note reload, đáp án sai→đúng, viết→reload→rubric, cloze preview. Log `tmp/study-work-browser.log`. Lượt đầu ECONNREFUSED vì PID cũ không tồn tại; khởi động vinext PID 11372, không migrate/reset.
- **Dữ liệu giữ được:** nền 217 giữ nguyên; local 95/217 authored, còn 122; HSK3 11/55, HSK4 chưa authored mới. Audit 683 activities: 226 target/457 thiếu. 24 bài có published page art; vẫn 139 scene/dialogue pages dùng ảnh chung, 217 cần editorial visual review toàn diện. Backup `.wrangler/demo-backups/before-authored-thien-lo-batch-release-2026-09-22T09-57-15-727Z.sqlite`. Giữ IDs, prerequisites, vocabulary 71/64/59/60/66; không reset progress/FSRS/lỗi/owner/outbox. HumanReviewed:false. Review 37, prompt/source ảnh trong `content/drafts/lesson-scenes-hsk3-study-work-2026-09-22.json`.
- **Tiếp theo:** tiếp tục Thiên Lộ/Xưởng theo goal: nhóm HSK3 kế tiếp, HSK4, media, trải nghiệm học–luyện–kết quả và liên thông. Công cụ dựng/schema/browser đã dùng chung để giảm mã lặp; chưa có bằng chứng tăng tốc toàn dự án hoặc hoàn thiện toàn kho. Không commit/push/public deploy.

## Thiên Lộ/Xưởng · phát hành năm bài kể chuyện HSK3 · 22/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 còn mở.
- **Người học thấy gì:** năm bài personal-life-narratives đã phát hành local, 43 trang và 17 hoạt động có source task. Năm cảnh riêng; bài food-shopping thêm ba đoạn ăn uống, chọn theo khẩu vị/ngân sách và vận dụng mới. Mỗi bài có bốn đoạn chính, ghi chú/chọn bằng chứng, tám từ trọng tâm, giải thích quan hệ, choice/cloze và viết đổi dữ kiện. Tất cả giữ trong schema Xưởng.
- **Đã kiểm:** nội dung schema/source/đáp án/ID đạt; typecheck/ESLint đạt. Import rehearsal/apply giữ 37 bảng; release rehearsal/apply giữ 36 bảng/FK. Studio năm nháp riêng exact-document, ảnh, preview cloze đạt 44.7 giây. Learner đạt 2.2 phút: lock trước fixture guest cô lập, exact runtime, ảnh tải, ghi chú/bằng chứng/Pinyin lưu và reload, sai→đúng, viết→reload→rubric. Lần đầu Vinext Network connection lost ngay onboarding/API; restart đúng tiến trình dev, không reset/migrate. Lượt sau test tải lại trước hàng đợi IndexedDB lưu Pinyin; đã chờ đúng snapshot dữ liệu, không sleep cố định. Log `tmp/hsk3-personal-{browser,learner}.log`.
- **Dữ liệu giữ được:** backup `.wrangler/demo-backups/before-authored-thien-lo-batch-release-2026-09-22T06-51-51-590Z.sqlite`. Nay 90/217 authored, còn 127 bài nền; HSK3 6/55 authored. Audit 668 activities, 211 có target/457 thiếu; 19 bài có ảnh trang riêng, 139 trang scene/dialogue dùng ảnh chung. Không mất ID/prerequisite/progress/FSRS/lỗi/owner/outbox. HumanReviewed:false. Không coi ghi chú/rubric tự đánh giá là mastery.
- **Tiếp theo:** HSK3 nhóm học tập/công việc và các bài tổng hợp; tiếp tục media toàn kho, UI và liên thông. Ba ví dụ từ trọng tâm fallback (比较、照顾、搬家) vẫn là ví dụ nguồn ngoài truyện chính, không coi là sự kiện trong truyện; cần nhãn ví dụ độc lập rõ hơn ở lần sửa nội dung. Chưa USER-ACCEPTED/commit/push/deploy. Web local PID 6368 sau restart. Review 36.

## Thiên Lộ/Xưởng · nháp năm bài kể chuyện HSK3 và năm cảnh riêng · 22/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 còn mở.
- **Người học thấy gì:** kho chọn ảnh Xưởng thêm năm cảnh mua sắm, phòng khám, chuyển nhà, nộp đơn, taxi đổi tuyến. Năm bài `hsk3-personal-life-narratives-*` mới chỉ là draft, chưa import/release: 40 trang, mỗi bài bốn đoạn đọc, tám từ trọng tâm, choice/cloze/rubric có source task và vận dụng đổi dữ kiện. Giữ đủ 45–72 vocabulary IDs mỗi bài trong liên kết tra/ôn, không gọi tất cả là từ mới buộc học trong phiên.
- **Đã kiểm:** test `authoredHsk3Personal` đạt schema/source/ID/prerequisite/đáp án; năm ảnh đã xem trực tiếp và chuyển WebP vào `public/lessons/ngoc-dien/hsk3-*-v1.webp`. Built-in imagegen, prompt/original lưu `content/drafts/lesson-scenes-hsk3-personal-2026-09-22.json`. Builder ban đầu trùng page/block IDs, đã sửa block prefix và chạy thành công. Các gate TypeScript/ESLint có log `tmp/hsk3-personal-*`; chưa kiểm browser hoặc phát hành nhóm này.
- **Dữ liệu giữ được:** không mutation D1/progress; local vẫn 85/217 authored, không đếm năm draft vào bài đã phát hành. HumanReviewed:false. Không commit/push/deploy.
- **Tiếp theo:** review năm bản thảo tại `scripts/content/hsk3-personal-narratives.ts` và draft `content/drafts/thien-lo-hsk3-personal-v2.json`; kiểm từ hỗ trợ bổ sung (guānchá, ānpái, xiūgǎi, liánxì fāngshì…), ví dụ từ trọng tâm fallback, độ rộng ăn uống trong bài food-shopping (hiện mới mua quần), rồi import/release/browse. Không coi năm cảnh là đủ media toàn kho. Tiếp tục HSK3/4 và liên thông còn thiếu.

## Thiên Lộ/Xưởng · bốn bài HSK2 tin nhắn/mô tả tranh · 22/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 còn mở.
- **Người học thấy gì:** guided-message-01/02 và picture-description-01/02 đã phát hành local, 40 trang, 12 hoạt động có source task, 14 ví dụ từ được sửa. Tin nhắn có yêu cầu/cập nhật/đổi dữ kiện; tranh dạy vị trí, trạng thái và phân biệt quan sát với suy đoán. Hai ảnh nguyên bản riêng hồ cá/cửa ga trời mưa đã vào kho Xưởng, prompt/source lưu tại `content/drafts/lesson-scene-observation-2026-09-22.json`. Ảnh hướng dẫn dùng khối không crop; CSS ảnh độc lập co theo vùng học, màn hình ngang thấp chuyển chọn trang sang bên cạnh. Ảnh, thẻ dữ kiện, rubric và nội dung đều biên tập bằng schema Xưởng.
- **Đã kiểm:** hai tests nội dung kiểm source/ID/prerequisite/đáp án/từ/ảnh đạt; typecheck và ESLint đạt. Import rehearsal/apply giữ 37 bảng; release rehearsal/apply giữ 36 bảng/FK. Studio exact-document + preview + cloze bốn nháp thử riêng đạt (lượt browser 1.8 phút có learner thất bại trước sửa CSS). Learner sau sửa đạt 46.6 giây: prerequisite trước fixture, runtime đúng payload, sai→đúng, viết→reload giữ bản nháp, tự đối chiếu, ảnh không crop và nằm trọn vùng học/footer ở 1440×900, 390×844, 812×375; đã xem screenshot portrait/landscape. Lỗi kiểm phát hiện và sửa: test sai text phản hồi; test thử sửa bản published thay vì nháp riêng; chờ tải ảnh; ảnh bị khuất trên landscape. Không tuyên bố mọi kiểu media/viewport đã được kiểm toàn kho.
- **Dữ liệu giữ được:** backup `.wrangler/demo-backups/before-authored-thien-lo-batch-release-2026-09-22T04-12-13-866Z.sqlite`. Inventory nền 217 giữ; local nay 85 authored, HSK2 40/40; còn 132 bài nền chưa authored. Audit 651 activities, 194 có target/457 thiếu; 14 bài có ảnh trang riêng, 139 trang scene/dialogue dùng ảnh chung. Không reset progress/FSRS/lỗi/phiên/owner/outbox. HumanReviewed:false, không tự chuyển kết quả rubric thành mastery.
- **Tiếp theo:** HSK3/4, minh họa và liên thông còn thiếu trong goal toàn kho. Source HSK3 đã trích read-only tại `tmp/hsk3-authoring-source.json`; lưu ý một số bài tổng hợp có hơn 200 wordIds, không đổ tất cả thành trang học từ mới. Review 35. Chưa USER-ACCEPTED, không commit/push/deploy. Web PID 8548 vẫn chạy khi kiểm.

## Thiên Lộ/Xưởng · phát hành ba bài nghe–chép · 22/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 còn mở.
- **Người học thấy gì:** dictation-01/02/03 đã phát hành local, 42 trang, ba ảnh mở đầu riêng, sáu bài cloze hiểu văn bản (target reading, không tính nghe), 12 đoạn nghe–chép và ba lượt vận dụng đổi dữ kiện. Có hướng dẫn tách cụm và quan hệ trước luyện, sửa mười ví dụ từ vựng thiếu/cụt. TTS có nhãn; có mở mẫu và ghi nhận Pinyin/gợi ý bàn phím. Lượt đối chiếu đầu giữ snapshot, hỗ trợ và lịch sử reveal; không tự tạo điểm nghe/viết.
- **Đã kiểm:** tám tests nội dung/builder/session đạt; typecheck/ESLint đạt. Import rehearsal/apply bảo toàn 37 bảng; release rehearsal/apply bảo toàn 36 bảng/FK. Browser Xưởng nghe–chép đạt 17.7 giây; learner ba bài kiểm prerequisite lock trước fixture, exact runtime/ảnh/chép sai→mở mẫu→thu mẫu→reload giữ text/support→sửa đúng đạt 33.7 giây. Fixture chỉ ở guest Playwright cô lập. Review 34, humanReviewed:false.
- **Dữ liệu giữ được:** backup `.wrangler/demo-backups/before-authored-thien-lo-batch-release-2026-09-22T03-21-24-565Z.sqlite`. Nền 217 giữ, nay 81 authored; còn 136 bài nền chưa authored. Audit 639 activities, 182 target/457 thiếu. 12 bài có ảnh trang riêng; còn 139 trang scene/dialogue dùng ảnh chung. Không reset progress/FSRS/lỗi/phiên/owner/outbox. Ví dụ trong bài đã sửa, không tuyên bố package nền và mọi consumer đã đồng bộ.
- **Tiếp theo:** bốn bài HSK2 tin nhắn/mô tả còn lại, tiếp tục minh họa toàn kho, Xưởng/giao diện và liên thông chưa đạt. Không USER-ACCEPTED/commit/push/public deploy. Web local chạy nền node vinext PID 8548 tại thời điểm kiểm.

## Thiên Lộ/Xưởng · hoàn thiện cảnh mở đầu chín bài survival · 22/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW, goal toàn kho còn mở.
- **Người học thấy gì:** thêm ảnh riêng cho survival-2/3/4: nhóm đại từ, trao đổi thẻ tên, album gia đình. Nay cả chín bài survival có chín cảnh mở đầu khác nhau; chưa coi các trang hội thoại/transfer và media toàn bài đã đủ. Kho Xưởng có 12 cảnh mới tổng cộng, gồm ba cảnh dictation chưa phát hành bài. Prompt/nguồn ba ảnh mới ở `content/drafts/lesson-scene-generation-2026-09-22.json`; asset trong `public/lessons/ngoc-dien/`, built-in imagegen, humanReviewed:false.
- **Đã kiểm:** rehearsal/apply ba revision qua fork/validate/release worker bảo toàn 36 bảng và FK, runtime đúng ảnh. Typecheck/ESLint đạt. Browser sau phát hành đạt 1.1 phút: runtime đúng payload/ảnh, ảnh tải thành công, bài tập sai→đúng và footer ba viewport; lần đầu ECONNREFUSED do devserver cũ mất handle, đã khởi động tiến trình nền ẩn (node vinext, không migration/reset).
- **Dữ liệu giữ được:** baseline 217, local 78 authored không đổi; chín bài có ảnh trang riêng, còn 139 trang scene/dialogue dùng ảnh chủ đề. Source hash/head/latest-draft kiểm trước fork; nội dung/đáp án/ID chỉ khác illustration và metadata review. Chưa USER-ACCEPTED, không commit/push/public deploy.
- **Tiếp theo:** hoàn thành kiểm browser, tiếp tục cảnh theo bài còn lại và các phần nội dung/giao diện/biên tập/liên thông v0.2 chưa xong. Không dừng ở 12 ảnh và không lấy số ảnh làm độ phủ toàn kho.

## Thiên Lộ/Xưởng · minh họa riêng theo trang và sáu revision local · 21/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; toàn v0.2 còn mở.
- **Người học thấy gì:** survival-1/5/6/7/8/9 đã phát hành ảnh tình huống riêng ở trang mở đầu; nội dung/đáp án/ID giữ nguyên. Có chín asset mới theo bối cảnh, ba asset còn lại gắn draft dictation chưa phát hành. Xưởng chọn cảnh, tải/chọn media và sửa mô tả theo trang; không còn bị giới hạn vào năm ảnh chủ đề. Không coi chín ảnh là đủ toàn kho.
- **Đã kiểm:** 13 tests schema/session/manuscript, typecheck và ESLint đạt. Browser nghe–chép đạt 13 giây; browser chọn ba ảnh → lưu → reload → preview đạt 25.5 giây. Screenshot phát hiện thanh lưu che footer preview, đã sửa position khi preview; kiểm lại đạt: learner toàn nhóm survival 1.1 phút và Xưởng lưu/reload/preview/footer 21.8 giây. Rehearsal/apply sáu revision bảo toàn 36 bảng/FK, runtime khớp ảnh. Lượt browser release đầu ECONNREFUSED do devserver dừng; đã khởi động lại vinext không migration/reset.
- **Dữ liệu giữ được:** 217 bài nền, 78 authored không tăng do đây là sửa ảnh. Backup `.wrangler/demo-backups/before-lesson-scene-revisions-2026-09-21T16-41-55-009Z.sqlite`. Audit ảnh từ release heads: sáu bài có ảnh trang riêng, còn 142 trang cảnh/hội thoại dùng ảnh chung. Chưa xong media toàn bài/toàn kho. Không mất progress/FSRS/lỗi/phiên/owner/outbox; nháp test riêng trong Studio không thay bài người dùng.
- **Tiếp theo:** xác minh browser release và footer; tiếp tục minh họa theo từng bối cảnh trong toàn kho, nội dung dictation và các phần v0.2 còn thiếu. Review 33, prompt/source được lưu. Không USER-ACCEPTED/commit/push/public deploy.

## Thiên Lộ/Xưởng · khối nghe–chép biên tập được · 21/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW, goal v0.2 còn mở.
- **Người học thấy gì:** thêm khối dictation nghe trước → viết → đối chiếu/mở lời trong cùng mục học; dùng bản ghi nội bộ hoặc giọng tổng hợp có nhãn. Xưởng chọn được loại khối, sửa yêu cầu/Hán tự/Pinyin/nghĩa, chọn audio hoặc quay về giọng tổng hợp. Không tự tạo điểm nghe/mastery. Chưa ghép/phát hành ba bài dictation vào local nên chưa tuyên bố người học đã nhận bài mới.
- **Dữ liệu giữ được:** parser phiên nhận draft dictation và lịch sử reveal; audio thường cũng ghi lịch sử mở lời. Giữ everChecked khi đối chiếu. Validator từ chối phát hành dictation thiếu dữ liệu hoặc transcript khác đáp án; nháp chưa hoàn chỉnh vẫn biên tập được. Không đổi ID nền, không mutation D1/progress/FSRS/owner/outbox; inventory vẫn 78/217 authored.
- **Đã kiểm:** 11 tests schema/session đạt, ESLint sáu file đạt, typecheck lần đầu đạt. Builder ba manuscript thành các trang/khối thường đã thêm; chưa browser/render kiểm luồng mới, chưa chứng minh đủ viewport hay media parity toàn kho.
- **Tiếp theo:** kiểm browser khối mới từ Xưởng qua preview, ghép ba manuscript vào bài hoàn chỉnh và phát hành local; tiếp tục giao diện/Xưởng và toàn kho đúng v0.2. Không USER-ACCEPTED/commit/push/public deploy.

## Thiên Lộ/Xưởng · phát hành bảy bài quy chiếu/so sánh/dựng câu · 21/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal v0.2 còn mở.
- **Người học thấy gì:** bảy bài reference-description-comparison-01…04 và sentence-reconstruction-01…03 đã phát hành local: 152 trang, 59 hoạt động, gồm 36 cloze đúng grammar source và chín bài sắp xếp thật. Bảy cảnh, thẻ dữ kiện và vận dụng đổi đối tượng/mốc/quan hệ. Order prompt cố định cấu trúc theo yêu cầu, không tuyên bố tiếng Trung chỉ có một thứ tự đúng. Review 32, humanReviewed:false.
- **Đã kiểm:** sáu tests nội dung/helper đạt; Typecheck/ESLint/diff check đạt. Import rehearsal/apply giữ 37 bảng, release rehearsal/apply giữ 36 bảng/FK. Xưởng exact-document/sơ đồ/choice/cloze/order sai→sửa đúng đạt 1.1 phút. Learner exact runtime/prerequisite/choice/reload/model và order/reload giữ thứ tự đạt 1.6 phút. Lượt đầu web đã dừng, khởi động vinext không migration/reset; lượt learner đầu gặp vinext Network connection lost ở bài cuối, kiểm lại toàn lô đạt, không nới gate hoặc timeout.
- **Dữ liệu giữ được:** backup `.wrangler/demo-backups/before-authored-thien-lo-batch-release-2026-09-21T10-43-31-660Z.sqlite`. Nền 217 giữ; local 78 authored, 633 activities/176 target/457 thiếu. Còn 139 bài nền chưa authored, HSK2 còn bảy bài nghe–chép/tin nhắn/mô tả tranh. Không reset progress/FSRS/lỗi/phiên/owner/outbox.
- **Tiếp theo:** đã soạn ba kịch bản dictation (12 đoạn luyện + ba chuyển giao) với giờ/số/phủ định, câu vị trí và chuỗi cập nhật phòng/giờ. Chưa có bản audio reviewed hoặc lesson release mới cho chúng; phải ghép UI nghe–chép phù hợp và đường hỗ trợ có provenance, không chỉ thay tên khung hội thoại. Hai bài tin nhắn và hai mô tả tranh còn lại; media/editor/integration toàn kho chưa hoàn tất. Không USER-ACCEPTED/commit/push/public deploy.

## Thiên Lộ/Xưởng · phần dạy/luyện bảy bài quy chiếu và dựng câu · 20/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW, lô mới chưa phát hành.
- **Đã biên soạn:** đủ 36 grammar row của reference-description-comparison-01…04, mỗi row có giải thích, mẫu và cloze đúng nguồn. Chín order activity riêng cho sentence-reconstruction-01…03; câu yêu cầu cố định chủ đề/vị trí thời gian/quan hệ vế để không giả định mọi câu chỉ có một trật tự đúng. Phản hồi thừa nhận thứ tự thay thế hợp lệ khi phù hợp; không đổi scorer hoặc ghép lời mẫu thành câu duy nhất đúng cho mọi ngữ cảnh.
- **Học liệu:** xuất 81 trang thành phần sửa được trong Xưởng tại `thien-lo-hsk2-reference-teaching-pack-v2.json`, đánh dấu partial-authoring-not-publishable. Từ theo ID tái dùng các sửa nghĩa của lô trước và thêm 11 ví dụ cho 啊/包/高/红茶/篮球/旅游/面/手/为什么/眼睛/自己; 手 không dùng 手表. Chưa đăng ký release pack thành bài hoàn chỉnh.
- **Đã kiểm:** bốn tests source coverage 36 row, đáp án số chênh/ước lượng/so sánh, order activity đúng source/unique pieces, ví dụ đủ câu và đúng nghĩa tay; đạt. Lượt đầu lỗi test regex phân biệt hoa/thường của “bắt đầu”, đã sửa test, không đổi yêu cầu bài để qua gate. Typecheck/ESLint đạt sau xuất pack và ví dụ.
- **Dữ liệu giữ được:** không D1 mutation, không thay release/owner/progress/FSRS/lỗi/phiên/outbox. Nền 217, local vẫn 71 authored/574 activities/117 target/457 thiếu. AI-assisted giữ humanReviewed:false.
- **Tiếp theo:** ghép bảy cảnh, sơ đồ và vận dụng riêng, rà đầy đủ ví dụ/ngôn ngữ, import/release/browser theo lô. Không tính 81 trang thành bảy bài hoàn tất; media/editor/integration toàn scope vẫn mở. Không USER-ACCEPTED/commit/push/public deploy.

## Thiên Lộ/Xưởng · phát hành sáu bài ngữ pháp HSK2 · 20/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; phạm vi v0.2 vẫn chưa hoàn tất.
- **Người học thấy gì:** aspect-time-experience-01/02, clause-linking-01/02, complements-and-motion-01/02 đã phát hành local. 138 trang, 39 điểm ngữ pháp có giải thích/luyện theo nguồn, 51 hoạt động. Có sáu cảnh, bảng dữ kiện, câu tổng hợp và vận dụng đổi mốc/người/hướng/kết quả. 27 ví dụ chọn theo word ID tránh nhầm hai nghĩa 过. Giữ humanReviewed:false, rubric là self-review. Review 31.
- **Đã kiểm:** sáu Vitest source/parity/đáp án/coverage/ví dụ đạt; Typecheck/ESLint/diff check đạt trước phát hành. Import rehearsal/apply giữ 37 bảng; release rehearsal/apply giữ 36 bảng/FK. Xưởng cả sáu bài exact-document→sơ đồ→choice→cloze sai/đúng đạt 50.1 giây. Lượt browser đầu 503 D1 trong lúc rehearsal còn chạy; không đổi auth/reset, chờ transaction kết thúc rồi kiểm lại đạt. Browser learner cả sáu bài prerequisite lock/exact runtime/answer/reload/transfer đạt 1.6 phút (`tmp/grammar-learner.log`).
- **Dữ liệu giữ được:** backup `.wrangler/demo-backups/before-authored-thien-lo-batch-release-2026-09-20T15-38-17-654Z.sqlite`. Nền 217 giữ, local 71 authored; audit 574 activities/117 target/457 thiếu. Còn 146 bài nền chưa authored, HSK2 còn 14 bài kỹ năng/ngữ pháp. Không reset owner/progress/FSRS/lỗi/phiên/outbox, không public deploy.
- **Tiếp theo:** nhóm reference-description-comparison và sentence-reconstruction: đã trích nguồn bảy bài (36 grammar rows trong bốn bài reference, ba bài dựng câu). Media riêng, editor parity toàn scope và integration/remediation còn thiếu; không coi 71 bài là 71 bài đã nghiệm thu hoặc đủ mastery. Không USER-ACCEPTED/commit/push.

## Thiên Lộ/Xưởng · sáu bài ngữ pháp, phần giải thích/luyện theo nguồn · 20/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW. Lô aspect-time-experience/clause-linking/complements-and-motion đang biên soạn, chưa phát hành.
- **Nội dung đã làm:** 39 quyết định sư phạm riêng theo đủ 39 grammar rows của sáu bài; xuất 78 trang giải thích/luyện bằng khối Xưởng chuẩn. Mỗi câu luyện trỏ đúng row, có đáp án/feedback; 来/去 nêu rõ điểm nhìn, 完 không suy hiểu, 可能 không suy chắc chắn. Đây mới là phần thành phần, chưa đủ sáu bài hoàn chỉnh; file `thien-lo-hsk2-grammar-teaching-pack-v2.json` đánh dấu partial-authoring-not-publishable, không đăng ký release.
- **Ví dụ từ:** chọn theo vocabulary ID, phân biệt 过 guò qua đường với 过 guo trải nghiệm. Thay ví dụ cụt và lệch nghĩa cho 27 mục, gồm 着 zhe không dùng 着急, 点 gọi món thay mốc giờ cho entry hiện hành, 名 thứ hạng theo nghĩa mục từ; lượng từ 名 vẫn được dạy tại grammar source riêng. Chưa thay từ điển nền hoặc release cũ.
- **Đã kiểm:** bốn tests kiểm source coverage chính xác, source target từng activity, serialization, thiếu/trùng decision bị chặn, các đáp án sai quan trọng, ví dụ theo đúng ID/đủ câu. Typecheck và ESLint nhóm helper/decision/tests đạt; Typecheck/ESLint sau thêm script xuất pack cũng đạt (tmp/grammar-pack-typecheck.log, tmp/grammar-pack-eslint.log). Diff check checkpoint đạt.
- **Dữ liệu giữ được:** không D1 mutation; nền 217, local vẫn 65 authored, 523 activities/66 target/457 thiếu. Không tính teaching pack thành bài đã hoàn tất; không reset progress/FSRS/lỗi/phiên/owner/outbox.
- **Tiếp theo:** ghép sáu tình huống, quyết định tổng hợp, sơ đồ và chuyển giao riêng; rà ngôn ngữ/model nguồn rồi import/release/browser theo lô. Không USER-ACCEPTED/commit/push/public deploy; goal toàn kho còn mở.

## Thiên Lộ/Xưởng · phát hành trọn năm bài học tập/công việc/văn hóa · 20/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW, goal toàn kho vẫn mở.
- **Người học thấy gì:** study-work-culture-01…05 có 49 trang, 36 từ theo inventory, 15 hoạt động. Phân biệt làm xong/hiểu, lịch khai giảng/giờ học, nghề/nghiệp vụ đang làm, trải nghiệm/phong tục trong phạm vi gia đình và hỏi họ/xưng hô. Vận dụng đổi dữ kiện; bảng timeline/comparison sửa được trong Xưởng. Mục tiêu đọc/grammar/tự viết tách rõ; rubric vẫn self-review. Review 30, humanReviewed:false.
- **Đã kiểm:** hai tests source/parity/ví dụ đúng nghĩa/đáp án/self-review đạt. Typecheck/ESLint/diff check đạt. Import rehearsal/apply giữ 37 bảng, release rehearsal/apply giữ 36 bảng/FK. Xưởng năm bài exact-document/sơ đồ/feedback đạt 45.3 giây; learner prerequisite/exact runtime/answer/reload/transfer đạt 58.2 giây. Backup `.wrangler/demo-backups/before-authored-thien-lo-batch-release-2026-09-20T14-32-33-943Z.sqlite`.
- **Dữ liệu giữ được:** nền 217 (HSK0 4, HSK1–4 213 rich), 65 authored hiện hành. Audit 523 hoạt động: 66 có target, 457 thiếu. Còn 152 bài nền chưa phát hành authored; HSK2 đã có 20 bài tình huống, còn 20 bài kỹ năng/ngữ pháp. Không reset owner/progress/FSRS/lỗi/phiên/outbox. Guest prerequisite chỉ là fixture Playwright cô lập.
- **Tiếp theo:** sáu bài aspect-time-experience/clause-linking/complements-and-motion đã đọc source graph; nhiều grammar row trên mỗi bài, cần dạy đủ từng cụm và kiểm đúng nguồn, không gắn mọi mục tiêu vào grammar[0]. Có hai từ 过 khác ID/nghĩa: ví dụ phải chọn theo ID, tránh map mặt chữ chung. Media/editor/integration toàn kho vẫn còn mở; không USER-ACCEPTED/commit/push/public deploy.

## Thiên Lộ/Xưởng · hoàn thành phát hành học phần con người/sự việc/môi trường · 20/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW. Ba bài person-events-environment-03/04/05 đã phát hành local, cùng 01/02 tạo đủ năm bài authored của học phần; không đồng nghĩa nghiệm thu hoặc hoàn tất media.
- **Người học thấy gì:** thêm 28 trang, 13 từ gốc và chín hoạt động có mục tiêu. Chọn áo theo hai giới hạn; phân biệt thời tiết/dự báo và đổi kế hoạch; mô tả có/vị trí với mốc rõ. Vận dụng thay toàn bộ dữ kiện quyết định. Bảng comparison/timeline sửa được trong Xưởng, không yêu cầu đoán từ campus art. Review 29, humanReviewed:false.
- **Đã kiểm:** hai tests nội dung/parity/source/đáp án/self-review đạt; typecheck/ESLint/diff check đạt. Import rehearsal/apply bảo toàn 37 bảng, release rehearsal/apply bảo toàn 36 bảng/FK. Browser Xưởng ba bài exact-document/sơ đồ/feedback đạt 22.7 giây; learner prerequisite lock/exact runtime/answer/reload/transfer đạt 38.7 giây. Backup `.wrangler/demo-backups/before-authored-thien-lo-batch-release-2026-09-20T14-19-38-889Z.sqlite`.
- **Dữ liệu giữ được:** nền 217 (HSK0 4 và HSK1–4 213 rich), nay 60 authored. Audit 508 hoạt động, 51 có mục tiêu/457 thiếu; còn 157 bài nền chưa phát hành authored. Không reset progress, FSRS, lỗi, phiên, owner hoặc outbox. Fixture prerequisite chỉ nằm trong guest Playwright cô lập.
- **Tiếp theo:** lô năm bài study-work-culture đã đọc nguồn. Phải sửa ví dụ lớp 班 dùng 上班, sai 错 dùng 不错, lượng từ 名 dùng 名字, ví dụ cụt 教/考/考试/意思; tách làm xong với hiểu bài, dự định với trải nghiệm, tránh khái quát mọi gia đình Trung Quốc đều ăn sủi cảo. Tiếp tục media/editor/integration trong scope v0.2; không USER-ACCEPTED/commit/push/public deploy.

## Thiên Lộ/Xưởng · phát hành người/sự việc, sửa tìm kiếm mã dài · 20/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW, goal toàn kho còn mở. Người dùng yêu cầu tăng tốc; gom tác giả/phát hành/kiểm theo học phần, không đổi chuẩn nội dung hoặc thu hẹp phạm vi.
- **Người học thấy gì:** person-events-environment-01/02 đã phát hành local: 22 trang, 25 từ, sáu hoạt động có mục tiêu. Nhận diện ba người/so sánh đúng phạm vi; kể thời gian đợi và đến muộn, giữ mức phỏng đoán. Sơ đồ sửa được trong Xưởng. Review 28, humanReviewed:false.
- **Đã kiểm:** import/apply bảo toàn 37 bảng; release/apply bảo toàn 36 bảng, FK đạt. Backup `before-authored-thien-lo-batch-release-2026-09-20T14-06-56-500Z.sqlite`. Hai test nội dung đạt. Browser Xưởng đạt 2.3 phút; browser learner đạt 44.8 giây gồm prerequisite lock, exact document, câu trả lời, reload, model. Typecheck/ESLint/diff check đạt.
- **Lỗi Xưởng:** D1 báo LIKE pattern quá phức tạp khi tìm mã bài dài. Thay bằng instr/lower tại list/count/coordination queue, giữ tìm chuỗi literal. 13 repository tests đạt, có mã dài và ký tự %/_; browser mở đúng bài xác nhận fix. Không đổi quyền truy cập.
- **Dữ liệu giữ được:** nền 217, nay 57 bài authored; audit 499 hoạt động, 42 có mục tiêu và 457 còn thiếu. Còn 160 bài nền chưa phát hành authored; số này không chứng minh mastery/độ phủ HSK. Tiến độ, FSRS, lỗi, phiên/account không reset.
- **Tiếp theo:** gom ba bài còn lại của person-events-environment thành một lô, sau đó học phần kế tiếp. Media riêng/editor/integration toàn kho chưa hoàn tất. Không USER-ACCEPTED/commit/push/public deploy.

## Thiên Lộ/Xưởng · đồng bộ bốn ví dụ với Tàng Tự Khố · 20/09/2026

- **Module:** Thiên Lộ/Xưởng, điểm liên thông mục từ — IN-REVIEW.
- **Người học thấy gì:** các ví dụ 有时/过/着/游 trong từ điển đã khớp ví dụ đúng nghĩa của bài authored. Giữ mã từ gốc khi ghép bản nhập Xưởng; mở bằng đường dẫn Xưởng cũ vẫn xem đúng ví dụ và lưu theo ID từ gốc. Bản nháp/revision và workflow ở Xưởng được giữ để tiếp tục biên tập.
- **Phát hành:** đối chiếu canonical bốn draft với nguồn trước khi thay, chỉ sửa examples và review. Rehearsal/apply qua repository/release worker đạt, 36 bảng được bảo vệ/FK giữ nguyên. Backup `.wrangler/demo-backups/before-vocabulary-example-corrections-2026-09-20T13-36-15-529Z.sqlite`. Review 27, humanReviewed:false. Không sửa gói nền đã pin hoặc đáp án các phiên cũ.
- **Đã kiểm:** browser runtime→bốn từ→cả ID gốc và stable key Xưởng→tab Ví dụ→link bài nguồn→lưu từ đạt 25.3s. SavedWords giữ ID gốc, không thêm stable key bản nhập; chỉ guest test cô lập bị thay đổi. Lượt đầu thất bại vì test chưa chọn tab Ví dụ, đã sửa thao tác; không sửa UI để né test. Typecheck/ESLint đạt sau xóa hai script audit tạm do chính lượt này tạo (chúng gây lỗi typecheck); không xóa dữ liệu người dùng.
- **Dữ liệu giữ được:** baseline 217 và 55 bài authored không đổi, đây là sửa bốn mục từ chứ không tính thêm bài. Tiến độ/FSRS/lỗi/phiên/account được fingerprint bảo toàn; không reset/migrate. Các consumer trực tiếp dùng ví dụ package nền vẫn cần audit, chưa tuyên bố đồng bộ toàn bộ assessment/FSRS.
- **Tiếp theo:** tiếp tục nhóm bài HSK2 còn lại và media/editor trong phạm vi v0.2; dung lượng tổng chỉ cảnh báo theo yêu cầu người dùng. Goal còn mở; không USER-ACCEPTED/commit/push/public deploy.

## Thiên Lộ/Xưởng · ưu tiên triển khai và liên kết mục từ · 20/09/2026

- **Module:** Thiên Lộ/Xưởng, điểm nối Tàng Tự Khố — IN-REVIEW.
- **Theo yêu cầu mới:** tổng dung lượng toàn ứng dụng vượt 1 MiB chuyển thành cảnh báo, giữ báo cáo asset và phép đo, không tăng ngưỡng hoặc xóa nội dung. Lệnh đã chạy exit 0 với cùng số đo vượt 113.2 KiB; chưa phải bằng chứng hiệu năng thực tế.
- **Thay đổi:** nhận diện bản nhập Xưởng `curriculum-word-<ID>` bằng sourceVocabularyIds khớp từ, Hanzi, Pinyin và liên kết bài nguồn. Ghép vào mục từ gốc giữ ID, isCore, traditional/classifiers và quan hệ learner; mục từ độc lập cùng mặt chữ vẫn riêng. Giữ sourceStableKey để đường dẫn bản Xưởng cũ vẫn tìm đúng mục từ sau ghép. Không sửa package nền đã pin hoặc hợp nhất theo Hanzi mơ hồ.
- **Đã kiểm:** năm tests projection/merge đạt, bao gồm sửa đúng một mục từ, giữ ID, từ chối nguồn/chữ/Pinyin lệch và không ghép mục từ độc lập. Typecheck đạt. Chưa có browser cho thay đổi dictionary này; chưa phát hành các bản sửa ví dụ vocabulary.
- **Dữ liệu giữ được:** không D1 mutation, không sửa progress/FSRS/saved/phiên; kho vẫn 55 authored trên nền 217. Goal đầy đủ còn mở; 162 bài nền và phần media/editor/integration vẫn chưa hoàn tất.
- **Tiếp theo:** hoàn thành xác minh browser và bản sửa ví dụ có review trong Xưởng, rồi tiếp tục nội dung bài. Không quay lại tối ưu tổng bundle như một blocker; không USER-ACCEPTED/commit/push/deploy.

## Thiên Lộ/Xưởng · kiểm khôi phục học liệu và lượt làm bài · 20/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW, scope v0.2 còn mở.
- **Thay đổi:** mở rộng rehearsal từ 23 lên 26 migration/44 bảng, thêm fixture riêng cho ngày truy cập theo owner, media hai chunk đúng cách nối base64 của repository và ba page-attempt cùng idempotency key ở owner/reset epoch khác nhau. So sánh toàn bộ row trước/sau backup, byte/hash/metadata ảnh, response có trợ giúp và ràng buộc unique/FK/JSON/outcome/epoch. Chỉ database tạm, không chạm `.wrangler/`.
- **Đã kiểm:** `npm run test:restore` đạt: 26 migration, 44 bảng; ảnh exact byte, ba receipts và ba ngày truy cập giữ nguyên; các kiểm Reader/outbox/credential/editorial cũ đều đạt. ESLint hai script và diff check đạt. Full Vitest kết thúc 381 tệp/2509 tests đạt, 7 tests lỗi: sáu timeout 10 giây ở content, một test CharactersPage vẫn tìm nhãn cũ `Hiểu cấu trúc` tại trang chọn chữ trong khi hướng dẫn đã nằm trong session. Chưa đổi UI module chữ ngoài phạm vi. Sáu tệp content đang chạy lại với maxWorkers=1, giữ timeout cũ; log `tmp/thien-lo-content-serial-recheck.log`.
- **Dữ liệu giữ được:** không release mới hoặc mutation tài khoản, baseline 217 và 55 authored giữ nguyên. Không reset/migrate D1 thật; test mới kiểm bảo toàn chứ không đổi schema runtime.
- **Kết quả kiểm lại:** sáu tệp content đạt 43/43 với maxWorkers=1 và timeout vẫn 10 giây. Sửa riêng test boundary chữ để kiểm CharacterStructurePanel/hướng dẫn tại session và so tập ký tự thực tế thay cho chuỗi hiển thị số lượng đã bỏ; 5/5 đạt, ESLint đạt, không sửa learner UI. Lượt full trước đó vẫn là failed, chưa tuyên bố full suite xanh từ các rerun. Build đang chạy tại `tmp/thien-lo-build-check.log`.
- **Build:** biên dịch Vinext hoàn tất nhưng bundle budget fail: 1137.2 KiB gồm client Brotli 1071.5 KiB + hero 65.7 KiB; vượt ceiling local 1024 KiB khoảng 113.2 KiB. Không tăng ngưỡng. Build provenance local/unattestable do worktree có thay đổi, không phải public release.
- **Audit bundle:** bổ sung bảng 15 asset lớn nhất ngay khi gate fail, vẫn cùng phép tính và ngưỡng. Chạy lại xác nhận richLessonContent 201.0 KiB Brotli, curriculum 127.2 KiB, FullStyleBoundary CSS 54.6 KiB; LessonPage 25.5 KiB và StudioStructuredEditor 17.0 KiB. ESLint script đạt. Các JSON rich runtime chủ yếu là nội dung thật, không có khối metadata lớn có thể bỏ ngay. Service worker bỏ qua `/api`, nên không chuyển dữ liệu nền sang API chỉ để giảm JS nếu chưa thiết kế cache offline tương ứng. Chưa có bằng chứng giảm dung lượng; log `tmp/thien-lo-bundle-breakdown.log`.
- **Tiếp theo:** audit bundle client để giảm mã/dữ liệu thừa rồi tiếp tục phần nội dung/media/editor còn thiếu. Không kết luận full check/build đạt, không USER-ACCEPTED/commit/push/deploy.

## Thiên Lộ/Xưởng · phát hành HSK2 chuyến đi và giải trí · 20/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; scope toàn v0.2 chưa hoàn tất.
- **Người học thấy gì:** travel-leisure-03/04 có 24 trang, timeline trải nghiệm/việc đã làm/kế hoạch và comparison sở thích/khả năng/quyết định. Sáu hoạt động có target, hai nhiệm vụ vận dụng đổi dữ kiện; sửa ví dụ nghĩa của 过/着/游 trong bài. Xưởng nhận cùng dữ liệu trang, sơ đồ, đáp án và rubric. HumanReviewed:false; review 26 ghi rõ từ điển global chưa sửa.
- **Phát hành:** import rehearsal/apply giữ 37 bảng; release rehearsal/apply giữ 36 bảng, FK đạt. Backup `.wrangler/demo-backups/before-authored-thien-lo-batch-release-2026-09-20T04-46-59-689Z.sqlite`.
- **Đã kiểm:** ba Vitest nguồn/parity/đáp án/nghĩa từ đạt; TypeScript/ESLint/diff check đạt. Browser Xưởng exact document→sơ đồ→sai/đúng đạt 37.8s; learner gate trước tiên quyết→exact runtime→hai bài→đáp án→reload→model đạt 46.5s. Fixture tiên quyết chỉ ở guest browser mới, không đổi tiến độ demo. Kiểm bố cục ảnh phủ khung và nút nghe đạt lại ba viewport (1235×640, 375×812, 812×375); đã xem screenshot desktop/mobile. Không thêm CSS vì bố cục đã đáp ứng phép kiểm này.
- **Tích hợp:** sửa test bundle remediation: cho phép tên correctAnswer trong receipt sau nộp, mở rộng kiểm cấm import kho đáp án/scorer support/local learning state; năm tests boundary/helper đạt. Không đổi runtime ở bước này.
- **Gate toàn dự án:** full check đã qua typecheck/lint, authoring HSK1–4 và db:check; dừng test:restore vì script pin 23 migration qua 0022 nhưng có 26. Ba migration mới tạo learner_access_days, lesson_media_assets/chunks và lesson_page_attempts; cần mở rộng dữ liệu rehearsal và kiểm preservation, không chỉ tăng số lượng cho qua gate. Chưa chạy full tests/build ở lượt này.
- **Dữ liệu giữ được:** audit D1 55 authored, 493 activities, 36 có target/457 thiếu target; còn 162 bài nền chưa phát hành authored. Nền 217 giữ, không reset ID/progress/FSRS/lỗi/phiên/outbox. Số lượng không chứng minh mastery/đủ HSK. Art campus còn chung.
- **Tiếp theo:** cập nhật rehearsal khôi phục cho dữ liệu mới, rồi tiếp tục nội dung/media/editor và liên thông còn thiếu trong v0.2. Web local 3000 đang chạy. Không USER-ACCEPTED/commit/push/public deploy.

## Thiên Lộ/Xưởng · sửa binding authoring HSK1 · 20/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; scope v0.2 còn mở.
- **Thay đổi:** serializer scope HSK1 giữ CRLF đúng byte runtime đã pin. Tái tạo hai draft character/level-check với guard chỉ cho phép thay source hash: ba và bốn binding, không đổi nội dung. Manifest chỉ đổi tám hash nguồn; promotion queue chỉ đổi hai hash phụ thuộc. Không thay trạng thái duyệt, approval hoặc quyền phát hành.
- **Đã kiểm:** scope generator `--check` đạt; sáu tệp Vitest (scope, character, level-check, review manifest/workflow, promotion queue) đạt 29/29 tests. `git diff --check` đạt. Full `npm run check` đang chạy, chưa có kết luận toàn dự án; log `tmp/hsk1-binding-full-check.log`.
- **Dữ liệu giữ được:** không D1 migration, reset hoặc release mới; nền 217 và số authored được kiểm gần nhất 53 giữ nguyên. Không thay lesson ID, progress, FSRS, lỗi, phiên hoặc outbox; humanReviewed giữ nguyên. Không commit/push/deploy.
- **Tiếp theo:** lấy kết quả gate đang chạy và xác minh lại browser ảnh phủ khung/nút nghe trên ba viewport; tiếp tục phần nội dung, media và editor còn thiếu theo scope đã chốt. Không USER-ACCEPTED.

## Thiên Lộ → sửa lỗi · giữ hợp đồng chấm điểm, tách phản hồi · 18/09/2026

- **Module:** Thiên Lộ/Xưởng, điểm tích hợp sửa lỗi — IN-REVIEW; scope v0.2 còn mở.
- **Người học thấy gì:** giữ giải thích/đáp án sau khi gửi lượt sửa lỗi; phần này được tạo tại bước lưu receipt sau kiểm tra account/reset/context, không đi vào score/evidence. Retry trả nguyên receipt đã lưu. Không thêm answer vào queue hoặc cấp mastery từ sửa lỗi.
- **Thay đổi:** tách remediationAttemptFeedback khỏi attemptScoring; scorer khớp lại snapshot foundation-2026.08.7, không sửa snapshot/manifest để qua gate. Helper chỉ xử lý source mistake với activity/method/version đúng nguồn bài đã phát hành; reader không tự nhận feedback của lesson.
- **Đã kiểm:** 87 tests scoring/repository/packageGovernance đạt, bao gồm persistence và duplicate receipt; hai test helper đạt cho đáp án khi sai và từ chối source/method/version/activity khác. Typecheck/ESLint/diff check đạt. Full check vượt local-study, graduation/HKS4, queue, dependency, typecheck/lint rồi dừng tại `Checked HSK1 curriculum scope is stale` trong authoring chain (log tmp/resume-scoring-check.log); chưa chạy hết test/build. Browser hai bài motion/meeting dùng guest cô lập: gate trước tiên quyết→exact runtime→đáp án→reload→model đạt 33.5s. Đây là regression hành trình bài học, chưa phải browser riêng cho receipt sửa lỗi; receipt có repository integration test.
- **Dữ liệu giữ được:** không đổi protocol/ID/score/mastery/phiên/outbox schema, không D1 migration hoặc reset. Kho nền 217 và 53 authored giữ; humanReviewed không đổi. Không commit/push/deploy.
- **Tiếp theo:** đối soát binding authoring HSK1 đang chặn gate, rồi quay lại nội dung travel-leisure-03/04; test UI đọc receipt còn phải rà. Web local 3000 đã mở bằng vinext trực tiếp, không chạy migration. Không USER-ACCEPTED.

## Thiên Lộ/Xưởng · tiếp tục theo yêu cầu người dùng, sửa byte nguồn · 18/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW. Người dùng đã nói “tiếp tục phát triển đi”, thay thế yêu cầu tạm ngừng bên dưới; scope v0.2 còn nguyên, chưa hoàn tất.
- **Thay đổi:** audit chứng minh review manifest HSK4 có cùng JSON nhưng CRLF khác serializer. Script normalize-content-checkout chỉ khôi phục LF khi bằng Git index, snapshot phải khớp manifest. Khôi phục 257 JSON sang LF; bốn nguồn giữ CRLF theo binding runtime đã pin (inventory HSK, scope HSK1, vocabulary HSK1, reviewer packet). Khôi phục 138 snapshot TypeScript về byte LF đã kiểm chứng khớp 138 hash manifest, không đổi nội dung snapshot. Thêm thuộc tính checkout rõ ràng. Consumer authoring cũ của ba nguồn HSK1 vẫn có binding LF/CRLF xung đột, chưa coi đã xử lý toàn bộ.
- **Đã kiểm:** HSK4 review manifest check/validate đạt (168 pending, 0 approvals); HSK1 local-study-review check đạt. Nhóm 4 tệp/36 tests đạt sau khôi phục ngoại lệ. Lượt 5 tệp/102 tests đạt 101, còn lỗi packageGovernance: src/server/attemptScoring.ts digest khác manifest, không bỏ gate hoặc sửa manifest. Chạy nội dung rộng trong lúc điều tra có 30 lỗi/584 đạt, không dùng làm kết luận trạng thái cuối. Full check đã vượt HSK4 và dừng tại promotion queue stale.
- **Promotion queue:** diff tái tạo chỉ có ba sourceBindings hash cho scope/personal/communicative HSK1; không đổi summary, approvals hoặc quyền phát hành. Đã cập nhật báo cáo derived và check/validate đạt: 213 blueprint, 0 approvalRecords, 0 promotionReadyUnits, 0 completionClaims. Chưa chạy lại full check sau mốc này.
- **Gate cuối của slice:** 5 tệp/41 tests đạt (promotion queue, source provenance, HSK0, editorial assignments, demo); ESLint script khôi phục byte và diff check đạt. Diff scorer còn đỏ được xác định là phần thêm remediationFeedback sau chấm điểm, cần tách khỏi contract scorer đã pin hoặc migration phù hợp, không phải lỗi xuống dòng.
- **Dữ liệu giữ được:** không thay D1, browser state, ID, progress, FSRS, lỗi hay phiên. Không sửa docs/reports/output, không stage/commit/push/deploy. Kho local vẫn 53 authored trên nền 217; các sửa byte không phải bài mới.
- **Tiếp theo:** đối chiếu scorer hiện tại với snapshot/contract và xử lý binding authoring còn stale; sau gate quay lại hai bài travel-leisure-03/04 cùng phần media/editor/remediation còn thiếu. Không USER-ACCEPTED.

## Tạm ngừng phát triển và báo cáo học phần · 16/09/2026

- **Module:** Bàn giao hiện trạng — IN-REVIEW. Người dùng tạm ngừng phát triển vài ngày; chưa chọn hướng doanh nghiệp, chưa USER-ACCEPTED toàn sản phẩm.
- **Người học thấy gì:** không bổ sung chức năng trong lượt rà soát. Lưu mốc các thay đổi hiện có và viết báo cáo về chức năng, mức độ hoàn thiện, giới hạn; không đề xuất hướng doanh nghiệp theo yêu cầu cuối.
- **Đã kiểm:** typecheck đạt; full check dừng ở HSK4 review manifest stale. Chi tiết rà soát, bảo toàn dữ liệu và gate tại `PAUSE_CHECKPOINT_2026-09-16.md`.
- **Dữ liệu giữ được:** không thay D1/browser state, không sửa/stage docs/reports hoặc output. Giữ inventory HSK0 4/4 (rich nền 0/4), HSK1–4 213/213 rich; số authored local mới nhất 53 theo checkpoint.
- **Tiếp theo:** chờ người dùng đọc báo cáo và chọn hướng. Commit/push origin được người dùng yêu cầu riêng cho mốc lưu này; không public deploy hoặc tự tiếp tục backlog.

## Thiên Lộ/Xưởng · phát hành HSK2 hướng chuyển động và hẹn giờ · 16/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW, toàn goal còn mở.
- **Người học thấy gì:** travel-leisure-02/05 có 20 trang, 19 ví dụ từ, sáu hoạt động có target. Motion cố định vị trí A ngoài tầng một, rồi chuyển A vào phòng tầng hai ở vận dụng để phân biệt 上来/进来/下去. Meeting phân biệt giờ đề xuất, giờ rảnh và giờ đã chốt; vận dụng đổi giờ, cổng và hoạt động. Sơ đồ comparison/timeline biên tập được; humanReviewed:false. Review 25 ghi rõ hai chỗ mơ hồ góc nhìn đã sửa trước import.
- **Phát hành:** import rehearsal/apply hai draft giữ 37 bảng; release rehearsal/apply hai bài giữ 36 bảng, FK đạt. Backup `.wrangler/demo-backups/before-authored-thien-lo-batch-release-2026-09-16T02-01-49-713Z.sqlite`.
- **Đã kiểm:** hai Vitest nguồn/parity/đáp án/self-review đạt. Xưởng exact document→sơ đồ→phản hồi sai/đúng đạt 20.0s. Learner test ban đầu timeout do account demo chưa đủ prerequisite, snapshot hiện khóa bài đúng. Không nới gate/sửa tài khoản: chuyển riêng lô này sang Playwright guest mới, kiểm khóa trước rồi nạp fixture tiên quyết cục bộ. Browser exact runtime→hai bài→đáp án→reload→model đạt 49.5s. Import trực tiếp fixture builder trong Playwright bị Node JSON import attribute; xuất fixture JSON qua tsx theo pattern timeline hiện có rồi test đạt. Typecheck, ESLint và diff check cuối đạt.
- **Dữ liệu giữ được:** lesson/prerequisite/vocabulary IDs, completion/FSRS/lỗi/phiên/account không reset; fixture chỉ trong browser test cô lập. Nền 217 (4 HSK0 + 213 rich HSK1–4) giữ nguyên. Audit 53 authored, 487 activities, 30 có target/457 thiếu target, còn 164 bài nền chưa phát hành authored. Các số không chứng minh đủ HSK/mastery.
- **Tiếp theo:** travel-leisure-03/04 về lịch trình/cảm nhận và giải trí; tiếp tục media riêng, integration/remediation và phần còn lại v0.2. Campus art còn chung; chưa USER-ACCEPTED/push/public deploy.

## Thiên Lộ/Xưởng · phát hành HSK2 gia đình và hỏi đường · 15/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW, goal toàn kho còn mở.
- **Người học thấy gì:** daily-needs-family-lesson-05 và travel-leisure-lesson-01 có 23 trang, 28 ví dụ từ, sáu hoạt động có target. Gia đình tách sống cùng/sống gần/tần suất/hôm nay; hỏi đường xác nhận đúng giao lộ, hướng và vị trí với sơ đồ thứ tự. Hai nhiệm vụ viết đổi dữ kiện và có rubric riêng; humanReviewed:false. Review năm pass trong 24-REVIEW-HSK2-FAMILY-DIRECTIONS.md.
- **Phát hiện/sửa:** ví dụ 有时 nguồn cũ dùng 有时间 sai mục tiêu; sửa trong manuscript bằng câu có nghĩa đôi khi. Entry từ điển chưa đồng bộ, ghi rõ trong review để xử lý tại điểm tích hợp, không tuyên bố đã sửa toàn hệ thống.
- **Phát hành:** import rehearsal/apply hai draft bảo toàn 37 bảng, release rehearsal/apply hai bài bảo toàn 36 bảng, FK đạt. Backup `.wrangler/demo-backups/before-authored-thien-lo-batch-release-2026-09-15T15-58-33-511Z.sqlite`.
- **Đã kiểm:** hai Vitest nguồn/parity/đáp án đạt; browser Xưởng exact document→sơ đồ→phản hồi sai/đúng đạt 15.5s; learner exact runtime→mở cả hai bài→trả lời→reload giữ lựa chọn→mở model vận dụng đạt 32.4s. Typecheck, ESLint, diff check đạt. Web local cổng 3000 đang chạy.
- **Dữ liệu giữ được:** IDs/prerequisites/vocabulary và tiến độ/FSRS/lỗi/phiên không reset. Inventory nền 217 (4 HSK0 + 213 rich HSK1–4) giữ; audit hiện 51 authored, 481 activities, 24 có target/457 thiếu target, 166 bài nền chưa phát hành authored. Không suy đủ HSK/mastery từ số lượng.
- **Tiếp theo:** bốn bài travel-leisure-02…05 đã xác định nguồn và mục tiêu: hướng chuyển động, kế hoạch chuyến đi, giải trí, hẹn giờ. Media riêng và remediation toàn kho còn thiếu; campus art chưa thay. Không USER-ACCEPTED/push/public deploy.

## Thiên Lộ/Xưởng · phát hành HSK2 báo bệnh · 15/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal toàn kho còn mở.
- **Người học thấy gì:** bài hsk2-daily-needs-family-lesson-04 có hội thoại tám lượt, sơ đồ triệu chứng/mốc bắt đầu/phỏng đoán, 12 ví dụ từ, ba hoạt động có target và vận dụng đau tay với thời điểm mới. Giữ `humanReviewed:false`; review năm pass ở 23-REVIEW-HSK2-HEALTH.md. Không coi tự viết/giọng tổng hợp là evidence nói độc lập.
- **Xưởng/phát hành:** import rehearsal/apply một draft bảo toàn 37 bảng; release rehearsal/apply một bài bảo toàn 36 bảng, FK đạt. Backup `.wrangler/demo-backups/before-authored-thien-lo-batch-release-2026-09-15T15-48-40-903Z.sqlite`. Không đổi IDs/prerequisites hoặc reset learner data.
- **Đã kiểm:** hai Vitest nguồn/parity/đáp án đạt. Browser Xưởng exact document→sơ đồ→sai/đúng phản hồi đạt 16.0s; learner runtime exact document→trả lời→reload giữ đáp án→mẫu vận dụng mới đạt 19.3s. Typecheck, ESLint và diff check sau thay đổi E2E đạt.
- **Inventory:** audit D1 hiện 49 bài authored, 475 activities, 18 có target/457 thiếu target. Còn 168 bài nền chưa phát hành authored; nền HSK0 4 và HSK1–4 213 rich giữ nguyên, không suy ra đủ HSK từ số lượng.
- **Tiếp theo:** nội dung HSK2 còn lại và media/editor/remediation toàn v0.2; ảnh campus vẫn là ảnh chung nên chưa đóng yêu cầu ảnh riêng. Không USER-ACCEPTED/push/public deploy.

## Thiên Lộ · xác minh ảnh phủ khung và bỏ dải cuối · 15/09/2026

- **Module:** Thiên Lộ — IN-REVIEW.
- **Người học thấy gì:** xác minh lại thay đổi đã có trong reader dùng chung: ảnh tình huống phủ kín khung, bỏ caption dưới ảnh và dòng synthetic audio ở đáy; nhãn giọng tổng hợp nằm tại nút nghe, khoảng đệm đã thu gọn. Không tạo thêm thay đổi nội dung ngoài yêu cầu bố cục hiện tại.
- **Đã kiểm:** Playwright `dialogue fills the artwork frame` đạt 24.1s trên 1235×640, 375×812, 812×375; kiểm exact runtime document, ảnh phủ khung, nút nghe/lời thoại/footer trong viewport, chuyển mục và reload giữ đáp án. Đã xem screenshot desktop/mobile trong tmp. Typecheck và diff check các file reader/theory đạt; web local cổng 3000 đang chạy.
- **Dữ liệu giữ được:** không migration/reset hoặc thay lesson IDs; inventory nền 217 bài (HSK0 4, HSK1–4 213 rich) giữ nguyên. Không coi kiểm tra bố cục là hoàn tất nội dung toàn kho.
- **Tiếp theo:** chờ người dùng test bố cục trên web local; chưa USER-ACCEPTED. Goal cải tiến toàn kho còn mở.

## Thiên Lộ/Xưởng · phát hành lô HSK2 ăn uống và mua sắm · 15/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW, toàn goal chưa hoàn tất.
- **Người học thấy gì:** hai bài daily-needs-family-lesson-02/03 đã dùng 20 trang authored. Review 22 ghi năm pass; sửa mẫu vận dụng ăn uống từ sáu lượt thiếu câu hỏi đồ uống thành tám lượt hỏi/chọn món, hỏi/chọn trà, chốt giờ/nơi. HumanReviewed:false. Các đáp án, ID/source/prerequisite giữ nguyên.
- **Phát hành:** draft reconcile exact baseline rehearsal/apply thay đúng 1 draft, giữ 42 bảng. Batch release rehearsal/apply 2 bài đạt, giữ 36 bảng, FK đạt; backup .wrangler/demo-backups/before-authored-thien-lo-batch-release-2026-09-15T15-31-17-536Z.sqlite.
- **Đã kiểm:** 2 Vitest nội dung đạt lại, typecheck/ESLint/diff check đạt. Browser API exact document→mở từng bài→chọn đáp án→feedback→reload giữ đáp án→tự viết/mở model mới đạt 32.7s. Test đầu bị connection refused trước onboarding vì dev handle 93767 đã mất và không còn node web/cổng 3000; khởi động npx vinext dev mới session 34813, không migration/reset, chờ cổng sẵn sàng rồi test đạt.
- **Inventory:** audit release heads 48 bài authored, 472 activities, 15 target/457 chưa target; còn 169 bài nền chưa phát hành authored. Không coi số bài là mastery/đủ HSK. Giữ tổng 217 nền và dữ liệu learner/FSRS/lỗi/phiên.
- **Giới hạn/tiếp theo:** ảnh riêng nhà hàng/sản phẩm, native media, remediation và phần còn lại toàn v0.2 chưa hoàn tất. Tiếp tục HSK2 bài báo bệnh/hỏi thăm; không USER-ACCEPTED/push/public deploy.

## Thiên Lộ/Xưởng · hai draft HSK2 ăn uống và mua sắm · 15/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; toàn goal còn mở.
- **Nội dung:** daily-needs-family-lesson-02/03 có 20 trang, 19 ví dụ từ, 6 activity có target nguồn. Bài ăn uống tách 经常/过/hôm nay bằng sơ đồ và chốt bữa tối; bài mua sắm so hai chiếc quần theo giá lẫn độ dài, rồi chuyển sang chọn túi tặng bạn. Hội thoại sáu lượt riêng, guided cloze và rubric tự viết, giữ ID/prerequisite/vocabulary/grammar/task/topic. Các target mô tả supported practice, không mastery.
- **Xưởng:** thêm batch hsk2FoodShopping, import rehearsal rollback rồi apply 2 drafts đạt, bảo toàn 37 bảng. Builder nhận optional level mặc định hsk1 để HSK2 không bị gắn nhầm cấp; đầu ra HSK1 hiện có không regenerate. Dùng art campus chung và sơ đồ nguyên bản, chưa ảnh riêng nhà hàng/quần/túi. HumanReviewed:false, chưa phát hành.
- **Đã kiểm:** 6 Vitest food-shopping/journey/everyday đạt, schema/source/answer/rubric và links. Typecheck/ESLint/diff check đạt. Browser Xưởng tìm từng bài, exact document, sơ đồ 3 lớp thông tin/2 sản phẩm, choice sai→đúng phản hồi riêng đạt 1.0m; cổng 3000 còn chạy.
- **Dữ liệu giữ được:** không reset hoặc đổi release heads, không thay tiến độ/FSRS/lỗi/phiên. Kho authored đã phát hành vẫn 46 bài; hai draft chưa tính hoàn tất.
- **Tiếp theo:** review năm pass cho batch, rà model vận dụng và Pinyin rồi release local; tiếp tục 169 bài còn lại ngoài hai draft này và các media/integrations v0.2. Chưa USER-ACCEPTED/push/public deploy.

## Thiên Lộ/Xưởng · phát hành HSK2 nhờ giúp và xác nhận · 15/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal toàn bộ chưa hoàn tất.
- **Người học thấy gì:** hsk2-daily-needs-family-lesson-01 dùng 11 trang authored đã có trong Xưởng: hội thoại bảy lượt, sơ đồ lượt lời, 帮/帮忙, 还是, xác nhận cửa và vận dụng nhờ gọi điện. Bản review 21 ghi năm pass Mandarin/Pinyin/Việt/sư phạm/coverage; humanReviewed:false.
- **Phát hành:** script single-lesson được đăng ký manuscript này, review hash khớp; rehearsal rollback rồi apply qua workflow/worker đạt, 36 bảng bảo toàn, FK đạt. Backup .wrangler/demo-backups/before-authored-thien-lo-release-2026-09-15T10-04-28-475Z.sqlite. Không reset dữ liệu hoặc đổi IDs/prerequisites/source links.
- **Đã kiểm:** API learning projection bằng đúng document 11 trang; browser demo dialogue ở 1235×640, 375×812, 812×375 ảnh phủ khung/nút nghe/footer hiện, mở lời thoại/chuyển mục, chọn xác nhận đúng rồi reload giữ lựa chọn: đạt 52.6s. Đã xem screenshot desktop. Typecheck, ESLint và diff check đạt. 2 Vitest nội dung và Xưởng preview đã đạt lượt trước.
- **Inventory thật:** 46 bài authored đã phát hành, 466 activity, 9 có target và 457 thiếu target. Còn 171 bài nền chưa phát hành authored; không coi những con số này là mastery/HSK coverage. Tổng 217 baseline vẫn giữ.
- **Giới hạn/tiếp theo:** artwork campus còn chung, chưa tranh riêng cửa/điện thoại; task không có native audio hoặc đo nói độc lập. Tiếp tục HSK2 và mục tiêu/remediation/media toàn scope v0.2; chưa USER-ACCEPTED/push/public deploy.

## Thiên Lộ/Xưởng · bản nháp HSK2 nhờ giúp và xác nhận · 15/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; toàn scope v0.2 còn mở.
- **Nội dung mới:** hsk2-daily-needs-family-lesson-01, 11 trang biên soạn riêng: tình huống hai cánh cửa, hội thoại 7 lượt, sơ đồ mục đích từng lượt, phân biệt 帮/帮忙, xếp câu nhờ giúp, hỏi lựa chọn 还是, xác nhận đúng cửa, đề nghị/từ chối giúp và 希望. 14 từ có ví dụ Hanzi/Pinyin/Việt riêng, không dùng từ đứng một mình làm ví dụ. Nhiệm vụ chuyển sang nhờ gọi điện cho giáo viên có hỏi lại giáo viên/bạn học và rubric 4 tiêu chí. 5 activity có learningTarget/source thuộc bài ngay trong draft.
- **Xưởng:** import rehearsal rollback rồi apply đạt, 37 bảng giữ fingerprint; manuscript thien-lo-hsk2-polite-request-v2.json dùng schema chung, không sửa bài phát hành hiện tại. HumanReviewed:false, chưa review đầy đủ để release. Dùng art campus sẵn có và sơ đồ nguyên bản; chưa có ảnh riêng hai cửa/điện thoại.
- **Đã kiểm:** 2 Vitest bảo toàn vocabulary/prerequisite/source, schema, câu xác nhận sai/đúng, thứ tự nhờ giúp, rubric không auto-grade đạt. Browser Xưởng tìm bài→preview đúng document→chọn 可以 sai→sửa đúng→tự viết→mở 4 tiêu chí đạt 12.7s; đã xem tmp/hsk2-polite-request-studio.png. Typecheck/ESLint đạt.
- **Dữ liệu giữ được:** lesson/source IDs, prerequisites, 14 vocabulary, task/topic/grammar links giữ nguyên; không reset learner/FSRS/lỗi/phiên hoặc release. Kho phát hành authored vẫn 45, bài này mới ở draft nên chưa giảm số 172 bài chưa phát hành authored.
- **Tiếp theo:** rà 5 pass Mandarin/Pinyin/Việt/sư phạm/coverage và phát hành local bài này cùng phần nội dung HSK2 tiếp theo; các media riêng và tích hợp toàn v0.2 còn mở. Không USER-ACCEPTED/push/public deploy.

## Thiên Lộ · thử lại conflict cũ một lần sau hỗ trợ history · 15/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW, toàn goal còn mở.
- **Người học thấy gì:** khi pump hoạt động lại, generic PAGE_ATTEMPT_CONFLICT được thử lại một lần bằng nguyên command/key/đáp án đầu. Ghi releasedHistoryRetry trước gửi trong transaction owner/reset, nên reload hoặc nhiều tab không khởi tạo vòng retry vô hạn. Nếu vẫn conflict thì giữ lại. Các lỗi owner/reset/invalid và ack không bị đổi.
- **Đã kiểm:** 12 Vitest outbox đạt (concurrent recovery, reopen, gửi cùng command, repeated conflict chỉ thử một lần, ack thắng, owner isolation); typecheck/ESLint/diff check đạt. Browser 409 generic giả lập lần đầu → giữ firstAttempt dù sửa đúng → reload → request body y nguyên → route.fetch tới server thật và acknowledged, analytics một câu cần sửa/mastery không tăng: đạt 33.7s. Đây là kiểm recovery lỗi cũ, không giả lập rằng browser đã đi qua thời điểm release thật.
- **Dữ liệu giữ được:** schema IndexedDB/command v1 giữ nguyên, thêm optional marker nội bộ outbox; không migration hoặc rewrite đáp án. Test dùng account riêng, không reset demo hoặc sửa FSRS/lỗi.
- **Giới hạn/tiếp theo:** generic conflict cũ không phân biệt version với lỗi tài khoản trong repository; retry một lần vẫn qua đầy đủ server checks. Conflict còn lại được giữ nhưng chưa có UI tự phục hồi chi tiết. Tiếp tục nội dung/media/editor và remediation trong scope 217 bài + bổ sung; 172 bài nền chưa authored, chưa USER-ACCEPTED/push/public deploy.

## Thiên Lộ/Xưởng · phát hành local mục tiêu boot-1 · 15/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; toàn goal chưa hoàn tất.
- **Đã làm:** release-boot-activity-targets.mjs kiểm hash plan/parent/draft/review, latest/head, không có outbox pending; rehearsal rollback rồi backup/apply qua repository workflow và worker. Revision 23f0dd27-dd36-4426-82ec-a4acb2e5b1c6 đang phát hành, humanReviewed:false. Backup .wrangler/demo-backups/before-boot-target-release-2026-09-15T09-42-42-674Z.sqlite.
- **Đã kiểm:** 36 bảng ngoài content/audit giữ fingerprint, các head khác và parent package nguyên vẹn, FK đạt; runtime registry đủ đúng 4 mục tiêu. Audit thật: 45 authored page lessons / 461 activities / 4 targeted / 457 missing. D1 historical rehearsal sau release ghi đúng parent revision, correct/duplicate/masteryEligible:false rồi rollback 0 lượt lưu. Browser demo mở đủ 12 trang đạt 14.5s; account first-answer→correct→reload→ack trên head mới đạt 31.6s. ESLint scripts và diff check đạt.
- **Sự cố kiểm thử:** browser đăng ký account chạy cùng historical transaction gặp D1 internal 503, chưa vào bài. Sau transaction kết thúc, demo và account chạy tuần tự đều đạt; không reset/migration hoặc thay dữ liệu để né lỗi. Không chạy browser ghi dữ liệu đồng thời với rehearsal khóa D1 nữa.
- **Dữ liệu giữ được:** parent 955d0aac-39d1-4d51-914c-680f058fcfe8 còn trong immutable history; không đổi lesson/page/block IDs, đáp án, tiến độ/FSRS/lỗi/phiên. Không tăng số bài authored vì đây là metadata revision của boot-1.
- **Tiếp theo:** conflict recovery và remediation/nguồn hoạt động, đồng thời nội dung/media/editor 172 bài nền chưa authored trong v0.2 còn mở. Browser offline giữ queue qua đúng thời điểm release chưa kiểm (D1 historical và browser head mới đã kiểm riêng). Không USER-ACCEPTED/push/public deploy.

## Thiên Lộ · nhận firstAttempt từ revision phát hành cũ · 15/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; toàn scope v0.2 còn mở.
- **Đã làm:** khi activityVersion không khớp head hiện tại, repository tìm đúng version trong immutable content_release_packages của cùng lesson. Dùng releasedRuntimeRevisions kiểm digest, kiểm lại itemType/targetLessonId. Không đọc draft để chấm, không đổi command v1/idempotency key/response hoặc hàng đợi đã lưu. Hoạt động đã bỏ khỏi bản mới vẫn đối chiếu được với bản đã phát hành cũ. Duplicate đã ghi vẫn ack trước khi tải history.
- **Đã kiểm:** 23 Vitest repository/Studio đạt. SQLite in-memory phát hành hai revision thật qua workflow/worker, thay đáp án bản mới, gửi command bản cũ và ghi correct với revision cũ; draft không lọt history, lesson khác không trả kết quả. Trigger chặn sửa package và digest fence chặn corruption injection trong DB kiểm thử. Mock tests kiểm reset race khi tải history, version giả, hoạt động bị bỏ, duplicate/history offline. Typecheck/ESLint/diff check đạt. Browser account làm sai→sửa→reload→server ack đạt 33.7s; browser này kiểm head hiện tại, chưa phải browser offline qua release thật.
- **Dữ liệu giữ được:** không migration/reset/release local trong lượt này; SQLite corruption chỉ ở :memory:. Account kiểm thử riêng ghi thao tác UI thật. Inventory/ID/FSRS/lỗi/phiên giữ nguyên. Bản mục tiêu boot-1 vẫn draft.
- **Giới hạn:** đây vẫn là journal supported practice, masteryEligible:false; chưa có server session/exposure authority. Conflict đã lưu trước đây không tự được retry bởi pump; chưa có recovery UI. History lookup đọc các package cùng lesson khi lệch version, chưa index activity riêng.
- **Tiếp theo:** release bản mục tiêu đã review bằng backup/rehearsal và kiểm offline/browser qua revision thực, hoàn thiện conflict recovery và remediation. 172 bài nền chưa authored cùng media/editor/full v0.2 vẫn mở; không USER-ACCEPTED/push/public deploy.

## Xưởng · khôi phục tìm kiếm danh sách bài · 15/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; toàn goal vẫn mở.
- **Người biên tập thấy gì:** /studio?q=thien-lo-v2-boot-1 mở được danh sách, tải lại và chọn đúng bản nháp bên cạnh bản đã phát hành. Chuyển import inventory sang trong hàm server sau authorization, hskMockExamEditorialSuggestions chỉ tải khi soạn exam_form; vẫn tính inventory từ nguồn gốc, không hardcode số liệu hay bỏ khu vực soạn.
- **Evidence:** trước sửa log tạm xác nhận query trả đúng 2 revisions/assignments rồi HTML runner lỗi Network connection lost; import inventory bằng Node đọc đúng 217 bài. Sau thay import, route trả 200, browser search→reload→draft đạt 33.7s; kiểm đủ bốn mục tiêu/choice feedback/rubric trong preview đạt 11.9s, tổng 2/2. Typecheck, targeted ESLint và diff check đạt. Đã bỏ mọi log chẩn đoán tạm. Chưa chứng minh chi tiết lỗi nội bộ runner, chưa kiểm toàn bộ create types trong lượt này.
- **Dữ liệu giữ được:** chỉ đổi cách tải module và thêm regression journey; không thay D1/schema/release head hoặc learner data. Bản nháp mục tiêu chưa phát hành, history giữ nguyên.
- **Tiếp theo:** hỗ trợ đồng bộ firstAttempt theo immutable released revision trước release mục tiêu. Nội dung/media/editor 172 bài nền chưa authored và các tích hợp v0.2 còn mở, chưa USER-ACCEPTED/push/public deploy. Dev session 93767 tiếp tục phục vụ localhost:3000.

## Thiên Lộ/Xưởng · review mục tiêu boot-1 và kiểm preview · 15/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; toàn goal chưa hoàn tất.
- **Đã làm:** review riêng bốn mục tiêu trong tài liệu 20, giữ humanReviewed:false. Script review-boot-activity-targets.mjs mở D1 read-only, kiểm parent đúng manuscript/review cũ, draft chỉ thêm mapping và reset metadata; validator nội dung đề xuất đạt. Artifact mới giữ hash parent/draft/plan, không ghi đè review cũ và không update/publish draft.
- **Đã kiểm:** browser mở trực tiếp draft 23f0dd27-dd36-4426-82ec-a4acb2e5b1c6, đối chiếu đủ 12 trang nguyên bản sau bỏ learningTarget; bốn form skill/objective/source đúng; ba choice sai→đúng giữ feedback, rubric tự đọc vẫn tự kiểm: đạt 20.1s, đã xem tmp/boot-target-studio-preview.png. 2 Vitest mapping, typecheck, ESLint đạt.
- **Lỗi runtime còn mở:** /studio?q=thien-lo-v2-boot-1 trả 500 Network connection lost từ vinext runner, lặp lại sau restart. Không coi restart là sửa xong. Direct /studio/items/<revision> đạt nên lỗi danh sách cần audit riêng trong scope Xưởng. Dev mới session 93767 đang chạy localhost:3000; lần test trước cổng sẵn sàng bị ECONNREFUSED, sau sẵn sàng direct test đạt.
- **Dữ liệu giữ được:** không migration/reset/release; review script chỉ đọc D1, browser preview không bấm lưu. Inventory nền/ID/tiến độ/FSRS/phiên giữ nguyên.
- **Tiếp theo:** sửa lỗi danh sách Xưởng và nhận firstAttempt của revision đã phát hành cũ trước khi cập nhật head. Command hiện không mang revisionId dù snapshot binding có; queued version cũ mới gửi sẽ conflict, không bị xóa. 172 bài nền chưa authored và media/integrations/full v0.2 còn mở; không USER-ACCEPTED/push/public deploy.

## Thiên Lộ · kiểm lại ảnh phủ khung và tận dụng chiều cao mobile · 15/09/2026

- **Module:** Thiên Lộ — IN-REVIEW; toàn goal v0.2 còn mở.
- **Người học thấy gì:** xác nhận scene phủ kín khung, bỏ caption cảnh và đoạn TTS dưới cùng đã có trên runtime. Tăng hàng ảnh mobile từ 80px cố định sang phần chiều cao khả dụng (36%, tối thiểu 80px), giảm việc cắt nhân vật thành dải ngang và dùng khoảng trống cho minh họa. Nhãn giọng tổng hợp vẫn ngay nút nghe; thanh chuyển trang luôn trong viewport.
- **Đã kiểm:** Playwright dialogue frame/listening/navigation tại 1235×640, 375×812, 812×375; chuyển mục reset cuộn và khôi phục mục/câu trả lời sau reload: 2/2 đạt. Đã xem screenshot desktop/mobile sau chạy; typecheck và diff check CSS đạt. Runtime local cổng 3000 đang chạy. Đây là kiểm slice bố cục, không phải nghiệm thu hình ảnh toàn kho.
- **Dữ liệu giữ được:** chỉ đổi CSS; không migration, đổi ID hay reset tiến độ/FSRS/lỗi/phiên. Inventory nền 217 bài giữ nguyên.
- **Tiếp theo:** tiếp tục draft mục tiêu boot-1 cùng nội dung/media/editor và tích hợp còn thiếu của v0.2. Chưa USER-ACCEPTED, không push/public deploy.

## Thiên Lộ/Xưởng · audit mục tiêu và draft boot-1 · 15/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal toàn kho vẫn chưa hoàn tất.
- **Phát hiện:** audit release heads D1 thật: 45 authored lessons, 461 activity blocks, 0 learningTarget đã phát hành. Báo cáo 19-AUDIT-MUC-TIEU-HOAT-DONG.md và page-activity-target-audit.json giữ revision/page/block/prompt cùng nguồn thuộc bài. Không suy số activity thành mastery/coverage. Đây là lý do chưa đủ cơ sở gán journal vào skill/remediation.
- **Đã làm:** soạn mapping riêng bốn hoạt động boot-1 với nguồn mandarin-tone-system: nhận diện hướng thanh qua chữ/Pinyin và rubric tự đọc; không gọi đó là nghe hoặc chấm phát âm. applyEditorialActivityTargets yêu cầu đủ đúng block IDs, nguồn thuộc bài, không ghi đè mục tiêu editor hiện có. Clone document, không đổi câu hỏi/đáp án/feedback.
- **Xưởng local:** rehearsal rollback rồi backup/apply tạo draft revision 23f0dd27-dd36-4426-82ec-a4acb2e5b1c6 từ published boot-1. 36 bảng ngoài content/audit giữ fingerprint, release heads và source revision nguyên vẹn, FK đạt. Backup .wrangler/demo-backups/before-boot-activity-target-draft-2026-09-14T17-57-26-605Z.sqlite. Draft bỏ localReview cũ và reset các cờ AI review, humanReviewed:false; chưa validate/publish hoặc browser preview mới.
- **Đã kiểm:** 2 Vitest mapping/parity/conflict/nguồn đạt, typecheck/ESLint đạt; audit và draft scripts đọc/ghi local đúng scope. Không sửa các manuscript/review đã phát hành để tránh làm stale nguồn cũ.
- **Tiếp theo:** kiểm form/preview draft, review rồi phát hành revision mục tiêu; bổ sung các hoạt động còn lại theo nội dung thật và nối remediation. Nội dung/media/editor 217 bài + bổ sung v0.2 vẫn mở, không push/public deploy/USER-ACCEPTED.

## Thiên Lộ → Thiên Cơ Kính · thống kê hoạt động trang cho khách · 15/09/2026

- **Module:** Thiên Lộ/Xưởng, điểm tích hợp thống kê — IN-REVIEW, goal toàn scope chưa hoàn tất.
- **Người học thấy gì:** guest đọc snapshot lĩnh hội từ IndexedDB theo active owner/generation/reset, thống kê firstAttempt với đáp án trong document đã pin, không cần binding server. Câu đã sửa không thay outcome lượt đầu; bản snapshot/archived trùng không tăng lượt. Lịch dùng thời gian trên thiết bị và ghi rõ khác ngày đồng bộ của account. Không gán skill/mastery. Hook refresh sau lưu bài, focus và thay evidence; account vẫn dùng server summary.
- **Đã kiểm:** 22 Vitest local page practice/queue/owner cache đạt, typecheck/ESLint/diff check đạt. Bao gồm duplicate snapshot, first wrong dù draft corrected, lượt mới khác ngày nhưng unique giữ một, phiên bản snapshot không đọc được, listing không lẫn owner/reset. Fixture ban đầu thiếu body/explanation nên parser từ chối, đã sửa fixture theo schema và chạy lại. Browser guest sai→đúng→reload→/analytics hiện một lượt cần sửa và nhãn thời gian thiết bị, không account outbox, đạt 12.7s.
- **Dữ liệu giữ được:** không migration/database mutation/server upload cho guest. Snapshot/schema/ID giữ nguyên, list dùng index ownerEpoch sẵn có và transaction kiểm scope. Bản tương lai/hỏng không bị ghi đè; chưa đọc được thì không đưa vào tổng.
- **Giới hạn/tiếp theo:** nguồn guest là bản lưu thiết bị, chưa chứng minh evidence độc lập. Nghịch Cảnh Lục/ôn chưa nhận hoạt động trang mới; cần nối đúng revision/target. Nội dung/media/editor còn lại của 217 bài + bổ sung v0.2 giữ nguyên scope, chưa hoàn tất/USER-ACCEPTED; không push/public deploy.

## Thiên Lộ → Thiên Cơ Kính · nhật ký luyện trang · 15/09/2026

- **Module:** Thiên Lộ/Xưởng, điểm tích hợp thống kê — IN-REVIEW; goal toàn bộ chưa hoàn tất.
- **Người học thấy gì:** analytics đọc lesson_page_attempts theo owner/reset, thêm lượt vào lịch hoạt động và báo riêng hoạt động khác nhau/đúng/cần sửa/tự đối chiếu. Ngày dùng created_at server và ghi rõ ngày đồng bộ. Không cộng các lượt này vào skills hay mastery khi chưa có evidence theo mục tiêu; device-practice merge giữ nguyên pagePractice. Pump gửi xong đánh thức analytics refresh.
- **Đã kiểm:** 7 Vitest repository/parser đạt, typecheck và targeted ESLint đạt; kiểm owner/reset, unique hoạt động, ba outcome, ngày Việt Nam, tổng không hợp lệ và tương thích response cũ. Browser account mới làm sai→sửa→reload→server ack→/analytics đạt 35.2s (trước ngắt từng đạt 23.6s), pagePractice 1 lượt cần sửa, mọi skill attempts vẫn 0; đã xem ảnh tmp/thien-lo-page-practice-analytics.png. Không suy từ assertion API sang chưa xem UI.
- **Runtime:** lần tiếp tục sau ngắt xác nhận không còn dev/test node cũ; chạy npx vinext dev session 7120, PID 3904 lên localhost:3000. Không migration/reset. Các thay đổi trước ngắt đã có trên disk, kiểm lại thay vì viết trùng.
- **Dữ liệu giữ được:** chỉ thêm read consumer thống kê; không thay ID/completion/FSRS/mistake/XP. Test account riêng ghi thao tác thật vào journal; guest hiện chưa có pagePractice summary từ snapshot local. Sai ở hoạt động trang chưa vào Nghịch Cảnh Lục.
- **Tiếp theo:** nối lỗi/ôn bằng đúng revision/target/evidence và hoàn thiện guest parity; tiếp tục nội dung/media/editor còn thiếu trong toàn scope 217 bài + bổ sung v0.2. Chưa USER-ACCEPTED, không push/public deploy.

## Thiên Lộ · tiếp tục gửi queue khi rời bài · 14/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW, goal toàn bộ chưa hoàn tất.
- **Người học thấy gì:** chuyển pump từ ResumableLessonReader sang AppShell; chỉ bật khi session authenticated và ownerKey khớp accountKey. Chuyển module vẫn gửi pending, mở lại app khôi phục queue; online/focus/tab visible đánh thức nhưng vẫn tôn trọng retryAt. Owner generation đang chuyển sẽ kiểm lại sau 3 giây, không gửi trước khi scope hợp lệ; cleanup abort/timer/listeners khi owner thay đổi.
- **Đã kiểm:** browser guest không tạo account queue đạt (19.5s). Browser account mới mất phản hồi đầu sau server commit, reload rồi rời bài sang /path khi pending; tại Thiên Lộ nhận acknowledged, cùng key/attemptId và duplicate true đạt (50s). Hai hành trình 2/2. 22 Vitest queue/delivery/owner-cache, typecheck/ESLint/diff check đạt. Cổng 3000 đang lắng nghe.
- **Dữ liệu giữ được:** không đổi schema/database hoặc scoring; test account riêng tạo câu trả lời qua UI, không sửa/reset demo hay progress người dùng. Chỉ chuyển vị trí lifecycle, snapshot/command/key/owner/reset vẫn giữ contract cũ.
- **Giới hạn/tiếp theo:** pump hoạt động trong learner AppShell, chưa service worker background khi đóng web. Server session/prerequisite/exposure và consumer ôn/lỗi/thống kê chưa đủ; 172 bài nền cùng media/editor còn trong scope. Tiếp tục liên thông đúng bằng chứng và nội dung v0.2, không push/public deploy/USER-ACCEPTED.

## Thiên Lộ · bật gửi queue từ reader và kiểm mạng thật · 14/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW, mục tiêu toàn bộ chưa hoàn tất.
- **Người học thấy gì:** sau lưu snapshot/enqueue, reader tự gửi queue account; mở lại đọc pending, online đánh thức, batch/backoff dùng retryAt bền vững. Lifecycle abort khi unmount/đổi owner; queue và bản nháp không phụ thuộc mạng thành công. Guest không gửi. Event chỉ phát sau enqueue durable.
- **Đã kiểm:** 19 Vitest queue/delivery/repository đạt, typecheck/ESLint đạt. Browser tài khoản mới trả lời sai→sửa đúng→reload nhận acknowledged từ API/D1 thật đạt (21.3s). Browser mất phản hồi dùng route.fetch tới server thật rồi abort phản hồi đầu, chờ retry: cùng key/cùng attemptId, duplicate true, queue acknowledged, masteryEligible false đạt (45.8s). Hai hành trình 2/2; không dùng response mock để chứng minh ghi server.
- **Dữ liệu giữ được:** test tạo account kiểm thử riêng và làm hoạt động qua UI, không đổi/reset demo hoặc cấy mastery/FSRS. Migration 0025 đã có từ lượt trước, không migration thêm. Các kết quả test ghi vào journal riêng; điểm Thử Luyện/hoàn thành/lịch ôn không thay đổi bởi journal.
- **Giới hạn:** lifecycle hiện gắn reader, rời bài dừng gửi tới khi mở reader lại; chưa pump toàn app, chưa server reading-session/prerequisite/exposure authority và chưa consumer ôn/lỗi/thống kê. Lượt này chỉ thu thập firstAttempt có binding, không phải toàn bộ lịch sử từng lần sửa. Nội dung authored/media/editor toàn scope vẫn chưa đủ.
- **Tiếp theo:** cải thiện đồng bộ ngoài reader và nối consumer có phân loại evidence đúng, hoàn thiện nội dung/media 172 bài nền còn lại cùng các yêu cầu v0.2. Không push/public deploy, không USER-ACCEPTED.

## Thiên Lộ · migration journal local và rehearsal repository thật · 14/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW, toàn scope chưa hoàn tất.
- **Đã làm:** script migrate-page-attempts.mjs chỉ áp dụng 0025 khi có migration 0024, kiểm fingerprint dữ liệu và SQL schema 45 bảng hiện có trong BEGIN IMMEDIATE, FK và bảng mới rỗng. Rehearse rollback đạt rồi backup/apply đạt; ghi d1_migrations cùng transaction để npm run dev không áp dụng lại.
- **Backup:** .wrangler/demo-backups/before-page-attempt-migration-2026-09-14T14-59-09-573Z.sqlite. Không xóa/ghi đè backup hay .wrangler.
- **Đã kiểm:** rehearsal repository bằng adapter trên D1 local thật lấy published boot-1 choice, chấm câu có trợ giúp, match receipt/key/reset/version, duplicate chỉ một row và masteryEligible false. Rollback toàn bộ attempt thử; trước/sau count giữ nguyên, không seed kết quả. Targeted ESLint hai scripts đạt. Lượt này không đổi TS/runtime UI.
- **Dữ liệu giữ được:** apply chỉ thêm bảng/index journal và record migration; 45 bảng cũ không đổi dữ liệu/schema trước khi ghi migration ledger. Browser progress/FSRS/session/account không reset. Chưa gọi POST từ UI, chưa browser E2E gửi/nhận receipt D1 qua mạng thật.
- **Tiếp theo:** bật lifecycle flush có backoff/online/owner cho queue đã durable, test browser request thật và mất kết nối, nối consumer; nội dung/media/editor v0.2 còn mở. Không push/public deploy hoặc USER-ACCEPTED.

## Thiên Lộ · gửi hàng đợi theo nhóm và giữ thời điểm retry · 14/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW, goal toàn scope chưa hoàn tất.
- **Đã làm:** flushPageAttempts đọc queue bền vững, kiểm lại active owner/generation/reset trước từng request, gửi tối đa 10 mặc định/20 trần. Pending lưu retryAt, tôn trọng cooldown toàn queue kể cả command mới; conflict/ack không bị gửi lại. Dừng sau lỗi pending hoặc owner-changed, hỗ trợ AbortSignal. Ack vẫn phải qua giao dịch owner/reset sau phản hồi. Chưa gọi flush tự động từ UI.
- **Đã kiểm:** 22 Vitest queue/delivery/owner cache đạt; typecheck/targeted ESLint đạt. Throttle 429→đóng/mở DB→không gửi trước hạn→gửi đúng hạn và không gửi lại ack; đổi tài khoản trong request chặn ack và request kế tiếp; bounded batch/abort/conflict giữ record. Dữ liệu queue v1 cũ không retryAt vẫn đọc được.
- **Dữ liệu giữ được:** tests fake-indexeddb và fetch mock, không gửi đáp án thật hoặc apply D1 migration 0025. Reader hiện enqueue local; phần pump lifecycle tự động, ghi D1 thật, server reading session/consumer vẫn chưa hoàn tất. Không gọi test transport là bằng chứng đủ mastery hay liên thông toàn module.
- **Tiếp theo:** backup/rehearsal D1 và lifecycle gửi khi online/khôi phục account với browser test, nối consumer; phạm vi nội dung/media/editor 217 bài và phần bổ sung v0.2 vẫn giữ nguyên. Không push/public deploy.

## Thiên Lộ · tách tải nội dung mới khỏi fallback cũ · 14/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW, toàn scope chưa hoàn tất.
- **Người học thấy gì:** LessonTheoryPanel hiển thị trạng thái đang tải khi published runtime còn loading, thay vì dựng ngay lý thuyết legacy. Chỉ dùng fallback sau khi tải thất bại; nút Thử tải lại giữ khả năng chuyển sang bản mới. Không đổi bản đã pin hay dữ liệu học.
- **Đã kiểm:** Playwright chặn phản hồi learning projection bằng gate rồi mở lại: loading không có legacy, sau release mở authored đạt. Mock 503 rồi retry thật mở authored đạt, tổng 2/2 (20.3s). Typecheck/ESLint/diff check đạt. Tài khoản demo: API và browser đều có 12 trang boot-1; kiểm cuối lặp 3/3 đạt (40.9s), không reset demo. Test vào thẳng demo khi chưa hoàn tất onboarding từng vào landing; đã sửa setup theo hành trình onboarding trước đăng nhập.
- **Giới hạn điều tra:** trước khi bổ sung kiểm response browser, demo còn một lần hiện legacy và timeout sau thay đổi loading. Chưa có evidence đủ quy nguyên nhân lần đó; ba lần pass sau không chứng minh lỗi chập chờn được chữa hoàn toàn. Giữ test theo dõi actual projection và UI, không tuyên bố mọi tài khoản đã hết lỗi.
- **Dữ liệu giữ được:** chỉ sửa trạng thái tải UI và thêm E2E, không apply D1 migration/push/deploy, không reset account/FSRS/phiên. Queue vẫn local, chưa bật pump gửi server. Nội dung authored local vẫn 45, còn nội dung/media/editor/consumer trong đề án v0.2.
- **Tiếp theo:** hoàn thiện delivery scheduling và kiểm ghi D1 an toàn, tiếp tục nội dung/media toàn scope; lỗi demo tái diễn cần thu response/state ở thời điểm lỗi.

## Thiên Lộ · nối câu trả lời trong reader vào hàng đợi local · 14/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW, goal còn hoạt động.
- **Người học thấy gì:** reader lưu snapshot rồi enqueue firstAttempt có binding cho account; mở lại tự khôi phục khoảng gián đoạn giữa hai bước. Chỉ quét những firstAttempt đổi so với snapshot đã enqueue thành công; guest/binding thiếu giữ local như cũ. Lỗi queue tách khỏi lỗi lưu bài. Chuyển bản cập nhật giữ câu trả lời bản cũ trong queue trước khi chuyển. Chưa gửi POST tự động.
- **Đã kiểm:** 11 Vitest queue/reading-session đạt, typecheck/ESLint đạt. Browser guest sai→đúng→reload đạt (25.3s), không queue account; account mới đăng ký rồi onboarding đạt (16.1s), queue đúng đáp án đầu tiên và reload vẫn một command. Test tài khoản demo trước đó timeout chờ binding: snapshot cho thấy LegacyLessonTheoryPanel boot-1, chưa rõ nguyên nhân; không dùng account mới pass để tuyên bố demo cũ đã được sửa.
- **Dữ liệu giữ được:** không apply migration 0025, không ghi page attempt/evidence/FSRS trên server. Browser test tạo account kiểm thử riêng, không reset demo/progress thật. Snapshot đọc không đổi schema; journal được lưu trong owner/reset hiện có.
- **Tiếp theo:** điều tra demo boot-1 mở legacy trong khi guest/account mới dùng authored; nối pump/backoff và rehearsal D1, consumer rồi nội dung/media v0.2 còn thiếu. Phạm vi toàn bộ chưa hoàn tất.

## Thiên Lộ · hàng đợi IndexedDB theo owner/reset · 14/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW, toàn scope vẫn chưa hoàn tất.
- **Đã làm:** thêm updateLessonResume read/modify/write trong một giao dịch cùng meta/document để kiểm owner generation/reset. pageAttemptOutbox dùng entry riêng trong lesson-resumes hiện có, không đổi version/schema IndexedDB; lưu command trước gửi, phục hồi journal, giữ ack trước pending đến muộn và chặn key bị đổi nội dung. Dữ liệu journal phiên bản mới/không đọc được không bị ghi đè. Chưa gọi queue/delivery từ reader.
- **Đã kiểm:** 22 test queue/delivery/cache/reading-session đạt, thêm test reset thật trong canonical IndexedDB document đạt (lượt cuối queue 5/5). Concurrent enqueue giữ cả hai, đóng/mở DB giữ dữ liệu, tài khoản đổi chặn ghi/đọc cũ, quay lại giữ hàng đợi, reset trước acknowledgement bị chặn, epoch mới có hàng đợi riêng. Typecheck và targeted ESLint đạt; lỗi fixture OwnerGenerationClaim ban đầu đã sửa đúng contract và chạy lại.
- **Dữ liệu giữ được:** tests fake-indexeddb cách ly; không đổi D1 hay browser người dùng, không apply 0025, không tạo evidence/FSRS. Journal mới dùng cùng owner cleanup/reset scope với reading cache. Không gọi đây là offline sync hoàn chỉnh vì chưa có pump/backoff scheduling và reader integration.
- **Tiếp theo:** nối lưu snapshot→enqueue→delivery với owner/reset checks, điều phối pending và rehearsal D1; sau đó consumer và nội dung/media còn lại v0.2. Không push/public deploy hoặc đánh dấu USER-ACCEPTED.

## Thiên Lộ · chuẩn bị gửi lại và đối chiếu xác nhận · 14/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; mục tiêu toàn bộ tiếp tục.
- **Đã làm:** preparePageAttemptCommand dựng command từ firstAttempt có binding đã lưu, kiểm lesson/page/block; không gắn bù binding cho snapshot cũ và không gửi guest. Mã chống trùng băm owner/reset/phiên bản/nội dung/thời điểm, ổn định qua reload. Receipt repository bổ sung key/reset/activity/version để client đối chiếu trước khi coi đã lưu. deliverPageAttempt chỉ gửi một lần, giữ trạng thái pending khi mạng đứt, login hết hạn, 429/503 hoặc receipt không khớp; conflict không tự đổi owner hay dữ liệu.
- **Đã kiểm:** 20 test qua 4 file command/delivery/repository/route đạt. Bao gồm mất acknowledgement rồi nhận duplicate, body gửi lại giống nguyên bản, receipt thực tế từ repository qua matcher, owner/reset tách key, binding sai bị từ chối, trợ giúp giữ nguyên, backoff theo Retry-After. Typecheck/targeted ESLint đạt.
- **Dữ liệu giữ được:** chưa gọi delivery từ reader; chưa thêm persistent outbox/session server hoặc apply migration 0025. Không thay DB/progress/nội dung phát hành. Đây là protocol và transport đã kiểm, chưa tuyên bố hàng đợi offline tích hợp hoàn chỉnh hoặc liên thông mastery/ôn/lỗi.
- **Tiếp theo:** lưu command trước khi gửi bằng giao dịch owner/reset, phục hồi hàng đợi và nối reader; sau đó rehearsal D1 và consumer. Phạm vi v0.2/217 bài cùng media/editor còn mở, không push/public deploy.

## Thiên Lộ · API ghi hoạt động theo tài khoản · 14/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW, goal toàn bộ chưa hoàn tất.
- **Đã làm:** POST /api/learning/page-attempts dùng xác thực hiện có, owner do server resolve; header x-learning-owner phải khớp accountKey từ session để chặn hàng đợi A bị gửi bằng cookie B. Chặn cross-origin/cross-site, bounded JSON 64 KB, trường score/owner tự thêm, đáp án rỗng; dùng chung rate budget learning.attempts.write. Trả 201/200 cho mới/trùng, 409 cho owner/reset/version/key conflict, 429/503 retryable. Đây là nhật ký luyện có hỗ trợ, không cấp mastery/reward/completion.
- **Đã kiểm:** 13 Vitest route/repository đạt, typecheck/ESLint đạt. Web thật: 2 Playwright đạt (5.6s), chặn anonymous/cross-site và owner cũ/thiếu; owner đúng qua cổng rồi payload rỗng nhận 422. Ban đầu E2E giả định JSON khi Vinext chặn 403 text/plain; đã xác minh middleware của Vinext và sửa assertion đúng lớp. Contract JSON của route kiểm riêng trong Vitest.
- **Runtime/dữ liệu:** dev cũ dừng, xác minh không listener/process rồi chạy npx vinext dev, session 84154 lên cổng 3000; không áp dụng migration tự động. Chưa apply 0025, chưa kiểm ghi thành công trên D1 thật; chưa nối reader/outbox và chưa có reading session server hay consumer ôn/lỗi/thống kê. Browser chỉ login demo ở context cách ly và thử request bị từ chối, không tạo attempt/evidence.
- **Tiếp theo:** phiên đọc/outbox bền vững theo owner/reset, tích hợp ghi và consumer rồi backup/migration/rehearsal D1; tiếp tục 172 bài nền chưa authored cùng nội dung/media toàn scope. Giữ 45 bài authored local đã phát hành, không suy số bài thành độ phủ HSK.

## Thiên Lộ · journal kết quả trang và chống gửi lại sai owner/reset · 14/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal toàn bộ vẫn hoạt động.
- **Đã làm:** hoàn thiện phần repository đang dở cho lesson_page_attempts, chấm bằng đáp án published phía server, lưu response/assistance theo owner/reset/key và revision. Bổ sung kiểm account/reset ngay khi xác nhận cả bản ghi mới lẫn bản gửi lại, chặn race sau lookup; stale activity version dùng lỗi conflict rõ. Không chuyển kết quả này thành mastery, điểm hoàn thành hay FSRS.
- **Đã kiểm:** 12 Vitest qua 3 file repository/registry/firstAttempt; trong đó 7 test repository dùng SQLite và migration thật gồm owner isolation, idempotency, concurrent duplicate, reset trong manifest load và duplicate lookup, tài khoản khóa, version cũ, trợ giúp, cascade delete, key tái dùng trong epoch mới. Typecheck và targeted ESLint đạt. Đối chiếu snapshot 0024→0025 chỉ thêm lesson_page_attempts, không đổi/xóa bảng cũ.
- **Dữ liệu giữ được:** chưa apply migration 0025 lên D1 local; không restart dev, không thay tài khoản/tiến độ/bài phát hành. Tests dùng SQLite memory. Phần schema/repository có sẵn từ lượt trước nay được kiểm và gia cố, chưa có POST/session/outbox/consumer, chưa phải tính năng ghi kết quả đang chạy trên web.
- **Tiếp theo:** hoàn thiện phiên đọc và API authenticated cùng owner/reset/outbox trước khi bật ghi kết quả thật; tiếp tục nội dung/media còn lại trong v0.2. Không thay thế phạm vi 217 bài bằng kiểm thử hạ tầng này.

## Thiên Lộ · xác minh ảnh phủ khung và bỏ khoảng dư · 14/09/2026

- **Module:** Thiên Lộ — IN-REVIEW; chưa USER-ACCEPTED, phạm vi cải tiến toàn bộ vẫn chưa hoàn tất.
- **Người học thấy gì:** xác minh thay đổi hiện có: ảnh tình huống phủ kín khung bằng cover, bỏ caption dưới ảnh và đoạn TTS cuối phần lĩnh hội, thu gọn padding; nhãn giọng tổng hợp nằm tại nút nghe. Cover có thể cắt mép ảnh theo tỷ lệ màn hình. Nội dung dài cuộn riêng, có chỉ dẫn phần dưới; không tuyên bố mọi nội dung đều vừa một màn hình.
- **Đã kiểm:** bổ sung assertion browser cho cover, kích thước ảnh khớp lòng khung, không còn caption/đoạn chú thích cuối. Playwright đạt 1/1 tại 1235×640, 375×812, 812×375; nút nghe, mở lời thoại và footer trong viewport, chuyển mục trả vị trí cuộn về đầu. Đã xem ảnh desktop/mobile. Typecheck đạt.
- **Dữ liệu giữ được:** lượt này chỉ bổ sung kiểm thử và checkpoint, giữ các sửa UI đã có; không đổi nội dung, schema, progress hoặc áp dụng migration đang dở của công việc khác. Web local cổng 3000 đang chạy.
- **Tiếp theo:** người dùng test phần bố cục này; các phần còn lại của đề án Thiên Lộ/Xưởng vẫn giữ trạng thái chưa hoàn tất.

## Thiên Lộ · kết quả vượt ải và ngang màn hình · 14/09/2026

- **Module:** Thiên Lộ — IN-REVIEW, goal còn hoạt động.
- **Người học thấy gì:** màn kết quả thấp/ngang chuyển thành một cột cuộn
  giữa, không cắt nội dung bên phải; giữ footer làm lại/Thiên Lộ/học tiếp.
- **Đã kiểm:** browser khách hoàn thành thực tế boot-1 cả nhánh sai và đúng,
  đúng 10/10 rồi nhận rương, trạng thái chuyển đã nhận và nút nhận biến mất.
  Hai hành trình đạt ở 1440/375/812. Xem ảnh đã phát hiện overflow nội bộ
  mà kiểm document không bắt; bổ sung kiểm scrollWidth vùng kết quả và
  sửa CSS, chạy lại 2/2 đạt. Ảnh ngang sửa xong đã xem.
- **Dữ liệu giữ được:** E2E dùng context khách riêng; đọc resume để chọn
  đáp án qua UI, không cấy evidence/completion/reward. Không sửa scoring.
- **Tiếp theo:** luồng tài khoản và phần nội dung/tích hợp còn lại trong
  scope. Chưa suy từ browser khách thành toàn bộ luồng account đã kiểm.

## Thiên Lộ · giao diện luyện và kết quả · 14/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW. Ưu tiên UI theo phản hồi người dùng;
  số bài authored phát hành vẫn 27. Lô 15 bài chữ mới là bản thảo, chưa review/phát hành.
- **Người học thấy gì:** nền giấy ấm cho câu hỏi/đáp án trong khung ngọc;
  trạng thái đúng/sai/chọn rõ; kết quả cùng phong cách, giải thích điểm tự
  lực mở khi cần. Mobile dùng trọn chiều ngang cho kết quả, footer giữ
  làm lại/học tiếp. Bỏ mã lesson khỏi tiêu đề kết quả và tên kỹ năng tiếng
  Anh khỏi ngữ cảnh tài khoản; progressbar có nhãn chung cho khách/tài khoản.
- **Đã kiểm:** typecheck/ESLint, 3 test result đạt. Browser khách thật
  boot-1 học→luyện→kết quả chưa vượt ải, mở giải thích, footer ở 1440/375/812
  đạt; ảnh desktop/mobile đã xem. Test ban đầu chờ dư câu cuối sau khi
  result render; sửa điểm chờ, chạy lại đạt. Dev từng dừng, xác nhận không
  có listener rồi bật lại; không có migration mới. Web localhost:3000 đang chạy.
- **Dữ liệu giữ được:** không đổi scoring/reward/persistence, không reset
  tài khoản thật; E2E dùng browser khách riêng. Inventory nền giữ nguyên.
- **Tiếp theo:** kiểm UI nhánh vượt ải/nhận thưởng và tài khoản, hoàn thiện
  luồng theo scope; chưa gọi toàn UI hoặc goal hoàn tất.

## Thiên Lộ · đi lại và giải trí · 13/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW. journey-1/2 đã phát hành local,
  tổng 27 bài authored local; chưa hoàn tất 217 bài và các tích hợp.
- **Người học thấy gì:** 21 trang mới có điểm nhìn nhà–trường, hành khách
  và người lái, hoạt động giải trí và kết quả nghe thấy; vận dụng đổi
  phương tiện/hoạt động. Các sơ đồ và bài tập biên tập được trong Xưởng.
- **Đã kiểm:** review 15/digest, 2 test, typecheck/ESLint; release rehearsal
  rồi backup/apply, FK/fingerprint 35 bảng đạt. Browser 2/2 đạt: hai
  route/payload/sơ đồ, điền sai→đúng, footer 3 viewport, vào Thử Luyện;
  Xưởng đủ trang/xem trước/lưu lại. Ảnh ngang đã xem.
- **Dữ liệu giữ được:** 23 word IDs, prerequisites/skills; nền HSK0 4/4
  rich 0/4, HSK1–4 rich 213/213. humanReviewed:false, không thêm mastery.
- **Tiếp theo:** nhóm chữ HSK1 theo lô. Audit 15 bài/246 mục chữ có 7
  context chưa bind âm chính xác; artifact character-context-audit.json
  ghi từng ID. Cần xử lý biến điệu, biến thể và Erhua khi soạn trang.

## Thiên Lộ · phân biệt âm chữ và âm từ · 13/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW. Tổng bài authored đã phát hành
  vẫn 25; journey-1/2 là 21 trang nháp trong Xưởng, chưa phát hành.
- **Người học thấy gì:** bảng chữ trong LessonDepthPanel không còn hiện
  fēicháng dưới 常 như âm của chữ. Mapping theo âm tiết từ nguồn hiện hành
  cho 常=cháng, 床=chuáng, 电=diàn; 爸爸 giữ bà/ba theo hai vị trí. Nhãn
  âm trong từ và âm cả từ tách rõ. Erhua hoặc context không khớp không đoán.
- **Đã kiểm:** 3 test mapping/fallback và render component thật đạt;
  typecheck đạt. Browser riêng thay đổi nhãn chưa kiểm; đây chưa phải
  nghiệm thu nhóm chữ hoặc kiểm đủ toàn bộ consumer chữ trên website.
- **Dữ liệu giữ được:** không đổi source/ID/âm từ/progress, không thêm
  stroke hoặc evidence. Chỉ dựng thông tin hiển thị từ syllable đã có.
- **Tiếp theo:** dùng mapping có kiểm này khi soạn cả nhóm bài chữ; rà và
  phát hành journey cùng các mốc còn lại. Giữ toàn scope goal hoạt động.

## Thiên Lộ · lô đời sống, thời gian và địa điểm · 13/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW. Mười bài daily-1…4 và sáu bài
  hsk1-time-place-events đã phát hành local; tổng 25 bài authored local.
  Chưa hoàn tất 217 bài nền, HSK0–4 hoặc phạm vi tích hợp trong hồ sơ 0.2.
- **Người học thấy gì:** 111 trang, hội thoại và vận dụng riêng; mười sơ đồ
  bảng giá/thực đơn/tiền thừa/số đếm/lịch/thời lượng/vị trí/nơi cư trú.
  Bài số phân biệt 二/两 và mã phòng; bài giờ phân biệt 点/小时; bài vị trí
  dùng sơ đồ sách–bàn–mèo. Toàn bộ nội dung và sơ đồ nằm trong payload Xưởng.
- **Đã kiểm:** 4 test hai lô (schema, digest, giữ ID, projection và các dữ
  kiện giá/ngày/thời lượng/vị trí) đạt; typecheck/ESLint đạt. Tách builder
  dùng chung không đổi digest của lô survival đã phát hành. Import/release
  theo registry có rehearsal/backup/FK/fingerprint 36/35 bảng đạt. Browser
  đủ 10 route/payload/sơ đồ, điền sai→đúng, footer ba viewport và vào Thử
  Luyện đạt. Xưởng xem mọi trang/lưu lại đạt; tổng 2/2 hành trình browser,
  ảnh ngang đã xem. Release lại rehearsal completed:0, không tạo trùng.
- **Dữ liệu giữ được:** 135 liên kết từ và prerequisite/skills không đổi;
  nền HSK0 4/4 rich 0/4, HSK1–4 rich 213/213 giữ nguyên. Không sửa tiến độ
  để mở bài. Review 14 khóa digest, humanReviewed:false; tự luyện trang
  chưa cấp mastery hoặc evidence nói/viết độc lập.
- **Tiếp theo:** tiếp tục hai bài journey và nhóm
  chữ HSK1 theo lô; học–luyện–kết quả/media/evidence vẫn còn trong goal.

## Thiên Lộ · lô giao tiếp cá nhân · 13/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW. Phát hành local cả lô
  survival-1 đến survival-9; tổng 15 bài authored đã phát hành, chưa hoàn tất
  phạm vi 217 bài và các tích hợp trong hồ sơ 0.2.
- **Người học thấy gì:** chín bài, 89 trang; hội thoại, mẫu ngữ pháp gắn đúng
  ngữ cảnh, phản hồi từng lựa chọn, bài điền, vận dụng đổi vai. Thay 21 ví dụ
  không phù hợp mục tiêu trên trang bài học; giữ nguồn từ điển dùng chung.
- **Đã kiểm:** validator/digest 2 test, typecheck và ESLint đạt. Import cả lô
  có backup/rehearsal/idempotence/FK và fingerprint 36 bảng; release cả lô
  có rollback/rehearsal/backup/FK và fingerprint 35 bảng. Rehearsal đã phát
  hiện cần xử lý cả event validation và release cho mỗi bài; sửa giới hạn,
  chạy lại thành công rồi mới apply. Browser đủ chín route/payload, điền
  sai→đúng, footer ba viewport và vào Thử Luyện đạt; ảnh ngang đã xem.
  Browser Xưởng đủ trang/xem trước/lưu lại payload đạt; tổng 2/2 hành trình.
- **Dữ liệu giữ được:** 107 liên kết từ, prerequisite và skills nguyên vẹn;
  nền HSK0 4/4 (rich 0/4), HSK1–4 rich 213/213 không đổi. AI-assisted,
  humanReviewed:false; không cấp mastery từ tự luyện trang. Review 13 khóa
  digest cả lô. Không reset completion/FSRS/lỗi/owner/session.
- **Tiếp theo:** tiếp tục các lô còn lại theo
  yêu cầu làm gấp; chưa ghi USER-ACCEPTED hay hoàn thành goal.

## Thiên Lộ · Công việc và lịch hằng ngày · 13/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW. professional-4 tám trang published
  local; tổng6bài authored đã phát hành/kiểm, phạm vi217bài còn tiếp tục.
- **Người học thấy gì:** phân biệt công ty/làm việc/bận; cặp lên–tan ca và
  vào–hết tiết; timeline bốn mốc, hỏi giờ, xếp câu và vận dụng lịch C khác B.
  Không diễn giải 下课 thành tan trường cả ngày hoặc 上班 luôn là giờ rời nhà.
- **Đã kiểm:** 2test draft/review digest/projection; typecheck/ESLint/diff check.
  Browser Xưởng đủ8trang/timeline/lịch mới/lưu lại; learner API→3viewport→
  Thử Luyện đạt2/2. Ảnh375 xem trực tiếp. Import/release backup/rehearsal/FK và
  fingerprint36/35bảng đạt. Nội dung học cũ, tài khoản và phiên không reset.
- **Dữ liệu giữ được:**7word IDs, prerequisite professional-3, skills giữ
  nguyên; nền HSK0 4/4 rich0/4, HSK1–4 rich213/213. AI self-review khóa digest
  tại review12, humanReviewed:false. Khối trang chưa cấp mastery/evidence nói.
- **Tiếp theo:** các bài/lô và tích hợp học–luyện–kết quả còn lại theo scope0.2.

## Thiên Lộ · Học tập và tài liệu · 13/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW. professional-3 chín trang published
  local, tổng5bài authored đã phát hành/kiểm; scope217bài còn tiếp tục.
- **Người học thấy gì:** tách học/đọc/viết và tài liệu/hỏi đáp, có luyện giữa
  hai phần, sơ đồ hoạt động, lượng từ 本, cloze 学/学习, tình huống mới không
  tự đoán thông tin chưa biết. Tất cả trang/đáp án sửa được trong Xưởng.
- **Đã kiểm:** 2test schema/review digest/projection, typecheck/ESLint. Browser
  Xưởng đủ9trang, hai đáp án/lưu lại; learner API→bài→3viewport→Thử Luyện đạt.
  Ảnh375 xem trực tiếp. Import/release backup/rehearsal/fingerprint36/35bảng/FK
  đạt. Browser lần đầu ECONNREFUSED do dev đã dừng; khởi động lại, migration
  không có mới, chạy lại2/2đạt. Web đang bật localhost:3000.
- **Dữ liệu giữ được:**12word IDs, prerequisite professional-2, skills và tiến
  độ thật; không reset FSRS/lỗi/owner/session. Nền HSK0 4/4 rich0/4 và HSK1–4
  213/213 rich giữ nguyên. AI-assisted humanReviewed:false, không cấp mastery
  từ xem trang hoặc tự đối chiếu. Review11 và digest JSON khóa manuscript.
- **Tiếp theo:** các bài còn lại và tích hợp học–luyện–kết quả theo hồ sơ0.2.

## Thiên Lộ · Con người và tiếng Trung · kiểm xong 12/09, ghi mốc13/09

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW. professional-2 tám trang đã published
  local, nâng tổng số bài authored đã phát hành/kiểm lên4, không phải toàn217.
- **Người học thấy gì:** vai trò giáo viên/bạn học; phân biệt quốc gia/ngôn
  ngữ/chữ; mẫu, phản hồi, xếp câu, cloze chấp nhận cả 汉语/中文, vận dụng đổi vai.
- **Đã kiểm:** 2 test draft/review digest/projection, typecheck/ESLint. Browser
  learner API→8trang→sơ đồ→3viewport→Thử Luyện; Xưởng đủ trang, hai đáp án hợp
  lệ, lưu/mở lại đạt. Ảnh desktop xem trực tiếp. Import/release backup,
  rehearsal, fingerprint36/35bảng và FK đạt.
- **Dữ liệu giữ được:** bảy word IDs, prerequisite professional-1, skills,
  completion/FSRS/lỗi/owner/reset không đổi. Inventory nền HSK0 4/4 rich0/4;
  HSK1–4 rich213/213 giữ nguyên. AI-assisted humanReviewed:false; hoạt động
  trang chỉ tự luyện, chưa là evidence mastery.
- **Tiếp theo:** các bài trong chuỗi và phần tích hợp còn lại của scope0.2.

## Thiên Lộ · Xin chào đầu tiên · 12/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW, goal toàn kho còn hoạt động.
- **Người học thấy gì:** boot-2 có tám trang biên soạn riêng: lời chào hai lượt,
  sơ đồ đổi vai 我/你, hiểu 好 trong cụm, phản hồi lỗi, xếp chữ, hỏi thăm có hỗ
  trợ, vận dụng tình huống mới. Nhánh HSK0 nay dùng trang authored khi có;
  bài HSK0 chưa có bản mới vẫn dùng luồng nền hiện hữu.
- **Đã kiểm:** 2 test validator/digest/projection HSK0; typecheck và targeted
  ESLint. Browser Xưởng đủ8trang, sai→đúng, preview/mobile/lưu lại; learner
  API→boot-2→3viewport→Thử Luyện đạt. Ảnh375 được xem trực tiếp. Import/release
  có backup, rehearsal, fingerprint36/35bảng và FK đạt; chưa public deploy.
- **Dữ liệu giữ được:** boot-2, ni/hao/wo, prerequisite boot-1, kỹ năng và lịch
  sử thật không đổi. Inventory nền HSK0 4/4 rich0/4 và HSK1–4 213/213 rich giữ
  nguyên; overlay Studio mới cho1bài HSK0. Ba bài nâng cấp đã published local
  (boot-2, professional-1, HSK3 timeline), không coi toàn217bài đã hoàn tất.
  Review AI khóa digest; humanReviewed:false; tự luyện không cấp mastery.
- **Tiếp theo:** các bài nhập môn và các lô nội dung còn lại theo hồ sơ0.2.

## Thiên Lộ · mẫu đọc HSK3 phát hành local · 12/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW. Hai bài nâng cấp đã phát hành local:
  professional-1 và hsk3-cohesion-reconstruction-lesson-01; chưa hoàn tất kho.
- **Người học thấy gì:** bài đọc HSK3 tám trang, hai câu chuyện, sơ đồ thời gian,
  chọn đoạn/ghi chú, sắp xếp, tìm bằng chứng và tóm tắt. Màn hình thấp thu gọn
  header và dùng bộ chọn trang thay dãy chặng; phần đọc có thêm chiều cao.
- **Đã kiểm:** review khóa digest, validator/projection 3 test; rehearsal và
  apply phát hành giữ 35 bảng, backup/FK đạt. Browser API → khóa tiên quyết →
  guest fixture có bằng chứng tiên quyết → tám trang → chọn đoạn/ghi chú →
  dictionary link → Thử Luyện đạt tại 1440×900, 375×812, 812×375. Typecheck,
  targeted ESLint và diff check đạt. Ảnh ngang được xem trực tiếp.
- **Dữ liệu giữ được:** không đổi ID/từ/kỹ năng/prerequisite hoặc tiến độ thật.
  Fixture Playwright riêng dùng bằng chứng hợp lệ; completion gán thủ công bị
  parser loại đúng thiết kế. HSK0 4/4 (rich 0/4), HSK1–4 213/213 rich giữ nguyên.
  AI self-review true, humanReviewed:false. Activity mới chưa cấp mastery.
- **Tiếp theo:** các họ bài còn lại và toàn kho theo 0.2; không USER-ACCEPTED.

## Thiên Lộ · câu mẫu gắn đúng điểm ngữ pháp · 12/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW, goal toàn kho tiếp tục hoạt động.
- **Người học thấy gì:** ví dụ/bài luyện ngữ pháp dùng liên kết tường minh;
  không lấy câu hội thoại theo vị trí. Xưởng khóa thao tác khi chưa khởi tạo
  xong để tránh mất dữ liệu nhập sớm. HSK3 mẫu tám trang đã có bản nháp đầy đủ
  trong Xưởng, chưa phát hành. Bài professional-1 vẫn là mẫu duy nhất đã nâng
  cấp và phát hành local, không coi 217 bài đã xong.
- **Đã kiểm:** 16 unit liên quan, typecheck, ESLint; browser 2/2 lưu/mở lại/
  preview ngữ pháp và bản HSK3 đầy đủ/mobile. Import HSK3 rehearsal/apply có
  backup, idempotency, foreign keys và fingerprint 36 bảng bảo vệ đạt.
- **Dữ liệu giữ được:** HSK0 4/4 rich 0/4, HSK1–4 213/213 rich; không đổi
  lesson/word IDs, prerequisite, kỹ năng, tiến độ, FSRS, lỗi hoặc owner/reset.
  Nội dung mới humanReviewed:false, HSK3 review còn false nên chưa publish.
- **Tiếp theo:** review/phát hành HSK3 và biên soạn từng lô trong phạm vi 0.2.
  Chi tiết tại docs/thien-lo-redesign-review/06-TIEN-DO-TRIEN-KHAI.md.

**Cập nhật:** 07/09/2026

**Cách làm:** từng module, người dùng test trước khi chuyển module

**Phạm vi:** Mainland Mandarin, chữ giản thể + Pinyin, UI tiếng Việt, HSK0–HSK4,
local-first web/PWA

## 1. Quyết định hiện hành

### Lượt 12/09 — Gate nội dung local HSK0–4 đã thông — IN-REVIEW

- content:local-study:validate đã chạy trọn và exit0. Blocker stale cũ đã gỡ.
  Nguyên nhân gồm CRLF khác bytes LF và các digest kế thừa chưa đồng bộ.
- Chuẩn hóa các JSON đã audit; config local profile và2file package được kiểm
  SHA của bytes LF khớp hash đã lưu trước khi sửa. Không đổi payload package.
  .gitattributes giữ content JSON và profile local ở LF để checkout Windows
  không lặp lỗi. Không renormalize/stage toàn repo hoặc thay source media.
- Refresh theo thứ tự nguồn→review→authorization→rich, guard chỉ chấp nhận
  thay đổi leaf SHA256. Core không đổi, không tăng cờ review/mastery/production,
  không thay câu hỏi/đáp án. Bảng kiểm local giữ 217 bài/2016 từ runtime;
  HSK1–4 vẫn40/40/55/78rich và HSK0 bốn bài.
- Đây không phải full npm run check hay nghiệm thu chất lượng217bài mới.
  Goal vẫn đang triển khai registry, bài riêng, mẫu HSK3 còn nháp, assessment/
  evidence/links và full UI/gates. Không USER-ACCEPTED toàn module.


### Lượt 12/09 — Thiên Lộ: không cập nhật về bản nền lúc tải chậm — IN-REVIEW

- Browser regression phát hiện nút bản cập nhật xuất hiện trước khi manifest
  phát hành tải xong, có thể ghi snapshot bản nền cũ. Reader nay chờ trạng thái
  nguồn khi mở lần đầu, giữ snapshot đang có khi refresh, chỉ cho chuyển phiên
  bản khi nguồn ready; fallback không tự thành bản cập nhật.
- Cả guest và account truyền trạng thái nguồn. Browser giữ request runtime,
  xác nhận chưa có nút cập nhật, thả request → khôi phục câu viết và dấu đã xem
  hướng dẫn → chuyển đúng8trang đã phát hành; snapshot cũ vẫn lưu riêng.
  E2E learner3viewport/resume/revision/Studio đạt; typecheck/ESLint đạt.
- Gỡ blocker HSK1 stale sau audit: review nguồn time-place-events không có
  diff và check+validator đạt; level review chỉ đổi2digest, core không đổi.
  Regenerate binding; level validator và package check đạt. Chưa đồng nghĩa
  full check đã đạt; content:local-study:validate đã đạt ở mốc tiếp theo.
- Scope toàn217bài vẫn chưa hoàn tất; tiếp tục nội dung/registry/liên kết.


### Lượt 12/09 — Thiên Lộ: đọc văn bản và ghi chú HSK3 — IN-REVIEW

- Thêm khối reading: văn bản nhiều đoạn với Trung/Pinyin/Việt; mở trợ giúp,
  chọn đoạn làm bằng chứng và ghi chú. Xưởng nhập/chỉnh/sắp xếp từng đoạn;
  reader chung, nhân bản đổi mã đoạn, snapshot giữ ghi chú/chọn đoạn/trợ giúp.
- Có bản nháp gốc hsk3-cohesion-reconstruction-lesson-01 gồm 8 trang: văn bản
  4 đoạn/8 câu, timeline, sắp xếp ý, chọn nhận định có bằng chứng, tóm tắt.
  Thêm văn bản trồng cây đảo đoạn và nhiệm vụ chuyển giao riêng. Chưa phát hành,
  chưa payload canonical đầy đủ; còn review độ khó và audit từ nguồn quá lớn.
- Đã kiểm 9 unit schema/resume, typecheck/ESLint; browser sửa yêu cầu ghi chú
  → đọc → mở Pinyin/nghĩa → chọn đoạn → ghi chú → mobile → lưu/mở lại đạt.
  Không ghi lựa chọn bằng chứng tự học thành điểm đọc hoặc mastery.
- Kho vẫn 217 bài nền/213 rich; professional-1 vẫn mẫu đã published, bản HSK3
  chỉ nháp thử local. Full goal chưa xong, giữ phạm vi nội dung toàn kho và
  registry/assessment/integration. Tiếp theo hoàn thiện mẫu đọc và các họ bài.


### Lượt 12/09 — Thiên Lộ: phát hành mẫu professional-1 local — IN-REVIEW

- Bài Trường học và cấp học (8 trang/26 khối) đã phát hành local qua revision
  thien-lo-v2-professional-1. Hồ sơ rà cụ thể tại
  docs/thien-lo-redesign-review/07-REVIEW-PROFESSIONAL-1.md và JSON review
  gắn digest payload. humanReviewed:false; chỉ local self-study, chưa mastery.
- Script release-authored-thien-lo chạy rehearsal rollback → apply → rehearsal
  lại completed=0; backup trước apply. Chặn review stale, sửa editor khác nguồn,
  item khác cùng lesson target và release job không liên quan. 35 bảng được
  bảo vệ không đổi, foreign key đạt; audit_events có chuyển trạng thái hợp lệ.
- Browser learner nhận đủ 8 trang, sơ đồ đúng; desktop 1440×900, mobile
  375×812, ngang 812×375 giữ footer trong viewport; tra từ đúng lesson;
  chuyển vào Thử Luyện được, không có pageerror ở lượt đạt. Lượt trước chờ
  sai nhãn CTA đã sửa trong test; không chạy rehearsal D1 đồng thời browser.
- 9 test review binding/projection/nhân bản đạt; typecheck đạt. 217 bài nền và
  213 rich giữ nguyên; chưa soạn lại toàn kho. Activity mới vẫn feedback/nháp,
  các consumer evidence, registry nâng cao, HSK0, nội dung/ảnh toàn kho và
  full gates còn thiếu. Không USER-ACCEPTED hoặc complete goal.
- Tiếp theo: các mẫu họ bài còn lại và registry cần thiết, biên soạn theo lô
  toàn Thiên Lộ, giữ scope 0.2 và không coi mẫu này là xong module.


### Lượt 12/09 — Thiên Lộ: sơ đồ và bản nháp trường học — IN-REVIEW

- Registry/Xưởng/reader cùng hỗ trợ sơ đồ chuỗi, timeline, đối chiếu và bản đồ
  4×4; mô tả bằng chữ, nhãn/Pinyin/nghĩa và kiểm ô trùng trước phát hành.
- Soạn riêng professional-1 thành 8 trang/26 khối, phân biệt trường–người học,
  是/在, câu hỏi và chuyển vai. Đây là bản nháp chưa phát hành; còn review
  sư phạm/tiên quyết và nhập payload đầy đủ, không đại diện 217 bài đã xong.
- Xưởng nhân bản trang/khối, đưa khối xuống; bản sao tạo khóa câu trả lời riêng
  và ánh xạ lại đáp án lựa chọn, không thay khóa của bản gốc. Chặn nút preview
  trước hydration để thao tác không bị bỏ qua.
- Đã kiểm: 8 unit test schema/sơ đồ/nhân bản; ESLint/typecheck; browser mở đủ
  8 trang → chọn đáp án → nhân bản trang/khối → sắp xếp → lưu/mở lại → preview
  mobile 375 px, không tràn ngang. Ảnh kiểm tra nằm tmp, không sửa output.
- Payload mẫu đầy đủ đã nhập canonical draft local bằng script
  import-authored-thien-lo: backup, rehearsal, apply, kiểm 36 bảng bảo vệ và
  chạy lại inserted=0. Chưa phát hành; humanReviewed:false và review chưa chốt.
- Sửa client boundary của LessonDepthPanel (preview legacy có nút âm) và dùng
  reader trang mới trong preview revision đã lưu, giữ title revision. Hai
  browser journey bản đầy đủ và nháp thiếu lời giải đạt; ESLint/typecheck đạt.
- Bảo toàn kho 217/213 rich và dữ liệu learner; thêm bản nháp local.
  Goal tiếp tục toàn bộ hồ sơ 0.2; chưa local release bản biên soạn này,
  chưa toàn kho, chưa hoàn tất liên thông evidence và full gate.


### Lượt 12/09 — Kho học liệu Thiên Lộ: upload/chọn và quyền truy cập — IN-REVIEW

- Thêm migration 0024 với asset bất biến và chunks D1; đã áp dụng local,
  không xóa dữ liệu cũ. Xưởng tải/chọn ảnh PNG/JPEG/WebP hoặc audio MP3/WAV/OGG
  tối đa 8 MB, nhập nguồn/quyền dùng/alt/caption/transcript/focal point.
- Khối ảnh/audio giữ metadata khi lưu; audio có controls và transcript mở riêng,
  nhãn tổng hợp đúng sourceKind. Không tự gán humanReviewed từ upload.
- API kiểm cùng origin/quyền, giới hạn body và chữ ký định dạng; tệp nháp yêu
  cầu quyền Xưởng. Tệp có tham chiếu trong immutable release package được đọc
  cho phiên cũ; hỗ trợ Range. Xóa chỉ cho chủ upload và tệp chưa được nội dung
  tham chiếu; tệp đang dùng phải thay bằng asset mới.
- Đã kiểm: 18 test media/schema/activities/release, ESLint, browser tải ảnh →
  gắn khối → lưu draft/mở lại; anonymous 401, editor 200, Range 206, xóa tệp
  đã gắn draft 422. Chưa kiểm browser audio hoặc phát hành local bài chứa tệp.
- Bổ sung kiểm định revision kiểm tệp media thực sự tồn tại và đúng extension;
  thiếu tệp chặn validation trước gửi duyệt. 22 test repository/release liên
  quan đạt. Typecheck của mốc upload/picker đạt.
- Kho vẫn 217 bài nền/213 rich. Có thêm ảnh fixture + bản nháp kiểm thử local,
  chưa phát hành. Còn pagination/search kho (hiện 100 tệp gần nhất), kiểm
  release end-to-end với asset, chỉnh metadata bằng revision và kiểm toàn UI/media.
- Goal tiếp tục đầy đủ hồ sơ 0.2: registry còn thiếu, mẫu và biên soạn riêng
  toàn kho, links/evidence, local release và full gates chưa hoàn tất.

### Lượt 12/09 — Goal toàn Thiên Lộ đang chạy; Xưởng soạn activity — IN-REVIEW

- Người dùng yêu cầu tiếp tục đến hoàn tất và cho bật goal. Goal đã active cho
  toàn hồ sơ 0.2; không dừng ở mỗi mốc nền. Sổ tiếp tục ở
  `docs/thien-lo-redesign-review/06-TIEN-DO-TRIEN-KHAI.md`.
- Thêm khối activity choice/order/cloze/rubric dùng chung Xưởng/reader, đáp án
  ID ổn định, phản hồi theo lựa chọn, đáp án cloze thay thế, gợi ý và tiêu chí
  tự kiểm. Câu mở không chấm đúng/sai tự động. Trạng thái đáp án/gợi ý/phản hồi
  được giữ trong nháp; chưa ghi thành mastery hoặc evidence khách quan.
- Tách kiểm tra cấu trúc bản nháp khỏi yêu cầu phát hành. Xưởng mở lại trang
  còn dở; form lesson chỉ yêu cầu tên khi lưu, không buộc hoàn tất giáo trình
  hoặc checklist review trước khi lưu. Gate phát hành vẫn giữ validation.
- Đã kiểm unit source/activities/resume và release roundtrip activity; browser
  soạn câu → thử sai/đúng → bỏ giải thích → lưu draft → mở lại nội dung đạt.
  Có bản nháp kiểm thử local, không publish cho learner. Kho vẫn 217/213 rich.
- Typecheck/ESLint đạt. Hành trình learner ba viewport + reload/chuyển revision
  đạt khi chạy riêng. Lượt chạy chung từng gặp worker dev trả 500 lúc đăng
  nhập editor; không sửa auth để né lỗi và không ghi lượt đó là đạt.
- Tiếp theo: media manager ảnh/audio, registry layout còn thiếu, mẫu và biên
  soạn từng lô toàn kho, integration evidence/links, phát hành + full gates.
  Chưa hoàn tất scope; goal không được complete chỉ vì khối nền đã chạy.

### Lượt 12/09 — Thiên Lộ: lưu phiên lĩnh hội và giữ phiên bản — IN-REVIEW

- Reader learner lưu trang, câu tự diễn đạt, trạng thái mở lời thoại/mẫu và dấu
  vết đã từng mở mẫu vào IndexedDB theo owner generation/reset epoch. Xưởng
  preview không ghi vào phiên learner; không biến tự đối chiếu thành evidence.
- Phiên giữ snapshot nội dung/tiêu đề/mục tiêu để reload không trộn câu trả lời
  cũ với nội dung mới. Có lựa chọn bắt đầu bản cập nhật; lưu bản nháp cũ riêng
  trước khi chuyển. Chưa có màn duyệt lịch sử bản nháp; các bản này ở thiết bị,
  chưa sync đa thiết bị hoặc đưa vào gói backup xuất tay.
- Lỗi storage hiện thông báo rõ; ghi tuần tự tránh lượt gõ cũ ghi đè lượt mới.
  Cache dùng namespace riêng, không thay phiên Thử Luyện hoặc completion/FSRS.
- Đã kiểm: 16 test parser/trang/owner-cache; browser 3 viewport và Xưởng đạt,
  thêm nhập câu → mở/đóng mẫu → đợi lưu → reload → khôi phục, tiếp tục snapshot
  cũ → chọn bản cập nhật. Giữ 217 bài nền/213 rich, không đổi kho nội dung.
- Tiếp theo vẫn Thiên Lộ theo hồ sơ 0.2: media/assessment Xưởng, mẫu bài được
  biên soạn riêng và các lô toàn kho. Chưa hoàn tất đợt cải tiến hoặc nghiệm thu
  toàn module; full-check blocker HSK1 stale ở checkpoint trước còn nguyên.

### Lượt 11/09 — Triển khai lại Thiên Lộ theo hồ sơ 0.2, nền Ngọc Điện — IN-REVIEW

- Người dùng đã yêu cầu triển khai. Tích hợp 5 ảnh chủ đề nguyên bản (provenance
  tại `docs/THIEN_LO_ASSET_PROVENANCE.md`), 5 bố cục/chặng và bỏ tiêu đề lặp.
  Tiêu đề/mục tiêu learner nhận bản trình bày hiện hành; preview Xưởng lấy dữ
  liệu form. Thêm trang giữ lựa chọn ảnh; Xưởng soạn được layout/stage/art.
- Màn professional-1 mở được trong browser test, ảnh tải thật. Chưa tái hiện
  lỗi màn trống cũ nên chưa kết luận nguyên nhân gốc. Sửa ảnh chọn nhầm chủ đề
  nghề cho bài trường học và lỗi grid ảnh đè nội dung trên mobile.
- Đã kiểm: 17 test schema/nguồn/release, typecheck, ESLint; Playwright desktop
  1440×900, mobile 375×812, ngang 812×375, footer trong viewport, không tràn
  ngang/đè ảnh, mở lời thoại, Xưởng thêm/undo/chọn bố cục và preview đúng tiêu đề.
  Lượt cuối không có pageerror. Một lượt trước gặp lỗi kết nối worker dev 500;
  lượt chạy lại đạt. Full check vẫn dừng ở review HSK1 level-batch stale.
- Dữ liệu giữ được: 217 bài nền, 213 rich; test bảo toàn các bộ Hanzi/Pinyin/
  nghĩa Việt, tasks và character links. Không đổi ID, completion/FSRS/outbox;
  không thêm thành tích giả hay phát hành hàng loạt một bộ trang tự động.
- Audit ID nguồn mới: đủ liên kết 332 grammar row, 84 task, 195 topic và 1.096
  character; xem `docs/thien-lo-redesign-review/05-AUDIT-LIEN-KET-NGUON.md`.
  Đây chưa là kiểm độ sâu sư phạm; chưa audit riêng từ vựng/HSK0/revision D1.
- Tiếp theo vẫn Thiên Lộ: hoàn thiện phiên lĩnh hội và media/assessment Xưởng,
  biên soạn mẫu đại diện rồi từng lô toàn kho, thêm bài theo audit. Chưa hoàn
  thành hồ sơ 0.2: chưa ảnh riêng từng bài, chưa full asset manager, chưa soạn
  lại 217 bài, chưa nối evidence khối mới. Không USER-ACCEPTED toàn module.

### Lượt 11/09 — Đã chốt hồ sơ Thiên Lộ 0.2, cho phép mở rộng bài — IN-REVIEW

- Người dùng xác nhận toàn bộ tài liệu ổn; bổ sung quyền thêm bài tùy nhu cầu
  phủ HSK0–4, không giới hạn số lượng, miễn liên kết chặt với module khác.
- 217 bài/213 rich là inventory nền cần bảo toàn, không phải trần số bài.
  Audit coverage trước khi thêm; ID mới, prerequisite, nội dung, Xưởng và links
  phải đầy đủ; giữ completion/FSRS/phiên/outbox và không khóa ngược bài cũ.
- Hồ sơ 0.2 đã chốt thiết kế/phạm vi; điều kiện chờ duyệt tài liệu đã được đáp
  ứng. Chưa USER-ACCEPTED cho sản phẩm; lỗi professional-1 và code dở vẫn cần xử lý.

### Lượt 11/09 — Tạm dừng cải tiến Thiên Lộ, chờ duyệt hồ sơ 0.1 — IN-REVIEW

- Người dùng yêu cầu dừng triển khai, đọc/chỉnh/chốt tài liệu trước khi làm tiếp.
  Không tiếp tục sửa web, phát hành hoặc tích hợp ảnh cho tới khi được chốt.
- Hồ sơ tại `docs/thien-lo-redesign-review/00-DOC-TRUOC.md`, bản đọc `index.html`:
  phạm vi 217 bài + Xưởng, hiện trạng/đang dở/đề xuất, bài mẫu, ảnh và phụ lục.
- Sửa đổi Ngọc Điện sau mốc 1 còn dở, chưa được gate lại. Asset web chưa tích hợp;
  Xưởng chưa theo kịp schema layout/stage/art mới. Chưa kết luận lỗi màn trống
  professional-1 đã được giải quyết. Test mốc 1 không bảo chứng bản dở hiện tại.
- Chỉ làm tài liệu trong lượt tạm dừng; không rollback dữ liệu hoặc code user.

### Lượt 11/09 — Thiên Lộ / trình soạn trang Xưởng, mốc 1 — IN-REVIEW

- Người dùng bỏ bước duyệt ảnh, yêu cầu triển khai trực tiếp trên web.
- Thêm schema trang/khối, hai bố cục và bốn loại khối; Xưởng có thêm/xóa/đổi
  thứ tự, hoàn tác, nạp nội dung rich và preview dùng cùng renderer với người học.
- Thiên Lộ đọc cấu trúc đã phát hành; bài chưa có cấu trúc dùng nội dung rich
  hiện có để chia trang. Không coi đây là biên soạn lại toàn bộ bài. HSK0 giữ
  trình học âm chuyên biệt. Phần nháp tự đối chiếu không cấp evidence/mastery.
- Giữ trang khi merge ngữ cảnh, giữ character links khi thay bài; tra từ theo
  lesson nguồn. Không đổi ngân hàng Thử Luyện, completion/FSRS/outbox hay ID.
- Đã kiểm 213 rich chuyển trang, tổng 217 bài; typecheck, 17 test dữ liệu/release
  và browser learner desktop/mobile/landscape + nạp/xem trước Xưởng đạt.
- Full check còn lỗi cũ: hsk1-level-batch-local-study-review.json stale.
- Còn: quản lý/upload asset, bố cục chuyên sâu từng họ bài, lưu phiên lĩnh hội,
  assessment từng khối và biên soạn/kiểm duyệt nội dung từng bài. Ảnh riêng toàn
  kho chưa được sản xuất. Mốc này chờ người dùng test trước khi mở rộng.

### Lượt 11/09 — Thu gọn Thất Trụ / đề xuất ảnh Thiên Lộ — IN-REVIEW

- Thất Trụ gộp mỗi kỹ năng thành một hàng có số câu, lượt luyện, thanh và liên kết.
  Mốc 1.000 câu ghi chung; phần giải thích kho nội dung chuyển vào chi tiết.
- Typecheck và Playwright analytics đạt, kiểm tra đủ bảy kỹ năng ở 1366×643.
  Không thay dữ liệu học hoặc cách tính thanh.
- Người dùng yêu cầu xem/chốt bộ ảnh Thiên Lộ trước khi triển khai thêm.
  Chỉ tạo ảnh đề xuất khác bố cục/phong cách; chờ người dùng chọn.

### Lượt 11/09 — Thanh Thất Trụ · phát hành ngữ cảnh · giao diện học Thiên Lộ — IN-REVIEW

- Khôi phục thanh mốc luyện 1.000 câu, chung định nghĩa ở hai bảng; số câu/mốc
  hiển thị rõ, không gọi là tỷ lệ thành thạo hoặc toàn bộ học liệu.
- Phát hành local 213 bộ bổ sung ngữ cảnh; 6.019 vị trí luyện / 1.620 câu mẫu nguồn.
  Đầu đọc nhận đủ bộ và đáp án riêng. Giữ nguyên 217 bài và 213/213 rich.
- Giao diện chuẩn bị/làm bài dùng ngọc trầm và vàng nhạt; chỉ phần giữa cuộn,
  thanh bước và CTA trong viewport; chọn từng nhiệm vụ vận dụng thay danh sách dài.
- Typecheck/ESLint, 24 test release/consumer và ba Playwright đạt; full check còn
  lỗi HSK1 review stale cũ. Có backup release; dữ liệu học/FSRS/phiên/outbox giữ nguyên.
- Chi tiết: CURRICULUM_STUDIO_IMPORT.md. Chờ người dùng test, chưa USER-ACCEPTED.

### Lượt 11/09 — Thiên Cơ Kính · Thất Trụ / học liệu Studio — IN-REVIEW

- Dùng chung nguồn tiến độ, câu đã luyện, ngày truy cập và nghịch cảnh cho hai bảng.
- Bỏ thanh tương đối gây hiểu nhầm thành thạo; tách kho 217 bài/2.016 mục từ khỏi lịch sử luyện.
- Nhập 2.224 bản nháp vào editor demo: 2.011 mục từ + 213 bộ ngữ cảnh,
  6.019 vị trí luyện trên 1.620 câu mẫu nguồn khác nhau. Chưa phát hành learner runtime.
- Đã kiểm TypeScript, ESLint, 11 test analytics; test bảo toàn liên kết nội dung đạt;
  rehearsal/idempotency/foreign-key và 34 bảng dữ liệu ngoài nội dung giữ nguyên.
- Giữ HSK0 4/4 và HSK1–4 rich 213/213. Chi tiết: CURRICULUM_STUDIO_IMPORT.md.
- Full check vẫn có blocker HSK1 review stale đã ghi ở lượt trước. Chờ người dùng test.


### Lượt 10/09 — Vạn Âm Điện / Ký Ức Trận — IN-REVIEW

- Thu giọng vừa viewport laptop; dừng thu rõ nghĩa, khóa nghe lại khi ghi.
- Hoàn thiện A Ngọc Lệnh, sửa lớp che nút nghe, forecast quá hạn và empty state.
- Typecheck/ESLint, 31 Vitest và 10 hành trình Playwright đạt qua các lượt
  sửa và chạy lại. Browser desktop/mobile đã đối chiếu; không reset dữ liệu.
- Full check còn vướng HSK1 level-batch review stale có trước lượt này.
- Chi tiết: VOICE_MEMORY_JADE_CHECKPOINT.md. Chờ người dùng test hai module.

### Lượt 10/09 — Nghịch Cảnh Lục · Thiên Văn Đài — IN-REVIEW

- Người dùng xác nhận bộ B Thiên Văn Đài; nâng cấp tinh đồ, đủ mọi kỹ năng,
  ưu tiên, nguồn/trend và toàn bộ các pha luyện. Nền tinh vân nguyên bản.
- Đã kiểm typecheck, ESLint, 3 file/13 Vitest; browser demo đủ 5 câu qua bốn
  pha, retry; mobile 375 không tràn ngang, CTA giữ trong viewport.
- Năm lượt test dùng gợi ý nên giữ lại luyện, không thành recall độc lập.
  Không reset/migration; giữ HSK0 4/4 và HSK1–4 rich 213/213.
- Full check vẫn bị chặn bởi hsk1-level-batch-local-study-review.json stale.
- Người dùng yêu cầu commit/push module lên origin. Chi tiết và provenance:
  REMEDIATION_CELESTIAL_DESIGN.md. Tiếp theo: người dùng review /mistakes.

### Lượt 09/09 — Font nhất quán và hiệu ứng trang giới thiệu — IN-REVIEW

- Sửa khai báo Georgia còn sót trong PublicLanding.css gây ghi đè font khi
  thứ tự tải CSS khác nhau; browser xác nhận headings dùng Hanzi Editorial.
- Thêm client enhancement IntersectionObserver: thẻ xuất hiện một lần khi
  cuộn; hero mở đầu, hover thẻ/nút và mở details có chuyển động ngắn.
  Nội dung không phụ thuộc animation để hiển thị; cleanup observer/animation.
- Typecheck và targeted ESLint đạt; browser mở details giữ URL. Emulate
  reduced-motion xác nhận hero animation none, transition 0s; đã khôi phục.
- Giữ nội dung và dữ liệu học; chỉ giới thiệu được thêm hiệu ứng. Chờ review.

### Lượt 09/09 — Cân sáng bốn nền giới thiệu — IN-REVIEW

- Giữ Thiên Lộ làm mốc; tăng lớp phủ Ký Ức Trận/Vạn Âm Điện, giảm lớp
  phủ và nâng sáng riêng ảnh Thần Văn Lô để chi tiết không chìm.
- Đã đối chiếu browser desktop bốn ô cùng khung; typecheck đạt.
- Chỉ sửa CSS lớp nền, không đổi ảnh gốc, chữ, dữ liệu học hay inventory.
  Tiếp theo: người dùng review độ sáng /welcome; chưa USER-ACCEPTED.

### Lượt 09/09 — Bổ sung cảnh riêng theo phản hồi — IN-REVIEW

- Thay nền trơn bằng sáu ảnh image_gen mới: Ký Ức Trận, Vạn Âm Điện,
  ba thẻ Học/Luyện/Ôn và CTA cuối. Prompt và đường dẫn lưu trong
  WELCOME_AUTH_ASSET_PROVENANCE.md; mỗi vị trí dùng một cảnh riêng.
- Gỡ nút sáng/tối nổi khỏi app/layout.tsx theo yêu cầu toàn web.
- Đã kiểm typecheck, ESLint layout và diff check; browser desktop xác nhận
  cảnh mới, mobile 375 không tràn ngang và không còn nút theme trong DOM.
- Không đổi dữ liệu học, ID hoặc storage; giữ HSK0 4/4, HSK1–4 rich 213/213.
  Tiếp theo: người dùng xem lại trang giới thiệu. Chưa USER-ACCEPTED.

### Lượt 09/09 — Tinh chỉnh giới thiệu, footer và chính sách — IN-REVIEW

- Người học thấy: bỏ cảnh cổng lặp trên ba thẻ học và CTA cuối; dùng nền ngọc
  phân biệt. Footer chung chia nhóm hành trình, chính sách và dữ liệu.
- Điều khoản, quyền riêng tư và dữ liệu giọng nói có bố cục đọc thống nhất,
  mục lục, tiêu đề, khung lưu ý và footer; giữ nguyên nội dung công bố hiện có.
- Khám phá tại 12 ô mở mô tả ngay tại chỗ bằng details, có CTA bắt đầu riêng;
  không đi vào route module rồi bị first-run đưa về trang giới thiệu.
- Đã kiểm: typecheck, targeted ESLint, diff check và 3 file/16 Vitest đạt.
  Browser desktop mở chi tiết giữ URL, footer và điều khoản; mobile 375 kiểm
  welcome, privacy, voice-data, không tràn ngang (scrollWidth 360).
- Không đổi nội dung/ID, D1 hoặc browser progress; inventory HSK0 4/4,
  HSK1–4 rich 213/213 được giữ. Không sửa reports/output, không push/deploy.
- Tiếp theo: người dùng test /welcome và ba trang chính sách. Chưa nghiệm thu.

### Lượt 09/09 — Giới thiệu/tài khoản sửa theo phản hồi — IN-REVIEW

- Thay font serif hệ thống bằng Noto Serif có tiếng Việt, self-host và kèm OFL.
  Browser xác nhận tiêu đề dùng Hanzi Editorial; các dấu ở Bắt đầu hành trình,
  Xin chào đầu tiên và tiêu đề welcome hiển thị liền chữ trong ảnh kiểm mới.
- Bổ sung tám điểm đến bên cạnh bốn khu luyện: trung tâm hôm nay, khảo sát,
  thư viện, từ điển, luyện lỗi, luyện đề, chỉ số và hồ sơ; mô tả/route đối chiếu
  AppShell và systemLexicon. Không gọi bốn module là toàn bộ hệ thống.
- Nền v2 tái tạo từ concept bằng imagegen; chỉnh tỷ lệ hero, cảnh nền,
  khung preview, khung tài khoản và chuyển đăng ký bằng liên kết dưới form.
- Typecheck, targeted ESLint, 3 file/16 Vitest đạt. Browser desktop/mobile375
  kiểm render, chuyển đăng ký và font; welcome không tràn ngang (scrollWidth360).
  Lỗi cắt thiếu component trong thao tác sửa đã khôi phục; signin render lại.
- Chưa đạt đối chiếu pixel 100%; cảnh AI vẫn có sai khác, phần mô tả được mở
  rộng theo yêu cầu, khôi phục mật khẩu trong concept chưa có backend tương ứng.
  Không đánh dấu USER-ACCEPTED; chờ người dùng review hai trang.
- Không đổi nội dung/ID, D1, FSRS, progress hoặc inventory HSK0 4/4 và
  HSK1–4 rich 213/213. Không chỉnh reports/output, không commit/push.

### Lượt 09/09 — Trang giới thiệu và tài khoản, tiếp quản task — IN-REVIEW

- Khôi phục yêu cầu cuối từ lịch sử: triển khai hai mẫu giới thiệu/tài khoản;
  Thiên Cơ Kính và bài học Thiên Lộ chờ người dùng chọn sau.
- Trang giới thiệu dùng GuildLanding qua PublicLanding cho cả welcome và
  first-run: hero cổng ngọc, năm vùng học, bốn module, bảy kỹ năng, FAQ và CTA.
  Tài khoản dùng nền học viện, biểu mẫu đăng nhập/đăng ký và demo mở rộng.
- Sửa CSS kế thừa đẩy ảnh tài khoản xuống, nhãn form, header tránh nút theme,
  hero trên điện thoại ngắn. Giữ nguyên API và chính sách mật khẩu hiện hành.
- Đã kiểm: typecheck, targeted ESLint, 3 file/16 Vitest đạt. Browser thật
  desktop và 375×812 mở welcome/signin, chuyển đăng ký, CTA tới onboarding
  và xác nhận bước chọn mục tiêu xuất hiện. Chưa kiểm đăng ký tài khoản mới,
  OAuth, toàn bộ light mode hoặc full E2E; không tuyên bố nghiệm thu các luồng đó.
- Không sửa inventory/nội dung: HSK0 4/4, HSK1–4 rich 213/213; không reset
  D1/browser progress, FSRS, session hoặc outbox. Không sửa reports/output.
- Tiếp theo: người dùng test /welcome và /signin trên localhost:3000.
- Gate toàn repo: `npm run check` dừng ở
  `content/review/hsk1-level-batch-local-study-review.json is stale`, ngoài
  lát cắt giao diện này. Không tái sinh dữ liệu để che lỗi.


### Lượt 09/09 — Vạn Âm Điện tinh chỉnh chiều sâu · IN-REVIEW

- Tách vòng cộng hưởng và câu luyện thành hai vùng desktop, thêm ánh ngọc,
  mặt vòng nổi, đế sáng và hướng dẫn theo bước nghe; mobile xếp dọc.
- Ripple hai lớp khi phát/thu, processing xoay; chuyển nội dung 300ms,
  phản hồi ánh sáng CTA khi hover. Reduced-motion tắt animation; không
  mô phỏng waveform hay kết quả chấm bằng hiệu ứng.
- Browser 1321×643 arena350/350 CTA615; 375×812 arena392/392 CTA678,
  không tràn ngang ở câu hiện tại. Playback xác nhận playing/ripple.
- Typecheck và 17 tests selector/library đạt. Chưa kiểm thu mic/Azure,
  câu dài mọi bài, light mode hoặc mọi trạng thái kết quả trong lượt này.
- Giữ nguyên dữ liệu và điều kiện mở bài. Chờ người dùng review Vạn Âm Điện;
  không tuyên bố giống 100% hoặc USER-ACCEPTED.

### Lượt 09/09 — Vạn Âm Điện A Cộng Hưởng Ngọc · IN-REVIEW

- Áp dụng khung jade/gold, vòng SVG microphone 48 vạch. Ripple theo playback/
  recording, xoay theo requesting/uploading, idle dừng; reduced-motion tắt.
  Đây là animation trạng thái, không phải waveform/RMS hay điểm âm học giả.
- Kho bài dùng unlocked/passed từ resolveLearningPathAuthority của Thiên Lộ;
  không chặn bằng startingLevel cũ khi đã có authority. Giữ passed riêng,
  source lesson IDs, nội dung hợp lệ, không tự hoàn thành hoặc cấp mastery.
  Browser tài khoản hiện tại hiển thị 55 bài; chia 6 bài/trang, đã thử trang 2.
- Browser 1321×643 arena348/348, CTA615; mobile375×812 arena390/390,
  CTA678 trên nav; không tràn ngang. Nghe mẫu xác nhận data-state playing,
  jade-voice-ripple; chưa thu microphone hoặc gửi audio Azure trong kiểm tra.
- Typecheck đạt trước chỉnh fallback nhỏ; 21 tests selector/library/report/
  completion đạt. Không sửa DB, inventory, FSRS, reports/output, không push.
- Chưa tuyên bố pixel-identical A hoặc nghiệm thu end-to-end microphone;
  tiếp theo người dùng test đúng module này, đặc biệt cấp quyền/thu/feedback.

### Lượt 09/09 — SYS trạng thái tương tác và preview · IN-REVIEW

- Bỏ selected cố định ở mục 3. Hover chỉ cho chuột; keyboard focus có viền
  riêng. Preview đổi theo hover/focus cả 4 mục, CTA mở đúng mục đang xem.
- Bổ sung roving tabindex/phím mũi tên cho motion radiogroup; footer không
  ép nhỏ icon, giá trị preview dài xuống dòng trong giới hạn cột.
- Browser laptop 1321×643: xác nhận preview Hành trình, Âm thanh, Tài khoản
  có dữ liệu thật; mục 3 border mặc định khi mục 2 focus; không tràn ngang.
- Không sửa dữ liệu, sync, FSRS, inventory hay điều kiện xác nhận reset.
  Tiếp theo: người dùng test SYS; không đánh dấu USER-ACCEPTED.

### Lượt 09/09 — SYS Công Hội Mạo Hiểm Giả · IN-REVIEW

- Đã đối chiếu cả 5 ảnh I tại cau-hinh-he-thong. ProfilePage được tách bằng
  query view thành tổng quan, hành trình, hiển thị, âm thanh, tài khoản;
  SystemGuild.css cô lập bố cục. Tổng quan hai cột, tiêu đề lớn, preview;
  mục nâng cao và vùng nguy hiểm dùng disclosure, footer giữ trong viewport.
- Giữ nguyên handler profile, audio/motion, export/import, sync, reset/delete
  và điều kiện xác nhận. Không sửa DB hoặc inventory HSK0 4/4, HSK1–4 rich
  213/213; không gửi grade hay chủ động đặt lại dữ liệu khi kiểm tra.
- Typecheck, ESLint ProfilePage, diff-check đạt; 20 tests preferences,
  recovery/import, keyboard đạt. Full check vẫn fail do manifest
  hsk1-level-batch-local-study-review.json stale (ngoài phạm vi SYS).
- Browser đã mở 5 màn, thử laptop 1321×643 và mobile 375×812; không tràn
  ngang ở các phép đo. Server local từng dừng, đã bật lại vinext cổng 3000.
  Chưa xác nhận mọi trạng thái hết cuộn; chưa kiểm đủ light mode.
- Chưa khớp 100%: mẫu có nhắc học, hành vi mở Thiên Lộ, contrast/cỡ chữ,
  chọn theme trong panel và kiểm tra microphone chưa có consumer tương ứng
  trong ProfilePage. Chưa thêm nút giả. Tiếp theo vẫn là SYS: hoàn thiện các
  vertical slice chức năng này rồi đối chiếu lại, không chuyển module khác.

### Lượt 09/09 — MEM sửa từ nhiều chữ bị chồng · IN-REVIEW

- Thay ký tự ⌄ trông như chữ v bằng Lucide Lightbulb. Vòng chữ dùng
  inline-size container; cỡ chữ chia theo số Unicode code points, nowrap,
  không cho từ hai chữ rơi xuống Pinyin/câu hỏi. Không thay nội dung hoặc FSRS.
- Browser kiểm đúng account thẻ说话: laptop1321×643 truy hồi chữ161px trong
  vòng208px; đối chiếu chữ kết thúc260 trước Pinyin300, nội dung346/346.
  Mobile375×812 chữ kết thúc316 trước Pinyin373, nội dung502/502, CTA734
  trên nav746; không tràn ngang. Chỉ reveal, không gửi grade.
- Typecheck và6 tests rating/presentation đạt; thêm8 tests render cho1–4 chữ,
  trước/sau reveal, đều đạt. Chưa tuyên bố toàn module100%; inventory,
  lịch ôn và DB giữ nguyên. Không commit/push.

### Lượt 08/09 — Ký Ức Trận, Ngọc Lệnh · IN-REVIEW

- Đã xem cả bốn ảnh MEM A-ngoc-lenh. Sửa bố cục phiên ôn bằng hàng toolbar,
  nội dung co giãn và action riêng; bỏ min-height620 gây tràn laptop.
  Chữ Hán serif, vòng chữ/viên ngọc, câu hỏi, Pinyin/nghĩa/ví dụ theo trục
  giữa. Bốn nút đánh giá có icon Lucide và màu riêng, giữ nhãn/hint lịch thật.
- Sảnh laptop cân lại ba bảng và CTA; kết trận giảm chiều cao tối thiểu và
  khoảng cách. MEM-04 mới kiểm code, chưa chạy kết thúc hàng đợi thật.
- Browser Minh An 1321×643: sảnh573/573; truy hồi nội dung411/411, CTA
  bottom621; đối chiếu sau sửa nội dung346/346, ngọc top143 trong vùng bắt đầu142,
  action bottom621. Mobile375×812 đối chiếu496/496, action bottom734 trên
  nav746, không tràn ngang. Đã xem thêm1672×941; chưa pixel-perfect100%.
- Chỉ mở thẻ/hiện đáp án, không gửi grade hoặc đổi lịch FSRS. Không seed/reset,
  không sửa DB/curriculum, giữ inventoryHSK0 4/4 vàHSK1–4 213/213rich.
  Câu ví dụ thẻ account还 hiện chỉ lặp mục từ; chưa sửa dữ liệu nguồn trong slice UI.
- Typecheck và8/8 tests rating/presentation/scheduler đạt vòng đầu; kiểm lại
  sau icon. Không push/commit hoặc sửa reports/output. Tiếp theo chỉ MEM:
  dữ liệu ví dụ account, MEM-04/browser, ornament và viewport khác.

### Lượt 08/09 — LEX chọn bài + REM tái đấu/giải lỗi · IN-REVIEW

- LEX: thay native select dài bằng dialog có tìm tên không dấu, Escape và
  danh sách cuộn giới hạn viewport; giữ lesson IDs, URL và dữ liệu tra cứu.
- REM-02/03: tách header/nội dung/actions/progress thành các hàng riêng;
  thống nhất cỡ chữ đáp án Việt, chữ Hán ngắn giữ display type. Gợi ý trong
  luồng nội dung, không còn đặt đè lên nút. Không đổi REM-01/04 trong slice này.
- Account nhận đáp án đúng/lời giải của bài đã phát hành chỉ sau chấm server;
  lưu kèm receipt để retry idempotent. Không đưa answer key vào queue, không
  đổi scoring, activity version, hint policy hay eligibility/mastery.
- Câu 这里人很多。 có distractor cùng ngữ cảnh, hint phân tích và giải thích
  đối chiếu nhiều/ít, đây/kia, phủ định. Support local AI-assisted giữ
  humanReviewed=false, chỉ áp dụng nếu cả prompt và đáp án gốc trùng khớp.
  Các câu khác vẫn cần audit distractor/hint; chưa sửa toàn bộ kho câu.
- Browser Minh An 1321×643: picker nằm trong viewport, tìm Xin chao và chọn
  boot-2 đúng. REM attempt mở hint: nội dung 341/341, hint bottom479.6 trước
  actions top511; feedback 341/341, card310/310. 375×812 không tràn ngang,
  feedback dài cuộn giữa; CTA bottom690 trên mobile nav. Đã gửi một lượt có
  hint, đáp án đúng và lời giải hiện đầy đủ; lỗi vẫn mở, không tăng mastery.
- Typecheck, targeted ESLint và targeted tests đã qua ở vòng kiểm.
  Picker 375×812: bounds x16–359/y96–716; Escape đóng và trả focus về nút mở.
  Regression receipt retry và picker: 18/18; scoring/support: 8/8.
  Typecheck cuối đạt. Full check chưa chạy lại trong slice nhỏ này.
  Giữ
  inventory HSK0 4/4 (rich0/4), HSK1–4 213/213 rich; không sửa curriculum,
  seed/reset DB, .wrangler, reports/output. Không commit/push.
- Chưa đạt hoặc chứng nhận 100% ảnh mẫu. Tiếp theo: REM còn lại và audit
  câu hỏi/hint theo nguồn; không đánh dấu USER-ACCEPTED.

### Lượt 08/09 — Tàng Tự Khố, vòng sửa theo ảnh phản hồi · IN-REVIEW

- Người dùng chưa chấp nhận cả LEX-01–04. Không ghi đạt 100%.
- LEX-01 có bản đồ minh họa riêng, chữ/cờ và liên kết tra cứu là HTML thật.
  Provenance/prompt: `docs/LEX_ATLAS_ASSET_PROVENANCE.md`. Cân lại thẻ và
  đề xuất để CTA không rơi dưới fold; không giấu thanh cuộn bằng CSS toàn cục.
- LEX-02/03/04 dùng vị trí Ngọc Lệnh nhất quán cả laptop thấp; CTA vát góc,
  nguồn bài tách riêng. LEX-03 có bộ lọc Đã gặp từ completion thật.
- LEX-04: hàng chữ/Pinyin/nghĩa/chủ đề/nguồn/audio, checkbox chọn mục,
  chọn theo trang/bỏ chọn. ResizeObserver tính số mục vừa vùng kết quả.
  Tự ôn có dialog native, mở nghĩa và bước tiếp; không ghi mastery/FSRS/XP.
- Browser 1321×643 với sidebar mở: LEX-01 module 573/573, thẻ 308/308;
  LEX-02 và LEX-03 không tràn ở trạng thái đã đo; LEX-04 kết quả 184/184
  sau giảm còn 2 hàng, Ngọc Lệnh 406/406. 1672×941 LEX-01 thẻ top=470.19
  so với mẫu khoảng 471; module 871/871, đề xuất bottom=913.
  LEX-04 desktop không tràn ở lượt đo; 375×812 không tràn ngang,
  kết quả 234/234, CTA Ngọc Lệnh bottom=698 trên thanh mobile.
- Browser đã kiểm chọn 吃 → tự ôn → mở nghĩa → kết thúc; không sửa saved,
  completion hay DB khi smoke. Typecheck, targeted ESLint và 29/29 tests đạt.
- API `/api/content/runtime?projection=vocabulary` trả 503
  CONTENT_RUNTIME_UNAVAILABLE thật. Không che thông báo hoặc bịa dữ liệu.
  Kho từ đã phát hành và demo vẫn dùng được; chưa xác định nguyên nhân 503.
- Inventory giữ HSK0 4/4 (rich 0/4), HSK1–4 213/213 rich; không sửa
  .wrangler, reports/output, không commit/push. Chưa kiểm mọi văn bản dài,
  light theme/zoom lớn; màn cực thấp có thể cần cuộn nội dung thực.
- Tiếp theo chỉ tiếp tục Tàng Tự Khố: typography/ornament, dữ liệu cần xem lại
  của account và lỗi nguồn mới. Chưa có chứng cứ pixel-perfect 100%.

### Lượt 08/09 — Tàng Tự Khố LEX-01–04 · IN-REVIEW

- Theo lựa chọn người dùng: LEX-01 I Công Hội Mạo Hiểm; LEX-02/03/04 A Ngọc Lệnh.
  Tách khám phá, hồ sơ, tra theo bài và ngọc giản đã lưu; khung Ngọc Lệnh SVG
  nguyên bản, chữ Hán serif, danh sách phân trang và nhóm cốt lõi/mở rộng.
- Giữ tìm Hanzi/Pinyin/nghĩa Việt, deep lookup, nguồn bài, câu ví dụ đã phát hành,
  lưu mục từ và journey receipt. Sửa mất focus khi nhập ở khám phá, mục từ cũ
  sau đổi phạm vi và từ liên quan trùng mặt chữ. Account dùng completion
  authoritative; không dùng mistakes local để kết luận account không có lỗi.
- Browser account Minh An: tìm 学习 → hồ sơ; đổi Bốn thanh điệu → Xin chào
  đầu tiên, preview đổi đúng 好; danh sách 100 mục đã lưu và phân trang.
  1672×941: hồ sơ/tra theo bài/đã lưu không tràn module trong trạng thái đã đo.
  1366×643: đã lưu, kết quả và Ngọc Lệnh hết tràn. 375×812: không tràn ngang,
  chuyển Danh sách/Ngọc lệnh, CTA bottom=698 trên điều hướng mobile.
- Typecheck, targeted ESLint, 26/26 tests và diff check đạt ở lượt kiểm.
  Test source contract cập nhật từ load-more cũ sang pagination của consumer mới.
  Full check chưa được chứng nhận: blocker review manifest inherited vẫn còn.
- Không sửa DB/FSRS/completion hoặc curriculum IDs; giữ HSK0 4/4 (rich 0/4),
  HSK1–4 213/213 rich. Không sửa reports/output, không commit/push.
- Chưa pixel-perfect: LEX-01 còn dùng nền cảnh chung, ornament/CTA chưa trùng
  mẫu hoàn toàn; chưa có flow ôn mục chọn riêng cho account. Published Studio
  vocabulary đang báo gián đoạn, kho đã phát hành vẫn dùng được. Màn thấp
  812×375 còn cuộn; chưa chứng nhận zoom lớn/light theme. Tiếp theo chỉ tiếp tục
  đối chiếu Tàng Tự Khố, không USER-ACCEPTED và không tự ghi phần trăm.

### Lượt 08/09 — Màn vừa viewport · IN-REVIEW

- Bỏ ba khối nguồn luyện và mạch gần nhất dưới sảnh theo yêu cầu; không xóa
  session/progress. Resume vẫn qua CTA chính. Sảnh không còn phần cuộn bên dưới.
- Kho chữ dùng ResizeObserver tính số thẻ vừa vùng trống và phân trang; mobile
  dùng select HSK thay thanh lọc cuộn ngang. Laptop 1366×643: 4 thẻ/trang.
- Nhìn Xuyên: rút gọn hướng dẫn, phân trang 6 nét; màn nhỏ đổi giữa Phân lớp,
  Hình chữ, Thứ tự nét. Đoán Nét và bảng trợ giúp viết cân lại chiều cao.
- Văn Cảnh mobile đổi bảng câu hỏi/bản đồ; kết quả đổi bảng kết quả/hành trình.
  Không giấu thanh cuộn đơn thuần hay bỏ các lựa chọn trả lời.
- Browser kiểm sảnh 1366×643 và 390×844; Nhìn Xuyên/Đoán Nét laptop;
  Theo Mẫu/Tự Viết/Văn Cảnh mobile; kết quả mobile và laptop. Các trạng thái
  đã đo không có vùng overflow-y auto/scroll dư nội dung. Kho laptop cũng đạt.
- Smoke tiếp tục phiên 好 của Minh An qua fallback bàn phím, kết thúc một vòng;
  không ghi handwriting recall độc lập. DB/curriculum/FSRS không bị chỉnh,
  inventory HSK0 4/4 (rich 0/4), HSK1–4 213/213 rich giữ nguyên.
- Targeted tests 29/29 đạt; full check vẫn có blocker review manifest cũ.
- Chưa đạt pixel-perfect 100%; chưa kiểm mọi chữ dài, viewport thấp/zoom lớn.
  Tiếp theo chỉ đối chiếu Thần Văn Lô; chưa USER-ACCEPTED, không push.

### Lượt 08/09 — Kho Chọn Chữ · IN-REVIEW

- Thẻ chữ lớn dùng cùng stroke geometry với bàn viết; thêm ngữ cảnh thật,
  bảng xem trước và trạng thái chọn. Không gắn nhãn mastery/đã kiểm nét giả.
- Phân trang 12 chữ thay giới hạn 240 kết quả; chọn tối đa 5 và giữ lựa chọn
  khi đổi trang/lọc. Có trạng thái tìm không thấy và focus bàn phím.
- Header GLYPH-01–08 theo route/phase; kho mở qua `?view=picker`.
- Typecheck, targeted ESLint và 29/29 tests đạt; diff check đạt. Full check
  vẫn chưa được chứng nhận do lỗi inherited review manifest nêu bên dưới.
- Không thay DB, curriculum IDs hay tiến độ; giữ inventory HSK0 4/4 và
  HSK1–4 213/213 rich. Không push hoặc sửa reports/output.
- Browser Minh An: kiểm 1672×941, chọn chữ rồi đổi trang vẫn giữ lựa chọn;
  tìm không thấy có hướng dẫn. 390×844 scrollWidth=390, footer bottom=760
  nằm trên điều hướng mobile. Đã sửa preview tràn ngang và vị trí bắt đầu bảng.
- Dev server đã bật lại tại localhost:3000. Chưa đạt 100% ảnh mẫu; ornament,
  CTA desktop và typography còn khác, không ghi USER-ACCEPTED.

### Lượt 08/09 — Công Hội, vòng đối chiếu tiếp theo · IN-REVIEW

- Người dùng chưa chấp nhận thiết kế. Dựng lại cờ/thanh treo/tua bằng SVG nguyên
  bản và khung ornament co giãn; dùng `GuildReference.css` scoped cho module.
- Sảnh đối chiếu 1672×941: CTA nằm ở y=883, không tràn ngang. Các hình và số nét
  vẫn từ dữ liệu chữ đang học, không thay bằng số minh họa của ảnh thiết kế.
- Bàn viết: hai cột rộng, nét dẫn mảnh, nút hoàn tác/viết lại giữ dấu trợ giúp;
  Tự Viết có pinyin/nghĩa và mẫu ẩn. Tọa độ pointer đổi qua SVG screen matrix để
  không lệch nét khi SVG có khoảng đệm do giữ tỷ lệ.
- Văn Cảnh: bản đồ từ từ released vocabulary, loại từ đơn/trùng, che chữ đang
  hỏi trước trả lời; bỏ đáp án lộ ở footer. Kết quả đổi sang bố cục hai cột,
  số liệu phiên thật; không có hình mẫu giả gắn nhãn bài viết người dùng đã lưu.
- Browser đã kiểm sảnh, Nhìn Xuyên, Đoán Nét, Theo Mẫu, Tự Viết, Văn Cảnh và
  kết quả; kho chọn chữ vẫn cần kiểm lại sau CSS vòng này. 390×844 phát hiện
  rail collapsed để dư 86 px; đã sửa và đo lại left=0.
- Smoke trên Minh An có hoàn tất một vòng chữ 好 bằng guided trợ giúp và recall
  bàn phím; kết quả 1 chữ cần luyện lại, không ghi evidence viết độc lập.
- Tests targeted 20/20 đạt. `npm run check` chạy lại vẫn fail ở inherited
  `content/review/hsk1-level-batch-local-study-review.json is stale`; không đổi
  học liệu/hash để lách gate. Typecheck/lint cuối vòng được chạy riêng.
- Giữ DB, owner, IDs, FSRS, completion cũ và inventory HSK0 4/4 (rich 0/4),
  HSK1–4 213/213 rich; không push, không sửa reports/output.
- **Chưa đạt 100% ảnh mẫu.** Cờ vẫn là vector chứ không phải vải ảnh gốc, font,
  ornament và các chi tiết khung/session còn khác. Tiếp theo chỉ Thần Văn Lô:
  tiếp tục đối chiếu từng màn ở cả kích thước ảnh gốc lẫn viewport người dùng.

### Lượt 07/09 — Typography / điều hướng / Công Hội · IN-REVIEW

- Ký Ức Trận: bỏ serif khỏi chữ UI trong vùng memory, dùng cùng sans stack hệ thống.
- Điều hướng: nút 44 px có nhãn, focus và aria-expanded/controls; Nghịch Cảnh Lục
  dùng cùng rail, bỏ override giấu nút. Browser xác nhận mở 258 px / thu 86 px,
  giữ trạng thái qua route; breakpoint 1100 px vẫn mở được, không tràn ngang.
- Thần Văn Lô: triển khai bước đầu hướng I — Công Hội vào sảnh, kho chọn chữ,
  Nhìn Xuyên và Đoán Nét; nền phong cảnh tạo từ ảnh người dùng chọn, UI vẫn là
  HTML thật. Chữ lớn và bảng thứ tự nét dùng stroke data hiện có, không tạo nét AI.
- Browser 1366×607: CTA sảnh nhìn thấy, action dock phiên nằm trong viewport;
  sửa vị trí cuộn khi chuyển pha. Mobile 390×844 không tràn ngang ở sảnh.
- Gate: 11/11 tests characterForgeSession/hanziStrokeData; targeted ESLint và
  typecheck đạt sau lượt chỉnh cuối. Browser xác nhận heading Ký Ức Trận dùng
  Segoe UI sans stack. Full check chưa được chứng nhận lại;
  lỗi baseline SHA nội dung ở lượt trước vẫn chưa nằm trong scope này.
- Không sửa curriculum IDs, schema, DB hay reset dữ liệu. Inventory giữ nguyên
  HSK0 4/4 (rich 0/4), HSK1–4 213/213 rich. Browser smoke có tạo phiên một chữ
  trên tài khoản editor đang đăng nhập, dừng ở Đoán Nét; không ghi nhận hoàn tất.
- **Chưa đạt 100% ảnh mẫu.** Bốn màn sau mới nhận theme, chưa nghiệm thu visual;
  cờ/ornament và tỷ lệ sảnh còn khác. Không ghi USER-ACCEPTED. Tiếp theo vẫn là
  Thần Văn Lô: hoàn thiện GLYPH-05–08 và đối chiếu đủ 8 màn, không mở module mới.

### Lượt 07/09 — Kiểm tra hành trình và trạng thái dữ liệu · IN-REVIEW

- Người dùng yêu cầu tự thực hiện kiểm tra/sửa tiếp; không coi yêu cầu này là
  xác nhận `USER-ACCEPTED`, hoặc quyền push/deploy.
- Sửa Reader nộp lượt đọc lại có hỗ trợ: chấp nhận ledger tiếp xúc ban đầu,
  không di chuyển ledger sang phiên mới, không nâng thành recall độc lập.
  Regression tái hiện lỗi trước sửa; sau sửa Reader/routes/projection và các
  kiểm tra evidence/reader demo đạt 42/42; nhóm lesson/attempt/review/mistakes/XP
  đạt 55/55. Typecheck và ESLint ba file runtime/test đã sửa đạt.
- Dashboard dùng cùng nguồn XP tài khoản cho giá trị và phần trăm; 480/120 XP
  hiện 100% mục tiêu thay vì 8%. Thiếu evidence không còn ghi “Đang hợp nhất”.
  Ô chưa lấy thống kê ôn không khẳng định “chưa có lượt ôn”, dẫn tới lịch ôn.
- Browser trong ứng dụng xác nhận Minh An, 7.400 XP, trạng thái mới và hàng ôn
  12 thẻ. Reload sạch không có lỗi runtime; khi sửa hàng loạt học liệu trong
  dev từng có lỗi context Fast Refresh, được ghi nhận chứ chưa coi đã sửa HMR.
- Backup D1 trước audit ở `.wrangler/demo-backups/`; rehearsal phục hồi sửa pin
  cũ 21 migration/39 bảng thành 23/40, kiểm thêm đủ bốn trigger assignment mới.
  `npm run test:restore` đạt integrity, foreign keys và post-restore write.
- `npm run check` **chưa đạt**: dừng ở `content:hsk1:level-batch -- --check`,
  inherited review selectedPayloadSha256 khác bản pin. Đã xác định nhiều file
  đang trộn LF/CRLF; không sửa hash/claim hay sinh lại hàng loạt để bỏ qua gate.
  Git diff học liệu không có thay đổi nội dung; không giữ thay đổi gitattributes.
- Dữ liệu giữ được: HSK0 4/4 (rich 0/4), HSK1–4 213/213 rich; không sửa ID,
  xóa progress, đổi credential/role hoặc đặt điểm giọng nói giả.
- **Tiếp theo đúng một slice:** thống kê Ôn tài khoản. `AuthenticatedReviewPage`
  đang dùng `state.fsrsCards` cho tổng thẻ/phân bố/dự báo và lệnh cục bộ cho
  số ôn hôm nay; UI hiện 100 thẻ trong khi D1 có 405. Queue chỉ offer tối đa 12,
  không được lấy 12 làm tổng đến hạn. Cần aggregate server đúng owner/reset,
  regression và đối chiếu browser; chưa thay đổi phần này trong lượt trên.

### Lượt 07/09 — Dữ liệu tài khoản demo · IN-REVIEW

- Bổ sung theo phản hồi: learner có 54/217 bài hoàn tất, 405 thẻ kích hoạt từ
  bài học, 96 lượt ôn, 100 từ lưu, 58 mục lỗi, 6 chương đọc và 1 kết quả luyện đề
  HSK1 mới. 7.400 XP được tính qua repository nhận thưởng hiện hành.
- Tên learner hiển thị Minh An; provenance giữ nội bộ. Không tạo điểm giọng nói
  hoặc xác nhận viết tay giả. Dữ liệu chapter được cấp cho đúng account local
  khi browser chưa có progress; production và reset fail-closed.
- Đã kiểm parser projection V4 và bổ sung refresh khi tab nhận focus. Chờ xác
  nhận trạng thái sau reload trên Cốc Cốc, không ghi đã kiểm browser này.

- Theo yêu cầu người dùng, bổ sung kịch bản hoạt động cho learner/editor/admin
  có sẵn trên D1 local; chi tiết và cách chạy ở [DEMO_WORKSPACE.md](DEMO_WORKSPACE.md).
- Người học có hồ sơ, từ lưu và lịch luyện mẫu; editor có 12 hồ sơ được phân
  công; admin có hàng duyệt và 34 sự kiện workflow. Dữ liệu mẫu được đánh dấu,
  không tăng mastery hoặc giả lập lịch sử đăng nhập.
- Đã kiểm rehearsal, chạy lại chống trùng, foreign key, projection ba tài khoản,
  hàng ôn/lỗi và worker. Browser editor hiển thị đủ 12 hồ sơ.
- Giữ mật khẩu, quyền, phiên học, completion, XP và evidence thành thạo; giữ
  inventory HSK0 4/4 (rich 0/4), HSK1–4 213/213 rich, không đổi core IDs.
- Tiếp theo: người dùng xem dữ liệu demo trên web local.

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

## Vạn Quyển Các · thư khố ngọc và khảo luyện editor · 2026-09-10

- **Module:** Vạn Quyển Các — IN-REVIEW.
- **Người học thấy gì:** thư khố có cảnh thư viện nguyên bản, mục lục/trang đọc/hộp hỗ trợ dùng tông ngọc–vàng; sidebar giữ nguyên. Bìa hiện hữu sáng và rõ màu hơn nhờ giảm lớp phủ, tăng sáng bằng CSS; bỏ nhãn và tên Việt lặp trên tranh thu nhỏ. Không thay nội dung tranh hoặc ID sách.
- **Khảo luyện:** editor soạn tối đa 10 câu/chương với 3–4 lựa chọn, đáp án và giải thích. Kiểm tra ở đầu vào lẫn cổng duyệt chung; sách không bị ép gắn bài Thiên Lộ. Bản phát hành chuyển đúng câu hỏi tới chương; đổi ngữ liệu/đáp án làm đổi phiên bản khảo luyện, giữ stable ID và lịch sử hoàn thành. Chương chưa có câu hỏi vẫn đọc được, không tự sinh câu hỏi giả.
- **Đã kiểm:** 33 test / 5 file gồm luồng draft → validation → submitted → approved → published → reader trên SQLite in-memory; giữ kết quả lần đầu và loại kết quả lệch phiên bản. Typecheck, targeted ESLint, diff check đạt. Browser thật: thư viện → mục lục → đọc tiếp → hỗ trợ → thoát; viewport 375×812 giữ header/CTA. `npm run check` còn bị chặn bởi `content/review/hsk1-level-batch-local-study-review.json is stale` có trước.
- **Dữ liệu giữ được:** không migration hoặc reset; không đổi curriculum/package. HSK0 4/4 (rich 0/4), HSK1–4 213/213 rich (40/40/55/78) giữ nguyên nguồn. Không chỉnh `.wrangler`, `docs/reports` hoặc `output`.
- **Tiếp theo:** người dùng thử `/reader` và phần khảo luyện ở `/studio/library`; chưa đánh dấu USER-ACCEPTED. Provenance ảnh tại `docs/READER_JADE_ASSET_PROVENANCE.md`.

## Vạn Quyển Các · khảo luyện toàn bộ chương · 2026-09-10

- **Module:** Vạn Quyển Các — IN-REVIEW.
- **Người học thấy gì:** 250 chương thư khố và 1 chương legacy đều có 2 câu đọc hiểu (502 câu), lựa chọn và giải thích đối chiếu đoạn truyện. Chương đã hoàn thành trước đây vẫn mở được khảo luyện mới.
- **Đã kiểm:** validator tải đủ 251 chương, kiểm tra đáp án/đoạn nguồn/ID/phiên bản; 13 test nội dung và tiến độ đạt. Playwright 375×812: onboarding → chương có sẵn → trả lời sai rồi đúng → tải lại giữ kết quả → câu thứ hai → hoàn thành → mở chương tiếp; CTA trong viewport. Typecheck và targeted ESLint đạt.
- **Dữ liệu giữ được:** stable IDs, lịch sử hoàn thành và kết quả lần đầu được giữ; phiên bản câu hỏi mới không tái dùng kết quả cũ. Không sửa curriculum, tài khoản hoặc dữ liệu browser người dùng. Nội dung AI-assisted giữ humanReviewed:false; chưa có duyệt người thật.
- **Tiếp theo:** người dùng thử chương đã đọc tại /reader; bộ 10 concept Thiên Cơ Kính là việc tiếp theo đã được yêu cầu. Full check còn blocker HSK1 review stale ghi ở checkpoint trên.

## Thiên Cơ Kính · Ngọc Lệnh · 2026-09-11

- **Module:** Thiên Cơ Kính — IN-REVIEW; concept Ngọc Lệnh được người dùng chọn, bản web chờ thử.
- **Người học thấy gì:** gương ngọc/sơn thủy và thư án nguyên bản; nền ngọc trầm, thẻ ngọc sáng, khung vàng, typography serif. Thứ tự tổng quan → hoạt động/Căn Cơ → 8 cửa luyện → chi tiết; bấm Xem chi tiết mở đúng phần bằng chứng, hỗ trợ keyboard. Giữ sidebar/header dùng chung.
- **Đã kiểm:** Typecheck, targeted ESLint, 13 test analyticsJourney/learningCoverage; Playwright desktop 1440×1000, mobile 375×812 và ngang 812×375. So sánh kích thước/màu/font shell trước và sau chuyển module; không tràn ngang, 7 trạng thái thiếu bằng chứng không hiển thị phần trăm giả, 8 link đúng route, CTA hoạt động, reduced motion.
- **Dữ liệu giữ được:** không đổi store, curriculum, auth, ID, lịch sử, FSRS hoặc thuật toán. Số liệu mẫu trong concept không đưa vào runtime. HSK0 4/4 (rich 0/4), HSK1–4 rich 213/213 giữ nguồn cũ.
- **Tiếp theo:** người dùng thử http://localhost:3000/analytics. Provenance tại docs/ANALYTICS_JADE_ASSET_PROVENANCE.md.
- **Gate toàn dự án:** chạy lại npm run check, precheck vẫn dừng tại content/review/hsk1-level-batch-local-study-review.json is stale; không thay đổi nội dung HSK1 ngoài phạm vi.

## Thiên Cơ Kính · Nguồn dữ liệu và nền ngọc tối · 11/09/2026

- **Module:** Thiên Cơ Kính — IN-REVIEW, chờ người dùng test.
- **Người học thấy gì:** nền ngọc tối/chữ ngà thay các thẻ trắng. Thất Trụ hiển thị câu khác nhau và lượt luyện; chi tiết tách lượt đúng, câu đúng lần đầu và phép đo thành thạo. Không còn nhãn cố định “Đang hợp nhất bằng chứng”. Lượt nói/nét chữ trên thiết bị được cộng riêng, không upload transcript. Biểu đồ tuần dùng lượt luyện thực tế thay XP cục bộ thiếu dữ liệu.
- **Nguồn dữ liệu:** tài khoản đọc learning_attempts đúng owner/reset; Nghịch Cảnh dùng cùng API/hàng đợi với /mistakes: demo hiện 55 câu mở, 66 dấu vết sai. Refresh theo cursor, focus và online; lỗi tải hiển thị dấu gạch cùng nút thử lại, có timeout.
- **Nhịp tu luyện:** tổng ngày truy cập, theo ngày Việt Nam, không phải streak; ghi một lần mỗi ngày qua learner shell. Account lưu bảng learner_access_days; guest lưu riêng trên thiết bị. Đây là thống kê truy cập trọn đời, độc lập với reset học tập; xóa tài khoản sẽ cascade. Ngày trước khi có bộ ghi nhận không được tự suy diễn cho tài khoản thật.
- **Dữ liệu giữ được:** migration 0023 chỉ thêm bảng; seed local có backup/rehearsal/transaction và chống trùng, bổ sung 32 ngày theo lịch sử kịch bản learner.demo, cộng ngày hiện tại thành 33. Không đổi completion 54/217 (~25%), XP, FSRS, hàng lỗi, session/outbox, credential/role. Không tạo điểm giọng nói hay mastery. Giữ HSK0 4/4, rich HSK1–4 213/213 (40/40, 40/40, 55/55, 78/78). Không sửa docs/reports hoặc output.
- **Đã kiểm:** Typecheck, targeted ESLint, 21 Vitest (dedup, retry, timezone, owner/reset, cập nhật khi có attempt mới, authentication, cross-origin và API lỗi). Browser tài khoản demo đối chiếu /analytics với /mistakes; mobile 375 có scrollWidth 360. Full check vẫn dừng ở content/review/hsk1-level-batch-local-study-review.json stale có trước lượt này.
- **Tiếp theo:** người dùng tải lại http://localhost:3000/analytics và review. Chưa USER-ACCEPTED; không commit/push/deploy.
- **Kiểm tra bổ sung sau tiếp tục:** Playwright guest đạt: ngày truy cập không tăng khi reload; 7 trụ rỗng đúng; desktop 1440, mobile 375 và ngang 812 không tràn sau khi bố cục ổn định; mở/đóng chi tiết bằng bàn phím, CTA >=44px và đi tới bài học. Account kiểm bằng browser in-app (33 ngày, 55 câu/66 dấu vết); E2E account trên browser headless mới vẫn vướng khôi phục phiên đăng nhập, chưa tuyên bố đạt. db:check đạt. Không giữ CSS ghi đè shell thử nghiệm.

## Thiên Lộ · ảnh và điều khiển trong viewport · 14/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW, goal còn hoạt động, chưa nghiệm thu toàn bộ UI.
- **Người học thấy gì:** reader chung giữ tiêu đề trang/chọn trang, nghe trọn tình huống/mở lời thoại và footer ngoài vùng cuộn; tranh co đủ ảnh trong chiều cao còn lại. Thu gọn hero, chuyển tra từ thành nút sách 44px ở footer. Văn bản dài cuộn riêng; khi đổi trang hoặc mở lời thoại bắt đầu vùng đọc từ đầu. Cần tiếp tục chia nhỏ nội dung dài để giảm cuộn, chưa gọi là mọi trang không cuộn. Sửa tương phản nút dừng tài khoản và kích thước reader khi xem lại lý thuyết.
- **Đã kiểm:** typecheck và targeted ESLint đạt; browser đúng hsk2-daily-needs-family-lesson-01 tại 1235×640, 375×812, 812×375: ảnh, hai nút nghe/lời thoại, footer trong viewport; vùng ngoài không cuộn; đổi trang reset scroll. Đã xem ảnh desktop/mobile. Test khách boot-1 qua học→Thử Luyện→kết quả cả sai và đúng→nhận thưởng đạt. Test helper sửa chọn resume thực hành thay vì nhầm resume đọc mới có cùng lessonId. Lần account journey kiểm lại bị quay về landing, HSK2 seed tạm lỗi khi release đang diễn ra; sau release HSK2 đạt, chưa tái xác nhận riêng account journey sau CSS cuối.
- **Phát hành:** boot-1 thêm 12 trang Ngọc Điện qua payload Xưởng (bản đồ bốn thanh, cặp âm, thanh nhẹ, từ nguồn, nhận diện và chuyển sang dà, rubric); schema/review 16 đạt. Import rehearsal/apply có backup và fingerprint 36 bảng; release rehearsal/apply fingerprint 35 bảng/FK đạt. Tổng authored local 28, chưa phải hoàn tất 217 bài.
- **Dữ liệu giữ được:** IDs, prerequisites/skills/word IDs gốc và scoring giữ nguyên; không reset dữ liệu thật. humanReviewed:false. HSK0 nền 4/4 (rich nguồn 0/4); rich HSK1–4 nguồn 213/213. Không sửa docs/reports hoặc output.
- **Tiếp theo:** tiếp tục ưu tiên UI chung và giảm cuộn nội dung dài, xử lý các bài nhập môn còn fallback, sau đó nội dung theo lô trong toàn scope đã chốt. Không commit/push/deploy.

## Thiên Lộ · từng mục và ảnh phủ khung · 14/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal còn hoạt động.
- **Người học thấy gì:** mỗi trang hiển thị từng khối bằng Mục trước/Mục tiếp và chọn mục, không dồn tất cả khối; lời thoại nghe từng lượt khi mở chữ, nút nghe ở trên vùng đọc. Vị trí mục lưu cùng phiên đọc; đổi mục giữ câu trả lời và trợ giúp. Mục dài có nút Xem phần dưới khi thực sự overflow. Xưởng dùng cùng renderer/thứ tự; bỏ rubric chung cứng để dùng rubric do editor soạn.
- **Theo ảnh người dùng:** ảnh cảnh phủ kín khung bằng cover, cắt mép theo tỉ lệ khung thay vì để dải trống; bỏ figcaption dưới ảnh và dòng TTS ở đáy ở cả guest/account. Giọng tổng hợp ghi ngay nút nghe. Giảm padding/hero/footer, giữ touch target 44px. Không tuyên bố đã khớp toàn bộ concept hoặc mọi nội dung không cuộn.
- **Đã kiểm:** 4 test parser phiên đọc (v1 cũ, vị trí mục mới, dữ liệu sai, draft/evidence), typecheck, ESLint/diff check đạt. Browser boot-1: mục ngắn không cuộn trên 1235×640 và 375×812, reload đúng mục, chuyển qua/lại giữ đáp án/phản hồi. HSK2 bài người dùng báo: ảnh/nút nghe/mở chữ/footer trong viewport cả desktop/mobile/ngang. Sau sửa cuối 2/2 đạt; ảnh desktop và mobile đã xem. Trước sửa ảnh/padding, guest luyện→retry/reward và HSK2 3/3; Xưởng greeting/school xem/lưu/nhân bản 2/2. Tài khoản mới tạo trước onboarding kiểm theory return 1/1 đạt; learner.demo có session thiết bị khác nên không takeover. Tạo tài khoản sau onboarding gặp bootstrap pending; chưa xác minh lỗi đó thuộc production flow, không sửa auth trong lượt UI.
- **Dữ liệu giữ được:** ReadingPosition thêm blockIndex optional, không đổi key/version hoặc document IDs; giữ drafts/assistance, không reset phiên người dùng. Nội dung đã phát hành vẫn 28 authored; nền 217 và rich nguồn 213 giữ nguyên.
- **Tiếp theo:** tiếp tục toàn scope; cần rà mức dùng diện tích/nội dung từng loại trang, HSK0 boot-3/4 còn legacy, nội dung phần còn lại và tích hợp evidence/media/full gate chưa xong. Chưa USER-ACCEPTED.

## Thiên Lộ/Xưởng · bản nháp lô chữ HSK1 · 14/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; không thay số bài đã phát hành (28).
- **Nội dung:** sửa lô 15 bài chữ: Pinyin cả cụm tách âm đáp án một chữ, thêm hai từ mẫu nguồn khác nhau cho mỗi bài, grammar model/guided đủ trường để editor biên tập. Câu điền dùng gợi nghĩa và chỗ trống, không lộ nguyên cụm đáp án trong yêu cầu. 235 trang nháp, 246 character IDs giữ nguyên; chưa tuyên bố đủ luyện tự nhớ hoặc hoàn tất chất lượng sư phạm.
- **Đã kiểm:** 5 test/3 file giữ inventory, schema khóa phát hành khi chưa review, phân biệt âm cả từ/chữ, prompt khôi phục đúng từ và distractor. Typecheck/ESLint đạt. Import rehearsal rollback rồi backup/apply: 15 bản nháp, fingerprint 36 bảng và FK đạt. Không phát hành, không tự đánh dấu AI review đã hoàn tất.
- **Còn lại:** audit âm riêng còn 6 context cần đối chiếu (biến điệu, biến thể 谁, Erhua); renderer giữ nhãn âm cả từ thay vì đoán. Browser Xưởng đang kiểm; lượt đầu chọn nhầm characters-15 do tìm characters-1 khớp tiền tố, test sửa chọn đúng tiêu đề bài.
- **Dữ liệu giữ được:** stable IDs, prerequisite, skills, nguồn từ/chữ, progress/FSRS/phiên không đổi. Nội dung AI-assisted humanReviewed:false. Goal toàn bộ 217 bài và các tích hợp còn hoạt động.
- **Browser bổ sung:** Xưởng mở đúng characters-1/3/14, đọc Pinyin cả cụm (dàxué/māma/yī běn shū), điền đúng chữ và phản hồi đạt 1/1; không lưu thay đổi vào bản nháp đã nhập trong smoke này.

## Thiên Lộ · sáu cách đọc theo ngữ cảnh · 14/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal vẫn hoạt động.
- **Nội dung:** đối chiếu cụ thể 客/气 trong 不客气, 谁 shéi/shuí, 要 trong 不要, 条 trong 面条儿 và 玩 trong 好玩儿. Mapping chỉ nhận đúng bộ chữ/từ/Pinyin đã rà, không suy rộng polyphone hoặc Erhua. Bảng chữ có giải thích thanh nhẹ, biến điệu, âm thay thế và 儿 hóa; không tách 儿 thành một âm riêng.
- **Đã kiểm:** audit 246 mục: 240 khớp nguồn và 6 explicit-editorial-context, không còn needs-context-review trong phạm vi audit âm riêng. Sáu test mapping/inventory/renderer đạt trước thêm regression giải thích; regression renderer bổ sung kiểm đủ sáu note. Typecheck/ESLint đạt. Đây không chứng minh phát âm người học đúng hoặc nội dung lô đã hoàn tất.
- **Dữ liệu giữ được:** không đổi chữ/từ/Pinyin nguồn, ID, tiến độ hoặc cơ chế chấm; chưa sửa 15 bản nháp đã nhập trong D1, chưa phát hành thêm. Các note mới cần đưa vào payload Xưởng trong bước hoàn thiện lô để không phụ thuộc code khi biên tập.
- **Tiếp theo:** hoàn thiện nội dung và note trong lô chữ/Xưởng, rồi phát hành theo gate; tiếp tục các phần còn lại toàn scope. Số authored đã phát hành vẫn 28.

## Thiên Lộ/Xưởng · gọi lại từng chữ và lưu giải thích · 14/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal toàn bộ giữ nguyên.
- **Nội dung:** sáu note âm ngữ cảnh đã được materialize vào payload, không chỉ renderer. Lô chữ thêm 246 mục gọi lại chữ sau các nhóm học mẫu; che mọi lần xuất hiện của chữ (kể cả từ lặp), dùng nghĩa/Pinyin để gợi. Tổng 300 trang nháp; không dùng số trang làm bằng chứng chất lượng. Vẫn còn nhiệm vụ chuyển ngữ cảnh và vận dụng cần làm sâu hơn.
- **Đã kiểm:** 4 test giữ inventory/schema/note và 246 mục recall, không lộ target trong chuỗi che, thứ tự đặt sau mẫu; typecheck/ESLint đạt. Cập nhật hai lần bằng repository có expectedRowVersion, đối chiếu baseline chính xác, backup/rehearsal/apply: 15 bản nháp mỗi lần, bảo vệ 41 bảng, nguyên lịch sử cũ và revision ngoài scope, FK đạt. Không phát hành.
- **Browser:** lần kiểm sáu note đầu bị lỗi dev Network connection lost; listener vẫn sống, không restart; đang chạy lại hành trình Xưởng. Không tuyên bố browser lần đó đạt.
- **Dữ liệu giữ được:** toàn bộ 246 character IDs, từ/tiên quyết/kỹ năng, trạng thái học/FSRS/outbox giữ nguyên. Nội dung humanReviewed:false; published authored vẫn 28.
- **Tiếp theo:** tiếp tục hoàn thiện lô chữ, hai bài nhập môn còn cũ và scope toàn kho; chưa USER-ACCEPTED.
- **Browser xác nhận:** chạy lại đạt 1/1: mở đúng các bài chứa 客/气/谁/要/条/玩, đối chiếu payload D1 và bản xem trước với note biên soạn. Không sửa/reset phiên học người dùng.

## Thiên Lộ/Xưởng · vận dụng riêng cho 15 bài chữ · 14/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW, goal toàn bộ còn hoạt động.
- **Nội dung:** thay yêu cầu tự chọn hai từ chung bằng 15 tình huống riêng có khung hỗ trợ, câu mẫu Trung/Pinyin/Việt và ba tiêu chí cụ thể: chào lịch sự, gia đình, thời gian hẹn, mua/bán, phương tiện, lượng từ… Mục tiêu checkpoint và payload Xưởng cùng nguồn. Giữ 300 trang/246 chữ và các ID hiện có; không phát hành thêm.
- **Đã kiểm:** 5 test schema/inventory/recall/note/transfer đạt, typecheck và ESLint nội dung đạt. Update rehearsal rồi backup/apply qua repository: 15 drafts, 41 bảng bảo vệ, history/revision ngoài scope và FK giữ nguyên.
- **Browser:** test mới lưu/preview vận dụng gặp ECONNREFUSED do dev đã dừng (không listener và process 11172 không tồn tại). Đã khởi động npm run dev lại, chờ lên cổng để kiểm tiếp. Không gọi browser pass trước khi có kết quả.
- **Tiếp theo:** kiểm vận dụng Xưởng và rà đáp án trước release lô, tiếp tục phạm vi toàn bộ. Published authored vẫn 28, chưa USER-ACCEPTED.
- **Gate bổ sung:** typecheck/ESLint cuối đạt. Browser vận dụng vẫn chưa đạt: sau bật dev, trang Xưởng trả Network connection lost trong Vinext renderHtmlStream trước khi tới bài; không phải assertion câu trả lời. Giữ test và trạng thái chưa xác minh, không sửa nội dung để né lỗi runtime.

## Thiên Lộ/Xưởng · chống lộ đáp án và xác minh vận dụng · 14/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal toàn bộ tiếp tục, chưa USER-ACCEPTED.
- **Người học thấy gì sau phát hành lô:** câu điền 妈妈 che cả hai chữ thay vì để chữ thứ hai lộ đáp án; yêu cầu ghi rõ hai ô cùng một chữ. 15 câu chọn phân bố đáp án đúng ở ba vị trí (5/5/5), phản hồi bám đúng lựa chọn. Hiện thay đổi còn ở draft, không gọi là đã tới learner.
- **Đã kiểm:** 6 Vitest về inventory/schema/âm ngữ cảnh/recall/transfer và đáp án đạt; typecheck đạt. Rehearsal rồi backup/apply cập nhật đúng 10 draft có thay đổi, 5 draft không đổi; 41 bảng bảo vệ, revision/history ngoài scope và FK giữ nguyên. Diff check đạt.
- **Browser:** xác nhận dev cũ không còn tiến trình/listener rồi khởi động lại, migrations không có thay đổi. Lần test chạy lúc rehearsal còn hoạt động gặp API demo 503 D1; sau giao dịch kết thúc chạy tuần tự đạt 1/1. Mở Xưởng các bài characters-3/9/14 trả 200, payload vận dụng đúng bản soạn, nhập câu và xem hướng dẫn/đáp án trong preview đạt. Lỗi Network connection lost trước đó không tái hiện ở lượt này; chưa kết luận sửa nguyên nhân Vinext.
- **Dữ liệu giữ được:** 15 draft/300 trang/246 character IDs, IDs nền/tiên quyết/từ/kỹ năng; humanReviewed:false. Published authored vẫn 28. Không reset progress, FSRS, owner hoặc outbox; không commit/push/deploy.
- **Tiếp theo:** hoàn tất rà đáp án/ngữ cảnh lô chữ trước phát hành local và kiểm learner; tiếp tục toàn bộ phạm vi 217 bài cùng các tích hợp còn thiếu.

## Thiên Lộ/Xưởng · phát hành lô 15 bài chữ · 14/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal toàn bộ chưa hoàn tất, chưa USER-ACCEPTED.
- **Người học thấy gì:** 15 bài characters-1..15 dùng 300 trang biên tập trong Xưởng: đối chiếu hình riêng, từ mẫu, nhận diện có mẫu, gọi lại 246 chữ, phân biệt và 15 tình huống có rubric. Câu chủ nhật xác định cách đọc xīngqīrì và giải thích 星期天; câu “làm, zuò” chấp nhận 做/作 theo yêu cầu chung. Đây là luyện có hỗ trợ, không tính thành mastery viết.
- **Đã kiểm:** 11 Vitest nội dung/hoạt động và typecheck đạt. Reconciliation 15 draft rehearsal/apply giữ 41 bảng; release rehearsal rollback rồi backup/apply 15/15 giữ 35 bảng, FK/projection/digest đạt. Hồ sơ AI review tại 17-REVIEW-CHARACTER-BATCH.md, humanReviewed:false.
- **Browser:** runtime learning projection bằng payload toàn bộ 15 bài. Bài characters-3 nhập 妈 đúng, reload giữ trang và câu trả lời, vận dụng mở đúng model/rubric; footer trong viewport 1235×640, 375×812, 812×375. Playwright đạt 1/1 (22.1s). Lần đầu thiếu bước onboarding của browser mới nên về landing; bổ sung đúng hành trình, không sửa production guard để né test.
- **Dữ liệu giữ được:** stable IDs/tiên quyết/từ/kỹ năng, 246 character links; không reset tiến độ, FSRS, lỗi, owner, phiên hoặc outbox. HSK0 nền 4/4 rich nguồn 0/4; HSK1–4 213/213 rich. Authored local đã phát hành 43, còn 174 bài nền chưa phát hành nội dung soạn lại. Con số này không phải phần trăm hoàn thiện hoặc phủ HSK.
- **Tiếp theo:** hai bài nhập môn boot-3/4 còn luồng cũ; tiếp tục nội dung toàn kho, minh họa phù hợp từng bài và tích hợp evidence/Xưởng theo hồ sơ v0.2. Không commit/push/public deploy.

## Thiên Lộ/Xưởng · hai bản nháp nhập môn âm · 14/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; chưa USER-ACCEPTED, goal toàn bộ hoạt động.
- **Nội dung:** boot-3 có vị trí lưỡi, bật hơi j/q–zh/ch–z/c, phân biệt âm xát, các từ mẫu và tự quan sát/lời cảm ơn. boot-4 tách thanh gốc/cách đọc liền, 3+3, 不, 一 trước các thanh và ngoại lệ số thứ tự; ví dụ và tình huống giải thích riêng. Tổng 16 trang; dùng diagram/choice/rubric có thể chỉnh trong Xưởng, không có điểm phát âm giả.
- **Đã kiểm:** 3 Vitest bảo toàn nguồn/schema, ngoại lệ 第一 và phản hồi tự đánh giá đạt; typecheck và targeted ESLint generator/test đạt. Import rehearsal rồi backup/apply 2 draft, bảo vệ 36 bảng/FK/idempotency. Playwright mở cả hai draft, đối chiếu toàn bộ lessonPages, hiển thị sơ đồ và trả lời câu quy tắc trong preview đạt 1/1 (16.4s).
- **Dữ liệu giữ được:** boot-3/4 IDs, vocabulary/prerequisite/skills gốc; humanReviewed:false. Chưa phát hành hai bản này; authored local vẫn 43. Không reset dữ liệu học, không push/public deploy.
- **Tiếp theo:** rà nội dung/âm và bản minh họa của hai bài, phát hành local sau review rồi kiểm learner; còn toàn bộ phạm vi minh họa/evidence và 174 bài chưa phát hành nội dung soạn lại.

## Thiên Lộ/Xưởng · phát hành nhập môn và thu gọn tự kiểm · 14/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW, goal v0.2 còn hoạt động.
- **Người học thấy gì:** boot-3/4 dùng bản 16 trang đã soạn trong Xưởng. boot-4 vận dụng từ mới 一起 thay vì lặp ví dụ 一年. Renderer rubric chung chỉ cho xem guidance chứa đáp án sau lần đối chiếu, đặt checklist trong vùng mở/thu gọn; tích tiêu chí giữ phản hồi và không xóa câu trả lời. Tương thích phiên cũ compared/answerIds chưa có everChecked.
- **Đã kiểm:** 5 Vitest nội dung/schema/quy tắc/rubric-disclosure và typecheck đạt. Update draft 1/2 qua baseline chính xác, 41 bảng giữ nguyên; release rehearsal/backup/apply 2/2, 35 bảng/FK/projection/digest đạt. Hồ sơ review 18-REVIEW-BOOT-SOUND.md, humanReviewed:false.
- **Browser:** projection đúng cả hai lessonPages, vào từng bài, sai→đúng theo câu quy tắc, nhập và mở đáp án transfer, mở checklist/tích/thu gọn giữ feedback; footer ở 1235×640 và 375×812. Playwright sau sửa rubric đạt 1/1 (28.2s). Đã xem ảnh mobile: nội dung dài vẫn cuộn riêng với nút Xem phần dưới, không tuyên bố mọi nội dung vừa một khung. Chưa kiểm riêng chuyển vào Thử Luyện boot-3/4 trong lượt này.
- **Dữ liệu giữ được:** IDs, nguồn từ, tiên quyết, skills và dữ liệu học cũ giữ; HSK0 nền 4/4, HSK1–4 rich nền 213/213. Authored local 45 (4 bài nhập môn, 40 HSK1 và 1 HSK3); còn 172 bài nền chưa phát hành nội dung soạn lại. Chưa đủ media riêng hoặc tích hợp evidence toàn scope. Không commit/push/public deploy.
- **Tiếp theo:** nối evidence hoạt động mới đúng owner/phiên/loại trợ giúp và tiếp tục nội dung HSK2–4; không thu hẹp mục tiêu về riêng số lượng bản phát hành.

## Thiên Lộ · giữ lần thử đầu trong phiên đọc · 14/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW; goal toàn bộ còn mở.
- **Thay đổi:** khối activity lưu firstAttempt trước khi hiển thị phản hồi: câu nhập/lựa chọn, thời điểm, hint và lịch sử feedback/reveal. Sửa câu sau đó không thay bản ghi đầu. Snapshot nằm cùng document đã pin trong resume owner/reset hiện có; không tạo evidence server hoặc mastery từ bản ghi local. Phiên cũ không có firstAttempt vẫn đọc được; lượt mới sau phiên đã checked ghi priorFeedback:true.
- **Đã kiểm:** 9 Vitest capture/restore/giới hạn và disclosure đạt. Browser guest boot-1 chọn sai→đúng→reload giữ câu hiện tại cùng snapshot đầu đạt 1/1 (14.3s). Typecheck/ESLint được chạy sau thay đổi. Parser từ chối snapshot malformed thay vì ghi đè dữ liệu không hiểu.
- **Dữ liệu giữ được:** không migration/reset hoặc thay IDs; không thay điểm, FSRS, hàng sai hay outbox. Chỉ khối activity ghi snapshot; reflection/reading và mọi lượt sau đầu chưa có nhật ký attempt đầy đủ. Studio preview không gửi hoạt động này tới backend.
- **Tiếp theo:** thiết kế ánh xạ activity phiên bản phát hành sang nguồn chấm server, ghi đầy đủ loại trợ giúp và nối consumer; chưa tuyên bố tích hợp Ôn/Nghịch Cảnh/thống kê hoàn tất. Nội dung authored local vẫn 45/217 bài nền; media và nội dung còn lại tiếp tục trong goal.

## Thiên Lộ · định danh hoạt động trang phía server · 14/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW.
- **Đã làm:** thêm bộ tạo registry nội bộ từ manifest lấy ở publishedRuntime server, khóa activityVersion bằng revision và digest toàn nội dung bài (đổi mẫu trước câu cũng đổi phiên bản). Chấm choice/order/cloze theo đáp án của binding; rubric luôn self-review; không tự gán skill/mastery. Từ chối phiên bản lạ, cấu trúc lỗi và hai bài trùng target.
- **Đã kiểm:** 3 Vitest kiểm nhiều đáp án đúng, đáp án sai, stale/unknown version, thay mẫu, trùng target, draft manifest và rubric đạt. Typecheck/ESLint đạt. Chưa nối registry vào API/attemptRepository nên chưa gọi là đã có chấm server trên web; không dùng manifest do client gửi làm nguồn đáng tin.
- **Dữ liệu giữ được:** không thay schema/database hoặc đường điểm hiện tại. Không migration/reset/push/deploy.
- **Tiếp theo:** cần schema mục tiêu kỹ năng và nguồn liên kết do Xưởng biên tập, API/session ownership và consumer cùng regression. Không suy skill từ kiểu choice/cloze hoặc tên bài; còn 172 bài nền chưa soạn lại cùng media toàn scope.

## Thiên Lộ/Xưởng · mục tiêu hoạt động có thể biên tập · 14/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW.
- **Editor thấy gì:** mỗi activity có mục tiêu tùy chọn: kỹ năng, đầu ra, các nguồn có loại và mã. Thêm/bỏ nguồn, sửa kỹ năng hoặc xóa mục tiêu bằng form; không cần sửa JSON. Schema nhận draft chưa xong nhưng validation chặn mục tiêu rỗng/nguồn rỗng/trùng/sai loại; activity cũ không có trường này vẫn tương thích.
- **Đã kiểm:** 9 Vitest activity/target/registry đạt; typecheck và targeted ESLint đạt. Playwright tạo draft thử riêng, chọn pronunciation, nhập nguồn initial-contrast-jqx-zhchsh-zcs, lưu/reload giữ đúng mục tiêu và đáp án đạt 1/1 (19.7s). Không thay draft/published content của người dùng trong test.
- **Giới hạn:** đây là cấu trúc và form; chưa có source picker tra cứu hay xác minh mã tồn tại/thuộc bài. Không dùng trường tự khai này cấp điểm/mastery. API chấm/session/persistence/consumer vẫn chưa nối, không tuyên bố tích hợp hoàn tất.
- **Dữ liệu giữ được:** lesson/activity IDs và đáp án cũ giữ, không migration/reset; authored local vẫn 45. Không push/public deploy.
- **Tiếp theo:** source picker và kiểm định liên kết phía server, sau đó API hoạt động theo owner/phiên; tiếp tục nội dung và media toàn scope v0.2.

## Thiên Lộ/Xưởng · chọn nguồn thuộc bài và chặn liên kết sai · 14/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW.
- **Editor thấy gì:** thay nhập mã tự do bằng lựa chọn từ nguồn bài đích: từ có chữ/Pinyin/nghĩa, chữ theo từ ngữ cảnh, ngữ pháp, nhiệm vụ và blueprint phát âm. Đổi loại nguồn xóa lựa chọn phụ thuộc để chọn lại. Nguồn cũ không hợp lệ hiển thị yêu cầu chọn lại, không âm thầm xóa khi mở form.
- **Đã kiểm:** cổng validateStudioContent và registry server kiểm nguồn theo bài, chặn ID bịa và ID hợp lệ của bài khác. Test actual publication validator đạt; tổng các targeted lượt gồm 16 test schema/nội dung/target/registry đạt, lượt cuối 4 test registry/source đạt. Browser chọn nguồn phát âm bằng nhãn, lưu/reload giữ mục tiêu/đáp án đạt 1/1 (15s). Typecheck/ESLint đạt.
- **Dữ liệu giữ được:** không thay published content hoặc database schema, giữ ID/draft cũ. Danh sách hiện dựa curriculum/rich/blueprint nền; nguồn mới cần đăng ký vào kho chung trước khi xuất hiện. Không coi chọn skill là đủ điều kiện mastery.
- **Tiếp theo:** API và phiên owner/reset cho hoạt động trang cùng outbox/consumer; liên thông kết quả vẫn chưa hoàn tất. Toàn bộ nội dung/media còn lại giữ scope v0.2, không push/public deploy.

## Thiên Lộ · API định danh hoạt động phát hành · 14/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW.
- **Đã làm:** GET /api/learning/page-activities?lessonId=… lấy publishedRuntime ở server, trả activityId/version/page/block/revision cho đúng bài. Không nhận manifest client, không trả đáp án/feedback hay dữ liệu người học. Bài không có trang phát hành trả danh sách rỗng; target trùng/lỗi registry trả 503, bài không hợp lệ trả 422.
- **Đã kiểm:** 5 Vitest route/registry đạt, ESLint đạt. Playwright gọi API thật cho boot-3/4 và characters-1..15, đối chiếu từng page/block với payload đã phát hành và bộ trường trả về đạt 1/1 (5.8s). Typecheck chạy sau thay đổi. Endpoint chưa được reader gọi tự động; chưa triển khai POST/persistence.
- **Dữ liệu giữ được:** chỉ đọc nội dung, không reset/migration hoặc đổi điểm/FSRS/phiên. Không ghép hoạt động đọc vào lesson_sessions vốn khóa form Thử Luyện và điều kiện hoàn thành bài.
- **Tiếp theo:** phiên đọc theo owner/reset và nội dung đã pin, POST kết quả có idempotency, outbox và consumer; scope nội dung/media toàn kho vẫn mở. Không push/public deploy.

## Thiên Lộ · gắn phiên bản phát hành vào lần thử local · 14/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW, goal còn mở.
- **Đã làm:** ResumableLessonReader gọi API định danh, đối chiếu hash toàn document đã pin cùng page/block IDs trước khi gắn binding vào firstAttempt mới. Snapshot cũ hoặc lượt làm trước khi có binding không bị gắn bù. Thay owner unmount state như trước; offline/API lỗi vẫn đọc và lưu local được. API thêm documentHash, không thêm đáp án.
- **Đã kiểm:** 10 test binding/firstAttempt/restore/route đạt; thêm test parity canonical hash đạt (2 test binding). Typecheck/ESLint đạt sau sửa null narrowing. Browser regression đã bổ sung assertion binding nhưng lần chạy gặp ERR_CONNECTION_REFUSED trước onboarding: xác nhận không listener và không process vinext, đã chạy npm run dev (session 32258), migrations không có thay đổi; Vinext còn khởi động, chưa có kết quả browser mới.
- **Dữ liệu giữ được:** không ghi server attempt/evidence, không migration/reset; firstAttempt binding tùy chọn, parser vẫn nhận bản cũ. Chưa có POST/outbox/consumer hoặc xác minh nguồn lúc commit, không gọi dữ liệu local là server-verified.
- **Tiếp theo:** chờ đúng dev process hiện tại lên cổng rồi kiểm browser first page attempt; tiếp tục phiên/persistence và các phần nội dung/media còn thiếu toàn scope.

## Thiên Lộ · xác minh binding trước/sau lần thử · 14/09/2026

- **Module:** Thiên Lộ/Xưởng — IN-REVIEW, goal chưa hoàn tất.
- **Đã kiểm:** tiến trình dev session 32258 lên cổng 3000 (PID 5136), giữ nguyên, không khởi động trùng. Browser first-attempt binding đạt 1/1 (28.9s): sai→đúng→reload giữ snapshot và version ban đầu. Test API trả chậm bằng route gate đạt 1/1 (15.2s): lần đầu chưa binding không bị gắn bù khi API tới, sau sửa câu/reload vẫn nguyên. Chờ route handler kết thúc trước teardown thay vì bỏ qua lỗi; typecheck/ESLint/diff check đạt.
- **Dữ liệu giữ được:** kiểm trên browser guest cách ly; không thay DB/progress người dùng, không gửi server attempt hoặc tự tạo mastery/FSRS.
- **Tiếp theo:** triển khai phiên và ghi kết quả server với owner/reset/idempotency, nối consumer; nội dung authored local vẫn 45 và phần còn lại của scope v0.2 chưa hoàn tất.

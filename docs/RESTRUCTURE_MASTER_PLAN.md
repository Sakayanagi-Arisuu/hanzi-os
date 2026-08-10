# HANZI.OS Reforge — kế hoạch tái cấu trúc 100 task

> Trạng thái: kế hoạch thực thi mới. Phạm vi: Mainland Mandarin, giao diện tiếng Việt, HSK0–HSK4, local-first. Hoàn thành đủ 100 task theo đúng DoD dưới đây đồng nghĩa bản phát hành đạt độ sâu chức năng và sư phạm tương đương kiến trúc học của ChineseSkill trong phạm vi này, nhưng dùng mã nguồn, nội dung, âm thanh, hình ảnh và nhận diện nguyên bản của HANZI.OS.

## Hợp đồng phạm vi

- ChineseSkill chỉ là chuẩn tham chiếu về mô hình sản phẩm: lộ trình bài nhỏ, nhiều dạng hoạt động, luyện âm–nói–viết, SRS, thư viện tăng cường, hội thoại AI và đánh giá. Không sao chép câu chữ, bài học, media, asset, bố cục đặc hữu, nhãn hiệu hay dữ liệu độc quyền.
- Giữ và di trú có kiểm soát các curriculum ID/content ID hiện có, kho nội dung đã nối UI, FSRS, attempt/evidence, offline store và auth. Không viết lại sạch hoặc xoá consumer còn sống.
- Hologram là lớp nhận diện, không phải lớp gây nhiễu: từ ngữ điều hướng phải phổ thông; mỗi màn hình có một hành động chính; năm khu vực cấp một cố định là **Học / Ôn / Nói / Luyện / Hồ sơ**.
- HSK0–HSK4 được tuyên bố “đủ” chỉ khi inventory công khai đạt 100%, mọi bài mở được theo prerequisite, đủ hoạt động/đáp án/giải thích, có kiểm tra level end-to-end và disclosure nguồn/review đúng sự thật.
- Local guest phải học trọn vẹn. Đăng nhập chỉ cần cho đồng bộ đa thiết bị, quản lý tài khoản và workspace theo vai trò. Hosting thương mại không nằm trên critical path, ngoại trừ dịch vụ thật sự cần provider như OAuth, sync đa thiết bị, ASR hoặc AI tutor; mọi chỗ đó phải có adapter thay thế được.
- Một task chỉ được đánh dấu `DONE` khi có liên kết tới bằng chứng trong checkpoint: thay đổi người học thấy được, targeted check xanh, browser smoke ở viewport liên quan và migration/rollback check nếu đụng dữ liệu. Không tính file draft, số dòng code hoặc test riêng lẻ là tiến độ.

## Sổ trạng thái

Hiện tại **T001–T002 đã `DONE / ACCEPTED`**, T003 đang `IN_PROGRESS`, 97 task còn
`PENDING` và tiến độ Reforge là `2/100 ACCEPTED`. Khi thực thi, thêm trạng thái hiện hành ngay cuối dòng task theo
một trong bốn giá trị `PENDING`, `IN_PROGRESS`, `BLOCKED`, `DONE`; task không ghi
trạng thái tường minh được hiểu là `PENDING`. Chỉ `DONE` đã có evidence/acceptance
link trong checkpoint mới được cộng tiến độ. Mỗi thời điểm chỉ một task tích hợp
chính là `IN_PROGRESS`; task `BLOCKED` phải ghi điều kiện mở khóa cụ thể.

## Ký hiệu định tuyến

- **Core:** triển khai repo-native, validator và test hiện có; không cần skill chuyên biệt.
- **UX:** `ui-ux-pro-max` → `design-system` → `ui-styling`.
- **Brand:** `brand`; chỉ dùng `imagegen` cho asset bitmap nguyên bản đã có brief và quyền sử dụng.
- **Browser:** `browser:control-in-app-browser` cho smoke/E2E trực quan.
- **OS-QA:** `computer-use:computer-use` cho microphone, bàn phím IME, canvas và kiểm tra Windows/app thật.
- **AI:** `openai-docs` khi chọn/tích hợp OpenAI; mọi provider khác phải theo tài liệu chính thức tương ứng.
- **Content:** playbook/validator nội bộ và kiểm tra năm pass; không có skill nào thay thế người duyệt ngôn ngữ.
- **[EXT]:** cần provider, thiết bị hoặc dữ liệu ngoài repo. **[HUMAN]:** cần người bản ngữ/chuyên gia hoặc usability tester. Task có nhãn này chưa được `DONE` chỉ bằng mock.

## P0 — Chốt đích, đường chuẩn và an toàn dữ liệu

- **T001 — Chốt hợp đồng sản phẩm Reforge.** **Kết quả:** một north-star có persona, phạm vi Mainland Mandarin HSK0–4, năm tab và ranh giới không sao chép. **DoD/Bằng chứng:** trang giới thiệu trong build dev và product spec dùng cùng tên/khái niệm; ba reviewer độc lập không tham gia triển khai mô tả đúng luồng chính (review ngữ nghĩa có thể dùng agent; usability với người thật thuộc T011). **Phụ thuộc:** không. **Tuyến:** Core + UX. **Trạng thái:** `DONE`. **Evidence:** `IMPLEMENTATION_CHECKPOINT.md` §7/T001.
- **T002 — Lập ma trận benchmark có nguồn.** **Kết quả:** từng năng lực tham chiếu được phân loại `OBSERVED / OFFICIAL_CLAIM / UNVERIFIED / OUT_OF_SCOPE`. **DoD/Bằng chứng:** ma trận truy ngược từ feature đến nguồn, task và tiêu chí nghiệm thu; không có claim “giống hệt” thiếu bằng chứng. **Phụ thuộc:** T001. **Tuyến:** Core + Browser. **Trạng thái:** `DONE`. **Evidence:** `IMPLEMENTATION_CHECKPOINT.md` §7/T002.
- **T003 — Chụp baseline repo và hành trình hiện tại.** **Kết quả:** inventory route, component, content package, store, API, role và consumer thật. **DoD/Bằng chứng:** người học cũ vẫn mở được một bài, hoàn thành, ôn và khôi phục; snapshot ID/count được máy kiểm tra. **Phụ thuộc:** T001. **Tuyến:** Core + Browser. **Trạng thái:** `IN_PROGRESS`.
- **T004 — Đóng băng danh tính dữ liệu học.** **Kết quả:** contract bất biến cho learner/content/curriculum/lesson/activity/attempt/evidence ID và version. **DoD/Bằng chứng:** bài đã học trước Reforge hiện đúng tiến độ sau khi nạp build mới; contract test bắt lỗi đổi ID ngoài manifest. **Phụ thuộc:** T003. **Tuyến:** Core. **An toàn:** không đổi/xoá ID đã phát hành nếu chưa có alias và migration.
- **T005 — Xây backup, restore và migration runner có phiên bản.** **Kết quả:** mọi thay đổi IndexedDB/local/account store đi qua migration thuận–nghịch hoặc forward-safe. **DoD/Bằng chứng:** fixture của ba phiên bản cũ được nâng cấp, reload và restore không mất attempt/bookmark/FSRS; có nút tải backup trong Hồ sơ. **Phụ thuộc:** T004. **Tuyến:** Core + Browser. **An toàn:** fail-closed, giữ bản sao trước migration.
- **T006 — Hợp nhất mô hình trạng thái local và account.** **Kết quả:** một domain runtime cho guest, signed-in và role; UI không còn hai nhánh logic mâu thuẫn. **DoD/Bằng chứng:** cùng một hành trình Học→Ôn chạy ở guest và tài khoản test với kết quả tương đương; không còn chớp màn “khôi phục”. **Phụ thuộc:** T004–T005. **Tuyến:** Core + Browser.
- **T007 — Tạo biên provider-neutral cho auth, sync, ASR và AI.** **Kết quả:** domain không import SDK nhà cung cấp; local adapter luôn hoạt động. **DoD/Bằng chứng:** tắt toàn bộ biến môi trường ngoài mà guest vẫn học/ôn/viết; màn cần provider giải thích rõ và có fallback. **Phụ thuộc:** T006. **Tuyến:** Core + AI.
- **T008 — Chuẩn hoá event và learning evidence.** **Kết quả:** event có schema/version/idempotency/content version, tách hành vi UI khỏi bằng chứng kỹ năng. **DoD/Bằng chứng:** một attempt chỉ ghi một lần qua reload/retry; người học xem được lịch sử phiên hợp lý, dev xem chi tiết ở chế độ dev. **Phụ thuộc:** T004, T006. **Tuyến:** Core.
- **T009 — Thiết lập feature flag và cầu tương thích legacy.** **Kết quả:** Reforge được bật theo vertical slice, route/store cũ có adapter hoặc redirect đo được. **DoD/Bằng chứng:** người học đổi build không gặp 404 hay mất bài đang dở; rollback flag khôi phục shell cũ trên cùng dữ liệu. **Phụ thuộc:** T005–T008. **Tuyến:** Core + Browser. **An toàn:** chỉ xoá cầu sau T099.
- **T010 — Dựng bảng nghiệm thu và quality budget.** **Kết quả:** mỗi task có owner/status/evidence; một manifest có phiên bản khóa ngưỡng cho lỗi nghiêm trọng, accessibility, performance, content accuracy, data loss và mọi cụm “đạt ngưỡng/target” trong kế hoạch. **DoD/Bằng chứng:** CI chặn task thiếu evidence hoặc tham chiếu ngưỡng chưa định nghĩa; trang người học không lộ log kỹ thuật; baseline gate và công thức đo được lưu trước khi đổi UI. **Phụ thuộc:** T002–T009. **Tuyến:** Core + Browser.

### Gate M0

Chỉ qua khi fixture dữ liệu cũ nâng cấp/restore xanh, guest học được không cần provider, toàn bộ ID đã phát hành có manifest và ma trận benchmark không chứa claim chưa phân loại.

## P1 — Kiến trúc thông tin và hệ giao diện hologram dễ dùng

- **T011 — Kiểm chứng vấn đề sử dụng với người thật.** **Kết quả:** danh sách ưu tiên từ ít nhất 5 phiên think-aloud gồm người mới và người đã dùng bản cũ. **DoD/Bằng chứng:** 100% tester tìm được bài đầu, Ôn và Hồ sơ không cần hướng dẫn; lỗi còn lại được gắn task. **Phụ thuộc:** T003. **Tuyến:** UX + Browser. **[HUMAN]**
- **T012 — Chốt sitemap năm tab.** **Kết quả:** mọi feature có đúng một “nhà” trong Học/Ôn/Nói/Luyện/Hồ sơ; công cụ dev ra khỏi UI production. **DoD/Bằng chứng:** người học hoàn thành card-sort với tỷ lệ đúng mục tiêu; không có điều hướng cấp một thứ sáu. **Phụ thuộc:** T001, T011. **Tuyến:** UX.
- **T013 — Di trú route và deep link.** **Kết quả:** URL cũ redirect tới màn mới có ngữ cảnh; back/forward và refresh ổn định. **DoD/Bằng chứng:** danh sách route lịch sử smoke 100%, không vòng lặp redirect/flash; bài đang dở mở đúng activity. **Phụ thuộc:** T009, T012. **Tuyến:** Core + Browser. **An toàn:** giữ redirect ít nhất một release dữ liệu.
- **T014 — Xây token thiết kế hologram semantic.** **Kết quả:** màu, type, spacing, layer, focus, motion và state dùng token; độ tương phản đạt WCAG AA. **DoD/Bằng chứng:** theme trông nhất quán ở light/dark nếu hỗ trợ, nhưng chữ/CTA đọc rõ ở mobile; token audit không còn màu trạng thái hardcode. **Phụ thuộc:** T012. **Tuyến:** Brand + UX.
- **T015 — Chuẩn hoá ngôn ngữ, icon và phân cấp.** **Kết quả:** nhãn Việt phổ thông là chính, thuật ngữ thế giới quan chỉ làm phụ; icon cùng một hệ, không dùng emoji cấu trúc. **DoD/Bằng chứng:** người mới giải thích đúng 5 tab và CTA; heading/action/status không bị cắt hay mờ. **Phụ thuộc:** T014. **Tuyến:** UX + Brand.
- **T016 — Tái tạo app shell responsive.** **Kết quả:** bottom nav mobile, rail/side nav desktop, header tối giản và vùng nội dung ổn định. **DoD/Bằng chứng:** 360×640, 768×1024 và 1440×900 không overflow/che nội dung; touch target ≥44px, tab/focus đúng. **Phụ thuộc:** T013–T015. **Tuyến:** UX + Browser.
- **T017 — Thiết kế màn Học theo lộ trình.** **Kết quả:** tiếp tục bài, unit hiện tại, mục tiêu và khóa prerequisite nhìn thấy ngay; một CTA chính. **DoD/Bằng chứng:** người học mới vào bài đầu trong ≤2 hành động, người cũ tiếp tục đúng chỗ trong 1 hành động. **Phụ thuộc:** T012, T016, T021. **Tuyến:** UX + Browser.
- **T018 — Chuẩn hoá card và trạng thái khóa/tiến độ.** **Kết quả:** `chưa mở / sẵn sàng / đang học / cần ôn / hoàn tất` có chữ, icon và màu không nhập nhằng. **DoD/Bằng chứng:** không còn phần trăm 100% từ vài câu; card bị khóa luôn nêu điều kiện mở. **Phụ thuộc:** T014–T017, T046. **Tuyến:** UX + Core.
- **T019 — Loại flicker và giảm motion.** **Kết quả:** hydration/recovery dùng shell cố định; animation chỉ hỗ trợ chuyển trạng thái, có reduced-motion. **DoD/Bằng chứng:** quay video reload/route/restore không lộ trang khác; CLS và long-animation nằm trong budget; hệ điều hành giảm chuyển động được tôn trọng. **Phụ thuộc:** T006, T016. **Tuyến:** UX + Browser + OS-QA.
- **T020 — Chuẩn hoá template, loading, lỗi và thông báo.** **Kết quả:** page/empty/loading/error/toast/dialog nhất quán; nghiệp vụ kỹ thuật chỉ hiện trong dev panel. **DoD/Bằng chứng:** người học chỉ nhận thông báo có hành động rõ; lỗi offline/provider có cách tiếp tục; screen-reader đọc đúng. **Phụ thuộc:** T014–T019. **Tuyến:** UX + Browser.

### Gate M1

Chỉ qua khi năm tab ổn định trên mobile/desktop, không còn flicker khôi phục, toàn bộ route cũ có đích, reduced-motion/keyboard/screen-reader smoke xanh và 5 tester hoàn thành ba hành trình cốt lõi.

## P2 — Curriculum, nội dung và knowledge card HSK0–HSK4

- **T021 — Công bố inventory chuẩn HSK0–HSK4.** **Kết quả:** mapping có provenance cho từ, Hanzi, ngữ pháp, chủ đề, kỹ năng và prerequisite; nêu rõ chuẩn HSK dùng. **DoD/Bằng chứng:** màn Học và báo cáo coverage đọc cùng manifest; không đếm draft/chưa nối UI. **Phụ thuộc:** T002, T004. **Tuyến:** Content + Core.
- **T022 — Chuẩn hoá lesson package.** **Kết quả:** schema bắt buộc mục tiêu, prerequisite, level, vocabulary, dialogue/reading, grammar, activities, answer/explanation, review disclosure. **DoD/Bằng chứng:** validator từ chối bài thiếu thành phần; một lesson mẫu render trọn vẹn trên UI. **Phụ thuộc:** T021. **Tuyến:** Content + Core + Browser.
- **T023 — Chuẩn hoá activity và media manifest.** **Kết quả:** union có version cho prompt, modality, answer, distractor, hint, explanation, evidence mapping, audio/video/stroke reference. **DoD/Bằng chứng:** fixture mỗi loại chạy qua adapter mà không cast đặc biệt; media thiếu có fallback rõ. **Phụ thuộc:** T008, T022. **Tuyến:** Core + Content.
- **T024 — Tạo knowledge card theo ngữ cảnh.** **Kết quả:** card ngắn cho từ/Hanzi/ngữ pháp với Pinyin, nghĩa Việt, ví dụ, ghi chú dùng và nút nghe/luyện. **DoD/Bằng chứng:** mỗi unit có card trước hoặc trong lúc cần; người học quay lại đúng activity không mất trạng thái. **Phụ thuộc:** T022–T023. **Tuyến:** Content + UX + Browser.
- **T025 — Hợp nhất authoring pipeline và validator.** **Kết quả:** draft→validate→AI-review→runtime-wire→UI-integrate có lệnh check một nguồn, không sinh artifact mồ côi. **DoD/Bằng chứng:** sửa một nguồn cập nhật đúng runtime package; drift/generated file bị CI bắt; người học chỉ thấy bản UI-integrated. **Phụ thuộc:** T021–T024. **Tuyến:** Content + Core.
- **T026 — Áp dụng review năm pass và provenance.** **Kết quả:** kiểm tra đúng ngôn ngữ, đúng level, tự nhiên, distractor/giải thích, an toàn/bản quyền; giữ `humanReviewed` trung thực. **DoD/Bằng chứng:** UI disclosure không tuyên bố native/chứng nhận sai; report truy được reviewer/version cho từng bài. **Phụ thuộc:** T025. **Tuyến:** Content. **[HUMAN]** chỉ khi chuyển `humanReviewed: true`.
- **T027 — Hoàn thiện và di trú HSK0–HSK1.** **Kết quả:** 4/4 HSK0 và 40/40 HSK1 (hoặc inventory kế nhiệm được phê duyệt) đủ rich lesson, knowledge card và activity đa dạng. **DoD/Bằng chứng:** coverage inventory 100%, mọi bài mở đúng prerequisite, lesson/level check và UI smoke xanh. **Phụ thuộc:** T025–T026, T031–T040. **Tuyến:** Content + Core + Browser. **An toàn:** giữ alias ID và attempt cũ.
- **T028 — Hoàn thiện và di trú HSK2.** **Kết quả:** 40/40 bài hiện có hoặc inventory kế nhiệm phủ 100% từ/ngữ pháp/chủ đề HSK2 bằng nội dung nguyên bản. **DoD/Bằng chứng:** full path HSK2, review queue và level check dùng đúng evidence; không có bài placeholder. **Phụ thuộc:** T027, T031–T040. **Tuyến:** Content + Core + Browser. **An toàn:** như T027.
- **T029 — Hoàn thiện và di trú HSK3.** **Kết quả:** 55/55 bài hiện có hoặc inventory kế nhiệm phủ 100%, tăng tỷ lệ đọc/nghe/hội thoại phù hợp cấp. **DoD/Bằng chứng:** learner-visible audit mở ngẫu nhiên mọi unit; validator và level check xanh; không unlock từ package chưa tích hợp. **Phụ thuộc:** T028, T031–T040. **Tuyến:** Content + Core + Browser. **An toàn:** như T027.
- **T030 — Hoàn thiện và di trú HSK4.** **Kết quả:** 78/78 bài hiện có hoặc inventory kế nhiệm phủ 100%, có văn bản dài hơn, sắc thái ngữ pháp và nhiệm vụ tích hợp. **DoD/Bằng chứng:** toàn bộ HSK0–4 chạy end-to-end, coverage report khớp UI, không claim HSK4 nếu còn gap. **Phụ thuộc:** T029, T031–T040, T050. **Tuyến:** Content + Core + Browser. **An toàn:** như T027.

### Gate M2

Gate nội dung đóng theo từng level, không chờ đủ cả bốn: inventory 100%, package/version hợp lệ, activity thật, disclosure đúng, level check và ít nhất một UI smoke mỗi unit. T030 chỉ `DONE` khi HSK0–4 đều đạt gate.

## P3 — Activity engine cốt lõi

- **T031 — Xây session orchestrator.** **Kết quả:** engine chọn activity từ objective, level, modality và history thay vì màn hardcode theo bài. **DoD/Bằng chứng:** một session hỗn hợp chạy liền mạch, pause/resume đúng activity và không lặp ghi attempt. **Phụ thuộc:** T006, T008, T023. **Tuyến:** Core + Browser.
- **T032 — Xây activity frame dùng chung.** **Kết quả:** progress, prompt, media, answer, hint, feedback, CTA và keyboard semantics dùng một contract. **DoD/Bằng chứng:** mobile không che prompt/CTA; screen-reader/focus flow đúng; đổi activity không nhảy layout. **Phụ thuộc:** T016, T020, T031. **Tuyến:** UX + Core + Browser.
- **T033 — Hoàn thiện chọn đáp án chữ/hình.** **Kết quả:** single/multiple choice và picture-word có distractor chất lượng, không dựa màu để hiểu. **DoD/Bằng chứng:** mouse/touch/keyboard đều trả lời được; explanation hiện sau chấm, evidence ghi đúng kỹ năng. **Phụ thuộc:** T032. **Tuyến:** Core + UX + Content.
- **T034 — Hoàn thiện nối cặp.** **Kết quả:** ghép Hanzi–Pinyin–nghĩa–audio hỗ trợ số lượng và độ khó theo level. **DoD/Bằng chứng:** không mơ hồ do đáp án trùng; touch/keyboard/reduced-motion dùng được; attempt được chấm ổn định. **Phụ thuộc:** T032. **Tuyến:** Core + UX + Content.
- **T035 — Hoàn thiện sắp xếp câu.** **Kết quả:** token reorder hỗ trợ câu dài, punctuation, alternative answer và bàn phím. **DoD/Bằng chứng:** HSK4 không tràn màn; mọi đáp án hợp lệ theo schema được chấp nhận và giải thích trật tự từ. **Phụ thuộc:** T032, T023. **Tuyến:** Core + UX + Content.
- **T036 — Hoàn thiện điền khuyết theo ngữ cảnh.** **Kết quả:** cloze chữ/từ/cụm có gợi ý tăng dần và nhiều đáp án chuẩn hoá. **DoD/Bằng chứng:** không phạt lỗi khoảng trắng/ký tự tương đương; feedback nêu điểm ngữ pháp thay vì chỉ đúng/sai. **Phụ thuộc:** T032, T024. **Tuyến:** Core + Content.
- **T037 — Hoàn thiện dịch hai chiều Việt–Trung.** **Kết quả:** chấm theo tập đáp án/ý nghĩa được duyệt, không so chuỗi duy nhất. **DoD/Bằng chứng:** alternative tự nhiên được chấp nhận; câu sai nhận gợi ý có kiểm soát và không bị ghi thành mastery kỹ năng khác. **Phụ thuộc:** T032, T026. **Tuyến:** Core + Content.
- **T038 — Hoàn thiện nghe–chọn và chính tả.** **Kết quả:** audio-first activity có replay, tốc độ chậm, giới hạn transcript và fallback. **DoD/Bằng chứng:** người học nghe mà không lộ đáp án; skip hợp lệ nếu thiết bị không phát âm thanh; evidence chỉ tính Nghe/Viết tương ứng. **Phụ thuộc:** T032, T054. **Tuyến:** Core + UX + Content.
- **T039 — Thêm trợ nhập Hanzi/Pinyin.** **Kết quả:** virtual Pinyin composer/candidate picker và hướng dẫn bật IME, không buộc máy có bàn phím Trung. **DoD/Bằng chứng:** người dùng Windows/mobile không cài IME vẫn nhập được đáp án mục tiêu; hỗ trợ paste/keyboard và không tự lộ đáp án. **Phụ thuộc:** T032. **Tuyến:** UX + Core + OS-QA.
- **T040 — Thêm “Vì sao?” và phục hồi lỗi.** **Kết quả:** mỗi item có explanation ngắn, knowledge card liên quan, hint theo tầng và thử lại có chủ đích. **DoD/Bằng chứng:** sau sai người học hiểu quy tắc và tiếp tục trong một CTA; item thiếu explanation bị validator chặn. **Phụ thuộc:** T024, T032–T039. **Tuyến:** Content + UX + Core.

## P4 — Hành trình bài học, thích ứng và mastery đáng tin

- **T041 — Chuẩn hoá mở bài.** **Kết quả:** mục tiêu, prerequisite, thời lượng ước tính, modality và nội dung sẽ học hiển thị ngắn gọn. **DoD/Bằng chứng:** người học biết cần âm thanh/micro trước khi bắt đầu và vào bài bằng một CTA. **Phụ thuộc:** T017, T022, T031. **Tuyến:** UX + Browser.
- **T042 — Xây sequencer thích ứng có giới hạn.** **Kết quả:** engine thay đổi thứ tự/số lần dựa evidence nhưng giữ mục tiêu và budget bài. **DoD/Bằng chứng:** fixture người mới/yếu/mạnh nhận sequence giải thích được; không tạo vòng lặp hay rút bài xuống vài item vô nghĩa. **Phụ thuộc:** T008, T031, T046. **Tuyến:** Core.
- **T043 — Cho phép điều khiển modality.** **Kết quả:** người học có thể tạm bỏ speaking/listening khi môi trường không phù hợp và được bù lại sau. **DoD/Bằng chứng:** chọn “không dùng micro/âm thanh lúc này” không chặn bài, không tạo mastery giả và có lịch nhắc bù. **Phụ thuộc:** T007, T041–T042. **Tuyến:** UX + Core.
- **T044 — Autosave, resume và recovery ổn định.** **Kết quả:** session lưu theo checkpoint nhỏ, recovery diễn ra trong shell hiện tại. **DoD/Bằng chứng:** kill tab ở mọi activity rồi mở lại không mất quá một câu, không nháy trang khôi phục, không ghi trùng. **Phụ thuộc:** T005–T006, T031. **Tuyến:** Core + Browser.
- **T045 — Bảo toàn idempotency và content version.** **Kết quả:** submit/retry/offline replay có idempotency key; attempt giữ schema/content version. **DoD/Bằng chứng:** double-click, reload và sync lại chỉ tạo một attempt; lịch sử cũ vẫn giải nghĩa được sau sửa content. **Phụ thuộc:** T008, T023, T044. **Tuyến:** Core. **An toàn:** không mutate attempt đã ghi.
- **T046 — Tách coverage, accuracy, confidence và mastery.** **Kết quả:** tiến độ không còn lấy vài câu/XP làm 100%; mỗi kỹ năng cần mẫu tối thiểu và độ mới. **DoD/Bằng chứng:** “Thất Trụ”/dashboard hiển thị số lượt và mức tin cậy bằng ngôn ngữ thường; fixture 2/2 từ không thể thành hoàn thành level. **Phụ thuộc:** T008, T021, T045. **Tuyến:** Core + UX.
- **T047 — Chuẩn hoá feedback tức thời.** **Kết quả:** đúng/sai, đáp án, lý do, lỗi điển hình và hành động kế tiếp phân cấp rõ; không spam toast nghiệp vụ. **DoD/Bằng chứng:** feedback vừa một viewport mobile, screen-reader đọc đúng và có link “Vì sao?” khi cần. **Phụ thuộc:** T020, T040, T046. **Tuyến:** UX + Content.
- **T048 — Thiết kế hoàn tất bài và động lực tiết chế.** **Kết quả:** tóm tắt mục tiêu đạt/chưa đạt, mục cần ôn và CTA kế; XP/streak là động lực, không là mastery. **DoD/Bằng chứng:** kết thúc bài không confetti/motion bắt buộc; số liệu khớp evidence và mở đúng bài/ôn tiếp theo. **Phụ thuộc:** T046–T047. **Tuyến:** UX + Core.
- **T049 — Xây placement, unlock và recommendation rules.** **Kết quả:** rule minh bạch nhận kết quả assessment/review theo contract, không dựa XP. **DoD/Bằng chứng:** fixture đầu vào mở đúng điểm bắt đầu, người cũ giữ quyền mở hợp lệ; mỗi khóa/đề xuất nêu lý do. **Phụ thuộc:** T008, T021, T046. **Tuyến:** Core + UX. **An toàn:** migration không khóa lại nội dung đã hoàn thành chính đáng.
- **T050 — Đóng vertical slice Main Course.** **Kết quả:** Học→lesson đa activity→feedback→complete→Ôn→resume chạy trên cùng engine và state. **DoD/Bằng chứng:** E2E guest/account, mobile/desktop, online/offline và dữ liệu legacy xanh; không còn route lesson song song ngoài adapter. **Phụ thuộc:** T031–T049. **Tuyến:** Core + Browser + OS-QA.

### Gate M3

Chỉ qua khi vertical slice T050 chạy ổn định, 100% activity có keyboard/touch, nhập Hanzi không cần IME, autosave không flicker/mất dữ liệu và dashboard không suy mastery từ XP hoặc quá ít mẫu.

## P5 — Nghe, phát âm, nói, viết tay và media bản ngữ

- **T051 — Ban hành tiêu chuẩn media và quyền sử dụng.** **Kết quả:** script, speaker profile, tốc độ, pronunciation variant, loudness, caption, consent/license, file naming và QA manifest. **DoD/Bằng chứng:** UI hiển thị đúng nguồn/variant; validator chặn media thiếu quyền, transcript hoặc checksum. **Phụ thuộc:** T021–T026. **Tuyến:** Content + Core. **[HUMAN] [EXT]**
- **T052 — Sản xuất native audio HSK0–HSK4.** **Kết quả:** từ, ví dụ, dialogue/reading và prompt cần thiết có giọng người thật theo coverage manifest; TTS chỉ là fallback được gắn nhãn. **DoD/Bằng chứng:** media coverage 100% tập bắt buộc, native reviewer ký QA phát âm/âm lượng và learner chuyển giọng/tốc độ được. **Phụ thuộc:** T051. **Tuyến:** Content. **[HUMAN] [EXT]**
- **T053 — Sản xuất micro-video ngữ cảnh nguyên bản.** **Kết quả:** các mục tiêu giao tiếp ưu tiên có video ngắn, caption, transcript và phiên bản audio-only; không sao chép clip tham chiếu. **DoD/Bằng chứng:** video không autoplay gây khó chịu, tải theo nhu cầu, reviewer duyệt tự nhiên/văn hoá và offline fallback hoạt động. **Phụ thuộc:** T021, T024, T051. **Tuyến:** Brand + Content. **[HUMAN] [EXT]**
- **T054 — Xây player học ngôn ngữ thống nhất.** **Kết quả:** play/pause/replay/loop/slow/autoplay setting/caption dùng chung cho lesson, review, reader và booster. **DoD/Bằng chứng:** điều khiển touch/keyboard/screen-reader được; đổi route không phát âm thanh ma; preference được nhớ. **Phụ thuộc:** T016, T020, T051. **Tuyến:** UX + Core + Browser.
- **T055 — Xây giáo trình thanh điệu miễn phí.** **Kết quả:** kiến thức Pinyin, bốn thanh+thanh nhẹ, biến điệu và cặp dễ nhầm đi từ nhận biết đến sản xuất. **DoD/Bằng chứng:** khóa học mở từ Nói, có baseline/post-check và không dùng TTS làm chuẩn duy nhất. **Phụ thuộc:** T021–T026, T052, T054. **Tuyến:** Content + UX. **[HUMAN]** duyệt ngôn ngữ.
- **T056 — Tích hợp capture và ASR qua adapter.** **Kết quả:** xin quyền micro đúng lúc, record/playback, timeout/retry và provider/local implementation thay được. **DoD/Bằng chứng:** từ chối quyền hoặc mất mạng vẫn tiếp tục; audio không rời thiết bị nếu chưa có consent; provider contract test xanh. **Phụ thuộc:** T007, T043, T054. **Tuyến:** Core + OS-QA + AI. **[EXT]** cho scoring cloud.
- **T057 — Xây chấm phát âm có độ tin cậy.** **Kết quả:** tách transcription, âm đầu/vần và đường cao độ thanh; kết quả có confidence và feedback luyện lại. **DoD/Bằng chứng:** benchmark giọng thật được human-label, ngưỡng sai không tuyên mastery nói; fallback tự nghe/so mẫu khi confidence thấp. **Phụ thuộc:** T052, T055–T056. **Tuyến:** Core + Content + OS-QA. **[HUMAN] [EXT]**
- **T058 — Xây speaking drill và hội thoại có nhịp.** **Kết quả:** shadowing, repeat, role-play và lượt thoại tăng dần theo level; có tốc độ và bỏ micro tạm thời. **DoD/Bằng chứng:** người học nghe–ghi–nghe lại–nhận feedback trong một flow; evidence Nói chỉ ghi khi có mẫu hợp lệ. **Phụ thuộc:** T043, T052, T056–T057. **Tuyến:** UX + Core + Content.
- **T059 — Xây canvas viết Hanzi và stroke engine.** **Kết quả:** mouse/touch/pen, stroke order dữ liệu có giấy phép, ghost guide, undo/clear và practice không chấm. **DoD/Bằng chứng:** các nét không bị lệch khi resize; người học xem animation rồi tự viết và tự gọi lại không guide; char bank gọi chung engine; UI ghi rõ chưa nhận dạng/chấm nét và không sinh mastery viết khi chưa có recognizer được cấp phép, hiệu chuẩn. **Phụ thuộc:** T007, T023, T016. **Tuyến:** Core + UX + OS-QA. **[EXT]** nếu cần dataset stroke mở.
- **T060 — Đóng gate modality và accessibility.** **Kết quả:** Nghe/Nói/Viết tay hoạt động trong lesson, Ôn và Luyện; có privacy, caption, transcript và phương án không micro/âm thanh/pen. **DoD/Bằng chứng:** ma trận thiết bị thật + browser E2E xanh, human QA media đạt ngưỡng, không có skill score từ evidence khác. **Phụ thuộc:** T052–T059. **Tuyến:** Browser + OS-QA + Content. **[HUMAN]**

### Gate M4

Chỉ qua khi native audio coverage bắt buộc đạt 100%, media có quyền/transcript, tone/ASR được benchmark bằng giọng thật, viết tay chạy bằng chuột/touch/pen và mọi modality có fallback không tạo mastery giả.

## P6 — Ôn tập, FSRS và bằng chứng học tập

- **T061 — Chuẩn hoá evidence theo kỹ năng.** **Kết quả:** phát âm/nghe/nói/đọc/viết/từ vựng/ngữ pháp có evidence riêng, sample threshold và source activity hợp lệ. **DoD/Bằng chứng:** bảng phân tích nêu `chưa đủ dữ liệu` thay vì phần trăm giả; contract test ngăn suy chéo kỹ năng. **Phụ thuộc:** T008, T046, T060. **Tuyến:** Core + UX.
- **T062 — Hợp nhất một FSRS scheduler.** **Kết quả:** lesson, bookmark, mistake, bank và custom deck dùng chung item identity/schedule, không tạo lịch trùng. **DoD/Bằng chứng:** lịch FSRS cũ được migrate bảo toàn due/stability/difficulty; cùng item xuất hiện một lần với nguồn liên kết. **Phụ thuộc:** T005, T061. **Tuyến:** Core. **An toàn:** snapshot và so sánh lịch trước/sau.
- **T063 — Xây hàng đợi Ôn ưu tiên.** **Kết quả:** due/overdue/weak/recent mistake được trộn có giới hạn và giải thích. **DoD/Bằng chứng:** tab Ôn cho biết số thẻ/thời lượng, bắt đầu trong một CTA và empty state đưa về Học/Luyện hợp lý. **Phụ thuộc:** T062, T016. **Tuyến:** Core + UX + Browser.
- **T064 — Đa dạng hoá review activity.** **Kết quả:** một item luân phiên recognition, recall, listen, type, speak/write khi phù hợp; không luôn multiple choice. **DoD/Bằng chứng:** scheduler chọn modality theo evidence thiếu, skip thiết bị không phạt và grade đúng FSRS. **Phụ thuộc:** T033–T039, T060, T063. **Tuyến:** Core + Content.
- **T065 — Hoàn thiện bookmark review.** **Kết quả:** bookmark từ lesson/card/reader/bank có ghi chú và vào queue riêng hoặc FSRS. **DoD/Bằng chứng:** add/remove không reload, tìm thấy trong Ôn, sync/migration không nhân đôi. **Phụ thuộc:** T062–T064. **Tuyến:** Core + UX.
- **T066 — Hoàn thiện custom deck.** **Kết quả:** tạo/đổi tên/thêm item/xóa có xác nhận/chọn mode/import lawful/export deck trong phạm vi content đã có quyền. **DoD/Bằng chứng:** deck chạy bằng activity engine, lịch không xung đột main queue và dữ liệu cũ khôi phục được; xóa deck không xóa item hay lịch FSRS dùng chung; các bank sau đó chỉ gọi API deck chung. **Phụ thuộc:** T023, T062–T065. **Tuyến:** Core + UX. **An toàn:** import validate/schema-version, không overwrite im lặng.
- **T067 — Xây sổ lỗi.** **Kết quả:** lỗi gần đây nhóm theo mẫu ngữ pháp/từ/âm, có explanation và luyện lại. **DoD/Bằng chứng:** người học mở từ feedback hoặc Ôn; sửa đúng nhiều lần mới giảm ưu tiên, không tự xoá lịch sử. **Phụ thuộc:** T040, T045, T061–T064. **Tuyến:** Core + UX + Content.
- **T068 — Xây listen-along review.** **Kết quả:** playlist từ due/bookmark/dialogue có transcript ẩn/hiện, loop, tốc độ và auto-advance. **DoD/Bằng chứng:** màn khóa/tắt màn vẫn xử lý theo khả năng PWA, không đánh mastery chỉ vì đã nghe; item nghe xong có nút tự chấm/luyện. **Phụ thuộc:** T052, T054, T063, T065. **Tuyến:** Core + UX + Browser.
- **T069 — Hiệu chỉnh Thất Trụ và báo cáo tiến độ.** **Kết quả:** coverage/accuracy/confidence/retention/trend hiển thị theo level và kỹ năng, kèm mẫu số và giải thích. **DoD/Bằng chứng:** retention dùng dữ liệu due/stability/difficulty từ T062 và công thức/ngưỡng mẫu khóa ở T010; dữ liệu ít luôn hiện “cần thêm lượt”; drill chỉ tác động đúng trụ; test fixture khớp phép tính công bố. **Phụ thuộc:** T010, T046, T061–T068. **Tuyến:** Core + UX.
- **T070 — Đóng tab Ôn end-to-end.** **Kết quả:** due queue, bookmark, deck, sổ lỗi, listen-along và phân tích nằm trong IA rõ ràng. **DoD/Bằng chứng:** guest/account/offline hoàn tất một phiên rồi thấy lịch mới đúng; usability tester tìm đúng mode trong ≤2 hành động. **Phụ thuộc:** T061–T069. **Tuyến:** UX + Browser. **[HUMAN]** cho usability gate.

### Gate M5A

FSRS cũ phải di trú không đổi lịch ngoài tolerance đã công bố; item không trùng, mọi grade truy được activity/evidence, và Thất Trụ không hiển thị mastery khi sample chưa đủ.

## P7 — Thư viện tăng cường và luyện tự chọn

- **T071 — Xây hub Luyện theo mục đích.** **Kết quả:** Phrasebook, Fluency, Từ, Hanzi, Trò chơi và Reader được nhóm theo “muốn làm gì”, không theo tên nội bộ. **DoD/Bằng chứng:** người mới tìm được luyện du lịch, luyện câu và đọc truyện trong ≤2 hành động; một CTA chính mỗi card. **Phụ thuộc:** T012, T016, T020. **Tuyến:** UX + Browser.
- **T072 — Hoàn thiện Phrasebook nguyên bản.** **Kết quả:** chủ đề thực dụng có câu Trung/Pinyin/Việt, native audio, tốc độ, search, bookmark và SRS. **DoD/Bằng chứng:** coverage theo taxonomy công bố đạt 100%, mọi câu được human language QA và dùng offline sau tải. **Phụ thuộc:** T052, T062, T071. **Tuyến:** Content + Core + UX. **[HUMAN]**
- **T073 — Hoàn thiện Fluency Builder.** **Kết quả:** chuỗi hội thoại HSK1–4 tăng dần, có nghe theo vai, shadowing, giải thích và SRS câu. **DoD/Bằng chứng:** mỗi level đạt corpus target công bố, người học chuyển vai/tốc độ và luyện lại câu khó; không dùng dialogue main course làm bản sao vô nghĩa. **Phụ thuộc:** T052, T058, T062, T071. **Tuyến:** Content + Core + UX. **[HUMAN]**
- **T074 — Hoàn thiện Word Bank HSK0–HSK4.** **Kết quả:** danh mục từ theo level/chủ đề/trạng thái với ví dụ, audio, search, bookmark và review. **DoD/Bằng chứng:** count khớp inventory T021, không expose draft, mở từ một từ quay đúng lesson/knowledge card. **Phụ thuộc:** T021, T024, T052, T065, T071. **Tuyến:** Content + Core + UX.
- **T075 — Hoàn thiện Character Bank.** **Kết quả:** Hanzi theo level/bộ/thành phần, nghĩa/Pinyin/từ ví dụ, stroke animation, practice và custom deck. **DoD/Bằng chứng:** count khớp inventory, mọi chữ bắt buộc có stroke data hợp lệ hoặc nhãn fallback; search và handwriting dùng được. **Phụ thuộc:** T021, T059, T066, T071. **Tuyến:** Content + Core + UX.
- **T076 — Xây tìm kiếm xuyên thư viện.** **Kết quả:** tìm Hanzi/Pinyin không dấu/có dấu/Việt/chủ đề trả về lesson, card, phrase, dialogue và reader có quyền xem. **DoD/Bằng chứng:** bộ query chuẩn đạt precision/recall target; kết quả keyboard/mobile dùng được và không lộ content khóa/chưa tích hợp. **Phụ thuộc:** T072–T075. **Tuyến:** Core + UX + Browser.
- **T077 — Xây Practice Zone từ vựng.** **Kết quả:** game ngắn ghép nghĩa, âm–chữ, tốc độ recall và phân loại, tái dùng activity/evidence. **DoD/Bằng chứng:** chơi vui nhưng điểm game tách mastery; keyboard/touch/mobile, reduced-motion và không hẹn giờ đều dùng được; pool không lặp cạn. **Phụ thuộc:** T033–T034, T061, T071, T074. **Tuyến:** Core + UX + Content.
- **T078 — Xây Practice Zone ngữ pháp/câu.** **Kết quả:** sắp câu, sửa lỗi, cloze theo điểm ngữ pháp và thử thách hội thoại. **DoD/Bằng chứng:** item có explanation/provenance, độ khó theo HSK, keyboard/touch/mobile dùng được và score không mở khóa level nếu thiếu assessment. **Phụ thuộc:** T035–T040, T061, T071. **Tuyến:** Core + Content + UX.
- **T079 — Hoàn thiện Graded Reader nguyên bản.** **Kết quả:** corpus đọc HSK0–4 có audio, tap-to-gloss, grammar note, comprehension, bookmark và progress. **DoD/Bằng chứng:** mỗi level đạt target số bài/từ công bố, 100% human language QA trước `humanReviewed: true`, reader dùng font/mobile/offline tốt. **Phụ thuộc:** T021, T024, T052, T065, T071. **Tuyến:** Content + UX + Core. **[HUMAN]**
- **T080 — Đóng Booster/Library và content pack offline.** **Kết quả:** toàn bộ Luyện có download/update/delete pack theo level, checksum/version và dung lượng rõ. **DoD/Bằng chứng:** Phrasebook/Fluency/Banks/Games/Reader hoạt động airplane mode sau tải; update không xoá progress/bookmark; usability/E2E gate xanh. **Phụ thuộc:** T005, T025, T072–T079. **Tuyến:** Core + Browser + OS-QA. **An toàn:** atomic pack swap và rollback.

### Gate M5B

Chỉ qua khi tất cả thư viện có corpus target công khai, native media/review đúng disclosure, dùng chung FSRS/evidence, tìm kiếm không lộ draft và content pack offline cập nhật không mất dữ liệu.

## P8 — AI tutor và đánh giá chuẩn level

- **T081 — Thiết kế AI tutor an toàn, thay provider được.** **Kết quả:** prompt/data boundary, consent, retention, cost/rate limit, refusal và deterministic fallback; AI không tự sửa curriculum gốc. **DoD/Bằng chứng:** Nói vẫn có scripted practice khi thiếu key/mạng; người học biết lúc nào đang dùng AI và dữ liệu nào được gửi. **Phụ thuộc:** T007, T020, T058. **Tuyến:** AI + Core + UX. **[EXT]** cho inference thật.
- **T082 — Soạn 100+ chủ đề role-play nguyên bản.** **Kết quả:** topic theo HSK0–4, mục tiêu, persona, vocabulary/grammar guardrail và rubric; không sao chép scenario tham chiếu. **DoD/Bằng chứng:** catalog lọc theo level/chủ đề, validator và năm pass xanh; sample được human QA trước claim chất lượng. **Phụ thuộc:** T021, T026, T081. **Tuyến:** Content. **[HUMAN]**
- **T083 — Xây runtime hội thoại AI.** **Kết quả:** text/voice turn, context giới hạn, pause/resume, retry, transcript và scripted fallback trong tab Nói. **DoD/Bằng chứng:** hội thoại giữ đúng level/persona, không treo khi provider lỗi và người học xoá transcript được. **Phụ thuộc:** T056, T081–T082. **Tuyến:** AI + Core + UX. **[EXT]**
- **T084 — Thêm feedback ngữ pháp và cách diễn đạt.** **Kết quả:** sau lượt hoặc cuối phiên có lỗi, giải thích Việt, phương án tự nhiên và luyện lại; output được ràng schema. **DoD/Bằng chứng:** bộ eval đúng/sai/ảo giác đạt ngưỡng, feedback không tự nhận là chứng nhận và không ghi mastery khi confidence thấp. **Phụ thuộc:** T040, T061, T083. **Tuyến:** AI + Content + Core. **[HUMAN] [EXT]**
- **T085 — Thêm điều khiển tốc độ, độ khó và phong cách.** **Kết quả:** người học chọn tốc độ giọng, mức gợi ý, HSK target và một số persona an toàn; default theo evidence. **DoD/Bằng chứng:** đổi setting có hiệu lực phiên sau, không phá guardrail level; accessibility và voice fallback xanh. **Phụ thuộc:** T054, T083–T084. **Tuyến:** UX + AI + Browser.
- **T086 — Công bố blueprint đánh giá HSK hợp pháp.** **Kết quả:** cấu trúc, số câu, thời lượng, kỹ năng và scoring bám chuẩn HSK được chọn; không dùng “đề năm gần đây” có bản quyền nếu chưa có phép. **DoD/Bằng chứng:** màn hướng dẫn hiện đúng full-length/mini, provenance rõ; expert rà blueprint và legal inventory. **Phụ thuộc:** T021, T026. **Tuyến:** Content + Core. **[HUMAN]**
- **T087 — Xây exam engine full-length.** **Kết quả:** timed sections, audio once/replay rule, autosave, resume policy, navigation, accessibility và kết quả chi tiết; mini mock là mode riêng. **DoD/Bằng chứng:** cấu hình mỗi level sinh đúng số câu/thời lượng, refresh không mất bài, hết giờ nộp idempotent, UI không yêu cầu login local và payload/client bundle trước submit không chứa đáp án hay explanation chấm điểm. **Phụ thuộc:** T045, T054, T086. **Tuyến:** Core + UX + Browser.
- **T088 — Soạn ngân hàng đề nguyên bản.** **Kết quả:** HSK0 diagnostic và tối thiểu hai form full-length độc lập cho mỗi HSK1–4, có audio, đáp án, distractor, giải thích và psychometric metadata ban đầu. **DoD/Bằng chứng:** blueprint coverage 100%, validator/leak/duplicate check xanh, test chứng minh key/explanation chỉ xuất hiện sau submit hợp lệ, expert language QA; không quảng bá là đề thi thật. **Phụ thuộc:** T052, T086–T087. **Tuyến:** Content + Core. **[HUMAN] [EXT]** cho ghi âm.
- **T089 — Hoàn thiện onboarding, placement, level check và báo cáo.** **Kết quả:** guest chọn mục tiêu, thời gian và điểm xuất phát; placement thích ứng, level check end-to-end, breakdown theo kỹ năng/blueprint và kế hoạch học đề xuất. **DoD/Bằng chứng:** người mới hoàn thành onboarding rồi vào đúng Học/Hôm nay không cần tài khoản; fixture known-level đạt calibration target đã khóa ở T010/T086; kết quả không trộn XP/mastery, mở khóa theo rule T049 và export được. **Phụ thuộc:** T049, T061, T087–T088. **Tuyến:** Core + UX + Content. **[HUMAN]** cho calibration.
- **T090 — Đóng tab Nói và Mô phỏng đại khảo.** **Kết quả:** tone/speaking/AI tutor nằm trong Nói; exam/placement nằm trong Luyện, đều dùng guest được. **DoD/Bằng chứng:** E2E online/offline/provider-error và usability xanh; AI/exam disclosure rõ, không màn nào chặn chỉ vì chưa đăng nhập. **Phụ thuộc:** T055–T060, T081–T089. **Tuyến:** UX + Browser + OS-QA. **[HUMAN]**

### Gate M6

AI phải có consent, eval và fallback; đề phải đúng blueprint nhưng nguyên bản/có quyền; full-length không bị rút thành mini; kết quả chỉ dùng evidence hợp lệ. Provider lỗi không được chặn học local.

## P9 — Danh tính, offline/sync, vai trò, dọn repo và release

- **T091 — Thiết kế lại đăng ký/đăng nhập.** **Kết quả:** guest, tài khoản HANZI.OS, Google và Facebook có luồng rõ; OAuth ở trạng thái “sẵn sàng khi public”, không nút giả. **DoD/Bằng chứng:** local test có đăng ký/đăng nhập/đăng xuất/quên mật khẩu an toàn và tài khoản role fixture; Google/Facebook fail-closed và chỉ hiện khi callback/provider hợp lệ. Public OAuth end-to-end được ghi `DEFERRED` đến khi chủ dự án cấp domain/credential, không chặn local release. **Phụ thuộc:** T006–T007, T016, T020. **Tuyến:** UX + Core + Browser.
- **T092 — Di trú guest sang tài khoản và hợp nhất dữ liệu.** **Kết quả:** preview merge cho progress, FSRS, bookmark, deck, attempt và setting; conflict rule giải thích được. **DoD/Bằng chứng:** người học xem trước, xác nhận và hoàn tác trong cửa sổ an toàn; fixture không mất/nhân đôi dữ liệu. **Phụ thuộc:** T005–T008, T062, T091. **Tuyến:** Core + UX. **An toàn:** backup bắt buộc, idempotent merge.
- **T093 — Hoàn thiện offline và sync đa thiết bị.** **Kết quả:** outbox/idempotency/conflict resolution, trạng thái sync và adapter backend tự host/provider-neutral; local-only vẫn đầy đủ. **DoD/Bằng chứng:** hai thiết bị offline cùng học rồi sync cho kết quả xác định, content pack/progress không hỏng; UI nêu lỗi và cách thử lại. **Phụ thuộc:** T007–T008, T045, T062, T092. **Tuyến:** Core + Browser + OS-QA. **[EXT]** cần backend cho parity đa thiết bị; không hardcode vendor thương mại.
- **T094 — Hoàn thiện workspace theo vai trò.** **Kết quả:** learner, giáo viên/mentor, reviewer nội dung và admin chỉ thấy menu/dữ liệu/hành động đúng quyền, có test account cục bộ. **DoD/Bằng chứng:** mỗi role đăng nhập tới dashboard riêng có nhiệm vụ thật; deny-by-default, không đổi role phía client và audit log đọc được. **Phụ thuộc:** T091–T093. **Tuyến:** UX + Core + Browser.
- **T095 — Hoàn thiện Hồ sơ, quyền riêng tư và dữ liệu cá nhân.** **Kết quả:** setting học/media/accessibility, thiết bị/sync, export/import, xoá tài khoản/dữ liệu và consent AI/ASR. **DoD/Bằng chứng:** export khôi phục được, xoá có xác nhận/phạm vi rõ, local data vẫn quản lý được không cần server; privacy copy dễ hiểu. **Phụ thuộc:** T005, T054, T081, T091–T094. **Tuyến:** UX + Core + Browser. **An toàn:** destructive action có preview/backup/grace khi khả thi.
- **T096 — Chuẩn hoá lỗi, hỗ trợ và telemetry riêng tư.** **Kết quả:** user error có mã hỗ trợ/cách xử lý; log nghiệp vụ, CI, provider và debug nằm sau dev/support gate; telemetry opt-in/minimal. **DoD/Bằng chứng:** production UI không lộ `humanReviewed=false`, CI hay stack trace ngoài disclosure cần thiết; offline/auth/sync/media error đều phục hồi được. **Phụ thuộc:** T020, T081, T093–T095. **Tuyến:** UX + Core + Browser.
- **T097 — Audit sư phạm và nội dung toàn hệ thống.** **Kết quả:** đối chiếu inventory→lesson→activity→review→assessment, loại gap/duplicate/sai level và thực hiện human sample/full review theo risk. **DoD/Bằng chứng:** HSK0–4 coverage 100%, blocker accuracy bằng 0, report nêu rõ phần AI-reviewed và human-reviewed; learner mở được mọi deliverable đã đếm. **Phụ thuộc:** T027–T030, T052–T060, T072–T089. **Tuyến:** Content + Core + Browser. **[HUMAN]**
- **T098 — Audit usability, accessibility, hiệu năng và thiết bị thật.** **Kết quả:** test mobile/desktop, keyboard/screen-reader/reduced-motion, low-end/offline, microphone/pen/IME và 10 phiên usability cuối. **DoD/Bằng chứng:** không còn blocker/critical, task success đạt ngưỡng công bố, Lighthouse/performance budget đạt và flicker bằng 0 trong golden journeys. **Phụ thuộc:** T090–T097. **Tuyến:** UX + Browser + OS-QA. **[HUMAN] [EXT]** cho ma trận thiết bị.
- **T099 — Dọn repo và tái lập tài liệu nguồn sự thật.** **Kết quả:** xoá route/component/adapter/doc/generated artifact legacy chỉ sau consumer audit; checkpoint/roadmap/playbook phản ánh hệ mới, lịch sử để Git giữ. **DoD/Bằng chứng:** `rg` không còn consumer, migration/redirect window đã đóng có chủ đích, build/test không reference dead code; không đụng `docs/reports`, `output` hay `.openai/hosting.json` ngoài scope. **Phụ thuộc:** T009, T050, T070, T080, T090, T096–T098. **Tuyến:** Core. **An toàn:** diff manifest, backup và commit riêng có thể revert.
- **T100 — Đóng local release candidate Reforge.** **Kết quả:** một bản cài/chạy local-first có toàn bộ 100 task, evidence matrix và hướng dẫn test non-tech; provider-dependent feature có cấu hình/fallback rõ. **DoD/Bằng chứng:** `git diff --check`, targeted validators, typecheck/build, `npm run check`, `npm run test:e2e`, Lighthouse, audit dependency và migration matrix đều đạt; golden journey Học/Ôn/Nói/Luyện/Hồ sơ được người thật nghiệm thu, readiness và content UI counts cập nhật cả hai docs bắt buộc. **Phụ thuộc:** T001–T099. **Tuyến:** Core + Browser + OS-QA + UX + Content. **[HUMAN]**

### Gate M7 — Định nghĩa hoàn thành dự án

T100 chỉ được `DONE` khi tất cả task T001–T099 đã có bằng chứng, không còn blocker/critical, không mất dữ liệu legacy, năm tab hoàn chỉnh, HSK0–HSK4 đạt coverage 100% trên UI, mọi modality/review/booster/tutor/assessment/account/offline/role hoạt động theo contract và các phần [EXT]/[HUMAN] đã được nghiệm thu thật. Nếu provider chưa được cấp, task liên quan vẫn `BLOCKED`, không được thay bằng nút giả hoặc mock rồi tuyên bố hoàn thành.

## Mốc trục chính và thứ tự mở song song

Chuỗi dưới đây chỉ là **mốc trục chính để nhìn toàn chương trình**, không thay
thế dependency ghi trên từng task: **T001 → T003 → T004 → T005 → T006 → T008 →
T012 → T013 → T016 → T021 → T022 → T023 → T025 → T031 → T032 → T040 → T044 →
T045 → T046 → T050 → T061 → T062 → T063 → T070 → T071 → T080 → T086 → T087 →
T088 → T089 → T091 → T092 → T093 → T097 → T098 → T099 → T100**. Trước khi
mở bất kỳ ID nào vẫn phải thỏa **toàn bộ** dependency của chính task; ví dụ T011
là điều kiện bắt buộc trước T012 dù không nằm trong chuỗi tóm tắt này.

Các nhánh có thể chạy song song sau khi contract ổn định:

- T014–T020 chạy song song với T021–T026, nhưng không merge route/shell trước Gate M0.
- T033–T039 phát triển theo fixture độc lập sau T032; T027–T030 chỉ đóng khi các activity cần thiết đã runtime-wired.
- T052–T053 là dây chuyền media [HUMAN]/[EXT] dài nhất và phải khởi động ngay sau T051; không dùng TTS để giả hoàn tất.
- T055–T060, T064–T069 và T072–T079 có thể chia theo vertical slice nhưng cùng dùng evidence/FSRS contract, không tạo scheduler hay player riêng.
- T081–T085 và T086–T089 chạy song song; AI không nằm trên đường học local, còn assessment full-length là gate curriculum.
- T091 có thể triển khai sớm trên adapter T007, nhưng merge/sync/roles chỉ đóng sau khi model evidence và FSRS ổn định.

## Nhịp thực thi và báo cáo

Mỗi lượt Goal chỉ giữ một task `IN_PROGRESS`, chọn task sẵn sàng sớm nhất theo
dependency và mốc trục chính; chỉ mở nhánh song song khi không chỉnh cùng
contract/file. Mỗi checkpoint phải báo bằng ngôn ngữ người học: deliverable thấy
trên UI, số lượng nội dung, một trở ngại thật, readiness toàn dự án, content UI
theo HSK0–4 và task Reforge `DONE/100`. Commit theo milestone/vertical slice đủ
lớn, đồng thời cập nhật `docs/RESTRUCTURE_MASTER_PLAN.md` và
`docs/IMPLEMENTATION_CHECKPOINT.md`; chỉ cập nhật
`docs/HSK4_GRADUATION_PLAN.md` khi content inventory/migration contract thay đổi.
Không commit log/test report tạm.

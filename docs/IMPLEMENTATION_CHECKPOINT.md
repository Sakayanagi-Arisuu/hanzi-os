# HANZI.OS — Implementation checkpoint

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

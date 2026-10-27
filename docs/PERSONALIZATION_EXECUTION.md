## Cá nhân hóa v2 · workspace theo trang / nhường lượt projection · 27/10/2026

- **Module:** T03 — IN-REVIEW; chưa hoàn tất toàn kế hoạch hoặc USER-ACCEPTED.
- **Người học thấy gì:** journal lớn chuyển sang các record theo trang khi lưu thành công; đọc legacy không tự migration. Root/pages/pending và dọn trang cũ cùng transaction; quota/trang hỏng/owner-reset lạ dừng và giữ dữ liệu. Pending chỉ dùng tham chiếu khi cùng object với entry, giữ chính xác payload khác dù cùng key/changeId. Projection giữ reducer/comparator/thứ tự cũ, nhường CPU theo ngân sách.
- **Đã kiểm:** focusedv10 53file/450test, typecheck/lint exit0. Fullv33 CHECK_EXIT0:566file/3688test; typecheck/global lint/content/DB/restore43migration64table/build qua,239JS/192private markers vắng. Asset advisory+390.4KiB và provenance local/unattestable, không production/device pass. Fullv32 chủ động dừng để sửa byte budget của typed-view backing buffer; regression fail trước sửa rồi pass, không gọi v32 đạt. Binding408/0drift, source9file giữ cố định suốt gate.
- **Browser:** fixture compiled4347 dùng adapter/history/IndexedDB thật và dữ liệu tổng hợp riêng:100k unique/mastery0,200kentries+200kpending,root166bytes/423entry+391pendingpages;5073ms/gap68ms, proof `tmp/personalization-workspace-pages-reference-native-v11.json/png`. Hủy native transaction sau ghi trang mới giữ root/keyset/toàn bộ entries+pending,0changed event; proof native-abort-v2. Capture v9 trước đó chỉ có trạng thái sẵn sàng sau HMR, không dùng làm proof. Account4327 dùng cookie hiện có+D1 cô lập: nút Cập nhật ứng dụng→reload qua,0update error,Header/Profile cả2ảnh256px và10phút/Giao tiếp còn; lịch sử20→40→42/42. Một visit mới so mốc41, không sửa lịch sử cũ. Proof full-app-v33.json và profile/history-v33.png trong tmp.
- **Dữ liệu giữ được:** DBversion3/bảy store/canonical key/flat server protocol v1 không đổi; payloadmanifestv2 đọc legacy và format full-pending cũ. Page≤512item/256KiB, legacy nhỏ<2000lane-items và≤512KiB; tính cả Blob/backing buffer, vượt giới hạn giữ nguồn. Old client không hiểu v2 fail-closed; recovery codec/apply/rollback có regression. D1 nguồn65/65immutable giữ nguyên,0missing/changed,integrityOK/FK0. HSK0 4/4 rich0/4; HSK1–4 rich40/40/55/78=213/213. Không reset progress/FSRS/saved/resume/outbox/owner/reset hoặc sửa .wrangler/docs/reports/output.
- **Giới hạn:** vẫn materialize/project toàn history trong RAM; lần migration đầu vẫn phải đọc legacy lớn. Một phép đo desktop không chứng minh total-memory/device/cohort readiness. Archive64/128MiB vẫn fail-closed; không nâng limit hoặc cắt lịch sử để đạt gate.
- **Git:** wrapper30becbc đã push. Chốt pages/fairness theo coherent module và push cùng nhánh đã được người dùng yêu cầu; không deploy/APK/humanReviewed.
- **Tiếp theo:** web4327 bật để người dùng test mốc T03. Các nhóm còn mở: history paging/memory, recovery lớn/account/native/conflict, FSRS và Reader/Nói/Viết/assessment consumers, avatar device/offline, content/audio review/T15, cohort/delayed recall và nghiệm thu. Không tự chạy lại toàn backlog hoặc suy phần trăm.

## Cá nhân hóa v2 · giữ raw workspace khi wrapper bất thường · 27/10/2026

- **Module:** T03 — IN-REVIEW.
- **Người học thấy gì:** workspace sai owner/reset/schema/key hoặc có record mà thiếu payload sẽ dừng đọc/lưu, giữ nguyên dữ liệu để khôi phục. Ack đến sau lúc record thay đổi không ghi đè wrapper hoặc xóa pending. Record chưa tồn tại vẫn khởi tạo bình thường; chưa chia trang/migration.
- **Đã kiểm:** baseline5case fail như dự kiến; sau sửa targetedv1 4file/29test, syncv2 toàn51file/415test, typecheck/lint/buildv1 exit0;239JS/192private markers vắng. Browser compiled4344 IndexedDB thật: ack/sync-read/cooperative-read/save đều reject, rawRetained=true và2pending còn; proof tmp/personalization-workspace-wrapper-native-v1.json/png. Fullv31 là gate trước delta này, không dùng thay gate source mới.
- **Dữ liệu giữ được:** không đổi schema/IDs/FSRS/completion/saved/resume/outbox/authority/owner/reset. D1 nguồn65/65immutable còn,0missing/changed,integrityOK/FK0. HSK0 4/4 rich0/4; rich HSK1–4 40/40/55/78=213/213. Không clear browser storage hoặc sửa docs/reports/output/.wrangler. Chỉ origin fixture4344 dùng dữ liệu tổng hợp.
- **Git:** các commit tới5e3a1a3 đã push thành công lên origin/codex/pause-2026-09-16 bằng credential Sakayanagi hiện có; thông tin giữ local ở các mốc cũ là lịch sử, đã được yêu cầu push lại. Mốc wrapper chốt commit riêng sau gate; không deploy/APK/USER-ACCEPTED/humanReviewed.
- **Tiếp theo:** T03 lưu workspace theo trang cần adapter đọc/ghi nguyên tử, tương thích journal cũ và phục hồi; chưa hoàn tất bounded storage/memory. T04 recovery lớn, FSRS/consumer, account/device, content review/cohort còn mở.

## Cá nhân hóa v2 · đọc workspace một lần trong lịch sử tổng hợp · 26/10/2026

- **Module:** T03 — IN-REVIEW.
- **Người học thấy gì:** lịch sử tổng hợp tránh clone dư journal workspace; refresh vẫn đọc mới, standalone reader giữ tương thích. Journal/schema/wrapper lỗi vẫn chặn và giữ dữ liệu để khôi phục. Không thay kết quả lịch sử, quyền hoặc lịch ôn.
- **Đã kiểm:** targetedv1 4file/31test và v2 5file/25test exit0, typecheckv1/lintv1 exit0. Regression kiểm primary key thật, không bỏ nhầm row giả entryKey; owner/reset/generation, unknown/corrupt root/wrapper, canonical/cursor failure, retry/freshness và snapshot không đổi. Native IndexedDB4340 compiled cùng dữ liệu100k: đủ100k unique/mastery0; bản mới3814ms, baseline4254ms; timer1668/1670ms, frame467/483ms. Chỉ một cặp quan sát desktop, chưa latency/memory/device pass. Fullv31 CHECK_EXIT0:565file/3650test, typecheck/global lint/content/DB/restore43migration64table/build qua;239JS/192private markers vắng,advisory+388.9KiB. Source6file cố định trong gate. Full-app4327 session cookie+D1 clone: sau đóng/mở tab bình thường, nút Cập nhật ứng dụng đã reload thành công;0update error,Header/Profile cả2ảnh256px và10phút/Giao tiếp còn. Lịch sử20→40→41/41lượt qua; một thao tác CDP bị ngắt, quan sát lại rồi dùng nút đúng nhãn để hoàn tất. Proof tmp/personalization-t03-full-app-v31.json và ảnh full-app-{update,history}-v31. Không clear/unregister storage.
- **Dữ liệu giữ được:** không đổi DBversion/schema/IDs/producer/scoring/FSRS/pending/receipts/outbox/owner/reset. D1 nguồn so pre-v20 giữ65/65immutable,0missing/changed,3thêm,integrityOK/FK0. HSK0 4/4 rich0/4; rich HSK1–4 40/40/55/78=213/213. Binding405/0drift, baseline content/scoring pins giữ nguyên. Không sửa docs/reports/output/.wrangler hoặc clear browser storage.
- **Git:** T17 commit6e2204e ở local; push bị chặn vì GitHub credential không khả dụng, đã thử noninteractive và không đổi tài khoản/cấu hình. Origin còn ở79ba221. Người dùng chọn giữ commit local trước; chốt delta T03 local sau gate, không push; không deploy/APK/USER-ACCEPTED/humanReviewed.
- **Tiếp theo:** web4327 đang bật để người dùng test; tiếp T03 bounded storage sau mốc này. Bounded storage vẫn cần thiết kế/migration riêng; T04 oversized recovery, account/device/consumer/content review/cohort và đường nâng cấp worker cũ chưa hỗ trợ protocol vẫn cần kiểm thêm; full-app lifecycle/update mới đã qua. Chưa hoàn tất toàn kế hoạch.

## Cá nhân hóa v2 · cập nhật PWA không bị tải nền giữ lại · 26/10/2026

- **Module:** T17 — IN-REVIEW.
- **Người học thấy gì:** khi bấm Cập nhật ứng dụng, worker đang active dừng riêng tải chuẩn bị offline để nhường kích hoạt; không xóa cache/media/nháp/outbox. Lỗi cập nhật mở lại khả năng tải offline trên đúng worker cũ. Timeout10giây và việc không tự reload muộn vẫn giữ; bản active cũ chưa hỗ trợ protocol vẫn có thể timeout và cần thử lại.
- **Đã kiểm:** native browser baselinev2 với public/sw.js thật và request prepare bị giữ đã tái hiện lỗi; sau sửa finalv5 qua4.6giây toàn journey, không tăng timeout sản phẩm/force-click. Request kế tiếp chưa gửi, localStorage và IndexedDB fixture resume/outbox cùng private CacheStorage còn nguyên. Unitv4 3file/49test, typecheckv3/lintv3 exit0 gồm cancel private fetch giữ bytes cũ, failure resume đúng worker và late activation không reload. Lượt kiểm bị ngắt ở môi trường không tính pass. Fullv30 CHECK_EXIT0:565file/3640test; typecheck/global lint/content/DB/restore43migration64table/build qua,239JS/192private markers vắng; advisory+388.6KiB. Source4file giữ nguyên trong gate. Full-app4327 giữ session/avatar/10phút/Giao tiếp sau reload, nhưng nút update vẫn timeout cả lần thử lại; chưa xác định worker active đã nhận protocol mới, không gán full-app update pass. Không clear/unregister storage. Proof tmp/personalization-pwa-full-app-v30.png.
- **Dữ liệu giữ được:** không đổi schema/migration/producer/authority/FSRS/completion/saved/resume/outbox. HSK0 4/4 rich0/4, rich HSK1–4 40/40/55/78=213/213. Binding405/0drift, baseline scoring/content pins giữ. Không clear browser storage, sửa docs/reports/output/.wrangler hoặc bật dịch vụ ngoài.
- **Git:** checkpoint trước79ba221 đã commit/push thành công, nhánh codex/pause-2026-09-16 đồng bộ origin. Delta T17 chốt gate để commit/push riêng; không deploy/APK hoặc tự USER-ACCEPTED/humanReviewed.
- **Tiếp theo:** T03: audit giảm clone workspace dư trong aggregate history, không đổi schema/authority. Full-app cập nhật từ worker cũ còn mở; Bounded storage/recovery lớn/device/content review/cohort và các consumer còn mở, chưa hoàn tất toàn kế hoạch.

## Cá nhân hóa v2 · chốt avatar account và checkpoint Git · 26/10/2026

- **Module:** A02/T19 — IN-REVIEW; chưa USER-ACCEPTED hoặc hoàn tất toàn bộ kế hoạch.
- **Người học thấy gì:** chọn/cắt/lưu/gỡ avatar account private trong cùng UI guest; ảnh guest không tự gửi. Retry giữ exact bytes/operation, stale remove không xóa ảnh mới. Local Vite và wrangler.local bật Images offline với remote:false; cloud config chọn riêng không đổi. Thiếu encoder vẫn fail-closed. Không áp migration lên .wrangler của người dùng.
- **Đã kiểm:** fullv29 CHECK_EXIT0:565file/3634test, typecheck/global lint/content/DB/restore43migration64table/build qua;239JS/192private markers vắng, advisory+388.3KiB. Sau fullv29, delta2file chỉ cấu hình binding local kiểm typecheck/lint/buildv1 exit0, cùng239JS/192markers. Targetedv5 8file/63test; Gradle offline policy4/cookie2/example1 qua; browser component3/3. D1 cascade thật qua: xóa synthetic owner→cả3bảng avatar0, owner khác1 và bytes nguyên. Full app compiled4327 với session cookie có sẵn+bản sao D1+Images offline: chọn ảnh tổng hợp/cắt bằng bàn phím→save→Header/Profile cả2ảnh256×256→reload vẫn cả2; tùy chọn10phút/Giao tiếp còn,0XP. Không mock identity trong proof full-app này.
- **Giới hạn:** PWA update prompt lần đầu trên server cold báo chưa cập nhật được; chọn Để cập nhật sau, reload dùng UI mới và avatar đã qua. Không gán PWA update pass. Projection409 giữ policy nội dung; không bypass để mở adaptive. Native picker/cancel/device, persistent offline account avatar cache, bounded history/oversized recovery, các consumer/human review/cohort vẫn mở. Cấu hình local không chứng minh cloud high fidelity hoặc commercial readiness.
- **Dữ liệu giữ được:** HSK0 4/4 rich0/4; rich40/40/55/78=213/213. Account clone so pre-v20 giữ65/65immutable,0thiếu/đổi,integrityOK/FK0; avatar1metadata/1chunk/1receipt. D1 nguồn và browser storage gốc giữ, không clear storage. IDs/first-response/FSRS/mistakes/resumes/outbox/owner/reset không đổi authority. Binding403/0drift; baseline scoring/content pins giữ nguyên. Fullv26 fail restore pin; v27 dừng do native header gap; v28 dừng sau query51>50; các lỗi đã sửa và log giữ.
- **Git:** người dùng yêu cầu commit/push; checkpoint tích hợp gồm dependency kế thừa runtime/auth/PWA/native/cá nhân hóa. Rà staging loại docs/reports, output, design-explorations, deliverables, cache/build, DB/credential/APK; diff --check sạch. Chuẩn bị commit lên codex/pause-2026-09-16→origin cùng nhánh, không main/force/deploy. Không tự nghiệm thu USER-ACCEPTED/humanReviewed.
- **Tiếp theo:** hoàn tất Git checkpoint theo yêu cầu; các hạng mục còn mở giữ trong sổ task và handoff A02_ACCOUNT_AVATAR, không gọi toàn bộ kế hoạch đã xong.

## Cá nhân hóa v2 · avatar tài khoản private · 26/10/2026

- **Module:** A02 — IN-REVIEW.
- **Người học thấy gì:** cùng màn chọn/cắt ảnh cho account và guest; guest giữ local. Account dùng ảnh private có owner header; retry giữ exact Blob/operation, prompt gỡ đóng băng revision nên không xóa ảnh mới ở tab khác. Thiếu encoder báo chưa sẵn sàng, vẫn xem/gỡ ảnh cũ. Không tự gửi ảnh guest.
- **Đã kiểm:** targetedv3 6file/42test, typecheckv3/lintv2 exit0; offline Miniflare Images/workerd+D1 bindingv3 qua decode JPEG có EXIF→WebP256/302bytes/metadata bỏ, private save/read/remove/retry không phục sinh. Browser component+API/D1/Images thật, fixture identity rõ:3/3 qua mất ack→retry cùng bytes/op, reload/header/profile256px, stale remove hai tab, guest không PUT/DELETE và CTA ngang667×375≥44px trong viewport. Guest4325 thật còn ảnh và tùy chọn cũ. Chưa full-app cookie/native/cloud proof.
- **Gate tích hợp:** fullv26 CHECK_EXIT1 ở restore chốt42migration. Bổ sung backup seed avatar/tombstone/receipt; restorev1 phát hiện SQL CHECK nhận NULL hash, đã sửa IS NOT NULL. Restorev2 exit0 với43migration/64table, exact bytes/tombstone/receipt/constraints, integrityOK/FK0 và fingerprint graph cũ qua0042 giữ nguyên. Fullv27 dừng chủ đích để sửa bridge Java bỏ If-Match/x-avatar-operation. Chỉ mở hai header trên đúng avatar PUT/DELETE; targetedv4 7file/48test và Gradle offline policy4/cookie2/example1 qua,0skip. Fullv28 dừng sau phát hiện route deletion51query>50; bỏ3explicit DELETE dư, avatar cascade theo guarded parent DELETE. Targetedv5 8file/63test qua, ngưỡng50 giữ nguyên. Fullv29 đang chạy source cuối, chưa pass. Binding401/0drift sau audit bổ sung;   không đổi baseline/scoring/content pins.
- **Dữ liệu giữ được:** migration0042 thêm ba bảng private, tách media bài học; hai đường xóa account chỉ xóa graph đúng owner. Chỉ áp trên DB fixture/bản sao trong tmp, không áp vào .wrangler hoặc D1 gốc. D1 cũ so snapshot65/65immutable,0thiếu/đổi,3thêm,integrityOK/FK0. HSK0 4/4 rich0/4, rich40/40/55/78=213/213; progress/FSRS/mistakes/first-answer/saved/resumes/outbox giữ nguyên. Không sửa docs/reports/output, commit/push/deploy/APK/humanReviewed/USER-ACCEPTED.
- **Tiếp theo:** chốt fullv29; dùng full-app compiled/session có sẵn trên bản sao D1+Images offline riêng; account/native/offline avatar cache và T03/T04/T12/human/cohort vẫn còn. Handoff PERSONALIZATION_A02_ACCOUNT_AVATAR.md.

## Cá nhân hóa v2 · nguồn Nói chính xác / phục hồi phiên · 26/10/2026

- **Module:** T12/T16 Nói — IN-REVIEW.
- **Người học thấy gì:** link bài không tồn tại/rỗng/chưa mở không mở nhầm Bốn thanh điệu hoặc tạo phiên thay thế. Có kho chọn bài hợp lệ và về Thiên Lộ; chọn bài đưa focus main, reload tiếp tục đúng nguồn. Khi nguồn không khả dụng, chặn session/completion/reward và hủy capture/playback đang có. Bộ chọn mission chung/consumer legacy giữ nguyên. Lời mời Khảo Nghiệm Căn Cơ được hoãn trong Nói, không che kho chọn bài hoặc đổi diagnostic.
- **Đã kiểm:** targeted2file/20test exit0; final typecheckv3/lintv3 exit0; buildv2 BUILD_EXIT0,239JS/192private markers vắng. Compiled navigation cuốiE2Ev13 7/7 exit0 sau AppShell guard Nói. E2Ev3 fresh IndexedDB4/4 exit0: missing0→0speech rows, chọn boot-1 chủ động→reload chỉ1session, blank/locked recovery; không force-click/tăng timeout. v1 dừng discovery do testDir tmp rộng; v2 3pass/1fail phát hiện invitation pointer interception thật, giữ trace và sửa source. Guest4325 thực: trước/sau missing/recovery/reload giữ6speech/72workspace/72pending và cùng hash; focusmain/dialog0. CTA44px375×667 y541..585 trên nav601;667×375 y249..293 trên nav309, không tràn ngang. Viewport reset; proof speech-source-proof-v2. Không audio/mic/answer/reward hoặc account-D1 claim.
- **Gate tích hợp:** Fullv25 CHECK_EXIT0:561file/3610test, typecheck/global lint/content/DB/restore42migration61table/build qua,239JS/192markers vắng,advisory+386.6KiB trên navigation cuối trước3file Nói. Delta Nói kiểm riêng như trên; không dùng fullv25 thay gate delta. Fullv24 failed precheck stale acceptance title, manifest giữ nguyên và candidate validator sau sửa exit0. Fullv23 cũng đã qua560/3606. Binding377/0drift.
- **Dữ liệu giữ được:** HSK0 4/4 rich0/4; HSK1–4 rich40/40/55/78=213/213; IDs/nguồn/first-answer/FSRS/mistakes/owner/reset/outbox giữ. D1 so snapshot65/65immutable,0missing/changed,integrityOK/FK0. Không schema/migration/storage clear, docs/reports/output/.wrangler, commit/push/deploy/APK/humanReviewed/USER-ACCEPTED.
- **Tiếp theo:** A02 account media còn chưa có API/storage/encoder binding; audit đã xác nhận kho media bài học không phù hợp private avatar và deletion; còn cần storage/encoder/API/native thật, không dựng stub rồi báo xong. T12 consumer/FSRS/Reader/Viết/assessment/account, bounded history/recovery lớn và native/device/human/cohort vẫn mở, chưa hoàn tất toàn kế hoạch.

## Cá nhân hóa v2 · điều hướng năm vùng · 26/10/2026

- **Module:** T16 — IN-REVIEW.
- **Người học thấy gì:** Học, Ôn, Nói, Luyện, Hồ sơ thống nhất desktop/mobile; công cụ cũ trong Luyện. Giữ lore/nhãn chức năng, focus wrap/Escape đúng opener và same-route về main. Alt+S không chồng dialog; invitation khảo nghiệm không che menu, hoãn narration khi dialog mở.
- **Đã kiểm:** compiled E2Ev10 6/6 exit0, fresh browser onboarding/menu/keyboard/Reader/four-route overflow/reduced-motion. Chỉ cache nén server được warm269assets1328ms, không seed browser cache/progress; v8-v9 cold landing fail giữ nguyên, chưa latency pass. v7 aggregate30s tách journey độc lập không bỏ assertions/tăng timeout. CUA landscape667×375 menu y16..309/close44px, cuộn riêng196/352px, mục cuối truy cập được, nav bắt đầu309. Desktop/mobile/rail/focus/reduced-motion proof cùng handoff T16_NAVIGATION. Targeted cuối3file/12test exit0; typecheckv2/buildv3 exit0; final typecheckv3/lintv4 exit0. Fullv24 CHECK_EXIT1 do tên test trong manifest nghiệm thu; giữ tên ổn định và tách keyboard/tool journey, candidate validator exit0. E2Ev12 cuối7/7 exit0; fullv25 đang kiểm.
- **Dữ liệu giữ được:** không schema/migration/IDs/scoring hoặc storage changes; HSK0 4/4 rich0/4; HSK1–4 rich40/40/55/78=213/213. Binding376/0drift. Fullv23 CHECK_EXIT0:560file/3606test trước navigation. Không sửa runtime/test giữa fullv25, không commit/push/deploy/humanReviewed hoặc USER-ACCEPTED.
- **Tiếp theo:** chốt fullv25, tiếp T05/T12 consumer khả thi; media account/bounded storage/oversized recovery/native/device/human/cohort vẫn mở. Preview4325 đã bật lại sau host đổi phiên, browser storage còn avatar/preferences; chưa khép toàn plan.

## Cá nhân hóa v2 · hỗ trợ Nghịch Cảnh Lục lưu trước khi mở · 25/10/2026

- **Module:** T02/T16 mistakes — IN-REVIEW.
- **Người học thấy gì:** gợi ý chỉ hiện sau commit hỗ trợ bền vững; máy đọc chỉ được gọi sau lưu yêu cầu và có nhãn âm tổng hợp. Lỗi lưu giữ câu trả lời, chưa mở hỗ trợ; retry giữ operation ID. Khi lưu đang bận, khóa submit/hỗ trợ/exit trong phiên; unmount không phát máy đọc sau khi rời trang. Hint hoặc TTS đều truyền cờ trợ giúp tới adapter chấm cũ, không coi là recall độc lập. Nhãn kết quả/summary dùng hỗ trợ thay vì chỉ gợi ý. Không đổi thuật toán chấm, first answer, FSRS hoặc reward.
- **Đã kiểm:** targeted5file/31test v2 TEST_EXIT0, typecheckv3/lintv3 exit0. Test retry/two-tab equivalent/offline/reload/ack/quota/unknown legacy version/stale reset/owner/conflicting operation/no raw prompt-hint-answer-stimulus; support score null/outcome unknown/mastery false. v1 giữ nguyên một test fail do tìm operationId của projection bằng raw input ID (projection cố ý dùng workspace change ID); sửa assertion theo kind và thêm kiểm raw primary key. Lintv1 nhận nhầm tên useSupport là Hook; đổi requestSupport, không tắt rule.
- **Browser:** fixture4343 component+saveMistakeSupport+IDB thật, câu hỏi và submit adapter tổng hợp: trước sửa hiện gợi ý/call TTS nhưng history0; sau sửa hint lỗi không reveal/giữ answer, retry1hint; giữ TTS chặn submit/chưa callback→thả commit mới callback; phiên mới TTS lỗi/retry rồi submit gửi usedHint=true; reload giữ3support gồm1hint/2TTS/mastery0. Không audio playback/native/pronunciation hoặc account-D1 claim. Fixture server bị EBUSY khi Vite watch public/hanzi-data trong build; chuyển publicDir:false riêng tmp và restart, không xóa storage. Guest4325 thật: một lỗi boot-1 còn nguyên→gợi ý→exit→Profile/lọc mistakes→reload giữ2support (1lượt gợi ý thật mới);0XP, không submit đáp án hoặc resolve lỗi. CTA48px:375×667 y487..535;667×375 y195..243, không tràn ngang; viewport đã reset. Proof tmp/personalization-mistake-support-{proof,real-guest-proof}-v1.json và ảnh/text cùng prefix.
- **Gate tích hợp:** Fullv22 CHECK_EXIT0:559file/3602test, typecheck/global lint/content/DB/restore42migration61table/build qua,239JS/192private marker vắng, advisory+385.0KiB. Mốc này chốt history scope/dictionary, trước5file delta mistakes. Fullv23 CHECK_EXIT0:560file/3606test; typecheck/global lint/content/DB/restore42migration61table/build qua,239JS/192private markers vắng,advisory+385.3KiB. Mốc này gồm mistakes trước navigation.
- **Dữ liệu giữ được:** IDs/source/correction/first-response/pending/outbox/FSRS/owner/reset không đổi; support chỉ metadata gọn cùng primary+descriptor transaction. Guest và account dùng adapter/scopes có sẵn, account support vẫn pending tới ack. HSK0 4/4 rich0/4; HSK1–4 rich40/40/55/78=213/213. Binding372/0drift. D1 so snapshot giữ65/65immutable,0missing/changed,3thêm,integrityOK/FK0. Không sửa docs/reports/output/.wrangler, commit/push/deploy/APK/humanReviewed.
- **Tiếp theo:** Fullv23 đã qua; tiếp task khả thi theo dependency; account-D1 correction/media/release, bounded history/storage, oversized recovery, native/device/human/cohort vẫn mở. Không khép toàn kế hoạch.

## Cá nhân hóa v2 · nguồn dictionary chính xác / history scope · 25/10/2026

- **Module:** T12/T16 dictionary + T03 history — IN-REVIEW.
- **Người học thấy gì:** link mục từ cũ/không tồn tại không mở nhầm mục đầu tiên. Detail ưu tiên exact ID rồi stable alias duy nhất, nguồn vắng/alias mơ hồ hiện thông báo giữ dữ liệu và CTA Tra mục từ khác. Không hiện nút tự ôn/lưu/đọc máy cho một mục thay thế. Search/selection bình thường giữ tương thích. Màn thiếu nguồn dùng copy cuộn riêng, CTA luôn trong viewport. History reset/owner-generation giữ cache đúng scope; invalidation dùng callback ổn định để qua lint, không tắt rule.
- **Đã kiểm:** browser4325 trước sửa URL word không tồn tại vẫn hiện 吃/chi và các nút tự ôn/lưu/TTS; sau sửa có recovery→search→chủ động mở đúng chi→reload, mục đã lưu còn; giữ1lượt tra cứu thật mới, không seed/reset. Mobile375×667 body375/CTA54px y283..337; landscape667×375 body667/CTA54px y238..293 trên nav309. Viewport đã reset. Pure selection4test kiểm missing/empty/delayed/exact-before-alias/ambiguous alias/filtered detail/search; targeted4file/26test TEST_EXIT0. Typecheckv1 exit0 trước refinement JSX/CSS CTA cuối, scoped lintv2 exit0 sau refinement. Fullv21 CHECK_EXIT1 do numeric ref cleanup warning; không bỏ warning/rule. Fullv22 CHECK_EXIT0:559file/3602test, typecheck/global lint/content/DB/restore/build qua;239JS/192private markers vắng,advisory+385.0KiB. Source/runtime/test giữ nguyên suốt gate.
- **Dữ liệu giữ được:** source stable IDs/aliases, savedWords, workspace/correction/first-response/outbox/FSRS và reset scopes không đổi. Missing source không cấp release/grant/evidence hoặc rewrite history. HSK0 4/4 rich0/4; HSK1–4 rich40/40/55/78=213/213. Binding370/0drift sau audit6file. Không sửa docs/reports/output/.wrangler, commit/push/deploy/APK/humanReviewed.
- **Tiếp theo:** chốt fullv22; tiếp T02/T16 mistakes standalone hint/TTS đang chưa ghi support bền vững. Chưa sửa mistakes trong gate. Recovery quá lớn/bounded storage, account release/media/native/device/human/cohort vẫn mở; chưa hoàn tất toàn kế hoạch.

## Cá nhân hóa v2 · cache history theo owner/reset · 25/10/2026

- **Module:** T03 — IN-REVIEW.
- **Người học thấy gì:** đặt lại tiến độ không giữ lịch sử/cursor của reset trước trong UI. Cache tạm gắn ownerKey/generation/resetEpoch; đổi phạm vi khi tải tiếp sẽ đọc head mới. Thông báo reset hủy request cũ, xóa riêng cache UI và tải lại; callback cũ không đổi loading/error/lifecycle mới. Không xóa dữ liệu lưu bền vững.
- **Đã kiểm:** fixture4342 dùng writeOwnerCheckpoint/transitionOwnerCheckpoint và IndexedDB thật, history API mock. Trước sửa epoch0→1 vẫn hiển thị2lượt Hồ sơ cũ, focus báo lỗi scope. Sau sửa epoch1 đã tải3lượt→reset có thông báo epoch2 tự head2lượt; reset im lặng epoch3→More gửi head thay cursor cũ; cùng owner/generation1→2 bỏ frontier đã hết và tải lại; giữ response epoch3→reset epoch4→thả response cũ vẫn chỉ2lượt epoch4,0alert. Proof tmp/personalization-history-scope-{before,after,proof}-v1. Targeted5file/30test TEST_EXIT0. Fullv21 CHECK_EXIT1: lint numeric ref cleanup warning; log giữ nguyên. Sửa callback invalidation ở mốc mới, fullv22 kiểm source sau sửa.
- **Dữ liệu giữ được:** không đổi schema/IDs/scoring/projector/authority hoặc dữ liệu origin người học. Fixture mới4342 giữ kho riêng; không reset browser4325/4327. HSK0 4/4 rich0/4; HSK1–4 rich40/40/55/78=213/213. Binding367/0drift. Không sửa docs/reports/output/.wrangler, commit/push/deploy/APK hoặc humanReviewed.
- **Tiếp theo:** Dictionary consumer đã sửa/kiểm ở mốc mới bên trên sau khi fullv21 dừng. Storage pagination/memory/oversize recovery và release/account media/native/human/cohort còn mở. Account Worker4327 đã dừng có kiểm soát trước build, D1 giữ nguyên; preview source4325 giữ bật.

## Cá nhân hóa v2 · commit local → lịch sử / account-D1 v20 · 24/10/2026

- **Module:** T03 — IN-REVIEW; không khép toàn kế hoạch hoặc USER-ACCEPTED.
- **Người học thấy gì:** bảng lịch sử đang mở tự đọc lại sau commit workspace local (Reader, writing, preferences và các producer dùng cùng adapter), qua callback refresh hiện có. Thông báo trong lúc bận được gộp thành lượt tải tiếp; listener được tháo khi đổi lifecycle. Chỉ sửa wiring một consumer, không đổi producer/authority/schema.
- **Đã kiểm:** native fixture4341 tái hiện trước sửa: commit local qua saveWorkspaceChanges xong nhưng vẫn2lượt/head1; sau sửa commit trong request bị giữ→thả→head2/4lượt (giữ1local cũ+1local mới+2remote), commit lúc rảnh→head3/5lượt, không cần focus/reload. Remote API của fixture là mock, local adapter/IDB thật; không suy ra multi-tab/device/account pass. Proof tmp/personalization-history-local-refresh-{before,after,proof}-v1. Targeted5file/30test, typecheck/lintv1 exit0. Fullv20 CHECK_EXIT0:558file/3598test áp dụng source trước3dòng listener mới; không gán fullpass cho delta này.
- **Account thật:** compiled Worker4327 + D1 cô lập với cookie đã có; cập nhật PWA bằng UI rồi reload,70assets quan sát trùng dist v20,0missing. Tải đủ39/39lượt, lọc Hồ sơ6/6, mở chi tiết giữ unknown đúng và link nguồn; thiết lập10phút/ngày còn sau reload. Lesson/review/activity-history HTTP200 trực tiếp, không qua SW/mock; projection409 còn giữ policy nội dung. Không tạo tài khoản, đổi settings, bắt đầu phiên viết mới hoặc suy ra account adaptive/100k pass. Proof tmp/personalization-account-{history,network}-v20.json và history-v20.png.
- **Dữ liệu giữ được:** snapshot pre-v20 D1 có63bảng; so immutable bằng user_id/reset_epoch/entry_key + value_json/changed_at/change_id giữ65/65,0missing/0changed,2immutable thêm; bảng access_days+1/workspace_entries+4, integrityOK/FK0. HSK0 4/4 rich0/4; HSK1–4 rich40/40/55/78=213/213. Binding367/0drift. Không xóa storage/.wrangler, sửa docs/reports/output, commit/push/deploy/APK hoặc đổi humanReviewed.
- **Tiếp theo:** bounded local history/storage clone-sort-memory, account release/media, archive quá lớn và T12 consumer journeys còn mở; Android/native, human review/cohort/delayed recall vẫn cần bằng chứng thật. Preview source4325 giữ bật; account4327 vẫn buildv20 trước delta listener.

## Cá nhân hóa v2 · CPU chia lô / queued refresh · 24/10/2026

- **Module:** T03 — IN-REVIEW.
- **Người học thấy gì:** lịch sử lớn chia xử lý CPU theo lô500 và nhường scheduler; parser/pending/descriptor/identity/conflict/dedup vẫn kiểm đủ. API projector đồng bộ cho consumer cũ vẫn đồng bộ, dùng chung rule/sort với bản async. Guard owner/reset sau workspace yield, từng nguồn và projection cuối. Focus/cập nhật trong lúc tải được gộp thành một refresh sau lượt hiện tại; không mất thông báo mới.
- **Đã kiểm:** cooperative-testv2 9file/45test TEST_EXIT0; typecheckv3/lintv3 exit0. Rule-body sau extraction continue→return và sort trùng hash gốc; proof tmp/personalization-history-cooperative-rule-proof-v1.json. API mock4341 tái hiện trước sửa snapshot2 trong6/callhead1; sau sửa autohead2→4loaded, lỗi after5→retryafter5→after2 đủ6/6, không More. Native4340 compiled cooperative giữ100k unique/mastery0,3.662ms/timer gap1.432ms/37frames/max frame gap488ms/scheduler native; baseline compiled4.946ms/timer gap1.373ms, không có baseline frame probe. Chỉ single desktop observation, vẫn chưa latency/device pass. Fullv20 CHECK_EXIT=0:558file/3598test; typecheck/global lint/content/DB/restore42migration61table/build qua;239JS/192private markers vắng, asset advisory+384.5KiB. Source/runtime/test giữ nguyên suốt gate. Đây là source trước delta nối thông báo ghi local bên trên; không dùng thay gate của delta mới.
- **Dữ liệu giữ được:** DBversion3/IDs/receipts/raw sources/pending/owner/reset/FSRS/mistakes/avatar/retained preimage không đổi. HSK0 4/4 rich0/4, rich40/40/55/78=213/213. Binding367/0drift; không refresh pinned scoring/content baseline, không humanReviewed/USER-ACCEPTED mới. Không sửa docs/reports/output/.wrangler, commit/push/deploy/APK.
- **Tiếp theo:** Account-D1 v20 được kiểm riêng ở mốc bên trên; policy projection409 vẫn giữ. Storage pagination/clone/sort/memory bound, archive lớn, account media/native/device/human/cohort vẫn mở. Worker lịch sử đã rút; Worker codec T04 vẫn giữ và có native apply/rollback proof riêng.

## Cá nhân hóa v2 · chốt source giữ lại / fullv19 · 24/10/2026

- **Module:** T04 codec/recovery + T03 local history — IN-REVIEW; không USER-ACCEPTED toàn plan.
- **Người học thấy gì:** codec bản sao chạy nền, apply/rollback tiếp tục đúng trong IDB callback đang active; lỗi quá dung lượng có hướng dẫn giữ bộ nhớ/bản sao cũ. Lịch sử dùng chung dữ liệu trong một lượt đọc, không cache qua refresh/owner. Giữ đường workspace projection trực tiếp; Worker lịch sử bị rút sau native compiled comparison không thuyết phục.
- **Đã kiểm:** fullv19 CHECK_EXIT=0,556file/3590test; typecheck/global lint/content/DB/restore42migration61table/build qua,239JS/192private markers vắng, advisory+384.1KiB. Source/runtime/test giữ nguyên suốt gate. Retained targeted9file/48test exit0. Native4339 apply/rollback/current+Blob/gen2/job-preview-null qua;4334 history8/8 sau rollback. Native4340 synthetic100k unique/mastery0, còn gap>1giây nên chưa performance/device pass. Fullv18 interrupted rõ ràng, không pass, không xóa log/bằng chứng thử nghiệm.
- **Dữ liệu giữ được:** DBversion3/IDs/owner/reset/outbox/journals/FSRS/mistakes/avatar/retained preimage giữ; HSK0 4/4 rich0/4, rich40/40/55/78=213/213. Binding364/0drift. Không xóa browser storage/.wrangler hoặc sửa docs/reports/output, không commit/push/deploy/APK.
- **Tiếp theo:** bounded local history/clone/gộp/sort và archive lớn; account-D1/release/native/device/human/cohort giữ những giới hạn đã ghi. Preview4325 lỗi504 do các Vite fixture dùng chung optimizer cache đã tách cacheDir trong tmp và restart riêng; guest Sảnh Luyện Chữ đã mở lại, không tạo lượt mới. Không phải product/server deployment hoặc xác nhận result5/5 mới.

## Cá nhân hóa v2 · rút thử nghiệm Worker lịch sử / giữ read sharing · 24/10/2026

- **Module:** T03 — IN-REVIEW.
- **Người học thấy gì:** giữ batch chỉ trong một lượt đọc: journal/outbox3→1, state2→1; refresh/retry và owner/generation/reset isolation vẫn giữ. Không giữ Worker workspace history vì compiled comparison chưa có lợi ích đáp ứng đủ bù elapsed/memory overhead. Worker codec khôi phục T04 là slice khác và vẫn giữ.
- **Đã kiểm:** retained-testv1 9file/48test TEST_EXIT0 sau rollback. Native4340 giữ100k unique/mastery0. Compiled semantic-baseline4.946ms/gap1.373ms, compiled Worker10.442ms/gap1.250ms: quan sát desktop một lần, không controlled trial/device efficacy. Không gọi performance pass. Worker experiment8source +hash được giữ trong tmp/personalization-history-worker-experiment-v1; rg chứng minh không external consumer trước khi chỉ xóa5file vừa tạo của thử nghiệm. Fullv18 dừng có chủ đích với exit INTERRUPTED_OBSOLETE_WORKER_EXPERIMENT, không pass. Fullv19 đang chạy trên source giữ lại; không đổi runtime/test trong gate. Fullv17 T04 đã CHECK_EXIT0:555file/3584test.
- **Dữ liệu giữ được:** restored nguyên parser và canonical workspace read, không schema/migration/authority/ID hoặc source data thay đổi. HSK0 4/4 rich0/4, rich40/40/55/78=213/213. Binding364/0drift sau rút5binding mới của experiment; baseline/pinned hashes không đổi. Không xóa fixture/browser storage/.wrangler hoặc sửa docs/reports/output, commit/push/deploy/APK.
- **Tiếp theo:** chốt fullv19 và consumer8/8 sau rollback. Local storage pagination/clone/gộp/sort/memory bound vẫn mở; account-D1/device/Android/human/cohort vẫn cần bằng chứng thật. Không chạy lại helper worker-bindings cũ vì5file thử nghiệm đã rút; helper hiện hành là personalization-t03-local-read-bindings.mjs.

## Cá nhân hóa v2 · workspace history Worker / native100k · 24/10/2026

- **Module:** T03 — IN-REVIEW.
- **Người học thấy gì:** dựng workspace history chạy trong module Worker. Dùng cùng parser đầy đủ của workspace đọc/ghi thường; không bỏ pending/descriptor/unknown-schema checks. Giữ canonical readLessonResume lookup và owner/generation/reset check sau kết quả Worker. Worker không có DB/network/auth/key access. Worker lỗi từ chối, giữ nguồn; không có Worker dùng cùng core gốc.
- **Đã kiểm:** worker-testv3 7file/45test TEST_EXIT0, typecheckv3/lintv3 exit0; gồm fallback/clone boundary/corrupt pending/descriptor/account confirmation/malformed responses/crash/copy/timeout/late owner. Native4340 fixture giữ nguyên100k nguồn→100k unique events/mastery0: baseline4.524ms/timer gap1.614ms; Worker đầu7.589ms/gap1.861ms chưa cải thiện; bỏ chỉ traversal clone-safety dư thừa cho raw vừa đọc từ IDB (không bỏ validator) đo6.007ms/gap870ms. Có tradeoff elapsed; chưa performance pass. Fixture buildv1 exit0, module Worker13.45kB; full app gatev18 đang chạy, chưa gán pass. Source/runtime/test giữ nguyên trong gate.
- **Dữ liệu giữ được:** DBschema/IDs/reducers/authority/canonical workspace key không đổi; giữ raw journal và tất cả fixture, không xóa storage. HSK0 4/4 rich0/4, rich40/40/55/78=213/213. Binding369/0drift. Không sửa docs/reports/output/.wrangler, commit/push/deploy/APK.
- **Tiếp theo:** chốt fullv18 và compiled-worker/native UI proof. Storage pagination, clone/gộp/sort đồng bộ và memory bound vẫn mở; account-D1/device/Android/human review/cohort không suy từ desktop synthetic.

## Cá nhân hóa v2 · lịch sử local giảm đọc lặp · 24/10/2026

- **Module:** T03 — IN-REVIEW.
- **Người học thấy gì:** nhật ký giữ nguyên sự kiện, bộ lọc và bài nguồn; một lượt tải dùng chung dữ liệu journal/outbox/state giữa ba bộ tổng hợp. Batch gắn owner/generation/reset, chỉ sống trong một lượt tải; refresh/retry đọc mới, không có cache toàn cục.
- **Đã kiểm:** read-testv2 7file/45test TEST_EXIT0; typecheckv1/lintv1 exit0; buildv1 BUILD_EXIT0,239JS/192private markers vắng, advisory+384.1KiB. Test đối chiếu kết quả ba nguồn độc lập, số lần journal/outbox3→1/state2→1, freshness/owner/reset/unknown schema/failure retry/no writes. Browser4334 AppShell/guest thật + dữ liệu fixture giữ nguyên: history8/8, lọc Bài học3/3 rồi tất cả8/8, link bài nguồn còn. Native4340 tổng hợp100k nguồn→100k unique events/masteryEligible0,4.524ms/timer gap1.614ms: integrity qua, responsiveness chưa đạt; ảnh/JSON trong handoff T03_HISTORY_UI.
- **Dữ liệu giữ được:** không sửa reducer/validator/authority, DBschema hoặc dữ liệu; giữ fences cuối lượt. HSK0 4/4 rich0/4, rich40/40/55/78=213/213. Binding364/0drift. Không sửa docs/reports/output/.wrangler, commit/push/deploy/APK.
- **Tiếp theo:** profile các pha native100k còn nghẽn; vẫn chưa có phân trang storage local, account-D1100k hoặc device performance. Fullv17 CHECK_EXIT0:555file/3584test là mốc T04 trước delta5file này; không dùng thay gate targeted/typecheck/lint/build mới.

## Cá nhân hóa v2 · Worker / native IndexedDB transaction · 24/10/2026

- **Module:** T04 — IN-REVIEW.
- **Người học thấy gì:** codec chạy nền, giữ định dạng/validator cũ. Sau Worker/Web Crypto, bước ghi tiếp tục trong callback IndexedDB đang active; lỗi vẫn abort nguyên transaction. Khi archive quá lớn, thông báo giữ bộ nhớ/bản sao cũ, không gợi thử lại do chờ lưu.
- **Đã kiểm:** fullv16 CHECK_EXIT0:555file/3583test, typecheck/global lint/content/DB/restore/build qua;239JS/192private markers vắng, asset advisory+383.9KiB. Mốc này trước sửa native transaction. Browser4339 đã tái hiện TransactionInactiveError trong replaceImage dù keepalive còn chạy; sau sửa apply→read verified job→continue→rollback→continue→finish qua, raw/local current, Blob[0,128,255], generation2, job/preview null. Targeted codecv4 4file/38test exit0 gồm reply Worker ở task sau. Fullv17 đang chạy trên source cuối, chưa gán pass; không đổi runtime/test giữa gate.
- **Dữ liệu giữ được:** DBversion3/bảy store/IDs/authority không đổi; HSK0 4/4 rich0/4, rich40/40/55/78=213/213. Worker không nhận HMAC key/auth/global META. Browser4334 archive hiện vượt giới hạn, export từ chối và giữ nguồn; chưa giải quyết archive quá lớn/account/native/full-device. Binding362/0drift. Không sửa docs/reports/output/.wrangler, commit/push/deploy/APK.
- **Tiếp theo:** chốt fullv17, kiểm thông báo dung lượng trên Hồ sơ thật; không dùng fullv16 hoặc unit/fake-IDB để thay native transaction proof. Main envelope/HMAC/IDB/copy và giới hạn archive lớn vẫn cần slice riêng.

## Cá nhân hóa v2 · codec bản sao chạy nền · 24/10/2026

- **Module:** T04 — IN-REVIEW; chưa nghiệm thu account/native/full-device.
- **Người học thấy gì:** mã hóa/đọc archive và kiểm tra tài nguyên chạy trong module Worker; lỗi worker dừng an toàn và giữ nguồn. Môi trường không có Worker/constructor bị chặn dùng đúng codec gốc. Không đổi schema/định dạng/quyền khôi phục.
- **Đã kiểm:** codec v2 4file/37test TEST_EXIT0; typecheckv3/lintv2 exit0. Browser4337 archive4,195,553ký tự trùng từng byte codec gốc, giữ Blob/undefined/pending ID, bản sửa bị từ chối. Payload tổng hợp16,777,216code-unit/50,331,738byte canonical: timer gap846→66ms; tổng838→2195ms. Một phép đo browser hiện tại, không phone/100k/device latency pass. Fullv16 đang chạy, chưa gán pass. Fullv15 CHECK_EXIT0:553file/3558test là mốc trước T03/codec.
- **Dữ liệu giữ được:** DBversion3, bảy store cùng tên; không migration/DB trong Worker, không gửi khóa HMAC/auth/global META. IDs, raw data, pending/outbox, FSRS/mistakes/owner/reset giữ nguyên. HSK0 4/4 rich0/4; rich40/40/55/78=213/213. Binding362/0drift. Không đụng docs/reports/output/.wrangler, commit/push/deploy/APK.
- **Tiếp theo:** chốt fullv16 và kiểm Worker được đóng gói; các bước JSON envelope/HMAC/IDB/copy vẫn còn trên main thread, chưa kết luận toàn luồng32.6MB đã hết nghẽn.

# Cá nhân hóa v2 · sổ thực thi liên tục

19/10/2026. Yêu cầu mới trong attachment ngày 19/10 cho phép tự chuyển task theo
dependency sau gate kỹ thuật, không chờ prompt/test giữa slice. Chỉ thay giới hạn
nhịp làm việc cũ, không thay authority, quyền phát hành hay nghiệm thu. Không có
USER-ACCEPTED/humanReviewed mới. Source local khác preview và bản phát hành.

## Bảng task/dependency

| Task | Trạng thái | Đã có / việc còn lại |
| --- | --- | --- |
| T00 | IN-REVIEW | Inventory/contract/pilot/fixtures, kế thừa không làm lại |
| A01 | IN-REVIEW | Guest avatar binary/crop/Header/Profile/revision/tombstone implemented; handoff A01, chưa account/native |
| A02 | IN-REVIEW | Private API/storage/server re-encode/UI/local offline binding implemented; targeted63test/Gradle7test/browser3journey/full app cookie save→Header/Profile256px→reload qua. Fullv29 565file/3634test, restore43migration64table/build qua; local config delta typecheck/lint/build qua. Device/picker/offline cache/cloud/human acceptance còn mở. |
| T01 | IN-REVIEW | Lesson transaction/event/reconcile; không đổi nghiệm thu |
| T02 | IN-REVIEW | Coverage10slice trong T02_CONTINUOUS; writing primary/first-response/support/resume mới có handoff T02_WRITING, còn gaps/source cụ thể, không khép toàn T02 |
| T03 | IN-REVIEW | Legacy-compatible atomic paged workspace implemented; fullv33 3688test/build/restore qua. Native100k unique/mastery0,5073ms/gap68ms; abort giữ200kentries+200kpending. Account42/42 sau PWA update; vẫn materialize toàn bộ trong RAM, chưa total-memory/device pass hoặc T02 coverage đầy đủ |
| T04 | IN-REVIEW | Device v2 local seal + guest web apply/preimage/resume/rollback/boot gate implemented; browser hai tab/reload/rollback qua; còn account/cross-reset/cache/native/conflict-resolution, chưa full-device |
| T05 | IN-REVIEW | Profile preferences/session context/opt-out/reset riêng đã có; handoff T05, chưa runner đổi nhanh/cold-start/account-D1/native |
| T06 | IN-REVIEW | Four-node graph/DAG/aliases + real source context hashes; policy unreviewed/null, handoff T06_T07 |
| T07 | IN-REVIEW | Six contextual units + typed alternative; pure extractor giữ exact bindings, guest/account source policy adapters; chưa native audio/human review/measurement |
| T08 | IN-REVIEW | Six original private drafts + strict validator/author preview; no publication, audio/human/family review còn blocker |
| T09 | IN-REVIEW | Descriptive reducer, unknown/unique/temporal isolation/opt-out; no calibrated measurement/mastery |
| T10 | IN-REVIEW | Deterministic hard-filtered shadow composer, four different task manifests; no default-path changes |
| T11 | IN-REVIEW | Frozen manifest, guest/account source adapters, renderer/controller autosave/IME/CAS/ack/conflict; guest fixture entry→resume→close qua; account môi trường/release chặn, còn FSRS/revocation/branch resolution |
| T12 | IN-REVIEW | T12_CONSUMERS matrix; history labels/source links + guest browser7rows qua, no extra authority; còn FSRS/Reader/Nói/Viết/assessment all-module journeys |
| T13 | IN-REVIEW | Local opt-in + map exact bindings/target-supporting/opt-out; AppShell guest fixture plan→resume→close→map đã kiểm; còn diagnostic/delayed evidence/account/device |
| T14 | IN-REVIEW | Composer re-entry <=5phút sau7ngày khi automatic/inference; entry opt-in/null request + guest full-shell resume/map đã kiểm; diagnostic/skip/delayed recall vẫn cần reviewed unseen items; handoff T14_LONG_TERM |
| T15 | NOT-REVIEWED | Authoring workflow prep; expansion blocked until pilot/content review |
| T16 | IN-REVIEW | Đã sửa banner/CTA/Profile/writing/dictionary/mistake support và năm vùng navigation; E2Ev10 6/6. Chưa audit hết learner/rich CTA/G09/device |
| T17 | IN-REVIEW | Install redirect/routing đã sửa. Explicit update dừng riêng optional preparation; native held-fetch regression qua. Fullv30/v31 pass; full-app4327 sau lifecycle đóng/mở bình thường→update/reload qua, dữ liệu còn. Legacy worker không hỗ trợ protocol vẫn có thể timeout; device/release audit còn mở |
| T18 | IN-REVIEW | Protocol + synthetic replay/CLI/frozen input verifier đã có (14test/typecheck/CLI verify pass); còn baseline arms/reviewed item split/device performance/power/cohort/recall thật, không claim hiệu quả |
| T19 | IN-REVIEW | Fullv33 CHECK_EXIT0:566file/3688test,restore43migration64table/build239JS192markers qua; account PWA/avatar/preferences/history42/42 giữ. Các mốc trước đã push theo yêu cầu; bounded memory/recovery/consumer/device/human/cohort và production readiness còn mở |

## Điểm tiếp tục

**24/10 mốc T03:** paging refresh/retry3file đã targeted45test/typecheck/lint/build exit0, keyset fixture4336 đủ9/9 sau hai khoảng mới. Binding356/0drift. Fullv15 recovery đã CHECK_EXIT0:553file/3558test trước T03; không source/test thay đổi giữa gate đó. Guest recovery lớn4334 rollback/finish→reader trang6 nháp mới đã xác nhận; không active flag. Tiếp phần responsiveness codec lớn và task độc lập còn khả thi, không tự nghiệm thu toàn plan.

**24/10 mốc mới nhất:** recovery lớn4334 đã rollback/finish, không còn active job/preview; retained preimage giữ nguyên. Job proof integrity hợp lệ: before draft mới+81outbox, target draft cũ+60outbox. applyv12 10file/133test TEST_EXIT0; lintv8 exit0; fullv15 CHECK_EXIT0:553file/3558test (trước T03/codec, source/test giữ nguyên suốt gate). Reader đã mở đúng trang6/7 và nháp mới sau reload. Handoff T04_STORAGE_DELTA mới nhất; không gọi account/native/full-device/performance đã xong.

**24/10 T04:** fullv14 đã CHECK_EXIT0:553file/3551test/build, trước delta source-target/Lamport/durable preview. Targeted current133test; applyv12/exit riêng đang chốt. Browser4334 có job applying-local sau bản sao32.6MB của phiên rich; cần read-only proof→rollback/finish để giữ draft mới và toàn bộ pending. Không clear flag/seed lại. Server4325/4334 bật lại. Handoff T04_STORAGE_DELTA mới nhất; account/native/full-device/performance còn mở.

**23/10 T04:** guest cùng installation/owner/epoch có apply→resume→finish và preimage rollback; browser4335 hai tab/reload/archived→current rollback qua. applyv5 7file/36test và integrationv1 4file/101test TEST_EXIT0 (overlap). Fullcheckv14 đang chạy, không sửa runtime/test tới khi có exit. Handoff T04_STORAGE_DELTA; chưa account/native/full-device hoặc USER-ACCEPTED.

**23/10 T18 sau buildv14:** replayv3 3file/14test/typecheckv72/lintv2 exit0;
CLI tạo frozen artifact `tmp/personalization-pilot-replay-v2.json`, verifier
tái lập timeline+4paths VERIFY_EXIT0. Chỉ synthetic scope, không user data/DB/API;
opt-out không đọc history. Handoff T18_PROTOCOL đã cập nhật. Không learner
runtime import mới; fullv13 trước tooling này, không dùng thay gate targeted.
Tiếp phần T04/T03/A02/T12/T16/T17/T19 còn mở theo dependency; không tự khép plan.

**Audit tiếp:** LearningHistoryPanel được bọc ScopedLearnerApp key theo
owner/generation/resetEpoch; history client requireScope trước/sau request,
không sửa lại phần reset đã có. Chưa vì đọc code mà gọi old-tab/device journey
đã pass. `node scripts/verify-production-readiness.mjs` exit1/23blocker tại
tmp/personalization-production-closed-v1.log: cổng production giữ fail-closed,
không chạy chuỗi public release/hosting để lấp các blocker ngoài phạm vi.

**23/10 mốc chốt mới:** fullv13 CHECK_EXIT=0:550file/3531test; typecheckv70,
lintv2, targetedv3 7file/48test qua. T14 automatic option/consent và T13 map qua
AppShell4334 thật + prerequisite evidence fixture:2bước/exposure/reload/resume
2/2/close/map đúng target-supporting. Không account/device/hiệu quả học thật.
T16 core fallback lesson low-height đã sửa realm-emblem chiếm chỗ:844×390 CTA
y277..324/h47, frame56px cuộn/nhập/chuyển bước được; portrait390×844 CTA646..692,
nav778..844. Regression4test và buildv14 BUILD_EXIT0 cho CSS sau fullv13.
Fixture shell cũ thiếu html data-theme; đã sửa tmp fixture theo app/layout thật,
không lấy phép đo thiếu theme làm lỗi sản phẩm. Published rich API503 chưa kiểm.
Preview4333(session61333),4334(session14623); không đổi4325/4327 hay .wrangler.
Fullv13/source giữ đứng yên suốt run; gatev12 chỉ là mốc trước T14.

**23/10:** fullv12 đã có CHECK_EXIT=0:549file/3524test, chỉ áp dụng source
trước T14. Browser4333 AppShell/guest thật + completion fixture đi Path→entry→
plan→map inference-enabled: unknown đúng khi thiếu evidence; prerequisite thật
không mở từ completion fixture, fallback về bài. Mobile390×844 bodyWidth390,
header y102..167, footer y709..778 trên nav, content542px/scroll1899px. Enter
mở map và liên hệ; không reset dữ liệu4325/4327. Preview4333 session61333.
T14 helper/composer mới có targetedv2 6file/42test TEST_EXIT=0; không gọi T14
hoàn tất hoặc gatev12 áp dụng source này. Handoff PERSONALIZATION_T14_LONG_TERM.md.

**Mốc sau audit account/scale:** fullv8 đã dừng có marker CHECK_INTERRUPTED,
process exit1, không pass/source không bị sửa trong lúc gate còn chạy. Server
planning dùng canonical `siwc_64hex`, regression deriveAccountKey; fixtureprefix
account: bị từ chối. Pending lookup đổi Set, clock reduce tránh RangeError150k,
dependency/page-operation/reviewID đổi Map/Set giữ semantics. Runner-model-scalev8
2file/9test exit0:100kevents projection1211.655ms CPU, IDB append150k giữ records,
descriptive model nhận exactdimension nhưng không mastery/skip, unknownraw giữ.
Browser lab4330 riêng qua reload/twotabCAS/responseIME/self-review/finished7history;
fixture quyền, không actual learner renderer. ADBconfigured có0device. Gatev9
sẽ chạy source đứng yên sau targeted/typecheck mới; không dùng fullv7/v8 thay.

**Mốc21/10 T11/T03 mới nhất:** handoff PERSONALIZATION_T08_T11_PILOT.md.
Runnerintegrationv5 9file/42test exit0, lintv2 exit0, typecheckv49 exit0 tại source
tương ứng. v48fail TS và v4fail thiếu export mock đã sửa, giữ log. T11 durable
shadow journal dùng primary workspace+history cùng transaction; exact immutable
revision ack/server SQL fence, account pending không next/finished. Server
adaptive-plan đọc normalized projection/enrollment/prerequisite/entitlement thật,
không tin cờ quyền client; executionEnabled:false, chưa gọi actual runner xong.
T03 bỏ hai vòng n² bằng Set; synthetic100000source/50000history→200000record
776.666ms CPU desktop, không IDB paging/device pass. Browser support writing source
localhost order replay/TTS/reveal ghi lịch sử/reload13record; origin127cũ giữ.
Bindings49audit/44delta/310overlay/143continuous/0drift, audit history trước giữ.
Backend4327 buildv7 đã dừng trước rebuild, D1 cô lập không reset. Chuẩn bị fullv8
source đứng yên; không dùng fullv7 thay source sau gate. T04apply/rollback,
T03index/paging100k/A02/device/T11renderer/T12–19 vẫn còn phần khả thi phải tiếp.

**Mốc mới nhất21/10 sau fullv7:** CHECK_EXIT0,532file/3433test/build qua; assets
1371.4KiB/advisory+347.4, Premium227JS192marker vắng; provenance dirty/unattestable.
Source sau gate có preferences independent clock (probe legacyv1 fail→v2 pass;
tests v4 133/v5 95 pass), T04 manifest+known owner localStorage+export/stage UI
(8test, browser18mục/9nhóm), writing support no-op fix (23test), T06/T07 graph6unit
(6test). Handoffs T05/T04/T02_WRITING/T06_T07 ghi giới hạn; chưa full source mới.
Compiledbackendv7 **đang4327, session58063**, D1 cô lập trước đó backup63bảng;
phải dừng trước build khác ghi dist. Writing account thật qua5pha/reload5/5,
history12 khớpSQL12/11snapshots, firstwrong giữ. **Không gồm support fix mới,
preference clock mới/T04/T06/T07**. SW lỗi và projection/mistakes409 vẫn giữ,
không bypass release. Guest source4325/session92086 còn dữ liệu/history cũ.

**WIP gatev7:** session64111/log tmp/personalization-continuous-full-check-v7.log.
Main typecheck/global lint/content/DB/restore đã qua, Vitest đang chạy; chưa
CHECK_EXIT cuối. Runtime/test source đứng yên. Probe legacy preferencesv1 exit1
chứng minh old client đổi tên/bỏ field làm mất prefs; sau gate phải sửa
register/clock độc lập gồm null tombstone và kiểm merge permutations. Đọc
T05 handoff. D1 cô lập đã backup pre-v7-browser-2026-10-21.sqlite (63bảng,
integrity/FK đạt), backend4327 còn dừng, chưa smoke buildv7.

**Mới nhất21/10, supersedes WIP gate bên dưới:** resume writing khác version
đã sửa và browser đổi hệ chữ→Sảnh→bắt đầu→runner đạt. History127.0.0.1 giữ17
sau mở lại. T05 profile preferences đã triển khai: xem PERSONALIZATION_T05_PREFERENCES.md.
Writing resume3file/21test/typecheckv39/lintv1 exit0; preferencesv1 53test/v2
87test/typecheckv40/lintv1 exit0 ở source tương ứng. Fullv6 không còn process,
log kết thúc lint không exit marker, không gọi pass; typecheckv38/lintv20 tương
tự chưa biết exit. Preview4325 đã khởi động lại; originlocalhost dùng test mới,
origin127.0.0.1 giữ dữ liệu cũ. Gate tổng mới sẽ có marker và source đứng yên.

**Mới nhất21/10, supersedes các WIP cũ:** handoff
PERSONALIZATION_T02_WRITING.md; source24file đã audit, continuous110binding,
overlay T00→T01→lessons→review→continuous **279file/0drift** exit0 tại
tmp/personalization-writing-binding-audit-v1.log. Không đổi baseline/pinned
scoring hash. Resultv3 **10file/109test exit0**, typecheckv38/lintv20 còn phải
đọc exit. Resultv2 8file/99test pass; source v3 thêm actual itemSources và test.
Fullcheckv6 đang chạy session71024/log tmp/personalization-continuous-full-check-v6.log,
source giữ đứng yên; không sửa runtime/test trong lúc run như lần v4.
Compiled Worker4327 đã dừng sau smoke, không chạy ngầm trên dist khi gate build
lại. Guest preview4325 còn chạy source mới, giữ toàn browser data.

Guest đã đi hết writing qua paper/keyboard (self-review, không independent
recall), first wrong→reload→correction vẫn first wrong, two-tab cursor, rescue
nét1→2 không reset, recall reveal/TTS, context→summary→reload báo đã lưu5/5.
History filter writing17 trước reload cuối; count sau reload còn phải xác nhận.
Lỗi kết quả trước sửa do normalizer chỉ biết legacy stroke-quiz:word; nay nhận
đúng released character-forge unverified và summary clock chỉ từ record thật,
không thay immutable history hoặc fake thời gian. CUA kernel reset sau khi mở
lại history; rebind tab6/browser2 nếu kiểm tiếp, không dùng biến JS cũ.

Account buildv5 thật đã onboarding20→10phút/reload/history3record; SQL xác minh
hai clocks khác nhau, không đếm đôi. Projection browser thật409
LEARNING_PROJECTION_CONTENT_UNAVAILABLE, không tự bật release/humanReviewed.
SW install failure còn mở, Vite Worker runner trước đó vẫn fail. Không gỡ
lesson/review/assessment-D1/Android/richCTA/full-device/pilot giới hạn từ smoke.
Khi gate source hiện tại chốt: tiếp task độc lập theo dependency (T04/T05),
không dừng một slice và không tự USER-ACCEPTED; T05 prompt đã đọc, chưa runtime.

**V5 đã hoàn tất20/10, supersedes “đang chạy” bên dưới:** CHECK_EXIT0,
527file/3409test, typecheck/global lint/content/DB/restore42migration61table/build
qua. Premium224JS/192marker vắng, asset1364.7KiB vượt advisory340.7KiB;
dirty-tree local/unattestable. V4 vẫn exit1. T19 dev Vite isolated đã fail ở
Worker runner/getWorkerEntryExportTypes; thử compiled Worker chính buildv5 với
official wrangler dev, session59493/port4327/persist riêng, chưa account/browser
pass. T18 protocol nháp đã có, chưa replay harness/cohort/reviewer chốt power.

**Mốc mới nhất20/10:** fullcheckv4 exit1(525file/3403test pass,1skill assertion
fail khi source/test đổi giữa run); không relabel pass. V5 giữ source đứng yên,
session18878/log full-check-v5; chỉ ghi pass khi có CHECK_EXIT0 cuối. Targeted
speech-sessionv3 5file/21test, typecheckv28 pass. Browser guest speech reload1/4,
2tab retry cùng mục vẫn2/4; history4speech, Dictionary7 gồm hai TTS mới qua
reload. Handoff PERSONALIZATION_T02_SPEECH.md. Source95 binding +203inherited
không unmapped drift sau skill/main refresh. T19 D1 riêng tmp/personalization-d1
đã42migration exit0; server24560/port4327 còn dependency scan, chưa account/auth
browser. Không gỡ limitation D1 chỉ từ migrations. Tiếp đọc gate, kiểm backend
cô lập khi sẵn, rồi T02 writing owner/reset/version/intermediate, không audit lại.

**Mốc 20/10 mới hơn mọi TODO bên dưới:** mistakes origin-revisit đã nối qua
`RemediationSourceLink`→`saveMistakeRevisit`→primary workspace+immutable history.
Chỉ support/navigation-requested, retry cùng identity, không objective/reward.
DictionaryExperience đã nối TTS từ/câu ví dụ; stimulus riêng, synthetic/requested.
Targeted revisitv2 5file/17test, typecheckv21/global lintv14 exit0.
T04 bắt đầu capture owner IDB read-only transaction gồm avatar Blob; targeted
recoveryv1 2file/5test pass, chưa archive/localStorage/restore/UI.
Fullcheckv3 cũ có523file/3393test +build/Premium pass trong log nhưng mất process
exit; không gán exit0. v2 vẫn là fail6header, root đã sửa. Fullcheckv4 mới
`tmp/personalization-continuous-full-check-v4.log` có marker exit cuối đang chạy.
Typecheckv22/scoped recovery lint đang chạy. Source binding cần refresh sau các
file mới này, không sửa baseline hash để né drift. Toàn kế hoạch vẫn chưa xong.

**Cập nhật tiếp cùng ngày:** snapshot+archive staging-only đã có tests recoveryv3
4file/17test/typecheckv24 qua (v23 fail kiểu fixture, đã sửa). Quest speech route
thật đã thêm source-versioned open/self-review/replay resume; helper hỗ trợ TTS
trước playback ở Quest và legacy. Speech-sessionv2 5file/34test/typecheckv27 qua;
v3/skill preservation/typecheckv28/global lintv15 đang kiểm exit. Chưa browser
resume hoàn chỉnh/account-D1/Android. Profile grid overlap summary→Premium đã
sửa đúng CSS; browser thật thấy9event cũ+2mới=11, reload11, keyboard mở đúng.
Continuous source binding95, inherited203 chưa unmapped drift trước skill delta;
cần refresh sau cùng. Fullcheckv4 đang chạy và có assertion fail xuất hiện khi
source/test thay đổi giữa run; phải đọc log và rerun source đứng yên, không gọi
pass hoặc che lỗi bằng tăng timeout. Chưa có gate tổng cho source cuối.

**Mốc mới hơn các ghi chú WIP bên dưới:** đọc
`PERSONALIZATION_T02_CONTINUOUS.md`, `PERSONALIZATION_A01_AVATAR.md` và
`PERSONALIZATION_T03_HISTORY_UI.md`. Document/profile/dictionary transactions,
assessment lifecycle/offline mock, expansion resume, G09 scope và avatar/UI mới
đã triển khai; không làm lại từ các TODO cũ ở cuối tài liệu này.

- Full check v1 exit0: **518 file/3382test**, DB/restore42migration61table/build
  qua, Premium218JS/192markers vắng; asset1348.8KiB vượt advisory324.8KiB.
  Đây là mốc trước avatar/UI và scope refinements cuối, không dùng thay gate cuối.
- Targeted final v1 **13file/102test** pass; expansion **3file/13test** pass;
  journey **4file/21test** pass; avatar v2 **5file/18test** pass. Overlap không cộng.
- Typecheck v14/v15/v17 và scoped lint v7/v8/v10 pass ở mốc tương ứng.
  Typecheck v16 đã fail do tên file khác case, sửa decoder avatarRaster rồi v17
  pass. Lint v6 đã cảnh báo cleanup ref, sửa dùng generation captured, v7 pass.
- Full check v2 `tmp/personalization-continuous-full-check-v2.log` đang chạy.
  T03 targeted/profile v1, typecheck v18, lint v12 và global lint v11 cần đọc
  exit, không suy pass từ header. Không tăng timeout hoặc xóa test.
- Guest CUA Dictionary + expansion reveal/cursor qua reload + avatar crop/save/
  reload/cancel/375×667 và667×375 qua; nhật ký đọc9hoạt động thật. Preview4325
  restart sau sửa import case; process session mới22825. API vẫn guest/503.
- G09 đã thay epoch0 bằng IDB scope thật, guard checkpoint khác scope và giữ raw
  lỗi/storage-write cũ. Test journeyScope reset cùng anchor qua; chưa old-tab
  browser hoàn chỉnh, không tự gán G09 USER-ACCEPTED. Rich footer mobile vẫn mở.

**Đi tiếp:** đọc gate đang chạy; cập nhật sourceBindings WIP (hash hiện tại còn
stale); hoàn thiện T02 remaining/server mock answers/legacy clocks/consumer,
T03 pagination journeys, rồi T04/A02/T05–T19. Chưa có blocker cho phép bỏ qua
các task độc lập chưa làm. A02 thiếu encoder binding thật là giới hạn môi trường
đã audit, vẫn có phần chuẩn bị được; không gọi A02 hoàn tất.

- Baseline đã đối chiếu: T00→T01→T02 lessons→T02 review, **203 source bindings, drift []** trước sửa.
- Đang làm T02 các nguồn còn lại, không dừng sau một slice. Giữ nguyên source đã
  đúng; chỉ kiểm consumer/delta. Chưa tự nghiệm thu phần trước.
- Giữ dữ liệu/IDs/dirty tree; không sửa docs/reports/output/.wrangler hoặc profile
  trình duyệt người dùng. Không commit/deploy/APK.

## Giới hạn kế thừa — vẫn tiếp tục các task độc lập

| Giới hạn | Tác động / bước gỡ |
| --- | --- |
| Chưa có human review/policy pilot | Chuẩn bị draft/validator/shadow/fallback, không tự cấp mastery/skip hoặc bật nội dung chưa đủ điều kiện |
| Chưa có audio native pilot | Không bịa evidence nghe/nói; filter media và fallback practice/text rõ |
| Chưa có cohort/recall 7/30 ngày | T18 kiểm kỹ thuật/protocol, không claim hiệu quả học thật |
| Chưa chứng minh có Android device | Kiểm công cụ/thiết bị cho phép, không gọi build/emulator là thiết bị thật |
| Account-D1 browser thật chưa kiểm | Tìm môi trường cô lập, không dùng/xóa .wrangler người học; fixture≠D1 |
| Assets > advisory1MiB | Đo điều hướng thực; không tăng ngưỡng để báo pass |

## Bằng chứng lúc bắt đầu

T02 review: fresh full gate511file/3350test, targeted164test, browser guest+
account-context fixture, chưa D1 thật. Gate lessons timeout cũ giữ là fail.
Không đổi test ngày18/10 thành test đã chạy ngày19/10. Rich lesson footer
y918/viewport844 và G09 reset scope vẫn mở.

## Đợt T02 còn lại — đang triển khai, chưa khép

- Mở rộng contract schema1 bằng biến thể `business-activity`, taxonomy explicit
  objective/self-review/support/exposure/visit/preference/saved-item/session;
  giữ event IDs và parser lesson/review cũ. Hint/TTS/transcript/manual/stroke
  không thành mastery. Summary chương Reader không tính thêm một đáp án objective.
- Core correction guest await CAS transaction state/evidence/event/outbox;
  page correction có companion journal append-only nguyên tử; retry key giữ khi
  đọc lại UI lỗi. Practice correction lưu thêm time/source version thật.
- Workspace history bất biến cùng transaction nghiệp vụ cho Reader answer/
  support/bookmark/saved, correction, access, mock result và practice observations.
  Server cũng dựng history ngay batch nghiệp vụ; không analytics request riêng.
  Chưa tạo history mỗi cập nhật vị trí đọc. Giữ raw khi conflict/quota/schema lỗi.
- Client workspace extension3 nhận history; client0/2 vẫn nhận contract cũ.
  `activity-history` auth/owner/reset/cursor projection đọc business attempts và
  workspace history. Normalized Reader pending/receipt và assessment attempt
  dùng cùng event identity. Assessment đang làm chỉ unknown; chỉ row submitted
  mới lộ outcome, không answer keys. Chưa có browser/D1 thật cho endpoint mới.
- `recordPracticeEvidence` nay Promise, guest await transaction; account có
  primary descriptive business observation journal, không nâng authority và không
  upload transcript/raw audio. Các caller Reader/placement/writing/legacy speech
  đang được chuyển sang await. Writing và speech mission không phát journey
  receipt account khi observation còn pending. Acoustics chỉ lưu reported
  aggregate/provider/calibration unapproved, không bịa điểm thanh điệu.
- Reader chapter hook đang chuyển sang commit workspace trước UI, cho cả guest/
  account, hydrate từ journal, giữ first attempts và rebase multi-tab. Wrapper
  storage strict giữ raw lỗi, không đọc thành empty rồi ghi đè. Thêm màn lỗi dữ
  liệu thay vì hiện tiến độ0 giả. **Cần test/browser bổ sung hook mới**.

### Gate đã chạy (không cộng overlap)

- `tmp/personalization-continuous-history-tests-v2.log`:12file/70test pass.
- `tmp/personalization-continuous-history-tests-v3.log`:14file/100test pass,
  gồm actual SQLite correction transaction→history và active/submitted assessment
  privacy. Đây là fixture SQLite memory, không D1 browser thật.
- Typecheck v3/v5/v6 pass ở các mốc trước rewrite Reader hook; scoped lint mốc
  đầu pass. Lint v2 phát hiện thiếu dependency authenticated, đã thêm đúng
  dependency, không disable rule. V7/V8 và targeted v4/lint v3 đang kiểm tiếp.
- Hai assertion workspace snapshot cũ cần thay expectation để bao gồm history
  immutable; giữ nguyên assertion tombstone/in-flight pending/owner/reset.
  Không xóa test/hạ gate/tăng timeout. Chưa chạy full gate mới đợt19/10.

### Chưa xong và bước tiếp ngay

1. Đọc log targeted v4/typecheck v8/lint v3, sửa đúng lỗi. Kiểm browser Reader
   guest mới trước khi mở T03. Viết test hook/storage/observation confirmation.
2. Hoàn thiện backfill workspace server legacy (hiện generic endpoint mới đọc
   history namespace và business attempts, chưa toàn legacy workspace), offline
   mock và lifecycle session/submit/abandon. Không tự coi là T02 hoàn tất.
3. Nối dictionary lookup/save, profile/goals và expansion; hoàn thiện speech
   playback/support và writing session scope/provenance. Kiểm các late callback/
   reset race dù App runtime đã key owner/generation/epoch.
4. Sau các adapter, T03 UI chung; T04 recovery; A01/A02 và T05–T19 tiếp tục theo
   dependency. Avatar/chính sách adaptive/backup/mobile CTA/G09 chưa được làm ở
   mốc này, không được bỏ khỏi bảng task.

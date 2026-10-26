# T08–T11 · pilot cá nhân hóa · 21/10/2026

**IN-REVIEW**, chưa USER-ACCEPTED. Kế thừa quyền chuyển task trong attachment;
không mở release, human review, deployment hoặc quyền chấm điểm mới.

## Mốc bổ sung · renderer/controller và account v9

**Cập nhật22/10:** guest đã có adapter nguồn thực và route opt-in `/path/practice`
qua mục mở rộng Thiên Lộ; chỉ loopback + cấu hình nội dung cho phép. Pure source
extractor giữ exact binding; prerequisite đọc state durable, scope được kiểm lại
trước/sau materialization. Không đủ candidate thì quay về bài truyền thống.
Origin fixture4331 dùng adapter guest thật: chọn mục tiêu→plan→đọc→viết/IME→
reload/resume đúng bước→support→first response→close→history7lượt/link nguồn qua.
Đây là prerequisite fixture, không account eligibility hay efficacy. Ack journal
không remount unit khi workspace không đổi; radio tự đối chiếu được giữ.
Fullv10 545file/3489test qua trước delta guest/entry; targeted guestv18/pathv19/
conservationv20 qua. Buildv12/typecheckv62 qua gồm lifecycle49test. Các đoạn
“chưa guest/renderer/route” phía dưới là trạng thái lịch sử. T11 FSRS receipt,
revocation/branch resolution, T12 all-module journeys và T13 competency map/
diagnostic vẫn còn; account compiled hiện chặn bởi cấu hình nội dung môi trường.

Ghi chép dưới đây về shadow-only/chưa renderer là lịch sử trước mốc này.
`practiceManifest.ts` giữ shadowBinding và seal manifest practice chỉ với unit;
FSRS vẫn bị từ chối tới khi có receipt adapter thật. Binding là integrity,
không phải access token. Plan mặc định shadow; query mode=practice được kiểm
strict (unknown/duplicate bị400), server đọc exact projection/prerequisite/
entitlement trước seal. Không có candidate thì executionEnabled:false.
`adaptive-unit` kiểm lại owner/reset/unit/graph/content/enrollment/source mỗi
lần render/resume; client kiểm payload/context hash và scope trước/sau fetch.

`AdaptiveSessionController` tuần tự hóa draft/support/practice/next; draft có
optimistic display, durable autosave, retry khi lỗi. Không rebase lên revision
ngoài: giữ câu đang hiển thị, block và yêu cầu đọc phiên đã lưu. Receipt đã
submit bất biến; click chậm không được lưu câu khác câu đang hiển thị.
`AdaptiveSessionRunner` hydrate, autosave350ms, scope lifecycle/StrictMode,
BroadcastChannel/focus/ack refresh và source cancellation. Chưa mount learner
route; lab adapter chỉ fixture, không thay guest/account policy.

Browser lab4330/runner.html: đọc→write draft+IME→reload nguyên→tab2Pinyin→tab1
conflict giữ câu→explicit reload→reveal/self-review→save→close. Mobile390×844
bodyWidth390, header44..135, CTA786..832 (44px+); giữa cuộn. Ảnh trong tmp:
personalization-runner-conflict-v16.png, personalization-runner-mobile-v16.png.
Targetedv16 6file/30test exit0; typecheckv56/lintv5 exit0; v15 fail vì assertion
conflict text quá hẹp, giữ log. Fullv9 542file/3471test exit0 chỉ áp dụng source
trước delta này; gate tổng mới chưa xác nhận tại thời điểm ghi.

Account-D1 buildv9 thật đã qua preferences sync/reload với clock riêng (daily
profile đổi không tăng preference clock) và writing5pha/ack/reload5/5. SQL
so baseline giữ24row writing cũ nguyên byte/clock; support mới syntheticTts/
reveal/order-replay không measurement. Inspection JSON và backup pre-v9 ở
tmp/personalization-d1. Projection409 release policy vẫn giữ; SW browser lỗi
install còn mở, shim probe285resource success không phải CacheStorage/PWA pass.
SDK ADB0device. Worker4327 v9 đã dừng trước gate build mới.

## T08 · nhánh nội dung

`content/drafts/personalization-price-pilot-2026.10.21.json` có sáu draft nguyên
bản cho giá/số lượng: nghe 15/50, tổng giá, scaffold lượng từ, viết lượt hỏi,
delayed candidate, đọc ngân sách. Tất cả humanReviewed:false, chưa published,
không measurement. Hai gap native audio, ba candidate holdout cần review
family/exposure, năm ghi chú AI self-review không thay human approval.
`pilotDraftVariants.ts` kiểm source/context/dimension/answer/audio/policy;
publishedUnitIds luôn rỗng. Author preview riêng `/pilot-review.html` tại4325,
không nằm trong learner bundle, không ghi evidence. Browser đã mở sáu thẻ.

## T09 · mô hình mô tả

`learnerModel.ts` replay competency×skill×modality, phân target/supporting,
unique source item/ngày và trợ giúp/self-review/exposure. Giữ first wrong khi
correction/ack; provisional và confirmed không đếm đôi; future receipt không
lọt replay lịch sử. Schema/version/time/dimension/import/quarantine thiếu giữ
unknown. Independent coverage:null, sufficiency:unknown; không mastery/skip/
unlock. Opt-out không duyệt history. Chưa có policy đo lường được duyệt.

## T10 · shadow composer

`sessionComposer.ts` ghim unit/source/context/graph/model/eligibility và lý do,
hard-filter quyền/prerequisite/version/offline/capability/budget5/10/20phút.
Sáu unit thật tạo bốn manifest khác tác vụ: đọc thay nghe (cần đồng ý đổi),
role-play hoặc viết có IME, FSRS offer nguyên revision/lịch, đọc shop thay
challenge (cần đồng ý đổi). Không có native listening/unseen challenge đã
review. Thêm10giây chuyển bước vào budget, không nhận như đo thời gian thật.
Combined composer-v2:6file/22test exit0; composer-lint-v1 exit0. Đây là source
trước T11 thêm skill vào step; không dùng thay gate source sau.

## T11 · journal và server planning boundary

`adaptiveSession.ts` lưu frozen shadow manifest, cursor, first practice receipt,
IME/self-review và support vào primary workspace. History gọn được dựng trong
cùng transaction; không đưa snapshot vào details500ký tự. Persist trước next;
account đợi ack trước next và sau bước cuối mới finished. Offline/409 giữ
pending. Retry cùng revision idempotent; conflicting response không ghi đè.
Không tự thay manifest khi source đổi, không mở phiên khác đè phiên dở.
Owner/reset/quota/schema lỗi giữ dữ liệu. FSRS step chưa có actual receipt
adapter thì từ chối, không chấm hoặc reschedule bằng journal này.

Workspace client/server bảo vệ adaptive revision giống writing: exact command
ack, server before-image, SQL cấm LWW overwrite và history source fence; chặn
hai command cùng key ngay trong một fresh batch. Merge adaptive conflict giữ
local/pending thay vì nhận branch clock mới. Không migration schema.

`POST /api/learning/adaptive-plan` là server planning endpoint: auth/owner/body
bound/reset, đọc normalized projection theo release policy cũ, derive exact
enrollment/source/prerequisite và entitlement trên server; không nhận eligibility
hay completion client. Chỉ trả payload unit được chọn. Offline chưa có exact
preparation thì không trả unit. executionEnabled:false: endpoint chưa cho phép
learner thực thi shadow plan, chưa phải runner/renderer tích hợp hoàn tất.

Runner-v1 **3file/17test exit0**, v2 **5file/24test exit0**; integrationv5
**9file/42test exit0**, lintv2 exit0. Typecheckv48 exit2: fixture chưa narrow
ShadowStep và defaults spread TS2783; đã sửa, v49exit0. Integrationv4 exit1 do
mock D1 thiếu export transitive, sửa partial mock rồi v5 qua; giữ log fail.
Đây là IDB/SQLite/mocked route gates, không phải browser/D1 account source mới.

T03 delta: `workspaceEntriesWithHistory` và Set evidence IDs bỏ hai vòng n²,
không đổi projection/dedup. Synthetic100000sources+50000existingHistory tạo
200000records trong776.666ms, second pass idempotent/nguồn giữ nguyên;
`personalization-history-scale-v1.log`1test exit0. Không tuyên bố IDB index,
actual timeline100k/mobile/device pass; local reader vẫn tải toàn owner history.

Browser source localhost4325: order replay→keyboard alternative (không giả
viết tay)→recall TTS→reveal→Profile history13writing→reload13. Hai latest
support mở chi tiết thấy assisted/non-independent. Ảnh
tmp/personalization-writing-support-history-v8-reload.png. Preview guest/API503
khác account-D1; chưa chứng minh endpoint mới ở compiled Worker.

## Phần còn lại

## Delta sau audit scale/account

Fullv8 đã chủ động dừng bằng Ctrl+C trước sửa source, process exit1; marker
CHECK_INTERRUPTED trong log, không phải pass. Audit phát hiện account thật dùng
`siwc_`+64hex, khác prefix fixture `account:`; server builder đã sửa strict
canonical namespace và regression dùng `deriveAccountKey`. Không đổi owner IDs.

Projection workspace còn pending.some cho mỗi event: before synthetic1000
36.286ms/10000 1191.700ms; thay Set pendingIds, after18.874ms/119.449ms.
Không coi thời gian synthetic là benchmark thiết bị hoặc kết luận tốc độ cố định.
Scale test mới đủ100000events pending/provisional: materialize753.140ms,
projection1211.655ms, không nâng authority. Actual IDB append sau150000entries
qua1160ms trong test; trước đó probe Math.max(...150000) nổ RangeError exit1.
Stamp nay reduce không spread call stack; record cũ/pending mới vẫn đúng.
Map dependency/page-operation và Set review IDs bỏ các vòng lặp n² khác,
giữ semantics chọn record đầu. Reader vẫn tải toàn history; chưa index paging.

Runner-model-scale-v8 **2file/9test exit0** gồm round-trip unit/dimension/support
vào descriptive model và unknown raw schema không bị overwrite. Typecheckv50
fail nullable dependency lookup, đã narrow null; v51 cần đọc exit source tương
ứng. Lab browser4330/IDB riêng đã open→chặn next thiếu receipt→support+receipt→
reload→hai tab conflicting revision bị từ chối→đọc lại→production response/IME/
self-review→finished→reload giữ revision6/cursor2/7history/frozen binding.
Đây là fixture eligibility/browser persistence, không learner renderer/release/
account-D1. Ảnh tmp/personalization-runner-browser-lab-reload.png.
ADB từ SDK đã cấu hình chạy được, danh sách device rỗng; không device pass.

T11 còn materialize/revalidate từng unit qua source runtime, actual renderer,
safe-boundary adaptation, revoked-content UI/offline preparation và browser.
T12 phải kiểm đủ consumer/receipt gốc, T13 UI Thiên Lộ và T14 diagnostic chưa
nối. T04 chưa apply/rollback; T03 chưa index100k; A02/native/device còn mở.
Audio/human review/cohort không thể thay bằng fixtures. Fullv7 chỉ áp dụng
source trước các delta T04/T05 clock/T06–T11; cần full gate source mới.

HSK0 4/4 rich0/4; HSK1–4 rich40/40/55/78=213/213 giữ. Không đổi IDs, scoring,
baseline hashes, completion/streak/FSRS/mistakes/saved/resumes/outbox; không
đụng docs/reports/output/.wrangler; không commit/branch/push/deploy/APK.

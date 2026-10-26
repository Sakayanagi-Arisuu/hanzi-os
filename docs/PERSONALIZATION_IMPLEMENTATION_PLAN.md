# HANZI.OS — kế hoạch toàn hệ thống và Thiên Lộ thích ứng

Phiên bản 2 · 17/10/2026 · Kế hoạch, chưa triển khai/USER-ACCEPTED.
Thay thế kế hoạch P00–P12 trước đây; không dùng mã P cũ để giao việc.
Checkpoint vẫn là nguồn sự thật. Mỗi lượt làm một task/slice có thể kiểm thử,
người dùng test giữa các module; không tự chạy cả danh sách trong một lượt.

## 1. Giữ đầy đủ yêu cầu

| Yêu cầu | Task |
|---|---|
| Cập nhật avatar web/app | A01–A02 |
| Lịch sử học tập đầy đủ, xem lại được và phục vụ cá nhân hóa | T01–T03 |
| Bảo toàn dữ liệu, đồng bộ, full-device recovery | T04, T11, T17 |
| Cá nhân hóa mục tiêu, trải nghiệm, nội dung và nhịp học | T05–T14 |
| Thiên Lộ là bản đồ năng lực, không chỉ đổi thứ tự bài | T06–T14 |
| Audit TOÀN BỘ liên kết module web/app | T00, T02, T12, T16–T17 |
| Đánh giá hoàn thiện từng module và sửa/nâng cấp điểm thiếu | T16–T17 |
| Nội dung đủ sâu và công cụ biên tập để adaptive thật | T07–T08, T15 |
| Kiểm hiệu quả học, UX và chất lượng web/Android | T18–T19 |
| Prompt copy-paste cho từng lượt | Mục 7–8 |

Không mở payment/public hosting/dịch vụ trả phí hay tự phát hành APK. Không
chứng nhận “hoàn hảo tuyệt đối”; báo bằng chứng, phạm vi và hạn chế thực tế.

## 2. Kế thừa, không làm lại từ đầu

- NgocHeader hiện dùng chữ đầu tên; chưa có luồng đổi avatar đầy đủ.
- LearningStore có activityLog/evidence; analyticsRepository và AnalyticsPage
  có thống kê ngày/kỹ năng. Thiếu timeline thống nhất, không phải chưa có dữ liệu.
- adaptive.ts, learningJourney.ts, LearningJourneyStore.tsx có chọn bài và
  vòng Học → Ôn → Vận dụng → Khép phiên. Mở rộng qua adapter, không tạo hai
  planner/nguồn authority cạnh tranh cùng ghi tiến độ.
- SYSTEM_INTEGRATION_AUDIT.md đã ghi 14 nhóm module và 16 nhóm sửa. Kế thừa
  source local và regression; không coi đã deploy/được người dùng nghiệm thu.
- Account/D1 browser thật, Android thiết bị và full-device recovery còn thiếu
  bằng chứng. Fixture/unit/build không thay các gate đó.
- Giữ HSK0 4/4 rich0/4; HSK1–4 rich40/40/55/78 = 213/213 và stable IDs.
- Mỗi lượt đọc checkpoint mới nhất, kiểm code thật và dirty tree trước sửa.

## 3. Thiết kế cá nhân hóa được chốt

### Ba lớp

1. Bản đồ năng lực: mục tiêu người học có thể làm/hiểu bằng tiếng Trung,
   prerequisite và yêu cầu evidence; ổn định, version hóa, review học thuật.
2. Kho đơn vị học: giải thích, ví dụ, audio, câu hỏi, đoạn đọc, hội thoại,
   hoạt động viết/nói và phép đo. Tái dùng từ bài hiện có, đủ ngữ cảnh.
3. Phiên thích ứng: ghép đơn vị phù hợp nhu cầu, evidence, thời gian, bối cảnh
   và quyền truy cập thành một mạch học; điều chỉnh tại ranh giới an toàn.

Bài truyền thống vẫn truy cập được. Completion bài cũ, exposure, practice,
mastery và eligibility bỏ qua phần giới thiệu là các trạng thái riêng.
Học vài unit của bài không tự làm toàn lesson thành completed.

### Khác biệt phải hiện trong phiên học

| Trục | Hành vi |
|---|---|
| Nội dung | Bổ sung đúng phần thiếu, giảm phần đã có đủ evidence |
| Tác vụ | Nhận diện → recall → production → transfer khi phù hợp |
| Trợ giúp | Scaffold khi cần, rút hỗ trợ dần và đo lại độc lập |
| Độ khó | Thay yêu cầu tác vụ thật, không chỉ đổi nhãn |
| Nhịp | Phù hợp 5/10/20 phút, không bắt học nguyên lesson |
| Thời điểm | FSRS/recall trễ/quay lại sau gián đoạn; giới hạn nợ ôn |
| Bối cảnh | Không mic/audio/offline vẫn có lựa chọn hợp lệ |
| Đường đi | Challenge phần đã biết, bù prerequisite khi có bằng chứng |

Không bắt hai người giống nhau phải nhận phiên khác nhau. Chỉ yêu cầu khác
biệt khi nhu cầu khác. Không chấm kỹ năng chưa có phép đo hợp lệ.

### Pilot trước, mở rộng sau

T00 chọn một cụm đủ học liệu thật (mua sắm/giá tiền là ví dụ, không hardcode).
Bốn fixture nhu cầu bắt buộc:
- Biết nghĩa từ nhưng nghe giá tiền sai: luyện nghe phân biệt rồi nghe câu mới.
- Hiểu đầu vào nhưng chưa tự đặt câu: scaffold rồi production; chưa có chấm
  production tin cậy thì ghi practice, không tự nâng mastery.
- Đúng trong buổi nhưng recall trễ kém: phân tán ôn và kiểm bằng item mới.
- Đủ evidence cơ bản: challenge/transfer hoặc bỏ phần giới thiệu phù hợp.

Thêm cold start/unknown/no-mic/offline/5 phút. Chứng minh khác unit, task,
assistance hoặc thời lượng; đổi tên/thứ tự lesson không đạt. Không dùng LLM
sinh vô hạn câu hỏi thay cho học liệu có kiểm định. AI-assisted giữ
humanReviewed:false đến khi có người duyệt thật.

## 4. Contract không được làm yếu

### Lịch sử và dữ liệu

Event có stable ID/schema version, owner/reset, source/session/attempt ref,
item/content version, module, skill đo thật, outcome, assistance/exposure,
provenance, occurredAt/receivedAt. Tách observation, evidence, reward và
recommendation decision. Analytics không phải authority cấp mastery/mở bài.

Retry idempotent; provisional local + server receipt là cùng một hoạt động.
Account ghi lịch sử trong transaction nghiệp vụ hoặc projection rebuildable,
không mất event vì request analytics thứ hai lỗi. Backfill chỉ từ record thật,
có lineage/cursor; không bịa đáp án/duration. Corruption/quota/version lạ giữ
raw record và báo lỗi, không ghi đè bằng rỗng. Không cắt ngầm lịch sử dài.

Visit khác practice. Duration là active-time ước lượng, trừ idle/background.
Xử lý clock skew/múi giờ, không âm thầm đổi streak UTC+7 cũ. Cursor/index và
reducer tăng dần; không quét toàn lịch sử mỗi lần render. Không tự upload
âm thanh/transcript/raw handwriting chỉ để analytics.

Recovery có manifest phạm vi/integrity/staging/rollback. Không export secrets,
không replay command sang owner/reset/install khác, không nâng imported data
thành verified evidence. Reset học, xóa account và reset sở thích khác nhau.

### Năng lực, unit, session

Graph có competency ID/version, prerequisite DAG, skill/modality, evidence
requirements và mapping content phát hành. XP/streak/lesson count không phải
mastery. Cùng item lặp/hint/reveal không tăng independent recall coverage.

Unit giữ immutable source/version, context, prerequisite, skill, task type,
assistance, difficulty giả định, thời lượng ước lượng, quyền/media/offline và
provenance. Không tách câu khỏi audio/đoạn văn cần thiết; rubric không biến
thành objective. Answer keys kín và Premium không được lọt bundle công khai.

Manifest đóng băng unit/version, step/reason, source/receipt mapping. Chỉ
adapt sau hoạt động đã persist, không thay câu đang trả lời. Resume giữ
manifest cũ; content bị thu hồi có fallback rõ và bảo toàn kết quả. Account
server xác thực eligibility/manifest/scoring, không tin client để mở khóa.

Hard filters trước ranking: prerequisite, entitlement, media/offline/time.
V1 xác định, version hóa/replay được; FSRS hiện có vẫn là nguồn lịch ôn.
Không kẹt remediation hoặc bắt chữa hết lỗi mới cho học tiếp; diagnostic có
budget, không ép kiểm đầu vào mỗi lần. Skip không mặc định là năng lực thấp.
Người học được đổi nhiệm vụ/thời gian, chọn bài thủ công, tắt suy luận.

### Avatar

Guest blob local, account media adapter + metadata revision, không base64
trong learning state/outbox JSON. Select/crop/preview/save/cancel/remove,
Header/Profile nhất quán. Không suy năng lực từ ảnh hoặc danh tính.
Đề xuất JPEG/PNG/WebP ≤5 MiB/16 MP; output 256×256 ≤200 KiB. Server kiểm MIME,
chữ ký/decode/size, re-encode bỏ EXIF; SVG/animation ngoài V1. Owner fence,
version conflict, cache isolation, lỗi giữ ảnh cũ; không proxy URL tùy ý.
Reset học không xóa avatar; delete account dọn media đúng owner. Không tự mở
cloud/dịch vụ trả phí nếu thiếu adapter; báo blocker thật.

## 5. Task và phụ thuộc

Mọi task mặc định NOT-REVIEWED. Task nhiều module phải tách slice theo mục 6,
không kết luận hoàn thành cả task khi mới xong một slice.

| ID | Đầu ra | Phụ thuộc | Gate chính |
|---|---|---|---|
| T00 | Inventory toàn hệ thống, pilot, contract/fixture baseline | — | Mọi requirement/module/edge có nơi xử lý |
| A01 | Avatar guest và UI chung | T00 | Crop/save/cancel/delete/reload/quota/owner |
| A02 | Avatar account/Android | A01 | Auth/upload/version/cache/two-session/native |
| T01 | Event contract + lesson→history bền vững | T00 | Transaction/retry/offline/provisional không đôi |
| T02 | Adapter toàn nguồn học | T01 | Coverage từng nguồn, backfill có lineage |
| T03 | Nhật ký trong Hồ sơ | T02 | Timeline/filter/detail/resume/pagination/unknown |
| T04 | Recovery/vòng đời dữ liệu | T02; A02 nếu có media account | Round-trip journal/session, isolation, rollback |
| T05 | Mục tiêu và bối cảnh cá nhân | T00 | Cold start ngắn, chỉnh được/opt-out |
| T06 | Graph năng lực pilot + map bài cũ | T00 | DAG/IDs/evidence, không đổi completion thành mastery |
| T07 | Learning-unit contract/extractor pilot | T06 | Context/version/keys/entitlement nguyên vẹn |
| T08 | Nhánh học liệu adaptive pilot | T07 | Scaffold/recall/transfer/delayed probes, review thật |
| T09 | Learner model có bất định | T02,T05,T06 | Replay/unknown/unique/time/assistance đúng |
| T10 | Session composer shadow | T07,T08,T09 | Manifest khả thi, khác biệt thực chất, lý do |
| T11 | Session runner guest/account | T10 | Safe adaptation/persist/resume/server validation |
| T12 | Nối adaptive session với mọi module | T11 | Source/receipts/FSRS/errors/history/rewards đúng |
| T13 | Thiên Lộ theo năng lực và hành trình cá nhân | T12 | Một CTA, explain/change/resume, bài cũ giữ |
| T14 | Diagnostic/skip/recall trễ/re-entry | T13 | Evidence hợp lệ, không kẹt ôn/kiểm tra |
| T15 | Authoring/publish/mở rộng HSK0–HSK4 | Pilot T08–T14 được review | Mỗi cụm đủ content/review mới bật adaptive |
| T16 | Audit/sửa hoàn thiện từng module learner | T00; tái kiểm sau pilot | Hành trình/edge/error/offline/a11y từng module |
| T17 | Audit/sửa nền tảng/quản trị/sync/native | T00,T04; tái kiểm T15 | Auth/release/owner/cache/queues/D1/native |
| T18 | Đánh giá hiệu quả học và UX | T14 | Baseline/holdout/protocol, không claim từ synthetic |
| T19 | Nghiệm thu toàn hệ thống/rollback | Phạm vi đã làm; T18 cho claim hiệu quả | Full gate/D1 browser/device/performance |

Ưu tiên T00 → T01–T04 → T05–T14. A01/A02 làm ngay sau T00 nếu ưu tiên hồ sơ,
không chặn planner. T16/T17 sửa blocker phát hiện trong quá trình làm rồi
kiểm lại toàn ma trận sau pilot. T15 mở rộng theo cụm được duyệt; T18 đánh giá;
T19 nghiệm thu. Không chờ hết HSK4 mới test pilot. Không trì hoãn lỗi mất dữ
liệu/owner leak để chờ planner. Cụm thiếu học liệu dùng fallback truyền thống,
không gắn nhãn adaptive giả. Đây là phụ thuộc công việc, không cho phép tự
nhảy qua bước người dùng test giữa các module.

## 6. Toàn bộ module và cách chia slice

T00 rà route/registry thật để bổ sung mọi module chưa có trong bảng này.
T02 nối event theo từng slice; T16 audit/sửa và nghiệm thu từng module.

| Slice | Liên kết bắt buộc |
|---|---|
| lessons | Thiên Lộ objective/rich→attempts/evidence/mistakes/history/progress |
| review | Ký Ức Trận/FSRS→grade/pending/history/recall/completion |
| mistakes | Nghịch Cảnh mọi nguồn→correction/revisit/count/history |
| reader | Legacy/chapter→answers/support/bookmarks/saved/mistakes/resume |
| assessment | Khảo Nghiệm Căn Cơ/level check/mock online-offline→result/history/needs |
| dictionary | Tra/lưu từ→lesson challenge/needs; account cards theo policy thật |
| speech | Vạn Âm Điện/pronunciation/speaking→practice/history/transfer receipt |
| writing | Thần Văn Lô→stroke provenance/practice/IME/escape hatch |
| overview | Học/Hôm nay/Thiên Cơ Kính→analytics/journey/unknown/pending |
| profile | Hồ sơ/avatar/history/goals/reset/export→owner storage/sync/delete |

T17 có bốn slice: account-auth-RBAC; authoring-admin-release;
sync-recovery-offline; Android-PWA-runtime. Commerce chỉ kiểm isolation/
entitlement có sẵn, không mở payment hoặc thay cấu hình thật.

Mỗi edge ghi intent, producer, payload/version, store/authority, consumer,
trigger, retry/conflict/reset, issue, test bằng chứng và trạng thái. Liên kết
cố ý không có (TTS→phát âm mastered, saved word→account card trái policy) phải
có lý do và test chặn. Audit độ hoàn thiện gồm entry→action→feedback→result→
next module, empty/error/recovery/a11y/offline, không chỉ đọc API trả 200.

T15 lặp theo cụm: mapping→gap inventory→content→human review→release local→
adaptive test→user test. Giữ lesson truyền thống/IDs. Không tạo hàng loạt
nội dung chưa review rồi tuyên bố đủ HSK hoặc toàn bộ curriculum adaptive-ready.

## 7. Prompt chung — copy kèm một prompt task ở mục 8

```text
Làm việc tại D:\Projects\hanzi-os. Thực hiện task/slice tôi chỉ định theo
phiên bản 2 của docs/PERSONALIZATION_IMPLEMENTATION_PLAN.md. Làm việc cụ thể,
không chỉ đưa lời khuyên; chỉ task/slice này, không tự chạy cả kế hoạch.

Đọc AGENTS.md, checkpoint mới nhất, kế hoạch và tài liệu module. git status
--short trước sửa, bảo toàn dirty tree. Xác minh dependency trong code,
không coi kế hoạch/báo cáo cũ là việc đã nghiệm thu. Dependency thiếu thì
làm phần độc lập hữu ích và ghi blocker, không dựng stub rồi báo hoàn thành.

Giữ đủ yêu cầu avatar/history/recovery/cá nhân hóa nội dung phiên học/audit
mọi module web-app. Tập trung slice được chọn và cập nhật phần còn lại để
không bỏ sót. Không chỉ đổi thứ tự lesson rồi gọi adaptive. Tận dụng runtime,
scoring và authority cũ qua adapter/migration tương thích.

Giữ stable IDs, HSK0 4/4 rich0/4; HSK1–4 rich40/40/55/78=213/213,
completion/streak/FSRS/mistakes/reward dedup/owner/reset/resumes/outbox.
Không xóa .wrangler, không sửa/xóa/stage docs/reports/ hoặc output/.
Không sửa pinned scoring adapter/hash để né validator. Không push/deploy/
phát hành APK/mở payment/cài system package-plugin/dịch vụ trả phí, gửi
email hoặc thay tài khoản bên ngoài khi chưa có yêu cầu riêng.

Đọc skill đúng trigger. Audit producer→storage→sync→consumer và authority.
Test retry/offline/reload/owner-reset/migration đúng rủi ro; typecheck khi
sửa TypeScript và lint phù hợp. Ranh giới lớn chạy npm run check và browser
journey thật. Fixture không thay account-D1 thật hoặc Android thiết bị.
Không dùng hint/reveal/TTS/transcript/import/XP làm mastery. Nội dung AI
chưa được người review giữ humanReviewed:false.

Cập nhật checkpoint: module/task/trạng thái, người học thấy gì, đã kiểm,
dữ liệu giữ được, phần còn thiếu và bước test. Bật preview khi có UI, đưa
kịch bản test ngắn. Chỉ USER-ACCEPTED khi tôi xác nhận. Không tự đánh phần
trăm hoàn thiện hoặc tuyên bố tuyệt đối/vượt mọi nền tảng.
```

## 8. Prompt riêng từng task

### T00 — Inventory và pilot
```text
Thực hiện T00. Rà route/module thật và TOÀN BỘ producer→store→consumer trên
web/Capacitor, kế thừa SYSTEM_INTEGRATION_AUDIT, phân biệt local/test/released.
Map đủ yêu cầu cũ vào task. Chọn pilot bằng inventory học liệu thật; chốt
competency/unit/session contract, compatibility/rollback, fixture 4 nhu cầu
và unknown/offline/no-mic/5 phút. Lượt này chưa sửa runtime.
```

### A01 — Avatar guest
```text
Thực hiện A01. Chọn file→crop/preview→save/cancel/remove, Header/Profile dùng
chung, owner-scoped blob và fallback. Test decode lỗi/quota/reload/owner
switch giữa save, giữ ảnh cũ khi lỗi. Mobile/keyboard/reduced-motion; chưa
giả vờ có cloud sync.
```

### A02 — Avatar account và Android
```text
Thực hiện A02. Audit storage/native transport hiện có, làm auth/owner fence,
server validate/re-encode, revision conflict/cache/replace/delete, account
deletion. Test hai phiên không hồi sinh ảnh cũ. Android binary/picker/cancel
phải kiểm bridge thật; thiếu storage/device báo rõ, không tự mở cloud mới.
```

### T01 — Event bền vững
```text
Thực hiện T01. Versioned event contract và một luồng lesson→history guest/
account. Transaction nghiệp vụ hoặc projection rebuildable. Test retry,
crash, provisional→confirmed, offline và owner/reset: một hoạt động không
đếm đôi/mất sau commit. Analytics không cấp mastery hoặc completion.
```

### T02 — Mọi nguồn lịch sử
```text
Thực hiện T02 cho slice chưa xong đầu tiên trong mục 6 theo checkpoint,
ghi rõ slice. Nối tất cả producer tới event/history/learner-model adapter.
Backfill record thật có lineage/cursor/idempotency, test version/pending/
receipt/owner. Cập nhật coverage tất cả slice còn lại; không báo toàn T02
xong khi mới nối lessons/mistakes.
```

### T03 — Nhật ký người học
```text
Thực hiện T03. Nhật ký tu luyện · Lịch sử học tập trong Hồ sơ: timeline ngày,
filter module/skill, detail/source/resume, visit khác practice, pending/
confirmed/unknown, duration ước lượng. Pagination lịch sử dài không mất/
trùng; empty/error/offline/a11y. Không thay dữ liệu thật bằng demo.
```

### T04 — Recovery
```text
Thực hiện T04. Audit toàn bộ storage và export hiện tại; làm recovery có
scope manifest/schema/integrity/staging/rollback hoặc resumable transaction.
Bao gồm events/workspace/resumes/normalized-page-mock-XP journals và profile/
avatar có sẵn. Không secrets hoặc replay sang owner/reset/install khác;
import không nâng authority. Test round-trip/reload/lỗi giữ bản gốc/reset/
delete đúng owner. Còn thiếu kho bắt buộc thì không gọi full-device backup.
```

### T05 — Mục tiêu và bối cảnh
```text
Thực hiện T05. Mục tiêu, thời gian phiên, chủ đề, mic/audio tự nguyện và sửa
nhanh; opt-out/reset sở thích riêng progress. Cold start ngắn, tự khai khác
suy luận. Không learning style cố định, không suy từ avatar/danh tính.
Guest/account cùng UI, preference sync đúng owner.
```

### T06 — Graph năng lực
```text
Thực hiện T06. Graph pilot T00 chọn: mục tiêu quan sát được, skill/modality,
prerequisite/evidence requirements, mapping lesson/item/version thật. Test
DAG/stable alias; completion cũ riêng mastery/eligibility skip. Không tự
invent ngưỡng học thuật hoặc xác nhận human review thay người duyệt.
```

### T07 — Đơn vị học
```text
Thực hiện T07. Learning-unit schema/extractor/adapter pilot giữ immutable
source/version/context/prerequisite/skill/support/modality/time/entitlement/
provenance. Tái dùng renderer/scoring. Test không rời câu khỏi audio/văn bản,
không lộ keys/Premium, lesson cũ vẫn mở và giữ progress/IDs. Không cắt chuỗi
tùy ý rồi gọi unit tái sử dụng.
```

### T08 — Nhánh nội dung
```text
Thực hiện T08. Đọc CONTENT_DELIVERY_PLAYBOOK. Gap matrix rồi bổ sung pilot:
explanation/scaffold/recall/contrastive errors/transfer/delayed probes, cùng
mục tiêu nhưng khác item/ngữ cảnh có chủ đích. Nội dung nguyên bản, media
có provenance, validate và preview để người duyệt thật. AI-assisted giữ
humanReviewed:false; không auto publish. Thiếu content thì fallback rõ.
```

### T09 — Learner model
```text
Thực hiện T09. Reducer competency×skill×modality với unknown/bất định và
nguồn evidence/time. Giữ first error/assistance/prior exposure, distinct
item/delayed recall. Test replay/late-duplicate events/version/legacy import.
Không suy speaking score từ transcript hoặc invent calibrated probability.
```

### T10 — Session composer shadow
```text
Thực hiện T10. Hard filters trước ranking, ghép phiên có mạch check→teach
khi cần→practice→transfer/probe; không ép mỗi phiên đủ mọi bước. Manifest
version/replay/reason/safe branch, FSRS hiện có, giới hạn lặp/nợ ôn/time.
Bốn nhu cầu pilot phải khác unit/task/support thật; thêm unknown/offline/
no-mic/5 phút/no-candidate. So baseline, chưa đổi lộ trình mặc định.
```

### T11 — Session runner
```text
Thực hiện T11. Nối manifest vào runner/renderer/scoring guest-account hiện
có. Server validate eligibility/item/version, không tin client để mở khóa.
Persist trước next, adapt tại safe boundary, resume giữ manifest, revoked
content fallback, offline queue. Test crash/reload/multi-tab/owner-reset;
vài unit không tự completed nguyên lesson nguồn.
```

### T12 — Liên kết adaptive toàn hệ thống
```text
Thực hiện T12. Rà mọi output adaptive và consumer: mistakes/FSRS/Reader/
dictionary/Nói/Viết/assessment-exams/history/analytics/journey/rewards/
progress. Source refs/receipts/idempotency, không đôi thưởng/mastery giả.
Test đi→luyện→quay lại→khép phiên qua UI, pending không completed. Ghi cả
liên kết cố ý không có và test chặn; không chỉ kiểm hai module ví dụ.
```

### T13 — Thiên Lộ theo năng lực
```text
Thực hiện T13. UI bản đồ năng lực và hành trình từ composer: mục tiêu/một
CTA/lý do/đổi nhiệm vụ-thời gian/resume. Giữ đường bài truyền thống/progress,
không thêm vùng thứ sáu. Nhãn exposure/practice/evidence đủ/unknown dễ hiểu.
Feature flag/fallback cho cụm thiếu content. Browser 4 hồ sơ khác thực chất,
không chỉ tên/thứ tự; mobile CTA trong viewport và keyboard/a11y.
```

### T14 — Nhịp dài hạn và skip hợp lệ
```text
Thực hiện T14. Diagnostic ngắn khi có nhu cầu giảm bất định, challenge phần
đã biết, delayed recall item mới, re-entry sau nghỉ, giới hạn tải ôn. Không
ép kiểm đầu vào liên tục/phạt nghỉ. Skip giới thiệu khác completion/mastery;
prerequisite mở bằng evidence hợp lệ. Test nhiều ngày/sync muộn/5 phút.
```

### T15 — Authoring và mở rộng
```text
Thực hiện T15 cho một cụm competency kế tiếp sau pilot đã review. Workflow
mapping/variants→gap checks→human review→versioned release→preview→rollback
trong Biên Tập Viện hiện có. Validators context/keys/provenance/DAG/adaptive
coverage. Tái kiểm consumer lesson/Reader/dictionary/exam. Không sinh hàng
loạt để báo đủ HSK; giữ inventory và ghi cụm adaptive-ready thật.
```

### T16 — Hoàn thiện mỗi module learner
```text
Thực hiện T16 cho module tôi chỉ định hoặc module chưa review đầu tiên trong
ma trận mục 6/checkpoint, nêu rõ module. Audit entry→action→result→consumer→
reload và empty/error/offline/resume/a11y; đối chiếu chức năng hứa với runtime.
Sửa trọn slice lỗi/thiếu chức năng có tác động thật, test và preview. Ghi issue
còn lại theo module; không báo audit toàn hệ thống từ hai module mẫu.
```

### T17 — Nền tảng/quản trị/native
```text
Thực hiện T17 cho slice nền tảng chưa xong đầu tiên trong mục 6/checkpoint,
hoặc slice tôi chỉ định. D1/test account cô lập, không xóa .wrangler/dùng dữ
liệu thật làm fixture. Audit và sửa auth-RBAC-owner hoặc authoring-release
hoặc sync-recovery hoặc Android-PWA đúng slice; kiểm legacy client/queues/
cache/entitlement khi liên quan. Không mở payment/đổi role-provider thật/gửi
thư/public release. Báo riêng phần chưa nghiệm thu thật.
```

### T18 — Đo hiệu quả học
```text
Thực hiện T18. Harness replay và protocol định trước: recall 7/30 ngày trên
item mới/transfer, so planner cũ và FSRS+bài tuần tự, active time/bỏ dở/tải
ôn/hiểu lý do. Temporal-item holdout tránh leakage, cohort/attrition/minimum
effect/sample size/power/guardrails. Synthetic chỉ chứng minh kỹ thuật;
không tự tuyển người/gửi tin/bật live experiment. Thiếu mẫu báo thiếu bằng
chứng, không claim vượt đối thủ; model phức tạp phải có lợi ích kiểm chứng.
```

### T19 — Nghiệm thu tổng
```text
Thực hiện T19 cho phạm vi đã triển khai. Đối chiếu đủ yêu cầu/issue ledger,
full gate, account-D1 browser thật cô lập, guest-account switch/hai phiên/
offline-sync/backup-reset-restore. Android device: picker/mic/IME/background/
reopen/quota/cài nâng cấp giữ dữ liệu khi có điều kiện được phép. Đo performance
trên máy tham chiếu, feature rollback giữ journal. Thiếu device BLOCKED phần
đó; không giả pass. Không tự deploy/release, phân biệt source/preview/APK.
```

## 9. Tiêu chuẩn kết thúc

- Mọi requirement có implementation/test hoặc blocker, mỗi module có user test.
- Pilot thay đổi unit/task/support thật, đi hết vòng học, lưu lịch sử/needs đúng.
- Mọi recommendation có nguồn/lý do/content hợp lệ; regression không leak
  owner/đôi receipt-thưởng/mất phiên. Test xanh không chứng minh tuyệt đối.
- T18 chốt outcome chính/ngưỡng trước thí nghiệm, báo confidence/giới hạn.
  XP/DAU/streak/thời gian ở app không thay kết quả học.
- Target đề xuất cần chốt máy tham chiếu ở T00: timeline trang đầu p95 <1 giây
  với 100.000 event, composer cached p95 <200 ms; đo memory/startup Android.
  Đây là mục tiêu, chưa phải số đo đạt.
- Thiếu reviewer/device/cohort giữ chưa nghiệm thu, không tự humanReviewed.

## 10. Prompt khởi động lượt sau — copy nguyên khối

```text
Đọc và áp dụng prompt chung mục 7 trong
D:\Projects\hanzi-os\docs\PERSONALIZATION_IMPLEMENTATION_PLAN.md phiên bản 2.
Thực hiện T00 theo prompt riêng mục 8. Bao phủ đủ yêu cầu cũ: avatar, lịch sử
học, bảo toàn dữ liệu, audit/sửa liên kết mọi module web-app, và Thiên Lộ
thích ứng theo năng lực với nội dung phiên học khác nhau thực sự.
Lượt này chốt inventory/contract/pilot/fixture, chưa sửa runtime. Cập nhật
checkpoint để lượt sau triển khai tiếp không phải audit từ đầu.
```

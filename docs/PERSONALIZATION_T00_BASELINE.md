# T00 — Inventory, contract và pilot cá nhân hóa

Ngày 18/10/2026 · kế hoạch phiên bản 2 · **IN-REVIEW**.
Đây là baseline thiết kế để triển khai từng task, chưa có runtime adaptive,
avatar mới hoặc nhật ký mới. Chỉ người dùng mới xác nhận USER-ACCEPTED.

## 1. Phạm vi và cách tiếp tục

Đã đọc mục 7 và prompt T00 mục 8 của
[kế hoạch v2](PERSONALIZATION_IMPLEMENTATION_PLAN.md), checkpoint mới nhất,
AGENTS, kiến trúc, testing và
[audit liên kết ngày 17/10](SYSTEM_INTEGRATION_AUDIT.md).
Baseline kế thừa các sửa local trong audit; không suy ra đã có trên hosted/APK.

Ba artifact của cùng baseline `personalization-t00-2026-10-18`:

| Artifact | Nội dung và cách dùng |
| --- | --- |
| [Inventory](PERSONALIZATION_T00_INVENTORY.json) | Route, method, module, hash nguồn working tree, lesson/word/task/grammar IDs, 35 edge, issue và test có sẵn |
| [Fixture](PERSONALIZATION_T00_FIXTURES.json) | Graph đề xuất, 12 unit reference/gap, 4 nhu cầu, 7 bối cảnh, 8 kịch bản vòng đời |
| Tài liệu này | Contract, authority, migration/rollback, content gaps và handoff |

Lượt sau chạy `node scripts/validate-personalization-t00.mjs` trước sửa. Nếu hash
hoặc route lệch, chỉ audit delta và consumer của edge liên quan, cập nhật binding;
không coi HEAD là source đã audit. HEAD lúc T00:
`08e89c7699b2c1bc366df01a42e3b9c96cb97bc7`, working tree có nhiều thay đổi
của người dùng. Không stage/commit, không sửa runtime/content/migration,
`.wrangler/`, `docs/reports/`, `output/` hoặc kho browser trong T00.

Validator chỉ đọc source/JSON, không mở D1 hoặc learner storage. Fixture là dữ liệu
thiết kế độc lập; không được import vào learner bundle hay làm dữ liệu người học.

## 2. Inventory module và route

Đã enumerate từ `src/App.tsx`: 31 khai báo route, gồm wildcard; bootstrap
`/onboarding` và `?setup=1` nằm ở `app/client-runtime.tsx`. `app/` có 136 entry:
24 page và 112 handler, mọi handler đã ghi HTTP method. Catch-all server
`/[[...route]]` được giữ nguyên ký hiệu source, không coi là URL người dùng.
Danh sách từng file nằm trong inventory; bảng này nhóm các hành trình.

| Module/slice | Entry thực tế | Source → store → consumer chính | Edge / task |
| --- | --- | --- | --- |
| Onboarding/shell | `/`, `/onboarding`, `/welcome`, setup | FirstRun/placement → profile/baseline/enrollment → path, bootstrap | E01; T05,T14,T16 |
| Thiên Lộ objective | `/path`, `/lesson/:lessonId` | Guest local runtime hoặc normalized lesson commands → attempts/session/evidence → projection/FSRS/rewards | E02; T01,T02,T11,T12,T16 |
| Trang học rich | cùng route bài, reader trang có resume | ResumableLessonReader → firstAttempt/document/binding, page-attempts → lỗi/coverage/analytics | E03; T02,T07,T12,T16 |
| Ký Ức Trận | `/review` | Offer/card revision → grade journal → FSRS/queue/journey | E04; T02,T12,T14,T16 |
| Nghịch Cảnh Lục | `/mistakes` | Objective/page/reader/assessment errors → scoped correction journal → counts/source revisit | E05–E06; T02,T12,T16 |
| Vạn Quyển Các | `/reader`, `/reader/challenge`, series/chapter routes | Legacy session hoặc chapter progress/observations → Reader stores/workspace → saved/mistakes/transfer | E07–E09; T02,T12,T16 |
| Tàng Tự Khố | `/dictionary` | Lookup/save/core ID → saved-word clocks → Dictionary/Reader/profile/manual study | E10; T02,T12,T16 |
| Kho mở rộng | `/path/expansion`, `/path/expansion/:missionId` | Mission → React index/revealed → tự ôn/quay lại; chưa lưu event/resume/save của mission | E11; G11; T02,T12,T16 |
| Vạn Âm Điện | `/pronunciation` | Mic/acoustic/manual/TTS → practice/reward/receipt → overview/journey | E12; T02,T12,T16 |
| Thần Văn Lô | `/characters`, `/characters/session` | Stroke provenance/assistance/IME/paper → scoped session/practice → progress/transfer | E13; T02,T12,T16 |
| Khảo Nghiệm Căn Cơ/level check | `/assessment`, hsk1–4, placement/hsk1–4 | Local baseline hoặc server session/form → diagnostic/results → path/mistakes | E14–E15; T02,T14,T16 |
| Phòng Luyện Đề | `/exams`, `/exams/history`, `/exams/:level/:form` | Online immutable form hoặc offline run → terminal server result/workspace → history/mistakes | E16–E17; T02,T12,T16 |
| Học/Hôm nay/Thiên Cơ Kính | `/`, `/analytics`, path summary | Access/practice/projection/mistakes → read models → summary/journey | E18–E21; T02,T09,T13,T16 |
| Hồ sơ/thiết lập | `/profile` | Profile goal/minutes, device sound/motion → clocks/local prefs → header/learning UI | E22; T05,T16 |
| Avatar | header và Hồ sơ | Hiện initials; blob/media/metadata lifecycle chưa có | E23–E24; A01,A02 |
| Recovery/reset/sync | Hồ sơ, `/api/sync`, `/api/learning/workspace` | Document, commands, workspace, mock, XP → IDB/D1/export → các module | E25–E29; T04,T17 |
| Auth/security/RBAC | signin, auth/*, account/security, account APIs, admin access | Server identity → owner/generation/role/deletion → learner/admin adapters | E30; T17 account-auth-RBAC |
| Offline/PWA/Android | ClientApp, SW, nativeRuntime, Capacitor | Manifest/entitlement/cache + pinned native transport → cùng learner runtime | E31–E32; T17 Android-PWA-runtime |
| Biên Tập Viện/Admin/media | studio/*, admin/*, API studio/admin/content | Revision/review/release/media → outbox/package/head → lesson/Reader/dictionary/assessment | E33; T15,T17 authoring-admin-release |
| Premium/commerce boundary | `/profile/premium`, commerce/wallet/support, admin premium | Existing entitlement/ledger/access rule → server guard → lesson/exam access/history | E34; T17; không mở payment |
| Adaptive mới | chưa có route/authority mới | Events → model → composer → manifest/runner → tất cả consumer trên | E35; T01–T14 |
| Vận hành/pháp lý | health/live, health/ready, dev/runtime-error, privacy/terms/voice-data/delete-account | Health/legal/error reporting → operator/privacy UI; không là learning evidence | Inventory operations-legal; T17,T19 |

Expansion, bootstrap, system preferences, health/legal và commerce isolation
được bổ sung vào coverage của kế hoạch. Không thêm vùng learner thứ sáu.
Mỗi edge JSON ghi intent, file producer, payload/version, store/authority,
consumer, trigger, retry/conflict/reset, issue, task và test hiện hữu.
`rerunInT00:false` phân biệt test đã tìm thấy với test đã chạy lượt này.
Các link source được lần theo bằng đọc code; hành trình browser/D1/device vẫn
cần kiểm trong task tương ứng, không suy ra pass từ route hoặc HTTP 200.

## 3. Storage, authority và recovery bắt buộc

| Kho hiện tại | Scope/contract | Producer và consumer; giới hạn backup |
| --- | --- | --- |
| localStorage learning-state-v1 | LearningState schema2, owner key riêng; recovery/corrupt/ownership-quarantine | LearningStore/persistence/coordinator; giữ raw hỏng, không overwrite rỗng |
| IDB `hanzi-os-sync-v1`, version3 | `meta`, `documents`, `local-states`, `outbox` | Document/clock/reset/installation/device/sequence; full-device recovery phải giữ pending payload, không chỉ số lượng |
| IDB command/projection/resume | `learning-command-outbox`, `learning-projections`, `lesson-resumes`, `assessment-resumes`; owner/generation/epoch | Normalized lesson/review/reader/assessment commands, source aliases, frozen forms, ack/quarantine |
| `lesson-resumes` namespaces | `lesson-reading:v1:`, `page-bindings:v1:`, `page-correction:v1:`, `workspace-sync:v1`, `offline-mock-practice:v1`, `offline-interaction-xp:v1`, `offline-read:v1:` | Trang học, reader/workspace, pending XP/mock và caches cùng store nhưng khác recovery/authority |
| Reader localStorage | `hanzi-os-reader-progress-v2:<owner>:<generation>:<epoch>`; v1 legacy còn adapter | Chapter/version/answers/support/bookmarks/saved/position; sync workspace; không tự migrate thiếu owner |
| Placement/level-check/forge | Key families tại `src/lib/storageKeys.ts`, có owned placement/forge keys | Resume chẩn đoán/viết; legacy global lesson/assessment resume không đủ owner để tự nhận |
| Journey localStorage | `hanzi-os-integrated-journey-v1:<scope>`, checkpoint1 | Receipt/anchor/4 giai đoạn; orchestration không cấp mastery. G09 ghi guest scope epoch cần regression |
| Device UI prefs | `hanzi-os-system-ui-v1`, sidebar prefs | Sound/motion/UI là bối cảnh thiết bị; không suy năng lực, không tự đổi thành account preference |
| Consent/auxiliary offline | `hanzi-os-acoustic-voice-consent-v1` có owner/expiry; legacy `hanzi-os-voice-consent-v1`; IDB `offline-account:v1`, `offline-entitlement:v1`, `offline-preparation:v1` | Consent giữ policy và privacy; offline session là quyền hiển thị thiết bị có hạn, không credential. Restore không tự tái consent/cấp account authority; revalidate owner/expiry/generation |
| D1 learning | sessions/attempts/evidence, FSRS/log, XP ledger, document/sync/import, page attempts/access/workspace | Account authority theo repository; header owner chỉ là fence, không chọn identity |
| D1 editorial/auth/commerce | RBAC, revisions/releases/media, identity/security/deletion, existing ledger/access | Không đưa secret/lease/token/password vào backup hoặc analytics; key kín/Premium giữ server |
| CacheStorage/native media | SW graph, prepared content, private cached media; owner/entitlement/hash | Rebuildable content khác learner journal; quota/expiry không được xóa progress để chữa cache |
| Native Keystore/private files | Cookie mã hóa, app-private media; Chrome/TWA tách WebView | Không export credential; không nhập cookie sang browser; native upgrade giữ package/signature |
| Avatar/event/manifest mới | Chưa có kho implementation | A01/A02/T01/T04/T11 thêm versioned store có migration, không nhét base64 vào JSON learning/outbox |

`db/schema.ts` có 57 khai báo sqliteTable; inventory ghi 42 SQL migration.
Đây không phải số bảng D1 đang chạy: SQL có bảng/biến đổi không thể đếm chỉ từ
schema TypeScript. T00 không đọc DB thật hay chạy migration.

Export local `client-recovery` schema2 hiện chỉ có state và pending counts.
Cloud export schema13 có `learner_workspace_entries`, JSON decoding và redaction
các cột secret đã nêu trong `syncRepository.ts`; vẫn không phải bản phục hồi
mọi kho thiết bị. T04 phải kiểm round-trip thật, không chỉ so số dòng cloud.

Recovery mới chốt envelope: `schemaVersion`, `exportId`, `exportedAt`,
`sourceScope(ownerKey,resetEpoch,installationId,deviceId)`, `contentBindings`,
`stores[{name,schemaVersion,required,count,byteLength,sha256,encoding}]`,
`blobs[{mediaId,revision,mime,byteLength,sha256}]`, `exclusions`, `integrity`.
Staging xác minh hết store bắt buộc rồi commit/rollback hoặc resumable transaction.
Không giả atomic transaction chung localStorage/IDB/files; có durable restore
marker và bản gốc trước commit. Unknown schema/quota/corrupt giữ bản gốc.
Khác owner/reset/install chỉ nhận dữ liệu mô tả đã xác minh scope hoặc quarantine;
không replay lệnh/receipt. Restore IDB owner generation phải được claim lại qua
coordinator, không ghi đè generation hiện tại bằng generation trong backup.

Learning reset, reset sở thích, remove avatar và delete account là bốn phạm vi
riêng. Learning reset không xóa avatar/backup/owner khác/cache học liệu chung.
Delete account phải dọn events/media của đúng owner, không hồi sinh sau retry.

## 4. Contract chốt cho triển khai

Contract dưới đây là v1 thiết kế. T01/T06/T07/T10 bổ sung parser/storage/migration
theo dependency, không tạo planner hoặc scoring authority cạnh tranh.

### 4.1 Event/history

| Nhóm | Field bắt buộc và invariant |
| --- | --- |
| Identity | `schemaVersion:1`, `eventId`, `logicalActivityId`, `operationId`, `eventKind`; retry cùng hoạt động giữ identity |
| Scope | `ownerKey`, `resetEpoch`, `installationId`, `deviceId`; ownerGeneration là fence của lần đọc/ghi hiện tại, không identity bền xuyên thiết bị |
| Source | `module`, `sourceType`, `sourceId`, `contentVersion`, `activityVersion`, `itemId` nullable có lý do; `revisionId/formHash/contextRef` nếu nguồn có |
| Linkage | `sessionId`, `attemptId`, `parentEventId`, `sourceLessonIds`; không invent ref khi backfill thiếu |
| Observation | `skill`, `modality`, `taskType`, `outcome`, `score` nullable, `firstResponseRef`, `assistance{hint,reveal,translation,pinyin,ime,tts,priorExposure}`; unknown không tự bằng false |
| Time | `occurredAt`, `receivedAt` nullable khi chưa ack, `timezone`, `clockSource`; duration `{activeMs,estimated,idleExcluded,basis}` nullable nếu chưa đo |
| Provenance | `producerVersion`, `sourceRecordRef`, `lineage`, `humanReviewed`, `measurementPolicyId`, `authority` (local-practice/server-verified/imported/unknown) |
| Delivery | `confirmationState` provisional/confirmed/rejected/quarantined, `receiptRef`; receipt tăng trạng thái cùng logicalActivityId, không tạo hoạt động thứ hai |
| Event kinds | observation, evidence-reference, reward-reference, recommendation-decision; visit riêng practice; journal không cấp thưởng/mở bài |

Guest ghi bền observation cùng transaction state/journal khi có thể. Nếu action
hiện ghi localStorage và IDB riêng, T01 phải có intent/commit marker và replay
rebuildable để chứng minh không mất event sau business commit. Account ghi event
trong transaction nghiệp vụ hoặc projection xây lại từ receipt/outbox thật;
không dựa vào request analytics thứ hai. Same-key khác payload giữ conflict/raw.

T02 backfill từ record thật theo `(source,owner,epoch,sourcePrimaryKey,version)`
và cursor bền. Record tổng hợp cũ thiếu item/outcome/time giữ unknown, không suy
từng attempt từ completion, XP hay activity label. Không phục hồi giả lịch sử đã
bị bản cũ cắt. Mỗi source có coverage state: available/partial/not-recorded/unknown.

Timeline T03 dùng index `(owner,epoch,occurredAt,eventId)` và cursor kép có tie
break; late arrival/ack cập nhật cùng logical activity. Trang đầu không quét hết
lịch sử. Raw observation khác projection hiện tại; không cắt journal theo UI limit.
Giữ ngày streak UTC+7 hiện có; clock skew và thời điểm server/client đều hiển thị
được khi cần, không tự đổi lịch sử ngày. Không upload raw voice/handwriting chỉ
để làm analytics. Detail/source/resume/filter phải giữ đúng source version.

### 4.2 Competency

`competencyId`, `version`, `objectiveVi`, `skill/modality`, `prerequisites[]`,
`evidenceRequirements`, `sourceMappings[]`, `aliases[]`, `reviewBinding`.
IDs graph mới nằm namespace riêng, không thay lesson/word/character IDs cũ.
Mapping giữ source content/revision/item/version và loại quan hệ
teaches/practices/measures; không coi mapping teaches là evidence.

Graph pilot đề xuất trong fixture: `c.number.quantity` →
`c.price.comprehend`, `c.price.produce`, `c.shop.transfer`. Đây là DAG mục tiêu,
không thay chain prerequisite bài cũ. Các mô tả skill trong fixture là mục tiêu
chính; model vẫn phải lưu độc lập competency × skill × modality. Text input của
unit giá tiền không đo nghe; production gõ không đo nói. Chưa có review học thuật:
minDistinctItems/delay/threshold còn null, policy không được cấp mastery/unlock.

Completion, exposure, practice, independent evidence, sufficient evidence,
intro-skip eligibility và prerequisite eligibility là các trạng thái riêng.
Đủ evidence trong fixture F04 là tiền điều kiện synthetic để kiểm kỹ thuật;
không phải kết luận có người học thật đủ năng lực hay đã có policy được duyệt.

### 4.3 Learning unit

`unitId/version`, `sourceRef{kind,id,contentVersion,revisionId,payloadHash}`, immutable
`contextRefs[]`, `itemRefs[]`, `competencyRefs[]`, `prerequisites`, `skill`,
`modality`, `taskType`, `supportPolicy`, `difficultyAssumption`,
`estimatedSeconds/timeBasis`, `entitlement`, `mediaRefs/hash/transcript`,
`offlineRequirements`, `provenance/license`, `humanReviewed`, `scoringAdapterRef`.

ID/source/hash của unit chốt khi extractor tạo artifact; ID `u.*` trong fixture
là design reference, chưa phải unit được publish. Context gồm đầy đủ lượt thoại,
tình huống/giá/lượng từ, audio hay đoạn đọc cần thiết. Không tách một choice/cloze
khỏi ngữ cảnh đáp án. Rubric/production giữ self-review, không ép thành objective.
Scoring keys ở server authority hiện có; fixture không sao answer keys; không
bundle draft/review/Premium vào client qua extractor.

Foundation scoring binding giữ nguyên. Adapter hiện có
`editorialExerciseGeneration`, `editorialItemBank`, `editorialAttemptScoring`
giữ derivative `lexical-editorial-2026.10.5`, suffix `~lexical-2026.10.5` và
đáp án/form foundation cũ. Unit mapping phải version hóa cả hai, không sửa hash
pinned để validator qua. Release head server là nguồn của revision phát hành;
Git draft không tự thay thế published revision.

### 4.4 Session/composer/runner

`manifestId/schemaVersion:1`, `ownerKey/resetEpoch`, `planRevision`,
`plannerVersion`, `competencyGraphVersion`, `contentBindings`,
`preferenceRevision`, `modelSnapshotRef`, `capabilities`, `entitlementSnapshot`,
`budgetSeconds`, `steps[]`, `safeBranches[]`, `fallback`, `createdAt`,
`decisionReasons`, `sourceReceiptMappings`, `status`.
Mỗi step có stable `stepId`, exact unit/version/hash/context, actual task/modality,
support, estimated time, prerequisites, expected receipt type và exit route.

Hard filter: source release/review policy → entitlement → prerequisite →
media/offline/capability → thời gian. Ranking xác định theo nhu cầu/evidence
uncertainty/preferences/FSRS offers, có plannerVersion/replay. Không hardcode
pilot cho toàn curriculum. Ngân sách chuyển bước/hỗ trợ nằm trong tổng thời gian.
Không bắt phiên nào cũng đủ check→teach→practice→transfer, không bắt chữa hết
lỗi hoặc placement mỗi lần; có giới hạn probe/ôn, chọn thủ công và opt-out.

Runner persist step answer/result trước next/adapt. Chỉ đổi nhánh tại safe
boundary đã commit; resume giữ frozen manifest và source version. Multi-tab dùng
revision conflict; owner/reset đổi hủy callback. Source revoked/missing thì giữ
result, đưa fallback rõ, không thay câu đang trả lời. Account server xác minh
eligibility/source/item/scoring, không tin manifest client để mở bài/Premium.
Học vài unit không nộp hoàn tất lesson nguồn; reward dedup dùng ledger/ref cũ.
Manifest điều phối qua adapters hiện có, không viết cạnh tranh vào FSRS/mastery.

### 4.5 Avatar và preference

Avatar metadata1: `mediaId`, `ownerKey`, `revision`, `mime`, `width/height`,
`byteLength`, `contentHash`, `updatedAt`, `deletedAt`; blob tách JSON state.
A01 chọn→crop/preview→save/cancel/remove, Header/Profile cùng metadata; lỗi giữ
ảnh cũ, owner switch khi save phải bị fence. Initials và `Hành giả vô danh` là
fallback canonical. Learning reset giữ avatar.

A02 cần media adapter account thật, server MIME/signature/decode/re-encode bỏ
EXIF, ownership/revision conflict/cache/delete, hai phiên không hồi sinh ảnh cũ.
Đề xuất giới hạn theo kế hoạch: JPEG/PNG/WebP ≤5 MiB/16 MP, output256×256 ≤200 KiB;
SVG/animation ngoài v1. Authoring media API không tự là avatar storage.
Native fetch đã truyền byte qua base64 transport; điều đó không chứng minh
picker/crop/cancel/upload/account deletion. Chưa có avatar picker/media API.

Preference mới tách `dailyMinutes`10/20/30 cũ và `sessionBudgetSeconds`300/600/1200,
goal/topic tự khai, inferred state riêng, mic/audio/offline capability tự nguyện,
`allowInference`, revision/scope. Reset preference không reset học; không suy
năng lực từ avatar/name. T05 mới triển khai; 5 phút chưa có trong runtime hiện tại.

## 5. Pilot được chọn bằng học liệu thật

Chọn HSK1 **số lượng, giá tiền và mua sắm**, vì có lời giải thích, hội thoại,
choice/cloze/production và vocabulary IDs thật trong cùng cụm, ít rủi ro
entitlement. Không chọn chỉ vì ví dụ mua sắm trong kế hoạch.

| Nguồn giữ nguyên ID | Học liệu xác minh | Tình trạng |
| --- | --- | --- |
| `hsk1-time-place-events-01-numbers` | 15 word IDs, 4 lượt thoại, grammar011, 1 guided task | Core beta; prerequisite cũ `survival-9` |
| `daily-1` | 12 word IDs, 4 lượt thoại, grammar012/013/063, topic017, task09 hỏi giá/số lượng | Core beta; prerequisite cũ weather-and-residence |
| `daily-3` | 12 word IDs, 4 lượt thoại, 1 situational pattern, 4 topics, task03 mô tả vật | Core beta; prerequisite cũ `daily-2`; task03 không được gắn nhãn đo nghe giá |
| `hsk1-level-rich-lessons.json` | 3 lesson/12 dialogue turns/5 grammar entries/3 tasks nói trên | foundation2026.08.7; personal-local-study; humanReviewed/measurement/mastery/production=false |
| `thien-lo-everyday-batch-v2.json` | Mỗi bài 11 trang/3 activities: choice, cloze, rubric; tổng33 trang/9 activities, 0 attached audio | `draft-not-published`, humanReviewed=false; exact page/block IDs trong inventory |
| Target/review plan everyday | Vocabulary/grammar/task source refs và parent revision/hash đã có | File review là AI self-review; không thay người duyệt hoặc head D1 |

`daily-1:v2:block:choice` hỏi giá hai quả táo trong hội thoại;
`daily-1:v2:block:guided` điền lượng từ;
`daily-1:v2:block:produce` dùng tình huống quầy mới. `daily-3` có choice tiền
thừa và cloze 买/卖. Đây là vật liệu có thể tái dùng sau resolve source/context,
không phải ngân hàng recall trễ hoặc audio measurement đã hoàn thiện.

Foundation item catalog có `audioAssets:[]`, manifest includesAudio=false;
3 draft pilot không gắn media. Không suy ra cả D1/public không có âm thanh:
chưa inventory published media trên D1 thật. T07 phải resolve head và exact
asset/license trước extraction. TTS chỉ hỗ trợ practice, không lấp audio evidence.

| Nhu cầu | Nội dung phiên dự kiến | Gap/gate hiện tại |
| --- | --- | --- |
| F01 biết nghĩa nhưng nghe giá sai | Nghe đối chiếu → nghe ngữ cảnh mới, giảm transcript | Thiếu contrastive audio/new-context stimuli đã review; baseline content-blocked, text fallback vẫn chưa đo nghe |
| F02 hiểu input, chưa tự đặt câu | Cloze có hỗ trợ → production tình huống giá mới | Có draft source; practice-only, chưa có chấm production đáng tin để cấp mastery |
| F03 đúng trong buổi, recall trễ yếu | Item mới độc lập trước explanation; due cards theo FSRS | Thiếu held-out delayed items; không dùng lại cùng item để tăng coverage |
| F04 đủ evidence cơ bản | Challenge item mới → transfer mua sắm, skip intro có điều kiện | Thiếu reviewed evidence policy/challenge; synthetic premise không mở prerequisite thật |

Bảy context gồm unknown, offline đã chuẩn bị, no-mic, 5 phút, offline chưa
có nội dung, no-audio, opt-out. TargetPlan là kỳ vọng sau dependency; baselineExpected
là điều hợp lệ với inventory hôm nay. Không dựng unit giả để báo F01/F03/F04 đã chạy.
T10 cần chứng minh cặp fixture khác unit/task/support/modality, không chỉ thứ tự.

Chọn pilot không tuyên bố adaptive-ready. T08 cần gap matrix, content gốc,
audio license/transcript/hash, contrastive error rationale, item family/exposure,
human review và local preview trước bật từng nhánh. Delayed day7 trong fixture
là thời gian synthetic, không phải ngưỡng mastery đã duyệt.

## 6. Compatibility, rollback và liên kết cố ý không có

| Ranh giới | Cách giữ tương thích và rollback |
| --- | --- |
| Lesson/content IDs | Không rename lesson/vocab/character; giữ foundation và lexical aliases/forms; mapping mới append/version riêng |
| Legacy progress | Giữ completion/streak/saved/FSRS/mistakes/reward dedup; import/backfill không nâng thành verified evidence |
| Existing runner | Unit adapter gọi renderer/scoring hiện có; không dựng parallel progress authority hoặc tự submit nguyên lesson |
| Event migration | Additive store/schema, cursor lineage, transaction/rebuild from business receipts; unknown schema giữ raw + quarantine |
| Adaptive flag | T10 shadow mặc định, T13 chỉ bật cụm đủ content theo owner; tắt flag trở lại journey/bài cũ, giữ event/manifest/result |
| Session rollback | Không xóa session dở; resume frozen version qua adapter cũ hoặc safe fallback có reason; revocation không mất answers |
| Sync client cũ | Giữ workspace1 và capability extension header2; không gửi prefix mới tới APK không hiểu; không xóa row mới trong DB |
| APK rollback | Source local mới khác installed/released; không gỡ app hoặc xóa Chrome/WebView; upgrade giữ package/signature; recovery trước thay schema |
| Owner/reset | Command identity không được rebind; late ack không ghi vào owner mới; generation hiện tại đọc từ IDB, reset không chỉ dựa React state |

Các edge bị chặn có chủ đích: TTS→listening/pronunciation mastered;
ASR transcript→acoustic score; rubric/self-rating→objective evidence;
saved-only word→account FSRS card chưa activation; visit/XP/receipt→mastery;
page subset→full lesson completion; active exam→answer keys/remediation;
imported completion→prerequisite unlock. Regression tìm thấy ở
`evidencePolicy.test.ts`, `reviewRepository.test.ts`,
`assessmentPracticeMistakesRepository.test.ts` và normalized lesson tests;
T12/T14 thêm các gate unit/manifest mới. Test cũ không chứng minh các adapter
chưa tồn tại. Fixture L06 giữ các điều cấm này cho reducer mới.

## 7. Local, test, released và bằng chứng lượt này

| Bề mặt | Đã biết | Chưa chứng minh trong T00 |
| --- | --- | --- |
| Working source | Hash source + route bindings trong inventory; 35 domain edge; consumer/test paths được kiểm tồn tại | Chưa có runtime adaptive/avatar/timeline mới |
| Học liệu local | HSK0 4/4 rich0/4; HSK1–4 rich40/40/55/78=213/213; IDs giữ nguyên | Core beta/local authorization không là academic human review; không tự đủ HSK |
| Test/preview trước | Audit17/10 ghi npm check502 file/3291 test, fixture browser4321 guest/503, native build/unit/lint | Chỉ kế thừa record cũ; T00 không chạy lại check/browser và không xác nhận preview cũ đang sống |
| Hosted/released | ANDROID_APP ghi APK0.3.1/code4 ngày16/10, release-config khớp metadata | Không kiểm URL/binary hiện tại, không suy local17/10 nằm trong APK16/10 |
| Account D1 | Repository/route contracts và test paths đọc được | Chưa đọc live rows/head/media hoặc chạy account-D1 browser thật |
| Thiết bị | Capacitor source dùng cùng learner UI, https://localhost, request bridge có owner headers | Picker/mic/IME/background/quota/cài đè/reopen chưa kiểm thiết bị; T19 device gate còn thiếu |

Gate T00: static validator route/method/source hash, unit source/context refs,
DAG/fixture/task coverage, no false authority; cú pháp Node và scoped lint cho
validator; `git diff --check` cho file thay đổi. Kết quả chạy thật ghi checkpoint.
Không sửa TS/runtime/UI nên không chạy typecheck/full check/build/browser chỉ vì
thêm baseline tài liệu/tooling. T01 sẽ chạy typecheck và targeted transactional/
retry/crash/owner tests; full gate ở ranh giới module đúng rủi ro.

Máy tham chiếu kỹ thuật T00: Windows x64, Intel Core i5-7200U2.50GHz, RAM8GiB,
Node24.16.0. Khi benchmark phải ghi browser/version, build/content hash, nguồn
điện và tải nền; chưa có browser timing trong lượt này. Đề xuất timeline first
page50 trên100000 event p95<1s, cached composer p95<200ms. L07 định dataset,
warmup/sample và đo cold/memory riêng; đó là target, chưa là số đo đạt.
Android reference device chưa chọn vì không có test máy thật trong T00; T19
ghi model/OS/WebView/RAM trước đo startup/memory/mic/picker. Không lấy laptop
hoặc bridge mock thay kết quả Android.

## 8. Issue ledger và handoff

Issue có ID ổn định G01–G12 trong inventory.
Trạng thái task: **T00 IN-REVIEW**; A01/A02/T01–T19 chưa triển khai bởi lượt này.
G05 BLOCKED phần content measurement/review; không chặn ghi event contract T01.

| Issue | Việc đã chốt để lượt sau khỏi audit lại |
| --- | --- |
| G01 | A01 blob owner + avatar UI; A02 storage/server/media/native picker/two-session; không tái dùng authoring upload thiếu ownership |
| G02/G07 | T01 durable lesson event đầu tiên; T02 đủ11 nhóm learner kể cả expansion; T03 timeline; backfill có lineage/unknown |
| G03 | T04 kiểm toàn bộ store ở mục3 và L03; full-device label chỉ sau round-trip journal/resume/blob |
| G04 | T06 graph/mapping, T07 extractor, T09 model, T10 shadow, T11 runner, T12 all consumers, T13 path, T14 nhịp/skip |
| G05/G12 | T07 resolve released head vs draft; T08 bổ sung audio/holdout/policy review; T15 mở rộng từng cụm |
| G06 | T16 entry→action→result→consumer→reload từng module; T17 bốn slice platform; T19 account-D1 và device thật |
| G08 | T05 session budget/capabilities/opt-out tách daily goal cũ; F08 không buộc đổi dailyMinutes |
| G09 | T04/T11/T17 thêm fixture guest reset cùng anchor + old-tab receipt để quyết migration journey; hiện chỉ finding source, chưa tái hiện mất dữ liệu |
| G10 | T02 speech slice quyết durable per-attempt report/receipt và privacy; không coi component report là timeline bền |
| G11 | Expansion VocabularyMission chỉ giữ index/revealed trong React, chưa ghi store/receipt/history/save/resume; T02/T16 nối observation/resume đúng loại tự ôn, không giả FSRS/mastery |

Một bước tiếp theo đề xuất: **T01 — event contract + một luồng lesson→history**,
sau người dùng review baseline T00. Dùng E02/E25/E26, L01/L02, identity/receipt
contract mục4.1; prototype additive event storage và transactional/rebuildable
account adapter, không chạy luôn T02/T03. Chọn A01 thay T01 khi người dùng ưu
tiên avatar. Không tự tiếp tục task mới trong lượt T00.

Review tài liệu cho người dùng: kiểm pilot mục5, contract authority mục4,
fixture bốn nhu cầu/bảy context và G01/G03 bao phủ avatar/recovery. Không có UI
mới cần bật preview lượt này. Khi task có UI, mở preview kèm hành trình ngắn;
fixture không thay account-D1 hoặc Android thiết bị.

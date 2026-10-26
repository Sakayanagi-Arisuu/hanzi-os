# T02 · slice review — Ký Ức Trận → lịch sử bền vững

18/10/2026 · kế hoạch v2, mục 7–8 · **IN-REVIEW**.
Chỉ hoàn thành implementation slice review; không kết luận toàn T02 xong.
T00/T01/T02 lessons vẫn **IN-REVIEW**, chưa có USER-ACCEPTED. Không T03.

## Tiếp tục từ baseline

Kế thừa inventory/fixture T00, contract/transaction/reconciliation T01 và
handoff T02 lessons. Trước sửa, ghép source bindings T00 → T01 → T02 lessons:
**189 file, không drift**. Chỉ kiểm delta E04 và consumer của review; không
khảo sát lại mọi module. E02 objective Thử Luyện và E03 rich-page không phải
nguồn review, không phát thêm objective/page event khi grade FSRS.

Nguồn cụ thể là `LocalReviewPage` → `LearningStore.gradeReview` cho guest và
`AuthenticatedReviewPage` → review-grade journal → `ReviewRepository.grade`
cho account. Đây là grade nghiệp vụ thực đang điều khiển card/offer/revision,
không phải click analytics hay record giả từ fixture T00.

Lượt sau đọc checkpoint, tài liệu này và `PERSONALIZATION_T02_REVIEW_DELTA.json`.
So source theo thứ tự **T00 → T01 → T02 lessons → T02 review**; chỉ audit file
lệch mới. Không sửa hash baseline cũ để giả nghiệm thu.

## Coverage T02 — đủ 10 slice

| Slice | Đã nối | Chưa nối / giới hạn |
| --- | --- | --- |
| lessons | E02 objective Thử Luyện T01; E03 rich-page objective practice/self-review/support/exposure, guest/account | IN-REVIEW; account-D1 browser thật/Android chưa kiểm; E11 expansion chưa nối |
| review | E04 FSRS grade → atomic guest journal / account business records → pending/confirmed/rejected history → safe personalization adapter | IN-REVIEW; account context/HTTP browser fixture khác account-D1 thật; chưa native/device |
| mistakes | Giữ producer/consumer lỗi và sửa lỗi hiện có | E05–E06 correction/revisit chưa có history producer riêng; **slice chưa nối kế tiếp** |
| reader | Chưa nối history của module Reader | E07–E09 legacy/chapter/transfer/support/bookmark; reading block E03 không thay slice này |
| assessment | Chưa nối | E14–E17 placement/level-check/mock online–offline/result |
| dictionary | Chưa nối | E10 lookup/save/provenance; không tự tạo account card trái policy |
| speech | Chưa nối | E12 practice/transfer; TTS không thành điểm phát âm |
| writing | Chưa nối | E13 stroke/IME/practice; không suy handwriting từ input text |
| overview | Consumer analytics đã tách exposure/support ở lessons; review count/day/queue/journey được kiểm và chặn pending | E18–E21 chưa có producer lịch sử mới; không gọi slice overview hoàn tất |
| profile | Chưa nối producer mới | E22–E29 goals/avatar/reset/export; nhật ký UI T03, avatar A01/A02, recovery T04 còn riêng |

E01 onboarding, E11 expansion và auth/sync/native/studio/commerce/operations
giữ inventory/task T00. Chưa composer/runner/learner model T09; adapter ở đây
chỉ đưa dữ liệu có provenance cho bước sau. Chưa đổi nội dung Thiên Lộ hay gọi
đổi thứ tự bài là adaptive. Avatar/history/recovery/audit mọi module và nội
dung phiên thích ứng thật không bị bỏ khỏi kế hoạch. Pilot numbers/daily-1/
daily-3 vẫn còn audio, delayed recall, challenge, human review và policy.

## Contract và authority

Giữ `schemaVersion:1`, namespace/key của lesson/page cũ. Thêm biến thể
`module:review`, `sourceType:fsrs-review-grade`, task `fsrs-rating` và namespace
event `lesson-history:v1:review:`. Một operation có một event; operation mới
của cùng card có event mới. Provisional/receipt/server row dùng cùng operation
ID, không dedup theo word/card hoặc theo ngày.

Delta review có 25 binding implementation/test; ghép baseline trước thành 203
file, kiểm sau sửa không drift. `previousSha256:null` nghĩa là file chưa có
binding trong map kế thừa, không tự khẳng định đó là file vừa được tạo.

`review` giữ card ID, word/item ID, word/content/activity/scheduler version,
pre/post card revision nếu có, modality, rating, scheduled/next due time và
reported duration nếu source có. Event giữ occurredAt/receivedAt/clockSource,
hint/reveal và lineage/sourceRecordRef. Không đo active duration từ thời gian
trên màn hình. Guest chưa có card revision tương đương server: để null.
Guest scheduler policy vẫn retention0.9/fuzz; server vẫn retention0.9/no-fuzz.

Rating luôn **self-reported**, outcome `self-review`, correctness unknown,
score/skill/firstResponseRef null, masteryEligible false. Không đổi lịch/
thuật toán FSRS, không cấp thêm XP/completion/mastery/unlock từ event. Guest
giữ +5 XP/review theo nghiệp vụ cũ, account transaction review vẫn không thêm
XP. `server-recorded/confirmed` chỉ xác nhận đã lưu/chạy scheduler, không phải
đáp án được server kiểm chứng. Không đổi cách ghi legacy evidence/mistakes để
né authority; history không nâng outcome legacy Again thành correctness.

`reviewPersonalizationInput` đối soát trước khi trả dữ liệu: guest business
commit là committed; account chỉ receipt/row confirmed mới committed;
pending/quarantined lần lượt pending/rejected. Mọi đầu vào vẫn correctness
unknown/mastery false. Chưa có reducer hay recommendation runtime tiêu thụ
để cấp năng lực.

## Ghi bền vững và dựng lại

### Guest

`recordReviewGrade` tái dùng CAS/transaction/lock/owner-generation/reset của
T01: durable state + real evidence + event + document/outbox ghi nguyên tử.
Updater chạy trên source bền vững mới nhất, không ghi đè tab khác. UI await
commit trước khi next/success signal/session receipt. Quota/write failure giữ
card, retry operation và source/journal/outbox cũ. Thẻ đã bị reset/xóa không
được UI stale tạo lại khi grade. Review screen tách instance theo owner.

Reload/crash đọc lại journal. Legacy guest evidence `source:review` và
`method:fsrs-rating` có thể dựng event idempotently từ idempotencyKey/real
evidence ID, chỉ trong owner anonymous hiện tại. Không suy guest authority
từ bản mirror account. Không tự persist backfill đè raw source. Reset che
epoch cũ; owner switch không replay sang hồ sơ khác.

### Account

Command v1 nhận optional `historyContext:{version:1,occurredAt,hint,reveal}`.
Command cũ không có context giữ hash/payload cũ. Context mới được ghi vào
`learning_attempts.response_json` **trong cùng batch chín bước nghiệp vụ** đã
có review_log/evidence/card/idempotency/outbox/sync changes. Không thêm analytics
request hoặc table/migration cạnh tranh sau khi nghiệp vụ thành công.

Local pending lấy từ review-grade journal; ack/quarantine không xóa command.
Retry/mất response dùng idempotency cũ. Hai tab không được dùng hai operation
khác nhau để grade cùng card revision; review mới hợp lệ dùng revision mới.
Read-only archived command parser giữ version cũ cho history nhưng không nới
writer/prepare/send gate của protocol hiện hành.

`GET /api/learning/review-history?resetEpoch=0&limit=50` dựng projection từ
`review_logs` LEFT JOIN business attempt/idempotency/card/activation/device.
Auth-derived owner, header fence, no-store, reset trước/sau query; cursor kép
`(received_at DESC,id DESC)`, limit1–100. Không trả answer keys/response_json.
Card activation lesson link chỉ có khi source thực còn binding.

Legacy có reviewedAt thật nhưng thiếu device occurrence dùng clockSource
server-received; thiếu version/rating/revision/assistance để null/unknown,
không gán version hiện hành. Thiếu idempotency dùng lineage ổn định
`legacy-review-log:<log.id>`; không đoán để ghép với command không đủ binding.
Schema/context hỏng trả lỗi, không ghi lại/xóa nguồn hoặc giả lịch sử rỗng.
Local read/network/schema/late-owner failure cũng chỉ báo lỗi, không thay raw
journal. `readLocalLearningHistory` ghép lessons+review qua projector chung;
T03 sau này mới quản pagination/index/timeline.

## Consumer và pending

- Guest count/day lấy evidence nghiệp vụ, dedup idempotency; history không tạo
  evidence thứ hai. Account reviewedToday chỉ tính ack receipt duy nhất theo
  reviewLogId; pending/rejected không cộng.
- Pending tính trên **mọi** scoped review command, kể cả offer revision không
  còn trong queue mới. Queue rỗng chưa đủ điều kiện hoàn tất nếu còn pending/
  quarantined, đọc journal lỗi hoặc chưa xác minh mạng/queue.
- UI pending có tiêu đề “Lượt ôn đang chờ xác nhận”, ghi rõ đánh giá lưu tại
  thiết bị; không hiện “Kết trận hoàn tất”. Rejected giữ record và không tính
  đã ôn. Reload summary giữ hint đã ghi; không suy unknown hint thành tự nhớ.
- Journey/success signals chỉ sau business commit/ack. Account không nhận
  review receipt tự động từ queue guest/local rỗng. Projector account yêu cầu
  receipt thật, không bỏ qua review chỉ vì local step có status clear. Guest
  no-due policy cũ không đổi. G09 reset-scope journey ngoài slice chưa giải quyết.

## Kiểm chứng

Log/harness chỉ ở `tmp/personalization-t02-review-*` và
`tmp/personalization-review-*`, không trong docs/reports hoặc output.

Targeted suite bao gồm contract/reconcile/legacy/personalization, real SQLite
business transaction→history, route auth/reset/error, outbox retry/offline/lost
response/reopen/rejection/two grades, guest CAS/multi-tab/quota/crash/owner/reset,
analytics count/day, queue/journey/pending UI và regression T01/T02 lessons.
Targeted cuối **20 file/164 test qua** (có overlap gate tổng). Typecheck cuối,
global lint và scoped diff/whitespace qua. **npm run check mới exit0**:
**511 file/3350 test**, lockfile/content/DB/restore42 migration61 bảng/build qua;
Premium boundary214 JS/192 marker vắng mặt qua. Build local/unattestable do
dirty tree, asset ceiling1338,4KiB vượt advisory1MiB314,4KiB, chưa là số đo
điện thoại thật. Production readiness exit1 với23 blocker, fail-closed.
Log tổng `tmp/personalization-t02-review-check.log`; browser và targeted logs
cùng prefix. Lượt thêm backfill ban đầu thiếu archived-course FK fixture,
đã seed course retired hợp lệ; repository15/15 và targeted164/164 qua, không
tắt foreign keys/nới schema. Kết quả cuối cũng ghi ở checkpoint.

Đã đọc lỗi gate tổng lessons cũ `tmp/personalization-t02-check.log`:
507 file/3329 test qua, một `localPagePractice` timeout trong lượt gián đoạn
dài; rerun riêng 2/2 qua (79ms). Đây là consumer practice cache, không phải
review producer; review targeted chạy lại vẫn qua. Không sửa test timeout,
không biến lượt check cũ thành pass. Gate mới phải được báo riêng.

Browser context cô lập 390×844/reduced-motion:
- Guest dùng ClientRuntime/LearningStore/IDB/FSRS thật, seed một saved card:
  offline Again → một event, count1/XP5; ôn tiếp cùng thẻ/hint/Good → online/
  reload giữ hai event, count2/XP10, reps2, không completion/mastery; action
  bottom770 trong viewport844, không tràn ngang/pageerror.
- Guest quota injection ở đúng journal transaction: không next/completion,
  event/count/XP vẫn 0, có lỗi và CTA trong viewport; gỡ lỗi rồi retry giữ cùng
  operation, chỉ một event/count1/XP5. Không xóa dữ liệu browser người học.
- Account dùng AuthenticatedReviewPage + command/outbox/IDB/HTTP thật với
  **authority/journey hook và HTTP receipt fixture**, không tài khoản/D1 thật:
  offline grade hiện pending, chưa receipt journey; online → confirmed một
  activity; reload giữ một event. 409 bị quarantine qua reload, không receipt
  journey/success. Fixture không chứng minh normalized provider/D1 E2E.

## Giới hạn và test tiếp

Chưa account-D1 browser thật, Android/native bridge/device, PWA cold offline
startup, performance100000 event/p95 hoặc full-device recovery. Giữ mọi giới
hạn T01/lessons: **rich lesson mobile footer y918/viewport844 vẫn chưa sửa**;
không lấy review CTA pass thay gate CTA lessons. Bundled page full document
vẫn ở snapshot thiết bị, server history không thành recovery archive.
Account lobby reviewedToday hiện tính các receipt ack được giữ trên thiết bị,
chưa là tổng hợp mọi thiết bị từ server pagination; không coi đây là T03.
Không mở production, deploy, APK hay live learning experiment.

Preview review: http://127.0.0.1:4324/review (guest runtime/storage thật,
guest API/503); http://127.0.0.1:4324/review?account-fixture=1 (account fixture
như giới hạn trên). Test: bắt đầu → tự nhớ/gợi ý → hiện đáp án → đánh giá;
guest reload và ôn tiếp thẻ yếu. Account ngắt mạng sau khi tải thẻ → grade →
kiểm pending, khôi phục mạng → đồng bộ/confirmed. Không có UI nhật ký mới.

**Tiếp theo:** người dùng review slice này; slice chưa nối tiếp theo là
**mistakes**, chỉ triển khai khi được chọn. Không tự T03 hoặc T02 slice khác.

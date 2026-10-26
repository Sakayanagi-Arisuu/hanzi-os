# T01 — Event bền vững cho objective lesson attempt

18/10/2026 · kế hoạch v2 · **IN-REVIEW**. T00 vẫn IN-REVIEW.

## Phạm vi và delta T00

Đã đọc prompt chung mục7, prompt T01 mục8, checkpoint và ba artifact T00.
Validator T00 trước sửa exit0: không có source drift so với baseline. Chỉ lần
theo E02/E25/E26 và fixture L01/L02; không audit lại toàn hệ thống.

Chọn **E02 objective answer trong Thử Luyện**, dùng `boot-1` để đi hết luồng
guest/account không cần tạo prerequisite; `daily-1` của pilot kiểm contract
với runtime/provenance thật. Nguồn này đã có exact local provenance, idempotency,
normalized command journal, immutable server session/form và receipt. Trang rich,
Reader, FSRS, speaking, expansion và timeline UI nằm ngoài T01; T02/T03 chưa làm.
Audio/recall trễ/challenge/human review/policy của pilot giữ nguyên blocker T00.

## File và consumer

| File | Vai trò |
| --- | --- |
| `src/learning/lessonHistory.ts` | Event/page schema1, identity/parser, projection và conflict/dedup |
| `src/sync/indexedDb.ts` | Ghi event guest cùng transaction local state/document/outbox, CAS chống tab ghi đè; giữ journal khi dọn cache |
| `src/sync/coordinator.ts` | Commit objective guest với scope đã capture, rebase durable state/retry CAS trước cập nhật UI |
| `src/store/LearningStore.tsx` | `recordAnswer` giữ chấm điểm/evidence cũ và đợi commit bền trước trả thành công |
| `src/sync/lessonHistory.ts` | Selector guest/account local; dựng provisional/confirmed từ normalized commands/receipts; client đọc page server có owner/reset fence |
| `src/server/lessonHistoryRepository.ts` | Read-only projection dựng lại từ business rows đã commit, có cursor và reset checks |
| `app/api/learning/lesson-history/route.ts` | GET theo account xác thực; no-store, owner mismatch và reset/error handling |
| `src/learning/lessonHistory.test.ts` | Contract với actual daily-1 local runtime/provenance; không cấp authority |
| `src/sync/coordinator.test.ts` | Commit/crash/quota/reload/two-tab/owner/reset/corruption/delete guest |
| `src/sync/learningCommandOutbox.test.ts` | Account pending→lost reply→reload→receipt/retry, một activity |
| `src/sync/lessonHistoryRead.test.ts` | Legacy empty projection, outage/schema lạ và response tới sau owner switch |
| `src/server/attemptRepository.test.ts` | Business transaction→history, retry/dedup/isolation và timestamp-tie pagination |
| `src/server/lessonHistoryRoute.test.ts` | Auth/owner fence, query validation, no-store, reset/outage |

Không sửa scoring adapter/hash, content, lesson/vocabulary/character IDs hoặc D1
migration. IDB vẫn version3; journal dùng namespace mới trong store hiện có.
Sau T01, validator T00 báo source/route drift đúng thiết kế: entry API mới và
những file trong bảng này là delta được triển khai. Không cập nhật hash T00
để biến baseline thiết kế thành runtime đã nghiệm thu. Lượt sau dùng tài liệu
này + checkpoint để giải thích delta, chỉ audit những thay đổi mới phát sinh.
[T01 delta](PERSONALIZATION_T01_DELTA.json) ghim hash cuối của 13 file code/test,
hash cũ và entry mới; đối chiếu với T00 sau khi áp các binding T01 này.

## Contract và authority

Event `schemaVersion:1`, `eventKind:observation`,
`sourceType:objective-lesson-attempt`; identity ổn định từ
`(ownerKey,resetEpoch,operationId/idempotencyKey)`. `logicalActivityId=eventId`.
Không đưa owner generation vào identity xuyên reload/thiết bị; generation là
fence lúc đọc/ghi. Giữ content/activity/item/session/form refs và source lineage.

Assistance không có dữ liệu giữ null: hint/priorExposure có giá trị khi nguồn
đã ghi; IME/reveal/pinyin/translation/TTS chưa ghi ở nguồn này không tự thành
false. `occurredAt` giữ device-reported, `receivedAt` chỉ có khi đọc business
timestamp server; local receipt không chứa giờ nhận server nên giữ null.
Duration giữ null, không giả active time từ elapsed response duration.
Human review và measurementPolicy giữ unknown/null; không ngụ ý pilot đã duyệt.

Projection chỉ đọc và mọi event có `masteryEligible:false`. Correctness/score
guest vẫn do local provenance/scoring cũ; account vẫn do server repository và
receipt hiện có. Lịch sử không viết skillMastery, completedLessons, XP, FSRS,
prerequisite hoặc reward ledger. Không tạo request analytics mới.

Guest observation là `local-practice/provisional` và không được tự nâng thành
server evidence khi đăng nhập/import. Account command pending có outcome/score
unknown/null, không chấm từ client. Receipt đã lưu đổi cùng event thành confirmed;
page server bổ sung receivedAt/priorExposure từ source đã commit. Hai bản
provisional/confirmed có cùng operation chỉ là một activity. Payload/receipt
mâu thuẫn gây lỗi, không dùng last-write-wins để che xung đột.

## Guest: transaction và lỗi

`LearningStore.recordAnswer` capture owner/reset/generation trước các await.
Business reducer cũ chạy trên local state đã lưu của owner, thay vì snapshot
cũ của tab. Coordinator tạo event từ đúng evidence vừa được ghi.

Transaction IDB gồm `meta`, `documents`, `local-states`, `outbox`,
`lesson-resumes`: kiểm owner/reset, CAS expected source state, kiểm xung đột
event, rồi commit event + business state + compatibility outbox cùng nhau.
Hai tab không có navigator.locks vẫn retry CAS tối đa5 lần; không ghi đè source
của tab trước. Kiểm schema đọc nhưng không thay raw business rows bằng một
projection đã lọc evidence. Đây là regression được phát hiện trong test hai tab.

UI chỉ cập nhật localStorage/state sau commit. Nếu crash/lỗi mirror sau commit,
event và business source còn trong IDB để reload. Nếu IDB/quota/event-conflict
lỗi trước commit, transaction abort và giữ business/source/outbox cũ.
Unknown stored state schema hoặc unreadable history trả lỗi; không ghi rỗng.

Journal entries dùng `lesson-history:v1:` trong `lesson-resumes`, record key
vẫn `(owner,epoch,entryKey)` như store hiện tại. Dọn cache/resume khi reset,
adoption hoặc thay checkpoint không xóa journal mới. Projection chỉ đọc epoch
đang hoạt động; old epoch không lộ vào phiên mới. Explicit `deleteOwnerData`
xóa journal của đúng owner. Không đổi policy xử lý normalized commands cũ khi
người dùng chủ động reset; full-device recovery/quarantine vẫn thuộc T04/T17.

## Account: projection dựng lại từ nghiệp vụ

Không có bảng event mới hoặc analytics write thứ hai. Transaction hiện tại của
`AttemptRepository` đã ghi learning_attempts + evidence + idempotency + outbox.
History query đọc learning_attempts của source lesson, join session/form và
idempotency để giữ original operation identity; device installation nullable.
Do đó crash sau business commit hoặc notification/analytics không chạy không
làm mất nguồn lịch sử. T01 không thay transaction chấm điểm này.

Local history account dựng trực tiếp từ command journal và receipt đã lưu:
offline/retry/reload không cần một bản sao history cạnh tranh. Acknowledged
commands không bị xóa khi nhận ack theo protocol cũ. Khi cần lịch sử từ thiết
bị khác/command local không còn, GET dựng lại từ source server.

`GET /api/learning/lesson-history?resetEpoch=0&limit=50`;
`cursor` là JSON `{receivedAt,attemptId}` từ `nextCursor`. Limit1–100;
cursor kép `(received_at DESC,id DESC)` tránh mất/trùng khi trùng timestamp.
Source query giới hạn page; không trả response_json, answer key hoặc transcript.
Row cũ/hỏng thiếu session hoặc idempotency binding gây read error và giữ raw
record; không biến mất âm thầm do inner join hoặc được bịa source để backfill.
History giữ đọc kết quả cũ khi source lesson/entitlement đã thay đổi; không cấp
quyền mở lesson mới. Không đọc source assessment/Reader qua endpoint này.

Server derive owner từ identity, không nhận owner chọn bằng query/header.
Header chỉ chặn cookie đổi hồ sơ. Kiểm reset trước/sau query. Client recheck
generation/reset sau response; schema lạ hoặc outage không ghi đè local records.
Projection thuần `projectLessonHistory(scope,[...local,...serverPage.events])`
đối soát cùng activity. T03 sẽ quản lý pagination/index/UI; hiện chưa có timeline
mới và chưa đo target100000 event/p95 của T00.

## Bằng chứng và giới hạn

Gate cuối: `npm run check` exit0, 505 file/3315 test, typecheck/lint/content/
DB/restore/build và Premium boundary214 JS/192 marker qua. Targeted cuối
coordinator/cache3 file/54 test và history/API/repository4 file/30 test qua,
có overlap gate tổng; typecheck/scoped lint cuối exit0. Source bindings T01
sau kiểm không drift. Browser boot-1 offline answer→online/reload có1 event/
1 evidence, XP0, lesson chưa completed,0 page error; mobile390×844 CTA bottom773
trong viewport844, desktop1440×1000 không tràn. Log tại
`tmp/personalization-t01-check.log`, `tmp/personalization-t01-browser.log`,
`tmp/personalization-t01-history-final-tests.log`. Bundle tổng vượt advisory1MiB
309,8KiB; chưa đo target100000 event/device. Production gate exit1 với23 blocker
như thiết kế; không có public release.
L01/L02 chỉ được hiện thực cho objective lesson path này; không đánh dấu toàn
fixture L02/avatar/journey hoặc mọi nguồn T02 đã xong.

Browser fixture cô lập tại `http://127.0.0.1:4322`: learner source/IndexedDB thật,
API guest/503, không dùng browser profile hay D1 người học. Fixture dùng resume
synthetic của boot-1 rồi trả lời qua UI thật. Lượt thử seed completion prerequisite
để mở daily-1 bị learner gate chặn; không sửa gate để qua browser smoke. Không thay
account-D1 browser, Android device, PWA cold offline startup hoặc public release.

Để người dùng test phần hiện có: vào một Thử Luyện guest đã mở → trả lời →
reload giữa phiên → tiếp tục; account giữ lượt pending khi mạng lỗi rồi đồng bộ
bằng protocol cũ. Việc xem timeline Hồ sơ sẽ ở T03, không thêm UI trong T01.

Handoff tiếp theo: review T01 trước; nếu được chọn T02, bắt đầu slice lessons
còn thiếu page/rich và cập nhật coverage từng nguồn theo T00. Không tự chạy
T02, làm avatar, chữa G09 journey hoặc bật adaptive. Inventory rich vẫn
HSK0 4/4 rich0/4; HSK1–4 40/40/55/78=213/213. Không deploy/phát hành APK.

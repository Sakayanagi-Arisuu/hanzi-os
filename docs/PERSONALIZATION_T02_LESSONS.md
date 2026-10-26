# T02 · slice lessons — lịch sử hoạt động trang rich

18/10/2026 · kế hoạch v2, mục 7–8 · **IN-REVIEW**.
Chỉ slice lessons, không phải toàn T02. T00/T01 vẫn **IN-REVIEW**;
chưa có USER-ACCEPTED và chưa triển khai giao diện nhật ký T03.

## Điểm tiếp tục và nguồn đã chọn

Đã đối chiếu toàn bộ source binding T00 sau khi áp delta T01: **không drift
trước sửa**. Chỉ audit E03 và consumer bị tác động; không khảo sát lại hệ thống.
Kế thừa contract/projection/CAS/owner fence T01 và fixture vòng đời T00.

E02 là objective answer của **Thử Luyện**, đã nối tại T01. Slice này chọn
**E03: ResumableLessonReader / LessonPageReader**, vì đã có document đóng băng,
firstAttempt, binding phiên bản và business repository page-attempts. Đây là
nguồn khác, không gọi lại `LearningStore.recordAnswer`, không tạo thêm E02.
Khối `reading` trong bài không phải module Vạn Quyển Các.

Lượt sau đọc tài liệu này, checkpoint và
[delta T02](PERSONALIZATION_T02_LESSONS_DELTA.json). So binding theo thứ tự
T00 → T01 → T02, chỉ audit file lệch mới. Không cập nhật hash T00/T01 để giả
nghiệm thu; validator T00 nguyên bản sẽ thấy delta runtime có chủ đích.

## Coverage T02 — mọi slice

Coverage đã cập nhật sau slice review tại
[PERSONALIZATION_T02_REVIEW.md](PERSONALIZATION_T02_REVIEW.md).
Phần handoff implementation lessons bên dưới vẫn là mốc lịch sử của slice này.

| Slice | Đã nối tới event/history | Chưa nối / giới hạn |
| --- | --- | --- |
| lessons | E02 objective Thử Luyện qua T01; E03 trang rich qua lượt này: objective page, tự đối chiếu, hỗ trợ và tiếp xúc; guest/account | Chưa USER-ACCEPTED; account-D1 browser thật và Android chưa kiểm; expansion E11 chưa nối |
| review | E04 FSRS grade → guest atomic journal/account business projection → history/personalization adapter | IN-REVIEW; chi tiết và giới hạn tại handoff review; chưa account-D1 browser thật/Android |
| mistakes | Consumer sai trong trang và remediation cũ được giữ, không cấp mastery | E05–E06 correction/revisit chưa phát event lịch sử riêng; **slice chưa nối kế tiếp**; không coi test regression là đã nối |
| reader | Chưa nối module Reader | E07–E09 legacy/chapter/transfer/support/bookmark; khối reading E03 không thay coverage này |
| assessment | Chưa nối | E14–E17 placement/level-check/mock online–offline/result |
| dictionary | Chưa nối | E10 lookup/save và provenance; không tự tạo account card trái policy |
| speech | Chưa nối | E12 audio practice/transfer; TTS trong bài chỉ exposure, không phải điểm phát âm |
| writing | Chưa nối | E13 stroke/IME/practice; không suy handwriting từ câu gõ trong bài |
| overview | Chỉ sửa consumer analytics để view/hint/audio không tăng số câu luyện | E18–E21 chưa có producer lịch sử mới; không gọi đây là hoàn thành slice overview |
| profile | Chưa nối producer mới | E22–E29 goals/avatar/reset/export; timeline thuộc T03, avatar A01/A02 và full-device recovery T04 chưa làm |

Expansion E11, onboarding E01, auth/sync/native/studio/commerce/operations vẫn
được giữ trong inventory T00 và các task liên quan; không bị bỏ khỏi kế hoạch.
Avatar/history/recovery/adaptive session-content/audit mọi module vẫn là các
phần việc riêng, không suy ra hoàn thành từ slice này. Pilot numbers/daily-1/
daily-3 còn audio, delayed recall, challenge, human review và policy như T00.
Chưa composer/runner, chưa đổi Thiên Lộ và không gọi đổi thứ tự bài là adaptive.

## Contract và taxonomy

Giữ `schemaVersion:1` và toàn bộ event objective T01 cũ. Mở rộng có phân biệt
`sourceType:lesson-page`, bốn taskType `page-objective`, `page-self-review`,
`page-exposure`, `page-support`. Parser cũ của objective không bị nới phương pháp
chấm; biến thể page có validation riêng. Consumer cũ không biết biến thể phải
fail-closed, giữ journal, không lọc rồi ghi đè dữ liệu rỗng.

| Producer trong bài | Bản chất event |
| --- | --- |
| activity choice/order/cloze, lần bấm kiểm tra đầu | Objective **practice**, giữ firstAttempt; guest dùng evaluator hiện có, account chỉ có correctness từ receipt của published business source |
| activity rubric | Self-review, kể cả câu trùng mẫu; checklist/thời gian tự luyện không phải điểm hoặc active duration |
| reflection / dictation, bấm đối chiếu | Self-review; so chuỗi với mẫu không thành đánh giá speaking/listening/recall độc lập |
| reading ghi chú/chọn đoạn, rời ô/khối | Self-review, lưu câu/đoạn đầu; không tự chấm đọc hiểu |
| hint, mở mẫu/transcript, mở Pinyin/nghĩa | Support riêng; không sửa assistance/correctness của first response đã lưu |
| khối explanation/dialogue/image/diagram/reading/activity/reflection/dictation/audio được reader chọn hiển thị | Exposure một lần/khối/action/document; không đo mắt nhìn/đọc hết/hiểu/hoàn tất |
| yêu cầu TTS / audio element phát | Exposure; tệp cũng có thể synthetic, TTS chỉ là yêu cầu phát, không bảo đảm đã nghe hoặc là audio native |

Không phát một event mỗi keystroke hoặc mỗi giây đồng hồ. Các lần bật/tắt cùng
support hoặc quay lại cùng khối được gộp theo action/document, không phải log
đầy đủ số lần nghe/click. `firstResponseRef:null` cho exposure/support.
Mọi event page có `masteryEligible:false`, skill/policy/human review unknown;
duration null. Không ghi mastery/XP/completion/unlock/FSRS/reward ledger.

Account page có binding phát lệnh v1 cũ, giữ `page-first-v1` idempotency và
chấm điểm published revision hiện có. Content binding v1 đã hash toàn lesson
content + revision/page/block; event dùng binding đó làm contentVersion và
activityVersion, giữ revisionId. Snapshot vẫn giữ document gốc. Không retrofit
binding mới cho first response cũ hoặc lấy câu chữa lỗi thay câu đầu.

Các nguồn không có binding server (bundled/offline, self-review, exposure,
support) dùng phần mở rộng `observation.version:1` của cùng page command:
document hash `lesson-page-document-v1:sha256:…`, page/block/kind/activityType,
action và timeKnown. Account ghi **business practice journal**, outcome của row
luôn self-review, không tin correctness hoặc authority do client gửi.
Projection giữ objective practice chưa được server chấm ở trạng thái outcome
unknown; self-review vẫn self-review. Receipt chỉ nâng độ chắc chắn **đã lưu**
thành `server-recorded/confirmed`, không biến thành `server-verified` correctness.
Descriptor self-report không xác nhận nguồn đã phát hành/human-reviewed.

`sourceId`/`sourceLessonIds` giữ lesson ID cho đường `/lesson/:lessonId`;
activityId/contextRef giữ page/block/action. Binding cũ vẫn được repository
resolve từ released history. Với bundled self-report, server giữ hash/refs,
không lưu toàn document; snapshot đóng băng nằm trên thiết bị. Chưa cam kết
thiết bị khác sẽ tải lại được mọi document bundled cũ theo hash.

## Durability, reconciliation và backfill

`persistLessonReadingHistory` ghi snapshot và companion journal
`lesson-page-history:v1:<lessonId>` trong **một transaction IDB** qua
`updateLessonResume`. Callback kiểm raw snapshot/journal, current owner generation
và reset. Merge trên durable source để không làm mất tab khác. First response
đã commit thắng câu chữa hoặc first response từ tab cũ; support/view dùng key
ổn định. Companion giữ các phiên bản nội dung cũ; không truncate lịch sử.
Không dùng localStorage làm bản event authoritative.

Account chỉ enqueue sau commit. Crash ở giữa commit và enqueue vẫn có source
cho `readLocalLessonHistory`; page pump quét journal/snapshot khi mount,
online/focus/retry và dựng lại outbox, không yêu cầu mở lại đúng bài. Existing
acknowledgement thắng pending từ request chậm. Dọn cache thông thường giữ
companion và page outbox; reset che epoch cũ, explicit owner deletion vẫn xóa
đúng owner. IDB giữ version3, không thêm migration hoặc reset database.

Server sử dụng cùng `/api/learning/page-attempts`, auth-derived owner, header
fence, Premium guard, body limit, mutation budget, reset/account checks và
idempotency existing. Observation được ghi trong `lesson_page_attempts`;
không có request analytics phụ sau nghiệp vụ. GET lesson-history UNION với
objective `learning_attempts`, paginate trên receivedAt/id chung, dựng event
từ committed row. Mất response/receipt cục bộ không mất lịch sử server.
Analytics chỉ đếm first-response/record v1 cũ, không cộng view/hint/TTS vào
attempts hoặc practice days; mistake authority vẫn chỉ từ nguồn chấm cũ.

Local snapshot/journal, outbox receipt và server row có cùng operation/event ID;
projection hợp thành một hoạt động. E02 và E03 có key/sourceType riêng. Không
tạo event objective thứ hai khi CTA rời trang vào Thử Luyện.

Backfill đọc record thật, không tạo từ completion/streak/XP hoặc vị trí resume:

- v1 snapshot có firstAttempt: giữ response/time/binding/assistance đầu;
- v1 draft/flag cũ chưa có firstAttempt: chỉ self-review/support, không tự chấm;
- thiếu thời gian: event `occurredAt:null`, `clockSource:unknown`; wire command
  mới dùng chuỗi `unknown` kèm `timeKnown:false`, không bịa mốc 1970/giờ mở lại;
- page business row cũ: giữ idempotency/revision/activity version/outcome thật;
  thời gian không parse được thành unknown, không dùng created_at thế chỗ;
- chưa từng ghi visit/audio: không backfill việc nghe/đọc từ saved position;
- replay/backfill idempotent, không rewrite business row cũ, không phát thưởng.

Lỗi đọc/schema lạ/quota/transaction/source-version conflict trả lỗi, không xóa
raw cũ hoặc ghi rỗng. Snapshot có version khác ở tab khác bị từ chối overwrite;
đổi bản nội dung qua hành trình archive snapshot cũ hiện có. T04 vẫn phải gom
đủ companion/page outbox vào full-device recovery; export projection hiện hành
không được quảng cáo là backup đầy đủ thiết bị.

## File thay đổi

| File | Thay đổi của slice này, ngoài dirty tree có sẵn |
| --- | --- |
| `src/learning/lessonHistory.ts` | Biến thể page, unknown time, nullable firstResponseRef, source-aware reconciliation; giữ T01 |
| `src/learning/lessonPageHistory.ts` | Adapter từ frozen source/first response/observation, taxonomy/backfill/provenance |
| `src/learning/pageAttemptCommand.ts` | Optional observation v1 và parse/receipt validation fail-closed |
| `src/learning/lessonReadingSession.ts` | Optional observations/pageHistory; parse nguồn tương thích v1 cũ |
| `src/sync/lessonReadingHistory.ts` | Atomic source+journal, multi-tab first-write retention |
| `src/sync/indexedDb.ts` | Companion transaction; giữ history/outbox qua cache clearing, không đổi schema DB |
| `src/components/ResumableLessonReader.tsx` | Persist trước enqueue; replay khi restore và thông báo lỗi không lộ ID |
| `src/components/LessonPageReader.tsx` | Capture khối hiện/support/TTS/audio, giữ first response |
| `src/components/LessonReadingBlock.tsx` | Chốt ghi chú/đoạn đầu khi rời ô/khối |
| `src/sync/queueReadingPageAttempts.ts` | Queue từ business journal, giữ nguồn objective cũ, không fallback trùng lệnh đã có |
| `src/sync/usePageAttemptPump.ts` | Reconstruct cả khi không mở lại bài sau crash |
| `src/sync/lessonHistory.ts` | Đọc journal/snapshot/outbox và reconcile với receipt |
| `src/server/lessonPageAttemptRepository.ts` | Self-reported business observations, không gọi evaluator/cấp authority |
| `app/api/learning/page-attempts/route.ts` | Accept observation hợp lệ, giữ mọi auth/scope/access/rate-limit guard |
| `src/server/lessonHistoryRepository.ts` | Account rebuild từ cả hai business source, cursor chung |
| `src/server/analyticsRepository.ts` | Loại exposure/support khỏi practice counts |
| `src/learning/testing/pageHistoryFixture.ts` | Fixture nguyên bản cho đủ block/activity kinds; chỉ test/preview, không nội dung production |
| `src/learning/lessonPageHistory.test.ts` | Taxonomy, first response, old draft/time/binding/contract |
| `src/sync/lessonReadingHistory.test.ts` | Commit/crash/offline/reload/quota/corrupt/multi-tab/owner/reset/cache |
| `src/server/lessonPageHistory.test.ts` | SQLite business rows/retry/rebuild/cursor/old source/time/authority |
| `src/server/attemptRepository.test.ts` | Bổ sung mixed E02/E03 pagination, giữ test T01 |
| `src/server/pageAttemptsRoute.test.ts` | Observation auth route/unknown time/injected authority |
| `src/server/analyticsRepository.test.ts` | Regression không đếm view/hint/TTS |
| `src/sync/pageAttemptOutbox.test.ts` | Fixture nguồn hợp lệ, giữ regression binding/crash/retry cũ |

Tài liệu thay đổi: checkpoint, handoff này và delta T02. Harness/log/screenshot
riêng ở `tmp/personalization-t02-*`; không sửa docs/reports hoặc output.

## Kiểm chứng và giới hạn hiện tại

Targeted Vitest cuối **13 file/86 test qua** sau khi tiếp tục, log
`tmp/personalization-t02-slice-final.log`. Bao gồm transaction/reconciliation,
consumer localPagePractice và legacy bound rubric không tạo self-review thứ hai.
Các lượt trước 12 file/80, 5 file/36, 1 file/6, 4 file/15 có overlap, không cộng
thành tổng test duy nhất. Typecheck cuối và global lint cuối exit0;
`tmp/personalization-t02-typecheck-final.log`, `tmp/personalization-t02-lint-final.log`.
Đối chiếu binding ghép T00→T01→T02: 189 file, không drift và không trailing
whitespace trong 24 file T02. Scoped `git diff --check` qua.
Production readiness script exit1 như thiết kế fail-closed; không mở production.
`npm run check` **exit1**, không ghi pass: lockfile/typecheck/lint/content/DB/
restore42 migration61 bảng qua; Vitest **507 file/3329 test qua, một test
localPagePractice timeout**, tổng508 file/3330 test. Test đồng bộ này có wall
time6453,7 giây trong lượt gián đoạn kéo dài; không kết luận lỗi logic chỉ từ
timeout. Rerun riêng `localPagePractice.test.ts` **2/2 qua, test79ms**, không sửa
code hoặc tăng timeout. Log `tmp/personalization-t02-check.log` và
`tmp/personalization-t02-local-page-rerun.log`. Build được chạy riêng vì check
dừng trước build: **npm run build exit0**, Premium boundary **213 JS / 192
content markers vắng mặt** qua. Log `tmp/personalization-t02-build.log`.
Assets toàn app1335,9KiB vượt advisory1024KiB311,9KiB; đây không phải số tải của
một route. Build local/unattestable do dirty tree, không phải release/production
qualification. Không ghi `npm run check` pass chỉ vì targeted rerun/build qua.

Browser Playwright context mới, guest API/503, runtime/IDB thật: cloze sai
offline → chữa đúng → online/reload giữ đúng **một first failure** → reflection
mở mẫu/self-review → reading/Pinyin/nghĩa/ghi chú → reload giữ history. Không có
pageerror; mobile390×844 và desktop1440×1000 không tràn ngang. Screenshot
`tmp/personalization-t02-mobile.png`, log `tmp/personalization-t02-browser-final.log`.

Browser cũng phát hiện **giới hạn layout hiện hữu**: header mục tiêu bài bên
ngoài reader đẩy footer tới y918 ở viewport844, mobile nav che CTA. Không sửa
CSS/layout trong slice lịch sử và không ghi UX viewport gate là pass. Cần lát
cắt lesson UI được chọn riêng trước nghiệm thu session viewport. Hành trình
history đã thực hiện bằng controls hiện có, chưa có timeline UI.

Fixture SQLite áp migration trong memory; không mở D1 `.wrangler` thật. Browser
chỉ guest; **chưa account-D1 browser thật, Android/native-device, nâng cấp app,
full-device recovery hoặc performance100000 event**. Không xóa browser profile
thật, không deploy/APK. Các giới hạn T01 này vẫn giữ, không suy từ fixture là đã
giải quyết. Ban đầu harness thiếu `window.process` của Next Link, đã sửa riêng
HTML fixture và chạy lại; không sửa app để né lỗi harness.

## Dữ liệu và nghiệm thu tiếp

Không sửa học liệu/stable IDs/scoring hash/migration. HSK0 4/4 (rich0/4),
HSK1–4 rich40/40/55/78=213/213 giữ nguyên. Completion/streak/saved/FSRS/mistakes/
reward dedup/owner/reset/resumes/outbox/dirty tree và .wrangler được giữ.

Preview cô lập: `http://127.0.0.1:4323`, chỉ guest/503, không phải account server.
Có thể học một trang bài, kiểm tra/chữa, reload rồi tiếp tục; history mới là
data projection, không có màn xem nhật ký. Harness tự động có seed fixture
riêng, không thay dữ liệu người học. Chờ người dùng review slice lessons.
Slice review sau đó đã được triển khai IN-REVIEW, xem handoff review; slice
chưa nối tiếp theo là **mistakes**, chỉ làm khi được chọn. T00/T01/T02 lessons
chưa USER-ACCEPTED; không tự chuyển T03.

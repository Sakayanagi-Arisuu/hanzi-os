# T02 · adapters còn lại — bàn giao đang triển khai

19/10/2026 · **IN-REVIEW / WORK-IN-PROGRESS**. Không kết luận toàn T02 hay
toàn kế hoạch hoàn tất. Chỉ dẫn attachment cho phép tiếp tục task theo dependency;
không tự nghiệm thu T00/T01/lessons/review hoặc tự bật nội dung chưa được duyệt.

## Coverage đủ 10 slice

| Slice | Implementation đang có | Phần chưa khép |
| --- | --- | --- |
| lessons | E02 objective T01, E03 rich-page T02; E11 vocabulary mission open/reveal/TTS-request/self-review + resume từ primary workspace, version digest | Curated expansion exposure/audio chưa nối hết; footer rich mobile còn lỗi cũ |
| review | E04 grade → transaction/receipt/history và pending consumer | Chưa account-D1 browser/Android thật |
| mistakes | Guest correction await CAS; page correction companion append-only; account objective/workspace projection; 20/10 origin-revisit commit support trước navigation, retry giữ identity | 25/10 standalone hint/TTS commit trước mở, retry/failure/assistance guard đã nối; handoff T02_MISTAKE_SUPPORT, browser account thật chưa kiểm |
| reader | Normalized command/receipt + chapter answers/support/saved/bookmark; guest/account scoped workspace; storage strict, first error giữ nguyên | Account browser thật, các race hook/long history; account receipt mới chờ cả observation và chapter ack |
| assessment | Placement/level-check await durable evidence; normalized attempts/session open-submit-abandon rebuild từ real receipts; offline mock pending/run/answer/result projection | Mock answer chỉ đầy đủ trên thiết bị có run; server khác thiết bị hiện chỉ có summary; legacy session thiếu receipt chưa backfill; browser/D1 thật |
| dictionary | Lookup exposure, reveal support, manual self-review; immutable display digest; core save/tombstone clocks cùng document transaction; 20/10 TTS từ/câu ví dụ ngoài study dialog là synthetic/requested support | Legacy clocks trước instrumentation chưa backfill; challenge resume chưa bền; không xác nhận đã nghe từ click TTS |
| speech | Legacy transcript awaited; manual/acoustic reports primary workspace; account journey chờ ack; 20/10 TTS request ở route Quest thật + legacy; Quest open/self-review/replay resume từ primary workspace với frozen source digest; guest reload/two-tab same-item/history qua CUA, handoff T02_SPEECH | Còn account-D1, intermediate playback-ended/current guidance resume, legacy mission chưa có open record; không coi aggregate âm học/TTS là tone mastery |
| writing | 21/10 primary snapshot+history/CAS; lobby/runner owner/reset/source digest, first-choice/correction, support/TTS/reveal/rescue, guided/paper/keyboard self-review, summary session; legacy normalizer nhận đúng character-forge released và recovery dùng clock thật; account pending/result guard | Handoff T02_WRITING; còn final gates, writing account-D1 thật, stroke trace/layer/playback-ended resume, multi-device conflict UI và dynamic character aggregate |
| overview | Access workspace history; consumer cũ phân biệt support/exposure/review pending; G09 journey scope dùng epoch IDB thật, giữ raw lỗi | Chưa audit lại toàn bộ counts/day/queue sau generic adapters; G09 old-tab browser chưa nghiệm thu |
| profile | Awaited profile patch CAS; preference event cùng IDB/D1; A01 guest avatar và T03 UI đang IN-REVIEW | Backfill clock cũ, device-only preferences; A02 account/native và T04 full recovery chưa làm |

## Contract và authority

### Delta speech/revisit 20/10 · vẫn IN-REVIEW

- Source route Nói thực: App.tsx lazy PronunciationQuestPage. TTS word/phrase
  commit primary support trước playback, legacy cũng nối; synthetic/requested
  khác callback ended, không evidence nghe/phát âm. Không upload câu/transcript.
- speechSession.ts lưu open versioned và self-review cùng history transaction;
  open đồng thời cùng identity, replay ID mới, complete rebase journal trước UI,
  reload chọn mục chưa làm. Source digest toàn phrases+mission/version, phiên bản
  khác không nhận kết quả cũ. Account pending chờ ack, guest local-practice.
  Việc nghe dở/callback ended/current microphone report chưa resume đầy đủ.
- Giữ chính sách reward cũ; history không gọi reward, FSRS, completion bài gốc.
  Consumer completion/journey không chạy trên state cũ trước hydrate source mới.
- Optional skill giữ từ evidence/task thật qua primary/descriptor/projection;
  legacy không có giữ null. Retry thêm metadata skill không rewrite immutable
  unknown cũ; không suy speaking score từ skill target của support.
- Revisit gắn source lesson/item/version thật; click chỉ navigation-requested,
  không bằng chứng đã đọc. Browser guest: wrong boot1→Nghịch Cảnh Lục→hint→mở
  nguồn→Profile history là1objective sai+1support, không resolved;9event cũ còn
  nguyên, tổng11qua reload. Grid Profile overlap Premium đã sửa bằng intrinsic
  rows; keyboard Enter mở nhật ký đúng. Không dùng fixture thay account-D1.
- Speech-sessionv2 5file/34test, supportv1 3file/28test qua (overlap); typecheck
  v26/v27 qua. V3/skill delta và browser resume đang kiểm, chưa khép T02.

- `business-activity` mở rộng schema1 có taxonomy riêng, không nới authority
  objective lesson/review. Mọi event `masteryEligible:false`. Transcript, stroke,
  paper, rating, reveal, TTS không thành independent recall hay cấp XP/unlock.
- Account correction/Reader/workspace history cùng batch nghiệp vụ. Assessment
  history đọc attempts và completed idempotency receipts thật; active exam chỉ
  outcome unknown, không leak answer keys. Session records không thêm số đáp án.
- Saved words/profile: event identity hash clock + module + item, không hash tên
  hoặc bịa content version; version học liệu `unknown`, source contract
  `cloud-document-v1`. Metadata không chép tên cá nhân. Import đánh dấu imported,
  reset không biến thành hành động học. Canonical D1 CAS thất bại không tạo history.
- `recordDocumentMutation` rebase state IDB, CAS/retry, commit trước UI. Account
  lưu từ không tạo card FSRS giả trong local mirror. Guest policy tạo card cũ giữ.
  Lỗi history quota rollback state/document/outbox; UI không báo saved thành công.
- Dictionary lookup/reveal/self-review có primary descriptive workspace record
  cùng immutable history, không request analytics sau sự kiện. Nội dung thực được
  digest; sửa nghĩa cùng operation bị từ chối, lần tra mới có hoạt động mới.
- Offline mock có `started/submitted` riêng; submitted chưa result là pending.
  Chỉ real result mới confirmed; summary không thêm objective. Phát hiện producer
  dùng formHash làm changeId cho mọi run cùng form: đổi sang run-scoped identity,
  projection legacy cũng dùng run ID để không rơi history/cộng trùng provisional.
- Tất cả store đọc lỗi/schema lạ phải giữ raw; không trả empty rồi ghi đè. Shared
  lesson reader đã tách validation business account khỏi restriction guest lesson.
- Workspace source không có thời gian hành động thật giữ occurredAt:null và
  clockSource:unknown, không lấy changedAt backfill giả giờ thực hiện. Có
  savedAt/answeredAt/occurredAt thật thì giữ giá trị nguồn.
- Expansion có immutable session/reveal/review, contiguous cursor và version,
  rebase tab/explicit replay; không completion bài gốc. Guest CUA chặng2mục đã
  kiểm reveal→reload, next→reload giữ2/2, finish; account pending không “đã khép”.

## Bằng chứng thực tế (không cộng overlap)

| Gate | Kết quả / log |
| --- | --- |
| Targeted mốc v4 trước dictionary/document | 18 file/137 test pass, `tmp/personalization-continuous-history-tests-v4.log` |
| Generic history v6 | 5 file/13 test pass; sửa receiptRef legacy before-image, `tmp/personalization-continuous-history-tests-v6.log` |
| Reader/history v7 | 7 file/20 test pass, `tmp/personalization-continuous-history-tests-v7.log` |
| Document v3 | 3 file/57 test pass, `tmp/personalization-continuous-document-tests-v3.log`; actual SQLite CAS + rollback trigger, không D1 thật |
| Assessment v2 | 6 file/79 test pass, `tmp/personalization-continuous-assessment-tests-v2.log` |
| Assessment/mock v3 | 7 file/32 test pass, `tmp/personalization-continuous-assessment-tests-v3.log`; pending→result, 2 run cùng form, legacy changeId |
| Targeted final v1 | 13file/102test pass, `tmp/personalization-continuous-targeted-final-v1.log` |
| History v8 | 7file/22test pass, `tmp/personalization-continuous-history-tests-v8.log`; unknown time không lấy backfill clock |
| Typecheck | v9/v12/v13 đã pass; v14 đang chờ exit cuối, không suy pass từ header |
| Lint | Global v4 pass; scoped v5 pass trước assessment/mock cuối; cần global cuối |
| Full check 19/10 | Đang chạy `tmp/personalization-continuous-full-check-v1.log`; chưa nhận pass, giữ timeout gate cũ là fail |

Guest browser thật qua ClientRuntime/storage tại preview4325:

- Reader support → quota khi answer không đổi source/feedback → wrong→correct
  giữ2immutable answers → reload vẫn2, XP0/no completion → corrupt raw vẫn giữ,
  hiển thị lỗi. Mobile390×844 footer bottom844; không overflow/pageerror.
  Script/log `tmp/personalization-continuous-reader-browser.*`.
- CUA trực tiếp Dictionary: open detail → saved → voluntary reveal → finish →
  reload → Ngọc lệnh vẫn “Đã lưu ngọc giản”. Không gọi đây là account/D1.
  Ảnh `tmp/personalization-continuous-dictionary-reload.png`.

## Tiếp tục không audit lại

Đọc checkpoint + `PERSONALIZATION_EXECUTION.md`, ghép binding theo T00→T01→T02
lessons→review→continuous. Delta continuous chỉ là snapshot WIP, không nghiệm thu.
Không sửa hash baseline cũ để làm validator xanh; chỉ audit source mới lệch.

1. Đọc exit/log full check và typecheck/lint cuối; khi fail tìm đúng nguyên nhân.
   Không tăng timeout/xóa test. Bổ sung route auth/owner/reset tests cho activity
   endpoint, journal reject/schema/crash/account race và browser còn thiếu.
2. Hoàn thiện T02 curated expansion, revisit, speech playback/resume, writing scope,
   mock per-answer server projection, backfill clocks và consumer count/journey.
3. Tiếp tục T03/T04, A01/A02 và T05–T19 theo task table, không dừng ở mốc này.
   Account avatar, full recovery và adaptive nội dung chưa implementation; không gán
   BLOCKED cho phần việc chưa làm. Human review/audio/recall/cohort/device là
   giới hạn riêng, không ngăn mọi phần độc lập khác.

Giữ HSK0 4/4 rich0/4, HSK1–4 rich40/40/55/78=213/213; không đổi nội dung,
scoring adapter/migration/IDs. Không sửa docs/reports/output, không xóa .wrangler,
không commit/push/deploy/APK. Source local/preview khác bản đã phát hành.

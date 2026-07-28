# Kiến trúc kỹ thuật mục tiêu

## 1. Trạng thái hiện tại

Foundation là React + TypeScript chạy trên Vinext/Vite và Cloudflare Worker.
Luồng học vẫn local-first; localStorage giữ projection tương thích và IndexedDB
giữ checkpoint/outbox theo từng chủ dữ liệu. Mã nguồn có đường đăng nhập
ChatGPT và API cùng-origin dùng logical D1 binding, nhưng đường này chỉ trở
thành dịch vụ đồng bộ khi D1/hosting đã được provision và xác minh. `ts-fsrs`
phụ trách scheduling và `hanzi-writer` phụ trách animation/quiz nét.

Phase 1 closed alpha triển khai repository D1 như đường khôi phục durable theo
[ADR 0001](./adr/0001-d1-closed-alpha.md); D1 chỉ là nguồn vận hành sau khi môi
trường hosted được provision và kiểm chứng. PostgreSQL trong sơ đồ dưới đây vẫn
là đích production khi quy mô, transaction/event ingestion và vận hành vượt
giới hạn closed alpha.

Ứng viên nội dung hiện tại là `foundation-2026.07.6`, content schema v6 /
item catalog v4. Full governance catalog có 74 payload thuộc 7 item type và giữ
cả 24 lesson authoring;
manifest bind catalog, runtime ID graph, sanitized runtime catalog, coverage
envelope cùng snapshot bất biến của blueprint/lesson guide và item bank/scoring
lesson + assessment. Validator kiểm strict payload schema, typed prerequisite
graph, lesson knowledge membership, toàn registry/lineage và live-source drift
của package runtime-bound.

Client chỉ import `runtime-catalog.json`: allow-listed projection gồm 24 lexeme,
14 lesson beta/published và 1 graded text. Draft/review content, owner/license,
review/evidence, audio governance, item hash và payload grammar/pronunciation/
character/communicative-function không đi vào runtime bundle. Full authoring
inventory được tái dựng từ immutable item catalog trong tooling, không từ
runtime projection.

Package vẫn là candidate: owner/license đều rỗng, review envelope v2 không có
approval, coverage envelope v2 không có claim, audio catalog rỗng và chưa có
promotion. Bởi vậy 24 lexeme hiện hữu vẫn đóng góp **0 reviewed lexeme** vào
release gate. 25 knowledge item mới đều ở state `review`. Bảy character item
đã bind radical, IDS cấu trúc/cấu kiện và stroke bytes vào source record bất
biến; đây là dữ liệu chờ review, không phải dữ liệu đã được duyệt. Tooling đã có
đường import audio bất biến cho
schema v5/catalog v3 với byte-derived WAV metadata, transcript alignment,
speaker/rights binding và staged validation; audio legacy không được tính vào
release gate. Candidate hiện tại chưa dùng đường này và vẫn không có audio hay
evidence thật. Không được suy diễn rằng WS2 hoặc A0 đã hoàn tất.

Candidate `.07.6` là lần chạy thật đầu tiên của đường import character
source-addressed. Descriptor phủ đúng bảy character item, bind payload nguồn,
Make Me a Hanzi radical record, CJKVI IDS record và Hanzi Writer record bằng
SHA-256 cùng character record key, inspect JSON/stroke từ bytes, rồi
staged-validate trước atomic handoff. Mọi component role vẫn là `graphic`; cấu
trúc được ánh xạ từ IDS ghim revision, không suy diễn từ hình glyph. License
`CHISE-IDS-terms` được giữ như định danh thận trọng chờ legal review, không bị
đổi thành một SPDX claim chưa được chứng minh. Legacy character fields không
còn được tính là release evidence. Runtime projection vẫn loại character item,
Characters UI fail closed và public build không phát stroke JSON, nên metadata
chưa duyệt không xuất hiện với người học.

Lifecycle schema v6 bảo toàn cả audio lẫn character artifact qua routine
versioning và hai importer chuyên biệt. Bytes kế thừa được capture một lần từ
regular file trong trusted package tree, kiểm identity/realpath, ghi vào staging
rồi inspect lại trước registry handoff. Audio target chỉ được rebind khi
transcript vẫn canonical; thay asset phải giữ cùng target, còn xóa target đang
bind bị từ chối vì retirement chưa được triển khai. Validation graph dùng
iterative traversal và reachability bitset có giới hạn bộ nhớ/edge để tránh
stack overflow và closure scan bậc hai nhưng vẫn fail closed khi vượt trần.

## 2. Kiến trúc production đề xuất

```text
Web / iOS / Android
        |
API Gateway + BFF
        |
+-------+---------+------------+-------------+
| Identity        | Learning   | Content     |
| Subscription    | Memory     | Assessment  |
| Social          | Speech AI  | Notification|
+-------+---------+------------+-------------+
        |
PostgreSQL + Redis + Object Storage + Search + Event Bus
        |
Warehouse / Experimentation / Model Training / BI
```

## 3. Bounded contexts

- **Identity**: account, profile, consent, devices, guardian/child.
- **Curriculum**: course graph, prerequisites, variants, localization.
- **Content**: lexeme, sense, example, audio, lesson, story, license.
- **Learning**: session, attempt, hint, error taxonomy, mastery evidence.
- **Memory**: FSRS card state, review log, per-skill stability/difficulty.
- **Assessment**: test form, item bank, rubric, score, item statistics.
- **Speech**: upload, ASR, pitch/phoneme features, feedback artifact.
- **Commerce**: product, price, subscription, entitlement and invoice.
- **Social**: guild, league, season, moderation and anti-cheat.

## 4. Data model cốt lõi

```text
User -> Enrollment -> CourseVersion
CourseVersion -> Unit -> Lesson -> Activity
Lexeme -> Sense -> Example -> AudioAsset
Character -> Component -> StrokeData
UserSkillState(user, skill, mastery, confidence)
MemoryCard(user, knowledgeItem, modality, fsrsState)
Attempt(user, activityVersion, response, score, latency, feedback)
ReviewLog(card, rating, scheduledAt, reviewedAt)
```

Mọi activity và content phải versioned. Attempt luôn trỏ vào version đã thấy để giải thích lịch sử sau khi biên tập nội dung.

## 5. Event model

- `lesson.started`, `activity.answered`, `hint.used`.
- `pronunciation.submitted`, `pronunciation.scored`.
- `review.graded`, `lesson.completed`, `mastery.changed`.
- `quest.completed`, `subscription.changed`.

Event được ghi append-only, có idempotency key và schema version. Read models phục vụ dashboard, recommendation và analytics.

### Protocol đồng bộ Phase 1

- Mỗi thiết bị có installation ID, device ID và sequence tăng đơn điệu.
- Mọi mutation được ghi cục bộ trước, sau đó đưa vào IndexedDB outbox bằng operation ID ổn định; retry không tạo khóa mới.
- API chỉ lấy user từ identity header phía máy chủ, kiểm tra owner, origin, request hash và unique `(user, device, sequence)`.
- API chỉ nhận đúng content version đang được server phát hành. Snapshot legacy có thể được đối chiếu lại với item bank để kiểm tra, nhưng mọi kết quả từ `/api/sync` vẫn là `unverified` và không tạo mastery/knowledge; chỉ command attempt chuẩn hóa gắn với session phía server mới có thể trở thành evidence có thẩm quyền.
- Snapshot legacy không bao giờ materialize lesson completion hoặc mở prerequisite, kể cả khi tự khai đủ đáp án đúng và một completion. Lesson session chuẩn hóa phải nộp đủ form server-issued, chứng minh owner, enrollment, content/activity version và exposure, đồng thời đạt gate/required-item policy trước khi projection server có thể công nhận hoàn thành.
- Evidence/activity hợp nhất theo ID; profile và diagnostic dùng Lamport LWW; saved word dùng tombstone; reset dùng epoch.
- Reset là command tường minh, phải tăng đúng một epoch trên revision hiện tại. Trạng thái local rỗng/hỏng không bao giờ được suy diễn thành reset.
- Cloud canonicalization xóa XP/streak baseline, mistake aggregate và FSRS
  schedule do client tự khai khỏi snapshot legacy. XP, mastery và lesson
  progress chỉ được materialize từ ledger/command chuẩn hóa có thẩm quyền.
  Authenticated Review dùng scheduler `ts-fsrs` phía server với fuzz tắt; replay
  FSRS local tương thích cũng tắt fuzz nhưng không được nâng thành cloud
  authority.
- `speech-transcript` là local-only, bị loại trước khi tạo document và bị API từ chối nếu xuất hiện trong payload.
- Revision/cursor dùng compare-and-swap trong D1 batch. Idempotency có lease xử lý, unique operation marker và response canonical để response bị mất có thể retry mà không nhân đôi cursor/evidence.
- Mỗi chuyển owner tăng một generation lưu trong IndexedDB. Checkpoint, enqueue,
  acknowledge và adoption đều đối chiếu generation trong chính transaction;
  một tab cũ không thể ghi sống lại outbox/checkpoint của owner đã bị chuyển.
- Trước khi nhập dữ liệu anonymous vào account, client luôn tải canonical account
  revision/reset epoch. Dữ liệu anonymous được rebase lên epoch hiện tại, còn
  checkpoint account thuộc epoch trước reset bị loại thay vì hồi sinh.
- Server giữ bản đã commit khi evidence/activity trùng khóa, và giữ lịch sử
  exposure qua mọi lần tái chấm. Thay ID rồi backdate không biến lượt lặp thành
  mastery mới; retry idempotent trả canonical snapshot hiện tại, không trả lại
  snapshot trước reset.
- Khi chưa giải quyết được identity, UI chỉ mở offline nếu persisted owner được
  chứng minh là anonymous. Cache account tiếp tục bị che để tránh lộ chéo user.
- Bootstrap learning state chọn primary/recovery snapshot đúng một lần bằng
  lazy initializer trước khi runtime đồng bộ khởi động. Snapshot primary hỏng
  được quarantine thay vì âm thầm ghi đè bằng state mặc định; reset/import chỉ
  thay state sau khi durable mutation đã commit, tránh mất tiến độ khi storage
  hoặc enqueue thất bại.

### Projection học tập chuẩn hóa Phase 2

- `POST /api/learning/lesson-sessions`, `/attempts`, `/submit` và `/abandon`
  ghi marker tối thiểu vào `sync_changes` trong cùng transaction với dữ liệu
  normalized. Marker có reset epoch và không chứa selected answer hay answer key.
- Reader authenticated dùng cùng objective-attempt boundary để máy chủ chấm
  câu đọc hiểu. Vì chưa có reader session versioned để chứng minh support và
  exposure, evidence này vẫn `masteryEligible: false`.
- `POST /api/assessment/sessions`, `/attempts`, `/sessions/submit` và
  `/sessions/abandon` quản lý form khảo sát riêng. Form chỉ được cấp từ item
  server-confidential đủ điều kiện; client không gửi correctness, score,
  answer key, routing hay mastery.
- `GET /api/learning/projection` dựng read model theo authenticated tenant,
  current reset epoch, exact manifest và active released enrollment. API trả form
  đang dở không có đáp án, submitted lesson summaries và các đếm objective
  evidence; nó không trả mastery probability, XP, streak hay tuyên bố HSK.
- Media type V2 giữ nguyên projection V1 và bổ sung một active assessment
  session không có learner response, answer key hay item-level outcome, cùng
  aggregate assessment gần nhất. Aggregate chỉ gồm `k/n`, trạng thái quan sát và
  khoảng Wilson 95%; nó luôn uncalibrated, `masteryEligible: false`, không định
  tuyến và không mở prerequisite.
- Projection chỉ đọc evidence có attempt verified tương ứng. Aggregate
  `lesson-completion`, evidence không kiểm chứng và row từ reset epoch cũ không
  được dùng cho mastery hoặc prerequisite.
- Cursor chỉ là invalidation token của normalized read model. Reset epoch vẫn
  là boundary độc lập; client phải bỏ cache nếu epoch khác ngay cả khi cursor
  trùng.
- Projection và resume client được lưu trong IndexedDB theo
  `(ownerKey, resetEpoch, entryKey)` và mọi read/write/delete đều CAS owner
  generation. Reset, adoption và account deletion purge derived cache thay vì
  reassign nó sang owner khác.
- Lesson và assessment UI authenticated có thể nhận active session từ projection
  cache của đúng owner/reset/manifest để tiếp tục trên thiết bị khác. Adoption
  không tạo open receipt giả; anchor được refresh theo cursor tăng đơn điệu và
  tập attempt bất biến. Cursor lùi, attempt bị rút lại hoặc terminal dependency
  đều bị từ chối.
- Active session của content version lịch sử không làm cạn quota form của
  current version. Endpoint abandonment vẫn có thể kết thúc một session cũ
  thuộc đúng tenant/current reset epoch vì thao tác này không tạo mastery.
- `GET/HEAD /api/learning/reviews` chỉ trả thẻ đến hạn thuộc đúng owner, reset
  epoch, enrollment, content release, scheduler và lesson session kích hoạt đã
  pass. `POST /api/learning/reviews/grade` bind chính xác queue offer vào
  card/revision, word/version, reset epoch, release và activation session trước
  khi server chạy `ts-fsrs` không fuzz.
- Review grade ghi atomically card revision, attempt/evidence không kiểm chứng
  và không đủ điều kiện mastery, review log, `review.graded`, sync marker và
  idempotency receipt. Client ghi grade vào owner-scoped durable outbox trước
  khi chuyển thẻ; cache queue chỉ hỗ trợ resume/preview và phải được server xác
  nhận lại trước khi grade. Đường này không ghi XP.

`AuthenticatedLessonPage`, Reader authenticated,
`AuthenticatedAssessmentPage` và `AuthenticatedReviewPage` hiện dùng command
outbox/projection hoặc queue chuẩn hóa; anonymous lesson/Reader/Review vẫn giữ
local flow, còn anonymous assessment dùng `LocalAssessmentPage`. Snapshot
`/api/sync` vẫn chỉ là compatibility projection. Lesson/Reader/assessment
command có thể tạo kết quả server-scored theo policy của từng mode; Review/FSRS
có queue/grade authority riêng. XP vẫn chưa có ledger authority và không được
phục hồi từ aggregate do client tự khai.

Account export schema v4 bao gồm graph assessment, Reader và Review/FSRS thuộc
tenant nhưng không biến export thành answer-key endpoint; account deletion
cascade toàn bộ graph đó. Restore rehearsal cục bộ áp dụng 12 migration
`0000`–`0011`, khôi phục 25 bảng và kiểm tra checksum của form/response
assessment cùng Reader. Migration
`0008` thêm `assessment_sessions.terminal_reason`, ràng buộc terminal state bằng
trigger và chuyển session `started` thuộc reset epoch cũ sang `abandoned` với lý
do `reset-invalidated`; đây là sửa lỗi tránh hồi sinh persisted assessment
state, không phải bằng chứng hosted restore. Migration `0009` bind FSRS card vào
lesson session kích hoạt; migration `0010` chỉ cho card có activation authority
tham gia unique key theo scheduler version và thêm insert/update trigger buộc
outbox `review_log` khớp đúng owner, aggregate và reset epoch.
Migration `0011` thêm Reader session/exposure/attempt graph versioned, khóa
terminal transition và ràng buộc Reader outbox vào đúng owner/reset epoch.

SIWC hiện chỉ cung cấp email đã xác thực và tên hiển thị cho ứng dụng. Vì chưa có immutable provider subject hoặc luồng liên kết danh tính được xác minh, thay đổi email có thể tạo một identity mới. Đây là giới hạn closed-alpha và là release blocker cho public account recovery; không được mô tả email hash hiện tại như một account ID bất biến.

## 6. Adaptive learning

`NextBestAction` kết hợp:

1. Review quá hạn và xác suất quên.
2. Prerequisite chưa vững.
3. Mục tiêu và thời lượng còn lại trong ngày.
4. Cân bằng modality để tránh chỉ luyện recognition.
5. Tín hiệu mệt mỏi: latency, bỏ qua, lỗi liên tiếp.

Mô hình phải trả về reason code có thể giải thích cho người học.

## 7. Speech stack

Foundation dùng Web Speech API và luôn có fallback vì `SpeechRecognition` chưa đạt Baseline trên mọi trình duyệt. Transcript/điểm khớp này chỉ ở thiết bị,
`unverified` và mastery-ineligible. Adapter pipeline server vẫn tắt mặc định;
production chỉ được cân nhắc sau khi có:

1. Client ghi âm và xin consent.
2. Voice activity detection và noise checks.
3. ASR Mandarin + forced alignment.
4. F0 contour, tone classification, initials/finals confidence.
5. Feedback generator tạo nhận xét hành động được.
6. Audio xóa theo retention policy hoặc lưu khi người dùng opt-in.

## 8. Bảo mật và riêng tư

- OIDC/OAuth 2.1, WebAuthn, rotating refresh token.
- Row-level authorization và tenant isolation cho School.
- Encryption in transit/at rest; secret manager; audit log.
- Consent riêng cho voice, personalization và research data.
- Export/delete account; data minimization cho trẻ em.

## 9. Vận hành

- `GET/HEAD /api/health/live` chỉ xác nhận process liveness; nó không chạm D1.
  `GET/HEAD /api/health/ready` chỉ kiểm tra aggregate runtime + D1 schema
  sentinel. Cả hai dùng server-generated request ID, `no-store`, `noindex` và
  không lộ binding, migration hay release blocker.
- Readiness failure ghi envelope allow-listed gồm event, request ID, status,
  retryability và failure class. Monitoring sink, retention owner, alert routing
  và SLO production chưa được cấu hình.
- `config/production-readiness.json` là ma trận fail-closed cho đúng content
  version. Chín gate về linguistic review, content activation, assessment
  calibration, immutable identity/recovery, hosted restore, independent
  security/privacy review, operational ownership/SLO/incident response,
  load/accessibility/performance và Sites ownership/hosting đều đang `pending`;
  `verify:production` fail closed với 23 blocker. Sites được để đến bước release
  cuối và chưa được xác minh.
- Destructive actions trong profile, lesson và assessment dùng dialog chung có
  focus ban đầu, Tab trap, Escape, mô tả accessible và focus restore; không dùng
  native `alert()`/`confirm()`.
- Runtime client được lazy-load từ bootstrap shell. Khi module này chạy,
  `LearningProvider` khôi phục persisted state trong lazy initializer trước khi
  sync và route có gate bắt đầu dùng state; các route chính tiếp tục lazy-load.
  Radiogroup hỗ trợ roving focus/Arrow/Home/End; smoke mobile kiểm tra focus
  trap/restore, điều hướng bàn phím, reduced motion và không tràn ngang.
- Service worker chờ `Promise.allSettled` của toàn bộ shell write trước khi dọn
  cache lỗi, nên một task chậm không thể tạo lại partial cache sau cleanup. Đây
  mới là local regression evidence; final hosted cache/header behavior vẫn phải
  được kiểm tra lại.
- Server outbox đã có event contract allow-listed, D1 lease/CAS lifecycle,
  bounded retry, dead-letter transition và tenant-scoped replay primitive được
  kiểm thử cục bộ. Runtime import của publisher/repository bị gate tắt vì dedupe
  không tự giải quyết race reset/delete qua hệ thống: sink thật phải kiểm tra
  authoritative account/reset epoch tại downstream commit hoặc read boundary.
  Chưa có scheduler, sink/dedup, operator-authenticated replay surface hay hosted
  delivery evidence, nên đây chưa phải event-delivery service đang vận hành.
- `release:evidence` tạo manifest build hash và CycloneDX 1.5 SBOM có thể tái
  lập. Chạy local mặc định chủ ý ghi `sourceRevision: null` và
  `attestable: false`; production
  evidence chỉ hợp lệ từ clean exact HEAD và khi mọi gate đã được phê duyệt cùng
  bind source revision, content manifest và build digest.
- Snapshot kỹ thuật local ngày 27/07/2026 qua 134 file/1.077 Vitest và 18/18 E2E.
  Trần bảo thủ cộng toàn bộ asset client với hero lớn nhất là 403.5 KiB; đây
  không phải đo lường initial transfer thực tế. Ba Lighthouse cold-profile đạt
  Performance 97/95/97, median P97/A100/BP100/SEO100, LCP 1,894 ms, CLS 0 và
  TBT 169 ms.
  `npm audit --omit=dev` báo 0; các số này không thay thế qualification hosted.
- Feature flags, experiment assignment ổn định, content-quality dashboard,
  central monitoring sink, accessibility/visual regression toàn diện và load
  test vẫn là target tiếp theo, không phải trạng thái production hiện tại.

# Rà soát khả năng vận hành HANZI.OS

Ngày: **12/10/2026**. Module audit: **IN-REVIEW**. Đây là kết quả rà soát code,
kiểm thử cô lập và đọc trạng thái hosted; không phải chứng nhận production,
không đổi trạng thái nghiệm thu các module và không tự mở thu tiền.

## Kết luận

Premium, Xưởng, Admin và dữ liệu học đã có liên kết thực. Tuy nhiên chưa đủ
bằng chứng và còn lỗi có thể tái hiện để cam kết vận hành công khai/thu tiền.
Hiện phù hợp bản học thử cá nhân; cần sửa các lỗi bên dưới và nghiệm thu trọn
luồng trên staging trước mở thương mại. Không cần viết lại toàn bộ hệ thống.

## Trạng thái hosted đã đọc trực tiếp

- Worker hiện hành `a49d9d55-8687-45f2-b6cb-85e37289940f`, runtime handler chỉ
  `fetch`; cấu hình không có scheduled handler/service cho content release.
- `HANZI_STUDY_MODE=personal-study`, hai cờ cash/bank transfer bằng `0`.
  Tiền thật và sandbox quyền hosted đều không mở; đây là trạng thái bảo vệ,
  chưa phải một hành trình mua Premium vận hành được.
- D1 có hai role learner, **không có admin hoặc content_editor**; version học
  beta/pending. Không có content revision, release event hoặc release head từ
  Xưởng trong D1 hosted tại thời điểm đọc. Dữ liệu Xưởng local không tự di chuyển.
- Worker version không có binding `HANZI_OS_ADMIN_EMAILS`. Cần bootstrap đúng
  chủ vận hành và nghiệm thu role riêng; không tự dùng email hỗ trợ để cấp admin.
- `/api/health/ready` trả 200: chỉ xác nhận runtime/schema D1, không xác nhận
  chất lượng nội dung, quyền, thanh toán hoặc khả năng phục hồi.
- Gửi header danh tính giả không mở được API admin/studio/export (401).
  URL bài Premium hợp lệ trả 403 khi không có quyền. HTML admin/studio trả trang
  cổng truy cập với no-store; HTTP 200 HTML không đồng nghĩa đã được quyền admin.
- SELECT remote chỉ đọc tổng hợp; `rows_written=0`. Không ghi dữ liệu thật.

## Những phần có bằng chứng implementation

| Luồng | Control đã trace/test | Giới hạn |
| --- | --- | --- |
| Premium | Giá và ngân hàng được chốt theo đơn, idempotency, số tiền và mã đối soát; capture/refund cash cùng ledger/audit transaction; quyền server, expiry và media private | Hosted chưa mở cash; chưa nghiệm thu mua/hoàn thật |
| Xưởng | Revision, rowVersion, validate, submit, approve/publish/archive, release outbox, package/head immutable và digest fence | Guard người duyệt và activation consumer còn lỗi |
| Admin | RBAC server, step-up cho thao tác nhạy cảm, revoke/lock, bảo vệ admin cuối và audit | Một số mutation/audit chưa atomic; hosted chưa có operator |
| Học → lưu tiến trình | Server chấm theo form/answer version; completion, FSRS, mistakes, projection; owner/reset/idempotency/FIFO/LWW | Cần nghiệm thu thay release khi còn journal offline |
| Placement/đề/sách | Đã có editor placement versioned, exam answer source private và đường lịch sử form/version | Một số tài liệu 07/10 còn mô tả gap đã làm; Reader không dùng cùng activation fence |
| Cấu hình | Registration/preferences/announcement/preview có consumer hiện tại | Tài liệu cũ ghi ba setting không có consumer đã lỗi thời |

## Lỗi cần sửa trước khi vận hành

P1: lỗi toàn vẹn/quyền/dữ liệu cần xử lý trước mở phạm vi liên quan.
P2: lỗi cập nhật/UX/hiệu năng hoặc độ bền cần hoàn thiện và đo kiểm.

| Mức | Tình huống và hậu quả | Evidence / tiêu chí sửa |
| --- | --- | --- |
| P1 · tái hiện | Người có cả editor/admin sửa nháp do người khác tạo rồi tự approve được. Guard chỉ so người tạo ban đầu, không so người đóng góp | `contentStudioRepository.ts:882,1165`; SQLite repro `tmp/audit-editor-admin-repro.log`. Ghi contributor của revision, chặn duyệt nội dung mình từng sửa |
| P1 · tái hiện | Grant admin và cập nhật setting đã commit, audit INSERT lỗi thì API báo thất bại nhưng thay đổi vẫn tồn tại, không có audit | `authorizationRepository.ts:264,286`, `systemSettingsRepository.ts:161,166`; cùng log repro. Mutation + audit/outbox cần cùng transaction; failure injection cho role/lock/settings/workflow |
| P1 · tái hiện | Reader thấy sách mới trước khi release worker chạy; revision2 được Reader đọc trong khi runtime head vẫn revision1 | `editorialReaderRepository.ts:74,98,110` so với `contentStudioRepository.ts:1497`. Repro SQLite 2 trạng thái trong `tmp/audit-integration-repro.log`. Reader phải đọc cùng immutable package/head/digest activation |
| P1 · tái hiện | Tài khoản chỉ cần một đơn VNĐ pending đã không xóa được do FK; export không chứa cash orders/events | `syncRepository.ts:45,616`, migration0035. `tmp/audit-premium-cash-delete.log`. Thiết kế export và retention/anonymization ledger; không xóa chứng từ bất biến để né FK |
| P1 · tái hiện route | DELETE account nhận session đã xác thực từ 30 ngày trước mà không step-up | `app/api/account/route.ts:29,105`; mocked route repro `tmp/operational-audit-repro-delete.log`. Dùng recent first-party verification và giữ bảo vệ admin cuối/owner/data |
| P1 · code-confirmed | Đề Premium offline chưa gắn tier/entitlement expiry; cache có thể dùng sau hết hạn, reconnect bị403 và lượt pending không được giải thích | `assessment/offlineMockPractice.ts:5`, `MockExamsPage.tsx:675,911,980`, `sync/offlineMockPractice.ts:68`. Pin quyền có hạn vào package, ngăn mở mới hết hạn, chốt policy phiên đã cấp và giữ đáp án; cần E2E expiry |
| P2 · code/test-confirmed | Form có thể báo đã phát hành dù drain trả retry/dead hoặc chưa xử lý đúng revision | `app/studio/actions/route.ts:135,138,146`, `contentReleaseWorker.ts:859`. Kiểm outcome/head của đúng revision; phân biệt duyệt/chờ/đã phục vụ/lỗi |
| P2 · tái hiện | Promise cache Reader giữ bản cũ vô thời hạn dù response server đã đổi; offline preparation không invalidate cache bộ nhớ | `editorialReaderClient.ts:4`, `readerChapterLoader.ts:216`; repro thứ3 trong `tmp/audit-integration-repro.log`. Invalidate theo manifest/version, giữ phiên đọc đang ghim |
| P2 · code-confirmed | Export cloud bỏ `learner_workspace_entries`: bookmark/vị trí đọc/lịch sử luyện mới | `syncRepository.ts:45`, migration0038. Cập nhật export schema và regression round-trip; delete cascade bảng này vẫn đúng |
| P1 trước nâng version · coverage gap | Parser chỉ nhận current CONTENT_VERSION; journal cũ bị cách ly và có thể chặn đổi account. Backup UI chỉ ghi số lượng lệnh cách ly | `attemptProtocol.ts:156`, `coordinator.ts:1637`, `ProfilePage.tsx:229`. Compatibility window, xuất/khôi phục command graph, rehearsal APK/PWA cũ còn outbox trước nâng package |
| P2 trước mở cash · race chưa E2E | `/api/commerce` không có expected-owner fence; response cookieB có thể được lưu dưới scopeA đã capture. Runtime singleton nội dung không owner/reset fence | `offlineEntitlement.ts:24,44`, `app/api/commerce/route.ts:16`, `usePublishedRuntimeStore.ts:24`. Thêm fence/invalidate và account-switch race regression; chưa chứng minh vượt Premium UI/server |

Staff có authored/uploaded content cũng bị FK attribution giữ lại khi delete;
cần quy trình disable/transfer/anonymize staff bảo toàn học liệu và audit.

## Khoảng trống vận hành cần hoàn thiện

1. **Operator và publisher hosted:** tạo role admin/editor đúng người; nối
   release worker cùng D1, retry/backoff/dead-letter/replay và cảnh báo. Repo worker
   phụ còn cấu hình DB placeholder. Chưa xác minh danh sách toàn bộ worker trên
   tài khoản, nên không khẳng định không có worker phụ bên ngoài repo.
2. **Premium thực tế:** chốt paid/Free/pilot policy; UI hosted còn nói Ví Hanzi
   trong khi ví bị đóng. Hoàn quy trình chuyển khoản thiếu/thừa/trễ, hủy/hoàn,
   tra cứu và hỗ trợ. Chuyển khoản thủ công có thể dùng khi nghiệm thu đầy đủ;
   không bắt buộc tích hợp cổng tự động chỉ để chạy thử. VNPay/MoMo chưa có adapter.
3. **Chất lượng nội dung:** production release validator hiện báo thiếu owner,
   source-license, exact review cho2253 catalog targets; native-reviewed lexemes
   và reviewed graded texts đạt chuẩn gate vẫn0; native audio thiếu2253 targets.
   Inventory213 rich không phải213 bài đã được con người duyệt, và approval trong
   Xưởng không tự tạo `humanReviewed:true`. Cần review thật, provenance và pilot
   trước quảng bá chuẩn đầu ra HSK/điểm phát âm.
4. **Bảo mật:** audit dependency production mới có4 advisories:1 critical,
   2 high,1 moderate. Next16.2.11 nằm trong graph nhưng server dùng Vinext;
   cần xác định code có thực sự reachable, cập nhật có regression và không coi
   npm advisory là bằng chứng host đã bị khai thác. Auth-start ghi challenge
   chưa có persistent throttle/cleanup theo TTL; D1 có14 challenge hết hạn còn
   lưu. Hạn sử dụng credential vẫn được kiểm, nhưng cần hạn abuse/quota/retention.
5. **Backup và sự cố:** local SQLite restore đã có gate; chưa diễn tập restore
   bản D1 hosted vào DB cách ly, đối chiếu tenant/cash/outbox/content heads rồi
   rollback service. Cần lịch backup, thời hạn giữ, mục tiêu mất dữ liệu/thời gian
   phục hồi, người xử lý sự cố và test cảnh báo. Health endpoint không thay các bước này.
6. **Tải và cập nhật:** preparation đọc lại toàn bộ nội dung mỗi5 phút, chưa delta
   theo manifest/ETag. Placement đọc lịch sử release theo mỗi revision; cần batch,
   load test theo quota Free và số người dùng thực, giới hạn media/dung lượng cache.
   Chưa có số đo để nói đã vượt quota hoặc cam kết hosting miễn phí vô hạn.
7. **Thiết bị/UX:** APK thật chưa nghiệm thu; người dùng báo mobile nhiều trang
   quá lớn, Premium bị ẩn và system bars trắng. Đã mở slice shell/Thiên Lộ/
   Thức Tỉnh Điện/Ký Ức Trận để sửa; native login3methods cần cấu hình provider,
   không bật các nút chưa chạy như đã hoàn tất.

## Gate và bằng chứng của lượt audit

- `verify-production-readiness.mjs`: exit1, **9 gate pending /23 blockers**.
  Một số blocker text cũ không phản ánh Google subject hiện có và hosting
  Cloudflare đã chạy; phải cập nhật bằng evidence đúng provider, không xóa gate
  hoặc ép approved. Không cần đưa Sites vào kiến trúc để hợp thức hóa tên gate cũ.
- `content/verify-release.mjs --channel production`: exit1, releaseVerified=false.
- Security/auth/health targeted:11 file/52 test; lifecycle:6 file/34 test;
  publication:3 file/22 test; Editor/Admin:14 file/70 test + consumer5 file/13;
  commerce:8 file/29; integration:19 file/150. Tất cả các lượt này pass, có overlap,
  **không cộng thành một tổng test duy nhất** và không nói full check được chạy lại.
- Các repro assertion pass là chứng minh lỗi còn tồn tại, không phải lỗi đã sửa.
- Logs/harness nằm `tmp/operational-audit-*`, `tmp/audit-editor-admin-*`,
  `tmp/audit-premium-*`, `tmp/audit-integration-*`; artifact tái tạo được, không commit.
- Không đổi runtime/code sản phẩm trong phần audit; không ghi D1 remote/browser
  storage người dùng, không sửa `.wrangler`, `docs/reports/` hoặc `output/`.

## Thứ tự nghiệm thu đề nghị

1. Shell/mobile và đăng nhập trên thiết bị theo phản hồi vừa nhận; riêng audit
   này không coi việc sửa giao diện đã khép các lỗi backend.
2. Xưởng→release→Reader: contributor guard, atomic audit, activation head,
   đúng thông báo + retry publisher, hai tài khoản kiểm duyệt độc lập.
3. Premium→offline→account: cash retention/export/delete, expiry/owner fence,
   policy phiên đã cấp, đủ ngoại lệ đối soát; giữ cash đóng tới khi thử qua.
4. Rehearsal hosted và version upgrade: restore cách ly, outbox chưa sync,
   API failure/retry, package rollback, web + APK nhận đúng bản và đúng account.
5. Review nội dung/pilot/security và đo tải/a11y/thiết bị. Chỉ mở công khai/thu
   tiền theo evidence cho release chính xác; không tự tuyên bố USER-ACCEPTED.

Hành trình staging bắt buộc: editor soạn → reviewer khác duyệt → publisher
activate → Free/Premium thấy đúng nội dung trên web/APK → học/nộp offline →
reconnect có đúng một kết quả → FSRS/mistakes/analytics cập nhật → thay release/
archive/rollback → hết hạn/gia hạn/hoàn → export/delete/restore không mất dữ liệu.

Inventory được bảo toàn: HSK0 4/4 (rich0/4); HSK1–4 40/40/55/78, tổng213/213 rich.

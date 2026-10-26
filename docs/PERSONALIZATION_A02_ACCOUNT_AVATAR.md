## Cá nhân hóa v2 · chốt avatar account và checkpoint Git · 26/10/2026

- **Module:** A02/T19 — IN-REVIEW; chưa USER-ACCEPTED hoặc hoàn tất toàn bộ kế hoạch.
- **Người học thấy gì:** chọn/cắt/lưu/gỡ avatar account private trong cùng UI guest; ảnh guest không tự gửi. Retry giữ exact bytes/operation, stale remove không xóa ảnh mới. Local Vite và wrangler.local bật Images offline với remote:false; cloud config chọn riêng không đổi. Thiếu encoder vẫn fail-closed. Không áp migration lên .wrangler của người dùng.
- **Đã kiểm:** fullv29 CHECK_EXIT0:565file/3634test, typecheck/global lint/content/DB/restore43migration64table/build qua;239JS/192private markers vắng, advisory+388.3KiB. Sau fullv29, delta2file chỉ cấu hình binding local kiểm typecheck/lint/buildv1 exit0, cùng239JS/192markers. Targetedv5 8file/63test; Gradle offline policy4/cookie2/example1 qua; browser component3/3. D1 cascade thật qua: xóa synthetic owner→cả3bảng avatar0, owner khác1 và bytes nguyên. Full app compiled4327 với session cookie có sẵn+bản sao D1+Images offline: chọn ảnh tổng hợp/cắt bằng bàn phím→save→Header/Profile cả2ảnh256×256→reload vẫn cả2; tùy chọn10phút/Giao tiếp còn,0XP. Không mock identity trong proof full-app này.
- **Giới hạn:** PWA update prompt lần đầu trên server cold báo chưa cập nhật được; chọn Để cập nhật sau, reload dùng UI mới và avatar đã qua. Không gán PWA update pass. Projection409 giữ policy nội dung; không bypass để mở adaptive. Native picker/cancel/device, persistent offline account avatar cache, bounded history/oversized recovery, các consumer/human review/cohort vẫn mở. Cấu hình local không chứng minh cloud high fidelity hoặc commercial readiness.
- **Dữ liệu giữ được:** HSK0 4/4 rich0/4; rich40/40/55/78=213/213. Account clone so pre-v20 giữ65/65immutable,0thiếu/đổi,integrityOK/FK0; avatar1metadata/1chunk/1receipt. D1 nguồn và browser storage gốc giữ, không clear storage. IDs/first-response/FSRS/mistakes/resumes/outbox/owner/reset không đổi authority. Binding403/0drift; baseline scoring/content pins giữ nguyên. Fullv26 fail restore pin; v27 dừng do native header gap; v28 dừng sau query51>50; các lỗi đã sửa và log giữ.
- **Git:** người dùng yêu cầu commit/push; checkpoint tích hợp gồm dependency kế thừa runtime/auth/PWA/native/cá nhân hóa. Rà staging loại docs/reports, output, design-explorations, deliverables, cache/build, DB/credential/APK; diff --check sạch. Chuẩn bị commit lên codex/pause-2026-09-16→origin cùng nhánh, không main/force/deploy. Không tự nghiệm thu USER-ACCEPTED/humanReviewed.
- **Tiếp theo:** hoàn tất Git checkpoint theo yêu cầu; các hạng mục còn mở giữ trong sổ task và handoff A02_ACCOUNT_AVATAR, không gọi toàn bộ kế hoạch đã xong.

## 26/10 · deletion query budget và checkpoint Git theo yêu cầu

Fullv28 phát hiện route finalization dùng51query vượt giới hạn50; log giữ nguyên,
dừng suite sau khi xác nhận lỗi bằng targeted route15test (14pass/1fail). Không
nâng quota hoặc nới assertion. Ba bảng avatar chỉ FK trực tiếp tới users với
ON DELETE CASCADE; bỏ3explicit DELETE dư, giữ guarded parent DELETE cùng transaction
và receipt. Targetedv5 8file/63test TEST_EXIT0 gồm route budget≤50, xóa account
hosted/thường và ảnh owner khác nguyên vẹn. Fullv29 đang chạy trên source cuối.

Người dùng đã yêu cầu làm xong rồi commit và push. Chuẩn bị checkpoint tích hợp
trên codex/pause-2026-09-16→origin cùng nhánh; không push main/force/deploy. Stage811
file dự án gồm các dependency runtime/auth/PWA/native/cá nhân hóa kế thừa; không
stage docs/reports, output, thiết kế tham khảo, deliverables, build/cache, DB,
credential hoặc APK. Secret scan không thấy key/token thật; marker private-key
trong validator và fixture Firebase đã audit là code/generation, không credential.
Git fetch lúc rà soát0ahead/0behind. Lock Git rỗng từ12/10 đã lưu bản sao tmp và
gỡ sau xác nhận không có Git process. Sửa whitespace-only11file (10code+1handoff),
staged diff --check qua. Binding401/0drift sau audit12file; không đổi baseline
scoring/content hoặc human acceptance. Chưa coi source IN-REVIEW là toàn kế hoạch
đã hoàn tất. Chờ gate và full-app cookie proof trước commit/push.

## 26/10 · native avatar transport delta

Audit Java phát hiện bridge giữ binary nhưng bỏ If-Match/x-avatar-operation.
HanziDevicePlugin hiện chỉ chuyển hai header này trên đúng /api/account/avatar
PUT/DELETE; Cookie/Authorization/Origin/Host vẫn không nhận từ JS. Owner và
idempotency filters cũ giữ nguyên. JS transport kiểm byte[0,255,128,17,200],
revision/operation trên PUT/DELETE. Targetedv4 7file/48test TEST_EXIT0.

Gradle --offline --no-daemon :app:testDebugUnitTest qua bằng JDK21/SDK đã có:
NativeNetworkPolicy4/4, NativeSessionCookie2/2 và ExampleUnitTest1/1;0skip/fail/error.
Không download/install, build release/APK hoặc đổi key/account/permission ngoài.
Đây là Java/transport proof, chưa picker/cancel/network trên Android thật.

Fullv27 dừng chủ đích khi phát hiện header gap, trước sửa runtime; đánh dấu
INTERRUPTED_KNOWN_NATIVE_AVATAR_HEADER_GAP, không pass. Fullv28 đang chạy trên
source cuối. Binding393/0drift sau audit3file native; không đổi baseline.

# A02 · ảnh đại diện tài khoản

26/10/2026 · IN-REVIEW. Chưa USER-ACCEPTED, chưa triển khai public hoặc nghiệm thu Android.

## Hành vi

Chân dung dùng cùng màn hình chọn/cắt/xem trước cho guest và account. Guest
vẫn lưu ảnh trên thiết bị; không tự nhận hoặc gửi ảnh guest khi đăng nhập.
Account đọc ảnh bằng request riêng có owner header, qua URL Blob trong Header
và Hồ sơ; không ghi ảnh vào learning state, journal hoặc outbox.

API `/api/account/avatar` xác định người dùng từ session server, đối chiếu
`x-learning-owner`, chặn mutation khác origin. PUT/DELETE yêu cầu phiên bản và
operation UUID. Kho private ba bảng tách khỏi media bài học. CAS, nonce mỗi
transaction, tombstone và receipt giữ retry không phục sinh ảnh đã gỡ. Prompt
gỡ đóng băng owner/revision/operation lúc mở, không dùng revision mới từ tab khác.
Retry lưu giữ cùng Blob đã encode và operation ID cho tới khi đổi lựa chọn/khung
cắt hoặc hủy. Xung đột không ghi đè ảnh mới.

Server kiểm giới hạn nguồn 5 MiB/16 MP, chữ ký và ảnh tĩnh trước decoder; binding
Images decode rồi encode lại WebP 256×256, tối đa 200 KiB, bỏ metadata gốc. Output
được kiểm RIFF/chunks/dimensions/hash; không nhận EXIF/XMP/ICC/animation. Binary
reader chặn cả stream không khai độ dài và khai sai độ dài. Thiếu encoder từ
chối lưu; metadata báo upload unavailable, vẫn có thể xem/gỡ ảnh cũ. Response
private `no-store`, `nosniff`, Vary cookie/owner; thao tác có rate limit.

## Dữ liệu và migration

`drizzle/0042_account_avatars.sql` thêm `learner_avatars`,
`learner_avatar_chunks`, `learner_avatar_mutations`; schema TypeScript tương ứng.
Ảnh không thuộc learning reset. Cả hai đường xóa tài khoản loại bỏ đúng graph
avatar của owner; giữ account khác. Không áp migration vào `.wrangler` của người
dùng. Local integration dùng riêng `tmp/personalization-a02-local-d1`.

Không đổi lesson IDs, completion, streak, FSRS, mistakes, first answers, rewards,
saved items, resumes hoặc outbox. HSK0 4/4 rich0/4, rich HSK1–4 40/40/55/78 =213/213.
Đối chiếu D1 fixture cũ với pre-v20:65/65 immutable còn nguyên,0 thiếu/đổi,
3 immutable thêm, integrity OK/FK0. Không sửa docs/reports/output hoặc xóa storage.

## Bằng chứng kỹ thuật

- Targeted v3:6file/42test, TEST_EXIT0. Backend private roundtrip, stale CAS,
  idempotency mismatch, nonce/receipt rollback, corrupt source preservation,
  deletion-pending fence, ordinary/hosted account deletion; bounded decode/output;
  client delayed owner/generation, wrong-owner/schema/binary/receipt, retry và
  BroadcastChannel unavailable; guest regression. API v1 có fixture khóa account
  thiếu lock metadata nên fail constraint; sửa fixture, không nới constraint.
- Backup thật qua node:sqlite backup API:metadata/chunks/receipts/tombstone bằng
  nguồn, bytes bằng nguồn, integrity OK/FK0. Generic restore không được dùng thay
  phép kiểm có seed avatar này.
- Typecheck v3 và scoped lint v2 exit0 trên source cuối; không tắt rule.
- Binding v3 BINDING_EXIT0:Miniflare offline Images/workerd RPC + D1 thật local,
  input JPEG400×300 có EXIF → WebP256×256/302bytes/không EXIF; private PUT→GET→DELETE
  →retry thao tác cũ không phục sinh/chunks0. Dùng danh tính fixture rõ, chưa
  chứng minh cookie auth hoặc cloud high fidelity. Local Images của Miniflare
  cũng dùng sharp nội bộ; không suy ra provider production hoặc thiết bị thật.
- Binding v1 fail vì D1.exec tách theo dòng không nhận migration nhiều dòng;
  v2 đi qua roundtrip nhưng PRAGMA integrity bị D1 cấm. v3 cài schema fixture bằng
  prepared statements, không dùng PRAGMA bị cấm để gán pass. Giữ log lỗi trước.
- Browser v1 E2E_EXIT0,3/3:component/hook/client thật + API handler/D1/Images local.
  Lưu/cắt bằng bàn phím→mất ack sau server commit→retry cùng exact bytes/op→Header
  và Hồ sơ256px→reload; hủy lựa chọn giữ ảnh. Prompt gỡ tab cũ không xóa ảnh mới
  của tab khác, reload→gỡ đúng revision→reload còn tombstone. Guest không gửi
  PUT/DELETE lên account, reload giữ ảnh; landscape667×375 CTA≥44px trong viewport.
  Không tăng timeout/skip/retry test hoặc force-click.
- CUA guest4325 thật còn chân dung cũ trên Header/Hồ sơ; tên Hành giả vô danh,
  tùy chọn20phút/Giao tiếp vẫn còn. Chỉ điều hướng xem, không đổi progress/ảnh.

Log/proof dưới `tmp/personalization-a02-*`; browser fixture4344 mở để đối chiếu.
Fullv26 CHECK_EXIT1 vì restore còn pin42migration. Restorev1 mới phát hiện SQL CHECK nhận NULL hash; đã sửa migration/schema bằng IS NOT NULL. Restorev2 RESTORE_EXIT0:43migration/64table, fingerprint graph trước0042 còn nguyên, avatar seed/chunks/tombstone/receipt/constraints qua. Scoped restore lint exit0. Fullv27 đang chạy trên source cuối, chưa gán pass. Binding391/0drift sau audit19file; baseline/scoring/content pins không đổi.

## Giới hạn còn lại

Default Vite local và wrangler.local hiện bật Images offline với remote:false; config cloud chọn riêng không tự thay đổi. Không đổi dịch vụ ngoài, dùng
`--remote`, trả phí, push/deploy hoặc phát hành APK. Integration full app compiled/session thật/local binding đã qua như mốc chốt phía trên; còn device/offline cache và nghiệm thu người dùng.
Native binary bridge hiện có không thay picker/cancel/transport trên thiết bị.
Offline account chưa có cache avatar bền vững; lỗi đọc giữ ảnh cùng owner đã tải
trong phiên, fallback chữ đại diện khi chưa có. Không tự nhận ảnh guest làm cache
account. Không nhận là full-device backup hoặc human review.

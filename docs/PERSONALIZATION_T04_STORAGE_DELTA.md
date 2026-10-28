## T04 · recovery nhị phân / nén v3 / scope-only fence · 28/10/2026 · IN-REVIEW

Giữ buffer nền/offset/typed constructor, Blob exact; hex dùng chunk thay mảng ký tự từng byte. Large device envelope v3 nén gzip/base64 có HMAC, v2 nhỏ và v1/v2 reader giữ; budget giải nén không tăng cap64Mi chars/128Mi bytes. Không còn full snapshot getAll chỉ để kiểm scope; vẫn kiểm đủ known stores/owner/reset/preview. Native compiled-v2:5,605,311inner bytes,7,208,978v2bytes→19,528v3bytes,apply/rollback/legacy authenticity qua; fullv35 3754test pass. Over-cap streaming/account/native file restore vẫn mở; old client gặp v3/new binary kind phải fail-closed, không tự xóa bản sao.

AI self-review; không humanReviewed/USER-ACCEPTED. Gate/bằng chứng/giới hạn tích hợp xem checkpoint28/10; không sửa dữ liệu nguồn hoặc inventory HSK.

## Cá nhân hóa v2 · chốt source giữ lại / fullv19 · 24/10/2026

- **Module:** T04 codec/recovery + T03 local history — IN-REVIEW; không USER-ACCEPTED toàn plan.
- **Người học thấy gì:** codec bản sao chạy nền, apply/rollback tiếp tục đúng trong IDB callback đang active; lỗi quá dung lượng có hướng dẫn giữ bộ nhớ/bản sao cũ. Lịch sử dùng chung dữ liệu trong một lượt đọc, không cache qua refresh/owner. Giữ đường workspace projection trực tiếp; Worker lịch sử bị rút sau native compiled comparison không thuyết phục.
- **Đã kiểm:** fullv19 CHECK_EXIT=0,556file/3590test; typecheck/global lint/content/DB/restore42migration61table/build qua,239JS/192private markers vắng, advisory+384.1KiB. Source/runtime/test giữ nguyên suốt gate. Retained targeted9file/48test exit0. Native4339 apply/rollback/current+Blob/gen2/job-preview-null qua;4334 history8/8 sau rollback. Native4340 synthetic100k unique/mastery0, còn gap>1giây nên chưa performance/device pass. Fullv18 interrupted rõ ràng, không pass, không xóa log/bằng chứng thử nghiệm.
- **Dữ liệu giữ được:** DBversion3/IDs/owner/reset/outbox/journals/FSRS/mistakes/avatar/retained preimage giữ; HSK0 4/4 rich0/4, rich40/40/55/78=213/213. Binding364/0drift. Không xóa browser storage/.wrangler hoặc sửa docs/reports/output, không commit/push/deploy/APK.
- **Tiếp theo:** bounded local history/clone/gộp/sort và archive lớn; account-D1/release/native/device/human/cohort giữ những giới hạn đã ghi. Preview4325 lỗi504 do các Vite fixture dùng chung optimizer cache đã tách cacheDir trong tmp và restart riêng; guest Sảnh Luyện Chữ đã mở lại, không tạo lượt mới. Không phải product/server deployment hoặc xác nhận result5/5 mới.

## Chốt gate T04 · 24/10/2026 · IN-REVIEW

Fullv17 CHECK_EXIT=0:555file/3584test; typecheck/global lint/content/DB/restore42migration61table/build qua. Source/test giữ nguyên trong gate.239JS/192private markers vắng; asset advisory+383.8KiB, chưa device performance pass. Đây là source sau sửa native transaction/size feedback, trước T03 local-read sharing5file. Native4339 apply/rollback proof và Profile4334 size feedback đã qua; không còn active job/preview ở4339. Giữ giới hạn archive lớn và account/native/full-device như dưới.

## Cá nhân hóa v2 · Worker / native IndexedDB transaction · 24/10/2026

- **Module:** T04 — IN-REVIEW.
- **Người học thấy gì:** codec chạy nền, giữ định dạng/validator cũ. Sau Worker/Web Crypto, bước ghi tiếp tục trong callback IndexedDB đang active; lỗi vẫn abort nguyên transaction. Khi archive quá lớn, thông báo giữ bộ nhớ/bản sao cũ, không gợi thử lại do chờ lưu.
- **Đã kiểm:** fullv16 CHECK_EXIT0:555file/3583test, typecheck/global lint/content/DB/restore/build qua;239JS/192private markers vắng, asset advisory+383.9KiB. Mốc này trước sửa native transaction. Browser4339 đã tái hiện TransactionInactiveError trong replaceImage dù keepalive còn chạy; sau sửa apply→read verified job→continue→rollback→continue→finish qua, raw/local current, Blob[0,128,255], generation2, job/preview null. Targeted codecv4 4file/38test exit0 gồm reply Worker ở task sau. Fullv17 đang chạy trên source cuối, chưa gán pass; không đổi runtime/test giữa gate.
- **Dữ liệu giữ được:** DBversion3/bảy store/IDs/authority không đổi; HSK0 4/4 rich0/4, rich40/40/55/78=213/213. Worker không nhận HMAC key/auth/global META. Browser4334 archive hiện vượt giới hạn, export từ chối và giữ nguồn; chưa giải quyết archive quá lớn/account/native/full-device. Binding362/0drift. Không sửa docs/reports/output/.wrangler, commit/push/deploy/APK.
- **Tiếp theo:** chốt fullv17, kiểm thông báo dung lượng trên Hồ sơ thật; không dùng fullv16 hoặc unit/fake-IDB để thay native transaction proof. Main envelope/HMAC/IDB/copy và giới hạn archive lớn vẫn cần slice riêng.

### Bổ sung browser sau sửa transaction

Ảnh/JSON tmp/personalization-codec-idb-rollback-v1.*:4339 raw/current local/current, Blob[0,128,255], generation2 và active job/preview null. Fixture dùng Worker module thật, Web Crypto thật và IndexedDB thật; không AppShell/account/native hoặc multi-tab/reload proof mới. Scope dữ liệu tổng hợp mới, không thay origin4334/4325. Regression mới trong ownerRecoveryApply.test.ts có Worker trả lời qua task timer sau, nhưng fake-IDB không thay bằng chứng native ở trên.

Profile4334 kiểm nhánh size bằng API thật, không giả error; UI hiện "Bản sao bổ sung chưa hỗ trợ lượng dữ liệu hiện có. Dữ liệu vẫn được giữ; hãy giữ nguyên bộ nhớ trình duyệt và các bản sao cũ.". Ảnh tmp/personalization-codec-size-feedback-v1.png. Export không thành công; không nâng limit hoặc xóa outbox, không có active recovery trên4334. Fullv17 vẫn chờ exit.

## Cá nhân hóa v2 · codec bản sao chạy nền · 24/10/2026

- **Module:** T04 — IN-REVIEW; chưa nghiệm thu account/native/full-device.
- **Người học thấy gì:** mã hóa/đọc archive và kiểm tra tài nguyên chạy trong module Worker; lỗi worker dừng an toàn và giữ nguồn. Môi trường không có Worker/constructor bị chặn dùng đúng codec gốc. Không đổi schema/định dạng/quyền khôi phục.
- **Đã kiểm:** codec v2 4file/37test TEST_EXIT0; typecheckv3/lintv2 exit0. Browser4337 archive4,195,553ký tự trùng từng byte codec gốc, giữ Blob/undefined/pending ID, bản sửa bị từ chối. Payload tổng hợp16,777,216code-unit/50,331,738byte canonical: timer gap846→66ms; tổng838→2195ms. Một phép đo browser hiện tại, không phone/100k/device latency pass. Fullv16 đang chạy, chưa gán pass. Fullv15 CHECK_EXIT0:553file/3558test là mốc trước T03/codec.
- **Dữ liệu giữ được:** DBversion3, bảy store cùng tên; không migration/DB trong Worker, không gửi khóa HMAC/auth/global META. IDs, raw data, pending/outbox, FSRS/mistakes/owner/reset giữ nguyên. HSK0 4/4 rich0/4; rich40/40/55/78=213/213. Binding362/0drift. Không đụng docs/reports/output/.wrangler, commit/push/deploy/APK.
- **Tiếp theo:** chốt fullv16 và kiểm Worker được đóng gói; các bước JSON envelope/HMAC/IDB/copy vẫn còn trên main thread, chưa kết luận toàn luồng32.6MB đã hết nghẽn.

### Bằng chứng bổ sung trong lúc chờ fullv16

Fixture tối ưu4338 đã build bằng Vite: module Worker6.73kB, roundtrip4,195,553ký tự exactBytes/pending/undefined/Blob/corruptRejected đều qua. Đây là build fixture riêng; full app build vẫn chờ gate.

Trên dữ liệu guest hiện có4334, Profile export bị từ chối. Gọi API thật từ trang chẩn đoán cùng origin, không learner writer và không sửa tiến độ, xác nhận lỗi "Recovery archive exceeds supported size; retain source.". Chưa tăng giới hạn64MiB ký tự inner/128MiB outer, không xóa/compact outbox để né lỗi. Không coi lượt này là export pass. Ảnh/log tmp/personalization-codec-export-limit-v1.*. Đây là gap mới cần giải pháp archive lớn và thông báo đúng nguyên nhân; thông báo hiện tại còn gợi thử lại sau thao tác lưu dù dữ liệu đã quá lớn. Main envelope/HMAC/IDB/structured clone vẫn chưa có device performance proof.

## 24/10 · browser lớn đã rollback/finish · IN-REVIEW

Bản sao32,556,389bytes trên4334 đã đi qua pause bền/reload→prepare→apply.
Read-only proof xác minh integrity job rồi đọc snapshot thật: preimage giữ
我去超市买东西。 và81outbox; target giữ 我去超市。 và60outbox. Ảnh
`tmp/personalization-recovery-rich-job-proof-v1.png`. Rollback→continue→finish
đã qua cổng xác minh preimage đầy đủ, không clear flag thủ công; active job/preview
đã kết thúc. Bản trước thay đổi vẫn giữ trong META theo chính sách, các tệp export
cũ giữ nguyên. Consumer reader đã mở lại đúng trang6/7 và câu nháp mới 我去超市买东西。 sau reload. Ảnh tmp/personalization-recovery-rich-consumer-v1.png.

Refinement T16 cùng module: RecoveryStatusSlot nằm trong khung recovery để banner
không đẩy CTA xuống dưới viewport. Trước slot, body có thể cuộn40px khiến banner
ra ngoài viewport. Sau slot: scrollY0;390×844 banner16..62/header78..134/CTA784..828;
844×390 banner16..56/header72..138/CTA330..374. Body width đúng viewport, nút44px.
Ảnh `tmp/personalization-recovery-rich-rollback-banner-v1.png`. Override đã clear.
Đây là banner fixture dùng component boundary thật, không phải bằng chứng sửa
lỗi service worker hoặc device pass.

Current targeted applyv12 **10file/133test, TEST_EXIT0** (exit file riêng24/10).
Typecheckv9 exit0 trước import slot cuối; scoped lintv8 exit0 sau slot. Fullcheckv15
đang chạy với source/test giữ nguyên, chưa gán pass; log và exit file cùng tên
trong tmp. Binding354/0drift sau audit14file, chỉ refresh file thực sự đã đổi.
Không có worker codec/giảm integrity chuẩn hoặc account/native restore mới.

## 24/10 · cập nhật tiếp sau gate v14 · IN-REVIEW

Fullcheckv14 đã đọc **CHECK_EXIT=0**:553file/3551test, typecheck/global lint/
content/DB/restore42migration61table/build qua;238JS/192private markers vắng,
asset advisory+379.6KiB, chưa device performance pass. Runtime/test giữ đứng yên
suốt gate. Mốc này **trước** delta preview-target/Lamport/durable preview bên dưới.

Delta sau gate: digest preview gắn cả chính tệp được chọn và preimage live;
proof synthetic trước sửa cho thấy đổi sang archive hợp lệ khác vẫn apply được,
sau sửa bị từ chối. Restore giữ Lamport head counter cao nhất của source/current,
lưu originalHeadClock riêng; không sửa payload/hash pending operations. Test
round-trip cả7stores có pending/firstAnswer/raw version99 và không network.

Luồng lớn không tiếp tục chuẩn bị giữa các learner writer: openOwnerRecoveryPreview
lưu nguồn đã kiểm vào META cùng owner/reset/binding/hash và pause bền vững. Gate
ở trước LearningProvider, có kiểm tra điều kiện/khôi phục hoặc quay lại; reload
vẫn pause, chưa có thay đổi learning data. Apply chuyển preview flag sang job flag
trong cùng transaction; quota/abort giữ preview + dữ liệu cũ. Read-scope mặc định
cũng chặn preview để các writer localStorage dùng scope cũ không tiếp tục kiểm
scope thành công; chỉ reader recovery readonly và seal verification dùng opt-in
allowRecoveryPreview. Không có ngoại lệ writer. localStorage vẫn CAS/resumable,
không tuyên bố transaction xuyên IDB/localStorage hoặc bao phủ native.

Status gate chỉ đọc id/phase của job và giữ learner bị chặn; không encode lại
preimage lớn trên mỗi focus. Mọi continue/rollback/finish/export vẫn kiểm đủ
integrity payload. Unknown/corrupt job không mở learner hoặc xóa metadata.

Targeted applyv10/v11:10file/133test pass (summary); typecheckv7/lintv6 đã đọc
exit0 trước refinement read-scope cuối. Ngày24/10 chạy lại applyv12 có exit file
riêng; typecheckv8/lintv7 và full gate mới cần chốt exit, không suy từ header log.
Binding overlay354/0drift sau14file audit, không đổi inherited/pinned baselines.

Browser4334: reader bundled daily-3 có7trang;390×844 CTA664..708/h44, header108..157,
nav778..844;844×390 CTA290..334/h44/header102..151. Chuyển mục/đến trang6/nhập
我去超市。/reload giữ đúng trang6 và text. API503 nên không phải published/account.
Ảnh tmp/personalization-rich-reader-landscape-v1.png. Viewport/CDP đã clear.
Sau export32,556,389bytes (69mục/9nhóm), nhập draft mới 我去超市买东西。.
File cũ tạo được durable preview, reload vẫn pause, chuẩn bị khi pause thành công,
apply đã vào phase applying-local với preimage. Chưa ghi browser lớn rollback pass:
đang đọc snapshot đích/preimage và hoàn tác để giữ nguyên mọi dữ liệu mới.

**Mốc chờ trước lần kiểm cuối24/10 (đã xử lý ở phần mới phía trên):** origin4334 có recovery job đang chờ (gen sau apply), không
clear flag/IDB hoặc seed lại. tmp/personalization-full-guest-v15/main.tsx đã cho
mount gate trước fixture owner initialization khi có preview/job. Server4334 và
4325 đã bật lại24/10; không giả session/tab ID cũ còn sống. Tệp download cũ vẫn
ở Downloads, không xóa. Bản sao lớn còn cần performance/responsiveness/device
verification; tool CDP Input/download đã timeout dù bước thực tế hoàn tất, không
coi tool timeout là pass latency. Chưa triển khai worker codec hoặc nới validator.

## 23/10 · guest cùng trình duyệt: apply/resume/rollback · IN-REVIEW

Bản xuất device v2 được niêm bằng HMAC SHA-256 với CryptoKey không export,
lưu riêng trong META của installation. Checksum vẫn kiểm hỏng file; HMAC chỉ
xác nhận bản chụp local, không cấp authority server. V1/khóa thiếu/niêm sai chỉ
inspect; khóa lạ giữ nguyên, không rotate. Capture đồng thời CAS dùng cùng khóa.
Không đưa khóa, token, metadata global hoặc owner khác vào bản xuất.

`ownerRecoveryApply.ts` chuẩn bị lại từ tệp gốc trước ghi, so dữ liệu hiện tại
với preview và CAS trong transaction gồm META + bảy owner stores. Transaction
lưu cả preimage lẫn target và recovery flag, tăng owner generation để chặn tab
cũ; lỗi/quota trước commit không để lại thay đổi một phần. Hash Blob bytes trong
transaction có request keepalive; unknown raw trong journals được giữ nguyên,
key collision owner khác bị từ chối. META deviceSequence/clocks không rewind.
Profile/register/consent phải khớp, kể cả pending snapshot và primary mirror;
khác thì từ chối thay vì phục hồi opt-in cũ hoặc sửa command/hash đã niêm.

LocalStorage không có transaction chung với IDB: job bền vững tiếp tục CAS từng
key, nhận giá trị trước hoặc target, từ chối dữ liệu mới khác. Reader schema2
được remap sang generation mới, giữ raw key cũ và toàn bộ fields; schema không
hiểu hoặc destination key đã tồn tại fail-closed. Quota/crash giữ flag và bản
trước thay đổi; resume idempotent. Rollback khôi phục IDB preimage trước rồi ghi
lại localStorage; chỉ mở learner sau khi kiểm target đầy đủ. Preimage giữ trong
META sau finish, xóa đúng owner khi deleteOwnerData; không export kèm backup sau.

ClientRuntime có OwnerRecoveryGate trước LearningProvider. Event/BroadcastChannel/
focus/visibility kiểm job, tab khác dừng learner; cổng bootstrap sau reload không
khởi tạo tiến độ rỗng khi recovery chưa xong. UI Profile hỗ trợ chọn tệp→xem trước
→khôi phục guest web; cổng có tiếp tục, hoàn tác, xuất preimage kiểm tra. Preimage
xuất riêng chưa phải device archive có thể import lại trực tiếp. Không mở apply
account/native. Khi dữ liệu mới xung đột, giữ nguồn và dừng; chưa có UI chọn hòa
giải thủ công cho raw schema không hiểu.

**Gates đã đọc exit:** applyv5 7file/36test TEST_EXIT0; integrationv1
4file/101test TEST_EXIT0 (overlap); typecheckv3 và scoped lintv2 exit0 ở mốc trước
phase rollback-ready cuối; fullcheckv14 đang chạy với source giữ nguyên. Không lấy
mốc check cũ làm pass cho runtime mới. applyv1 fail do fixture avatar revision
sai, applyv2 fail do Reader destination CAS; đã sửa đúng fixture và runtime,
giữ fail logs. Lintv1 cảnh báo ref cleanup đã sửa, lintv2 exit0.

**Browser origin4335 cô lập:** AppShell/IDB/guest thật, API503, không account-D1.
Profile xuất v2→đổi journal fixture→file chooser chọn lại→preview7mục/9nhóm.
Tab thứ hai mở làm preview stale bị từ chối, kiểm lại rồi apply thành công;
cả hai tab chuyển recovery gate. Reload giữa IDB/localStorage→tiếp tục→finish:
raw journal/local = archived, generation2. Lượt mới gen2→đổi current→apply→
rollback→finish: raw journal/local = current, generation3. Không xóa origin cũ.
Viewport390×844 body390/header16..72/footer732..828;844×390 body844/header16..82/
footer278..374, buttons44px. Chỉ vùng giữa cuộn. Viewport/CDP overrides đã clear.
Ảnh tmp/personalization-recovery-rollback-landscape.png. Fixture không chứng minh
FSRS/account/native/học thực; avatar Blob và lỗi quota/old-tab generation là
unit regression, không phải device test.

**Còn mở:** account/server rollback authority, cross-reset/cross-install descriptive
quarantine, cache/native files, conflict-resolution UI, binary trên device và
hành trình dữ liệu học đầy đủ mọi kho. Đây chưa phải full-device backup. Giữ
HSK0 4/4 rich0/4; HSK1–4 rich40/40/55/78=213/213, IDs/outbox/FSRS/mistakes/
owner-reset/.wrangler/dirty tree; không docs/reports/output, commit/deploy/APK.

# T04 · điểm lưu mới phải có trong recovery — audit delta, chưa runtime

## Tiếp nối21/10 · manifest đa nguồn và UI staging — IN-REVIEW

ownerDeviceRecovery.ts bao IDB archive cũ cùng localStorage keys xác định owner:
writing legacy owner, placement/gate owner, integrated journey đúng epoch,
Reader đúng generation/epoch; global primary mirror chỉ khi owner key khớp.
Không đọc/export auth/consent, unowned legacy/recovery mirrors, owner khác,
global device preferences hoặc native keystore. Mỗi nhóm có count/byteLength/
SHA256; snapshot blob giữ codec lossless. Hai lượt đọc ổn định phát hiện source
đổi, không tuyên bố transaction atomic qua IDB/localStorage. Staging kiểm checksum,
manifest đủ groups/keys, scope/install/device/generation/epoch rồi không ghi.

Profile Tài khoản & dữ liệu có bản sao bổ sung và kiểm tệp; chưa gắn vào gate
xóa account và chưa có apply/rollback. Không gọi full-device/chuyển máy sẵn sàng.
Tên file theo Asia/Saigon; thêm owner fence trước download. Giới hạn archive
128MiB chars (IDB cũ64MiB); native export8MB fail-closed, chưa device verification.

Targeteddevicev1 **3file/8test exit0**, typecheckv42/lintv1 exit0 trước owner/date
UI refinement cuối. Test raw unknown schema/blob round-trip, không đọc secrets/
owner khác, thiếu group/corrupt/checksum hợp lệ nhưng resource sai, storage read
failure/change trong capture, scope khác giữ nguồn. Browser guest127.0.0.1 xuất
rồi chọn đúng tệp qua chooser: **18mục/9nhóm**, không thay tiến trình; có cả
avatar đã lưu và writing journal. File21/10 được xuất lại sau sửa timezone;
file20/10 đầu tiên giữ nguyên, không xóa. Ảnh tmp/personalization-device-recovery-stage.png.

Thiếu: atomic/resumable apply/pre-image rollback, cross-reset descriptive import/
quarantine không replay, lifecycle/coordinator, cache/native files, full journey
restore/quota/two-tab và account/native UI. Không tự khép T04.

## Bước implementation 20/10 · IN-REVIEW, chưa full-device

`captureOwnerRecoverySnapshot` trong indexedDb.ts đọc bảy owner stores và avatar
Blob cùng transaction readonly với owner-generation/reset fence. Giữ raw schema
chưa hiểu thay vì parse thành rỗng; lấy cả pending/immutable history/old epochs
trong owner, không lấy meta bí mật/global device/owner khác. Schema DB lạ fail
closed. Snapshot mang coverage `indexeddb-owner-only` và exclusions rõ ràng.
Chưa nối UI/download, chưa serialize media/integrity manifest/staging/apply/
rollback/localStorage/CacheStorage; không gọi export/restore đã xong. Targeted
`tmp/personalization-continuous-recovery-v1.log`:2file/5test pass ngày20/10,
gồm avatar Blob, unknown raw, read failure và scope switch; không D1/native.
Không lấy snapshot này làm authority hay replay command sang installation khác.

**Bổ sung cùng ngày, mới hơn câu “chưa serialize” ở trên:**
`ownerRecoveryArchive.ts` đã có codec tagged lossless cho JSON/undefined/Blob,
SHA-256 payload và staging-only cùng installation/device/owner/generation/epoch.
Không decode metadata Blob thành object rỗng; raw có key trùng tên codec không
bị hiểu nhầm; duplicate fields/corrupt hex/schema lạ/owner khác bị từ chối.
Cycle/Date/sparse array unsupported fail-closed, giữ snapshot/source cũ.
Avatar stage kiểm owner key + avatar contract/revision/mime/size. Checksum chỉ
chống hỏng file, không chứng minh authority: kết quả `untrusted-copy`, không có
write/apply API. Targeted recoveryv3 4file/17test và typecheckv24 exit0; suite
này overlap với history/revisit, không cộng tổng. Typecheckv23 đã fail do type
never[] trong fixture; sửa fixture kiểu unknown[], không nới runtime validator.
Vẫn thiếu localStorage capture/staging, integrity coverage đầy đủ, atomic apply/
rollback/resumable coordination, UI và hành trình reset→restore; T04 chưa xong.

19/10/2026. Kế thừa inventory T00, chỉ bổ sung nguồn mới của lượt liên tục.
T04 **NOT-REVIEWED về implementation**; đây không phải backup/restore đã hoạt
động. createLearningRecoveryBundle vẫn exportSchema2/local projection, không
chứa đủ journal. Hồ sơ cảnh báo không xóa browser/gỡ app để chuyển dữ liệu bằng
bản tiến độ này. Không coi account deletion gate là full-device archive.

| Store/key | Dữ liệu cần giữ | Scope/restore constraint |
| --- | --- | --- |
| IDB meta learner-avatar:v1 owner | Blob WebP, owner, revision, timestamp/tombstone | Ngoài reset học; owner-generation CAS, media ngoài state/outbox; delete đúng owner |
| lesson-resumes workspace-sync:v1 | Primary + pending, immutable history.activity, activity.record | Owner/generation/reset; không chỉ copy entries rồi mất pending |
| lesson-resumes lesson-history:v1:activity | Saved-word/profile clock events cùng document/state/outbox | Giữ command-journal vs guest-business lineage và identity |
| lesson-resumes page-correction-history:v1 | Append-only corrections, companion transaction | Không thay first failure bằng corrected answer |
| lesson-resumes offline-mock-practice:v1 | Package/version, answers, submittedAt, real result/pending | Không replay khác owner/reset/install; import không thành server receipt |
| Workspace activity.record domain=expansion | Session/reveal/self-review, sessionId/source digest/index | Resume contiguous steps cùng version, không từ display count |
| Document/state/snapshot outbox + clocks | Profile, saved/tombstone, source events | Restore giữ cả3 và history, không chỉ localStorage mirror |
| LocalStorage integrated journey owner:epoch | Stage checkpoints/receipt dedup, raw lỗi | Epoch thật; không hồi sinh epoch0 sau reset cùng anchor |

Kho T00 cũ vẫn bắt buộc: normalized command/receipt/projection + page outbox,
lesson/page/Reader/assessment/writing resumes, offline XP, FSRS/mistakes/rewards,
legacy aliases/localStorage và ownership/installation/reset binding. Không gọi
full-device khi thiếu kho/media/rollback. Không export cookie, auth credential,
provider token hoặc private environment config.

Implementation tiếp: snapshot owner-scoped nhất quán → manifest schema/digests/
coverage → staging không ghi → atomic/resumable apply + pre-image rollback →
reload/retry/two-tab/reset/delete round-trip. Integrity hash không phải authority:
import không tự cấp verified/mastery/XP/unlock hay replay command sang installation
khác. D1 export server không thay journal/resume chưa gửi trên thiết bị.

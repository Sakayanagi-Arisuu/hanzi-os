# A01 · avatar guest — IN-REVIEW

19/10/2026. Implemented source local, chưa USER-ACCEPTED hoặc phát hành.
A02 account/native chưa hoàn thành, không coi ảnh local là ảnh đã lên cloud.

## Hành vi thực

Hồ sơ → Chân dung · ảnh đại diện → chọn JPEG/PNG/WebP tĩnh → crop vuông,
zoom/vị trí bằng range hoặc bàn phím → preview → lưu/hủy/gỡ có xác nhận.
Header và Hồ sơ đọc cùng blob owner-scoped, fallback chữ cái khi chưa có ảnh.
Input ≤5MiB/16MP, sniff MIME/chữ ký/dimensions/animation trước decode; output
WebP256×256 ≤200KiB qua canvas, không mang EXIF/filename vào learning state.

Blob nằm ở IDB `hanzi-os-sync-v1` store `meta`, key
`learner-avatar:v1:<JSON ownerKey>`, record version1/revision/tombstone. Không
schema upgrade, không base64 trong progress/document/outbox hoặc request cloud.
Same transaction kiểm active owner generation và revision; multi-tab stale edit
bị từ chối. Tombstone ngăn save cũ hồi sinh ảnh đã gỡ. Learning reset giữ ảnh;
explicit deleteOwnerData chỉ dọn đúng key ảnh của owner đó. Unknown record/quota
không ghi đè ảnh cũ. Broadcast/focus/reset refresh và revoke object URL khi đổi.

**Giới hạn:** export progress hiện tại chưa chứa blob này; UI nói rõ, T04 cần
đưa key/blob/revision vào manifest media riêng. A01 chưa cấp account upload hay
Android nghiệm thu; A02 phải có server validate/re-encode/revision/cache/deletion.

## Bằng chứng

- `tmp/personalization-continuous-avatar-tests-v1.log`:4file/52test pass
  (bao gồm coordinator/scope, có overlap); fake IDB kiểm quota/unknown/type,
  retry/reload/revision/delete/reset/owner switch và tombstone.
- `tmp/personalization-continuous-avatar-tests-v2.log`:5file/18test pass,
  gồm avatar, expansion, journey scope và activity route.
- Typecheck v17/scoped lint v10 pass sau sửa va chạm tên AvatarImage/avatarImage
  trên Windows (decoder đã đổi thành avatarRaster). Global lint v11 đang kiểm
  exit; không coi log chỉ có header là pass. Full check v2 đang chạy.
- Cập nhật: global lint v11 exit0. Full check v2 exit1:522file/3387test pass,
  6NgocHeader test fail vì component trình bày đọc LearningContext ngoài provider.
  Sửa root cause: useAvatar ở AppShell; Header/AvatarImage nhận URL qua prop,
  vẫn render độc lập. Không mock/bỏ test cũ. Targeted v3 4file/13test pass
  (NgocHeader6/6), typecheck v19/scoped lint v13 exit0. Full v3 đang chạy,
  không đổi full v2 thành pass. CUA source mới vẫn cả2 ảnh256px.
- CUA guest preview4325 chọn asset thử local lam-hoa.webp, crop bằng ArrowRight,
  save → Header và Profile đều naturalWidth/Height256 → reload vẫn cả2 ảnh.
  Chọn bich-hai.webp rồi Hủy giữ ảnh đã lưu. Không gửi cloud/D1/API avatar.
- Mobile375×667 CTA crop top590/bottom638/h48; ngang667×375 top297/bottom345/h48.
  Header/footer dialog không cuộn, body giữa cuộn. Range/Cancel/Save có tên rõ.
  Ảnh `tmp/personalization-avatar-crop.png`, `tmp/personalization-avatar-landscape.png`.

Browser từng lỗi import case trong lúc HMR; sửa root cause rồi restart đúng
preview process, không xóa browser storage/cache/.wrangler. Không che lỗi cũ,
không gọi nó là account/native verification.

## A02 audit delta

- Native `createNativeFetch` đã đọc Request.arrayBuffer và encode binary qua
  bridge; không mặc định Android không hỗ trợ binary. Cần journey picker/cancel
  và transport thật trên bridge/device, không chỉ unit adapter.
- Worker có interface/call `IMAGES.input(...).transform(...).output(...)` cho
  tối ưu ảnh, nhưng `wrangler.local.jsonc` và config phát hành hiện kiểm không
  khai báo IMAGES binding. `sharp` có trong dev dependencies, không đồng nghĩa
  libvips chạy trong Cloudflare Worker.
- Chưa thêm account media API/storage/migration hoặc bật binding mới. Cần chuẩn
  bị adapter fail-closed và test thật trong môi trường encoder phù hợp; không
  tự đổi cấu hình bên ngoài/mua dịch vụ hoặc báo account avatar đã hoạt động.

Giữ inventory213rich/HSK04bài, completion/FSRS/outbox/IDs/dirty tree. Không sửa
docs/reports/output, không xóa .wrangler, không commit/push/deploy/APK.


## A02 audit tiếp · 26/10/2026

- `useAvatar` chỉ đọc owner anonymous; `AvatarEditor` chặn account với thông
  báo chưa sẵn sàng, không gửi ảnh guest lên tài khoản. Chưa có account-avatar
  API/table/migration/encoder; không tính audit là implementation hoàn tất.
- Kho `lesson_media_assets` có publication/reference rules và `created_by`
  nằm trong `ACCOUNT_DELETION_RETAINED_REFS`. Không dùng kho đó cho avatar riêng
  tư: một avatar sẽ có thể làm account không xóa được và không có đúng owner/
  revision/cache contract. A02 cần store private riêng, CAS/tombstone/replace/
  idempotency, auth server-resolved, bounded binary và account-deletion path.
- `boundedRequestBody` hiện có text helper; acoustic route có binary reader
  private. Audit consumer trước khi reuse, không tạo base64 progress/outbox hoặc
  đổi parser giọng nói để dựng avatar stub.
- Worker khai báo interface IMAGES cho tối ưu ảnh, local config không binding;
  native fetch có binary bridge. Không giả binding sẵn có, không tự mở cloud mới
  hoặc cài package. Cần server decode/re-encode thực và device/picker/cancel
  proof, không dùng libvips dev hoặc signature sniff thay decoder production.
- Chưa đổi schema, migration hoặc cấu hình bên ngoài; dữ liệu account/guest và
  media hiện có giữ nguyên. Source UI guest tiếp tục dùng A01; A02 còn mở.

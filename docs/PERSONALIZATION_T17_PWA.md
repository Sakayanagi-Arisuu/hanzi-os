## 26/10 · kiểm full app sau lifecycle bình thường · IN-REVIEW

Fullv31 CHECK_EXIT0:565file/3650test. Sau hai lần timeout với worker active cũ ởv30, đóng tab theo lifecycle bình thường, giữ nguyên browser storage; buildv31/server local sẵn sàng rồi mở lại. Bấm Cập nhật ứng dụng đã reload thành công, không còn lỗi cập nhật. Tài khoản/cookie, cả2avatar256px và10phút/Giao tiếp còn; history41/41. Proof tmp/personalization-t03-full-app-update-v31.png và full-app-v31.json. Không clear/unregister/cache purge, không ép reload bằng API. Không suy ra old-worker first-click/device/cloud pass. T17 commit6e2204e ở local; người dùng chọn giữ local trước, không push thêm.

## Cá nhân hóa v2 · cập nhật PWA không bị tải nền giữ lại · 26/10/2026

- **Module:** T17 — IN-REVIEW.
- **Người học thấy gì:** khi bấm Cập nhật ứng dụng, worker đang active dừng riêng tải chuẩn bị offline để nhường kích hoạt; không xóa cache/media/nháp/outbox. Lỗi cập nhật mở lại khả năng tải offline trên đúng worker cũ. Timeout10giây và việc không tự reload muộn vẫn giữ; bản active cũ chưa hỗ trợ protocol vẫn có thể timeout và cần thử lại.
- **Đã kiểm:** native browser baselinev2 với public/sw.js thật và request prepare bị giữ đã tái hiện lỗi; sau sửa finalv5 qua4.6giây toàn journey, không tăng timeout sản phẩm/force-click. Request kế tiếp chưa gửi, localStorage và IndexedDB fixture resume/outbox cùng private CacheStorage còn nguyên. Unitv4 3file/49test, typecheckv3/lintv3 exit0 gồm cancel private fetch giữ bytes cũ, failure resume đúng worker và late activation không reload. Lượt kiểm bị ngắt ở môi trường không tính pass. Fullv30 CHECK_EXIT0:565file/3640test; typecheck/global lint/content/DB/restore43migration64table/build qua,239JS/192private markers vắng; advisory+388.6KiB. Source4file giữ nguyên trong gate. Full-app4327 giữ session/avatar/10phút/Giao tiếp sau reload, nhưng nút update vẫn timeout cả lần thử lại; chưa xác định worker active đã nhận protocol mới, không gán full-app update pass. Không clear/unregister storage. Proof tmp/personalization-pwa-full-app-v30.png.
- **Dữ liệu giữ được:** không đổi schema/migration/producer/authority/FSRS/completion/saved/resume/outbox. HSK0 4/4 rich0/4, rich HSK1–4 40/40/55/78=213/213. Binding405/0drift, baseline scoring/content pins giữ. Không clear browser storage, sửa docs/reports/output/.wrangler hoặc bật dịch vụ ngoài.
- **Git:** checkpoint trước79ba221 đã commit/push thành công, nhánh codex/pause-2026-09-16 đồng bộ origin. Delta T17 chốt gate để commit/push riêng; không deploy/APK hoặc tự USER-ACCEPTED/humanReviewed.
- **Tiếp theo:** T03: audit giảm clone workspace dư trong aggregate history, không đổi schema/authority. Full-app cập nhật từ worker cũ còn mở; Bounded storage/recovery lớn/device/content review/cohort và các consumer còn mở, chưa hoàn tất toàn kế hoạch.

# T17 · cài shell PWA · 22/10/2026

**IN-REVIEW**, chỉ slice PWA local; không USER-ACCEPTED hoặc public release.

## Lỗi và thay đổi

Native-cache probe ở origin riêng từng qua293fetch/put, nhưng root Worker vẫn
không cài được. Chẩn đoán cùng origin ghi `TypeError: Failed to fetch` ở fetch
tài nguyên shell. `/offline.html` trả307 tới `/offline`; biến thể diagnostic
dùng canonical `/offline` đã installed. Đây là phép phân lập, không thay root pass.

Sửa hai lớp đi cùng nhau:

- `offlineFallbackAssetRequest` ánh xạ GET/HEAD `/offline.html` tới asset
  `/offline` bên trong Worker. Giữ URL/cache key cũ, query, method và headers;
  các route khác/write request không đổi.
- `releaseConfig.assets.run_worker_first` thêm đúng `/offline.html`. Nếu chỉ
  sửa Worker, Workers Assets vẫn trả307 trước khi handler được gọi. Lượt
  buildv13 trước khi chỉnh routing đã xác nhận307, không ghi lượt đó pass.

Không bỏ CSP/upgrade-insecure-requests, auth, cookie hoặc cache privacy policy.
Observer lifecycle cũng phân biệt superseded/đã activated với install/activation
failure thật và xóa banner lỗi cũ khi lần cài sau thành công.

## Bằng chứng

- Lifecyclev13:4file/49test; routingv15:5file/54test exit0 (overlap).
- Typecheckv63/lintv11/buildv13 exit0. Fullcheckv11 CHECK_EXIT=0:547file/3507test, global typecheck/lint/content/DB/restore42migration61table/build qua;236JS/192private marker vắng mặt.
- Compiled Worker với routing cuối trả200 `/offline.html`, không Location,
  giữ header bảo mật. Trang diagnostic chỉ đọc thấy root scope `/` activated,
  controller activated, cache shell thật.
- Dừng Worker, xác nhận không listener4327, reload `/path/practice`: tải đủ
  AppShell/entry,0console error. Pilot vẫn chặn theo cấu hình môi trường;
  không thực thi account adaptive hoặc cấp quyền mới.
- `tmp/personalization-root-pwa-active-v13.{txt,png}` và
  `tmp/personalization-root-server-down-v13.{txt,png}` giữ bằng chứng browser.
- D1 pre-v11 recheck:64/64immutable row giữ nguyên,0changed/missing,
  integrityOK/FK0; không migration/reset.

Sau gate đã bật lại compiled Worker, gỡ đăng ký diagnostic; chỉ root scope còn activated. Trang diagnostic tạm đã dọn; source/runtime bindings335 không drift. Tổng assets còn vượt advisory1MiB370,6KiB, chưa có navigation/device performance pass.

Đây là local shell khi server không truy cập được, chưa phải full offline
account recovery, install/update trên Android hay thiết bị thật. Worker diagnostic
và trang status chỉ ở build local/tmp, không thuộc source sản phẩm hoặc manifest.
Không đổi content/scoring/FSRS, không sửa docs/reports/output/.wrangler,
không commit/push/deploy/APK. Gate tổng qua; compiled preview bật lại, tiếp T11 lưu trữ phiên/nháp conflict.

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

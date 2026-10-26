# Ứng dụng Android HANZI.OS

## Bản Capacitor 0.3.1 · 16/10/2026

[Tải APK Capacitor 0.3.1](https://hanzi-os.quynguyen1404-dz.workers.dev/downloads/hanzi-os-0.3.1.apk).
Đã deploy và kiểm tải HTTPS khớp hash/bytes/chứng chỉ; cài đè, không gỡ app cũ.

APK versionCode4 đã build, lint/unit gate và ký bằng khóa cũ; apksigner/aapt
đã xác minh. File 22.957.940 byte, SHA-256
`59635d677c01deb38b31253ace21d3540dbf2f1d43374d9a8c0801adc77a7f17`.
Bản này đóng gói giao diện tài khoản/kiếm trận mới, lifecycle và policy tối thiểu
8 ký tự theo xác nhận người dùng. HANZI hosted vẫn đóng khi gate provider chưa
xong; Google/GitHub giữ cấu hình cũ. Không coi APK mới đã được người dùng nghiệm
thu trên điện thoại. Khi phát hành xong, cài đè cùng package/khóa để giữ dữ liệu.
Chi tiết kết quả hosting và phần còn chờ ở IMPLEMENTATION_CHECKPOINT.md.

## Bản Capacitor 0.2.0 · 12/10/2026

[Tải APK Capacitor 0.2.0](https://hanzi-os.quynguyen1404-dz.workers.dev/downloads/hanzi-os-0.2.0.apk).
APK 21.887.427 byte, versionCode2, cùng khóa ký với 0.1.0. Gradle lint/build và
3 native policy tests qua; lint còn 24 advisory warning về resource/icon mẫu,
vị trí permission và phiên bản công cụ mới, không có error bị bỏ qua.
apksigner/aapt và tải HTTPS đã đối chiếu chữ ký/package/phiên bản/hash:
`e1455f03a1e75ae2466507ea106b65fd7d308e7784b328c9dd60f45426a025b3`.
Worker release `a49d9d55-8687-45f2-b6cb-85e37289940f`.

Bản mới là app **hybrid Capacitor 8.5.3**, có giao diện, từ điển và dữ liệu nét
chữ đóng sẵn trong APK. Không dùng `server.url` để nạp website từ xa; không cần
Chrome để mở màn học. Android System WebView vẫn là runtime hiển thị giao diện.
Google đăng nhập bằng trình duyệt hệ thống, callback cố định về ứng dụng; mã dùng
một lần gắn với S256 verifier trên máy, hạn 60 giây và consume nguyên tử. Phiên
server được mã hóa AES-GCM bằng Android Keystore, không vào JavaScript,
localStorage, APK, log hoặc backup. Không sao chép cookie giữa Chrome và app.

Kho localStorage/IndexedDB của app tách khỏi TWA/PWA cũ. **Giữ nguyên kho Chrome
cũ**; tiến trình tài khoản đã lên cloud được nhận vào app mới sau đăng nhập.
Tiến trình guest và outbox chưa lên cloud trong Chrome không tự chuyển sang
app. Đồng bộ bản cũ trước khi đổi; không gỡ bản cũ/xóa cache để "sửa" đồng bộ.
Khóa ký và package `com.regulus.hanzios` giữ nguyên; versionCode2/versionName0.2.0.

Adapter HTTP gửi tới duy nhất HTTPS origin đã ghim, vẫn dùng phiên cookie
server bình thường và các hàng rào owner/reset/idempotency hiện có. Không mở
CORS/identity header hoặc cho phép website bên ngoài vào WebView có bridge.
Microphone dùng quyền Android và WebRTC hiện có. Giọng đọc Android là synthetic
fallback, cần giọng tiếng Trung trên thiết bị, không thành bằng chứng phát âm.
Web Speech recognition không được coi là tự có chỉ vì đã đóng gói Capacitor;
giữ các phương án luyện/tự đối chiếu khi dịch vụ nhận giọng không hỗ trợ.

Nội dung JSON theo tài khoản vẫn tự chuẩn bị và lưu theo owner/reset. Hình
minh họa bài/chương và media đã phát hành tải vào app-private files để giữ APK
dưới giới hạn 25 MiB của Workers miễn phí; Hồ sơ chỉ báo đủ khi chuẩn bị thành
công. Media private chia theo phiên đã mã hóa; chỉ learner media được lưu.
Quyền Premium lấy từ server, lưu tối đa 30 ngày và không vượt hết hạn thực;
401/403/404 không dùng bản cache thay thế. Cache kiểm hash và thời gian; không
xóa progress khi hết quota. Asset giao diện chuyển WebP theo source hash/recipe
ở `tmp/capacitor-image-provenance.json`, không đổi source hoặc học liệu đã ghim.

Hồ sơ có kiểm tra phiên bản mới, chỉ nhận URL tải đúng origin và package. Người
dùng vẫn chủ động tải/cài APK; không tự cài âm thầm. Giao diện/code nâng bằng
APK mới cùng khóa; nội dung/tiến trình cập nhật qua server khi app mở. Không
cam kết đồng bộ sau khi OS đóng app. Xuất bản sao dùng Android document picker;
hủy/lỗi lưu không được đánh dấu đã có bản phục hồi để xóa tài khoản.

Mã ở `mobile/`, `src/native/`, `capacitor.config.ts` và API `auth/mobile`.
JDK21 đã được người dùng cho phép tải riêng trong `tmp/android-tools`; JDK17
của TWA được giữ. Không đổi môi trường Java/Android toàn máy.

```powershell
npm run capacitor:web
npm run capacitor:prepare
npm run capacitor:verify
npm run capacitor:build
npm run capacitor:stage
```

Build chạy lint, native unit tests, ký release và xác minh apksigner/aapt.
`capacitor:stage` giữ guard khóa/package/version và không tự deploy. Sau deploy
chạy `npm run capacitor:check-hosted` để so binary HTTPS với APK đã ký.
Android source/bridge tests và browser chạy bundle qua bridge mô phỏng không
thay thế test Google callback, document picker, microphone/TTS và đóng/mở
offline trên điện thoại thật. Module giữ IN-REVIEW đến người dùng xác nhận.

## Bản TWA 0.1.0 cũ

Ứng dụng dùng Android Browser Helper/TWA để chạy cùng origin HTTPS với PWA.
Lớp Android không giữ một kho progress hoặc một phiên Google riêng. Khi trình
duyệt hỗ trợ TWA và website xác minh đúng chứng chỉ ký, người học mở app từ
biểu tượng; website, đăng nhập, IndexedDB/outbox và service worker tiếp tục
dùng cơ chế hiện có. Trình duyệt có thể hiện thanh URL khi origin chưa được
xác minh hoặc khi chuyển sang Google để đăng nhập.

## Mã đóng gói

- `android/twa-config.json`: package `com.regulus.hanzios`, versionCode/versionName,
  origin hiện tại, ma trận SDK/Gradle/dependency đã ghim.
- `android/app/src/main/AndroidManifest.xml`: launcher TWA, liên kết HTTPS,
  màu hệ thống và fallback Custom Tabs; không dùng WebView cho OAuth.
- `scripts/android-project.mjs`: chuẩn bị resource và kiểm tra wrapper/hash,
  origin, package, chứng chỉ, icon nguyên bản và hợp đồng phát hành.
- `scripts/build-android.mjs`: chỉ dùng toolchain đã cấu hình; tạo/reuse khóa ký,
  lint/build, xác minh signature/package/version và xuất APK cùng receipt công khai.

Browser Helper 2.7.4 từ Google Maven, Gradle wrapper 8.13 từ tag chính thức,
Android Gradle Plugin 8.13.2. License/provenance nằm trong `android/GRADLE-LICENSE.txt`
và `android/app/src/main/assets/`. Các icon là bản sao nguyên byte từ
`public/icons`; không sửa nội dung bài học hoặc thêm nguồn học liệu.

## Công cụ và build

Không tự cài toolchain nếu chưa được người dùng cho phép theo AGENTS.md.
Lượt 12/10/2026 người dùng đã cho phép tải JDK 17, Android SDK 36 trong thư mục
riêng của dự án, chấp nhận điều khoản SDK và build APK ký số. Không sửa PATH,
JAVA_HOME hoặc Android SDK toàn máy. Đường dẫn local nằm trong
`config/android-tools.local.json` (ignored), theo template example.

```powershell
npm run android:prepare
npm run android:verify
npm run android:build
npm run android:stage
```

Build dùng JDK 17, platform Android 36 và build-tools 36.0.0. Gradle download/cache
nằm ở `tmp/android-gradle-cache`. App yêu cầu Android 7.0/API 24 trở lên theo
Android Browser Helper 2.7.4; không ép override để chạy trên API thấp hơn.
Wrapper và distribution có SHA-256 pin.
`android:verify` chỉ kiểm cấu trúc/source contract, không chứng minh đã biên dịch
hoặc đã chạy trên điện thoại. Chỉ APK qua Gradle lint, apksigner và aapt mới có
receipt `signatureVerified:true`.

Khóa ký và mật khẩu nằm trong `.secrets/android-release/` (ignored). Không đưa
chúng vào source, log, APK hoặc cloud. Giữ backup riêng cho hai file này: mọi
bản cập nhật APK phải dùng cùng khóa. Script không ghi đè khóa đã có.

APK/receipt sau build ở `tmp/android-release/`. `release.json` chỉ có package,
origin, version, SHA-256 APK và fingerprint công khai. Chỉ đưa fingerprint đã
xác minh này vào `androidPackage`/`androidFingerprints` của cấu hình Cloudflare;
không dùng chứng chỉ debug hoặc placeholder. Sau build phải kiểm
`/.well-known/assetlinks.json` trả đúng package/fingerprint qua HTTPS.

`android:stage` kiểm hash/identity của receipt, xác minh lại chữ ký bằng apksigner,
giới hạn kích thước Workers và origin đang hosting trước khi copy APK vào
`public/downloads` (ignored), đồng thời cập nhật chứng chỉ công khai vào release
config local. Nó không tự deploy. Tiếp theo chạy hosting:prepare, build:cloudflare
và deploy theo CLOUDFLARE_HOSTING.md. Khi kiểm website phải tải APK về và so
SHA-256 thực tế, không chỉ kiểm status 200.

Sau deploy chạy `npm run android:check-hosted`: tải binary APK qua HTTPS, so
hash với bản đã xác minh chữ ký và đối chiếu certificate/package của assetlinks.
Đây vẫn không thay thế kiểm cài và thao tác thật trên điện thoại.

## Trải nghiệm và cập nhật

Lần đầu mở/đăng nhập/chuẩn bị nội dung cần mạng. Sau khi Hồ sơ báo dữ liệu sẵn
sàng, người học có thể đóng/mở và học phần đã lưu khi offline. Không đóng gói
toàn bộ kho học liệu trong APK và không yêu cầu người học chạy server trên máy
cá nhân. Nếu dùng trình duyệt/profile khác, cần đăng nhập để nhận tiến độ tài
khoản; không tự sao chép storage guest giữa các trình duyệt.

Cập nhật web/nội dung qua PWA và sync hiện có. Thay wrapper cần tăng versionCode,
tăng versionName cho URL mới, build cùng khóa và người học cài APK mới;
staging chặn đổi khóa/package, hạ version hoặc ghi đè binary khác lên URL cũ.
Không có cơ chế tự cài APK âm thầm.
Hệ điều hành có thể ngừng app hoặc thu hồi cache, nên không cam kết sync nền khi
app đã đóng. Quản trị, payment và chấm âm học cần mạng như web.

## Nghiệm thu

1. Kiểm signature, package/version, liên kết website hai chiều.
2. Cài APK trên điện thoại; mở và đăng nhập Google, trở lại màn học đúng tài khoản.
3. Chuẩn bị nội dung; tắt mạng, đóng/mở, học và reload giữa bài.
4. Nối mạng khi app mở; chỉ một lượt nộp, tiến độ và outbox đúng owner/reset.
5. Cài bản cập nhật cùng khóa; giữ progress, FSRS, saved item và phiên dở.
6. Kiểm microphone, IME, handwriting và viewport trên thiết bị thật.

Không đánh USER-ACCEPTED hoặc chứng nhận production từ build/source tests.

## Bản đã xuất 12/10/2026

APK 0.1.0/versionCode1, package `com.regulus.hanzios`, dung lượng 3.780.770 byte:
[tải APK](https://hanzi-os.quynguyen1404-dz.workers.dev/downloads/hanzi-os-0.1.0.apk).
Release lint/build và apksigner/aapt qua. Android lint còn 5 warning tư vấn
label/icon/backup metadata và phiên bản Gradle mới; không có error bị bỏ qua.
SHA-256: `3bf9281ccd4c86525e03ac18bc53501c2db69dd82ba3cdb8624d52257dc29064`.
Download HTTPS đã đối chiếu binary/hash, Google Digital Asset Links trả linked=true.
Chưa có nghiệm thu cài/thao tác bằng APK trên điện thoại người dùng.

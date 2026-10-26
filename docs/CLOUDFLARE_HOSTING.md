# Hosting Cloudflare và cài ứng dụng trực tiếp

Trạng thái 11/10/2026: IN-REVIEW. Người dùng mở lại phạm vi hosting, chọn miễn
phí và không yêu cầu CH Play. Web đã deploy tại
https://hanzi-os.quynguyen1404-dz.workers.dev; chưa có APK đã xác minh.

## Đăng nhập Google trên Cloudflare

### Bản học thử đồ án (12/10/2026)

`studyMode: "personal-study"` trong cấu hình hosting bật bản học thử được người
vận hành yêu cầu. Build ghim origin và manifest hiện tại cho cả client/server;
bỏ trường này và build/deploy lại để đóng chế độ. Đây không phải promotion:
registry/humanReviewed/productionEligible giữ nguyên. D1 chỉ đưa exact package
từ review/pending sang beta/pending, không ghi approved hoặc published_at.
Các query học chỉ chấp nhận pending khi build có chế độ này; owner, enrollment,
reset, prerequisite và manifest vẫn được kiểm tra. Package rejected/retired
không được mở lại. Hồ sơ có nhãn bản học thử và giới hạn đánh giá HSK.

Các bản build thông thường vẫn đóng theo gate nội dung; verify:production
không được coi là đạt chỉ vì bật chế độ học thử. Google OAuth, tiền thật và
quyền Premium vẫn có điều kiện riêng.

Người dùng chọn Google thay mật khẩu cho bản hosted. Workers thực tế từ chối
PBKDF2 600.000 vòng dù local workerd chạy được; không hạ work factor hoặc đổi
hash của tài khoản local. Bản Cloudflare ẩn form mật khẩu và API từ chối rõ ràng.
OAuth Client loại Web phải có redirect URI chính xác:
`https://hanzi-os.quynguyen1404-dz.workers.dev/auth/google/callback`.
Client ID (không bí mật) ở `googleClientId` của cấu hình local; chạy lại
hosting:prepare sẽ sinh GOOGLE_CLIENT_ID và GOOGLE_REDIRECT_URI.
GOOGLE_CLIENT_SECRET chỉ ở Wrangler secret, không đưa vào vars/source/Git.
Không xuất tệp OAuth secret vào log. Google Testing cần thêm người thử trong Audience.
Luồng dùng state/nonce/PKCE, xác minh chữ ký ID token và cookie ràng buộc trình duyệt.
Hoàn tất consent thật phải do chủ tài khoản thực hiện; không coi redirect qua
Google là đã kiểm toàn bộ callback/session/sync. Không tự gộp tài khoản theo email.

Database mới `hanzi-os-production` đã áp dụng 39 migration, khóa ngoại hợp lệ.
Wrangler migrations qua query API lỗi `incomplete input` ở trigger 0002;
file import nguyên SQL chạy thành công, ghi migration receipt cùng file. Chỉ
dùng quy trình khởi tạo này cho DB mới đã xác nhận không có người dùng;
không lặp trên DB đang có dữ liệu. D1 local được giữ nguyên.

## Máy chủ nằm ở đâu?

Cloudflare Workers chạy API/web; D1 lưu dữ liệu tài khoản và tiến độ. Máy của
chủ dự án không cần bật. Không dùng tunnel về localhost làm hosting thật.
Gói Free có hạn mức, không phải máy chủ riêng miễn phí vô hạn. Đo CPU của
đăng nhập, truy vấn và dung lượng bản build trước khi xác nhận phù hợp.
Không tự nâng gói trả phí. Có thể bắt đầu bằng tên miền workers.dev miễn phí.

## Kết nối và chuẩn bị

Đăng nhập dashboard không tự cấp quyền cho Wrangler. Trong thư mục dự án:

```powershell
npx wrangler login
npx wrangler whoami
```

Chủ tài khoản tự chấp thuận OAuth trong trình duyệt; không gửi token vào chat.
Sau khi biết đúng tài khoản đích, kiểm danh sách D1 trước khi tạo database mới;
không dùng hoặc ghi đè D1 local. Sao chép
`config/cloudflare-release.example.json` sang
`config/cloudflare-release.local.json`, điền origin HTTPS thật, remote D1 ID,
tên người vận hành và email hỗ trợ công khai. File local được Git bỏ qua.

```powershell
npm run hosting:prepare -- config/cloudflare-release.local.json
npm run build:cloudflare
```

Hai lệnh này chỉ chuẩn bị và build, không tạo DB hoặc deploy. Cấu hình sinh
trong `.deploy/wrangler.json`. Không deploy cấu hình kiểm thử mang tên
`hanzi-build-test`, origin example.test hoặc D1 ID giả.
Kiểm cấu hình Wrangler do build phát ra trước khi áp dụng migration remote
và publish. Cần backup DB remote trước migration nếu đã có dữ liệu.

Ingress Cloudflare bỏ header danh tính của adapter proxy cũ; tài khoản dùng
cookie native. Tài khoản demo/OTP dev và thu tiền đang tắt. Không tự mở cổng
production hoặc đánh dấu nội dung đã được con người review để vượt validator.
Chạy `npm run verify:production` trước phát hành production; lỗi gate cần được
xử lý bằng bằng chứng thật. Build thành công chưa có nghĩa đủ điều kiện phát hành.

## Cài không qua CH Play

PWA là lựa chọn đầu tiên: mở URL HTTPS trong Chrome Android, chọn **Cài ứng
dụng** (tên mục có thể là **Thêm vào màn hình chính**), đăng nhập rồi giữ app
mở tới khi Hồ sơ báo nội dung đã sẵn sàng. Đóng/mở từ biểu tượng và thử học
khi mất mạng. Không cần terminal hay server chạy trên điện thoại/máy cá nhân.
Nội dung chưa chuẩn bị và lần đăng nhập đầu cần mạng; đồng bộ chạy khi app mở.
OS có thể thu hồi storage, nên không coi cache thiết bị là bản backup duy nhất.

APK cài trực tiếp đã có mã đóng gói TWA và quy trình ký/xác minh trong
ANDROID_APP.md. Wrapper dùng PWA/trình duyệt tương thích, không chứa toàn bộ
học liệu cho lần khởi chạy đầu offline. Khóa ký phải được chủ dự án giữ, không
đưa khóa/mật khẩu vào Git. Cập nhật APK bên ngoài store cần người dùng cài bản
mới cùng package/khóa ký; cập nhật web/PWA qua website.

Backend đã có `/.well-known/assetlinks.json`: chỉ trả liên kết Android khi có
package ID và SHA-256 certificate hợp lệ; chưa cấu hình trả 404. Với APK ngoài
store, dùng fingerprint của khóa ký APK thực tế, không cần Play Console.

## Nghiệm thu trên hosting thật

- API và đăng nhập hoạt động khi máy chủ dự án đã tắt.
- Header `oai-*` giả không đăng nhập được; phiên tài khoản và quyền vẫn đúng.
- Cài Android, chuẩn bị nội dung, đóng/mở offline, học/nộp, reconnect chỉ ghi một lượt.
- Tiến độ/FSRS/lỗi sai/outbox và owner/reset không mất khi cập nhật PWA.
- Trang quyền riêng tư/xóa tài khoản có đúng thông tin người vận hành.
- Kiểm CPU/quota Free và gate nội dung trước khi mở cho người học rộng rãi.

Tham khảo: [Workers Free](https://developers.cloudflare.com/workers/platform/pricing/),
[D1 Free](https://developers.cloudflare.com/d1/platform/pricing/),
[Android TWA](https://developer.android.com/develop/ui/views/layout/webapps/guide-trusted-web-activities-version2).

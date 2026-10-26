# Mobile và ba phương thức đăng nhập

Cập nhật 16/10/2026: Firebase project/API key đã kết nối bằng Cloudflare Secrets;
flag HANZI hosted vẫn tắt. Tài khoản thử riêng đã nhận thư, xác minh email và đổi
mật khẩu thật; người dùng xác nhận đổi được, chưa chấp nhận form Firebase mặc định.
Tên công khai Studyhub đã đổi thành HANZI.OS, người gửi hai mẫu là HANZI.OS,
ngôn ngữ tiếng Việt. Firebase vẫn từ chối URL action/tiêu đề tùy chỉnh; chưa coi
form HANZI custom đã dùng được từ email. Theo xác nhận người dùng, policy mới
enforce 8–128 ký tự có chữ thường a–z/số 0–9, đồng bộ app/provider, không ép đổi
mật khẩu khi đăng nhập. Migration0040/0041 đã áp remote và đối chiếu giữ nguyên
59 bảng dữ liệu cũ. Xem checkpoint 16/10 để biết gate phát hành và phần còn chờ.

Trạng thái 14/10/2026: IN-REVIEW. Google web đã chạy trên hosting; Google native
picker → đăng nhập → vào học đã USER-ACCEPTED trên điện thoại thật với APK 0.3.0.
GitHub web đã kiểm đăng nhập thật → tài khoản riêng → Thiên Lộ; GitHub Android
→ quay lại app → vào học đã USER-ACCEPTED trên APK 0.3.0 theo xác nhận ngày 13/10/2026.
HANZI hosted chưa mở public.
Không coi một nút hiện ra hoặc unit test là đăng nhập thành công.

## Google trong Android

Đã tạo client `HANZI.OS Android` ngày 13/10/2026 sau xác nhận của người vận hành.
Client ID: `563577140555-oam6opjgi72m2bnnora8c7jb43mvb21i.apps.googleusercontent.com`.
Google xác nhận OAuth project còn ở chế độ testing, chỉ test users có quyền.
Client này không thay thế Web client ID dùng làm audience phía server.
GOOGLE_NATIVE_ENABLED=1 đã deploy; người dùng xác nhận picker và vào học thành công.

- Package: `com.regulus.hanzios`; tiếp tục dùng keystore hiện có, không tạo khóa mới.
- Tạo OAuth client loại Android trong cùng Google Cloud project với Web client
  đang dùng (`modular-gantry-484410-h5`), điền package và SHA-1 của release certificate.
  SHA-1 đã kiểm từ APK 0.3.0: `80:6D:1F:54:6E:41:E0:EC:D0:63:A2:08:AD:1C:CA:DE:50:8B:81:90`.
  Trong Google Auth Platform → Clients → Create client → Android, dùng package
  `com.regulus.hanzios` và fingerprint trên; không tạo lại Web client đang chạy.
- Credential Manager dùng Web client ID làm server client ID. Không nhúng client secret
  vào APK. Server kiểm chữ ký, audience, nonce và challenge gắn với thiết bị, dùng một lần.
- Đã đặt `GOOGLE_NATIVE_ENABLED=1` sau khi Android client/certificate đúng; picker
  đã được người dùng kiểm trên điện thoại. Recipe mặc định tắt; app dùng luồng browser
  hiện có nếu server chưa cấu hình hoặc thiết bị không hỗ trợ. Hủy picker không tự
  mở browser.
- Token Google và session chỉ đi qua Java/server; JS không nhận token. Session vẫn
  được mã hóa trong Android Keystore.

## GitHub

Đã tạo/kết nối OAuth App HANZI.OS ngày13/10/2026 sau xác nhận cụ thể của người
vận hành. App ID3927777, client ID `Ov23lioZYba7CzThmLiF`; secret chỉ nằm trong
kho ignored và Cloudflare bindings, không nhúng vào APK/client hoặc Git.
Homepage `https://hanzi-os.quynguyen1404-dz.workers.dev` và callback
`https://hanzi-os.quynguyen1404-dz.workers.dev/auth/github/callback`.
Đặt `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_REDIRECT_URI` bằng secret/runtime
bindings; không commit credentials. Scope chỉ `read:user user:email`, có state,
cookie binding và S256. Owner theo GitHub user ID, không gộp theo email.
GitHub vẫn dùng trang cấp quyền của nhà cung cấp rồi quay về app.
Đã cấp quyền và kiểm đăng nhập thật qua Chrome: vào thiết lập tài khoản mới,
mở Thiên Lộ, trang bảo mật có GitHub/email đã xác minh. D1 có Google2/GitHub1
trên3 owner riêng; không liên kết tài khoản hoặc sao chép tiến trình theo email.
Lỗi Cloudflare ban đầu do redirect:error trong fetch không được Workerd hỗ trợ;
adapter dùng manual và từ chối3xx, có regression chống chuyển credential.
GitHub đã có trong APK0.3.0 và lấy capability từ server; chưa cần build lại APK
chỉ để mở binding. Người dùng đã xác nhận luồng Android thật quay lại app và vào học.

## Tài khoản HANZI hosted

Đã thêm Firebase vào project `modular-gantry-484410-h5` theo xác nhận người vận
hành ngày13/10/2026: Spark miễn phí, Analytics tắt, không billing/Hosting. Email/Password
đã bật; email-link passwordless tắt. Web app HANZI.OS
`1:563577140555:web:f89a310a1cbbe0945e64ce` đã đăng ký. Chưa upload
`FIREBASE_PROJECT_ID`/`FIREBASE_WEB_API_KEY` hoặc mở flag trên HANZI.OS. Adapter server
gọi endpoint Google cố định qua HTTPS. Mật khẩu local PBKDF2 600k được giữ nguyên;
không thể import trực tiếp hash này vào Firebase và không hạ độ mạnh của hash.

**Chưa bật public:** mã local đã có quên mật khẩu, xác minh email và quy trình
xóa có lưu trạng thái/thử lại (chi tiết bên dưới). Còn cấu hình Firebase thật,
kiểm trên tài khoản fixture được phép và phát hành server/APK trước khi mở provider.
Không đặt Firebase bindings trên hosting chỉ để làm hiện nút khi các phần này chưa xong.
Ngày 13/10 đã kết nối riêng Cloudflare Secret `FIREBASE_AUTH_SERVICE_ACCOUNT`,
sau phê duyệt tạo tài khoản kỹ thuật `hanzi-auth-lifecycle` trong cùng project.
Role duy nhất là Firebase Authentication Admin. Khóa JSON nằm trong `.secrets/`
ignored; không đưa vào source/client/APK. Lookup thật với một UID cố định không
tồn tại đã xác nhận quyền, không tạo/sửa/xóa tài khoản hoặc gửi email thật.

Slice thu hồi phiên đã được triển khai và kiểm local: Admin lookup trước cấp/đọc
phiên, fence D1 đơn điệu, từ chối proof cũ và chặn reset đua với cấp phiên (kể cả
trong cùng giây). Phiên của cùng owner/provider được liên kết đều bị thu hồi.
Reply provider cũ không hạ fence hoặc revoke phiên mới; outage trả 503 retryable,
không trả authenticated:false. `firebasePasswordConfig` còn yêu cầu Admin config
đúng project khi bật flag. Nhóm adapter/guard/auth/session/coordinator 100 test và
restore 41 migration/60 bảng qua. Migration 0040 chỉ thêm bảng fence, đã áp D1
local sau backup nhất quán và xác minh fingerprint 59 bảng cũ giữ nguyên từng
dòng; remote chưa áp, mã thu hồi chưa deploy. Reset/xác minh email/deletion ceremony chưa
xong nên không coi HANZI hosted sẵn sàng cho người học.
Template nhà cung cấp còn tên project cũ Studyhub; cần rà tên và action handler
cùng lifecycle trước khi gửi email thật. Không tự gửi mail reset/xác minh cho
tài khoản của người vận hành trong kiểm thử.

Gate bổ sung: typecheck/scoped ESLint và build Cloudflare qua. Full Vitest threads
có 480 file/3.092 test qua; bốn suite lỗi mock constructor đã được sửa và rerun
4 file/11 test qua. Không ghi `check` tổng pass vì runner forks của lệnh đó đã
bị dừng. Browser workerd local kiểm được signin → guest dashboard → Thiên Lộ
217 bài; không thay kiểm nghiệm Firebase trên tài khoản thật. Cờ seed demo đã
được tắt trong preview, tám dòng demo bị ghi ở lượt smoke đầu đã hoàn nguyên;
fingerprint toàn bộ 59 bảng cũ giữ nguyên sau hoàn nguyên.
`HANZI_HOSTED_PASSWORD_ENABLED` mặc định tắt; chỉ đặt `1` sau khi các gate lifecycle
trên đã được triển khai và nghiệm thu. Có credentials đơn thuần không bật provider.

Migration `0039_hosted_password_github.sql` đã áp dụng trên D1 thật sau backup và
rehearsal: 58 bảng có trước giữ nguyên từng dòng, integrity/FK qua. Database hiện có
40 migration; không xóa `.wrangler/` hoặc dữ liệu trình duyệt.

## Kiểm trên thiết bị

Slice 13/10 bổ sung `POST /api/auth/hanzi/password-reset` và màn hình Quên mật khẩu.
Capability `hanziPasswordReset` chỉ mở cùng hosted HANZI được cấu hình. API yêu
cầu same-origin, body tối đa 1 KiB, email hợp lệ, rate-limit D1 trước khi gọi
endpoint Firebase cố định. Budget reset tách đăng nhập: 3/email và 10/IP mỗi
cửa sổ 10 phút; bảng chỉ giữ hash. Email có/không có tài khoản cùng acknowledgement;
lỗi hạ tầng trả 503 và vượt giới hạn trả 429. Không nhận continuation URL từ client.
Native transport hiện có cho phép endpoint này; chưa build/nghiệm thu APK mới.

Slice 14/10 có handler riêng `/auth/hanzi/action` cho `mode=resetPassword` và
`POST /api/auth/hanzi/password-reset/complete` với operation verify/confirm.
Code chỉ giữ trong bộ nhớ trang; xóa query/fragment khỏi URL sau đọc, không đưa
vào server props/localStorage. Worker phục vụ trang với no-store/no-referrer.
Không dùng apiKey/continueUrl/email/endpoint từ link hoặc body để chọn dịch vụ
hay owner. Verify không tiêu thụ code và không trả email; confirm kiểm lại
requestType PASSWORD_RESET trước khi gửi mật khẩu. Firebase chịu trách nhiệm
tiêu thụ code nguyên tử. Mật khẩu reset/đăng ký dùng chung policy 12–128 ký tự,
chữ và số, tối đa 256 byte UTF-8, không trim/normalize mật khẩu.
Budget action tách gửi thư/đăng nhập: 8/code và 20/IP mỗi 10 phút, chỉ lưu hash,
giữ phân biệt hoa/thường của code. Link hết hạn/đã dùng/sai loại không cấp phiên;
reset thành công cũng phải đăng nhập lại. Phản hồi thất lạc trả trạng thái chưa
xác nhận, không tự gọi là thành công. Phiên cũ bị thu hồi ở lần kiểm credential
trực tuyến kế tiếp; tiến độ/outbox theo owner không bị xóa.

**Chưa bật hosted HANZI:** Firebase đang dùng handler/template mặc định; chưa
thay cấu hình bên ngoài trong slice này. Cần sửa tên Studyhub, enforce policy
ở Firebase (để handler mặc định không là đường vòng), cấu hình URL handler
đúng origin cho resetPassword/verifyEmail và kiểm thư thật,
link hết hạn/đã dùng, đăng nhập lại trên fixture tài khoản được phép. Handler
mới nhận resetPassword và verifyEmail; recoverEmail và thay email chưa được hỗ trợ,
không cấu hình chúng dùng handler này. Browser fixture và provider stub không
chứng minh thư thật được gửi hay Firebase thật đã reset.

### Xác minh email và xóa tài khoản · mã local 14/10

`GET/POST /api/auth/hanzi/email-verification` chỉ lấy email từ alias HANZI của
owner đang đăng nhập. Gửi thư cần proof mật khẩu mới đúng UID/project/email;
ID token ở server, không nhận email/token/callback nhà cung cấp từ client.
`POST /api/auth/hanzi/email-verification/complete` kiểm loại VERIFY_EMAIL và
đúng alias; confirm tiêu thụ code tại Firebase, ghi trạng thái vào đúng identity.
Không tự cấp session, role hoặc Premium. Màn action dùng chung URL đã xóa query,
no-store/no-referrer, có đường xử lý hết hạn và lỗi kết nối.
Worker bỏ query/fragment và header điều hướng mang URL khỏi request gửi vào
renderer riêng trang action để framework không serialize code vào HTML/RSC.
URL gốc trong browser vẫn được component đọc một lần rồi xóa; OAuth callback
và body API không bị viết lại. Gate built HTTP phải chứng minh code giả lập
không xuất hiện trong HTML, ngoài kiểm no-store/no-referrer/noindex.

`POST /api/account/deletion` nhận confirmation, ownerKey và token thiết bị.
Lần đầu yêu cầu phiên first-party còn sống, đã xác thực trong 10 phút; so ownerKey
trước khi nhận intent để một yêu cầu chưa gửi của A không thể xóa B đăng nhập sau.
Migration `0041_account_deletion_jobs.sql` lưu hash token/owner/alias, đặt owner
deletion_pending và thu hồi phiên trước gọi provider. Lần gọi thứ hai hoặc lần
thử lại chỉ dùng token/owner đã ghim, không cần cookie của phiên đã thu hồi.
Lease tránh xóa trùng; UID không còn tồn tại sau phản hồi thất lạc được xử lý như
đã xóa. Provider unavailable giữ dữ liệu; local graph purge và completion nằm
trong cùng D1 batch. Bước hoàn tất xóa UID/email/project khỏi job, giữ xác nhận
31 ngày để thiết bị nhận kết quả. Privileged role và hồ sơ biên tập/media/cash
được giữ: self-service trả 409 trước khi đóng tài khoản, cần quy trình hỗ trợ.

Thiết bị lưu trạng thái trước khi gửi, ngoài namespace backup/reset dữ liệu học.
Chỉ xác nhận hoàn tất đúng owner mới dọn IndexedDB; current owner được chuyển/fence
sang guest trước khi dọn, owner B hiện tại không bị thay nếu đang xử lý yêu cầu A.
Hồ sơ có tự kiểm một lần khi sẵn sàng/mở lại, khi nối mạng và nút kiểm thủ công;
không chạy vòng retry/toast. Hàng chờ học chưa đồng bộ vẫn chặn yêu cầu xóa mới.
Native transport hiện có nhận các endpoint này; Java không chuyển cookie cho JS.

Worker scheduled chạy một job/lượt theo cron mỗi phút, giới hạn truy vấn phù hợp
Cloudflare Free (50/lượt); chưa cập nhật cấu hình hosting thật. Mã lỗi retry không
ghi email/UID/token vào log. Rehearsal 42 migration/61 bảng bảo toàn dữ liệu cũ,
job pending/provider_deleted/completed, lease và retry qua backup/restore.
Migration 0041 chưa áp vào D1 thật hoặc remote. Không chạy npm run dev để áp
migration trong lượt kiểm thử này; preview dùng phản hồi giả lập tại 4319.

Trước khi mở hosted HANZI: backup/rehearse database thật, áp 0040/0041 remote,
triển khai worker/cấu hình cron, cấu hình Firebase project/API key và policy/template
HANZI.OS, rồi kiểm email-link/đăng nhập/thu hồi/xóa trên fixture được cho phép.
Chỉ bật HANZI_HOSTED_PASSWORD_ENABLED sau các gate và build/nghiệm thu APK tương ứng.

1. Cài đè APK cùng khóa; giữ progress/outbox.
2. Kiểm thanh hệ thống sáng chữ trên nền ngọc, bàn phím không che CTA, xoay màn hình.
3. Mở Thiên Lộ, Thức Tỉnh Điện và Ký Ức Trận; Premium luôn có trên header mobile.
4. Google picker: chọn tài khoản, hủy, mất mạng, thử lại; xác nhận đúng owner sau login.
5. GitHub/HANZI chỉ kiểm khi service sẵn sàng; logout/relogin, offline/reconnect và
   chuyển tài khoản không trộn tiến trình.

Các lỗi vận hành backend trong [OPERATIONS_AUDIT.md](OPERATIONS_AUDIT.md) vẫn còn;
slice mobile/auth không tự sửa chúng hoặc mở production/payment.

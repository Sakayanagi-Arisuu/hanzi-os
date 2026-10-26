# Chạy và kiểm thử HANZI.OS theo từng module

Cập nhật: **09/10/2026**.

## 1. Chạy local

```powershell
npm install
npm run dev
```

Mở `http://localhost:3000`. `npm run dev` áp dụng migration D1 local rồi chạy
Vinext. Nếu chỉ cần dựng lại schema D1:

```powershell
npm run db:local:setup
```

Không xóa `.wrangler/`: thư mục này chứa D1 local, gồm tài khoản HANZI.OS, role,
session và dữ liệu server local. `npm run clean:local` chỉ được xóa artifact tái
tạo được và phải giữ `.wrangler/`, `docs/reports/`, `output/`, `content/`.

## 2. Chu trình nghiệm thu một module

### Kiểm thử học offline tại local

Service worker chỉ bật trong bản build. Dùng hai terminal, giữ D1 hiện có:

```powershell
# Terminal 1: API local, không tự chạy migration
npx vinext dev

# Terminal 2: build và preview offline
npm run build:offline-local
node scripts/serve-offline-local.mjs
```

Mở http://127.0.0.1:4174; preview chuyển API về http://localhost:3000.
Đợi terminal API báo `Local: http://localhost:3000/` trước khi chạy browser test.
Hai địa chỉ có browser storage riêng: tiến độ guest ở port 3000 không tự xuất
hiện ở 4174, không xóa storage để chuyển. Tài khoản dùng cùng D1 local.
Đăng nhập và giữ web mở để ứng dụng tự chuẩn bị dữ liệu. Trong **Hồ sơ → Dữ liệu
trên thiết bị**, xem trạng thái chuẩn bị; nếu chưa đủ, giữ mạng/server và thử lại.
Không cần tải thủ công từng bài. Chỉ thử mất mạng sau khi nội dung cần học đã lưu.
Sau đó ngắt mạng hoặc dừng terminal API: tài khoản đã lưu vẫn hiện, bài được mở
offline, câu trả lời và lượt nộp giữ qua đóng/mở lại. Khôi phục API và mạng khi
web mở để tự đồng bộ. Server lỗi 503 cũng được xử lý khi thiết bị vẫn có Internet.

Port 4174 chỉ là công cụ kiểm thử bản build. Người dùng PWA đã cài từ một origin
HTTPS có thể mở ứng dụng khi server tắt; họ không cần chạy server/terminal riêng.
Lần đầu đăng nhập/cài/chuẩn bị nội dung vẫn cần server. Hosting không cần cho
implementation local; kiểm cài PWA trên điện thoại thật cần HTTPS có thể truy cập.
Đã có APK TWA và bản Capacitor với build/gate riêng tại ANDROID_APP.md. Đồng bộ chạy khi ứng dụng mở, không cam kết tác vụ nền
khi hệ điều hành đã đóng ứng dụng.

Danh tính offline và quyền Premium được lưu có thời hạn tối đa 30 ngày, quyền
Premium không vượt ngày hết hạn thực. Học liệu chưa lưu, nội dung vừa xuất bản,
chấm âm học phát âm, chức năng quản trị/thanh toán và cấp phiên có authority từ
server vẫn cần kết nối. Lượt luyện đề mới dùng giờ thiết bị, chờ server chấm và
lưu lịch sử luyện; không tự tạo mastery/XP/chứng nhận hoặc mở prerequisite.
Phiên luyện đề server đã cấp trước thay đổi vẫn dùng adapter cũ, chưa có journal
offline mới. Khảo luyện đọc cũ cần server cấp phiên mới; phiên đã cấp có outbox.
Không xóa browser storage để sửa lỗi: phần chờ gửi phải được giữ theo owner/reset.

Migration `0038_offline_workspace.sql` bổ sung workspace mô tả (vị trí đọc, ngày
truy cập, lịch sử luyện đề) và không thay bảng evidence. D1 local hiện đã áp dụng;
bản sao trước migration nằm ở `tmp/pre-offline-workspace-1791533308291.sqlite`.
Nếu chạy trên database khác, áp dụng migration trước khi kiểm đồng bộ workspace.

Browser regression riêng (tạo fixture tài khoản trên D1 local, xóa sau test):

```powershell
npx playwright test --config playwright.offline.config.ts
```

Kết quả/screenshot nằm trong `tmp/`; không dùng browser profile của người học.
Đây là preview local, không phải public hosting hoặc nghiệm thu production.
Sau mỗi build, khởi động lại preview để nó đọc worker/chunk mới. Đừng chạy build
đồng thời browser test trên máy ít RAM; API dev có thể chậm hoặc lỗi gián đoạn.
`build:offline-local` bật practice preview chỉ ở localhost/127.0.0.1 để kiểm các
màn còn bị cờ phát hành đóng trong build mặc định. Cờ không mở trên hostname
khác, không thay content promotion và không bật production. Build thông thường
vẫn giữ gate phát hành; không deploy bản preview local.

Theo yêu cầu ưu tiên Thiên Lộ/Xưởng ngày 20/09/2026, tổng JS/CSS toàn ứng dụng
cộng hero vượt 1 MiB chỉ là cảnh báo theo dõi trong `check-bundle-budget.mjs`.
Phép đo vẫn bao gồm các lazy route và không đại diện cho một lượt mở bài.
Không dùng cảnh báo này để chặn phát triển; đánh giá hiệu năng bằng hành trình
browser/network thực tế. Thiếu build assets hoặc lỗi đọc tệp vẫn làm lệnh lỗi.
Build còn chạy `check-premium-client-bundle.mjs`: quét JS công khai sau build để
chặn việc import lại marker nội dung rich bài Thiên Lộ HSK4 vào client. Đây là
regression gate cho biên phân phối, không thay thế audit toàn bộ nội dung/asset.

`npm run test:restore` tạo database tạm, áp dụng 28 migration qua 0027,
sao lưu bằng `VACUUM INTO` và kiểm lại 46 bảng. Ngoài phiên/evidence/outbox,
fixture Thiên Lộ kiểm ba ngày truy cập theo owner, ảnh hai chunk với hash/byte
chính xác, metadata và ba lượt làm bài có cùng idempotency key nhưng khác
owner/reset epoch. Kiểm lại các ràng buộc JSON, outcome, epoch, FK và khóa duy
nhất sau restore. Lệnh này không đọc hoặc ghi D1 trong `.wrangler/`.

Nếu validator exact-byte báo stale sau checkout trên Windows, kiểm tra
`git ls-files --eol content` trước khi regenerate nội dung/review. Chạy
`node scripts/content/normalize-content-checkout.mjs` để lập danh sách và thêm
`--apply` để khôi phục các tệp có thuộc tính `eol=lf`. Script chỉ viết khi kết
quả bằng từng byte với Git index; snapshot còn phải khớp hash manifest. Nó từ
chối thay đổi nội dung hoặc sửa đồng thời, không thay review/approval và không
đụng D1/browser state. Các nguồn được pin CRLF có ngoại lệ rõ trong
`.gitattributes`; không chuyển chúng hàng loạt sang LF. Mâu thuẫn binding giữa
consumer cũ/mới cần audit riêng, không sửa hash để che nội dung chưa review.

Dữ liệu cho ba tài khoản demo có sẵn: xem [DEMO_WORKSPACE.md](DEMO_WORKSPACE.md).
Script chỉ chạy trên D1 local, có backup, rehearsal và kiểm tra chống trùng;
không thay mật khẩu hoặc tạo thành tích học tập giả.

1. Ghi module/journey đang kiểm ở `IMPLEMENTATION_CHECKPOINT.md`.
2. Kiểm `git status` và phân biệt thay đổi của người dùng.
3. Chạy test gần code vừa đổi; bug dữ liệu/correctness phải có regression test.
4. Nếu đổi TypeScript/runtime/UI, chạy `npm run typecheck`.
5. Chạy browser smoke cả journey, không chỉ xem trang render.
6. Người dùng test trên web local và xác nhận trước khi chuyển module.

Browser smoke tối thiểu cho module UI:

- CTA chính đi được tới kết quả mong đợi;
- keyboard/focus và touch target dùng được;
- viewport desktop và 360 px không tràn ngang;
- reload giữa chừng phục hồi đúng, không hiện chớp route “đang khôi phục”;
- `prefers-reduced-motion` tắt chuyển động trang trí;
- guest không bị ép đăng nhập cho chức năng local-first;
- lỗi hiển thị bằng ngôn ngữ người học, không lộ ID, receipt, schema hay log dev.

## 3. Gate theo rủi ro

| Loại thay đổi | Gate tối thiểu |
| --- | --- |
| Nội dung/schema | Validator/generator trực tiếp của artifact, rồi kiểm runtime consumer |
| Store/evidence/migration | Unit/integration gần code + fixture guest/account/restore |
| UI TypeScript | Test component/domain liên quan + `npm run typecheck` + browser smoke |
| Shared shell/design/performance | `npm run check`; Playwright và Lighthouse ở ranh giới module lớn |
| Dependency | Targeted test + `npm audit --omit=dev` |
| Release candidate | `npm run check`, `npm run test:e2e`, và `npm run test:lighthouse` nếu shared UI/performance đổi |

`npm run check` là full gate dài vì bao gồm content validator, test và build; không
cần chạy lại sau mỗi chỉnh CSS nhỏ. `npm run verify:production` phải tiếp tục
fail-closed khi production chưa được người dùng mở lại.

## 4. State dùng khi test

- **Guest:** state học nằm trong browser storage; dùng để kiểm offline, reload,
  backup và learner core không phụ thuộc tài khoản.
- **HANZI.OS local:** state server nằm trong D1 `.wrangler/state`; dùng để kiểm
  login, role, admin/studio và sync adapter.
- **Google/Facebook:** chỉ kiểm giao diện trạng thái chưa cấu hình khi chưa có
  domain/callback/credential thật; không giả vờ OAuth đã hoạt động.
- **Editor/Admin:** kiểm authorization ở API và deep link, không chỉ menu riêng.

Không dùng seed/fixture để cộng mastery cho người học thật. Khi cần reset dữ liệu
test, xác định rõ target và sao lưu trước; không xóa toàn bộ `.wrangler/` như một
bước cleanup thông thường.

## 5. AI hỗ trợ Vạn Quyển Các (tùy chọn)

Sao chép `GEMINI_API_KEY` từ `.dev.vars.example` sang `.dev.vars`, điền khóa rồi
khởi động lại `npm run dev`. Khóa chỉ được đọc ở route server và không được đặt
trong biến `NEXT_PUBLIC_*`. Khi chưa cấu hình, Biên tập viên vẫn có thể nhập
Pinyin và nghĩa tiếng Việt thủ công.

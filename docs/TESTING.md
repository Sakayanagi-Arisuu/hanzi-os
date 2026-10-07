# Chạy và kiểm thử HANZI.OS theo từng module

Cập nhật: **10/08/2026**.

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

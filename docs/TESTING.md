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

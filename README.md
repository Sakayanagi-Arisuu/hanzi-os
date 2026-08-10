# HANZI.OS

HANZI.OS là ứng dụng tự học Mainland Mandarin dành cho người Việt, từ HSK0 đến
HSK4, chạy local-first trên web/PWA. Chủ đề “hệ thống thức tỉnh hologram” là lớp
thẩm mỹ; tên chức năng và luồng học vẫn phải trực tiếp, dễ hiểu.

Dự án hiện được cải tiến **từng module**. Sau mỗi module, web được bật để người
dùng test và duyệt trước khi chuyển sang phần tiếp theo; không còn chạy backlog
100 task tự động.

## Chạy trên máy

Yêu cầu Node.js 24.16.0 (xem `.node-version`) và npm.

```powershell
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000). Lệnh `dev` tự áp migration D1
local. Không xóa `.wrangler/`: thư mục đó có thể chứa tài khoản, role và dữ liệu
server local.

Một số lệnh thường dùng:

```powershell
npm run clean:local   # chỉ xóa cache/build có thể tạo lại
npm run typecheck
npm run check
npm run test:e2e
npm run build
```

## Bản đồ repo

| Thư mục | Trách nhiệm |
|---|---|
| `app/` | Route, API route và metadata của ứng dụng web |
| `src/` | UI, luồng học, state, auth, sync và logic sản phẩm |
| `content/` | Package nội dung bất biến, runtime projection, draft và provenance |
| `public/` | Ảnh, audio, PWA/service worker và asset trình duyệt phục vụ trực tiếp |
| `drizzle/`, `db/` | Migration và schema D1; không xóa lịch sử migration |
| `scripts/` | Validator, generator, restore và công cụ vận hành repo |
| `e2e/` | Hành trình Playwright qua giao diện thật |
| `config/` | Contract/release policy và cấu hình fail-closed |
| `docs/` | Tài liệu còn sống; Git history giữ tài liệu đã loại bỏ |
| `worker/`, `workers/` | Worker runtime và pipeline phát hành nội dung |

Xem chi tiết tại [Kiến trúc](docs/ARCHITECTURE.md) và [Bản đồ tài liệu](docs/README.md).

## Trạng thái và dữ liệu phải giữ

- HSK0: 4/4 bài (rich 0/4).
- HSK1: 40/40, HSK2: 40/40, HSK3: 55/55, HSK4: 78/78 bài rich.
- Tổng HSK1–4: 213/213 bài rich.
- Browser guest progress nằm trong localStorage/IndexedDB; dữ liệu account local
  nằm trong D1 `.wrangler/`.

Trạng thái module và sự cố/migration hiện tại nằm ở
[Implementation checkpoint](docs/IMPLEMENTATION_CHECKPOINT.md).

## Ranh giới sản phẩm

- ChineseSkill chỉ là benchmark capability/learning flow; không sao chép code,
  layout, nội dung, media, dữ liệu đóng hoặc thương hiệu.
- Browser TTS là synthetic fallback, không phải audio native hay bằng chứng nói.
- Handwriting chỉ mở khi stroke data có provenance hợp lệ.
- Production, payment, CMS, public hosting và deploy không nằm trong luồng local
  hiện tại nếu người dùng chưa yêu cầu mở lại.
- Không stage/commit `docs/reports/`, `output/`, build output hoặc secret.

Trước khi sửa repo, đọc [AGENTS.md](AGENTS.md), sau đó chỉ nạp tài liệu của module
đang làm theo [docs/README.md](docs/README.md).

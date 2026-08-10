# Kiến trúc hiện hành của HANZI.OS

Cập nhật: **10/08/2026**. Đây là bản đồ implementation đang chạy, không phải
roadmap viết lại từ đầu.

## 1. Luồng runtime

```text
Trình duyệt/PWA
  -> app/ (route Vinext/Next-compatible, API cùng origin)
  -> app/client-runtime.tsx
  -> src/App.tsx và các screen/component
  -> localStorage + IndexedDB (guest/local-first)
  -> API server + D1 (khi dùng tài khoản)

Git content
  -> scripts/content/* validator/generator
  -> content/packages + content/runtime
  -> projection đã sanitize trong learner bundle
```

Client không được import draft, review envelope, answer key kín hoặc dữ liệu
editorial chỉ dành cho server/tooling. Package hiện hành là
`foundation-2026.08.5`; thay version phải đi qua registry, validator và migration
thay vì sửa chuỗi rải rác.

## 2. Trách nhiệm thư mục root

| Thư mục | Trách nhiệm | Không đặt ở đây |
| --- | --- | --- |
| `app/` | Route trang, layout, route API, auth callback, Admin và Studio server-rendered | Logic học dùng lại hoặc content draft |
| `src/` | Ứng dụng người học, domain model, store, sync adapter, repository/server library và test gần code | Artifact sinh hoặc migration SQL |
| `content/` | Nguồn, draft/review, package bất biến, runtime projection và báo cáo content có contract | State người học |
| `public/` | Asset được trình duyệt phục vụ: manifest, icon/hero, audio đã phát hành và notice provenance | Source asset chưa duyệt |
| `scripts/` | Generator, validator, migration/release helper và công cụ demo | Runtime UI |
| `db/` | Schema/helper database dùng trong code | Dữ liệu D1 local |
| `drizzle/` | 21 migration SQL và snapshot schema | Business logic |
| `e2e/` | Playwright journey qua UI thật | Unit test gần module |
| `config/` | Contract release/readiness có máy đọc | Secret hoặc credential |
| `worker/` | Worker entry/config tương thích app | Content publication worker |
| `workers/` | Worker chuyên biệt như phát hành content | Learner UI |
| `build/` | Plugin/helper build được version hóa | Output `dist/` |
| `docs/` | Source of truth ngắn và ADR còn giá trị | Log phiên dài hoặc backlog cạnh tranh |

`node_modules/` là dependency local, không commit. `dist/`, `playwright-report/`,
`test-results/`, `.vite/` và `tmp/` là artifact tái tạo được. `output/` và
`docs/reports/` là file người dùng, tuyệt đối không coi là cache.

## 3. Trách nhiệm bên trong `src/`

| Thư mục | Module chính |
| --- | --- |
| `screens/`, `components/` | Màn hình và UI dùng chung của learner shell |
| `store/` | Learning state/projection và action mà UI gọi |
| `learning/` | Evidence, mastery, coverage, FSRS, lesson runtime và policy |
| `assessment/` | Level check, mock practice, form/session/scoring contract |
| `audio/` | Playback/TTS fallback và contract âm thanh |
| `reader/` | Reader, dictionary lookup và saved items |
| `auth/` | Kiểu/flow danh tính phía client |
| `sync/` | IndexedDB, outbox, owner/reset fence, restore/adoption |
| `server/` | D1 repository, authorization, command parser và shared HTTP logic |
| `content/`, `data/` | Adapter từ runtime projection sang model UI |
| `system/` | Backup, import/export và hành vi hệ thống |
| `demo/`, `release/` | Contract demo/release; không phải authority tiến độ học |

Test unit/integration được đặt cạnh code bằng `*.test.ts(x)`. Khi một module có
logic dùng chung, chuyển logic vào thư mục domain tương ứng thay vì tiếp tục làm
component khổng lồ.

## 4. Cấu trúc `content/`

| Thư mục | Ý nghĩa |
| --- | --- |
| `sources/` | Reference inventory và provenance nguồn |
| `curriculum/` | Graph/blueprint curriculum |
| `drafts/` | Payload đang soạn; không learner-visible |
| `review/` | Review envelope/evidence; không tự phát hành nội dung |
| `packages/` | Package version bất biến và lineage |
| `runtime/` | Projection đã compile/sanitize mà app được phép đọc |
| `demo/` | Contract demo không seed mastery/progress |
| `reports/` | Report có máy đọc phục vụ QA content |

Không xóa package cũ chỉ vì trùng dữ liệu: registry, hash lineage, rollback và
fixture validator còn dùng chúng. Chỉ cleanup khi đã xác nhận consumer bằng
`rg`, có migration và regression test.

## 5. State và authority

- Guest học đầy đủ trên thiết bị. `localStorage` giữ projection tương thích;
  IndexedDB giữ checkpoint, outbox, resume và owner/reset-epoch fence.
- Dữ liệu D1 local nằm dưới `.wrangler/state`. Đây là **dữ liệu hoạt động**, không
  phải build cache; `npm run clean:local` phải luôn giữ thư mục này.
- Tài khoản dùng cùng learner UI; repository/sync là adapter bên dưới, không tạo
  một phiên bản UI học khác.
- Browser state/import/backup là input không tin cậy đối với authority server.
  Nó không được tự tạo mastery, completion, XP hoặc prerequisite unlock.
- Stable lesson/item/card ID và version phải được bảo toàn qua migration.

Schema hiện có 21 migration và 39 bảng. Role ứng dụng là `learner`,
`content_editor`, `admin`; authorization phải được kiểm tra ở server, không dựa
vào việc ẩn nút trên client.

## 6. Biên module để sửa từng phần

Thứ tự module do người dùng chọn và được ghi ở checkpoint. Với mỗi module:

1. khóa journey và tiêu chí quan sát được;
2. audit consumer/state/content trước khi sửa;
3. sửa một vertical slice end-to-end;
4. chạy test trực tiếp và browser smoke;
5. để người dùng test/duyệt rồi mới mở module kế tiếp.

Không vá thẩm mỹ rải rác qua nhiều module và không refactor lõi ổn định chỉ để
đổi cấu trúc thư mục.

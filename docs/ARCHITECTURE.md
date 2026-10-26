# Kiến trúc hiện hành của HANZI.OS

Cập nhật: **09/10/2026**. Đây là bản đồ implementation đang chạy, không phải
roadmap viết lại từ đầu.

## 1. Luồng runtime

Android Capacitor dùng cùng `ClientApp`/learner runtime, nhưng giao diện nằm
trong APK tại `https://localhost`. `src/native/nativeRuntime.ts` thay transport
trước mount provider; JSON/outbox/owner/reset vẫn qua protocol hiện có. Native
HTTP bridge chỉ gọi HTTPS origin đã ghim và giữ cookie trong Android Keystore;
Google qua system browser + one-time S256 exchange, không embedded OAuth hoặc
cookie copy. Kho app tách kho Chrome của TWA cũ, không được xóa kho cũ để chuyển.
`mobile/` là source/app Android Capacitor; `android/` giữ TWA cũ làm đường rollback.
Xem ANDROID_APP.md về cập nhật, backup và kiểm thử thiết bị.

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
`foundation-2026.08.7`; thay version phải đi qua registry, validator và migration
thay vì sửa chuỗi rải rác.

Các module `exerciseGeneration.ts`, `authoritativeItemBank.ts` và
`attemptScoring.ts` giữ nguyên binding của foundation. Runtime hiệu đính dùng
`editorialExerciseGeneration.ts`, `editorialItemBank.ts` và
`editorialAttemptScoring.ts`; vẫn nhận ID/đáp án foundation cho phiên cũ, đồng
thời nhận suffix lexical cho phiên mới. `content/runtime/lexical-editorial-adapter.json`
ghim riêng source adapter và derivative; `npm run content:validate` kiểm cả
foundation lẫn binding này. Không cập nhật hash để che thay đổi hành vi: phải
audit consumer, regression tương thích và giữ humanReviewed=false khi chưa có
người duyệt thật.

Context người học dùng chung nằm trong `src/store/LearningContext.ts` để các
màn tài khoản lấy owner/actions mà không import provider và câu hỏi guest.
Các hàm tạo ID phiên nằm trong `normalizedLessonCommandIds.ts` và
`normalizedAssessmentCommandIds.ts`, giữ nguyên công thức ID cũ. Parser outbox
dùng identity và ID vocabulary đã phát hành; phần đáp án ôn từ ở adapter
`reviewPresentationWord.ts`. Màn lỗi sai chỉ tải ngữ cảnh từ server sau khi mở
tham khảo, không import curriculum để lấy nhãn.

Premium hiện áp dụng cho bài HSK4 trong Thiên Lộ và các cửa luyện đề được cấu hình Premium. Phòng Luyện Đề mặc định mở A–C ở mỗi HSK; D–L mặc định Premium, có override từng level/cửa trong Xưởng. Bài dùng cùng lesson ID và
learner UI, nhưng payload rich và hoạt động gắn bài được đọc ở server sau khi
xác minh quyền. Từ điển, mục chữ và Khảo Nghiệm Căn Cơ vẫn mở
theo quy tắc đăng nhập riêng của từng khu; chúng không cần Premium. Các API mở/khôi phục đề kiểm quyền server trước khi trả câu; lịch sử và lệnh ghi/nộp phiên đã cấp giữ nguyên để bảo toàn phiên. Client giữ
metadata lộ trình công khai; `check-premium-client-bundle.mjs` chặn marker
payload bài Thiên Lộ HSK4 lọt vào JS công khai sau build. Quyền local dùng Hanzi/sandbox. Luồng VNĐ chuyển khoản thủ công dùng ledger riêng, admin đối soát có audit nguyên tử; chỉ nhận đơn khi bật hai cờ môi trường trên production HTTPS đúng origin. Local luôn đóng tiền thật; VNPay/MoMo chưa có adapter. Xem `PREMIUM_COMMERCE.md` trước cấu hình hosting.

## 2. Trách nhiệm thư mục root

| Thư mục | Trách nhiệm | Không đặt ở đây |
| --- | --- | --- |
| `app/` | Route trang, layout, route API, auth callback, Admin và Studio server-rendered | Logic học dùng lại hoặc content draft |
| `src/` | Ứng dụng người học, domain model, store, sync adapter, repository/server library và test gần code | Artifact sinh hoặc migration SQL |
| `content/` | Nguồn, draft/review, package bất biến, runtime projection và báo cáo content có contract | State người học |
| `public/` | Asset được trình duyệt phục vụ: manifest, icon/hero, audio đã phát hành và notice provenance | Source asset chưa duyệt |
| `scripts/` | Generator, validator, migration/release helper và công cụ demo | Runtime UI |
| `db/` | Schema/helper database dùng trong code | Dữ liệu D1 local |
| `drizzle/` | Migration SQL và snapshot schema | Business logic |
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

Schema được cập nhật bằng migration trong `drizzle/`. Role ứng dụng là `learner`,
`content_editor`, `admin`; authorization phải được kiểm tra ở server, không dựa
vào việc ẩn nút trên client.

### Offline PWA và đồng bộ hai chiều

`public/sw.js` cài anonymous `/offline-shell` và toàn bộ graph JS/CSS/font từ
`offline-assets.json`; shell không chứa cookie/credential. Navigation người học
dùng shell khi mất mạng hoặc server 503/408/429. Admin/Studio/auth và API thông
thường không vào cache trang. Build pin cả tài nguyên từ điển, stroke data và
âm thanh công khai; `useOfflinePreparation` tự chuẩn bị các projection, exact
review queue, sách/chương, đề và HSK4 được quyền truy cập. Trạng thái ready chỉ
ghi sau các request/cache write thành công; thiếu dung lượng/mạng báo partial và
retry có backoff. Media phát hành qua API có cache riêng theo owner/generation/
reset, kiểm lại thời hạn trước fallback, không lưu preview chưa phát hành.

`offlineAccount` chỉ giữ identity đã sanitize tối đa 30 ngày. Coordinator giữ
account khi mạng/server tắt, xác minh lại phiên trước gửi lệnh; cookie hết hạn
giữ tiến độ nhưng yêu cầu đăng nhập lại. Logout/reset đổi fence, không trộn guest
và account. `offlineRead` chỉ lưu allowlist GET theo đúng query/owner/reset với
TTL 30 ngày; các endpoint account/quyền kiểm `x-learning-owner` để chặn cookie
đổi trước khi client đổi scope. Danh tính/cache offline không cấp quyền server.

Lesson offline dùng form deterministic `offline-lesson-v1`, lưu objective attempt
và submit trong outbox. Server cấp binding thật và chấm lại khi reconnect; UI
pending không giả kết quả. Review dùng exact queue đã cấp và journal grade;
mistakes giữ lệnh hóa giải chờ gửi. XP tương tác có journal riêng và chỉ hiện
award đã được server xác nhận. Quyền rich HSK4 offline không vượt entitlement
đã xác minh và ngày hết hạn.

`workspaceSync` trao đổi journal theo key với LWW có tie-break `changeId`, giữ
concurrent edit chưa được acknowledgement. Migration 0038 thêm bảng workspace
cho vị trí đọc/ngày truy cập/lịch sử luyện, không cấp evidence/mastery. Luyện đề
thiết bị lưu exact form không answer key và câu trả lời atomic theo owner/reset;
server tái dựng item từ bank, kiểm hash/version/option/thời gian rồi lưu summary.
Giờ thiết bị không đủ authority nên lượt này không đủ điều kiện mastery,
prerequisite hay chứng nhận. Nội dung đổi không tương thích giữ nguyên câu trả
lời để xử lý, không âm thầm xóa journal.

Ứng dụng mở sẽ sync khi online/focus và theo chu kỳ, gồm upload outbox/workspace
và pull projection/content mới. Phiên bản PWA mới cài song song, chờ người học
bấm cập nhật trước activation; IndexedDB/progress giữ qua cập nhật. Chưa có APK
hoặc đảm bảo OS background sync. Các phiên legacy và API cần dịch vụ trực tiếp
được mô tả tại `TESTING.md`; không coi cache là phép thay authority server.

## 6. Biên module để sửa từng phần

Thứ tự module do người dùng chọn và được ghi ở checkpoint. Với mỗi module:

1. khóa journey và tiêu chí quan sát được;
2. audit consumer/state/content trước khi sửa;
3. sửa một vertical slice end-to-end;
4. chạy test trực tiếp và browser smoke;
5. để người dùng test/duyệt rồi mới mở module kế tiếp.

Không vá thẩm mỹ rải rác qua nhiều module và không refactor lõi ổn định chỉ để
đổi cấu trúc thư mục.

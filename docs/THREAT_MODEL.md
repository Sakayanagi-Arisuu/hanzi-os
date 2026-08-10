# Threat model HANZI.OS local-first

**Trạng thái:** working security model, cập nhật 10/08/2026. Không phải đánh giá
bảo mật độc lập và không cho phép public production.

## 1. Phạm vi và mục tiêu

Phạm vi gồm browser/PWA, same-origin route/API, localStorage, IndexedDB, D1 local
và hosted adapter chưa xác minh, tài khoản HANZI.OS, callback Google/Facebook,
Admin/Studio, content package và import/export.

Mục tiêu ưu tiên:

1. Không account nào đọc/sửa/export/xóa dữ liệu account khác.
2. Browser/import không thể tự tạo authority cho score, mastery, prerequisite,
   XP, role hoặc publication.
3. Retry, multi-tab, offline restore và sync không nhân đôi/misattributed record.
4. Content draft, hash mismatch, retired hoặc chưa duyệt phải fail closed.
5. Mic/voice không rời thiết bị nếu chưa có consent, provider, retention và
   deletion contract rõ.
6. Cleanup/migration không xóa state local hoặc rollback artifact.

## 2. Tài sản và trust boundary

| Tài sản | Mức | Quy tắc |
| --- | --- | --- |
| Email/provider subject/session | Danh tính hạn chế | Server-only; không log token/subject, callback phải exact |
| Attempt, response, saved item | Dữ liệu học riêng tư | Owner-scoped, versioned, export/delete được |
| Evidence/mastery/FSRS | Toàn vẹn cao | Chỉ policy/server hợp lệ canonicalize |
| Browser state/outbox | Dữ liệu thiết bị riêng tư | Owner/reset fence; coi input là không tin cậy |
| `.wrangler/state` | Dữ liệu server local hoạt động | Không xóa như cache; sao lưu trước reset |
| Content/answer key/review | Toàn vẹn sản phẩm | Hash/version/release gate; client chỉ nhận projection sanitize |
| Voice | Nhạy cảm | Local mặc định; upload cần consent/retention/delete riêng |
| Secret/OAuth binding | Secret vận hành | Không commit hoặc gửi client |

```text
Browser input
  -> size/schema/origin validation
  -> server-resolved identity + role
  -> owner/content/session/reset authorization
  -> idempotent transaction
  -> tenant-scoped D1 row/receipt

Git content
  -> canonical artifact/hash
  -> review/release policy
  -> sanitized runtime projection
```

Ẩn menu không phải authorization. `learner`, `content_editor`, `admin` phải được
kiểm ở server cho mọi route và object cụ thể.

## 3. Threat và control phải giữ

| Threat | Control bắt buộc | Còn phải kiểm trước public |
| --- | --- | --- |
| Cross-tenant access | Server-resolved owner, tenant predicate/FK, export/delete test | Independent authorization review |
| Forged score/mastery/role | Server policy/answer key, immutable activity version, role permission | Hosted verification và pilot learning policy |
| Replay/reorder | Idempotency key + request hash + device sequence + transaction | D1 contention/load test thật |
| Owner switch leak | Owner/reset generation, scoped outbox/cache, purge unsafe adoption | Multi-tab/relogin regression mỗi store mới |
| CSRF/cross-origin mutation | Same-origin validation, secure session/callback | Re-test final domain/provider cookie behavior |
| XSS/hostile embed | React escaping, CSP/frame/security headers, không remote script tùy ý | Header/CSP audit trên host thật |
| Service worker leak | Chỉ cache anonymous shell/public asset; không cache private API | Route/cache audit sau auth/hosting change |
| Corrupt import/restore | Parse/schema/version/migration; không tạo authority | Rehearsal backup thật và UX phục hồi |
| Content drift/leak | Registry/manifest hash, client import allow-list projection | License/native review bind exact artifact |
| Voice without consent | Không có upload mặc định; fail closed nếu thiếu ledger/provider/storage | Legal, acoustic, retention/delete validation |
| Dependency compromise | Lockfile/integrity/audit; secrets ngoài repo | CI provenance, scanning và branch protection |
| Destructive cleanup | Explicit target guard; giữ `.wrangler`, content, user reports/output | Backup/restore policy local và hosted |

## 4. Abuse regression cần có

- dùng lại idempotency key với body khác hoặc device sequence khác operation;
- submit attempt cho enrollment/session/owner khác;
- đổi activity/content version hoặc answer sau prior exposure;
- mở draft, retired, hash-mismatch hoặc prerequisite-blocked lesson;
- đổi review card/version/revision hoặc grade qua reset boundary;
- giả legacy completion/XP/FSRS/mastery từ import/browser storage;
- chuyển owner khi tab khác còn lease/outbox;
- deep-link vào Admin/Studio hoặc mutation role không đủ quyền;
- callback OAuth với origin/redirect/state không khớp;
- export/delete account khi mọi bảng user-linked đều có dữ liệu;
- upload/reuse voice object/consent của owner khác.

## 5. Gate trước public production

- auth/provider dùng subject bất biến, account recovery và recent re-auth cho
  thao tác phá hủy;
- mọi mutation route có authorization/abuse policy và test tenant boundary;
- hosted CSP/header/cache/service worker/OAuth callback được kiểm trên domain thật;
- backup/restore và account deletion được diễn tập, kể cả retention backup;
- dependency/secret/static scan và release provenance bind exact revision/build;
- content owner/license/native review bind exact manifest;
- accessibility, performance, load, privacy và security review độc lập không còn
  critical/high blocker;
- voice tiếp tục tắt nếu consent/provider/storage/retention/delete chưa đủ.

Google/Facebook chưa có credential/domain thật chỉ được hiện là “chưa cấu hình”.
Local gate hoặc số test không được mô tả thành production readiness. Commerce và
payment cần threat model riêng khi người dùng chủ động mở phạm vi đó.

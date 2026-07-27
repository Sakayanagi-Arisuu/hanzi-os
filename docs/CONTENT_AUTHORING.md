# Quy trình content package bất biến

## Phạm vi

`content/` là registry quản trị nội dung check vào Git. Đây chưa phải CMS hoàn
chỉnh và không tự tạo nội dung tiếng Trung, owner, license, audio, approval bản
ngữ hay coverage claim.

Candidate hiện tại là `foundation-2026.07.5`, schema v4 / item catalog v2:

- 24 lexeme, 24 lesson, 1 graded text, 5 grammar, 5 pronunciation, 7 character
  và 8 communicative-function item có canonical payload + hash;
- 25 knowledge item mới ở state `review`, không có owner/license hay approval;
- runtime chỉ đọc sanitized catalog gồm 24 lexeme, 14 lesson đã phát hành và 1
  graded text; draft/review/governance payload không đi vào client;
- owner/license của mọi item là `null`, review envelope rỗng;
- coverage claims và audio assets đều rỗng;
- 0 lexeme được tính là reviewed; package chưa được promote.

Flow anonymous/local vẫn dùng item bank answer-exposed tại
`src/data/assessment.ts`. Flow authenticated chỉ nhận form từ bank
server-confidential và không dùng bank phía client làm authority.

## Đồ thị hash

Registry bind SHA-256 manifest. Manifest bind:

- `item-catalog.json`: payload authored, payload hash, item version, state,
  owner/license slot và typed prerequisites;
- `runtime-catalog.json`: projection allow-list chỉ chứa payload runtime đã phát
  hành, không chứa governance, review hoặc item draft;
- `runtime-ids.json`: inventory, unit membership, word membership, state và
  lesson prerequisite graph;
- `coverage-claims.json`: schema v2 bind catalog hash và explicit item/path
  scope; hiện rỗng;
- snapshot của curriculum, knowledge-item blueprint, lesson guide, assessment
  bank, generation/scoring và lesson completion policy.

`reviews.json` không nằm trong manifest để tránh hash cycle. Review envelope
bind exact manifest + catalog hash; từng review bind explicit `itemKeys` và
`audioAssetIds`. Promotion sau cùng bind cả manifest hash lẫn review-envelope
hash.

Payload hash là SHA-256 canonical của `{ itemType, payload }`, không chứa ID.
Vì vậy nhiều ID trỏ vào payload trùng nhau chỉ được đếm một lần ở threshold
lexeme/graded-text. Catalog và runtime graph phải song ánh; payload unknown
fields, item version giả, typed prerequisite lỗi, hash drift và malformed scope
đều fail closed.

Package lịch sử giữ snapshot riêng. Lệnh validate mặc định kiểm toàn registry,
lineage và live source của package runtime-bound.

## Lệnh chỉ đọc

```powershell
node scripts/content/validate.mjs
node scripts/content/hash.mjs foundation-2026.07.5
node scripts/content/report.mjs foundation-2026.07.5
node scripts/content/verify-release.mjs foundation-2026.07.5 --channel closed-alpha
node scripts/content/promote.mjs foundation-2026.07.5 --channel closed-alpha
```

`validate` trả `0` chỉ khi mọi package hợp lệ. `report` vẫn trả `0` khi có
release blocker. `verify-release` trả `1` cho candidate hiện tại. `promote`
không có `--write` chỉ dry-run policy.

## Tạo candidate schema v4

Tạo catalog draft từ full authoring inventory của package nguồn. Tooling tái
dựng core items từ immutable governance catalog; không dùng sanitized runtime,
vì runtime cố ý không chứa 10 lesson draft:

```powershell
npm run content:catalog:export -- --from foundation-2026.07.5 --content-version foundation-2026.08.1 --catalog-schema-version 2 --output content/drafts/foundation-2026.08.1-item-catalog.json --write
```

Exporter chỉ được ghi dưới `content/drafts`, không overwrite file và cố ý tạo
pending envelope: không kế thừa owner/license/review. Editor phải sửa draft có
chủ ý; không điền evidence giả.

Trước `new-version`, đổi đồng thời:

1. import `runtime-catalog.json` trong `src/data/curriculum.ts` sang package đích;
2. literal `CONTENT_VERSION` trong file đó;
3. `config/production-readiness.json.contentVersion`.

Nếu runtime IDs/graph không đổi:

```powershell
node scripts/content/new-version.mjs foundation-2026.08.1 --from foundation-2026.07.5 --created-at 2026-08-01T00:00:00.000Z --audience closed-alpha --content-schema-version 4 --item-catalog-file content/drafts/foundation-2026.08.1-item-catalog.json --confirm-runtime-ids-unchanged true --write
```

Nếu IDs, membership, state hoặc graph đổi, cung cấp thêm
`--runtime-ids-file content/drafts/...-runtime-ids.json`. Lệnh:

- chỉ branch từ `registry.currentContentVersion`;
- validate toàn history trước mutation;
- yêu cầu runtime version và sanitized catalog import trỏ đúng version đích;
- tạo `runtime-catalog.json` canonical từ item catalog và từ chối mọi mismatch;
- stage package rồi validate trước registry write;
- tạo coverage schema v2 rỗng và review schema v2 rỗng;
- không kế thừa approval/claim;
- rollback package khi registry write thông thường lỗi.

Mutation dùng `content/.governance.lock`. Sau crash/mất điện, chỉ xóa stale
lock khi PID bên trong không còn chạy; orphan directory vẫn phải audit thủ
công. Không có tuyên bố crash-atomic.

## Review item có scope

Tạo file scope trong repo, không dùng wildcard:

```json
{
  "itemKeys": ["lexeme:ni", "lesson:boot-1"],
  "audioAssetIds": []
}
```

Ghi review vào candidate:

```powershell
node scripts/content/submit-review.mjs VERSION --review-id REVIEW_ID --role native-linguistic --decision approved --reviewer-id REVIEWER_ID --reviewed-at 2026-08-01T02:00:00.000Z --evidence-ref EVIDENCE_REF --manifest-sha256 SHA256_DIGEST --scope-file content/drafts/review-scope.json --write
```

Timestamp phải canonical UTC và không ở tương lai. Scope rỗng, key lạ, duplicate
target, equal-instant precedence, stale manifest/catalog, duplicate review ID
hoặc append sau publish đều bị từ chối mà không đổi bytes. Review mới nhất theo
role + target quyết định trạng thái; `changes-requested` chỉ revoke target nằm
trong scope. Native linguistic reviewer phải độc lập với owner của item.

## Coverage và release

Coverage claim schema v2 phải bind catalog hash và chứa:

- `itemKeys`;
- `entryLessonKeys`;
- `terminalLessonKeys`;
- attributable `evidenceRef`.

Gate kiểm exact item review, prerequisite closure, roots, sinks, toàn bộ lesson
reachable và exact lexeme membership. HSK 2 phải là strict extension của lesson
path HSK 1; không thể chỉ đổi label. Mọi claim đã khai báo đều phải hợp lệ, không
chỉ claim tối thiểu dùng cho promotion.

Closed alpha đòi ít nhất 300 distinct, released, catalog-backed,
native-reviewed lexeme và complete A0 graph. Production kế thừa toàn bộ gate
closed-alpha rồi mới kiểm HSK 1-2, 40 non-empty reviewed graded texts và native
audio cho released core content.

## Giới hạn còn chủ ý

- Grammar, pronunciation, character và communicative function đã có envelope
  typed nhưng mới là source-derived review candidates, chưa phải nội dung đã
  được linguistic review hay phát hành.
- `new-version` hiện từ chối catalog có audio assets vì chưa có importer copy
  bytes + kiểm codec/duration/alignment. Đây là blocker, không phải tính năng đã
  hoàn tất.
- Runtime projection đã được tách khỏi governance catalog và allow-list từng
  field. Không được đổi client trở lại import `item-catalog.json`.
- Catalog draft exporter là bootstrap workflow, không phải multi-user CMS,
  assignment queue hay dashboard SLA.

Không promote cho tới khi owner/license/native evidence thật, reviewed
inventory, coverage graph và audio workflow đạt gate. Sites/deploy là gate vận
hành riêng và được để tới bước cuối.

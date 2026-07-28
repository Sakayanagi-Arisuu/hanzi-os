# Quy trình content package bất biến

## Phạm vi

`content/` là registry quản trị nội dung check vào Git. Đây chưa phải CMS hoàn
chỉnh và không tự tạo nội dung tiếng Trung, owner, license, audio, approval bản
ngữ hay coverage claim.

Candidate hiện tại là `foundation-2026.07.6`, schema v6 / item catalog v4:

- 24 lexeme, 24 lesson, 1 graded text, 5 grammar, 5 pronunciation, 7 character
  và 8 communicative-function item có canonical payload + hash;
- 25 knowledge item mới ở state `review`, không có owner/license hay approval;
- 7 character item bind source-addressed radical, IDS và inspected stroke bytes,
  nhưng vẫn chờ legal/license và native linguistic review;
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
node scripts/content/hash.mjs foundation-2026.07.6
node scripts/content/report.mjs foundation-2026.07.6
node scripts/content/verify-release.mjs foundation-2026.07.6 --channel closed-alpha
node scripts/content/promote.mjs foundation-2026.07.6 --channel closed-alpha
```

`validate` trả `0` chỉ khi mọi package hợp lệ. `report` vẫn trả `0` khi có
release blocker. `verify-release` trả `1` cho candidate hiện tại. `promote`
không có `--write` chỉ dry-run policy.

## Tạo candidate kế tiếp

Tạo catalog draft từ full authoring inventory của package nguồn. Tooling tái
dựng core items từ immutable governance catalog; không dùng sanitized runtime,
vì runtime cố ý không chứa 10 lesson draft:

```powershell
npm run content:catalog:export -- --from foundation-2026.07.6 --content-version foundation-2026.08.1 --catalog-schema-version 4 --output content/drafts/foundation-2026.08.1-item-catalog.json --write
```

Exporter chỉ được ghi dưới `content/drafts`, không overwrite file và cố ý tạo
pending envelope: không kế thừa owner/license/review. Editor phải sửa draft có
chủ ý; không điền evidence giả.

Khi nguồn đã là catalog v4, exporter tái chiếu core item và knowledge item từ
lesson guide/blueprint hiện hành, rồi ghép lại nguyên vẹn character
analysis/stroke artifact của package nguồn. Audio chỉ được bind sang payload
hash mới khi transcript vẫn là một target text canonical. Nếu target text đổi,
exporter giữ candidate ở trạng thái cố ý chưa hợp lệ để editor thay đúng asset
qua `content:audio:import`; nếu target bị xóa thì export bị từ chối vì chưa có
workflow retirement audio.

Trước `new-version`, đổi đồng thời:

1. import `runtime-catalog.json` trong `src/data/curriculum.ts` sang package đích;
2. literal `CONTENT_VERSION` trong file đó;
3. `config/production-readiness.json.contentVersion`.

Nếu runtime IDs/graph không đổi:

```powershell
node scripts/content/new-version.mjs foundation-2026.08.1 --from foundation-2026.07.6 --created-at 2026-08-01T00:00:00.000Z --audience closed-alpha --content-schema-version 6 --item-catalog-file content/drafts/foundation-2026.08.1-item-catalog.json --confirm-runtime-ids-unchanged true --write
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

Với content schema v6 / catalog v4, `new-version` giữ và inspect lại đúng bytes
audio, linguistic source và stroke dataset từ package nguồn. Lệnh chỉ cho phép
rebind audio sang payload hash mới khi transcript không đổi, không cho thêm hay
thay character artifact, và từ chối target text đổi cho tới khi asset được thay
qua importer chuyên biệt.

Mutation dùng `content/.governance.lock`. Sau crash/mất điện, chỉ xóa stale
lock khi PID bên trong không còn chạy; orphan directory vẫn phải audit thủ
công. Không có tuyên bố crash-atomic.

## Nhập audio bất biến (schema v5-v6)

`content:audio:import` là đường duy nhất thêm hoặc thay audio canonical. Lệnh có
thể nâng catalog draft schema v2 không có audio thành content schema v5 /
catalog v3, hoặc tiếp tục content schema v6 / catalog v4 mà vẫn giữ và inspect
lại character artifact. Nó tự tạo `fileRef`, hash, media metadata cùng
alignment; không thu âm, sinh audio, suy diễn speaker hay tạo evidence thay
người biên tập.

Policy v1 cố ý hẹp và deterministic:

- RIFF/WAVE PCM format 1, mono, 16-bit little-endian;
- sample rate 16 kHz, 24 kHz, 44.1 kHz hoặc 48 kHz;
- thời lượng từ 250 ms đến 600.000 ms và tối đa 64 MiB mỗi file;
- `assetId` lowercase, an toàn trên Windows; đích luôn là
  `audio/<assetId>.wav`;
- source là regular non-symlink file bằng đường dẫn tương đối trong repo;
- transcript phải khớp chính xác một text tiếng Trung canonical của payload;
  segment phải có timestamp nguyên, theo thứ tự, không overlap và không vượt
  duration;
- speaker evidence và rights của từng asset phải có thật và khớp chính xác
  package-level audio rights;
- tối đa 10.000 asset và 512 MiB bytes audio được capture trong một mutation.

Descriptor schema v1 mẫu (các evidence/hash chỉ là placeholder định dạng, phải
được thay bằng dữ liệu thật trước khi chạy):

```json
{
  "schemaVersion": 1,
  "contentVersion": "foundation-2026.08.1",
  "assets": [
    {
      "assetId": "ni-headword-native-01",
      "targetItemKey": "lexeme:ni",
      "sourceFile": "content/drafts/audio/ni-headword.wav",
      "expectedFileSha256": "sha256:<64-lowercase-hex>",
      "transcript": "你",
      "segments": [
        { "startMs": 0, "endMs": 620, "text": "你" }
      ],
      "speaker": {
        "id": "<speaker-id>",
        "nativeSpeakerEvidenceRef": "<attributable-evidence-ref>"
      },
      "rights": {
        "ownerId": "<audio-owner-id>",
        "licenseId": "<audio-license-id>",
        "evidenceRef": "<rights-evidence-ref>"
      }
    }
  ]
}
```

Sau khi đổi runtime binding/config sang version đích giống flow `new-version`,
chạy:

```powershell
npm run content:audio:import -- foundation-2026.08.1 --from foundation-2026.07.6 --created-at 2026-08-01T00:00:00.000Z --audience closed-alpha --content-schema-version 6 --item-catalog-file content/drafts/foundation-2026.08.1-item-catalog.json --audio-descriptor-file content/drafts/foundation-2026.08.1-audio.json --audio-owner-id AUDIO_OWNER_ID --audio-license-id AUDIO_LICENSE_ID --audio-evidence AUDIO_EVIDENCE_REF --confirm-runtime-ids-unchanged true --write
```

Importer validate history trước mutation, kiểm hash/codec từ bytes thay vì tên
file, capture artifact nguồn một lần, copy exclusive vào package tạm, đọc và
validate lại toàn package rồi mới rename/update registry. Lỗi ở bất kỳ asset
nào xóa package tạm, giữ nguyên registry và không overwrite target. Một
`assetId` hiện hữu chỉ được dùng lại để thay đúng target cũ; đổi rights
package-level chỉ hợp lệ khi toàn bộ asset cũ được thay trong cùng mutation.
Reviews luôn được xóa. Mặc định coverage
claims cũng được xóa và không kế thừa từ package nguồn; khi truyền explicit
`--coverage-claims-file`, chỉ các claim trong file đó được giữ trong envelope
candidate mới (và file phải bind đúng hash của target item catalog). Audio vừa
import chưa đủ điều kiện release cho tới khi có exact scoped
`native-linguistic` và `audio-rights` approval. Catalog schema v1/v2 cũ vẫn
validate để giữ lịch sử, kể cả hash-only asset lớn hơn giới hạn import 64 MiB;
audio legacy không cần WAV inspection và không được tính vào production gate.

## Nhập lại metadata Hán tự trong schema v6

`content:character:import` nhận catalog draft cùng schema với package nguồn và
một descriptor hoàn chỉnh cho toàn bộ character inventory, rồi tạo catalog v4.
Lệnh giữ và inspect lại audio canonical hiện có. Nếu thay metadata nhưng target
text của character không đổi, audio được rebind sang payload hash mới; nếu text
đổi, mutation bị từ chối cho tới khi audio được thay qua `content:audio:import`.
Mọi package control file và artifact kế thừa được đọc như regular file bên
trong package thật, không đi qua symlink/junction, rồi kiểm lại identity sau
khi capture trước atomic handoff.

Lần import thật đầu tiên được lưu để audit tại
`content/sources/character-foundation-v1/`. `PROVENANCE.md` pin revision,
license evidence và transformation boundary; descriptor `.07.6` bind exact
target/source hash. Đây là reproduction evidence, không phải approval và không
được sửa để hồi tố package bất biến `.07.6`.

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
  typed nhưng mới là review candidates, chưa phải nội dung đã được linguistic
  review hay phát hành. Character source records trong `.07.6` không thay thế
  legal/license decision hoặc native review.
- `new-version` bảo toàn audio/character artifact nhưng không được dùng để thay
  asset hoặc thay sourced character analysis. Chưa có workflow retirement
  audio; xóa một target đang được bind sẽ fail closed.
- Các importer kỹ thuật đã có nhưng candidate hiện tại chưa chứa audio,
  character source, speaker/right evidence hay scoped approval thật.
- Runtime projection đã được tách khỏi governance catalog và allow-list từng
  field. Không được đổi client trở lại import `item-catalog.json`.
- Catalog draft exporter là bootstrap workflow, không phải multi-user CMS,
  assignment queue hay dashboard SLA.

Không promote cho tới khi owner/license/native evidence thật, reviewed
inventory, coverage graph và audio workflow đạt gate. Sites/deploy là gate vận
hành riêng và được để tới bước cuối.

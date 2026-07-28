# Hệ thống nội dung

## Nguyên tắc

Nội dung không được lưu như HTML tự do. Mỗi đơn vị phải có metadata để tái sử dụng trong lesson, SRS, reader, dictionary, assessment và AI tutor.

## Lát triển khai hiện tại

`foundation-2026.07.6` là candidate schema v6 / item catalog v4 hiện tại, kế
thừa inventory từ package schema v4 đầu tiên `.07.5`. Full authoring inventory
có 74 payload: 24 lexeme, 24 lesson, 1 graded text, 5
grammar pattern, 5 pronunciation target, 7 character và 8 communicative
function. Lesson khai báo `knowledgeItems` tường minh; lexeme membership phải
khớp chính xác `wordIds`. Typed prerequisite được kiểm dangling reference,
duplicate, self-reference và cycle trên toàn bộ loại item.

Runtime không đọc governance catalog. `runtime-catalog.json` là projection
allow-list chỉ chứa 24 lexeme đang được dùng, 14 lesson beta/published và 1
graded text published. Nó loại draft/review item, owner/license, review scope,
payload hash, audio metadata và cả bốn loại knowledge item mới. Exporter tạo
candidate từ full immutable authoring catalog, không lấy sanitized runtime làm
nguồn, nên 10 lesson draft không bị mất khi tạo version kế tiếp. Với catalog
v4, core/knowledge payload được tái chiếu từ authoring source hiện hành trong
khi character source/stroke artifact được ghép lại nguyên vẹn; audio chỉ được
rebind khi transcript vẫn khớp canonical target text.

Đây vẫn chỉ là authoring envelope kỹ thuật, chưa phải CMS hoàn chỉnh. 25 item
mới đều ở state `review`, owner/license đều `null`. Bảy character đã có radical,
IDS cấu trúc/cấu kiện và stroke asset source-addressed trong package bất biến,
nhưng chưa có legal/license decision hay native linguistic review. Package
không có approval, claim A0/HSK hay audio. Release gate xét
transitive dependency closure nên không thể dùng lesson đã phát hành để lách
review của knowledge item. Production tiếp tục fail closed.

Tooling đã có đường nhập audio bất biến cho candidate tương lai bằng content
schema v5 / item catalog v3. Policy v1 đọc trực tiếp RIFF/WAVE bytes và chỉ nhận
PCM mono 16-bit trong allow-list sample rate/duration/size; catalog bind exact
target payload, normalized transcript, timestamp segments, speaker evidence,
rights, media metadata và file hash. Bytes được copy package-local rồi inspect
và validate lại trước registry mutation. Catalog schema cũ vẫn đọc được để giữ
lịch sử, nhưng audio legacy/uninspected không bao giờ thỏa production audio
gate. Đây chỉ là workflow kỹ thuật: `foundation-2026.07.6` vẫn có audio catalog
rỗng và không có evidence hay approval thật.

Đường `content:character:import` tương tự tạo candidate content schema v6 /
item catalog v4 từ catalog authoring schema v2 và descriptor phủ chính xác toàn
bộ character item. Radical, component và structure phải trỏ tới linguistic
source record package-local; stroke count/file phải trỏ tới đúng một
stroke-dataset record đã được inspect từ bytes. Chữ độc lập hợp lệ với
`components: []`, còn chữ ghép phải có component và structure không phải
`independent`. Linguistic JSON và stroke source đều bind đúng character
`recordKey`; source/hash/stroke drift, path escape, symlink/junction, aggregate
quá lớn và descriptor thiếu/thừa đều fail closed trước registry mutation.
Schema cũ vẫn đọc được nhưng character metadata kiểu cũ không thể trở thành
release evidence.

Lifecycle schema v6 giờ giữ đồng thời hai loại artifact. `new-version` capture,
copy và inspect lại audio/character bytes bất biến; audio importer có thể append
hoặc thay cùng `assetId` trên đúng target mà không làm mất character data; và
character importer giữ audio, chỉ rebind target digest khi target text không
đổi. Package control file, snapshot và artifact kế thừa phải là regular file
trong trusted package tree, giữ đúng identity trong suốt capture. Mọi đường
không an toàn hoặc mutation dở dang đều fail trước registry handoff.

Validation prerequisite dùng traversal lặp và một reachability index dạng
bitset có trần 32 MiB/200.000 edge; graph nhỏ lỗi vẫn chạy exact traversal để
giữ thông báo cụ thể, còn graph lớn vượt giới hạn fail closed. Vì vậy item graph
và runtime graph khớp 10.000 lesson không còn kích hoạt closure scan bậc hai.

Characters UI hiện không dùng vocabulary đang phát hành để suy diễn kho Hán tự
hay hiển thị radical/mnemonic hard-code. Cho tới khi runtime projection có
character item đã duyệt, màn hình chỉ hiển thị trạng thái chưa có dữ liệu.
Public build cũng không copy stroke JSON. `foundation-2026.07.6` đã có source
snapshot và character candidate thật, nhưng chưa có owner, package-level license
approval, native review, promotion hay runtime character projection.

## Inventory tham chiếu HSK0-4

`content/sources/hsk-syllabus-2026/source.json` ghim đề cương HSK có hiệu lực
từ July 2026 bằng URL, ngày phát hành/truy cập, số trang và SHA-256.
`scripts/content/extract-hsk-syllabus.py` chỉ trích inventory HSK1-4 có giới
hạn gồm task, topic, vocabulary, recognition character và grammar row; source
PDF không được phân phối trong repo. Validator kiểm source identity, page range,
count, sequence và level boundary, còn `content:hsk4:report` đối chiếu inventory
với runtime hiện tại.

Để tái tạo, cài đúng các phiên bản trong
`scripts/content/requirements-hsk-syllabus.txt`, đặt PDF đã kiểm checksum tại
`tmp/pdfs/hsk-syllabus-2026.pdf`, rồi chạy `npm run content:hsk4:extract`.

Inventory này là dữ liệu tham chiếu cho curriculum authoring, không phải
runtime package hoặc release evidence. Rights vẫn `pending`; một mục được nhập
không tự mở lesson, cấp mastery, trở thành nội dung đã review hay tạo claim
coverage. Mọi claim HSK1-4 vẫn phải qua mapping, practice, review và release
gate tương ứng.

`content/curriculum/hsk0-4-graph.json` là graph authoring bind exact inventory
hash và runtime content version. Nó có năm path, 18 unit và
mapping tường minh cho toàn bộ 14 lesson đang phát hành. Validator tái tính
official vocabulary reference từ surface + pinyin của runtime: hiện có 23 mục
được lesson-map, còn `越南` được giữ trong danh sách chưa ánh xạ. Mapping state
vẫn `partial`; task, topic và grammar chưa được gán nên không tạo claim HSK.

## Backlog từ vựng HSK1

`content/sources/cc-cedict-2026-07-28/source.json` ghim snapshot CC-CEDICT
editor export bằng byte length, entry count và SHA-256. Source khai báo
CC BY-SA 4.0; attribution và thay đổi khi lọc/chuẩn hóa được ghi tại
`ATTRIBUTION.md`, còn legal review cấp dự án vẫn `pending`. Không tự động tải
từ MDBG vì website đó cấm scripted access.

`content:hsk1:import -- --write` đọc snapshot gzip cục bộ, kiểm header license,
hash và count rồi đối chiếu đúng 300 mục HSK1 theo surface + pinyin. Artifact
compact trong `content/drafts/` giữ English source senses, phát âm số/dấu,
source-line digest và trạng thái biên tập. Hiện 297 mục tương thích phát âm, 3
mục cần giải quyết tone drift và 23 mục có nhiều source match.

Đây không phải nội dung learner-ready: nghĩa tiếng Việt, ví dụ, review và
release eligibility đều bằng 0. Validator/report bắt buộc giữ draft
learner-hidden và không cho source enrichment biến thành coverage claim.

`content/curriculum/hsk1-scope.json` biến inventory phẳng thành backlog theo
sáu unit HSK1. Generator ghim exact graph hash rồi phân vùng primary
exactly-once cho đủ 15 task, 30 topic, 300 vocabulary, 66 grammar row và 246
recognition character. Mỗi unit có focus và exit-evidence mode riêng; character
inventory nằm trong unit luyện chữ, không bị tính như từ vựng đã học.

Scope này chỉ quyết định nơi biên tập item, không chứng minh lesson/practice
coverage. Checked report vẫn tách `authoringScope` khỏi released learning
mapping; task/topic/grammar thực dạy hiện vẫn bằng 0.

`content/drafts/hsk1-personal-exchange-2026.07.json` là content pack đầu tiên
được sinh từ scope: 107 nghĩa Việt AI-assisted draft, 9 lesson blueprint, 38
lượt hội thoại mẫu và exact blueprint mapping cho 2 task, 5 topic, 107
vocabulary, 32 grammar row. Mỗi lesson có prerequisite, objective và practice
blueprint dùng chung bốn modality, nhưng `authoredItemCount` vẫn bằng 0.

Pack gắn exact scope/dictionary-draft digest, giữ source-line provenance và
CC BY-SA 4.0. Native Mandarin review, Vietnamese editorial review, assessment
review và dialogue-pinyin review đều `pending`; vì vậy pack learner-hidden,
không release-eligible và không cấp mastery.

## Knowledge item

### Lexeme

- Simplified, traditional, pinyin số và pinyin dấu.
- Các sense riêng, từ loại, register, classifier.
- Frequency, HSK level, domain và region.
- Collocation, từ gần nghĩa/trái nghĩa, từ dễ nhầm.
- Audio nam/nữ/ngữ cảnh; nguồn và license.

### Character

- Unicode, radical, stroke count, components.
- Phonetic/semantic component và etymology đã biên tập.
- Simplified/traditional relation.
- Stroke data và danh sách chữ gần hình.

### Grammar pattern

- Form, function, constraints và common errors.
- Ví dụ dương/âm, minimal pairs và prerequisites.
- Mapping tới can-do statement và assessment items.

## Lesson schema

```text
Lesson
  objective
  prerequisites[]
  knowledgeItems[]
  presentationBlocks[]
  activities[]
  masteryCheck
  remediationMap
  contentVersion
```

Mỗi activity định nghĩa prompt, modality, accepted answers, scoring rubric, hint ladder, explanation, error tags và accessibility alternative.

## Lộ trình từ số 0

1. **Bootcamp âm thanh**: pinyin, initials/finals, bốn thanh, tone pairs.
2. **Sinh tồn A0**: chào hỏi, danh tính, số, thời gian, mua đồ, chỉ đường.
3. **Nền Hán tự**: nét, bộ thủ có ích, cấu kiện và chữ tần suất cao.
4. **Sơ cấp**: câu trần thuật/hỏi/phủ định, lượng từ, aspect cơ bản.
5. **Trung cấp**: complement, ba-construction, bị động, liên kết diễn ngôn.
6. **Cao cấp**: register, thành ngữ, văn bản học thuật/chuyên môn, mediation.

## Quy trình biên tập

1. Curriculum designer tạo objective và blueprint.
2. Linguist tạo/duyệt language content.
3. Native speaker thu audio theo script version.
4. Editor tạo descriptor bind exact payload và source: audio bind
   transcript/speaker/rights; character bind linguistic record và stroke
   dataset. Importer kiểm bytes rồi tạo candidate mới.
5. Reviewer bản ngữ và reviewer quyền audio duyệt exact manifest/catalog scope.
6. Assessment editor kiểm tra distractor và rubric.
7. QA kiểm tra locale, accessibility và thiết bị.
8. Pilot cohort; phân tích item rồi mới general release.

## Chất lượng

- Không dịch từng chữ khi nghĩa ngữ dụng khác.
- Không dùng pinyin thiếu tone trong nội dung dạy.
- Mọi câu có audio phải khớp text version.
- Giải thích lỗi phải nêu vì sao lựa chọn sai hấp dẫn.
- Cultural note phải có nguồn, ngày duyệt và phạm vi vùng miền.

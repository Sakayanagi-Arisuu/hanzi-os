# Hệ thống nội dung

## Nguyên tắc

Nội dung không được lưu như HTML tự do. Mỗi đơn vị phải có metadata để tái sử dụng trong lesson, SRS, reader, dictionary, assessment và AI tutor.

## Lát triển khai hiện tại

`foundation-2026.07.5` là package schema v4 đầu tiên, dùng item catalog v2. Full
authoring inventory có 74 payload: 24 lexeme, 24 lesson, 1 graded text, 5
grammar pattern, 5 pronunciation target, 7 character và 8 communicative
function. Lesson khai báo `knowledgeItems` tường minh; lexeme membership phải
khớp chính xác `wordIds`. Typed prerequisite được kiểm dangling reference,
duplicate, self-reference và cycle trên toàn bộ loại item.

Runtime không đọc governance catalog. `runtime-catalog.json` là projection
allow-list chỉ chứa 24 lexeme đang được dùng, 14 lesson beta/published và 1
graded text published. Nó loại draft/review item, owner/license, review scope,
payload hash, audio metadata và cả bốn loại knowledge item mới. Exporter tạo
candidate từ full immutable authoring catalog, không lấy sanitized runtime làm
nguồn, nên 10 lesson draft không bị mất khi tạo version kế tiếp.

Đây vẫn chỉ là authoring envelope kỹ thuật, chưa phải CMS hoàn chỉnh. 25 item
mới đều ở state `review`, owner/license đều `null`; character metadata về bộ,
nét, cấu kiện và stroke asset cố ý để trống cho tới khi có nguồn và linguistic
review thật. Package không có approval, claim A0/HSK hay audio. Release gate xét
transitive dependency closure nên không thể dùng lesson đã phát hành để lách
review của knowledge item. Production tiếp tục fail closed.

Tooling đã có đường nhập audio bất biến cho candidate tương lai bằng content
schema v5 / item catalog v3. Policy v1 đọc trực tiếp RIFF/WAVE bytes và chỉ nhận
PCM mono 16-bit trong allow-list sample rate/duration/size; catalog bind exact
target payload, normalized transcript, timestamp segments, speaker evidence,
rights, media metadata và file hash. Bytes được copy package-local rồi inspect
và validate lại trước registry mutation. Catalog schema cũ vẫn đọc được để giữ
lịch sử, nhưng audio legacy/uninspected không bao giờ thỏa production audio
gate. Đây chỉ là workflow kỹ thuật: `foundation-2026.07.5` vẫn có audio catalog
rỗng và không có evidence hay approval thật.

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
4. Editor tạo descriptor bind exact payload/transcript, speaker và rights;
   importer kiểm bytes/alignment rồi tạo candidate mới.
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

# Hệ thống nội dung

## Nguyên tắc

Nội dung không được lưu như HTML tự do. Mỗi đơn vị phải có metadata để tái sử dụng trong lesson, SRS, reader, dictionary, assessment và AI tutor.

## Lát triển khai hiện tại

`foundation-2026.07.4` là package schema v3 đầu tiên. Runtime đọc payload
lexeme, lesson và graded text trực tiếp từ catalog bất biến; từng item có
canonical payload hash, item version, release state, owner/license slot và
typed prerequisite slot. Review không được tự khai trong catalog mà được suy
ra từ review envelope bind exact manifest + explicit item keys. Coverage claim
phải nêu item scope, entry lessons và terminal lessons; gate kiểm prerequisite
closure, root/sink, reachability và lexeme membership.

Đây mới là authoring envelope kỹ thuật, chưa phải CMS hoàn chỉnh. 49 item hiện
có chưa có owner/license hay approval; không có claim A0/HSK và không có audio.
Grammar pattern, pronunciation target, character và communicative function
chưa phải item type độc lập. Audio import/codec/alignment cũng chưa có workflow
khả đạt, nên production tiếp tục fail closed.

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
4. Assessment editor kiểm tra distractor và rubric.
5. QA kiểm tra locale, accessibility và thiết bị.
6. Pilot cohort; phân tích item rồi mới general release.

## Chất lượng

- Không dịch từng chữ khi nghĩa ngữ dụng khác.
- Không dùng pinyin thiếu tone trong nội dung dạy.
- Mọi câu có audio phải khớp text version.
- Giải thích lỗi phải nêu vì sao lựa chọn sai hấp dẫn.
- Cultural note phải có nguồn, ngày duyệt và phạm vi vùng miền.

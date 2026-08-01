# Kế hoạch HANZI.OS — bản đồ án/tự học HSK0 đến HSK4

Cập nhật: 01/08/2026

Đây là roadmap đang hoạt động. Production thương mại, CMS và Sites nằm ngoài
critical path cho đến khi người dùng chủ động mở lại.

## 1. Tóm tắt dễ đọc

Nền học local-first đã ổn định. B1 vừa hoàn tất HSK1 như một level batch: toàn
bộ 40 blueprint đã thành bài học thật trên UI, có nội dung rich và level check
50 câu. Phần còn thiếu lớn nhất là đưa HSK2-4 từ authoring draft lên runtime và
giao diện theo từng level.

Ba thước đo phải đọc cùng nhau:

- **Sẵn sàng toàn dự án: 88/100 (88%)**.
- **HSK1 learner-visible: 40/40; rich Lesson UI: 40/40**.
- **Toàn HSK1-4 learner-visible: 40/213 (18,8%)**; HSK2 0/40, HSK3 0/55,
  HSK4 0/78. HSK0 có 4 bài bridge riêng ngoài mẫu số 213.

88% không có nghĩa toàn bộ kho HSK0-4 đã xong 88%. Số bài learner-visible theo
level luôn phải được báo cùng readiness toàn dự án.

## 2. Mục tiêu sản phẩm

Tạo web local-first đủ tốt để bảo vệ đồ án và tự học từ số 0 đến HSK4:

- lộ trình khác nhau theo level, prerequisite rõ và progress bền qua reload;
- học từ vựng, chữ Hán, ngữ pháp, nghe/đọc và production có hướng dẫn;
- ôn bằng FSRS, sửa lỗi, backup/restore và hoạt động offline;
- level check phù hợp từng cấp nhưng không giả làm chứng nhận chính thức;
- mở rộng HSK5-9 sau này mà không thay nền dữ liệu.

Ngoài phạm vi hiện tại: public production, deployment/Sites, commerce, CMS,
hosted pilot, native audio đầy đủ và workflow human review vận hành.

## 3. Chuẩn tham chiếu và phạm vi

Inventory được pin từ đề cương HSK 3.0 của Chinese Test Service:

- <https://www.chinesetest.cn/syllabus>
- <https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf>

Kho đã nhập 84 task, 195 topic, 2.000 vocabulary, 1.096 recognition character
và 332 grammar row cho HSK1-4. Đây là phạm vi nguồn, không tự động là nội dung
đã giao lên UI.

| Level | Blueprint | Vocabulary tăng thêm | Character | Grammar | Task | Topic |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| HSK1 | 40 | 300 | 246 | 66 | 15 | 30 |
| HSK2 | 40 | 200 | 125 | 75 | 17 | 34 |
| HSK3 | 55 | 500 | 284 | 96 | 22 | 54 |
| HSK4 | 78 | 1.000 | 441 | 95 | 30 | 77 |
| **Tổng** | **213** | **2.000** | **1.096** | **332** | **84** | **195** |

## 4. Trạng thái người học nhìn thấy

| Level | Nguồn đích | Learner-visible | Rich Lesson UI | Level check E2E | Kết luận |
| --- | ---: | ---: | ---: | --- | --- |
| HSK0 | 12 pronunciation draft | 4 bridge | 0/4 rich | diagnostic nền | dùng được lát cầu nối |
| HSK1 | 40 blueprint | **40/40** | **40/40** | **50 câu local E2E** | hoàn thành B1 local |
| HSK2 | 40 blueprint | 0/40 | 0/40 | 2 form draft | chưa học được trên UI |
| HSK3 | 55 blueprint | 0/55 | 0/55 | 2 form draft | chưa học được trên UI |
| HSK4 | 78 blueprint | 0/78 | 0/78 | 2 form draft | chưa học được trên UI |

HSK1 local hiện phủ đủ 300 từ official, 246 chữ nhận diện, 66 điểm ngữ pháp,
15 nhiệm vụ và 30 chủ đề. 40 bài rich có 132 lượt hội thoại cùng phần ngữ pháp,
guided self-check và nhiệm vụ phù hợp. Package hiện hành là
`foundation-2026.08.1`; browser TTS chỉ là synthetic practice và toàn bộ batch
giữ `humanReviewed: false`.

“Hoàn thành HSK1” ở đây chỉ có nghĩa hoàn thành level tự học local theo inventory
đã pin. Nó không phải production release, native review hay chứng nhận tương
đương kỳ thi HSK chính thức.

## 5. Định nghĩa hoàn thành

Một bài chỉ được tính learner-visible khi đã `UI-INTEGRATED`: có objective và
prerequisite, nội dung đúng cấp độ, bài tập/đáp án/giải thích hợp lệ, AI
self-review năm pass, package/runtime/local authorization hợp lệ, UI mở được và
targeted validator cùng UI smoke xanh.

Một level chỉ hoàn thành khi:

1. toàn bộ blueprint của level học được trên UI;
2. task/topic/vocabulary/character/grammar coverage đạt 100%;
3. nội dung có độ sâu đúng level;
4. Path, prerequisite, progress và persistence đúng;
5. level check chạy end-to-end và chỉ cấp evidence đúng policy;
6. targeted checks, full check và E2E đã xác nhận;
7. checkpoint + roadmap được cập nhật và commit cùng batch.

## 6. Độ sâu bắt buộc theo level

| Level | Trọng tâm | Dạng nội dung chính |
| --- | --- | --- |
| HSK0 | âm, khẩu hình, tone, câu sinh tồn | nghe phân biệt, tone pair, shadowing |
| HSK1 | từ/câu tần suất cao, đời sống | micro-lesson, hội thoại ngắn, recall |
| HSK2 | chuỗi câu và tình huống | dialogue, sentence build, dictation, short text |
| HSK3 | kể/mô tả/đoạn văn | graded text, note, inference, guided paragraph |
| HSK4 | đọc/nghe dài, tóm tắt/lập luận | long-form, paraphrase, production, timed mock |

Exercise engine dùng chung, nhưng objective, content depth, rubric, skill weight
và assessment phải khác theo level.

## 7. Kế hoạch thực thi batch-first

### B0 — daily-life và dọn tài liệu

Trạng thái: **hoàn thành** tại readiness 82%, HSK1 14/40 và rich 10/40. Package
`foundation-2026.07.8` được giữ immutable.

### B1 — hoàn tất toàn bộ HSK1

Trạng thái: **hoàn thành** tại readiness 88%.

- 40/40 bài learner-visible và rich;
- 300 vocabulary, 246 character, 66 grammar, 15 task, 30 topic;
- personal exchange, time/place/events, daily life, travel/leisure, study/work
  và character foundation đều nối vào Path/Lesson UI;
- prerequisite/persistence/progress đúng qua package upgrade;
- level check 50 câu chạy end-to-end, không cấp mastery hay waiver;
- final `npm run check` xanh; full E2E chạy một lần và mọi spec lỗi sau điều tra
  đều được chạy lại đúng phạm vi đến khi xanh.

### B2 — tích hợp HSK2

**Batch đang chờ tiếp theo.** Dùng 40 blueprint trong ba unit:

- situational dialogue;
- sentence chains;
- short-text production.

Đầu ra: 40/40 bài rich trên UI; 200 vocabulary tăng thêm, 125 character, 75
grammar, 17 task, 34 topic; level check HSK2 end-to-end. Không commit từng bài
hoặc unit nhỏ.

### B3 — tích hợp HSK3

55 blueprint trong paragraph input, narration và guided production. Đầu ra cần
graded text/hội thoại dài hơn, note-taking, dictation, inference, kể lại, viết
đoạn và level check HSK3 end-to-end.

### B4 — tích hợp HSK4

78 blueprint trong deep comprehension, summary/argument và timed integration.
Đầu ra cần long-form reading/listening, paraphrase, summary, structured
writing/speaking, timed practice và mock HSK4.

### B5 — đóng gói đồ án local

Kiểm tra xuyên suốt HSK0-4, mobile, keyboard, reduced-motion, restore; cập nhật
demo; chạy full check, E2E, Lighthouse và audit; đóng local release candidate.
Sites/deployment chỉ chạy sau lệnh riêng của người dùng.

## 8. Thước đo sẵn sàng toàn dự án

| Trụ cột | Tối đa | Hiện tại | Ý nghĩa |
| --- | ---: | ---: | --- |
| A. Ứng dụng/offline learning loop | 20 | 19 | lesson/reader/review, persistence, offline, UX |
| B. Mastery/evidence/remediation | 15 | 12 | FSRS, evidence theo skill, sửa lỗi |
| C. Lộ trình HSK0-4 khác biệt | 15 | 14 | 5 path, 18 unit, blueprint/prerequisite |
| D. Nội dung học được trong runtime | 30 | 26 | HSK0 bridge + toàn bộ HSK1 rich |
| E. Assessment/mock | 10 | 8 | HSK1 level check E2E; HSK2-4 còn draft |
| F. Đồ án/QA/local release | 10 | 9 | demo/gates mạnh; final package còn mở |
| **Tổng** | **100** | **88** | **Sẵn sàng toàn dự án: 88%** |

Trụ cột D chỉ tăng khi bài mới lên UI. Generated content, test count và số dòng
không tạo điểm. Tiến độ learner-visible từng level ở mục 4 luôn được báo cùng
bảng này.

## 9. Quy tắc nguồn và review cho local

- Dùng inventory pinned và nguồn mở làm phạm vi/provenance.
- AI được phép viết nội dung gốc và self-review năm pass; không sao chép nguyên
  bài từ giáo trình đóng.
- UI công bố `humanReviewed: false`; human/production review queue không được
  dùng làm critical path cho bản local.
- Browser TTS là synthetic practice, không phải native audio/mastery.
- Production gate tiếp tục fail-closed và không bị sửa trong các content batch.

## 10. Quy tắc cập nhật

Mỗi commit phải cập nhật file này và `docs/IMPLEMENTATION_CHECKPOINT.md`, nêu:

- readiness A/100;
- learner-visible và rich UI X/Y theo từng level;
- deliverable vừa nhìn thấy trên UI;
- verification thực tế;
- level batch duy nhất tiếp theo.

Không thêm nhật ký dài. Chi tiết lịch sử đã có trong Git.

# Kế hoạch HANZI.OS — bản đồ án/tự học HSK0 đến HSK4

Cập nhật: 01/08/2026

Đây là roadmap đang hoạt động. Production thương mại và Sites nằm ngoài
critical path cho đến khi người dùng yêu cầu mở lại.

## 1. Tóm tắt dễ đọc

HANZI.OS không thiếu tính năng học cốt lõi. Lesson, Reader, Review, FSRS, lưu
local, backup/restore, Path và giao diện responsive đã hoạt động. Phần còn thiếu
lớn nhất là **đưa kho nội dung HSK1-4 đã authoring lên runtime và giao diện theo
từng level**.

Ba con số phải được đọc cùng nhau:

- **Sẵn sàng toàn dự án: 82/100 (82%)** — gồm ứng dụng, kiến trúc, mastery,
  lộ trình, content tooling, QA và đóng gói đồ án.
- **Nội dung HSK1 learner-visible: 14/40 bài blueprint (35%)**.
- **HSK1 có trình bày chuyên sâu trên Lesson UI: 10/40 bài (25%)**; HSK2-4
  hiện chưa có bài learner-visible.

Vì vậy 82% không có nghĩa là kho bài học HSK0-4 đã xong 82%. Từ commit này,
mọi agent phải báo cả tiến độ dự án lẫn tiến độ bài học trên UI.

## 2. Mục tiêu sản phẩm

Tạo một web local-first đủ tốt để:

- bảo vệ đồ án bằng luồng học hoàn chỉnh, có dữ liệu và kịch bản demo;
- tự học từ số 0 đến HSK4 với lộ trình khác nhau theo level;
- học từ vựng, chữ Hán, ngữ pháp, nghe/đọc và production có hướng dẫn;
- ôn bằng FSRS, sửa lỗi và giữ progress sau reload/backup;
- mở rộng HSK5-9 sau này mà không thay nền dữ liệu.

Không nằm trong mục tiêu hiện tại:

- production public, Sites/deployment, CMS operator và commerce;
- pilot người dùng, SLO/telemetry hosted hoặc pháp lý phát hành đại trà;
- audio bản ngữ đầy đủ và chứng nhận nội dung đã qua native review;
- tuyên bố chứng nhận hay tương đương kỳ thi HSK chính thức.

## 3. Chuẩn tham chiếu và phạm vi

Inventory được pin từ đề cương HSK 3.0 của Chinese Test Service:

- <https://www.chinesetest.cn/syllabus>
- <https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf>

Kho hiện đã nhập 84 task, 195 topic, 2.000 vocabulary, 1.096 recognition
character và 332 grammar row cho HSK1-4. Đây là phạm vi nguồn, không tự động là
bài học đã giao.

| Level | Blueprint | Vocabulary tăng thêm | Character | Grammar | Task | Topic |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| HSK1 | 40 | 300 | 246 | 66 | 15 | 30 |
| HSK2 | 40 | 200 | 125 | 75 | 17 | 34 |
| HSK3 | 55 | 500 | 284 | 96 | 22 | 54 |
| HSK4 | 78 | 1.000 | 441 | 95 | 30 | 77 |
| **Tổng** | **213** | **2.000** | **1.096** | **332** | **84** | **195** |

## 4. Trạng thái người học nhìn thấy ngay bây giờ

| Level | Nội dung nguồn | Learner-visible | Rich Lesson UI | Đánh giá level E2E | Kết luận |
| --- | ---: | ---: | ---: | --- | --- |
| HSK0 | 12 bài pronunciation draft | 4 bài cầu nối | 4 bài lesson cơ bản | diagnostic nền | dùng được một lát nền |
| HSK1 | 40 blueprint | 14 bài | 10 bài rich | 50 item draft, chưa end-to-end | đang tích hợp |
| HSK2 | 40 blueprint | 0 | 0 | 2 form draft | chưa học được trên UI |
| HSK3 | 55 blueprint | 0 | 0 | 2 form draft | chưa học được trên UI |
| HSK4 | 78 blueprint | 0 | 0 | 2 form draft | chưa học được trên UI |

Mười bài rich HSK1 gồm:

- 6 bài thời gian, lịch, giờ, vị trí, thời tiết và sự kiện;
- 4 bài số lượng, ăn uống, mua sắm/quần áo và sức khỏe/nhà cửa.

Bốn bài `daily-1…4` đã ở immutable package `foundation-2026.07.8`, được local
authorization mở sau prerequisite, nằm trong sanitized runtime catalog và được
`src/learning/richLessonContent.ts` đưa vào cả hai màn Lesson. Chúng không chỉ
nằm trong kho dữ liệu.

## 5. Định nghĩa hoàn thành

### Một bài hoàn thành

Một bài chỉ được tính learner-visible khi đã đạt trạng thái `UI-INTEGRATED` theo
`docs/CONTENT_DELIVERY_PLAYBOOK.md`: nội dung đúng, AI self-review xong,
runtime/package/authorization hợp lệ, UI đọc được, prerequisite đúng và smoke
test qua.

### Một level hoàn thành

Một level chỉ được ghi hoàn thành khi:

1. toàn bộ blueprint của level được materialize và học được trên UI;
2. task/topic/vocabulary/character/grammar inventory đạt coverage 100%;
3. bài học có độ sâu đúng level, không chỉ là danh sách từ;
4. Path, prerequisite, progress và chuyển cấp chạy đúng;
5. level check chạy end-to-end và phân tích lỗi theo kỹ năng;
6. local persistence/restore không mất progress;
7. targeted tests, full check và E2E của level xanh;
8. roadmap/checkpoint được cập nhật và commit.

### Toàn bộ đồ án hoàn thành

- HSK0-4 đều đạt định nghĩa trên.
- Có mock/timed practice phù hợp từng level, đặc biệt HSK3-4.
- Có demo seed, walkthrough, kiến trúc, giới hạn và bằng chứng kiểm thử.
- Có local release candidate ổn định; Sites vẫn có thể để bước cuối riêng.

## 6. Độ sâu bắt buộc theo level

| Level | Trọng tâm | Dạng nội dung chính | Không được làm |
| --- | --- | --- | --- |
| HSK0 | âm, khẩu hình, tone, câu sinh tồn | nghe phân biệt, tone pair, shadowing | dùng bài grammar dài |
| HSK1 | từ/câu tần suất cao, đời sống | micro-lesson, hội thoại ngắn, recall | chỉ đưa flashcard rời rạc |
| HSK2 | chuỗi câu và tình huống | dialogue, sentence build, dictation, short text | sao chép template HSK1 |
| HSK3 | kể/mô tả/đoạn văn | graded text, note, inference, guided paragraph | chỉ tăng số từ mỗi câu |
| HSK4 | đọc/nghe dài, tóm tắt/lập luận | long-form, paraphrase, structured production, timed mock | gắn nhãn HSK4 cho bài ngắn nông |

Exercise engine được dùng chung, nhưng objective, content depth, rubric, skill
weight và assessment phải khác theo level.

## 7. Kế hoạch thực thi mới — batch-first

### B0 — Chốt lát daily-life và dọn tài liệu

Trạng thái: **hoàn thành tại 82%**.

Kết quả learner-facing:

- thêm 4 bài daily-life vào runtime và rich UI;
- thêm 54 runtime lexeme, đưa runtime vocabulary lên 155;
- HSK1 learner-visible tăng 10 lên 14;
- promotion queue chuyển sang travel/leisure;
- xóa staging package input và nhật ký Markdown lặp lại.

Targeted tests, full repository check, build và walkthrough E2E mở `daily-1`
đều xanh. Commit của lát này cập nhật đồng thời roadmap/checkpoint và loại
staging khỏi repo.

### B1 — Hoàn tất toàn bộ HSK1 theo một level batch

Ưu tiên tiếp theo. Không tiếp tục commit từng lesson/unit nhỏ.

Phạm vi:

- materialize đủ 40 blueprint HSK1;
- phủ 300 vocabulary, 246 character, 66 grammar, 15 task và 30 topic;
- tích hợp travel/leisure, study/work và character foundation;
- bù các blueprint personal-exchange còn thiếu so với 4 bài source hiện tại;
- đưa toàn bộ lên Path/Lesson UI qua shared rich adapter;
- chạy level check HSK1 end-to-end.

Mục tiêu sau batch:

- HSK1 learner-visible: **40/40**;
- HSK1 rich UI: **40/40**;
- HSK1 inventory coverage: **100%**;
- HSK2-4 vẫn khóa đúng.

### B2 — Tích hợp HSK2

Phạm vi 40 blueprint trong ba unit:

- situational dialogue;
- sentence chains;
- short-text production.

Đầu ra: 40/40 bài trên UI, 200 vocabulary tăng thêm, 125 character, 75
grammar, 17 task và 34 topic; level check HSK2 end-to-end.

### B3 — Tích hợp HSK3

Phạm vi 55 blueprint trong ba unit:

- paragraph input;
- narration;
- guided production.

Đầu ra: graded text/hội thoại dài hơn, note-taking, dictation, inference, kể
lại và viết đoạn; level check HSK3 end-to-end.

### B4 — Tích hợp HSK4

Phạm vi 78 blueprint trong ba unit:

- deep comprehension;
- summary/argument;
- timed integration.

Đầu ra: long-form reading/listening, paraphrase, summary, structured
writing/speaking, timed practice và mock HSK4.

### B5 — Đóng gói đồ án local

- kiểm tra HSK0-4 xuyên suốt, mobile, keyboard, reduced-motion và restore;
- cập nhật demo seed/walkthrough;
- chạy full check, E2E, Lighthouse và audit;
- đóng local release candidate và tài liệu bảo vệ đồ án;
- Sites/deployment chỉ thực hiện sau lệnh riêng của người dùng.

## 8. Sprint tăng tốc đề xuất

Mục tiêu alpha nội dung tích hợp: **5–7 ngày làm việc tập trung**, nếu không phát
sinh thay đổi shared architecture và chấp nhận AI-assisted review cho local.

| Ngày | Mục tiêu |
| --- | --- |
| 1 | chốt B0; materialize/review toàn HSK1 còn lại |
| 2 | HSK1 runtime/UI + level check; đóng B1 |
| 3 | HSK2 full batch |
| 4 | HSK3 full batch |
| 5–6 | HSK4 full batch, timed/mock |
| 7 | end-to-end QA và local candidate |

Đây là lịch alpha rất quyết liệt, tận dụng draft/generator đã có. Thời gian sửa
sau khi người dùng học thử, audio bản ngữ, human review và production không nằm
trong 5–7 ngày. Nếu gặp lỗi dữ liệu thật, agent phải báo chênh lệch bằng số bài
và lý do cụ thể thay vì âm thầm kéo dài.

## 9. Thước đo sẵn sàng toàn dự án

| Trụ cột | Tối đa | Hiện tại | Ý nghĩa |
| --- | ---: | ---: | --- |
| A. Ứng dụng/offline learning loop | 20 | 19 | lesson/reader/review, persistence, offline, UX |
| B. Mastery/evidence/remediation | 15 | 12 | FSRS, evidence theo skill, sửa lỗi |
| C. Lộ trình HSK0-4 khác biệt | 15 | 14 | 5 path, 18 unit, blueprint/prerequisite |
| D. Nội dung học được trong runtime | 30 | 21 | HSK0 + 14 bài HSK1; 10 bài rich |
| E. Assessment/mock | 10 | 7 | form draft có, chưa chạy đủ từng level |
| F. Đồ án/QA/local release | 10 | 9 | demo/gates mạnh; final package còn mở |
| **Tổng** | **100** | **82** | **Sẵn sàng toàn dự án: 82%** |

Trụ cột D sẽ chỉ tăng khi bài mới lên UI. Generated content, test count hoặc
line count không tạo điểm. Con số learner-visible theo level ở mục 4 luôn được
báo cùng bảng này.

## 10. Quy tắc nguồn và review cho local

- Dùng inventory chính thức/pinned và nguồn mở làm phạm vi/provenance.
- AI được phép tổng hợp, viết mới và self-review nội dung gốc.
- Không sao chép nguyên bài từ giáo trình đóng.
- AI review năm pass thay human review cho local; UI công bố rõ điều đó.
- Browser TTS là practice synthetic, không phải native audio/mastery.
- Không chờ workflow legal/commercial để hoàn thiện bản tự học local.
- Production gate vẫn fail-closed và không bị xóa.

## 11. Quy tắc cập nhật

Mỗi commit phải cập nhật file này và `docs/IMPLEMENTATION_CHECKPOINT.md`:

- project readiness A/100;
- learner-visible và rich UI X/Y theo từng level;
- deliverable vừa nhìn thấy trên UI;
- verification thực tế;
- batch tiếp theo.

Không thêm nhật ký lịch sử dài vào file này. Chi tiết commit cũ đã có trong Git.

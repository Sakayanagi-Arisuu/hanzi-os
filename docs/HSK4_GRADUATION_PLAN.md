# Kế hoạch đồ án HANZI.OS — HSK0 đến HSK4 chuyên sâu

Ngày chốt phạm vi: 28 July 2026

## 1. Mục tiêu đang hoạt động

Xây một sản phẩm local-first đủ tốt để:

- bảo vệ đồ án tốt nghiệp bằng một luồng học hoàn chỉnh và có thể trình diễn;
- tự học từ số 0 đến HSK4 với lộ trình, nội dung và đánh giá khác nhau theo
  từng cấp;
- tiếp tục mở rộng lên HSK5-9 sau này mà không phải thay lại mô hình dữ liệu,
  mastery hoặc content pipeline.

Production thương mại, Sites, hosted recovery, operator CMS, commerce, pháp lý
phát hành đại trà và pilot quy mô lớn được **tạm hoãn**, không bị xóa. Kế hoạch
production dài hạn vẫn được lưu tại `docs/PRODUCTION_UPGRADE_PLAN.md`.

Chuẩn tham chiếu chính là đề cương HSK 3.0 hiện hành do Chinese Test Service
công bố, gồm task, topic, vocabulary, Chinese characters và grammar:

- https://www.chinesetest.cn/syllabus
- https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf

Không được ghi “đủ HSK1”, “đủ HSK2”, “đủ HSK3” hoặc “đủ HSK4” cho tới khi
inventory nguồn chính thức của cấp đó đã được nhập, ánh xạ và báo cáo coverage
đạt 100%.

## 2. Định nghĩa hoàn thành

Một bản HSK0-4 hoàn thành phải có:

1. Năm blueprint độc lập: HSK0, HSK1, HSK2, HSK3 và HSK4.
2. Inventory có version và provenance cho toàn bộ mục HSK1-4 trong đề cương
   tham chiếu: task, topic, vocabulary, character và grammar.
3. Mỗi inventory item được ánh xạ tới ít nhất một lesson/practice; prerequisite
   không dangling, không cycle và không mở nội dung chưa phát hành.
4. HSK0 có bootcamp pinyin, initials/finals, bốn thanh, neutral tone, tone pair
   và các quy tắc biến điệu nền tảng.
5. HSK1-2 ưu tiên nhận diện, câu ngắn, giao tiếp đời sống và recall có kiểm soát.
6. HSK3 ưu tiên đoạn văn, tường thuật, dictation, grammar production và đọc
   hiểu có suy luận đơn giản.
7. HSK4 ưu tiên văn bản dài hơn, chủ đề xã hội thông dụng, tóm tắt, viết có cấu
   trúc, nói có lập luận và luyện bài có giới hạn thời gian.
8. FSRS, mistake remediation và evidence vẫn tách theo kỹ năng; XP không thay
   mastery.
9. Có diagnostic HSK0, bộ kiểm tra cuối cấp HSK1-4 và ít nhất một luồng mock
   hoàn chỉnh cho mỗi cấp thi.
10. Local backup/restore, offline recovery, keyboard, mobile và reduced-motion
    vẫn hoạt động.
11. Có kịch bản demo, dữ liệu mẫu, báo cáo kiến trúc, giới hạn và bằng chứng
    kiểm thử để bảo vệ đồ án.

Audio browser TTS được phép dùng cho practice và phải được ghi rõ là synthetic;
nó không phải bằng chứng phát âm hay audio bản ngữ. Nội dung do máy hỗ trợ soạn
không được mô tả là đã qua native review.

## 3. Lộ trình khác nhau theo cấp

| Cấp | Trọng tâm | Dạng học chủ đạo | Điều kiện kết thúc |
| --- | --- | --- | --- |
| HSK0 | Pinyin, khẩu hình, thanh điệu, nghe-phân biệt, câu sinh tồn | nghe/chọn, tone pair, shadowing tự đánh giá, nhận diện chữ đầu tiên | vượt kiểm tra âm và hoàn thành các prerequisite nền |
| HSK1 | Từ/câu tần suất cao, hỏi đáp cá nhân, thời gian và số lượng | micro-lesson, recall, hội thoại ngắn, đọc câu | đạt coverage HSK1 và kiểm tra nghe/đọc nền |
| HSK2 | Đời sống thường ngày, chuỗi câu, aspect và bổ ngữ nền | hội thoại theo tình huống, sentence build, dictation ngắn | đạt coverage HSK2 và bài cuối cấp riêng |
| HSK3 | Kể lại, mô tả, đoạn văn, liên kết diễn ngôn | graded reader, dictation, viết câu/đoạn, nghe đoạn | đạt coverage HSK3 và bài cuối cấp riêng |
| HSK4 | Đọc/nghe dài hơn, chủ đề xã hội, tóm tắt và lập luận | đọc sâu, note-taking, paraphrase, structured writing/speaking, timed mock | đạt coverage HSK4 và mock test HSK4 |

Một exercise engine có thể được dùng chung, nhưng blueprint, prerequisite,
skill weight, content depth, rubric và assessment của các cấp không được đồng
nhất.

## 4. Sáu phase thực thi

### G0 — Pivot và baseline

- Đóng lát cắt production đang dở.
- Dọn artefact build/test cục bộ.
- Chốt thước đo 100 điểm và source of truth mới.
- Thêm contract cho năm level profile, không làm thay đổi dữ liệu cũ.

Exit: repo sạch, baseline xanh, roadmap mới và level contract có test.

### G1 — Official inventory và coverage report

- Lưu source descriptor với URL, ngày truy cập, checksum và edition.
- Xây importer/parser tách task, topic, vocabulary, character và grammar HSK1-4.
- Lưu inventory dạng dữ liệu, không hard-code hàng nghìn mục trong component.
- Báo cáo exact count theo level/type, duplicate, missing field và source drift.

Exit: inventory HSK1-4 tái tạo được từ source pin; coverage hiện tại hiển thị
đúng và không suy diễn.

### G2 — Curriculum graph và placement

- Ánh xạ inventory vào blueprint HSK0-4.
- Tạo unit/lesson prerequisite riêng cho từng level.
- Mở điểm bắt đầu theo self-declaration + diagnostic, không tự cấp mastery.
- Hiển thị progress trong level và điều kiện chuyển cấp.

Exit: năm lộ trình khác nhau chạy được với dữ liệu mỏng nhưng đúng graph.

### G3 — Content factory HSK0-2

- Hoàn thiện bootcamp âm thanh.
- Tạo lesson, example, dialogue, graded text và exercise từ schema.
- Bổ sung character practice, grammar note và remediation.
- Chạy validation và biên tập mẫu trước khi đưa vào runtime beta.

Exit: HSK0-2 dùng được end-to-end và coverage report không còn khoảng trống.

### G4 — Content factory HSK3-4

- Mở rộng paragraph/long-form reading và listening.
- Thêm dictation, paraphrase, summary, structured writing/speaking rubric.
- Tạo nội dung theo topic/function thay vì chỉ học danh sách từ.
- Bổ sung mock test và phân tích lỗi theo kỹ năng.

Exit: HSK3-4 dùng được end-to-end; HSK4 có timed practice và mock.

### G5 — Đồ án, QA và đóng gói local

- Chạy full checks, E2E, Lighthouse và audit.
- Kiểm tra mobile, keyboard, reduced-motion, offline backup/restore.
- Chuẩn bị seed demo, walkthrough, sơ đồ kiến trúc, test evidence và giới hạn.
- Đóng bản local release candidate.

Exit: có bản chạy ổn định và bộ tài liệu bảo vệ đồ án. Sites/deployment chỉ bắt
đầu sau khi người dùng yêu cầu.

## 5. Thước đo tiến độ 100 điểm

| Trụ cột | Điểm tối đa | Baseline 28/07 | Cách ghi nhận |
| --- | ---: | ---: | --- |
| A. Nền ứng dụng và offline learning loop | 20 | 17 | lesson/reader/review, local persistence, offline, UX và build |
| B. Mastery, evidence và remediation | 15 | 12 | FSRS, evidence theo skill, assessment authority và sửa lỗi |
| C. Lộ trình HSK0-4 khác biệt | 15 | 3 | blueprint, prerequisite, placement và level progress |
| D. Nội dung có coverage HSK0-4 | 30 | 2 | inventory, mapping, lesson, dialogue/reader, character/grammar |
| E. Assessment và mock HSK0-4 | 10 | 3 | diagnostic, level checks, timed mock và rubric |
| F. Đồ án, QA và local release | 10 | 5 | docs, demo, accessibility, performance và release package |
| **Tổng** | **100** | **42** | **Tiến độ hiện tại: 42%** |

42% là baseline chi tiết cho **mục tiêu HSK0-4 chuyên sâu**, không phải phép đổi
trực tiếp từ 55,1% của roadmap production cũ. Nền kỹ thuật đã mạnh, nhưng 24
lexeme, 14 lesson và 1 graded text hiện tại chỉ là lát foundation rất nhỏ so với
khối nội dung mới nên trụ cột D chưa được tính cao.

## 6. Quy tắc cập nhật phần trăm

- Mỗi commit phải cập nhật bảng tiến độ trong file này và
  `docs/IMPLEMENTATION_CHECKPOINT.md`, kể cả khi tổng điểm không đổi.
- Chỉ tăng điểm khi deliverable có tên trong phase đã tồn tại và test/validation
  áp dụng cho nó đã xanh.
- Generated file, migration snapshot, số dòng code và test lặp lại không tự làm
  tăng điểm.
- Import inventory chưa làm tăng điểm “nội dung hoàn chỉnh” nếu chưa có mapping
  và practice tương ứng.
- Không giảm quality gate để đổi lấy phần trăm.
- Nếu phát hiện baseline trước đó tính quá cao, phải ghi rõ lý do điều chỉnh,
  không âm thầm sửa số.

## 7. Nhịp giao hàng dự kiến

- Bản demo dùng được: 10-14 ngày tập trung.
- Bản HSK0-4 tương đối chuyên sâu: 3-4 tuần.
- Native review thủ công toàn bộ nội dung là một track riêng và có thể kéo dài
  6-10 tuần; nó không nằm trên critical path của bản local phục vụ đồ án.

Ưu tiên tuyệt đối trong bốn tuần là inventory, curriculum, content và
assessment. Auth operator, commerce, production telemetry, hosted pilot và
Sites không được chen vào critical path.

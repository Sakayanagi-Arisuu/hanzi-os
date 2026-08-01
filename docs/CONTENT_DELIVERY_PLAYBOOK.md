# Playbook giao nội dung HANZI.OS lên giao diện

Tài liệu này biến kho authoring hiện có thành bài học thật nhanh, có kiểm soát
và dễ bàn giao giữa các agent. Nó dành cho phạm vi đồ án/tự học local, không phải
quy trình xuất bản thương mại.

## 1. Kết quả cần tạo

Đầu ra của mỗi lô không phải là “thêm JSON” hay “thêm test”. Đầu ra phải là một
người học có thể:

1. nhìn thấy unit trên Path;
2. mở bài theo đúng prerequisite;
3. học từ/câu có Hanzi, Pinyin và nghĩa Việt;
4. đọc/nghe hội thoại hoặc văn bản đúng độ khó;
5. hiểu điểm ngữ pháp và làm guided practice;
6. thực hiện nhiệm vụ giao tiếp/đọc/viết phù hợp level;
7. hoàn thành bài và tiếp tục lộ trình mà không mất progress.

## 2. Nguồn đã có — không làm lại

Repository đã có:

- inventory HSK1-4 được pin: 84 task, 195 topic, 2.000 vocabulary, 1.096
  recognition character và 332 grammar row;
- graph 5 level, 18 unit và prerequisite;
- 213 lesson blueprint: HSK1 40, HSK2 40, HSK3 55, HSK4 78;
- draft vocabulary/practice/dialogue/grammar/assessment theo level;
- lesson engine, Reader, Review, FSRS, persistence, runtime compiler và rich
  lesson adapter;
- AI-assisted local-study profile và production gate tách riêng.

Agent tiếp theo phải **chuyển những thứ này lên runtime/UI theo lô**, không xây
lại nguồn, graph, CMS, reviewer workflow hoặc lesson engine.

## 3. Mức độ nội dung theo level

### HSK0

- Pinyin, initials/finals, 4 tone, neutral tone và tone sandhi nền.
- Nghe phân biệt, tone pair, khẩu hình, shadowing tự đánh giá.
- Câu sinh tồn rất ngắn; không nhồi grammar trừu tượng.

### HSK1

- Mỗi bài là micro-lesson xoay quanh một tình huống cụ thể.
- Từ mới có ví dụ ngắn; hội thoại 2–6 lượt; một điểm grammar nhỏ.
- Bài tập recognition, meaning, pinyin/tone, sentence choice và task ngắn.
- Nội dung phủ 300 vocabulary, 246 character, 66 grammar, 15 task, 30 topic.

### HSK2

- Hội thoại dài hơn, chuỗi 2–4 câu và tình huống hằng ngày.
- Aspect/bổ ngữ nền, sentence building, dictation ngắn và short text.
- Không chỉ tăng số từ của HSK1; phải tăng độ liên kết câu.

### HSK3

- Đoạn văn và hội thoại nhiều lượt, kể lại/mô tả và liên kết diễn ngôn.
- Note-taking, dictation, reading inference đơn giản, viết đoạn có khung.
- Mỗi unit phải có graded text và guided production.

### HSK4

- Văn bản/nghe dài hơn, tóm tắt, paraphrase, lập luận và chủ đề xã hội.
- Structured writing/speaking có rubric tự đánh giá; timed practice và mock.
- Không tái dùng template HSK1 với nhiều từ hơn.

## 4. Cấu trúc tối thiểu của một lesson payload

Mỗi bài cần có:

- `lessonId`, `level`, `unitId`, `sequence`, objective và prerequisite;
- danh sách vocabulary/character/grammar/task/topic source IDs;
- tiêu đề và mô tả tiếng Việt dễ hiểu;
- dialogue hoặc reading/listening text;
- mỗi câu: Hanzi, Pinyin, nghĩa Việt, speaker/context nếu có;
- grammar note: mẫu câu, giải thích ngắn, ví dụ đúng level và lỗi thường gặp;
- guided self-check với đáp án/tiêu chí;
- exercises có correct answer, distractor hợp lý và explanation;
- communicative/reading/writing task tùy level;
- disclosure AI-assisted và synthetic TTS;
- content/package/schema version cùng integrity binding.

## 5. Năm pass AI self-review

Chạy theo lô, không tạo một workflow thủ công cho từng câu:

1. **Mandarin:** đúng ngữ pháp, tự nhiên, collocation và lượng từ.
2. **Pinyin:** tone, neutral tone, sandhi hiển thị và Erhua nhất quán.
3. **Tiếng Việt:** nghĩa đúng ngữ cảnh, không dịch máy cứng hoặc mơ hồ.
4. **Sư phạm:** objective, độ khó, distractor, đáp án và giải thích khớp nhau.
5. **Coverage:** mọi source ID đúng level/unit; không bỏ sót hoặc đếm trùng.

Mỗi issue phải có trạng thái `resolved` trước khi local authorization. Artifact
phải giữ `humanReviewed: false`; không chờ người review thật cho mục tiêu hiện
tại.

## 6. Luồng làm việc một level batch

### Bước A — khóa phạm vi

- Đọc checkpoint và chọn đúng level kế tiếp.
- Xuất bảng source IDs theo unit/lesson.
- Ghi con số đầu vào: blueprint, vocab, character, grammar, task, topic.
- Không chỉnh shared architecture ở bước này.

### Bước B — materialize nội dung

- Tái dùng generator và source draft hiện có.
- Tạo payload lesson theo schema chung.
- Dùng template theo dạng hoạt động, nhưng nội dung/câu/đáp án phải riêng cho
  từng lesson.
- Chạy validator schema/coverage tại cuối cả level, không sau từng record.

### Bước C — AI review theo lô

- Chia lô theo unit và loại target, không theo một file cho mỗi reviewer.
- Sửa trực tiếp các nhóm lỗi có cùng nguyên nhân.
- Regenerate một lần sau khi toàn bộ issue đã đóng.

### Bước D — runtime và UI

- Tạo một immutable package cho cả level batch hoặc một unit lớn.
- Authorization chỉ mở IDs đã review và có prerequisite closure.
- Runtime catalog chỉ chứa nội dung learner-visible.
- Rich lesson adapter phải đọc artifact mới; Path/Lesson phải hiện đúng dữ
  liệu, không fallback sang câu hỏi dùng chung.

### Bước E — kiểm tra có trọng tâm

- Validator source/schema/coverage.
- Unit test generator, authorization, runtime adapter và rich lesson adapter.
- Một Playwright smoke đại diện mỗi dạng lesson mới; không cần E2E cho từng
  bài cùng template.
- Chỉ khi targeted checks xanh mới chạy full gate tại ranh giới level.

### Bước F — cập nhật và commit

- Cập nhật bảng UI coverage và project readiness trong hai file nguồn chuẩn.
- Ghi rõ số bài mới đã nhìn thấy trên UI.
- Xóa staging/export tạm.
- `git diff --check`, stage và commit một lần cho level batch.

## 7. Cách xử lý test để không rơi vào vòng lặp

Khi test lỗi:

| Loại lỗi | Ví dụ | Cách làm |
| --- | --- | --- |
| Kỳ vọng cũ | test vẫn đợi 14 bài khi runtime đã có 18 | cập nhật fixture/snapshot có chủ đích |
| Generated drift | report hash/count chưa regenerate | chạy đúng generator một lần |
| Lỗi nội dung | đáp án sai lượng từ, Pinyin sai | sửa source, thêm regression nhỏ |
| Lỗi tích hợp | runtime có bài nhưng UI không đọc | sửa adapter/authorization, thêm UI smoke |
| Lỗi ngoài phạm vi | production/Sites gate | giữ pending, không chen vào local batch |

Sau một chỉnh sửa, chạy lại file test lỗi. Không chạy `npm run check` sau từng
patch. Full check chỉ chạy lại khi targeted set đã xanh hoặc khi lỗi full check
chỉ xuất hiện ở integration boundary.

## 8. Bảng trạng thái bắt buộc

Checkpoint phải có bảng dạng này:

| Level | Blueprint | Learner-visible | Rich UI | Level check E2E | Trạng thái |
| --- | ---: | ---: | ---: | --- | --- |
| HSK1 | 40 | 14 | 10 | chưa | đang tích hợp |

`Learner-visible` nghĩa là người học thật sự mở được. `Rich UI` nghĩa là có nội
dung level-specific thay vì chỉ dùng exercise generator cơ bản.

## 9. Nhịp báo cáo

Trong một phiên dài, báo khi đạt một trong các mốc:

- materialize xong toàn level;
- AI review đóng toàn bộ issue;
- runtime/UI mở được;
- targeted checks xanh;
- full gate xanh và commit.

Mỗi báo cáo tối đa vài đoạn, dùng số bài/chủ đề/từ thay cho tên script. Nếu đang
chạy lệnh dài, cập nhật ít nhất mỗi 60 phút.

## 10. Phần được phép giản lược cho đồ án local

- Không cần human/native reviewer trước khi đưa lên local UI.
- Không cần audio bản ngữ; browser TTS phải được gắn nhãn synthetic.
- Không cần licensing workflow thương mại, operator CMS, hosted telemetry,
  commerce, pilot hoặc Sites.
- Không cần một immutable package cho từng bài; package cả unit/level.
- Không cần full Lighthouse/audit sau mỗi data-only batch.

Những thứ không được giản lược: câu/đáp án đúng, Pinyin/meaning đúng, level
mapping, prerequisite, không mất progress, UI mở đúng dữ liệu và không tuyên bố
mastery/chứng nhận sai.

## 11. Dọn dẹp

Giữ lại source draft, immutable package đang được registry tham chiếu, runtime
artifact được app import và test bảo vệ correctness. Xóa hoặc không commit:

- `*-package-input` staging sau khi package đã tạo;
- export review/audio tạm;
- build output, screenshot test và report thử;
- nhật ký lịch sử lặp lại trong source-of-truth Markdown.

Không xóa deferred production implementation chỉ vì không chạy trong sprint;
chỉ xóa khi `rg` chứng minh không còn consumer hoặc khi tài liệu trùng hoàn toàn
với source-of-truth khác.

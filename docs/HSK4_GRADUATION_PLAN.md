# HANZI.OS — inventory HSK0-HSK4 và hợp đồng migration

**Trạng thái:** roadmap legacy đã chốt tại commit `52cce0c`; tài liệu này được
giữ vì `AGENTS.md` yêu cầu và là contract bảo toàn nội dung trong Reforge.

**Roadmap sản phẩm hiện hành:** `docs/RESTRUCTURE_MASTER_PLAN.md`.

Tài liệu này **không còn là danh sách việc phát triển tiếp theo** và không phải
tuyên bố HANZI.OS đã đạt chất lượng sư phạm, UX hay độ sâu của ChineseSkill.
Lịch sử batch B0-B9/M1-M5 nằm trong Git.

## 1. Mốc legacy phải giữ đúng nghĩa

- **Sẵn sàng theo roadmap local cũ:** 96/100.
- **Sẵn sàng phạm vi mở rộng M1-M5 cũ:** 97/100.
- **Reforge parity:** 0/100 task được nghiệm thu tại thời điểm lập baseline.

96/100 và 97/100 là hai snapshot của phạm vi implementation cũ. Chúng không
được cộng vào tiến độ Reforge và không được diễn giải là “sản phẩm hoàn thiện
96%”. Từ đây, tiến độ sản phẩm được tính bằng task `DONE` đã đủ evidence trong
master plan; `DONE` ở đây đồng nghĩa đã được nghiệm thu (`ACCEPTED`).

## 2. Inventory nguồn chính thức đang dùng

Nguồn syllabus được materialize tại
`content/sources/hsk-syllabus-2026/inventory.json`.

| Cấp | Từ vựng | Chữ nhận dạng | Ngữ pháp | Nhiệm vụ | Chủ đề |
| --- | ---: | ---: | ---: | ---: | ---: |
| HSK1 | 300 | 246 | 66 | 15 | 30 |
| HSK2 | 200 | 125 | 75 | 17 | 34 |
| HSK3 | 500 | 284 | 96 | 22 | 54 |
| HSK4 | 1.000 | 441 | 95 | 30 | 77 |
| Tổng HSK1-4 | **2.000** | **1.096** | **332** | **84** | **195** |

Runtime có thêm 16 vocabulary ID demo/bridge, nên tổng runtime là **2.016**.
Số inventory không chứng minh từng mục đã có đủ ví dụ, lượt luyện, audio, nét
viết, recall, review interval hoặc human/native review.

## 3. Bài đang giao cho người học

| Cấp | Blueprint dự kiến cũ | Learner-visible | Rich Lesson UI |
| --- | ---: | ---: | ---: |
| HSK0 | 4 | **4/4** | **0/4** |
| HSK1 | 40 | **40/40** | **40/40** |
| HSK2 | 40 | **40/40** | **40/40** |
| HSK3 | 55 | **55/55** | **55/55** |
| HSK4 | 78 | **78/78** | **78/78** |
| HSK1-4 | 213 | **213/213** | **213/213** |

Package hiện hành là `foundation-2026.08.5`, tổng cộng 217 lesson runtime. Các
trạng thái HSK1-4 ở đây có nghĩa bài đã được adapter giao và mở được theo
prerequisite của roadmap cũ. Chúng không tự động đạt acceptance của lesson
engine, content density hoặc usability trong Reforge.

## 4. Assessment legacy

- Level check local hiện có: HSK1 50 câu, HSK2 60 câu, HSK3 54 câu và HSK4 72
  câu, với attempt/evidence versioned.
- Mock practice hiện có hai form A/B cho mỗi HSK1-HSK4, mỗi form 12 câu và thời
  lượng 18-35 phút tùy level.
- Các mock 12 câu là prototype luyện tập nguyên bản, **không phải đề HSK đã thi,
  không phải cấu trúc đầy đủ của kỳ thi và không được quảng bá như đề thật**.
- Khi Reforge assessment, chỉ dùng blueprint/mẫu công khai hợp lệ làm chuẩn cấu
  trúc; câu hỏi, distractor, giải thích và media phải là nội dung nguyên bản hoặc
  có giấy phép rõ ràng.

## 5. Hợp đồng bảo toàn khi Reforge

Mọi vertical slice thay thế UI/runtime cũ phải giữ các invariant sau:

1. Stable content/lesson/item ID không đổi nếu semantics không đổi. Nếu buộc
   đổi, phải có bảng migration deterministic và regression test.
2. Attempt giữ content version, schema version, idempotency key, timestamp và
   skill evidence; replay không được cộng progress hai lần.
3. Local projection, IndexedDB/localStorage, review schedule và enrollment hiện
   hữu phải đọc được sau nâng cấp; fail-closed khi dữ liệu/version không hợp lệ.
4. Local-to-account/cloud migration phải backward compatible và không chiếm
   nhầm dữ liệu của guest hoặc account khác.
5. Prerequisite/unlock không được mở nội dung chưa `UI-INTEGRATED`; lesson cũ
   vẫn truy cập được cho đến khi slice thay thế đạt acceptance.
6. Không suy mastery kỹ năng A từ evidence kỹ năng B. XP, streak, số câu đúng,
   exposure và mastery phải là các khái niệm riêng.
7. Browser TTS không phải evidence nói/phát âm. Hanzi recognition không phải
   evidence viết nét. Metric UI phải nói đúng loại bằng chứng đã thu.
8. FSRS/review schedule chỉ thay đổi sau migration test và so sánh cohort mẫu;
   không reset lịch ôn để đơn giản hóa UI.
9. Disclosure `humanReviewed: false` được giữ cho đến khi có review thật, có
   danh tính người review và provenance đủ kiểm chứng.
10. Không xóa generator/artifact đang có runtime consumer. Dùng `rg` xác nhận,
    migrate consumer, chạy validator rồi mới dọn.

## 6. Cổng nghiệm thu lại nội dung trong Reforge

Một bài legacy chỉ được tính “đã chuyển sang Reforge” khi đồng thời:

- mục tiêu, prerequisite, level mapping và thời lượng kỳ vọng rõ;
- vocabulary/Hanzi/Pinyin/nghĩa Việt/ví dụ đúng ngữ cảnh;
- có input dễ hiểu, knowledge card, thực hành có giàn đỡ và recall;
- exercise types phù hợp cấp, đáp án/distractor/giải thích hợp lệ;
- audio/pronunciation/handwriting nói đúng capability thực sự có;
- review evidence nối đúng skill và không làm progress tăng phi thực tế;
- hoạt động tốt bằng keyboard, touch/mobile và reduced motion;
- runtime/package/local authorization hợp lệ, deep-link và restore không chớp;
- targeted validator/test xanh và có UI smoke trên viewport mục tiêu;
- checkpoint, master plan và tài liệu này cập nhật cùng commit.

Các trạng thái vẫn dùng đúng nghĩa:

`DRAFT -> VALIDATED -> AI-REVIEWED -> RUNTIME-WIRED -> UI-INTEGRATED -> COMMITTED`

Chỉ `UI-INTEGRATED` và `COMMITTED` được tính vào số bài người học nhận được.
Task Reforge chỉ `DONE`/được nghiệm thu khi đạt thêm acceptance của task tương ứng.

## 7. Phạm vi parity có kiểm soát

- Critical path: Mainland Mandarin, giao diện tiếng Việt, HSK0-HSK4,
  local-first web/PWA.
- Functional parity nghĩa là tương đương về hành trình, loại hoạt động, review,
  assessment, accessibility và độ sâu được đo; không phải clone pixel hay copy
  curriculum/asset của ChineseSkill.
- Taiwan Mandarin, Cantonese, native iOS/Android, commerce và hosted production
  nằm ngoài 100 task trừ khi master plan hoặc người dùng chủ động mở rộng.
- Không tuyên bố “đủ HSKx” hoặc “parity hoàn tất” nếu coverage chỉ là inventory,
  còn task external/human/native/device chưa có evidence.

## 8. Cách báo sau mỗi milestone

Luôn ghi cả hai trục:

- **Legacy:** 96/100; HSK0 4/4 (rich 0/4), HSK1 40/40, HSK2 40/40,
  HSK3 55/55, HSK4 78/78; rich HSK1-4 213/213, trừ khi migration thật sự làm
  thay đổi số liệu.
- **Reforge:** X/100 task `DONE`/được nghiệm thu, kèm ID task và bằng chứng người học nhìn
  thấy/làm được.

Nếu content count giảm do lỗi hoặc migration, phải báo thẳng, sửa regression và
không giữ số cũ để làm đẹp tiến độ.

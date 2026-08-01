# HANZI.OS — hướng dẫn bắt buộc cho mọi agent

## 1. Mục tiêu đang hoạt động

Xây bản local-first phục vụ đồ án tốt nghiệp và tự học từ HSK0 đến HSK4.
Ưu tiên số một là **nội dung tiếng Trung có chiều sâu đã nhìn thấy và học được
trên giao diện hiện tại**. Production thương mại, Sites, hosted pilot, commerce,
CMS vận hành và thủ tục phát hành đại trà đang tạm hoãn.

Không được biến công việc nội dung thành một dự án hạ tầng mới khi lesson,
Reader, Review, FSRS, lưu local và giao diện hiện tại đã đáp ứng yêu cầu.

## 2. Thứ tự đọc trước khi làm

1. `docs/IMPLEMENTATION_CHECKPOINT.md` — trạng thái thật tại commit hiện tại.
2. `docs/HSK4_GRADUATION_PLAN.md` — đích, số lượng và thứ tự các lô nội dung.
3. `docs/CONTENT_DELIVERY_PLAYBOOK.md` — cách tạo, tích hợp, kiểm tra và báo cáo.
4. Chỉ đọc `docs/PRODUCTION_UPGRADE_PLAN.md` khi người dùng chủ động mở lại
   production.

Không lặp lại lát cắt đã ghi là hoàn thành. Không mở một lô mới khi checkpoint
hiện tại còn thay đổi chưa commit, trừ khi đang sửa chính lô đó.

## 3. Hai con số tiến độ bắt buộc phải báo

Mỗi báo cáo và mỗi commit phải nêu cả hai, không chỉ nêu “82%”:

- **Tiến độ sẵn sàng toàn dự án:** thước đo 100 điểm trong roadmap.
- **Tiến độ nội dung trên UI:** số bài learner-visible / số blueprint dự kiến,
  tách riêng HSK0, HSK1, HSK2, HSK3 và HSK4. Với bài chuyên sâu, báo thêm số
  bài có hội thoại/ngữ pháp/nhiệm vụ thật trên Lesson UI.

Draft, inventory, generated JSON, test, số dòng code và package chưa nối vào UI
không được tính là bài học đã giao cho người dùng.

## 4. Định nghĩa một bài/lô đã hoàn thành

Một bài chỉ được ghi `UI-INTEGRATED` khi đồng thời có:

1. mục tiêu, prerequisite và level mapping;
2. từ vựng, Hanzi, Pinyin, nghĩa Việt và ví dụ đúng ngữ cảnh;
3. nội dung phù hợp cấp độ: hội thoại/văn bản, điểm ngữ pháp và bài tập;
4. đáp án, distractor và giải thích hợp lệ;
5. AI self-review năm pass, công bố `humanReviewed: false`;
6. runtime/package/local authorization hợp lệ;
7. được adapter giao diện đọc và người học mở được theo đúng prerequisite;
8. targeted validator/test xanh và ít nhất một UI smoke cho lô;
9. checkpoint + roadmap đã cập nhật và commit.

Các trạng thái phải dùng đúng nghĩa:

`DRAFT -> VALIDATED -> AI-REVIEWED -> RUNTIME-WIRED -> UI-INTEGRATED -> COMMITTED`

Chỉ hai trạng thái cuối được tính vào tiến độ nội dung trên UI.

## 5. Cách làm ưu tiên tốc độ

- Mặc định làm **một lô lớn theo cả level**; nếu quá lớn thì tối thiểu một unit
  hoàn chỉnh. Không commit từng bài nhỏ khi cùng schema/giao diện.
- Tận dụng authoring draft và 213 blueprint đã có. Không tạo lại inventory,
  graph hay tính năng đã ổn định nếu không có lỗi thật.
- Dành phần lớn thời gian cho nội dung + runtime + UI. Test là cổng xác nhận ở
  cuối lô, không phải deliverable chính và không tạo phần trăm.
- Trong khi làm chỉ chạy validator/test trực tiếp của phần vừa đổi. Khi lỗi,
  phân loại: kỳ vọng cũ, generated drift hay lỗi sản phẩm; chạy lại đúng test
  lỗi trước, không lặp toàn bộ suite sau mỗi chỉnh sửa nhỏ.
- Chỉ chạy full gate một lần khi lô đã hoàn chỉnh và targeted checks đã xanh.
- Không xây workflow human/native review cho phạm vi local. AI-assisted
  self-review được phép; phải giữ disclosure và không suy ra chứng nhận HSK,
  native audio hay production eligibility.
- Browser TTS dùng để luyện nghe/đọc, không được tính là bằng chứng mastery nói
  hoặc phát âm.
- Không refactor kiến trúc ổn định chỉ để làm code “đẹp hơn” trong lô nội dung.

## 6. Ma trận kiểm tra

Trong lúc authoring/tích hợp:

- generator `--check` và validator của artifact vừa đổi;
- Vitest đúng module, runtime adapter và lesson UI vừa đổi;
- `npm run typecheck` hoặc `npm run build` nếu đổi TypeScript/runtime/UI.

Tại ranh giới một unit/level đã hoàn thành:

```powershell
npm run check
npm run test:e2e
```

Chạy `npm run test:lighthouse` khi thay đổi shared UI/performance hoặc đóng local
release candidate. Chạy `npm audit --omit=dev` khi dependency thay đổi hoặc ở
local release candidate. Không chạy lại Lighthouse/audit cho một lô chỉ đổi dữ
liệu nếu không có lý do.

`npm run verify:production` phải tiếp tục fail-closed; không chạy hoặc sửa cổng
production trong critical path hiện tại.

## 7. Quy tắc nội dung và dữ liệu

- Không expose/unlock/recommend/count nội dung chưa `UI-INTEGRATED`.
- Không suy ra kỹ năng này từ evidence của kỹ năng khác; XP không phải mastery.
- Learning attempt phải giữ content/schema version và idempotency key.
- Offline recovery và local-to-cloud migration phải backward compatible.
- Mỗi bug correctness/data-loss phải có regression test.
- Ví dụ do AI soạn phải là nội dung gốc, tự nhiên, đúng level và được rà năm
  pass; không sao chép nguyên bài từ giáo trình có bản quyền.
- Inventory chính thức và nguồn mở được dùng làm chuẩn phạm vi/provenance.
- Không tuyên bố “đủ HSKx” cho đến khi inventory level đó đạt coverage 100%,
  toàn bộ bài level chạy trên UI và level check hoạt động end-to-end.
- Giữ keyboard, mobile và reduced-motion.
- Không dùng force flag để bỏ qua gate lỗi.

## 8. Dọn repo

- Không commit thư mục staging, export tạm, report thử hoặc build output.
- Generated artifact chỉ giữ khi runtime/validator thực sự tiêu thụ nó.
- Trước khi xóa code/tài liệu, dùng `rg` xác nhận không còn consumer. Git history
  là nơi giữ nhật ký cũ; source-of-truth hiện tại không chứa hàng nghìn dòng
  nhật ký lặp lại.
- Giữ `.openai/hosting.json` và Sites nguyên trạng cho đến khi người dùng yêu
  cầu bước deployment cuối cùng.

## 9. Mẫu cập nhật cho người dùng

Mỗi checkpoint có ý nghĩa phải trả lời bằng ngôn ngữ non-tech:

- **Đã thêm cho người học:** bài/chủ đề nào hiện thấy trên UI.
- **Số lượng:** X/Y bài của level; số từ/ngữ pháp/hội thoại/nhiệm vụ mới.
- **Đang làm:** một lô duy nhất và kết quả mong đợi.
- **Còn vướng:** lỗi nội dung hay lỗi kỹ thuật thật, không liệt kê log test dài.
- **Tiến độ:** toàn dự án A%; nội dung UI HSK0…4 theo X/Y.
- **Bước kế:** deliverable nhìn thấy được tiếp theo.

Không báo “đã làm rất nhiều test” như một thành quả độc lập.

## 10. Quy tắc commit

- Một commit cho một unit lớn hoặc level batch hoàn chỉnh.
- Mỗi commit cập nhật đồng thời `docs/HSK4_GRADUATION_PLAN.md` và
  `docs/IMPLEMENTATION_CHECKPOINT.md`, kể cả khi phần trăm tổng không đổi.
- Commit message mô tả kết quả learner-facing, không mô tả số test hoặc số dòng.
- Trước commit: `git diff --check`, kiểm tra staging không chứa file tạm và ghi
  đúng kết quả gate thực tế vào checkpoint.

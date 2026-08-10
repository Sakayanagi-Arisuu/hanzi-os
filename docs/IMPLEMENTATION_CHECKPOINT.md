# HANZI.OS — checkpoint hiện hành

**Ngày chốt:** 10/08/2026

**Baseline Git:** `52cce0c` (`feat: hoàn thiện cổng danh tính và phòng luyện HSK`)

**Trạng thái Reforge:** đã đóng băng hướng phát triển cũ; chưa có task Reforge nào
được nghiệm thu.

Tài liệu này chỉ ghi **sự thật ở commit hiện tại**. Lịch sử chi tiết nằm trong
Git, không tiếp tục nối nhật ký theo phiên vào đây.

## 1. Hai hệ đo không được trộn lẫn

| Hệ đo | Trạng thái | Ý nghĩa |
| --- | ---: | --- |
| Legacy local milestone | **96/100** | Mức hoàn thiện theo roadmap cũ của bản local-first; không phải điểm UX, chất lượng sư phạm hay mức tương đương ChineseSkill |
| Legacy M1-M5 | **97/100** | Mức hoàn thiện phạm vi identity, role, Studio, mock và release worker cũ |
| Reforge parity | **0/100 task được nghiệm thu** | Thước đo duy nhất cho quá trình tái cấu trúc mới; code cũ không tự động được tính |

Mốc 96/100 được giữ làm số liệu lịch sử có thể kiểm chứng. Từ đây về sau, không
dùng nó để nói sản phẩm “gần hoàn thiện”. Chỉ task đáp ứng đầy đủ acceptance
criteria trong `RESTRUCTURE_MASTER_PLAN.md` mới tăng tiến độ Reforge. Trạng thái
`DONE` trong master plan có nghĩa task đã được nghiệm thu (`ACCEPTED`), không chỉ
là đã viết xong code.

## 2. Nội dung đang hiện trên UI

| Cấp | Bài learner-visible | Bài rich trên Lesson UI | Trạng thái |
| --- | ---: | ---: | --- |
| HSK0 | **4/4** | **0/4** | bridge nền tảng, chưa đạt độ sâu rich lesson |
| HSK1 | **40/40** | **40/40** | đang chạy trong runtime |
| HSK2 | **40/40** | **40/40** | đang chạy trong runtime |
| HSK3 | **55/55** | **55/55** | đang chạy trong runtime |
| HSK4 | **78/78** | **78/78** | đang chạy trong runtime |
| HSK1-4 | **213/213** | **213/213** | đủ blueprint cũ, không đồng nghĩa đủ chiều sâu benchmark |

Runtime hiện giao **217 bài** trong package `foundation-2026.08.5`: 4 bài HSK0
và 213 bài HSK1-4. Inventory có **2.016 vocabulary ID** (2.000 mục syllabus và
16 mục demo/bridge) cùng **1.096 chữ nhận dạng**. Các số này đo inventory và
khả năng mở bài, không đo thời lượng học, số lượt luyện, chất lượng âm thanh,
độ đa dạng bài tập hay mức thành thạo thực tế.

Toàn bộ nội dung AI-assisted tiếp tục công bố `humanReviewed: false`. Không có
chứng nhận native review, đề HSK chính thức hay bảo đảm đỗ HSK.

## 3. Baseline kỹ thuật có thể tái sử dụng

- Ứng dụng web TypeScript/React local-first chạy trên modular monolith; dữ liệu
  server local dùng D1/Drizzle, dữ liệu học có projection/version và cơ chế
  offline recovery.
- Curriculum graph, prerequisite, package/version, runtime adapter và shared
  Lesson UI đang giao đủ các bài nêu trên.
- Lesson, Reader, Review/FSRS, level check, mock practice, từ/chữ, tài khoản,
  role, quản trị và Content Studio đã có implementation ở các mức khác nhau.
- Learning attempt giữ content/schema version và idempotency; sync/cache có cơ
  chế migration. Đây là ranh giới correctness phải bảo toàn khi thay shell.
- Guest/local vẫn là luồng học chính. HANZI.OS account có thể đăng ký/đăng nhập
  ở localhost. Google và Facebook có UI/callback/config nhưng **chưa được xác
  nhận end-to-end trên môi trường public có credential thật**.
- Cổng quản trị và Studio có authorization phía server. Chúng không phải bằng
  chứng rằng trải nghiệm cho từng role đã được người dùng kiểm thử đầy đủ.
- Hiện có bốn level check cũ và tám form mock A/B. Mỗi mock chỉ là bộ luyện 12
  câu, không phải cấu trúc đầy đủ hay đề thật của các kỳ HSK gần đây.

## 4. Vấn đề sản phẩm đã xác nhận

1. Kiến trúc thông tin và từ vựng “hệ thống thức tỉnh” đang lấn át tác vụ học;
   quá nhiều mục, trạng thái và thông báo làm người mới khó biết bước kế tiếp.
2. Shell desktop-first, panel dày và hiệu ứng nền tạo cảm giác rối/giật; trạng
   thái “đang khôi phục hành trình” có thể chớp qua trong lúc hydrate.
3. Hành trình cốt lõi chưa được nghiệm thu như một chuỗi liền mạch:
   onboarding → bài ngắn → giải thích → ôn tập → tiến bộ → bài tiếp theo.
4. Inventory rộng nhưng mật độ hoạt động sư phạm, biến thể câu hỏi và độ lặp có
   chủ đích chưa được đo ngang benchmark. `213/213` không chứng minh độ sâu.
5. Thất Trụ có thể tăng nhanh vì mẫu evidence nhỏ. XP, số câu đúng và độ phủ
   inventory chưa được tách rõ khỏi mastery dài hạn.
6. Nhập Hanzi bằng bàn phím gây ma sát nếu người học chưa có IME; trợ lý
   Pinyin→Hanzi hiện tại chưa thay thế một thiết kế bài tập nhập/chọn/viết phù
   hợp từng cấp.
7. Browser TTS chỉ hỗ trợ nghe/đọc. Chưa được dùng làm bằng chứng phát âm hoặc
   nói; luồng tone/speech cần scoring, fallback và disclosure riêng.
8. Thần Văn Lô đã mở catalog nhận dạng 1.096 chữ nhưng chưa tương đương một lộ
   trình nét, bộ thủ, nhớ lại, viết và ôn tập có sư phạm.
9. Mock 12 câu hiện tại không đáp ứng kỳ vọng mô phỏng kỳ thi. Không được lấy
   đề có bản quyền trên mạng để lấp khoảng trống; phải dựa cấu trúc/mẫu công
   khai hợp lệ và soạn item gốc.
10. Chưa có vòng usability test độc lập đủ mạnh để tuyên bố UI dễ dùng hoặc sản
    phẩm đạt functional/learning-depth parity với ChineseSkill.

## 5. Quyết định Reforge

Mục tiêu mới là đạt **độ sâu chức năng và học tập có thể kiểm chứng** của luồng
Mainland Mandarin trong ChineseSkill, giới hạn HSK0-HSK4 và giao diện tiếng
Việt, bằng implementation và nội dung nguyên bản của HANZI.OS. “Hệ thống thức
tỉnh hologram” là lớp thẩm mỹ/phản hồi, không phải một lớp thuật ngữ che khuất
navigation hoặc nội dung học.

Đây không phải yêu cầu sao chép ChineseSkill. Không sao chép source code, UI,
text bài học, câu hỏi, audio, video, hình ảnh, dữ liệu đóng hay asset thương
mại. Benchmark chỉ cung cấp taxonomy chức năng, pattern hành trình và ngưỡng
chất lượng để HANZI.OS tự thiết kế.

## 6. Freeze policy trong lúc tái cấu trúc

- Không tiếp tục vá thẩm mỹ rời rạc trên shell cũ, trừ lỗi correctness, data
  loss, security hoặc blocker trực tiếp của vertical slice đang chuyển đổi.
- Không thêm menu, ẩn dụ hay dashboard mới trước khi information architecture
  và design system Reforge được nghiệm thu.
- Xây theo vertical slice sau feature boundary; chỉ chuyển route khi slice mới
  đã đạt acceptance và có đường rollback/migration an toàn.
- Tái sử dụng content inventory, stable ID, versioning, FSRS, local persistence,
  authorization và pipeline đang có khi chúng qua contract test. Không refactor
  chúng chỉ để đổi phong cách code.
- Không xóa legacy consumer trước khi dùng `rg` xác nhận và có migration test.
  Không làm mất progress local, attempt, review schedule hoặc account hiện có.
- Không mở production/Sites/commerce/native app trong critical path. Giữ
  `.openai/hosting.json` nguyên trạng đến khi người dùng chủ động mở deployment.
- Giữ mobile, keyboard, touch target, contrast và `prefers-reduced-motion` như
  acceptance bắt buộc; hiệu ứng chỉ xuất hiện khi phục vụ phản hồi học tập.
- Không expose, unlock, recommend hoặc tính tiến độ từ nội dung chưa đạt
  `UI-INTEGRATED` theo `CONTENT_DELIVERY_PLAYBOOK.md`.

## 7. Nguồn sự thật từ checkpoint này

Đọc theo thứ tự sau trước mỗi milestone Reforge:

1. `AGENTS.md` — ranh giới bắt buộc của repo.
2. `docs/PRODUCT_VISION.md` — north star, phạm vi parity và nguyên tắc UX.
3. `docs/CHINESESKILL_BENCHMARK.md` — bằng chứng nghiên cứu, mức tin cậy và gap.
4. `docs/RESTRUCTURE_MASTER_PLAN.md` — 100 task, dependency và acceptance.
5. `docs/IMPLEMENTATION_CHECKPOINT.md` — baseline và tiến độ thực tế mới nhất.
6. `docs/HSK4_GRADUATION_PLAN.md` — inventory legacy và migration contract.
7. `docs/CONTENT_DELIVERY_PLAYBOOK.md` — chuẩn đưa nội dung lên UI.

Nếu tài liệu cũ hoặc comment code mâu thuẫn, bộ nguồn trên và acceptance mới
nhất được ưu tiên. `PRODUCTION_UPGRADE_PLAN.md` chỉ đọc khi người dùng chủ động
mở lại production.

## 8. Cách cập nhật checkpoint

Mỗi milestone/commit Reforge phải ghi ngắn gọn:

- task nào đã `DONE`/được nghiệm thu, task nào còn `IN_PROGRESS` hoặc `BLOCKED`;
- người học nhìn thấy và làm được gì mới;
- evidence UI/test nào chứng minh acceptance;
- cả **legacy local milestone 96/100** và **Reforge X/100 accepted task**;
- đủ các số content UI HSK0, HSK1, HSK2, HSK3, HSK4 và rich lesson;
- migration/data risk còn lại và vertical slice tiếp theo.

Không tăng tiến độ vì đã tạo draft, inventory, JSON, test, số dòng code hoặc UI
chưa nối runtime. Không tuyên bố parity hoàn tất khi còn phụ thuộc credential,
native/human review, nội dung được cấp phép hay kiểm thử thiết bị chưa thực hiện.

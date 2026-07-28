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

Status: **complete** at project progress **44%**.

- Đóng lát cắt production đang dở.
- Dọn artefact build/test cục bộ.
- Chốt thước đo 100 điểm và source of truth mới.
- Thêm contract cho năm level profile, không làm thay đổi dữ liệu cũ.

Exit: repo sạch, baseline xanh, roadmap mới và level contract có test.

### G1 — Official inventory và coverage report

Status: **complete** at project progress **47%**.

- Lưu source descriptor với URL, ngày truy cập, checksum và edition.
- Xây importer/parser tách task, topic, vocabulary, character và grammar HSK1-4.
- Lưu inventory dạng dữ liệu, không hard-code hàng nghìn mục trong component.
- Báo cáo exact count theo level/type, duplicate, missing field và source drift.

Exit: inventory HSK1-4 tái tạo được từ source pin; coverage hiện tại hiển thị
đúng và không suy diễn.

### G2 — Curriculum graph và placement

Status: **in progress** at project progress **74%**.

- Ánh xạ inventory vào blueprint HSK0-4.
- Tạo unit/lesson prerequisite riêng cho từng level.
- Mở điểm bắt đầu theo self-declaration + diagnostic, không tự cấp mastery.
- Hiển thị progress trong level và điều kiện chuyển cấp.

Exit: năm lộ trình khác nhau chạy được với dữ liệu mỏng nhưng đúng graph.

### G3 — Content factory HSK0-2

Status: **in progress** at project progress **74%**.

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

| Trụ cột | Điểm tối đa | Hiện tại | Cách ghi nhận |
| --- | ---: | ---: | --- |
| A. Nền ứng dụng và offline learning loop | 20 | 17 | lesson/reader/review, local persistence, offline, UX và build |
| B. Mastery, evidence và remediation | 15 | 12 | FSRS, evidence theo skill, assessment authority và sửa lỗi |
| C. Lộ trình HSK0-4 khác biệt | 15 | 10 | năm blueprint, HSK1 sáu unit, HSK2 scope nhiều mạch, prerequisite, placement và level progress |
| D. Nội dung có coverage HSK0-4 | 30 | 25 | inventory, authoring scope, HSK0 pronunciation draft, HSK1 contextual drafts và HSK2 vocabulary source backlog |
| E. Assessment và mock HSK0-4 | 10 | 5 | diagnostic, level-check blueprint, 50 objective item draft, timed mock và rubric |
| F. Đồ án, QA và local release | 10 | 5 | docs, demo, accessibility, performance và release package |
| **Tổng** | **100** | **74** | **Tiến độ hiện tại: 74%** |

42% là baseline lúc pivot cho **mục tiêu HSK0-4 chuyên sâu**, không phải phép đổi
trực tiếp từ 55,1% của roadmap production cũ. Nền kỹ thuật đã mạnh, nhưng 24
lexeme, 14 lesson và 1 graded text hiện tại chỉ là lát foundation rất nhỏ so với
khối nội dung mới nên trụ cột D chưa được tính cao.

G0 tăng trụ cột C thêm 2 điểm: code hiện có năm level profile HSK0-4 khác nhau
về skill weight, activity, exit evidence và assessment mode; onboarding/profile
nhận HSK3/HSK4, còn giá trị `basic` cũ vẫn đọc được như HSK1. Đây mới là
curriculum contract, chưa phải coverage nội dung.

G1 tăng trụ cột D thêm 3 điểm: source descriptor ghim chính xác đề cương, parser
tái tạo deterministic inventory gồm 84 task, 195 topic, 2.000 vocabulary,
1.096 recognition character và 332 grammar row cho HSK1-4. Validator kiểm
checksum/page/count/sequence/level; checked report đo runtime hiện tại chỉ khớp
23/2.000 vocabulary (1,15%), 0 released character và chưa có mapping
task/topic/grammar. Vì vậy mọi claim hoàn thành HSK1-4 vẫn là `false`; phần
inventory không được tính như lesson/practice đã hoàn thiện.

Lát G2 đầu tăng trụ cột C thêm 3 điểm và D thêm 1 điểm. Graph hiện có đúng
năm path; sau lát scope HSK1 graph có 18 unit, dependency không cycle và
placement fail-closed; 14 lesson
runtime được ánh xạ vào unit HSK0/1 cùng đúng 23 vocabulary item chính thức.
HSK0 chỉ thấy bốn lesson bootcamp, HSK1 thấy bridge và 10 lesson đích, còn
HSK2-4 không bị thay bằng lộ trình beginner khi content đích chưa phát hành.
Diagnostic foundation chưa hiệu chuẩn chỉ được ghi là observed, không cấp
mastery hay prerequisite waiver. G2 chưa complete vì placement đã hiệu chuẩn,
topic/task/grammar lesson/practice mapping và level progress đầy đủ vẫn còn
thiếu.

Lát G2 thứ hai tăng trụ cột C thêm 1 điểm và D thêm 1 điểm. HSK1 được mở từ 3
lên 6 unit tuần tự, tách giao tiếp cá nhân; thời gian/địa điểm/sự kiện; nhu cầu
hằng ngày; đi lại/giải trí; học tập/công việc; và chữ Hán. Scope authoring ghim
vào exact graph/inventory, phân vùng đúng một unit cho đủ 15 task, 30 topic,
300 vocabulary, 66 grammar row và 246 recognition character. Sáu unit có focus
và exit-evidence mode khác nhau. Đây chưa phải lesson/practice coverage:
mapping học liệu cho task/topic/grammar vẫn bằng 0 và mọi completion claim vẫn
`false`.

Lát G3 đầu tăng trụ cột D thêm 2 điểm. Toàn bộ 300 mục từ vựng HSK1 đã có
backlog biên tập draft ghim vào đúng inventory chính thức và snapshot
CC-CEDICT SHA-256. Cả 300 mục có English source sense; 297 mục tương thích phát
âm trực tiếp hoặc qua quy tắc biến điệu chuẩn, 3 mục khác thanh giữa hai nguồn
được liệt kê tường minh, và 23 mục có nhiều source match phải được biên tập.
Pipeline tái tạo/validator/report đều fail-closed và file attribution ghi rõ
CC BY-SA 4.0. Điểm này chỉ ghi nhận source enrichment đầy đủ và review queue
có thể thi hành; 0 nghĩa tiếng Việt đã review, 0 mục release-eligible và chỉ
23 mục có lesson mapping, nên claim hoàn thành từ vựng HSK1 và HSK1 vẫn là
`false`.

Lát G3 thứ hai tăng trụ cột D thêm 2 điểm. Unit
`hsk1-personal-exchange` đã có 107 nghĩa Việt AI-assisted draft gắn provenance,
9 lesson blueprint tuần tự, đủ mapping blueprint cho 2 task, 5 topic, 107 từ
và 32 grammar row, cùng 38 lượt hội thoại mẫu. Validator bắt buộc exact
partition, prerequisite chain, source digest và trạng thái review-pending.
Hai điểm của riêng lát này chỉ ghi nhận khối authoring có thể review; tại ranh
giới commit đó authored practice item, reviewed gloss/dialogue,
learner-visible và release-eligible đều bằng 0.

Lát G3 thứ ba tăng trụ cột D thêm 2 điểm. Mỗi một trong 107 từ của unit đầu đã
có đúng ba practice item draft: meaning recall, pinyin recognition và
listening selection dùng browser TTS, tổng 321 item. Chín review batch bind
chính xác item theo lesson và yêu cầu đủ reviewer Mandarin, biên tập viên Việt
và assessment editor. Validator cấm duplicate option/ID, target lệch lesson,
pre-approval, measurement hay mastery eligibility. Đây là practice content
thật ở lớp draft, nhưng vẫn 0 reviewed/release-eligible nên chưa mở trong app.

Lát G3 thứ tư tăng trụ cột D thêm 5 điểm. Bốn unit giao tiếp HSK1 còn lại đã
được chia theo ngữ nghĩa thành 16 lesson: thời gian/địa điểm/sự kiện; nhu cầu
hằng ngày; đi lại/giải trí; và học tập/công việc. Chúng bổ sung 193 nghĩa Việt
AI-assisted draft, 64 lượt hội thoại, 579 practice item và 16 review batch,
đồng thời exact-partition đủ 13 task, 25 topic, 193 từ và 34 grammar row của
bốn unit. Tổng lớp authoring giao tiếp HSK1 hiện là 300/300 từ có nghĩa Việt
draft và ba dạng luyện tập, 25 lesson, 102 lượt hội thoại, 900 practice item
và 25 review batch. Điểm tăng ghi nhận coverage authoring có thể kiểm tra và
tái tạo; 0 mục đã qua review hoặc release, character foundation và bài luyện
grammar/context vẫn chưa hoàn thiện nên claim HSK1 vẫn là `false`.

Lát G3 thứ năm tăng trụ cột D thêm 2 điểm. Toàn bộ 246 recognition character
HSK1 đã được ánh xạ deterministically tới từ vựng ngữ cảnh trong 300 mục draft,
chia thành 15 lesson và có 492 bài luyện: nhận diện chữ trong từ và tự chép
hình dạng. Mỗi chữ xuất hiện trong đúng một lesson; 15 review batch yêu cầu
native Mandarin, biên tập tiếng Việt và reviewer sư phạm chữ Hán. Vì repo mới
có nguồn stroke/radical hoàn chỉnh cho 7 chữ foundation chứ chưa có source
đồng nhất cho cả inventory, pack này cố ý ghi 0 pinned stroke metadata, không
dạy/chấm thứ tự nét, không suy diễn writing mastery và vẫn có 0 item
release-eligible.

Lát G3 thứ sáu tăng trụ cột D thêm 2 điểm. Cả 66 grammar row HSK1 đã được
gắn lại với đúng lesson blueprint, có giải thích tiếng Việt, model example và
một guided-pattern-production item cho mỗi row. Tổng cộng 20 lesson có grammar
practice và 20 review batch; validator khóa official row/source digest, exact
mapping, nội dung model-answer và trạng thái review. Mọi bài tạo câu vẫn là
self-reveal-only, 0 measurement/mastery-eligible và 0 release-eligible. Lớp
draft hiện phủ vocabulary, recognition character và grammar HSK1, nhưng task
evidence, assessment hiệu chuẩn, human review và runtime promotion vẫn thiếu.

Lát G3 thứ bảy tăng trụ cột D thêm 1 điểm và E thêm 1 điểm. Mapping task/topic
đã được kiểm tra lại theo nghĩa của tiêu đề chính thức, sửa các gắn kết sai
giữa thời tiết/vị trí, sản phẩm/khám bệnh, đi lại/giải trí và học tập/công
việc. Cả 15 task và 30 topic hiện có draft context đúng lesson, 15 scenario,
60 lượt hội thoại và 15 guided roleplay. Level-check blueprint định nghĩa bốn
section với 55 item dự kiến nhưng giữ 0 authored scored item, không cut score,
không mastery hay prerequisite waiver cho tới khi review và calibration.
Manifest review ghim exact hash của 5 artifact và xuất 75 batch đang chờ, gồm
25 vocabulary, 15 character, 20 grammar và 15 task batch; approval vẫn bằng 0.

Lát G3 thứ tám tăng trụ cột E thêm 1 điểm. Blueprint HSK1 hiện có một bank 50
câu khách quan ẩn: 15 nghe, 15 đọc, 10 từ vựng và 10 ngữ pháp. Mỗi câu gắn với
đúng scenario turn, vocabulary draft hoặc grammar example và được chia vào 10
review batch. Phần nghe chưa có audio; browser TTS chỉ phục vụ preview biên tập.
Vì các câu hiện tái dùng nguồn draft đã có thể xuất hiện khi học, policy bắt
buộc tạo alternate form độc lập, duyệt audio, review ngôn ngữ/assessment và
hiệu chuẩn pilot trước khi đo lường. Cả 50 câu vẫn 0 measurement/mastery/
release-eligible; không có cut score hay prerequisite waiver. Manifest mới
ghim 6 artifact và 85 batch đang chờ, approval vẫn bằng 0.

Lát G3 thứ chín không tăng điểm, nên tiến độ vẫn là **71%**. Repo đã có workflow
local để liệt kê, xuất assignment và nhập review receipt cho đúng 85 batch,
258 assignment theo role và 2.181 target tham chiếu chính xác. Mọi assignment
bind manifest/source/target hash và reviewer phải quyết định từng target; sửa
scope hoặc source làm import fail. Receipt chỉ được lưu trong thư mục local
Git-ignore, không sửa draft/manifest/runtime, không hiệu chuẩn hay cấp mastery.
Audio-rights reviewer cũng không thể approve listening batch khi audio còn
null. Công cụ này làm review queue có thể vận hành nhưng chưa có review người
thật, nên không được tính thêm phần trăm.

Lát G3 thứ mười tăng trụ cột D thêm 1 điểm, đưa tiến độ lên **72%**. Bootcamp
phát âm HSK0 nay có 12 lesson authoring tuần tự, 111 target và 208 hoạt động:
đủ 21 thanh mẫu, 35 ô vận mẫu trong bảng chính thức cùng `er`, 14 bài chính tả
Pinyin, 20 bài đối chiếu thanh mẫu, 20 bài nhận diện thanh, ma trận đủ 25 cặp
thanh, 12 bài biến điệu và 24 câu shadowing sinh tồn. Source descriptor ghim
PDF `汉语拼音方案` cùng trạng thái hiện hành của GB/T 16159-2012; validator kiểm
exact inventory, source hash, lesson/activity partition và review batch.
Trong 208 hoạt động có 89 mục phụ thuộc audio nhưng toàn bộ vẫn để audio
`null`; browser TTS chỉ là preview, browser ASR không được chấm mastery, và
0 item đã review/measurement/mastery/release-eligible. Điểm tăng chỉ ghi nhận
gói draft HSK0 đủ phạm vi để chuyển sang review/audio, không tuyên bố HSK0 đã
hoàn thành hoặc đưa nội dung chưa duyệt vào runtime.

Lát liên kết G2-G3 tiếp theo tăng trụ cột C thêm 1 điểm, đưa tiến độ lên
**73%**. Scope HSK2 bind exact graph/inventory và giữ ba unit khác HSK1:
hội thoại tình huống nhiều lượt, chuỗi câu/ngữ pháp và dictation-văn bản ngắn.
Unit tình huống được chia tiếp thành bốn mạch ngữ nghĩa; unit chuỗi câu có bốn
mô-đun; unit sản xuất có bốn giai đoạn nghe-chép, dựng câu, tin nhắn và mô tả.
Validator bắt buộc partition exactly-once đủ 17 task, 34 topic, 200 từ, 75
grammar row và 125 recognition character. Scope dự kiến 40 lesson blueprint
nhưng chưa author lesson/practice nào, vẫn learner-hidden, không cấp mastery
và giữ mọi claim lesson coverage, reviewed content, HSK2 completion là
`false`; vì vậy lát này không tăng điểm nội dung trụ cột D.

Lát G3 HSK2 đầu tăng trụ cột D thêm 1 điểm, đưa tiến độ lên **74%**. Một
Debian source repack của CC-CEDICT được ghim riêng bằng hash/byte length cho
cả archive và payload; importer deterministic đã lọc đúng 200/200 từ HSK2 từ
124.863 dòng nguồn. Backlog có 232 source match, tách 26 mục nhiều ứng viên và
6 mục lệch phát âm vào review queue. Validator, checked backlog report và
coverage report đều giữ trạng thái fail-closed. Điểm này chỉ ghi nhận source
enrichment có provenance để bắt đầu authoring: nghĩa Việt draft/review, lesson
mapping, practice, learner-visible và release-eligible hiện vẫn bằng 0; claim
hoàn thành vocabulary HSK2 và HSK2 đều là `false`.

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

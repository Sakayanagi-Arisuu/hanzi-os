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

Status: **in progress** at project progress **81%**.

- Ánh xạ inventory vào blueprint HSK0-4.
- Tạo unit/lesson prerequisite riêng cho từng level.
- Mở điểm bắt đầu theo self-declaration + diagnostic, không tự cấp mastery.
- Hiển thị progress trong level và điều kiện chuyển cấp.

Exit: năm lộ trình khác nhau chạy được với dữ liệu mỏng nhưng đúng graph.

### G3 — Content factory HSK0-2

Status: **in progress** at project progress **81%**.

- Hoàn thiện bootcamp âm thanh.
- Tạo lesson, example, dialogue, graded text và exercise từ schema.
- Bổ sung character practice, grammar note và remediation.
- Chạy validation và biên tập mẫu trước khi đưa vào runtime beta.

Exit: HSK0-2 dùng được end-to-end và coverage report không còn khoảng trống.

### G4 — Content factory HSK3-4

Status: **in progress** at project progress **81%**.

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
| C. Lộ trình HSK0-4 khác biệt | 15 | 12 | năm blueprint, HSK1 sáu unit, HSK2 scope nhiều mạch, HSK3 có 55 lesson blueprint cấp đoạn/tường thuật/sản sinh, prerequisite, placement và level progress |
| D. Nội dung có coverage HSK0-4 | 30 | 29 | inventory, HSK0 pronunciation, HSK1 contextual drafts, HSK2 blueprints, vocabulary/character/grammar và situational-dialogue practice |
| E. Assessment và mock HSK0-4 | 10 | 6 | diagnostic, level-check blueprint, 2 form HSK2 độc lập ở lớp nguồn, objective/performance draft, timed mock và rubric |
| F. Đồ án, QA và local release | 10 | 5 | docs, demo, accessibility, performance và release package |
| **Tổng** | **100** | **81** | **Tiến độ hiện tại: 81%** |

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

Lát G3 HSK2 thứ hai tăng trụ cột D thêm 1 điểm, đưa tiến độ lên **75%**.
Scope 40 bài nay đã thành artifact deterministic gồm 20 blueprint hội thoại
tình huống, 10 blueprint chuỗi câu/ngữ pháp và 10 blueprint nghe-chép/viết
ngắn. Các lesson exact-partition đủ 17 task, 34 topic, 200 từ, 75 grammar row
và 125 recognition character, có prerequisite tuần tự, objective, practice
plan, evidence mode, audio requirement và 40 review batch. Điểm tăng chỉ ghi
nhận lesson architecture có thể biên tập: authored practice, assessment
prompt, rubric, approval, learner-visible và release-eligible vẫn bằng 0; mọi
claim hoàn thành HSK2 vẫn là `false`.

Lát G3 HSK2 thứ ba tăng trụ cột D thêm 1 điểm, đưa tiến độ lên **76%**. Toàn
bộ 200 từ đã có nghĩa Việt AI-assisted draft gắn official identity, từ loại,
lesson và exact source-line provenance. Mỗi từ có ba bài luyện riêng:
meaning recall, pinyin recognition và listening selection, tổng 600 item chia
đúng 20 blueprint tình huống cùng 20 review batch. Validator còn kiểm các mục
đồng hình theo ID/từ loại, option không trùng và TTS disclosure. Hai trăm bài
nghe vẫn không có audio đã duyệt; toàn pack có 0 approval, measurement,
mastery và release-eligible item. Grammar/character/production practice,
assessment và human review còn thiếu nên HSK2 completion tiếp tục `false`.

Lát G3 HSK2 thứ tư không tăng điểm, nên tiến độ giữ ở **76%**. Cả 125
recognition character đã được gắn vào 10 blueprint production và có 250
practice item: 124 nhận diện trong từ, một nhận diện glyph độc lập và 125 bài
tự chép hình dạng. Report nêu tường minh `留` không có ngữ cảnh vocabulary
HSK1–2 thay vì bịa mapping. Pack có 0 pinned stroke metadata, không dạy/chấm
thứ tự nét, không suy diễn writing mastery và giữ 0 approval/
measurement/release-eligible item. Lát này lấp một backlog con nhưng chưa đủ
thay đổi điểm D vì grammar, task production, assessment và toàn bộ HSK3–4 vẫn
rất lớn.

Lát G3 HSK2 thứ năm tăng trụ cột D thêm 1 điểm, đưa tiến độ lên **77%**. Cả
75 grammar row chính thức đã được exact-map vào 10 bài sentence-chain; mỗi row
có một giải thích Việt AI-assisted, một ví dụ Hán tự–Pinyin–nghĩa Việt và một
guided-pattern-production với đáp án tự đối chiếu riêng. Validator bind exact
official source text/page, lesson/track, kiểm đủ 75 row, tính duy nhất của
ngữ cảnh, 10 review batch và source hash. Đây vẫn chỉ là authoring draft:
native Mandarin, Vietnamese editorial và grammar-pedagogy review đều
`pending`; 75 bài production có 0 approval và 0 measurement/mastery/
release-eligible item. Điểm tăng ghi nhận một deliverable ngữ pháp có phạm vi
đóng; task/dialogue production, assessment, audio, runtime promotion và toàn
bộ HSK3–4 vẫn còn.

Lát G3 HSK2 thứ sáu tăng trụ cột D thêm 1 điểm, đưa tiến độ lên **78%**.
Mapping của 20 bài tình huống được sửa từ chia đều kỹ thuật sang gán ngữ nghĩa
tường minh mà vẫn exact-partition đủ 17 task, 34 topic và 200 từ; regression
test khóa các neo như mô tả đồ vật với so sánh màu/kích thước và họ/xưng hô
với văn hóa giao tiếp. Trên mapping đó, pack mới author 20 hội thoại sáu lượt
(120 lượt), 17 scenario task, 34 topic prompt có câu hỏi hỗ trợ và 20 guided
roleplay tự đối chiếu. Hai mươi review batch yêu cầu native Mandarin,
Vietnamese editorial, task-pedagogy và audio-rights review. Tất cả audio vẫn
`null`, approval và measurement/mastery/release eligibility đều bằng 0;
short-text production, assessment, review/audio, runtime promotion và toàn bộ
HSK3–4 vẫn còn.

Lát G3 HSK2 thứ bảy không tăng điểm, nên tiến độ giữ ở **78%**. Mười blueprint
productive-text đã có đủ ngưỡng 104 prompt theo bốn bậc: 36 nghe-chép, 36 dựng
câu, 16 tin nhắn ba câu và 16 mô tả cảnh; 168 câu mẫu Hán tự–Pinyin–nghĩa
Việt dùng cho tự sửa. Cả 125 recognition character xuất hiện trong đáp án của
đúng một prompt thuộc bài được gán, còn `留学生` chỉ là ngữ cảnh hỗ trợ draft
chứ không xóa gap official-vocabulary của `留`. Ba mươi sáu audio vẫn `null`;
10 review batch chưa có approval và mọi item vẫn
measurement/mastery/release-ineligible. Trụ cột D giữ 29/30 để không tuyên bố
coverage HSK0–4 hoàn chỉnh khi assessment HSK2 và toàn bộ content HSK3–4 chưa
có.

Lát assessment HSK2 đầu tăng trụ cột E thêm 1 điểm, đưa tiến độ lên **79%**.
Hai form nguồn độc lập, mỗi form 86 mục, đã được author thành bank 172 mục:
30 nghe, 30 đọc, 30 từ vựng, 30 ngữ pháp, 20 nói và 32 viết. Tổng 120 câu
khách quan và 52 bài tạo lập đều khai báo đúng một kỹ năng; 20 bài nói phủ đủ
17 task/34 topic và 32 bài viết lấy từ toàn bộ prompt message/picture. Hai
form có 0 thực thể nguồn trùng nhau và 12 review batch chia exact toàn bank.
Đây vẫn là source-exposed draft: 30 audio là `null`, rubric chưa duyệt,
cut score/calibration chưa có, và mọi item đều 0 measurement/mastery/
prerequisite-waiver/release-eligible. Điểm tăng chỉ ghi nhận independent-form
authoring có thể review, không tuyên bố bài cuối cấp HSK2 đã sẵn sàng.

Lát đóng gói review HSK2 không tăng điểm, nên tiến độ giữ ở **79%**. Manifest
ghim exact hash của 7 artifact và gom đúng 122 batch đang chờ: 40 blueprint,
20 vocabulary, 10 character, 10 grammar, 20 situational, 10 short-text và 12
assessment. Workflow local giải được 405 assignment theo role và 1.732 target
tham chiếu; export bind manifest/source/target digest, import chỉ tạo receipt
Git-ignore có tính idempotent. Không receipt nào được nhập vào manifest,
không runtime/calibration/mastery mutation, và audio-rights không thể approve
khi audio còn thiếu. Đây là khả năng vận hành review queue, không phải bằng
chứng human review nên không được cộng tiến độ.

Lát G4 HSK3 đầu tăng trụ cột C thêm 1 điểm, đưa tiến độ lên **80%**. Scope
HSK3 giữ đúng ba unit graph nhưng định nghĩa lộ trình khác HSK2: input cấp
đoạn, tường thuật/liên kết diễn ngôn và sản sinh có hướng dẫn. Năm discourse
domain gắn ngữ nghĩa exact-partition đủ 22 task/54 topic; năm grammar module
phủ đủ 96 row; 500 từ và 284 recognition character được đặt ở lớp paragraph
input mà chưa bịa semantic cluster trước source review. Scope dự kiến 55
lesson và năm stage sản sinh với tối thiểu 92 prompt: ghi chú ý chính/chi tiết,
dựng liên kết đoạn, kể lại từ ghi chú, viết đoạn 6–8 câu và giải thích/so sánh
bằng lời. Đây chỉ là learner-hidden architecture; lesson/practice/review/
runtime/HSK3 completion đều còn `false`, nên không tăng điểm nội dung.

Lát G4 HSK3 thứ hai tăng trụ cột C thêm 1 điểm, đưa tiến độ lên **81%**.
Pipeline CC-CEDICT ghim đúng archive/payload và làm giàu đủ 500/500 mục từ
HSK3: 529 source match, 24 mục nhiều candidate và 8 pronunciation review item.
Trên nguồn đó, 55 lesson blueprint được tạo thành 25 bài paragraph input, 15
bài narration/grammar và 15 bài guided production, với một chuỗi prerequisite
không cycle và exact partition đủ 22 task, 54 topic, 500 vocabulary, 96 grammar
row và 284 recognition character. Phân loại ghi rõ 287 source-sense keyword
match, 213 cross-domain foundation fallback không mang claim ngữ nghĩa, 283
character có context trong increment và một gap. Điểm tăng ghi nhận lesson
architecture/prerequisite có thể kiểm chứng trong G2, không tính generated
file hay số dòng. Cả 55 batch vẫn pending và authored practice/rubric/approval/
measurement/mastery/runtime/release đều bằng 0, nên trụ cột D không tăng.

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

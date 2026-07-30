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

Status: **in progress** at project progress **90%**.

- Ánh xạ inventory vào blueprint HSK0-4.
- Tạo unit/lesson prerequisite riêng cho từng level.
- Mở điểm bắt đầu theo self-declaration + diagnostic, không tự cấp mastery.
- Hiển thị progress trong level và điều kiện chuyển cấp.

Exit: năm lộ trình khác nhau chạy được với dữ liệu mỏng nhưng đúng graph.

### G3 — Content factory HSK0-2

Status: **in progress** at project progress **90%**.

- Hoàn thiện bootcamp âm thanh.
- Tạo lesson, example, dialogue, graded text và exercise từ schema.
- Bổ sung character practice, grammar note và remediation.
- Chạy validation và biên tập mẫu trước khi đưa vào runtime beta.

Exit: HSK0-2 dùng được end-to-end và coverage report không còn khoảng trống.

### G4 — Content factory HSK3-4

Status: **in progress** at project progress **90%**.

- Mở rộng paragraph/long-form reading và listening.
- Thêm dictation, paraphrase, summary, structured writing/speaking rubric.
- Tạo nội dung theo topic/function thay vì chỉ học danh sách từ.
- Bổ sung mock test và phân tích lỗi theo kỹ năng.

Exit: HSK3-4 dùng được end-to-end; HSK4 có timed practice và mock.

### G5 — Đồ án, QA và đóng gói local

Status: **in progress** at project progress **90%**.

- Chạy full checks, E2E, Lighthouse và audit.
- Kiểm tra mobile, keyboard, reduced-motion, offline backup/restore.
- Chuẩn bị seed demo, walkthrough, sơ đồ kiến trúc, test evidence và giới hạn.
- Đóng bản local release candidate.

Exit: có bản chạy ổn định và bộ tài liệu bảo vệ đồ án. Sites/deployment chỉ bắt
đầu sau khi người dùng yêu cầu.

## 5. Thước đo tiến độ 100 điểm

| Trụ cột | Điểm tối đa | Hiện tại | Cách ghi nhận |
| --- | ---: | ---: | --- |
| A. Nền ứng dụng và offline learning loop | 20 | 19 | lesson/reader/review, local persistence, offline, UX, build, compiler runtime HSK và adapter lesson/activity có provenance fail-closed |
| B. Mastery, evidence và remediation | 15 | 12 | FSRS, evidence theo skill, assessment authority và sửa lỗi |
| C. Lộ trình HSK0-4 khác biệt | 15 | 14 | năm blueprint; scope HSK1-4 theo cấp; HSK4 có 78 lesson blueprint source-bound cho long-form, lập luận và tích hợp có thời gian; prerequisite, placement và level progress |
| D. Nội dung có coverage HSK0-4 | 30 | 30 | inventory; HSK0 pronunciation; HSK1-2 authoring; HSK3 paragraph/narration/production; HSK4 36/36 deep-comprehension lesson |
| E. Assessment và mock HSK0-4 | 10 | 8 | diagnostic, level-check blueprint, hai form nguồn độc lập cho HSK2, HSK3 và HSK4, objective/performance draft; reviewed audio/rubric và calibration còn thiếu |
| F. Đồ án, QA và local release | 10 | 7 | checked demo, local candidate receipt bind clean source, 4/4 gate và 8/8 acceptance capability; final presentation package còn mở |
| **Tổng** | **100** | **90** | **Tiến độ hiện tại: 90%** |

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
Compiler fail-closed hiện chỉ cho HSK0 thấy bốn lesson bootcamp và HSK1 thấy
bridge cùng bốn lesson personal-exchange; sáu lesson daily/character dù đã ở
runtime vẫn bị giữ lại vì prerequisite unit time/travel/work chưa phát hành.
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
ghim 7 artifact và 91 batch đang chờ, approval vẫn bằng 0.

Lát G3 thứ chín không tăng điểm, nên tiến độ vẫn là **71%**. Repo đã có workflow
local để liệt kê, xuất assignment và nhập review receipt cho đúng 91 batch,
276 assignment theo role và 2.268 target tham chiếu chính xác. Mọi assignment
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

Lát G4 HSK3 paragraph đầu giữ tiến độ ở **81%**. Lesson hồ sơ/giao dịch đã có
20 nghĩa Việt AI-assisted, một graded reading và một graded listening với 16
dòng Hanzi–Pinyin–Việt dùng đủ 20 từ blueprint. Sáu mươi vocabulary item, 10
câu hiểu đoạn tách đọc/nghe, hai note grid và hai bài tóm tắt/kể lại tạo tổng
74 practice item. Hai mươi bảy item phụ thuộc audio vẫn có `audio: null`; cả
pack source-exposed, chưa qua Mandarin/Vietnamese/assessment/audio-rights
review và không có measurement/mastery/release eligibility. Đây là content
thật nhưng mới 1/55 lesson HSK3, chưa đủ một mốc coverage toàn cấp để cộng điểm
D hoặc tuyên bố HSK3 hoàn thành.

Lát hoàn thiện domain đời sống cá nhân HSK3 giữ tiến độ ở **81%**. Bốn lesson
còn lại bổ sung 80 nghĩa Việt, 8 graded text/64 dòng và 296 practice item; cộng
pack đầu thành đúng 5/5 paragraph lesson, 100 vocabulary draft, 10 đoạn/80 dòng
Hanzi–Pinyin–Việt và 370 practice item. Năm mươi câu hiểu đoạn tách ý chính,
chi tiết, trình tự, nguyên nhân–kết quả, quy chiếu và suy luận đơn; 10 note grid
và 10 bài tóm tắt/kể lại làm cầu sang kỹ năng sản sinh. Một trăm ba mươi lăm
item phụ thuộc audio vẫn silent, năm batch có 0 approval và toàn bộ content
chưa qua human review/release. Đây là một trong năm discourse domain của
paragraph input và mới 5/55 lesson toàn HSK3, nên chưa dùng điểm D cuối cùng.

Lát domain học tập–công việc HSK3 tiếp tục giữ tiến độ ở **81%**. Năm lesson
mới exact-partition 107 vocabulary blueprint thành 10 graded
reading/listening text với 80 dòng Hanzi–Pinyin–Việt, 321 vocabulary practice,
50 câu hiểu đoạn, 10 note grid và 10 bài tóm tắt/kể lại—391 practice item.
Cộng domain đời sống cá nhân, 2/5 discourse domain và 10/25 paragraph lesson
đã được author, bao phủ 207 vocabulary draft, 20 text/160 dòng và 761 practice
item. Bộ dựng/validator dùng chung khóa source và prerequisite digest, exact
partition, text coverage, item identity và fail-closed eligibility để ba
domain paragraph còn lại không nhân bản logic. 277 item cộng dồn phụ thuộc
audio vẫn silent; 10 batch có 0 approval và không nội dung nào learner-visible,
measurement/mastery hay release-eligible. Vì 15 narration/grammar, 15 guided
production, assessment, review và runtime HSK3 vẫn chưa được author, lát này
chưa dùng điểm D cuối cùng.

Lát tự nhiên–môi trường HSK3 giữ tiến độ ở **81%**. Năm lesson mới bao quát
khí hậu, động thực vật, cảnh quan/phương hướng, hiện trạng và giải pháp môi
trường; 100 vocabulary blueprint được exact-partition thành 10 graded
text/80 dòng, 300 vocabulary practice, 50 câu hiểu đoạn, 10 note grid và 10
bài tóm tắt/kể lại—370 practice item. Ba domain paragraph cộng dồn đạt 15/25
lesson, 307 vocabulary draft, 30 text/240 dòng và 1.131 practice item. 412
item phụ thuộc audio vẫn silent; 15 batch có 0 approval và toàn bộ content
vẫn learner-hidden, measurement/mastery/release-ineligible. Hai domain
paragraph, 30 lesson narration/grammar và guided production, assessment,
review và runtime HSK3 còn thiếu nên chưa dùng điểm D cuối cùng.

Lát xã hội–nghệ thuật–thể thao HSK3 tiếp tục giữ tiến độ ở **81%**. Năm lesson
mới bao quát thay đổi đời sống, dịch vụ đô thị, văn nghệ, giới thiệu thể thao
và báo cáo thi đấu; 96 vocabulary blueprint tạo 10 graded text/80 dòng, 288
vocabulary practice, 50 câu hiểu đoạn, 10 note grid và 10 bài tóm tắt/kể
lại—358 practice item. Bốn domain paragraph cộng dồn đạt 20/25 lesson, 403
vocabulary draft, 40 text/320 dòng và 1.489 practice item. 543 item phụ thuộc
audio vẫn silent, 20 batch có 0 approval và toàn bộ content learner-hidden,
measurement/mastery/release-ineligible. Domain văn hóa–truyền thống, 30 lesson
narration/grammar và guided production, assessment, review và runtime HSK3
còn thiếu nên chưa dùng điểm D cuối cùng.

Lát văn hóa–truyền thống HSK3 giữ tiến độ ở **81%** và đóng đủ 5/5 discourse
domain, 25/25 paragraph-input lesson cùng toàn bộ 500 vocabulary HSK3. Năm
lesson cuối bổ sung 10 graded text/80 dòng và 361 practice item: 291
vocabulary item, 50 câu hiểu đoạn, 10 note grid và 10 bài tóm tắt/kể lại. Toàn
mạch paragraph hiện có 50 text/400 dòng, 1.850 practice item và 675 item phụ
thuộc audio. Nội dung văn hóa nêu giới hạn nguồn và tránh khái quát vùng miền;
25 batch vẫn có 0 approval và toàn bộ pack learner-hidden,
measurement/mastery/release-ineligible. Mốc paragraph đã hoàn thành nhưng 15
lesson narration/grammar, 15 guided production, assessment, review và runtime
HSK3 còn thiếu, nên chưa dùng điểm D cuối cùng hay tuyên bố HSK3 hoàn thành.

Module quy chiếu–số lượng HSK3 giữ tiến độ ở **81%** và mở mạch
narration/grammar bằng 3/15 lesson cùng 21/96 official grammar row. Lát này có
21 giải thích kèm giới hạn dùng, 21 ví dụ, 21 cặp sửa lỗi, ba tường thuật
mẫu/18 dòng và 45 practice item: 21 grammar-in-paragraph, 21
discourse-error-correction, ba ordered retelling. Grammar-writing và
speaking-retelling không suy diễn lẫn nhau; tự đối chiếu và browser ASR không
cấp mastery. Ba batch có 0 approval, pack learner-hidden và 12 narration
lesson, 15 guided-production lesson, assessment, review và runtime HSK3 vẫn
còn thiếu nên chưa cộng điểm D cuối cùng. 284 character mapping thực tế đã
được exact-partition ở paragraph-input theo ngữ cảnh từ vựng; guided
production tiêu thụ prerequisite này thay vì nhận ownership mới.

Module modality–time–viewpoint HSK3 giữ tiến độ ở **81%**, bổ sung ba lesson,
27 grammar row, 27 ví dụ/cặp sửa lỗi, ba tường thuật mẫu/18 dòng và 57
practice item. Hai module cộng dồn đạt 6/15 narration lesson, 48/96 grammar
row, 6 tường thuật/36 dòng và 102 practice item. Các mẫu khái quát và góc nhìn
được buộc nêu phạm vi thay vì biến nhận định cá nhân thành sự thật; sáu batch
có 0 approval và toàn bộ pack learner-hidden,
measurement/mastery/release-ineligible. Chín narration lesson, 15 guided
production lesson, assessment, review và runtime HSK3 còn thiếu nên chưa dùng
điểm D cuối cùng.

Module event–complement–voice HSK3 giữ tiến độ ở **81%**, bổ sung ba lesson,
18 grammar row, 18 ví dụ/cặp sửa lỗi, ba tường thuật mẫu/18 dòng và 39
practice item. Ba module cộng dồn đạt 9/15 narration lesson, 66/96 grammar
row, chín tường thuật/54 dòng và 141 practice item. Exact prerequisite,
official-row source binding và skill-separated evidence đều fail-closed; chín
batch có 0 approval và toàn bộ pack learner-hidden,
measurement/mastery/release-ineligible. Sáu narration lesson, 15 guided
production lesson, assessment, review và runtime HSK3 còn thiếu nên chưa dùng
điểm D cuối cùng.

Module comparison–description–evaluation HSK3 giữ tiến độ ở **81%**, bổ sung
ba lesson, 13 grammar row, 13 ví dụ/cặp sửa lỗi, ba tường thuật mẫu/18 dòng và
29 practice item. Bốn module cộng dồn đạt 12/15 narration lesson, 79/96
grammar row, 12 tường thuật/72 dòng và 170 practice item. Các mẫu so sánh khóa
cùng phương diện/điều kiện và không cho phép kết luận vượt dữ liệu; 12 batch
có 0 approval và toàn bộ pack learner-hidden,
measurement/mastery/release-ineligible. Ba narration lesson, 15 guided
production lesson, assessment, review và runtime HSK3 còn thiếu nên chưa dùng
điểm D cuối cùng.

Module discourse-linking HSK3 giữ tiến độ ở **81%**, bổ sung ba lesson, 17
grammar row, 17 ví dụ/cặp sửa lỗi, ba tường thuật mẫu/18 dòng và 37 practice
item. Cả năm module đã đạt 15/15 narration lesson, 96/96 official grammar
row, 15 tường thuật/90 dòng và 207 practice item. Điều kiện giả định, cần và
đủ được tách nghĩa; liên kết trình tự, đồng thời, tăng tiến và nhượng bộ không
được thay thế lẫn nhau. 15 batch có 0 approval và toàn bộ pack learner-hidden,
measurement/mastery/release-ineligible. Narration authoring đã hoàn thành
nhưng 15 guided-production lesson, assessment, review và runtime HSK3 còn
thiếu nên chưa dùng điểm D cuối cùng.

Stage main-idea/detail-notes HSK3 giữ tiến độ ở **81%**, author 3/15 guided
production lesson với 24 prompt unit trên 24 source text/192 dòng. Tám prompt
đọc, tám prompt nghe và tám prompt đối chiếu nghe–đọc tạo 16 input đọc, 16
input nghe; mọi prompt bind dòng bằng chứng, bốn ô trả lời và checklist tự
sửa. Stage tạo 0 character ownership claim mới, model reveal/TTS không cấp
mastery; 16 prompt audio-dependent chưa review, ba batch có 0 approval và pack
learner-hidden, measurement/mastery/release-ineligible. 12 guided-production
lesson, assessment, review và runtime HSK3 còn thiếu nên chưa dùng điểm D cuối
cùng.

Stage cohesion-reconstruction HSK3 tiếp tục giữ tiến độ ở **81%**, author thêm
3 guided-production lesson và 20 prompt đọc–viết trên 18 source text/144 dòng:
7 bài dựng thứ tự theo mốc thời gian, 7 bài khôi phục từ nối/tham chiếu và 6
bài dựng thứ tự kèm giải thích bằng chứng. Hai stage cộng dồn đạt 6/15 lesson,
44 prompt unit, 42 source binding/336 dòng và 6 review batch. Từng block, cloze
và đáp án đều bind exact paragraph source; tự sắp xếp, xem model và revision
không cấp writing mastery. Stage tạo 0 character ownership claim mới, có 0
approval và vẫn learner-hidden, measurement/mastery/release-ineligible. Chín
guided-production lesson, assessment, review và runtime HSK3 còn thiếu nên
chưa dùng điểm D cuối cùng.

Stage event-retelling HSK3 tiếp tục giữ tiến độ ở **81%**, author thêm 3
guided-production lesson và dùng đúng một lần toàn bộ 20 graded-listening text
của bốn domain học tập, tự nhiên, xã hội và văn hóa (160 dòng). Phân bố 7 bài
kể từ thẻ bốn ý, 7 bài kể thay đổi–nguyên nhân và 6 bài kể có mở–thân–kết.
Mỗi prompt bind tám dòng nguồn, bốn ý bắt buộc và model
Hanzi/Pinyin/Vietnamese đã có; quy trình học là nghe–ghi chú–thu lần một–xem
mẫu–tự sửa–thu lần hai. Browser TTS không cấp listening mastery, bản tự thu
chưa có reviewed rubric không cấp speaking mastery. Ba stage cộng dồn đạt
9/15 lesson, 64 prompt, 62 source binding/496 dòng và 9 review batch; 36
prompt audio-dependent có 0 reviewed audio, 20 prompt tự thu có 0 reviewed
rubric và tất cả vẫn learner-hidden, measurement/mastery/release-ineligible.
Sáu guided-production lesson, assessment, review và runtime HSK3 còn thiếu nên
chưa dùng điểm D cuối cùng.

Stage guided-paragraph HSK3 tiếp tục giữ tiến độ ở **81%**, author thêm 3
lesson và 16 prompt đọc–viết: 6 đoạn sáu câu theo câu hỏi dẫn, 5 đoạn so sánh
hai nguồn có dẫn chứng và 5 đoạn tám câu tự kiểm tra liên kết. Stage bind 16
graded-reading text/128 dòng qua 21 input source và 21 model evidence summary
exact-source. Người học phải viết tối thiểu 106 câu trong bản đầu, chỉ mở mẫu
sau đó, đánh dấu ít nhất hai chỗ sửa và viết lại bản cuối. Xem nguồn, model
hay tự check không cấp writing mastery khi chưa có reviewed rubric. Bốn stage
cộng dồn đạt 12/15 lesson, 80 prompt, 78 source artifact/624 dòng và 12 review
batch; toàn bộ vẫn learner-hidden, measurement/mastery/release-ineligible.
Ba guided-production lesson cuối, assessment, review và runtime HSK3 còn
thiếu nên chưa dùng điểm D cuối cùng.

Stage structured-explanation HSK3 tiếp tục giữ tiến độ ở **81%** và đóng đủ
15/15 guided-production lesson. 12 prompt nghe–nói hai nguồn được chia đều
thành giải thích lựa chọn–lý do, so sánh theo tiêu chí và nêu quan điểm có
giới hạn. Stage bind 18 listening text/144 dòng qua 24 input source; mỗi prompt
phải dùng bằng chứng hai nguồn, nêu điều kiện hoặc phản biện, nói tối thiểu
4–6 câu và thu hai lần. Tổng stage yêu cầu ít nhất 64 câu nói và 24 bản thu.
Browser TTS, model reveal và bản tự thu không cấp mastery khi chưa có reviewed
audio/rubric. Năm stage cộng dồn đạt 15/15 lesson, 92 prompt, 96 source
artifact/768 dòng, 117 input binding và 15 review batch; tất cả vẫn
learner-hidden, measurement/mastery/release-ineligible. Guided-production
authoring đã hoàn thành, nhưng assessment, human review, runtime HSK3 và HSK4
content còn thiếu nên chưa dùng điểm D cuối cùng.

Lát assessment HSK3 tăng trụ cột E thêm 1 điểm và đưa tiến độ lên **82%**.
Ngân hàng nguồn có hai form độc lập, mỗi form 86 mục và tổng cộng 172 mục:
24 nghe, 24 đọc, 30 từ vựng, 30 ngữ pháp, 32 nói và 32 viết. 108 mục
objective không thay thế 64 constructed response; hai form có 0 source entity
trùng nhau. 56 mục phụ thuộc audio vẫn chờ audio đã review, nói/viết vẫn chờ
rubric đã review, cả 12 batch đều pending và toàn bộ có 0 review, calibration,
measurement/mastery, prerequisite waiver hay release eligibility. Vì source
và đáp án còn nằm trong repository, form cũng chưa được phép phát cho learner.
Đây là assessment draft có validator, không phải bài thi HSK3 đã hiệu chuẩn.

Lát đóng gói review HSK3 giữ tiến độ ở **82%**. Manifest bind exact SHA-256
của 18 artifact và 122 batch: 55 blueprint, 25 paragraph, 15 narration,
15 guided-production và 12 assessment. Workflow local phân rã thành 423 lượt
phân vai và 3.037 target cụ thể, kiểm tra timestamp/identity/target digest,
chống sửa assignment và chỉ ghi receipt bất biến. Audio-rights không thể
approve khi audio HSK3 còn vắng; import receipt không sửa manifest, content,
runtime, calibration hay mastery. Đây là hạ tầng sẵn sàng giao cho người
review, không phải bằng chứng 122 batch đã được con người duyệt, nên không cộng
điểm review hoặc content.

Lát scope HSK4 tăng trụ cột C thêm 1 điểm và đưa tiến độ lên **83%**. Ba unit
graph được cụ thể hóa thành 78 lesson blueprint dự kiến: 36 deep-comprehension,
24 summary–argument và 18 timed-integration. Sáu domain partition chính xác
30 task/77 topic; năm module partition đủ 95 grammar row; 1.000 vocabulary và
441 recognition character được gắn vào long-form input. Sáu integration stage
lập kế hoạch tối thiểu 106 prompt, gồm structure map, inference/evidence,
cross-text synthesis, structured writing, spoken defense và timed rehearsal;
ba stage cuối yêu cầu evidence có thời gian. Scope vẫn learner-hidden, chưa
author lesson/practice/mock, chưa review/calibrate và không cấp mastery hay
tuyên bố HSK4 hoàn thành.

Lát vocabulary và lesson blueprint HSK4 tăng trụ cột C thêm 1 điểm, đưa tiến
độ lên **84%**. Snapshot CC-CEDICT Debian được tải tạm thời, kiểm tra đúng
archive/payload SHA-256 rồi xóa khỏi worktree; draft bind 1.000 mục official,
999 source-matched với 1.051 source match, 40 mục nhiều candidate và 15 mục
chờ review phát âm. `嗯 / ǹg` là một source coverage gap minh thị vì snapshot
chỉ có `en1/en4/en5`; hệ thống không ghép gần đúng. Pack 78 lesson partition
đúng 30 task, 77 topic, 1.000 vocabulary, 95 grammar row và 441 character:
36 deep-comprehension, 24 summary–argument và 18 integration; 9 lesson có
timed evidence và tổng prompt plan tối thiểu 106. Toàn bộ practice, prompt,
rubric, review, calibration, visibility, release và mastery vẫn bằng 0/pending;
blueprint coverage không phải authored lesson coverage.

Miền long-form HSK4 đầu tiên giữ tiến độ ở **84%** và hoàn thành 6/36 lesson
deep-comprehension thuộc đời sống cá nhân/cộng đồng. Pack có 12 nguồn ba đoạn
(36 đoạn), 60 target lexeme có nghĩa Việt draft và 180 item từ vựng, 60 câu
hỏi đọc/nghe đều bind đoạn bằng chứng, 12 bounded-inference item, 12 note map
với 60 nút và 6 bài viết tổng hợp hai nguồn; tổng cộng 258 practice item. Văn
bản chỉ dùng các target lexeme được author có chủ đích, không nhét 103 mục
fallback còn lại của domain vào ngữ cảnh giả để tạo claim coverage. Audio,
native/Vietnamese/assessment review, rubric, measurement, mastery, visibility
và release vẫn bằng 0/pending. Còn 5/6 domain và 30/36 lesson long-form nên
chưa cộng điểm trụ cột D.

Miền giáo dục/nghề nghiệp tiếp tục giữ **84%** và nâng long-form HSK4 lên
12/36 lesson, 2/6 domain. Lát mới thêm 12 nguồn/36 đoạn, 60 target lexeme,
180 item từ vựng, 60 câu hỏi evidence-bound, 12 bounded inference, 12 note
map/60 nút và 6 cross-source synthesis; lũy kế hai miền đạt 24 nguồn/72 đoạn
và 516 practice item. Nội dung phân biệt vai trò, tiến trình, nguyên nhân,
chỉ số so sánh, claim nghề nghiệp và quan điểm môi trường làm việc; mọi kết
luận đều có phạm vi và bằng chứng đoạn. Review/audio/measurement/mastery/
release vẫn bằng 0, còn 4 domain/24 lesson nên chưa tăng trụ cột D.

Miền tự nhiên/công nghệ giữ **84%** và nâng cumulative long-form lên 18/36
lesson, 3/6 domain. Lát mới thêm 12 nguồn/36 đoạn, 60 target lexeme, 180 item
từ vựng, 60 câu hỏi bind bằng chứng, 12 bounded inference, 12 note map và 6
cross-source synthesis. Lũy kế ba miền đạt 36 nguồn/108 đoạn và 774 practice
item. Các lesson buộc tách vai trò, dòng thời gian thử–so–sửa, nguyên nhân với
đánh đổi, phạm vi chỉ số, claim khoa học và tiêu chuẩn người dùng; tương quan
không được nâng thành nhân quả. Còn 3 domain/18 lesson và toàn bộ human/audio
review nên chưa tăng điểm D.

Miền xã hội/kinh tế tiếp tục giữ **84%** và nâng cumulative long-form lên
24/36 lesson, 4/6 domain. Sáu lesson mới thêm 12 nguồn/36 đoạn, 60 target
lexeme, 180 item từ vựng, 60 câu hỏi bind bằng chứng, 12 bounded inference,
12 note map và 6 cross-source synthesis; lũy kế bốn miền đạt 48 nguồn/144
đoạn và 1.032 practice item. Nội dung phân biệt dữ liệu công cộng, tiến trình
kinh doanh, điều kiện của thị trường, chỉ số hiệu quả, bằng chứng hạ tầng và
quan điểm về đổi mới kinh tế; thay đổi trước/sau, trung bình hoặc một chỉ số
không được tự nâng thành nhân quả hay thành công toàn diện. Còn 2 domain/12
lesson và toàn bộ human/audio review nên chưa tăng điểm D.

Miền văn nghệ/thể thao/giao lưu tiếp tục giữ **84%** và nâng cumulative
long-form lên 30/36 lesson, 5/6 domain. Sáu lesson mới thêm 12 nguồn/36 đoạn,
60 target lexeme, 180 item từ vựng, 60 câu hỏi bind bằng chứng, 12 bounded
inference, 12 note map và 6 cross-source synthesis; lũy kế năm miền đạt 60
nguồn/180 đoạn và 1.290 practice item. Nội dung buộc tách phân loại khỏi giá
trị, quá trình sáng tạo khỏi công thức cố định, hỗ trợ thể thao khỏi claim
nhân quả, chỉ số thi đấu khỏi hiệu quả toàn diện và câu chuyện danh nhân khỏi
thống kê chính xác. Còn 1 domain/6 lesson và toàn bộ human/audio review nên
chưa tăng điểm D.

Miền văn hóa/lịch sử hoàn tất 36/36 deep-comprehension lesson và 6/6 domain,
đưa tiến độ lên **85%**. Lát cuối thêm 12 nguồn/36 đoạn, 60 target lexeme,
180 item từ vựng, 60 câu hỏi evidence-bound, 12 bounded inference, 12 note
map và 6 synthesis; toàn chuỗi đạt 72 nguồn/216 đoạn, 360 target lexeme
context và 1.548 practice item. Phân tích tục ngữ, ẩm thực, tập tục, lễ nghi,
di tích và nhân vật lịch sử đều phải giữ provenance, nhiều nguồn, độ bất định
và phạm vi diễn giải. Điểm D đạt 30/30 cho deliverable content-coverage đã
định danh; điều này **không** tuyên bố HSK4 hoàn thành, vì 24 summary/argument
lesson, 18 integration lesson, assessment/mock, review và runtime vẫn mở.

Chuỗi 5/5 grammar module đã hoàn tất bản nháp 24/24 summary–argument lesson
nhưng tiến độ vẫn giữ **85%** vì pillar D đã đạt trần 30/30; không cộng điểm
chỉ vì thêm artifact hay dòng code. Hai mươi bốn lesson bind 48 nguồn
đọc/nghe bằng exact hash, phủ đủ 95 grammar row và có 263 practice item:
48 fact/interpretation audit, 48 paraphrase, 24 summary 100–180 chữ,
24 argument 160–280 chữ, 24 spoken defense cùng 95 grammar application.
Ba rubric family, 120 item audio-dependent và 24 learner recording vẫn chờ
human review; không item nào đủ measurement, mastery hay release.

Chuỗi 6/6 integration stage đã hoàn tất bản nháp 18/18 lesson nhưng tiến độ
vẫn giữ **85%** vì pillar D đã đạt trần và timed rehearsal chưa phải mock đã
review/calibrate. Sáu mươi long-form source không trùng (30 đọc + 30 nghe)
được bind vào đúng 106 prompt: 29 listening, 29 reading, 11 speaking và
37 writing primary-skill evidence unit. Bốn mươi bốn prompt có thời gian,
69 prompt phụ thuộc audio và 11 prompt yêu cầu learner recording; tất cả
chỉ là source-exposed practice với response contract, 18 review batch pending
và 0 measurement/mastery/release eligibility. Còn assessment/mock độc lập,
human/audio/rubric review, calibration và runtime local-first.

Lát assessment HSK4 tăng trụ cột E thêm 1 điểm và đưa tiến độ lên **86%**.
Hai pool nguồn độc lập có 96 item mỗi form, gồm 144 câu khách quan và 48
speaking/writing response trên toàn bank. Mười hai source family assessment
riêng tạo 24 văn bản/72 đoạn và không trùng ID, exposure, hash hay nội dung
với form còn lại hoặc 72 nguồn học HSK4. Mỗi form có mock blueprint chọn 54
item trong 6.000 giây và giữ 42 alternate; 36 câu từ vựng và 36 câu ngữ pháp
bind trực tiếp inventory HSK4 chính thức. Sáu mươi item phụ thuộc audio, 12
batch và toàn bộ review, calibration, measurement, mastery, prerequisite
waiver, visibility và release vẫn bằng 0/pending, nên đây là bank draft có
thể kiểm định chứ chưa phải chứng nhận HSK4 đã hiệu chuẩn.

Lát đóng gói review HSK4 giữ tiến độ ở **86%**. Manifest ghim exact SHA-256
của 19 artifact và 168 batch: 78 blueprint, 36 long-form, 24
summary/argument, 18 integration và 12 assessment. Workflow local phân rã
thành 629 lượt phân vai và 2.979 exact target, chống sửa assignment, ghi
receipt idempotent ngoài Git và không sửa content, manifest, runtime,
calibration hay mastery. Audio-rights không thể approve khi audio còn
`null`; 0 approval nghĩa là assignment readiness chưa phải human review.

Lát runtime local-first tăng trụ cột A thêm 1 điểm và đưa tiến độ lên **87%**.
Compiler deterministic bind exact graph, registry, manifest, item catalog và
sanitized runtime catalog bằng version/hash cùng import idempotency key. Artifact
learner-side chỉ giữ 5 path, 4 unit có prerequisite closure đầy đủ và 8 lesson
mapping. Sáu lesson beta/published thuộc daily/character bị chặn sau các unit
time/travel/work chưa phát hành; metadata của tổng cộng 14 unit không đủ điều
kiện, official inventory ID và mọi draft/review payload đều bị loại. HSK0 có 4
lesson, HSK1 có 4 lesson đích cùng bridge HSK0, còn HSK2-4 vẫn fail-closed với
target rỗng và không có completion claim. Client đã chuyển khỏi authoring graph
sang projection này; source drift, artifact tampering, lesson không ở trạng
thái beta/published hoặc mapping vượt prerequisite đều làm gate thất bại.

Lát adapter lesson/activity local tăng trụ cột A thêm 1 điểm và đưa tiến độ lên
**88%**. Mỗi phiên của đúng 8 lesson đủ điều kiện được materialize
deterministic từ catalog đã kiểm, bind catalog/compiler/import key/integrity,
content schema, item-catalog schema, lesson version, session, script và
activity schema/version. Store tự đối chiếu activity payload rồi mới suy ra
outcome và skill; UI không thể tự khai đáp án đúng. Retry cùng idempotency key
và cùng payload là no-op, còn cùng key với answer/version/provenance khác bị
chặn mà không đổi evidence hay mastery. Reload chỉ replay exact provenance;
evidence của sáu lesson bị prerequisite chặn không thể hồi sinh. Backup import
vẫn giữ lịch sử ở dạng inspectable/unverified nhưng không cấp completion,
knowledge hay mastery. Draft HSK2-4 vẫn không đi vào runtime.

Lát demo HSK0→HSK1 tăng trụ cột F thêm 1 điểm và đưa tiến độ lên **89%**.
Checked manifest bind exact runtime catalog/source identity nhưng cấm toàn bộ
progress seed; onboarding target HSK1 vẫn bắt buộc bridge `boot-1..4`.
Playwright thực hiện 40 answer qua UI thật, reload đúng session sau câu đầu,
cố ý tạo một lỗi không bắt buộc, hoàn tất `boot-1` ở 90%, remediation hai lần
không hint rồi hoàn tất ba bridge lesson còn lại. Kết quả có 44 lesson
evidence + 2 remediation evidence với idempotency/provenance và skill bucket
được đối chiếu; chỉ `survival-1` mở, ba target tiếp theo cùng sáu lesson
daily/character vẫn khóa và HSK2-4 vẫn unavailable. Runbook ghi rõ đây là local
prototype, không phải mastery server, HSK completion hay production evidence.

Lát nền đóng gói local candidate hiện **giữ tiến độ ở 89%** cho tới khi receipt
đã được tạo từ clean source và toàn bộ gate xanh. Contract mới allow-list 10
artifact, 4 gate và 8 Playwright acceptance binding cho demo, mobile, keyboard,
reduced-motion, offline shell, owner-safe reset và backup export/import/reload.
Validator cấm claim production/hosted/review/calibration/Sites, xác nhận readiness
vẫn có 9 gate pending/23 blocker và phát hiện test title hoặc artifact bị thiếu.
Test backup cũng đã chuyển sang tải file thật qua UI, import và reload; phần hạ
tầng này chưa tự kiếm điểm F nếu chưa có machine-readable receipt.

Lát local candidate hoàn chỉnh tăng trụ cột F thêm 1 điểm và đưa tiến độ lên
**90%**. Receipt deterministic bind clean source commit `83e967d`, 10 artifact
và build 220 file/7.001.874 byte; cả 4 gate local cùng 8/8 acceptance capability
đều `passed`. Baseline có 217 file/1.560 Vitest, 21/21 Playwright, Lighthouse
mobile median P96/A100/BP100/SEO100 và dependency audit 0 vulnerability.
Verifier cho phép sau gate chỉ receipt cùng hai file tiến độ thay đổi; code,
config, content, test binding, artifact hoặc build lệch đều làm candidate stale.
Receipt đồng thời giữ production blocked với 9 gate/23 blocker và mọi claim
production/hosted/review/calibration/Sites bằng `false`.

Verifier hậu commit đã phát hiện phép so sánh ban đầu phụ thuộc thứ tự key JSON
dù receipt được canonicalize. Regression chuyển mọi contract/gate/acceptance/
build comparison sang canonical JSON, đồng thời kiểm exact command thay vì chỉ
trạng thái `passed`. Sửa lỗi này giữ tiến độ ở **90%** và bắt buộc tái tạo
candidate từ clean source; không nới stale-source policy.
Receipt đã được tái tạo từ source sửa lỗi và sẵn sàng cho verify hậu commit.

Lát audit promotion queue **giữ tiến độ ở 90%** vì kiểm kê khoảng trống không
tự tạo learner coverage. Checked projection bind 16 source artifact và tách
213 authored blueprint khỏi 0 blueprint approval, 497 review batch/0 approval
record, 4 HSK1 target lesson visible, 6 source lesson bị prerequisite chặn,
3 path HSK2-4 unavailable và 0 completion claim. Candidate dependency sớm nhất
là `hsk1-time-place-events` với 6 lesson, 243 practice item và 81 listening
item; prerequisite runtime trước unit đã hiện diện nhưng human review, reviewed
audio và versioned runtime import đều thiếu. Queue không sửa runtime hay expose
draft, nên chưa cộng điểm G2/G3/G4.

Checked handoff cho lesson đầu tiên `hsk1-time-place-events:01-numbers` tiếp tục
**giữ tiến độ ở 90%**: nó bind 67 content target exact-hash, 2 batch/6 role
receipt và 16 audio target, đồng thời định nghĩa target version/import receipt
contract. Cả 6 receipt, 16 reviewed audio asset, runtime package và promotion
receipt vẫn thiếu; artifact learner-hidden không sao chép draft payload và mọi
learning/release claim đều false. Đây là review packaging cần thiết, chưa phải
review, publication hay learner coverage nên chưa cộng điểm.

Dry-run fail-closed cho handoff này cũng **giữ tiến độ ở 90%**. Nó chứng minh
input repo thật thiếu toàn bộ evidence và phát hiện nếu thêm lesson 1 đơn lẻ thì
compiler sẽ mở ngoài ý muốn unit `hsk1-daily-life` cùng `daily-1..4`, trong khi
5 lesson time/place/event còn thiếu. Guard mới yêu cầu promotion nguyên tử
6/6 lesson và cấm downstream activation ngoài request. Test fixture đủ 6 review
receipt, 16 audio, package và receipt chỉ chứng minh hash contract; fixture
không bao giờ authorize import và dry-run không sửa graph/runtime.

Atomic six-lesson handoff **giữ tiến độ ở 90%** vì vẫn là packaging
learner-hidden. Unit release digest bind 425 content target gồm đủ 6 lesson,
81 vocabulary, 25 grammar row, 3 topic/task và toàn bộ 271 practice item;
15 review batch cần 45 role receipt, còn 90 audio target chưa có reviewed
asset/rights. Downstream authorization rỗng và explicit unit-release gate,
runtime package, promotion receipt đều thiếu. Không có approval, visibility,
completion hay mastery claim.

Lát compiler boundary tiếp tục **giữ tiến độ ở 90%**. Checked unit-release
policy có source hash riêng và allow-list đúng 4 unit/8 lesson hiện có; 2 unit
đã có source mapping cùng 6 lesson không còn được suy diễn là đã phát hành.
Compiler v2 yêu cầu đồng thời trạng thái lesson hợp lệ, explicit unit
authorization và prerequisite closure; authorization không cấp review hay
mastery. Dry-run lesson đơn đã được rebound: nó vẫn bị chặn vì thiếu 5/6
lesson nhưng không còn làm `hsk1-daily-life` mở ngoài ý muốn. Dry-run nguyên
unit dùng chính resolver production chứng minh fixture đủ 6 lesson chỉ có thể
mở `hsk1-time-place-events`; `hsk1-daily-life` và `daily-1..4` vẫn bị giữ khi
không có authorization riêng. Fixture không authorize import, không sửa graph,
policy/runtime và không tạo learner coverage, nên chưa cộng điểm.

Checked reviewer packet cho atomic unit cũng **giữ tiến độ ở 90%**. Packet
learner-hidden giải tham chiếu đủ 425 exact-hash source target và 87 runtime-core
payload thành dữ liệu reviewer có thể đọc, nhóm theo 6 lesson, giữ 21 batch/63
role slot cùng checklist riêng
cho Mandarin, tiếng Việt, assessment, grammar và task pedagogy. Audio manifest
đưa đủ script, tên WAV an toàn và source hash cho 90 target: 6 lesson dialogue,
81 vocabulary listening và 3 task dialogue; format import, speaker provenance,
native review và rights evidence đều bắt buộc. Guide mô tả workflow assignment,
receipt và recording nhưng không tự điền review/audio, không publish hay cấp
mastery, nên deliverable này chỉ gỡ nút thắt vận hành và chưa cộng điểm.

Unit evidence-intake gate tiếp tục **giữ tiến độ ở 90%**. Checked readiness
report bind handoff và reviewer packet, hiện trung thực 0/63 approved receipt,
0/90 reviewed WAV/rights record, `readyForPackage=false` và
`importAuthorized=false`. Dynamic local status đọc assignment/receipt đã có,
kiểm lại exact manifest hash và target digest; audio record phải bind bytes WAV
được inspect, speaker/consent/rights, native review và rights review độc lập.
Gate cấm duplicate slot/target, một reviewer kiêm nhiều role trong cùng batch,
tái dùng audio bytes, path escape/symlink và đổi nhãn fixture thành evidence
thật. Fixture đủ 63/63 + 90/90 chỉ chứng minh contract, vẫn không có package
authority, visibility, completion hay mastery nên chưa cộng điểm.

Versioned package planner tiếp tục **giữ tiến độ ở 90%** vì đây là audit
fail-closed, chưa phải learner coverage. Planner pin đúng nhánh package
`foundation-2026.07.6` → `foundation-2026.07.7`, atomic digest và evidence
baseline 0/63 + 0/90. Runtime-core projection đã author đủ 87/87 payload nhưng
0 payload được review/finalize: sáu authoring ID dấu `:` có mapping sang ID an
toàn, 81 lexeme có traditional/numbered pinyin/example/tag và sáu lesson có đủ
metadata runtime. Planner đồng thời phát hiện 338/425 target dialogue, practice,
grammar và task chưa được runtime schema tiêu thụ, nên thêm blocker activity/
knowledge projection thay vì cho package làm rơi phần nội dung chuyên sâu. Nó
cũng tách 63 draft/projection receipt khỏi bốn package-governance approval,
ghi rõ owner/license/audio descriptor/package/unit authorization/promotion
receipt đều thiếu và không ghi registry, package, policy hay runtime.

Runtime-core projection slice tiếp tục **giữ tiến độ ở 90%** vì toàn bộ dữ
liệu vẫn learner-hidden và review-pending. Checked artifact tạo 81 lexeme + 6
lesson payload đúng schema, 6 safe runtime lesson ID, một prerequisite nối với
`survival-4`, 42 câu ví dụ AI-assisted mới và 39 candidate lấy exact-hash từ
dialogue. Bảy lựa chọn traditional, hai hòa giải phát âm nguồn và ba chuẩn hóa
erhua cho parser đều được ghi provenance; parser có regression cho `nǎr/zhèr`.
Sáu batch/18 slot projection đã vào manifest/workflow, đưa tổng HSK1 lên 7
artifact, 91 batch, 276 role assignment và 2.268 exact target. Artifact tự khai
338 non-core target chưa biểu diễn, có 0 approval/release item và cấm import,
nên chưa cộng điểm hay tạo completion/mastery claim.

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

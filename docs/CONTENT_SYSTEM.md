# Hệ thống nội dung

## Nguyên tắc

Nội dung không được lưu như HTML tự do. Mỗi đơn vị phải có metadata để tái sử dụng trong lesson, SRS, reader, dictionary, assessment và AI tutor.

## Lát triển khai hiện tại

`foundation-2026.07.6` là candidate schema v6 / item catalog v4 hiện tại, kế
thừa inventory từ package schema v4 đầu tiên `.07.5`. Full authoring inventory
có 74 payload: 24 lexeme, 24 lesson, 1 graded text, 5
grammar pattern, 5 pronunciation target, 7 character và 8 communicative
function. Lesson khai báo `knowledgeItems` tường minh; lexeme membership phải
khớp chính xác `wordIds`. Typed prerequisite được kiểm dangling reference,
duplicate, self-reference và cycle trên toàn bộ loại item.

Runtime không đọc governance catalog. `runtime-catalog.json` là projection
allow-list chỉ chứa 24 lexeme đang được dùng, 14 lesson beta/published và 1
graded text published. Nó loại draft/review item, owner/license, review scope,
payload hash, audio metadata và cả bốn loại knowledge item mới. Exporter tạo
candidate từ full immutable authoring catalog, không lấy sanitized runtime làm
nguồn, nên 10 lesson draft không bị mất khi tạo version kế tiếp. Với catalog
v4, core/knowledge payload được tái chiếu từ authoring source hiện hành trong
khi character source/stroke artifact được ghép lại nguyên vẹn; audio chỉ được
rebind khi transcript vẫn khớp canonical target text.

Đây vẫn chỉ là authoring envelope kỹ thuật, chưa phải CMS hoàn chỉnh. 25 item
mới đều ở state `review`, owner/license đều `null`. Bảy character đã có radical,
IDS cấu trúc/cấu kiện và stroke asset source-addressed trong package bất biến,
nhưng chưa có legal/license decision hay native linguistic review. Package
không có approval, claim A0/HSK hay audio. Release gate xét
transitive dependency closure nên không thể dùng lesson đã phát hành để lách
review của knowledge item. Production tiếp tục fail closed.

Tooling đã có đường nhập audio bất biến cho candidate tương lai bằng content
schema v5 / item catalog v3. Policy v1 đọc trực tiếp RIFF/WAVE bytes và chỉ nhận
PCM mono 16-bit trong allow-list sample rate/duration/size; catalog bind exact
target payload, normalized transcript, timestamp segments, speaker evidence,
rights, media metadata và file hash. Bytes được copy package-local rồi inspect
và validate lại trước registry mutation. Catalog schema cũ vẫn đọc được để giữ
lịch sử, nhưng audio legacy/uninspected không bao giờ thỏa production audio
gate. Đây chỉ là workflow kỹ thuật: `foundation-2026.07.6` vẫn có audio catalog
rỗng và không có evidence hay approval thật.

Đường `content:character:import` tương tự tạo candidate content schema v6 /
item catalog v4 từ catalog authoring schema v2 và descriptor phủ chính xác toàn
bộ character item. Radical, component và structure phải trỏ tới linguistic
source record package-local; stroke count/file phải trỏ tới đúng một
stroke-dataset record đã được inspect từ bytes. Chữ độc lập hợp lệ với
`components: []`, còn chữ ghép phải có component và structure không phải
`independent`. Linguistic JSON và stroke source đều bind đúng character
`recordKey`; source/hash/stroke drift, path escape, symlink/junction, aggregate
quá lớn và descriptor thiếu/thừa đều fail closed trước registry mutation.
Schema cũ vẫn đọc được nhưng character metadata kiểu cũ không thể trở thành
release evidence.

Lifecycle schema v6 giờ giữ đồng thời hai loại artifact. `new-version` capture,
copy và inspect lại audio/character bytes bất biến; audio importer có thể append
hoặc thay cùng `assetId` trên đúng target mà không làm mất character data; và
character importer giữ audio, chỉ rebind target digest khi target text không
đổi. Package control file, snapshot và artifact kế thừa phải là regular file
trong trusted package tree, giữ đúng identity trong suốt capture. Mọi đường
không an toàn hoặc mutation dở dang đều fail trước registry handoff.

Validation prerequisite dùng traversal lặp và một reachability index dạng
bitset có trần 32 MiB/200.000 edge; graph nhỏ lỗi vẫn chạy exact traversal để
giữ thông báo cụ thể, còn graph lớn vượt giới hạn fail closed. Vì vậy item graph
và runtime graph khớp 10.000 lesson không còn kích hoạt closure scan bậc hai.

Characters UI hiện không dùng vocabulary đang phát hành để suy diễn kho Hán tự
hay hiển thị radical/mnemonic hard-code. Cho tới khi runtime projection có
character item đã duyệt, màn hình chỉ hiển thị trạng thái chưa có dữ liệu.
Public build cũng không copy stroke JSON. `foundation-2026.07.6` đã có source
snapshot và character candidate thật, nhưng chưa có owner, package-level license
approval, native review, promotion hay runtime character projection.

## Inventory tham chiếu HSK0-4

`content/sources/hsk-syllabus-2026/source.json` ghim đề cương HSK có hiệu lực
từ July 2026 bằng URL, ngày phát hành/truy cập, số trang và SHA-256.
`scripts/content/extract-hsk-syllabus.py` chỉ trích inventory HSK1-4 có giới
hạn gồm task, topic, vocabulary, recognition character và grammar row; source
PDF không được phân phối trong repo. Validator kiểm source identity, page range,
count, sequence và level boundary, còn `content:hsk4:report` đối chiếu inventory
với runtime hiện tại.

Để tái tạo, cài đúng các phiên bản trong
`scripts/content/requirements-hsk-syllabus.txt`, đặt PDF đã kiểm checksum tại
`tmp/pdfs/hsk-syllabus-2026.pdf`, rồi chạy `npm run content:hsk4:extract`.

Inventory này là dữ liệu tham chiếu cho curriculum authoring, không phải
runtime package hoặc release evidence. Rights vẫn `pending`; một mục được nhập
không tự mở lesson, cấp mastery, trở thành nội dung đã review hay tạo claim
coverage. Mọi claim HSK1-4 vẫn phải qua mapping, practice, review và release
gate tương ứng.

## Bootcamp phát âm HSK0

`content/sources/official-hanyu-pinyin-scheme-1958/source.json` ghim trang và
PDF `汉语拼音方案` chính thức, cùng metadata trạng thái của GB/T 16159-2012.
PDF nguồn không được phân phối trong repo và quyết định quyền vẫn `pending`.

`content:hsk0:pronunciation -- --write` tái tạo
`content/drafts/hsk0-pronunciation-bootcamp-2026.07.json`; lệnh `--check` và
`content:hsk0:pronunciation:validate` là gate bắt buộc. Pack authoring có 12
lesson, 111 target và 208 activity, phủ exact 21 thanh mẫu, 35 ô vận mẫu chính
thức cùng `er`, quy tắc chính tả, đối chiếu âm đầu, bốn thanh + thanh nhẹ, đủ
25 tone pair, biến điệu và shadowing câu sinh tồn.

Đây vẫn là lớp draft learner-hidden. 89 hoạt động nghe/ghi âm có `audio: null`;
TTS trình duyệt chỉ dùng preview biên tập, ASR trình duyệt không được chấm
phát âm hoặc cấp mastery. Mỗi lesson có review batch yêu cầu native Mandarin,
biên tập Việt và reviewer sư phạm phát âm; batch phụ thuộc âm thanh còn yêu
cầu audio-rights reviewer. Chỉ khi source/quyền, transcript, audio và review
đều đạt thì một phiên bản content mới mới được cân nhắc import vào runtime.

`content/curriculum/hsk0-4-graph.json` là graph authoring bind exact inventory
hash và runtime content version. Nó có năm path, 18 unit và
mapping tường minh cho toàn bộ 14 lesson đang phát hành. Validator tái tính
official vocabulary reference từ surface + pinyin của runtime: hiện có 23 mục
được lesson-map, còn `越南` được giữ trong danh sách chưa ánh xạ. Mapping state
vẫn `partial`; task, topic và grammar chưa được gán nên không tạo claim HSK.

## Backlog từ vựng HSK1

`content/sources/cc-cedict-2026-07-28/source.json` ghim snapshot CC-CEDICT
editor export bằng byte length, entry count và SHA-256. Source khai báo
CC BY-SA 4.0; attribution và thay đổi khi lọc/chuẩn hóa được ghi tại
`ATTRIBUTION.md`, còn legal review cấp dự án vẫn `pending`. Không tự động tải
từ MDBG vì website đó cấm scripted access.

`content:hsk1:import -- --write` đọc snapshot gzip cục bộ, kiểm header license,
hash và count rồi đối chiếu đúng 300 mục HSK1 theo surface + pinyin. Artifact
compact trong `content/drafts/` giữ English source senses, phát âm số/dấu,
source-line digest và trạng thái biên tập. Hiện 297 mục tương thích phát âm, 3
mục cần giải quyết tone drift và 23 mục có nhiều source match.

Đây không phải nội dung learner-ready: nghĩa tiếng Việt, ví dụ, review và
release eligibility đều bằng 0. Validator/report bắt buộc giữ draft
learner-hidden và không cho source enrichment biến thành coverage claim.

`content/curriculum/hsk1-scope.json` biến inventory phẳng thành backlog theo
sáu unit HSK1. Generator ghim exact graph hash rồi phân vùng primary
exactly-once cho đủ 15 task, 30 topic, 300 vocabulary, 66 grammar row và 246
recognition character. Mỗi unit có focus và exit-evidence mode riêng; character
inventory nằm trong unit luyện chữ, không bị tính như từ vựng đã học.

Scope này chỉ quyết định nơi biên tập item, không chứng minh lesson/practice
coverage. Checked report vẫn tách `authoringScope` khỏi released learning
mapping; task/topic/grammar thực dạy hiện vẫn bằng 0.

## Scope authoring HSK2

`content/curriculum/hsk2-scope.json` bind exact graph và inventory HSK2 nhưng
không sao chép lộ trình HSK1. Ba unit lần lượt tập trung hội thoại tình huống
nhiều lượt, chuỗi câu/ngữ pháp và dictation-văn bản ngắn. Bên trong, bốn mạch
tình huống phân vùng 17 task, 34 topic và 200 từ; bốn mô-đun phân vùng 75
grammar row; unit sản xuất giữ 125 recognition character và bốn giai đoạn
evidence dự kiến.

Chạy `content:hsk2:scope -- --write` để tái tạo, dùng `--check` cùng
`content:hsk2:scope:validate` làm gate. Validator yêu cầu từng inventory item
thuộc đúng một unit và đúng một strand/module phù hợp. Con số 40 lesson
blueprint chỉ là kế hoạch authoring: scope vẫn learner-hidden, không phải
lesson/practice coverage, không cấp mastery và không tạo claim HSK2 hoàn thành.

## Backlog từ vựng HSK2

`content/sources/cc-cedict-debian-2026-04-03/source.json` ghim riêng Debian
source repack `cc-cedict_0.0~repack20260403.orig.tar.xz` cùng SHA-256/byte
length của archive và member `cedict_ts.u8`. Payload khai báo CC BY-SA 4.0;
attribution được giữ cạnh descriptor và legal review vẫn `pending`. Repo không
phân phối archive hoặc payload nguồn.

Để tái tạo, tải đúng archive từ URL trong descriptor, giải nén duy nhất member
`cedict_ts.u8` vào `tmp/cedict-debian/`, rồi chạy:

```powershell
npm run content:hsk2:import -- --archive-file tmp/cedict-debian/cc-cedict_0.0~repack20260403.orig.tar.xz --source-file tmp/cedict-debian/cedict_ts.u8 --write
```

Importer kiểm độc lập hash/byte length của cả archive và payload, header
license, entry count và exact HSK2 surface/pinyin trước khi tạo compact draft.
Validator cùng checked backlog report là quality gate thường trực. Kết quả
hiện tại có 200/200 mục HSK2 khớp nguồn, 232 source match, 26 mục nhiều ứng
viên và 6 mục cần duyệt khác biệt phát âm.

Đây mới là source enrichment: 0 nghĩa Việt được duyệt, 0 lesson blueprint đã
map từ vựng ở checkpoint nguồn, 0 practice, 0 learner-visible và 0
release-eligible. Không được dùng con số 200/200 để tuyên bố hoàn thành HSK2.

`content/drafts/hsk2-lesson-blueprints-2026.07.json` hiện thực hóa đúng 40
lesson blueprint từ scope: 20 bài hội thoại tình huống, 10 bài chuỗi
câu/ngữ pháp và 10 bài nghe-chép/viết ngắn. Generator exact-partition đủ 17
task, 34 topic, 200 vocabulary, 75 grammar row và 125 recognition character;
dependency là một chuỗi không dangling qua ba unit. Mỗi bài có objective,
practice/assessment plan và audio requirement phù hợp với loại evidence.
Các task, topic và nhóm từ của 20 bài tình huống được gán bằng mapping ngữ
nghĩa tường minh, không chia đều theo số lượng: ví dụ mô tả đồ vật nằm trong
bài so sánh màu/kích thước, còn họ và cách xưng hô nằm trong bài văn hóa giao
tiếp. Validator và regression test giữ cả exact partition lẫn các neo ngữ nghĩa
này để không tái tạo một blueprint đúng số lượng nhưng sai tình huống.

Chạy `content:hsk2:lesson-blueprints -- --write` để tái tạo; `--check` cùng
`content:hsk2:lesson-blueprints:validate` là gate bắt buộc. Bốn mươi review
batch mới chỉ nhắm vào blueprint và đều chờ native Mandarin curriculum,
Vietnamese editorial và assessment review. Pack cố ý giữ 0 authored practice,
0 assessment prompt, 0 rubric, 0 approval và 0 release-eligible lesson; bước
tiếp theo mới author nội dung ngữ cảnh và ngân hàng luyện tập cho từng bài.

`content/drafts/hsk2-vocabulary-practice-2026.07.json` là lớp practice đầu
tiên trên 20 bài tình huống. Pack giữ 200 nghĩa Việt AI-assisted draft theo
đúng official ID, từ loại, lesson và exact CC-CEDICT source-line digest; hai
mục đồng hình như `花` không bị gộp nghĩa. Mỗi từ có ba item riêng:
meaning-recall, pinyin-recognition và listening-selection, tổng 600 item.

`content:hsk2:vocabulary-practice -- --write` tái tạo artifact; `--check` và
`content:hsk2:vocabulary-practice:validate` kiểm exact 200 × 3, option không
trùng, lesson assignment, provenance và 20 review batch. Tất cả nghĩa Việt
vẫn chờ native Mandarin/Vietnamese review. Hai trăm item nghe có `audio: null`
và browser TTS chỉ để luyện draft; 0 item measurement/mastery/release-eligible.
Character và grammar đã có các pack draft tách biệt bên dưới; dialogue/task
production nằm trong pack tình huống bên dưới; short-text production và
assessment HSK2 vẫn là các lát authoring tiếp theo.

`content/drafts/hsk2-character-practice-2026.07.json` phủ cả 125 recognition
character bằng 250 item trong 10 bài production: 124 bài nhận diện chữ trong
từ ngữ cảnh, 1 bài nhận diện glyph độc lập cho `留`, và 125 bài tự chép hình
dạng. `留` được ghi thành gap vì không xuất hiện trong vocabulary HSK1–2,
không bị gắn giả vào một từ HSK2.

`content:hsk2:character-practice -- --write` tái tạo pack; `--check` và
`content:hsk2:character-practice:validate` kiểm exact character/lesson/context
partition, option, review batch và gap nói trên. Cả 125 chữ vẫn có radical,
stroke count và stroke data bằng `null`; bài tự chép không dạy/chấm thứ tự nét
và không suy diễn writing mastery từ recognition hay self-check.

`content/drafts/hsk2-grammar-context-2026.07.json` exact-map cả 75 grammar row
vào 10 bài sentence-chain. Mỗi row giữ nguyên official source text, category,
page và lesson/track binding, đồng thời có một giải thích tiếng Việt
AI-assisted, một ví dụ Hán tự–Pinyin–nghĩa Việt và một guided production có
đáp án tự đối chiếu riêng. Tổng cộng pack có 75 model example và 75
guided-pattern-production item.

Chạy `content:hsk2:grammar-context -- --write` để tái tạo; `--check` và
`content:hsk2:grammar-context:validate` kiểm exact 75-row partition, source
hash, lesson mapping, tính duy nhất/tính đủ của ngữ cảnh, 10 review batch và
trạng thái fail-closed. Toàn bộ nội dung vẫn chờ native Mandarin, Vietnamese
editorial và grammar-pedagogy review; guided item chỉ `self-reveal-only`, có
0 approval và 0 measurement/mastery/release-eligible item. Draft coverage
không được suy thành grammar mastery hoặc claim HSK2 hoàn thành.

`content/drafts/hsk2-situational-dialogues-2026.07.json` author đủ 20 bài hội
thoại HSK2, mỗi bài đúng sáu lượt A/B, tổng 120 lượt Hán tự–Pinyin–nghĩa Việt.
Pack bind chính xác 17 task thành 17 scenario, 34 topic thành 34 prompt có câu
hỏi gợi ý, và tạo 20 guided roleplay tự đối chiếu. Mỗi bài nêu tình huống,
chức năng giao tiếp, từ mục tiêu thực sự xuất hiện trong hội thoại và evidence
policy yêu cầu hỏi tiếp/xác nhận; không suy diễn listening, speaking hay
reading mastery từ việc tự xem đáp án.

Chạy `content:hsk2:situational-dialogues -- --write` để tái tạo; `--check` và
`content:hsk2:situational-dialogues:validate` kiểm source hash, exact
task/topic/lesson binding, sáu lượt luân phiên, từ mục tiêu trong câu và 20
review batch. Cả 20 audio vẫn là `null`; native Mandarin, Vietnamese
editorial, task-pedagogy và audio-rights review đều pending hoặc
`blocked-no-audio`. Pack giữ 0 approval và 0 measurement/mastery/
release-eligible item.

`content/drafts/hsk2-short-text-production-2026.07.json` hiện thực hóa đủ 10
blueprint productive-text theo bốn bậc: 36 prompt nghe-chép, 36 prompt dựng
câu, 16 prompt viết tin nhắn ba câu và 16 prompt mô tả cảnh, tổng 104 prompt
và 168 câu mẫu Hán tự–Pinyin–nghĩa Việt. Số prompt của từng bài lấy trực tiếp
từ `minimumPromptUnits` trong blueprint, không dùng một ngân hàng nhỏ chung
cho mọi stage.

Cả 125 recognition character HSK2 được bind vào đúng bài và xuất hiện trong
đáp án của đúng một prompt trong bài đó. Validator kiểm exact character
partition, mảnh dựng câu khớp đáp án, ba ý bắt buộc/ba câu mẫu của guided
production và source hash. `留` có ngữ cảnh hỗ trợ draft là `留学生`, nhưng
report vẫn giữ đúng gap: chưa có cumulative official HSK1–2 vocabulary context
cho chữ này.

Chạy `content:hsk2:short-text-production -- --write` để tái tạo; `--check`
cùng `content:hsk2:short-text-production:validate` là gate bắt buộc. Ba mươi
sáu prompt nghe-chép có `audio: null`; toàn bộ prompt chỉ
`self-reveal-revision-only`. Mười review batch chờ native Mandarin,
Vietnamese editorial, writing-pedagogy và assessment review; batch nghe-chép
còn chờ audio-rights. Vì vậy pack có 0 approval, measurement/mastery và
release-eligible item, không được coi là writing hoặc HSK2 mastery.

`content/drafts/hsk2-level-assessment-2026.07.json` chứa hai form HSK2
source-disjoint, mỗi form 86 mục: 15 nghe, 15 đọc, 15 từ vựng, 15 ngữ pháp,
10 nói và 16 viết. Tổng bank có 120 mục khách quan và 52 constructed response.
Mỗi item chỉ ghi evidence cho đúng một skill; speaking phủ toàn bộ 17 task/34
topic, còn writing dùng đủ 32 prompt guided-message/picture-description. Hai
form không chia sẻ source entity và 12 batch form/section exact-partition đủ
172 item.

Chạy `content:hsk2:level-assessment -- --write` để tái tạo; `--check` cùng
`content:hsk2:level-assessment:validate` khóa source hash, form partition,
skill isolation, option/answer, coverage và fail-closed eligibility. Đây là
source-exposed authoring bank, chưa phải đề có thể phát hành: 30 audio vẫn
`null`, speaking/writing rubric chưa review, chưa có cut score hoặc calibration,
và 0 item được dùng cho measurement, mastery, prerequisite waiver hay release.

`content/review/hsk2-review-manifest-2026.07.json` là queue review exact-hash
cho 7 artifact HSK2 và 122 batch. Chạy `content:hsk2:review-manifest
-- --write` để tái tạo; `--check`,
`content:hsk2:review-manifest:validate` và
`content:hsk2:review-workflow:validate` là các gate. Lệnh
`content:hsk2:review:list` liệt kê batch; `content:hsk2:review:export` tạo một
assignment theo role với target digest; reviewer chỉ hoàn thiện `response`
trước khi chạy `content:hsk2:review:import`.

Workflow giải 405 assignment và 1.732 target chính xác. Receipt được lưu dưới
`content/review/local/hsk2/`, đã Git-ignore và ghi idempotent; nó không sửa
manifest, draft, runtime, calibration hay mastery. Approval audio-rights bị
chặn khi audio tương ứng còn vắng. Receipt local cũng không tự trở thành
approval hoặc bằng chứng release.

## Scope authoring HSK3

`content/curriculum/hsk3-scope.json` bind exact graph và inventory HSK3 thành
ba unit khác HSK2: input nghe/đọc cấp đoạn; tường thuật và liên kết diễn ngôn;
sản sinh đoạn/nói có hướng dẫn. Năm discourse domain exact-partition 22 task
và 54 topic theo đời sống cá nhân, học tập–công việc, tự nhiên–môi trường,
xã hội–văn nghệ–thể thao và văn hóa–truyền thống. Năm grammar module
exact-partition 96 row.

Scope đặt 500 vocabulary và 284 recognition character ở lớp paragraph input
nhưng ghi rõ semantic clustering còn cần source review; không gán nghĩa giả từ
thứ tự inventory. Kế hoạch có 55 lesson blueprint và năm production stage với
tối thiểu 92 prompt: note ý chính/chi tiết, dựng cohesion, kể lại từ ghi chú,
viết đoạn 6–8 câu và giải thích/so sánh bằng lời.

Chạy `content:hsk3:scope -- --write` để tái tạo; `--check` và
`content:hsk3:scope:validate` khóa graph/source digest, exact partition,
distinct evidence modes và fail-closed claims. Scope vẫn learner-hidden, chưa
phải lesson/practice coverage, không cấp mastery và không chứng minh HSK3 hoàn
thành.

Nguồn làm giàu HSK3 dùng cùng Debian CC-CEDICT repack đã ghim cho HSK2:
archive `cc-cedict_0.0~repack20260403.orig.tar.xz` và payload
`cedict_ts.u8` đều phải khớp byte length/SHA-256 trong source descriptor.
`content:hsk3:import` chỉ chạy với hai file reconstruction local và sinh
`content/drafts/hsk3-vocabulary-2026.07.29.json`; artifact đã commit chứa đủ
500 mục HSK3, 529 source match, 24 mục nhiều candidate và 8 pronunciation
review item. Không source sense tiếng Anh nào được coi là nghĩa Việt đã review.

`content/drafts/hsk3-lesson-blueprints-2026.07.json` hiện thực hóa 55 lesson:
25 paragraph input, 15 narration/grammar và 15 guided production. Nó
exact-partition 22 task, 54 topic, 500 vocabulary, 96 grammar row và 284
recognition character, dùng một chuỗi prerequisite không cycle. Năm production
stage giữ tối thiểu 92 prompt unit nhưng chưa author prompt.

Phân loại từ vựng dùng keyword score trên chữ giản thể và source sense. 287 mục
có ít nhất một tín hiệu; 213 từ chức năng/liên miền không đủ tín hiệu được ghi
rõ `cross-domain-foundation-fallback`, không được tuyên bố là semantic match.
283/284 chữ có context trong chính 500 từ tăng thêm; một gap được giữ tường
minh. Chạy `content:hsk3:lesson-blueprints -- --write` để tái tạo; `--check`,
`content:hsk3:vocabulary:validate` và
`content:hsk3:lesson-blueprints:validate` là gate bắt buộc. Tất cả 55 review
batch đang pending; practice, rubric, approval, measurement, mastery, learner
visibility và release eligibility vẫn bằng 0.

`content/drafts/hsk3-personal-paragraph-identity-2026.07.json` là content pack
thật đầu tiên của blueprint HSK3. Một lesson hồ sơ/giao dịch có 20 nghĩa Việt
AI-assisted, một graded reading và một graded listening gồm 16 dòng
Hanzi–Pinyin–Việt. Cả 20 từ blueprint xuất hiện trong hai đoạn; pack thêm 60
vocabulary item, 10 câu hiểu ý chính/chi tiết/trình tự/quy chiếu/suy luận đơn,
hai note grid và hai bài tóm tắt/kể lại, tổng 74 practice item.

Chạy `content:hsk3:personal-paragraph -- --write` để tái tạo; `--check` và
`content:hsk3:personal-paragraph:validate` khóa source hash, exact lesson
vocabulary, sự hiện diện của từ trong đoạn, đáp án/options và review batch.
Hai mươi listening-selection, năm câu hiểu nghe, một note grid nghe và một bài
kể lại tạo 27 item phụ thuộc audio; audio vẫn `null`, browser TTS chỉ preview.
Pack source-exposed không dùng để calibrate assessment; human review, rubric,
measurement, mastery và release đều bằng 0.

`content/drafts/hsk3-personal-paragraph-domain-2026.07.json` hoàn thiện bốn
lesson đời sống cá nhân còn lại: ăn uống–mua sắm, đi lại, sức khỏe và gia
đình–nơi ở. Artifact bind exact hash của pack lesson đầu, blueprint và
vocabulary source. Bốn lesson thêm 80 nghĩa Việt, 8 đoạn/64 dòng, 240
vocabulary item, 40 câu hiểu đoạn, 8 note grid và 8 bài tóm tắt/kể lại—296
practice item. Mọi vocabulary ID của từng lesson phải xuất hiện trong chính
hai đoạn của lesson đó.

Khi cộng pack đầu, miền đời sống cá nhân có đủ 5/5 paragraph lesson, 100
vocabulary draft, 10 đoạn/80 dòng và 370 practice item. Có 135 item phụ thuộc
audio nhưng 0 audio được review. Chạy `content:hsk3:personal-domain -- --write`
để tái tạo; `--check` và `content:hsk3:personal-domain:validate` bắt exact
partition, text coverage, practice answer/options, duplicate ID, prior-pack
hash và bốn review batch. Hoàn thành authoring draft của một domain không tự
hoàn thành HSK3 hoặc cấp mastery.

`content/drafts/hsk3-study-work-paragraph-domain-2026.07.json` là domain
paragraph thứ hai, gồm đủ 5 lesson môn học–phương pháp, môi trường trường học,
quy trình văn phòng, phối hợp đồng nghiệp và kinh nghiệm nghề nghiệp. Artifact
exact-partition 107 vocabulary blueprint thành 10 graded text/80 dòng, 321
vocabulary item, 50 câu hiểu đoạn, 10 note grid và 10 bài tóm tắt/kể lại—391
practice item. Khi cộng domain đời sống cá nhân, HSK3 hiện có 2/5 paragraph
domain, 10/25 paragraph lesson, 207 vocabulary draft, 20 text/160 dòng và 761
practice item.

Logic dựng và validation dùng chung nằm ở
`scripts/content/hsk3-paragraph-domain-builder.mjs` và
`src/content/hsk3ParagraphDomainPack.mjs`; các domain tiếp theo phải dùng cùng
contract thay vì sao chép validator. Chạy
`content:hsk3:study-work-domain -- --write` để tái tạo; `--check` và
`content:hsk3:study-work-domain:validate` khóa source/prerequisite hash, exact
vocabulary partition, text coverage, đáp án/options, ID và năm review batch.
142 item mới phụ thuộc audio vẫn có audio `null`; review, approval,
measurement, mastery, learner visibility và release eligibility đều bằng 0.

`content/drafts/hsk3-nature-environment-paragraph-domain-2026.07.json` hoàn
thiện domain paragraph thứ ba: khí hậu–mùa, động thực vật, cảnh quan–phương
hướng, hiện trạng môi trường và giải pháp bảo vệ. Năm lesson exact-partition
100 vocabulary blueprint thành 10 graded text/80 dòng, 300 vocabulary item,
50 câu hiểu đoạn, 10 note grid và 10 bài tóm tắt/kể lại—370 practice item.
Chạy `content:hsk3:nature-environment-domain -- --write` để tái tạo; `--check`
và `content:hsk3:nature-environment-domain:validate` giữ cùng contract
source/prerequisite/text/practice/review fail-closed.

Ba domain cộng dồn có 15/25 paragraph lesson, 307 vocabulary draft, 30
text/240 dòng và 1.131 practice item. 412 item phụ thuộc audio vẫn silent, 15
review batch có 0 approval; không artifact nào được learner-visible hoặc dùng
cho measurement/mastery/release trước human review.

`content/drafts/hsk3-society-arts-sports-paragraph-domain-2026.07.json` là
domain paragraph thứ tư, gồm đời sống hiện đại, phát triển đô thị, hoạt động
văn nghệ, giới thiệu thể thao và báo cáo thi đấu. Năm lesson exact-partition
96 vocabulary blueprint thành 10 graded text/80 dòng, 288 vocabulary item,
50 câu hiểu đoạn, 10 note grid và 10 bài tóm tắt/kể lại—358 practice item.
Chạy `content:hsk3:society-arts-sports-domain -- --write` để tái tạo; `--check`
và `content:hsk3:society-arts-sports-domain:validate` áp cùng source,
prerequisite, text coverage và fail-closed review contract.

Bốn domain cộng dồn có 20/25 paragraph lesson, 403 vocabulary draft, 40
text/320 dòng và 1.489 practice item. 543 item phụ thuộc audio vẫn silent,
20 review batch có 0 approval và không item nào đủ điều kiện measurement,
mastery, learner visibility hay release.

`content/drafts/hsk3-culture-tradition-paragraph-domain-2026.07.json` đóng
domain paragraph HSK3 thứ năm bằng 5 lesson về ẩm thực vùng miền, phép lịch sự
bàn ăn, lễ hội, so sánh vùng và giao tiếp liên văn hóa. Pack exact-partition
97 vocabulary blueprint thành 10 graded text/80 dòng, 291 vocabulary item, 50
câu hiểu đoạn, 10 note grid và 10 bài tóm tắt/kể lại, tổng 361 practice item.
Các đoạn so sánh văn hóa yêu cầu nêu nguồn, giới hạn và sự đa dạng nội vùng
thay vì biến một ví dụ thành quy tắc tuyệt đối.

Chạy `content:hsk3:culture-tradition-domain -- --write` để tái tạo; `--check`
và `content:hsk3:culture-tradition-domain:validate` khóa exact source,
prerequisite, text coverage và fail-closed review contract.

Năm domain cộng dồn đóng đúng 25/25 paragraph-input lesson và toàn bộ 500
vocabulary HSK3: 50 text/400 dòng cùng 1.850 practice item. 675 item phụ thuộc
audio vẫn silent, 25 review batch có 0 approval và toàn bộ pack còn
learner-hidden, measurement/mastery/release-ineligible. Đây là authoring
coverage của mạch paragraph, không phải claim HSK3 đã review hay hoàn thành.

`content/drafts/hsk3-reference-quantity-narration-grammar-2026.07.json` là
module narration/grammar HSK3 đầu tiên. Ba lesson exact-partition 21 grammar
row về quy chiếu, lượng từ, cụm từ và dựng câu thành 21 giải thích có giới hạn
dùng, 21 ví dụ, 21 cặp sửa lỗi, ba đoạn tường thuật mẫu/18 dòng và 45 practice
item: 21 grammar-in-paragraph, 21 discourse-error-correction và ba bài kể lại
có thứ tự.

Chạy `content:hsk3:reference-quantity-narration -- --write` để tái tạo;
`--check` và `content:hsk3:reference-quantity-narration:validate` khóa exact
official row, blueprint, prerequisite và item partition. Grammar-writing và
speaking-retelling được giữ thành hai loại evidence; bài tự sửa hoặc tự thu
không cấp mastery. Ba review batch có 0 approval và pack vẫn learner-hidden.
Theo blueprint, recognition character không nằm trong 15 narration/grammar
lesson mà được exact-partition riêng ở 15 guided-production lesson.

`content/drafts/hsk3-modality-time-narration-grammar-2026.07.json` là module
narration/grammar thứ hai với ba lesson về nhu cầu–lời khuyên sức khỏe, thời
điểm–góc nhìn trong học tập và thái độ–tần suất trong chuyện gia đình. Pack
exact-partition 27 grammar row thành 27 giải thích có giới hạn dùng, ví dụ và
cặp sửa lỗi, ba tường thuật mẫu/18 dòng cùng 57 practice item.

Chạy `content:hsk3:modality-time-narration -- --write` để tái tạo; `--check`
và `content:hsk3:modality-time-narration:validate` áp contract dùng chung.
Hai module cộng dồn đạt 6/15 narration lesson, 48/96 grammar row, sáu tường
thuật/36 dòng và 102 practice item; sáu batch có 0 approval và không item nào
đủ điều kiện measurement, mastery, learner visibility hay release.

`content/drafts/hsk1-personal-exchange-2026.07.json` là content pack đầu tiên
được sinh từ scope: 107 nghĩa Việt AI-assisted draft, 9 lesson blueprint, 38
lượt hội thoại mẫu và exact blueprint mapping cho 2 task, 5 topic, 107
vocabulary, 32 grammar row. Mỗi lesson có prerequisite và objective riêng.
Mỗi một trong 107 lexeme có ba practice item draft: meaning recall, pinyin
recognition và listening selection, tổng 321 item.

Pack gắn exact scope/dictionary-draft digest, giữ source-line provenance và
CC BY-SA 4.0. Native Mandarin review, Vietnamese editorial review, assessment
review và dialogue-pinyin review đều `pending`. Chín review batch bind exact
item list theo lesson, chưa có approval. TTS được ghi rõ là synthetic; mọi item
measurement/mastery-ineligible, pack learner-hidden và không release-eligible.

## Knowledge item

### Lexeme

- Simplified, traditional, pinyin số và pinyin dấu.
- Các sense riêng, từ loại, register, classifier.
- Frequency, HSK level, domain và region.
- Collocation, từ gần nghĩa/trái nghĩa, từ dễ nhầm.
- Audio nam/nữ/ngữ cảnh; nguồn và license.

### Character

- Unicode, radical, stroke count, components.
- Phonetic/semantic component và etymology đã biên tập.
- Simplified/traditional relation.
- Stroke data và danh sách chữ gần hình.

### Grammar pattern

- Form, function, constraints và common errors.
- Ví dụ dương/âm, minimal pairs và prerequisites.
- Mapping tới can-do statement và assessment items.

## Lesson schema

```text
Lesson
  objective
  prerequisites[]
  knowledgeItems[]
  presentationBlocks[]
  activities[]
  masteryCheck
  remediationMap
  contentVersion
```

Mỗi activity định nghĩa prompt, modality, accepted answers, scoring rubric, hint ladder, explanation, error tags và accessibility alternative.

## Lộ trình từ số 0

1. **Bootcamp âm thanh**: pinyin, initials/finals, bốn thanh, tone pairs.
2. **Sinh tồn A0**: chào hỏi, danh tính, số, thời gian, mua đồ, chỉ đường.
3. **Nền Hán tự**: nét, bộ thủ có ích, cấu kiện và chữ tần suất cao.
4. **Sơ cấp**: câu trần thuật/hỏi/phủ định, lượng từ, aspect cơ bản.
5. **Trung cấp**: complement, ba-construction, bị động, liên kết diễn ngôn.
6. **Cao cấp**: register, thành ngữ, văn bản học thuật/chuyên môn, mediation.

## Quy trình biên tập

1. Curriculum designer tạo objective và blueprint.
2. Linguist tạo/duyệt language content.
3. Native speaker thu audio theo script version.
4. Editor tạo descriptor bind exact payload và source: audio bind
   transcript/speaker/rights; character bind linguistic record và stroke
   dataset. Importer kiểm bytes rồi tạo candidate mới.
5. Reviewer bản ngữ và reviewer quyền audio duyệt exact manifest/catalog scope.
6. Assessment editor kiểm tra distractor và rubric.
7. QA kiểm tra locale, accessibility và thiết bị.
8. Pilot cohort; phân tích item rồi mới general release.

## Chất lượng

- Không dịch từng chữ khi nghĩa ngữ dụng khác.
- Không dùng pinyin thiếu tone trong nội dung dạy.
- Mọi câu có audio phải khớp text version.
- Giải thích lỗi phải nêu vì sao lựa chọn sai hấp dẫn.
- Cultural note phải có nguồn, ngày duyệt và phạm vi vùng miền.

# Tiến độ triển khai theo goal Thiên Lộ

## Journey đã phát hành và kiểm browser (13/09)

journey-1/2 đã phát hành local: tổng 27 bài authored. Review 15 và digest,
2 test/typecheck/ESLint, release backup/rehearsal/FK/fingerprint đạt.
Browser 2/2: learner route/payload/sơ đồ/bài điền/3 viewport/vào luyện và
Xưởng xem/lưu lại đạt; ảnh ngang đã xem. Mốc bản thảo dưới đây là lịch sử.

Audit nhóm chữ: 15 bài, 246 mục; 239 bind được âm bằng source syllable,
7 cần rà context (biến điệu 不, biến thể 谁, Erhua, 中国). Artifact
character-context-audit.json lưu từng ID; đây không phải bằng chứng 246
chữ đã được nâng cấp nội dung hoặc đạt mastery. Toàn goal còn hoạt động.

## Bản thảo đi lại–giải trí và phát hiện ở bài chữ

journey-1/2 có 21 trang nguyên bản, sơ đồ điểm nhìn/phương tiện và hoạt
động, bài điền/phản hồi/vận dụng. Schema và test giữ ID/prerequisite đạt;
typecheck/ESLint đạt. Chưa review digest và chưa phát hành: tổng bài đã
phát hành vẫn là 25. Lượt tiếp theo rà/phát hành cùng mốc bài chữ phù hợp.

Audit characters-1 cho thấy trường pinyin của chữ có thể chứa âm cả từ:
常=fēicháng, 床=qǐchuáng, 电=dǎ diànhuà. LessonDepthPanel đang hiện trực
tiếp trường này dưới chữ, gây hiểu nhầm. Cần giải quyết âm theo ngữ cảnh
và tách nhãn chữ/từ trước khi materialize nhóm chữ; không cắt chuỗi Pinyin
tùy ý vì neutral tone/đa âm/Erhua cần mapping được kiểm. Đây là phát hiện
đã sửa tại LessonDepthPanel bằng mapping âm tiết từ vocabulary chính xác
theo context, có nhãn âm trong từ/âm cả từ. Erhua và context không khớp
không đoán. 3 test mapping/fallback/render thật đạt, typecheck đạt. Chưa
audit đủ mọi consumer và browser riêng; không coi legacy character rich
đã đúng chỉ vì schema hợp lệ hoặc một component đã được sửa.

## Lô đời sống và thời gian–địa điểm (13/09)

Đã phát hành local 10 bài: daily-1…4 và hsk1-time-place-events-01…06.
Tổng 25 bài authored local; 111 trang mới và 10 sơ đồ nội dung riêng,
135 liên kết từ giữ nguyên. Xưởng dùng cùng payload/renderer. Review 14
ghi nội dung và giới hạn; chưa là USER-ACCEPTED hay tuyên bố hoàn tất HSK.

Builder và registry nay dùng chung cho nhiều lô. Test kiểm không đổi digest
lô survival trước; schema/projection/ID và dữ kiện số của lô mới đạt, cùng
typecheck/ESLint. Import/release rehearsal/backup/FK/fingerprint đạt.
Browser lô mới 2/2 đạt: đủ route/payload/sơ đồ, phản hồi, ba viewport,
vào luyện, Xưởng xem/lưu lại. Release rehearsal lại completed:0.
HSK1 còn 15 bài chữ và 2 bài journey chưa soạn
trang riêng; các cấp khác cùng phần tích hợp vẫn còn theo scope đã chốt.

## Lô survival-1 đến survival-9 đã phát hành local (13/09)

Đã nhập và phát hành chín bài trong một transaction mỗi bước, có backup và
rehearsal. Tổng 15 bài authored local, chưa hoàn thành 217 bài nền. Lô mới
có 89 trang, 107 liên kết từ, chín bộ lựa chọn/phản hồi, chín bài điền và
chín nhiệm vụ vận dụng riêng. Review 13 ghi phạm vi và giới hạn, không gọi
trang tự luyện là evidence mastery hoặc tuyên bố phủ đủ HSK từ số bài.

Typecheck/ESLint và 2 test schema/ID/digest đạt. Browser kiểm runtime chính
xác toàn lô, mở chín route, thử điền sai→đúng, ba viewport và vào Thử Luyện
đạt. Browser Xưởng đủ trang/xem trước/lưu lại đạt; tổng 2/2 hành trình.
Những phần nội dung cấp cao, ảnh riêng từng
bài, học–luyện–kết quả và liên thông evidence vẫn còn trong goal.

## Điều chỉnh cách thực hiện theo yêu cầu làm gấp (13/09)

Người dùng yêu cầu tăng tốc, không tiếp tục một bài/một vòng phát hành. Lô
nội dung kế tiếp là survival-1 đến survival-9: chín bài giao tiếp cá nhân,
107 liên kết từ theo inventory hiện hành (không coi là 107 từ duy nhất).
Biên soạn cùng lượt theo mục tiêu riêng từng bài, dùng chung công cụ xuất
payload, validator và kiểm tra review/ID. Phát hành theo lô có rehearsal và
backup; browser kiểm các loại tương tác và mọi route/payload trong lô, không
lặp lại toàn bộ thao tác Xưởng cho từng bài khi renderer không đổi.

Giữ yêu cầu nội dung riêng/đáp án đúng/vận dụng khác ngữ cảnh, không lấy việc
đổi màu hoặc chuyển rich legacy thành trang làm bằng chứng biên soạn xong.
Sau lô giao tiếp là nhóm sinh hoạt/di chuyển, rồi các nhóm cấp cao và chữ.
Các yêu cầu tích hợp/kết quả/media vẫn còn trong phạm vi đã chốt, không bỏ.

Mốc kho học liệu: API/repository có tìm tên/chú thích/nguồn, lọc ảnh/audio và
cursor tải tiếp ổn định theo thời gian+ID; Xưởng có tìm và tải thêm. Test105
tệp cùng timestamp lấy đủ không trùng, tìm tệp cũ và lọc loại đạt. Browser
UI tìm/tải thêm chưa kiểm; chưa gọi toàn media manager hoàn tất.

Mốc professional-4 (13/09): tám trang đã published local; review12/digest,
2unit, typecheck/ESLint, browser Studio và learner3viewport→practice đạt.
Hai lịch có thông tin khác, timeline và phản hồi nguyên bản;7word IDs và
prerequisite professional-3 giữ nguyên. Import/release backup/rehearsal/FK/
fingerprint đạt; ảnh375 đã xem. Tổng6bài authored local đã kiểm, trong đó
professional-1→2→3→4 là chuỗi liên tiếp. Toàn scope217và tích hợp vẫn còn.

Mốc13/09: professional-2 (8trang) và professional-3 (9trang) đã published local
và browser learner/Studio đạt. Review10/11 + digest khóa đúng nội dung. Cả hai
có sơ đồ, mẫu, phản hồi, đáp án thay thế và vận dụng riêng; giữ word IDs và
chuỗi prerequisite professional-1→2→3. Bản3 chia12từ thành hai phần với luyện
giữa bài. Import/release backup/rehearsal/FK/fingerprint đạt;2unit mỗi bài,
typecheck/ESLint;3viewport→Thử Luyện và Studio đủ trang/lưu lại đạt. Ảnh đã xem.
Tổng5bài authored published/kiểm local, không phải toàn217. Nền inventory giữ
nguyên, overlay không tự thay coverage/mastery. Web đã bật lại sau dev dừng.

Mốc boot-2 (12/09): tám trang published local, review09 và JSON digest;
Xưởng đủ trang/đáp án/sai→đúng/lưu lại/mobile đạt. Learner nhận đúng payload,
3viewport và vào Thử Luyện đạt; ảnh375 đã xem. Sửa điều kiện legacy HSK0 để
cho dùng trang authored đã phát hành; HSK0 khác chưa có trang vẫn giữ nền.
Import/release backup/rehearsal/fingerprint/FK đạt;2unit/typecheck/ESLint đạt.
Hiện ba bài nâng cấp published local, giữ toàn phạm vi217bài và phần tích hợp
còn lại. Không nhầm overlay1bài HSK0 với thay inventory nền rich0/4.

Mốc mới nhất: mẫu HSK3 tám trang đã published local và browser đạt ngày12/09.
Review tại 08-REVIEW-HSK3-TIMELINE.md và JSON digest tương ứng. Rehearsal/apply
giữ35bảng, backup/FK đạt. API trả đúng trang; browser giữ khóa khi chưa có
bằng chứng và mở cho guest fixture có đủ evidence, kiểm3viewport/ghi chú/
tra từ/vào Thử Luyện. Header ngang thu gọn, selector trang vẫn có; ảnh đã xem.
Hiện hai bài nâng cấp published local, không phải toàn217bài. Các mốc cũ phía
dưới phản ánh trình tự thực hiện và được thay trạng thái bởi mốc này.

Người dùng yêu cầu tiếp tục đến hoàn tất và đã bật goal ngày 12/09/2026.
Hồ sơ 0.2 là phạm vi; tài liệu này là mốc thực thi, không thu hẹp phạm vi hoặc
thay thế tiêu chí nghiệm thu. Không tự dừng sau một bước nền, không tự đánh dấu
USER-ACCEPTED. Không có trần số bài; thêm theo audit độ rộng/độ sâu.

## Đã triển khai, cần giữ regression

- Reader Ngọc Điện và Xưởng dùng chung schema trang; năm bố cục và năm ảnh chủ
  đề (chưa phải minh họa riêng toàn kho), header/CTA nằm trong viewport.
- Snapshot lĩnh hội theo owner/reset, trang/câu nháp/trợ giúp, chuyển sang nội
  dung cập nhật có giữ riêng nháp cũ; không cấp mastery từ tự đối chiếu.
- Khối activity mới: choice, order, cloze, rubric; editor nhập đáp án, phản hồi
  theo lựa chọn, đáp án thay thế cho cloze, tiêu chí câu mở và gợi ý. Lưu nháp
  thiếu nội dung được; validation phát hành vẫn chặn thiếu đáp án/giải thích.
- Test source/release giữ payload activity; browser đã tạo/thử sai–đúng/lưu
  nháp còn dở/mở lại. Có bản nháp kiểm thử local, chưa phát hành cho learner.
- Audit chính xác ID nguồn đủ grammar/task/topic/character. Chưa chứng minh
  độ sâu sư phạm; chưa audit đủ từ vựng, HSK0 và mọi revision D1.

## Thứ tự tiếp tục (không phải checklist đã hoàn tất)

1. Media manager ảnh/audio: upload/chọn/thay, metadata/rights/transcript/focal
   point, preview, nơi sử dụng; bảo vệ asset đang dùng. Schema + repo + routes
   + UI + test; tận dụng D1 local hiện có, không thêm dịch vụ hoặc plugin.
2. Registry còn thiếu: reading/notes, sơ đồ/bản đồ/timeline, âm, kết quả,
   module links; editor nhân bản/sắp xếp/focus/mobile preview và parity.
3. Audit + soạn mẫu đại diện bằng dữ liệu thật. Chọn ID từ inventory, xác định
   mục tiêu/tiên quyết/từ–chữ–grammar/task/loại hoạt động; mẫu sáu trang campus
   chỉ là một bài. Làm rõ HSK0 và hoạt động dài HSK3–4.
4. Biên soạn/rà từng bài nền theo lô. Hồ sơ mỗi bài ghi dàn trang có lý do,
   ngữ liệu/đáp án/feedback/transfer, visual brief và năm pass AI-assisted
   (humanReviewed false). Thêm bài khi có thiếu độ rộng/độ sâu thực tế.
5. Nối kết quả đúng loại vào các consumer hiện có: nguồn từ/chữ, ôn, lỗi, âm,
   đọc, thống kê; attempt có revision, assistance, timestamp, stable item ID.
   Hiện activity mới chỉ feedback và nháp, chưa cấp evidence/mastery.
6. Phát hành local từng lô qua Xưởng có backup/rollback, giữ tiến độ và ID;
   giải quyết stale review HSK1 và chạy full gate/journey toàn module.
7. Kiểm toàn inventory, UI/persistence/links, kết quả/học tiếp, tài liệu bàn
   giao; báo đầy đủ tồn đọng nếu còn. Chỉ complete goal khi triển khai đạt đủ
   phạm vi và gate, không chỉ framework hoặc số lượng lesson.

## Lưu ý kỹ thuật cho bước media

Mốc thực thi mới: migration 0024 đã áp dụng local, `LessonMediaRepository`,
`/api/content/media` và `/api/content/media/[file]`, `LessonMediaPicker` đã nối
khối ảnh/audio. Browser upload ảnh/private access/Range/save/delete-in-use đạt.
Còn pagination/search, audio browser, existence validation tại publish và
local-release bài có media; chưa coi mục 1 hoàn tất. Những mô tả "chưa có"
bên dưới là hiện trạng trước mốc này.

- Runtime Vinext/Cloudflare có D1 local, chưa có media/R2/upload endpoint.
- Authorize theo `contentStudioHttp`; mutation cần same-origin và body bound.
- Published assets phải liên hệ immutable release packages; draft assets chỉ
  biên tập viên xem. Không dùng quyền truy cập bản nháp làm quyền public.
- Có `content_revisions`, `content_release_packages`, `content_release_heads`;
  dùng tham chiếu để ngăn xóa asset còn được nội dung sử dụng.
- Không sửa/xóa `.wrangler`, `docs/reports`, `output`; migration mới bảo toàn
  dữ liệu và phù hợp `db/schema.ts` + Drizzle journal.

## Mốc sơ đồ và bản nháp đầu tiên (12/09)

Registry sơ đồ đối chiếu/chuỗi/timeline/map có editor và reader chung. Nhân bản
trang/khối giữ nội dung nhưng tạo khóa riêng và remap đáp án. professional-1
có 8 trang/26 khối biên soạn riêng trong content/drafts/thien-lo-professional-1-v2.json,
chưa publish. Browser kiểm đủ trang, đáp án, nhân bản/sắp xếp/lưu lại/mobile đạt;
8 unit test, ESLint/typecheck đạt. Còn review/ngữ liệu/tiên quyết, đầy đủ payload
phát hành và phát hành local, sau đó các mẫu và kho còn lại theo phạm vi 0.2.

Bổ sung sau audit: professional-1 hiện 26 khối; có scaffold 学校/学生/上学 và
学习/汉语 (hai từ sau chưa ở chuỗi 25 bài tiên quyết). Payload studioContent
đầy đủ đã tạo và browser lưu/mở được. Các cờ năm pass vẫn false, chưa publish.
Phát hiện preview legacy LessonDepthPanel thiếu client boundary, gây lỗi SSR
khi draft có hội thoại; đã sửa. StudioContentPreview dùng LessonPageReader khi
có lessonPages, giữ title revision. Browser toàn hành trình bản đầy đủ đạt;
cần regression legacy preview và local publication sau review.

Canonical draft đã nhập local qua scripts/demo/import-authored-thien-lo.mjs
(stableKey thien-lo-v2-professional-1). Rehearsal rollback và apply đều inserted=1,
36 bảng được fingerprint giữ nguyên, foreign keys đạt; backup trước apply.
Import chạy lần hai trong cùng transaction không tạo trùng. Chặn nếu bản hiện
có khác manuscript để không ghi đè sửa của editor. Vẫn unpublished, review false.

## Phát hành mẫu local đã kiểm (12/09)

professional-1 đã published local, 8 trang/26 khối. Review digest và hồ sơ 07
khóa đúng manuscript; release script chặn stale và không ghi đè bản editor.
Rehearsal/apply/idempotent repeat đạt; 35 bảng bảo vệ giữ nguyên, có backup.
Browser learner đủ8 trang, sơ đồ,3viewport, dictionary link và vào Thử Luyện đạt.
9 test review/projection/copy và typecheck đạt. Mốc này thay trạng thái chưa
publish của các ghi chú cũ phía trên, không thay hiện trạng toàn kho còn thiếu.

## Mốc đọc và ghi chú HSK3 (12/09)

Khối reading/editor/reader/snapshot/clone đã hỗ trợ văn bản trọn đoạn, mở
Pinyin/nghĩa, chọn bằng chứng và ghi chú. Bản nháp thien-lo-hsk3-timeline-v2.json
5 trang, chưa release; thiếu task ngữ liệu mới, review, audit từ đích và
payload đầy đủ. Browser biên tập/preview/lưu lại/mobile đạt;9unit và typecheck
đạt. Chọn bằng chứng ở đây là tự ghi chú, không phải điểm đọc khách quan.

Bản nháp HSK3 mở rộng lên8trang: thêm văn bản trồng cây gồm4đoạn đảo vị trí,
hoạt động xếp lại và rubric giải thích điểm nối/không nhầm dự định với sự kiện,
trang recap. Đã có ngữ liệu chuyển giao khác văn bản mẫu; schema test đạt.
Còn review hai văn bản, audit từ đích, payload canonical và local release.

Mốc regression tải chậm: sourceStatus từ guest/account ngăn update snapshot
bản nền trước khi manifest ready. Browser giữ request runtime chứng minh nút
cập nhật chưa xuất hiện, sau tải thì khôi phục rồi chuyển đúng bản phát hành.
Blocker HSK1 stale được giải bằng audit upstream không diff + check/validator;
chỉ2digest level review đổi, core không đổi; level/package check đạt.

## Gate nguồn local đã đạt (12/09)

content:local-study:validate exit0 sau xử lý CRLF và chuỗi digest kế thừa.
Ba file profile/package LF khôi phục đúng SHA đã lưu, không đổi nội dung gói.
Refresh metadata guard chỉ cho phép leafsha256 thay đổi; core/ngữ liệu/đáp án
không đổi. .gitattributes bảo vệ LF của content JSON và profile local.
Đây là consistency gate kho hiện hành, không thay kiểm sư phạm từng bài mới
và không chứng minh full npm run check hoặc scope0.2 hoàn tất.

## Liên kết câu mẫu và bản nháp HSK3 đầy đủ (12/09)

- Grammar trong Xưởng có câu mẫu và bài luyện gắn trực tiếp từng điểm; parser,
  preview và reader không còn ghép theo vị trí hội thoại/bài tập. Bản legacy
  chưa có ví dụ giữ trạng thái thiếu, không sinh câu không liên quan.
- Browser phát hiện nhập trước hydration làm mất giá trị; toàn biểu mẫu nay
  inert và nút lưu disabled cho tới khi khởi tạo. Kiểm POST, lưu/mở lại và
  preview câu mẫu độc lập đạt. 15 unit liên quan, typecheck và ESLint đạt.
- Bản HSK3 tám trang đã có studioContent đầy đủ, hai điểm ngữ pháp có ví dụ/
  bài luyện riêng, ba câu tự kiểm có đáp án/giải thích. Canonical draft nhập
  local với stableKey thien-lo-v2-hsk3-cohesion-reconstruction-lesson-01.
  Rehearsal/apply inserted=1; idempotent trong transaction, backup, 36 bảng bảo
  vệ và foreign keys đạt. Chưa publish, năm cờ review false.
- Test payload HSK3 xác nhận chỉ còn lỗi review chặn phát hành, giữ ID/từ/
  prerequisite/kỹ năng. Browser bản đầy đủ: soạn ghi chú, preview văn bản,
  mở trợ giúp, chọn đoạn, mobile, lưu/mở lại đạt; cùng regression grammar 2/2.
- Audit đầu vào HSK3: 215 word IDs liên kết đều đã xuất hiện trong closure
  127 bài tiên quyết. Đây là liên kết nội dung cũ, không phải evidence người
  học biết 215 từ và không phải bài mới dạy đủ 215 từ. Cần rà ngữ liệu theo
  mục tiêu trình tự/đọc hiểu và phân biệt từ hỗ trợ trước khi review/release.
- Tiếp theo: review/phát hành mẫu HSK3, tiếp tục nội dung từng lô. Toàn kho
  vẫn mới một bài nâng cấp published local; goal chưa gần hoàn tất.

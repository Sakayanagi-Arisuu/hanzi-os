# T02 · writing journal / T16 recovery status · 21/10/2026

## Tiếp nối21/10 · mốc mới hơn các WIP bên dưới

- Resume mismatch đã sửa: Sảnh dùng journal.compatible; thông báo giữ phiên cũ,
  không mời vào runner từ chối. Browser localhost đổi hệ chữ→Sảnh→bắt đầu mới→
  structure qua. Writing-resume3file/21test, typecheckv39/lintv1 exit0; test
  IDB giữ nguyên các entry cũ khi bắt đầu version mới. Guest127.0.0.1 history17
  giữ sau mở lại.
- Fullv6 không còn process/log kết thúc ở lint không marker: exit chưa biết.
  Fullv7 **CHECK_EXIT0,532file/3433test**; typecheck/global lint/content/DB/
  restore42migration61table/build/Premium227JS192marker vắng đều qua.
  Assets1371.4KiB vượt advisory347.4KiB, provenance local/unattestable.
- D1 browser thật trên **compiledbuildv7**, không thay config/release policy:
  giữ session account cũ; writing cấu trúc→first wrong→reload giữ wrong→correct
  →paper self-review→keyboard alternative→context→result. Đợi acknowledge mới
  hiện Đã lưu5/5 và bật replay; reload vẫn5/5. Timeline writing12, SQL read-only
  khớp12history/11snapshot revision0–10; firstCorrect:false/latestCorrect:true
  attempts2, context đúng còn nguyên. Không reset/xóa dữ liệu test/debug cũ.
  Paper/keyboard được mô phỏng để kiểm self-report, không phải evidence viết tay.
- Source audit sau đó phát hiện useWritingJournal no-op guard làm bỏ support
  reveal/TTS/order-replay khi cursor không đổi. Đã sửa chỉ bỏ no-op assistance
  còn support có kind phải commit; thêm phase/index fence sau async digest.
  Targeted supportv1 4file/23test exit0. **Buildv7/browser D1 trên không gồm fix
  support này**; không dùng12history để tuyên bố mọi support đã lưu. Cần browser
  source cuối/compiled mới cho support.
- SW install vẫn hiện lỗi thật; projection/mistakes409 CONTENT_UNAVAILABLE
  vẫn giữ. Workspace có503 một lần rồi200/retry; chưa kết luận nguyên nhân503
  đã sửa. Không nâng humanReviewed hoặc bypass policy. D1 trước smoke đã backup
  tmp/personalization-d1/pre-v7-browser-2026-10-21.sqlite,63bảng/FK/integrity đạt.
- Bằng chứng: tmp/personalization-writing-account-v7-result.png;
  tmp/personalization-d1/writing-inspection-v2.json/v3.json. ProbeSQLv1 lỗi encode
  cp1252, giữ log fail; chạy python-Xutf8 v2/v3 exit0, không đổi DB để chữa log.


**IN-REVIEW**, chưa USER-ACCEPTED; không khép toàn T02 hoặc toàn kế hoạch.
Kế thừa T00/T01/lessons/review/continuous; chỉ audit source luyện chữ và consumer
bị tác động, không khảo sát lại inventory. Kết quả account dưới đây là smoke
giới hạn trên buildv5, không phải writing account-D1 source mới đã được kiểm.

## Source và transaction

- App.tsx dùng CharactersPage → CharacterForgeSessionPage. Lobby/legacy link
  khởi tạo primary trước navigate; runner không còn useEffect ghi đè localStorage.
- writingSession.ts giữ revision/CAS cùng primary activity.record + immutable
  history trong IDB transaction cũ; server WorkspaceRepository dùng business batch
  cũ, không request analytics. Snapshot nằm trong primary, không nhét JSON dài
  vào history details500ký tự. Không nới event validator.
- Snapshot giữ session ID mới cho replay, hanzis/phase/index/assistance/paper/
  needsReplay/updatedAt và first/latest choices. Source digest giữ content,
  descriptor/ID/ngữ cảnh và hệ chữ. Phiên khác source/version không tự nhận kết
  quả cũ. Session mới giữ actual released character ID + source lesson qua
  itemSources; record cũ thiếu mapping giữ hanzi-only, không sửa lịch sử cũ.
- First choice prediction/context là objective local-choice-comparison; correction
  là support, không thay câu sai đầu. Structure exposure; guided/paper/keyboard/
  recall là self-review, không biến lối bàn phím thành viết tay được chấm.
  Summary là session riêng, không tăng số đáp án hay thêm một lượt tự ôn.
- TTS chỉ synthetic/requested; reveal/order replay/stroke rescue commit support
  trước tác dụng. Lưu digest hình học thực khi có data và provenance NOTICE
  hanzi-writer-data@2.0.1/Arphic sẵn có; không đổi nguồn, stroke scorer hoặc license.
- Same-level assistance lúc hai tab mount là no-op/idempotent; phản hồi hỗ trợ
  không reset bàn nét. Phase key gồm session ID; callback advance kiểm cursor.
- Account pending chờ cả snapshot + practice observation ack, chưa journey receipt
  hoặc mở replay-complete. Server không LWW đè writing command đã có; history
  insert có source-change fence ngay trong batch. Conflicting branch không được
  acknowledge chỉ vì clock mới hơn; raw pending giữ lại. Chưa có UI giải xung
  đột đa thiết bị; không tự chọn một nhánh rồi gọi đã đồng bộ xong.
- Guest/owner/reset fence dùng scope IDB thật. Legacy owner-key chỉ được nhận
  qua thao tác tiếp tục rõ ràng ở epoch0; raw cũ không sửa. Global legacy không
  rõ owner không tự nhận. Adoption ghi thời điểm nhận hiện tại, old source/time
  unknown, không backfill câu trả lời. Legacy đã result không phát lại evidence/
  reward/journey. Không đổi stable IDs, XP/mastery/completion/FSRS/scoring.

## Lỗi tìm bằng browser và đã sửa

1. Hai tab mount guided cùng assistance từng gây CAS conflict vô ích. Same-level
   đã no-op và đồng nhất retry, conflict thật vẫn fail-closed.
2. StrokeOrderPractice reset canvas mỗi lần parent lưu assistance vì initial prop
   đổi. Freeze initial assistance theo mounted session/item/phase; thử trợ giúp
   thật chuyển nét1→2 và không quay về1 sau journal ack.
3. Normalizer legacy chỉ nhận stroke-quiz:word, loại nhầm character-forge evidence
   thật khi reload/reconcile. Thêm recognition đúng source/lesson/character được
   phát hành, chỉ unverified/null-score/non-mastery; unknown/fabricated không được
   nhận. Không đổi scoring adapter. Summary clock khôi phục chỉ từ event thật
   cùng identity, không tạo thời gian cũ; giữ immutable history. Browser trước
   sửa có lỗi cuối phiên, sau sửa reload báo Đã lưu5/5 và replay được bật.
4. Recovery banner fixed từng che nút Tổng quan account và click thành reload.
   RecoveryStatusBoundary portal vào slot in-flow giữa header/main; ResizeObserver
   trừ đúng chiều cao khỏi viewport phiên. Bootstrap chưa có shell vẫn in-flow.
   Thông báo tối đa30dvh/180px và tự cuộn, không dời overlay sang che footer.

## Bằng chứng và gate

- Banner target3file/13test, scoped lint exit0; writingv1 2file/7test;
  v3/v4 7file/26test; v5 8file/33test; v6 8file/34test; v7 8file/35test pass.
  Overlap không cộng. V2 đã fail1 do snapshot dài; sửa primary/history separation,
  không thay kết quả fail thành pass. Lintv1 fail3hook warnings đã sửa;
  typecheckv32 fail nullable đã sửa; v33–36 pass tại source tương ứng.
- Resultv1 5file/93test pass sau normalizer fix, trước helper recovery/ID mapping.
  Resultv2 **8file/99test**, resultv3 **10file/109test exit0**; typecheckv37/v38,
  lintv19/v20 còn phải đọc exit mới nhất.
  Fullv5 527file/3409test exit0 là source trước slice này; không thay full gate
  cuối. Fullv6 đang chạy session71024, source đứng yên; chưa ghi pass.
- Guest browser4325 dùng runtime/IDB thật, API guest/503: structure→first wrong→
  reload vẫn wrong→correction không sửa first→tab hai cùng cursor→guided được
  truyền sang tab cũ→stroke rescue→paper self-report→recall reveal/TTS→keyboard
  alternative→context→result→summary recovery/reload→Profile filter writing17
  activities. First objective sai và objective văn cảnh đúng đều còn, hai
  self-review tách support/session; không giả đây là independent recall.
  Còn phải xác nhận count sau reload/filter lần cuối. Một số support được tạo
  trong lúc phát hiện lỗi trước sửa vẫn giữ nguyên, không xóa để đẹp số.
- 375×667, banner fixture thật97px từ y56→153; CTA top536.5/bottom590.5/h54,
  trên nav bottom66, không horizontal overflow. Desktop1280×720 banner91px
  y88→179, main kết thúc720, CTA bottom709.5/h54. Đã reset viewport. Banner
  trigger là fixture, không giả đây là SW install failure đã sửa.
- Ảnh: tmp/personalization-writing-banner-mobile-2026-10-21.png;
  tmp/personalization-writing-history-2026-10-21.png. Temporary preview harness
  chỉ thêm boundary/status fixture theo query, không xóa browser progress.

## D1 thật cô lập và giới hạn

Compiled Worker **buildv5** ở4327, migrations42 trong
tmp/personalization-d1/state, không dùng .wrangler của người học. Password/session
và learner test thật, không auth/receipt stub. Onboarding20phút→save10phút→reload
giữ10; account history có đúng2preference khác clock +1access unknown-time, SQL
read-only đối chiếu20→10. History endpoints200 không có nghĩa đã phát sinh lesson/
review records. GET projection browser thật trả409
LEARNING_PROJECTION_CONTENT_UNAVAILABLE: package chưa released cho projection.
Không bypass policy hoặc nâng humanReviewed để làm E2E xanh.

SW install error trên harness còn mở; Vite isolated Worker runner từng exit1,
không ghi đã sửa. Writing server batch/CAS hiện là SQLite fixture, chưa browser
D1 source mới. Android/device/PWA cold start, CTA rich cũ,100000events, full-device
restore, A02 media binding và pilot audio/policy/recall/cohort vẫn còn giới hạn.
Stroke paths đang vẽ, layer đã xem, playback-ended và lựa chọn escape chưa bấm
CTA chưa được resume đầy đủ; không giả thành phase đã hoàn tất. Dynamic authoring/
Premium character aggregate ngoài static released inventory cần kiểm adapter,
primary workspace giữ source thật nhưng không tự cho normalizer nhận mọi ID.

## Điểm tiếp

Đọc exit typecheckv38/lintv20/fullv6; continuous110binding overlay279file/0drift
đã exit0, baseline không sửa. Hoàn tất browser count/reload. Sau đó
tiếp T04/T05 hoặc blocker độc lập theo ledger, không dừng chỉ vì xong slice.
Giữ T00/T01/T02 tất cả IN-REVIEW. Không sửa docs/reports/output/.wrangler;
không commit/deploy/APK, không tự nghiệm thu hoặc claim hiệu quả học thật.

# Liên kết module web và Android · 17/10/2026

**Trạng thái: IN-REVIEW.** Rà soát theo producer → nơi lưu → consumer;
không suy ra phần trăm hoàn thiện hay chứng nhận “hoàn hảo tuyệt đối”.
Các thay đổi dưới đây ở source local, chưa deploy hoặc phát hành APK.

## Những lỗi đã sửa trong lát cắt lỗi sai và đồng bộ

1. **Hoạt động trong trang Thiên Lộ chưa tới Nghịch Cảnh Lục.**
   `lesson_page_attempts` trước đây chỉ có consumer analytics/coverage; queue
   chỉ đọc `learning_attempts`. Queue mới đọc câu sai đã chấm theo owner/reset,
   khôi phục đúng revision đã phát hành và cho luyện lại. Guest đọc first attempt
   trong snapshot, kể cả bản được lưu trong lịch sử; câu trả lời hiện tại không
   ghi đè kết quả lần đầu. Rubric/tự đối chiếu không biến thành câu sai khách quan.
   Correction guest lưu riêng theo owner/reset/version; account dùng journal
   objective-attempt hiện có. Không cộng mastery/lesson completion.
2. **Truy vấn chỉ đọc 4.000 lượt đầu.** Bỏ giới hạn cắt ngầm khiến lỗi mới hoặc
   lượt hóa giải muộn biến mất. Regression có 4.001 lượt correction, kiểm cả
   owner khác và reset khác. Không thay stable ID.
3. **Chờ đồng bộ bị hiểu thành hết lỗi.** Giữ lỗi pending trong bản đồ và bộ đếm,
   tạm loại khỏi phiên trả lời mới, phân biệt activity version; không cấp receipt
   hoàn tất Ôn từ hàng đợi chưa xác nhận. Không đưa câu pending vào nút luyện lại.
   Làm mới queue khi trở lại trang/online, page-attempt hoặc journal lệnh học đổi.
   Snapshot offline không cấp receipt hoàn tất; lượt tải cũ không ghi đè state mới.
4. **Đổi cookie khi gửi lệnh.** Transport truyền owner đã capture, server kiểm
   trước khi resolve user/ghi DB ở lesson open/attempt/submit/abandon, review,
   assessment và reader. Mismatch có retryable=true để giữ journal của hồ sơ cũ.
   Header không chọn danh tính server. Đường không có header được giữ tương thích
   client cũ; cần cập nhật web/APK để dùng hàng rào mới.
5. **Guest/sync cắt lịch sử xuống 120 lỗi.** Bỏ việc cắt trong ghi lỗi và merge.
   Tăng bound kiểm định/import từ 2.000 lên 100.000 mục; đây là giới hạn kiểm input,
   không phải rolling window. Regression merge 150 lỗi của hai thiết bị và reload
   2.001 lỗi. Không thể hứa phục hồi các bản ghi đã bị phiên bản cũ xóa trước đó.
6. **Reader chapter và khảo nghiệm chưa vào queue chung.** Thêm journal luyện lại
   theo activity/version, owner/reset và correction độc lập. Reader giữ ngữ cảnh
   nguồn; khảo nghiệm local/level-check ghi sau khi trả lời, đề server chỉ lấy
   sau khi nộp. Endpoint practice-mistakes đọc lịch sử đúng owner/reset, kiểm
   item ID/version/position trong form; phiên đang thi không lộ answer key.
   Reader mới và khảo luyện đọc legacy guest đều có producer. Account nhập lại
   lịch sử khảo nghiệm/đề đã nộp; offline mock được nối khi server trả kết quả.
   Đây là luyện tập mô tả, không phải evidence verified/mastery. Phiên thi khác
   làm sai lại mở lỗi; tái mở cùng chương không xóa correction. Ghi journal có
   điều kiện trong transaction để tab cũ không ghi đè lỗi mới.
7. **Reader đồng bộ nguyên chương làm mất câu trả lời giữa thiết bị.** Bổ sung
   observation theo câu/version/timestamp; merge giữ hỗ trợ và dấu vết sai đầu,
   không trộn sang version chương mới. Giữ row cũ để tương thích. Lịch sử hỗ trợ
   append-only trên journal, nhưng chỉ đưa 500 mục mới nhất vào local display:
   trước đây 501 mục khiến parser trả về toàn bộ Reader progress rỗng.
8. **XP outage chặn các hàng đợi khác.** Các nhánh XP, đề offline và workspace
   được thử độc lập, giữ failure để retry. Không để một dịch vụ lỗi ngăn gửi vị trí
   đọc, từ lưu hoặc câu sai. Outbox cũ vẫn ở nguyên owner/reset.
   Journal workspace không hợp lệ/phiên bản chưa hỗ trợ giờ báo lỗi và giữ nguyên
   dữ liệu thay vì biến thành hàng đợi rỗng rồi ghi đè. Regression giữ raw record
   nguyên vẹn sau lần ghi bị từ chối.
9. **Số lỗi ở tổng quan/lộ trình thiếu nguồn.** Tổng hợp lỗi legacy, page snapshot,
   server queue và practice journal; không báo queue rỗng khi chưa đọc đủ hoặc còn
   lệnh học chờ. Ký Ức Trận không phát receipt Ôn từ grade chưa được xác nhận.
10. **Lộ trình không nhận hoàn tất từ giao diện luyện nói mới/Reader chapter.**
    Producer hoàn tất phiên giờ phát receipt Vận dụng gắn bài nguồn. Dictionary
    chỉ tính từ trong đúng bài của thử thách, xóa bộ đếm khi đổi bài/journey.
    Receipt chỉ điều phối hành trình, không nâng mastery.
11. **Luyện nói cắt log thưởng xuống 160.** Bỏ cutoff và giữ ID thưởng bài/nhiệm vụ
    khi ghi activity khác; tăng parser/import bound lên 100.000. Regression giữ
    2.001 reward và chặn phát lại thưởng cũ. Dữ liệu từng bị bản cũ cắt không tự
    khôi phục được chỉ bằng sửa này.
12. **Phiên UI có thể đi theo hồ sơ mới.** Learner app remount theo owner generation
    và reset epoch đọc từ IndexedDB, để hủy callback microphone và state phiên cũ;
    cache/resume bền giữ theo scope của chúng. Lỗi mạng không tự đổi scope.
13. **Reset Hồ sơ xóa nhầm dữ liệu chung/hồ sơ khác.** Thay xóa toàn bộ khóa
    `hanzi-os-*` và cache bằng dọn phiên chưa có epoch của đúng owner. Reader,
    workspace, outbox dùng reset epoch; giữ backup, dữ liệu owner khác và asset
    offline. Phát event reset để consumer bỏ snapshot cũ.
14. **Mở rộng workspace cần tương thích APK cũ.** Client mới gửi capability header;
    server chỉ trả prefix answer/practice cho client hiểu chúng. Client cũ vẫn
    nhận vị trí/từ lưu/bookmark; không xóa các bản ghi mới khỏi DB.
15. **Asset/launcher.** Sửa nền khảo nghiệm từ `.png` sang file `.webp` đang có.
    Gradle launchers Capacitor gọi `GradleWrapperMain` bằng classpath thay vì
    `-jar` với wrapper không có Main-Class; không đổi wrapper JAR/hash.
16. **Xuất cloud thiếu workspace.** Thêm `learner_workspace_entries`, giải mã
    `value_json` trong bản xuất riêng của owner; có regression câu sai practice.
    Bản xuất projection local được sửa lời nhắc để không nói đã sao lưu cả phiên
    chưa gửi/tiến độ Reader. Kho thiết bị gốc và các journal tiếp tục được giữ.

## Ma trận rà soát module

Mọi dòng vẫn **IN-REVIEW** trong lượt audit này. Test tự động không thay xác nhận
của người dùng; “có liên kết” không đồng nghĩa mọi hành trình đã được nghiệm thu.

| Module | Liên kết đã lần theo | Đánh giá và việc còn cần |
| --- | --- | --- |
| Onboarding / shell | Starting level → path; guest/account dùng learner runtime chung | Có gate và regression; cần kiểm đầy đủ điều hướng/back/resume trên Android thật |
| Thiên Lộ | Phiên thử luyện → attempts/evidence → progress/FSRS; trang học → page-attempt journal → Nghịch Cảnh | Đã sửa cầu nối trang học và lịch sử; chờ người dùng test bài thật |
| Nghịch Cảnh Lục | Lesson/legacy reader verified attempts; thêm page activities và snapshot guest | Lát cắt sửa chính; cần xác nhận bố cục và mức phù hợp của câu luyện lại |
| Ký Ức Trận | FSRS queue/grade → lịch ôn/projection | Rating account là `unverified`, không phải câu trả lời sai khách quan. Guest có dấu vết review; cần thống nhất trải nghiệm hỗ trợ quên thẻ giữa guest/account ở slice riêng |
| Vạn Quyển Các | Bookmark/vị trí/câu trả lời → reader progress → workspace sync; từ lõi lưu sang savedWords; lỗi → Nghịch Cảnh; hoàn tất → Vận dụng | Đã nối chapter và legacy guest vào practice queue, giữ version/ngữ cảnh; merge câu giữa thiết bị và >500 support event có regression. Lịch sử chapter trước sửa được nối khi mở lại đúng version; không dựng lại nguồn đã thay phiên bản |
| Tàng Tự Khố | Từ đã lưu → savedWords; liên kết bài/chữ; ID lõi và mục phát hành | Có consumer; mục chú giải ngoài lõi không tự được coi là FSRS card có nguồn. Cần test chọn/lưu/ôn bài thật |
| Thần Văn Lô | Chữ/từ trong bài → luyện chữ, stroke provenance và practice evidence | Không dùng điểm nét chữ làm mastery tự động; cần test IME/touch/escape hatch trên thiết bị |
| Vạn Âm Điện | Microphone/TTS/ASR → luyện và evidence có policy | Native bridge có test; chưa có microphone/TTS/permission test trên điện thoại. Transcript không phải điểm phát âm |
| Khảo Nghiệm / Khảo Luyện / đề | Form/version → attempts → result/history; offline mock → server chấm → weak skills/link bài gốc/Nghịch Cảnh | Đã nối local, level-check, server assessment đã nộp và mock. Read API mới khóa theo terminal state/owner/reset/form. Không biến clock thiết bị, điểm đề hoặc luyện lại thành mastery |
| Thiên Cơ Kính / tiến độ | Evidence/coverage/analytics/projection từ các nguồn học | Giữ phân biệt unique coverage, XP và mastery; page remediation luôn không đủ điều kiện mastery |
| Hồ sơ / backup / sync | Owner/reset/generation, outbox và workspace → export/restore/sync | Sửa mất lỗi, cookie race, queue starvation và reset xóa ngoài owner. Export learner state hiện chỉ xuất projection + số lệnh, chưa phải bản sao toàn bộ IndexedDB/Reader/commands; không dùng file đó để kết luận các journal chưa gửi đã có backup đầy đủ. Cloud export và D1 restore có phạm vi khác |
| Tài khoản / phân quyền | Phiên server → owner; RBAC API; lifecycle HANZI | Có regression hiện có; không gửi email, đổi role, xóa tài khoản hoặc cấu hình provider thật trong audit này |
| Biên Tập Viện / Admin | Revision/release package/head → lesson, dictionary, reader, assessment consumer | Gate tổng chạy test repository/route; chưa nghiệm thu lại toàn bộ author→review→publish trên D1 thật. Không coi audit cũ trong OPERATIONS_AUDIT là trạng thái hiện tại nếu chưa tái kiểm |
| Android / PWA | Cùng learner source; native HTTP giữ x-learning-*; app storage tách browser | capacitor:verify và native adapter tests qua. ADB không có thiết bị kết nối. Chưa test cài đè, microphone, document picker, background/reopen, quota trên máy thật |

## Sổ liên kết đã lần theo

Mỗi dòng là một ranh giới dữ liệu/tác vụ đã kiểm mã và regression liên quan.
“Đã nối/sửa” nói về source local; không đồng nghĩa đã deploy hay nghiệm thu thiết bị.

| Nơi phát sinh → nơi nhận | Dữ liệu/điều kiện đã đối chiếu | Kết quả |
| --- | --- | --- |
| Onboarding/Khảo Nghiệm → Thiên Lộ | startingLevel, placement baseline, owner, progress đã có | Giữ gate chống ghi đè tiến độ người học quay lại; placement safety/resume tests |
| Phiên Thiên Lộ → Thiên Lộ tiếp theo | submission, unique evidence, prerequisite, revision | Repository/projection/normalized lifecycle tests; completion không suy từ XP |
| Thiên Lộ → Ký Ức Trận | activation session đã nộp/qua, card version, due/revision | Review repository chỉ chấp nhận nguồn đã cấp; không dựng server card từ state client |
| Thiên Lộ → XP/streak | reward ID, server ledger, idempotency | Giữ ID thưởng khi ghi hoạt động nói; không trả thưởng lại do cắt log |
| Trang học → Nghịch Cảnh | first attempt, released revision, owner/reset | Đã sửa guest/account và regression SQL; browser nhập sai → luyện lại qua |
| Trang học/media → tiến độ | page attempt, coverage, media chunk/hash, ngày truy cập | Validator/analytics/restore; không biến completion trang thành mastery |
| Ký Ức Trận → lịch ôn | offer/card revision, journal grade, ack/retry | Scheduler/transport/outbox tests; chặn receipt sớm khi grade chờ |
| Ký Ức Trận → Nghịch Cảnh | guest self-rating và account unverified FSRS | Tự đánh giá quên không tự trở thành lỗi khách quan đã chấm server |
| Nghịch Cảnh → gợi ý Ôn/tiến độ | tổng nguồn legacy/page/server/practice, unknown/pending | Đã sửa số đếm dùng chung và điều phối; browser Reader lỗi → analytics=1 qua |
| Nghịch Cảnh → bài gốc | lesson-page ID parsing, lesson link, hint-used | Link nguồn đúng bài, mở tham khảo ghi nhận hỗ trợ; không xóa source cũ |
| Tàng Tự Khố → từ đã lưu | stable core word ID, savedWords merge | Có consumer Hồ sơ/Dictionary/Reader; ID ngoài lõi không giả thành FSRS card |
| Từ đã lưu → tự ôn | DictionaryStudyDialog, reveal, danh sách chọn | Tự ôn tự nguyện, UI nói rõ không đổi FSRS/mastery; account FSRS cần activation bài |
| Thiên Lộ → Tàng Tự Khố | lesson ID, expansion/studio sourceLessonIds | Thử thách chỉ tính mục từ trong bài, reset counter khi đổi lesson/journey |
| Reader → Tàng Tự Khố/kho từ | core lexemeId, contextual referenceEntry, saved/remove | Core lưu cùng savedWords; gloss ngoài lõi giữ trong Reader, không ép alias sai |
| Reader → vị trí/bookmark/thiết bị khác | owner/generation/epoch, tombstone, answer observations | Đã sửa mất câu giữa thiết bị và parser >500 support; workspace tests |
| Reader chapter/khảo luyện cũ → Nghịch Cảnh | exact chapter version, public practice source, context | Đã nối producer mới và guest legacy; account legacy đã có verified attempts |
| Reader → Vận dụng | hoàn tất câu đọc hiểu, relatedLessonIds, receipt ID | Đã bổ sung producer ở chapter UI; receipt không phải mastery |
| Thiên Lộ → Vạn Âm Điện | bài mở/đã qua từ authority, từ/câu trọng tâm | Mission selection tests, không dùng client completion giả mở bài account |
| Vạn Âm Điện → XP/streak/Vận dụng | mission reward ID, manual/acoustic completion, receipt | Đã sửa receipt thiếu và log thưởng; manual/TTS không thành điểm phát âm |
| Microphone/acoustic service → báo cáo nói | consent theo owner, abort callback, provider receipt | Native policy/recorder/report tests; phần cứng/quyền thật chưa có device |
| Thiên Lộ/Tàng Tự → Thần Văn Lô | source lesson, released character IDs, stroke provenance | Character session/provenance tests; IME/paper escape có đường riêng |
| Thần Văn Lô → evidence/tiến độ/Vận dụng | assisted strokes, replay, paper, unverified result | Giữ metadata hỗ trợ; không tự dùng stroke quiz làm mastery |
| Khảo nghiệm local/level-check → Nghịch Cảnh | phiên/phiên bản, đáp án sau trả lời, owner scope | Đã nối; không thay đổi placement safety hoặc ngưỡng mở bài |
| Khảo nghiệm server → kết quả/Nghịch Cảnh | submitted state, exact item/version/position, epoch | Read API mới có SQL regression chặn active session, owner khác, reset khác |
| Phòng Luyện Đề → bài gợi ý/lịch sử/Nghịch Cảnh | formHash, source lesson, review sau nộp | Đã nối kết quả và lịch sử cũ; không lộ key trước nộp; mock repository tests |
| Đề offline → chấm server/thiết bị khác | device-timed run, immutable form, outbox, workspace | Giữ bài chưa chấm; chỉ nối lỗi khi có result; không tạo chứng nhận/mastery |
| Mọi module → owner/reset/sync | command header, generation fence, local caches/journal | Đã sửa cookie race, tách phiên UI và queue starvation; tests cross-owner/reset |
| Hồ sơ reset → các module | durable reset operation, owner keys, epoch, shared cache | Browser thật qua: scope tăng, giữ hồ sơ khác/recovery/cache |
| Hồ sơ/cloud export → Reader/queue | workspace rows và value_json theo user | Đã bổ sung export workspace; 2 file/25 export/deletion regression qua |
| Tài khoản → role/learner/đăng xuất/xóa | session identity, pending/quarantine, RBAC, lifecycle | Repository/route tests; không thao tác xóa/đổi role/tài khoản thật trong audit |
| Editor/Admin → learner | release revision/package, sanitized projection, quyền API | Studio repository/routes/release worker tests; giữ answer key phía server |
| Android → web API/module dùng chung | native pinned origin, cookie, x-learning-* headers | Native source tests và Gradle unit/lint qua; UI được build riêng cho Capacitor |
| Client cũ → workspace mới | capability header và lọc prefix phản hồi | Giữ đồng bộ từ lưu/vị trí/bookmark cho client cũ, không xóa observation mới |
| PWA/Android → offline | manifest/hash/cache, entitlement expiry, media preparation | Các gate source hiện có qua; không xóa dữ liệu để chữa cache; cần device rehearsal |

## Bằng chứng và giới hạn kiểm thử

- Mở rộng rà các nhóm liên kết: 89 file / 707 test qua (`tmp/integration-cross-module-tests.log`);
  Editor/Admin → release → learner, analytics, account/reset/restore: 12 file / 118
  test qua (`tmp/integration-publishing-profile-tests.log`). Có overlap với gate tổng.
- Regression bridge mới/owner/compatibility/journey: 12 file / 61 test qua;
  regression cuối reset/reader/workspace: 8 file / 36 test qua. Các lượt này không
  cộng thành tổng độc lập. **Gate toàn hệ thống `npm run check` exit 0** tại
  `tmp/integration-system-check.log`: 502 file / 3.291 test, toàn bộ content,
  typecheck/lint/DB/restore và build qua. Vitest 730,06 giây, không tăng timeout.
  Guard journal bổ sung cuối: 3 file / 4 test qua, typecheck/scoped lint cuối qua
  (`tmp/integration-workspace-guard-tests.log`, `tmp/integration-workspace-final-typecheck.log`).
  Build Premium boundary cuối: 214 JS / 192 marker vắng mặt.
- Browser dùng chapter thật của Thư Các Thanh Đăng: chọn sai → Nghịch Cảnh →
  chọn đúng → reload giữ hóa giải, không page error. Cả browser journey page
  Thiên Lộ trước đó cũng qua sau mở rộng source.
  Logs: `tmp/integration-reader-browser-latest.log`, `tmp/integration-page-browser-latest.log`.
- Browser reset từ Hồ sơ thực tế xác nhận epoch tăng, phiên owner khác/backup/cache
  giữ nguyên, không page error (`tmp/integration-reset-browser-debug.log`). Lượt
  đầu chỉ timeout do test chờ wizard trong khi UI đã về landing đúng thiết kế;
  kiểm lại state và scope qua, không sửa timeout để che lỗi ứng dụng.
- Browser Reader → analytics đếm đúng 1 lỗi → Nghịch Cảnh → sửa → reload qua,
  không page error (`tmp/integration-overview-browser.log`).
- Capacitor UI build exit 0, 1.354 tài nguyên tham chiếu, 55 ảnh chuyển đổi và
  Premium bundle boundary qua (`tmp/integration-native-web.log`). ADB không có
  thiết bị. Gradle offline thiếu dependency AndroidX đã khai báo; chạy lại bằng
  launcher đã sửa với dependency chuẩn đã qua `:app:testDebugUnitTest :app:lintDebug`,
  exit 0 trong 5m26s (`tmp/integration-android-final.log`). Có 6 unit test native
  (gồm 1 template), 0 failure/error; lint 0 error và 24 advisory warning về resource
  và cấu hình mẫu. Không tăng baseline hoặc tắt lỗi. Không phát hành APK mới.
  UI source cuối đã build/copy/verify lại exit 0 sau guard journal
  (`tmp/integration-native-code-final.log`, `tmp/integration-native-code-copy.log`,
  `tmp/integration-native-code-verify.log`). Đây là source đóng gói, chưa phải APK phát hành.

- Gate trước mở rộng qua lockfile/typecheck/lint/content/database/restore (42 migration,
  61 bảng); Vitest đạt 495 file / 3.279 test, còn một test Reader timeout.
  `npm run check` exit 1, không ghi nhận là pass. Chạy lại riêng Reader đạt
  7/7 test, exit 0 trong 4,95 giây, không đổi timeout hay source Reader.
  Log: `tmp/system-audit-gates.log`, `tmp/system-audit-reader-retry.log`.
- Build source cuối exit 0; Premium boundary 216 JS/192 marker vắng mặt qua.
  Typecheck và scoped lint cuối exit 0; diff check qua. Log: `tmp/system-audit-final-build.log`,
  `tmp/system-audit-final-typecheck-2.log`.
- Regression slice: 8 file / 66 test qua; owner/transport/protocol: 8 file /
  119 test qua; history/restore parser: 3 file / 52 test qua. Có overlap; không cộng
  các con số này thành tổng độc lập.
- Chromium cô lập, React StrictMode, mobile 390×844: nhập sai trong trang học →
  Nghịch Cảnh → trả lời đúng → reload giữ hóa giải; không page error hay tràn ngang.
  Lượt riêng dùng gợi ý kiểm link bài gốc và xác nhận trả lời đúng vẫn chưa hóa giải
  sau reload. Smoke 10 route learner hoàn tất loading, không page error/tràn ngang.
  Screenshot: `tmp/system-audit-remediation-mobile.png`, desktop 1440×1000:
  `tmp/system-audit-remediation-desktop.png`.
- Fixture browser tại `http://127.0.0.1:4321` dùng component/store/IndexedDB thật,
  API giả lập guest/503; không thay kiểm account E2E với D1 thật. In-app browser
  tool lỗi khởi tạo assets; dùng Playwright. Vinext dev đã thử nhưng runner báo
  internal error; không ghi nhận server local 3000 chạy thành công.
- App đã phát hành vẫn là bản trước. Không có device test hoặc release mới.
- Production-readiness tiếp tục fail-closed exit 1 như thiết kế
  (`tmp/integration-production-gate.log`); audit local không mở gate thương mại.
- Đường dẫn ảnh nền placement stale đã sửa về asset `.webp` tồn tại; chờ build
  cuối xác nhận không còn cảnh báo asset này.
- Build cuối báo tổng assets khoảng 1.331,3 KiB, cao hơn advisory 1.024 KiB khoảng
  307,3 KiB. Đây không phải đo tải lần đầu hoặc hiệu năng thiết bị.

## Bảo toàn dữ liệu

Không xóa `.wrangler`, browser profile hoặc journal; không migration DB, không
đổi lesson/vocabulary/character IDs; giữ completion/streak/saved/FSRS/owner/reset.
Không sửa `docs/reports/` hoặc `output/`. Không commit/push/deploy.
Inventory nội dung không đổi: HSK0 **4/4**, rich **0/4**; HSK1–4
**40/40, 40/40, 55/55, 78/78**, tổng **213/213 rich**.

## Ranh giới tiếp theo

Các liên kết đã được mở rộng ngoài ví dụ Thiên Lộ/Nghịch Cảnh; vẫn cần review
web và thiết bị thật trước USER-ACCEPTED. Không chuyển trạng thái chỉ từ số test.
Phần chưa có evidence thực tế: account E2E trên D1 thật cho toàn bộ hành trình,
cài đè APK, microphone/IME/document picker, background/reopen và hiệu năng thiết bị.
Nâng cấp phục hồi toàn bộ journal thiết bị còn thiếu; không tự xóa kho hiện tại
hoặc coi export projection là backup toàn bộ thiết bị.

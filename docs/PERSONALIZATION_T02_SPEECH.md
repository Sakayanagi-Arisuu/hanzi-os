# T02 · speech support và durable mission · 20/10/2026

**IN-REVIEW**, chưa USER-ACCEPTED; chưa hoàn tất toàn T02/toàn kế hoạch.
Kế thừa contract T01/T02; không thay scoring, FSRS, reward authority hay nội dung.

## Source đã xác minh

App.tsx trỏ `/pronunciation` vào PronunciationQuestPage, không phải trang legacy
PronunciationPage. Cả hai source vẫn giữ, cùng dùng speechSupport cho các lượt
TTS đã nối. Legacy bypass âm thanh là support/bypassed, không giả đã nghe.

| Luồng | Implementation / contract |
| --- | --- |
| TTS word/phrase | speechSupport.ts → activityObservations → workspace primary+history cùng transaction; chỉ synthetic/requested, không upload câu/transcript/audio |
| Open mission | speechSession.ts → source digest toàn mission/challenges/version; deterministic initial session cho hai tab cùng owner/reset; explicit replay ID mới |
| Tự luyện tiếp tục | completeSpeechSessionItem kiểm session/source, commit self-review trước next; cùng session/item retry một hoạt động; source cũ không overwrite bởi correction |
| Resume | Mở lại source-version đúng từ primary, completed/manual/index/pending dựng lại; source mới không nhận completed cũ |
| Account | Pending trước workspace ack; journey chờ real confirmation mechanism cũ; endpoint nghiệp vụ dựng lại được, không request analytics rời |
| Guest | Primary/history owner+epoch/generation fence; local-practice, không fabricate server receipt |

Consumer completion chỉ chạy sau hydrate đúng missionSnapshot; state của mission
cũ không được dùng để khép mission mới. Reward policy/dedup cũ giữ nguyên, không
gọi cấp thưởng trong history adapter. Đã bỏ main lồng main, giữ main của shell.
Optional skill giữ dữ liệu thật qua evidence/primary/descriptor; legacy thiếu
giữ null. Metadata skill thêm ở retry không rewrite immutable unknown cũ.
TTS assistance true chỉ là trợ giúp synthetic, không kết quả nghe/phát âm.

## Bằng chứng ngày20/10

- Targeted speech-supportv1:3file/28test pass; speech-sessionv2:5file/34test pass;
  speech-sessionv3:5file/21test pass, gồm repository và skill compatibility.
  Các suite overlap, không cộng thành tổng. Test dùng fake-IDB/SQLite/receipt
  adapter, không thay real account-D1/browser auth.
- Typecheckv26/v27/v28 và global lintv15 exit0. Fullcheckv4 exit1:
  525file/3403test pass,1test fail do skill assertion/source bị đổi giữa run;
  targeted cùng test ở source hiện tại qua. Giữ v4 là fail, không tăng timeout.
  Fullcheckv5 source đứng yên đã CHECK_EXIT0:527file/3409test, typecheck/global
  lint/DB/restore42migration61table/build/Premium224JS/192markers qua. Asset
  1364.7KiB vượt advisory340.7KiB; không claim performance hay production pass.
- CUA guest thật preview4325: mở Nói → nghe từ → tự xác nhận không chấm →1/4,
  reload giữ đúng khẩu quyết2/1of4. Hai tab cùng1/4; tab đầu tự luyện mục2→2/4,
  tab cũ gửi cùng mục2 vẫn2/4, không3/4. Không dùng microphone/cloud provider.
- Hồ sơ→history filter speech có đúng4activity:1open+1TTS+2self-review, không
  objective/mastery. Dictionary giữ4event ngày19/10+lookup/2TTS ngày20/10=7,
  hai TTS word/example vẫn có sau reload. Các event cũ không bị reset.
- Viewport thực tab3 390×844: CTA nghe top664/bottom716/height52, không overflow.
  Tab2 desktop1280×720 CTA bottom704/height48; không gọi ảnh desktop là mobile.
  Viewport đã reset. Ảnh tmp/personalization-speech-resume-mobile-2026-10-20.png
  và tmp/personalization-speech-history-2026-10-20.png.

## Còn thiếu / tiếp nối

- Chưa account-D1 browser thật cho slice. Isolated D1 đang chuẩn bị tại
  tmp/personalization-d1/state, khác .wrangler người học; chưa có test account
  thành công thì không gọi limitation này đã gỡ.
- Playback-ended/current guidance, microphone report/recording chưa resume đủ;
  legacy mission chưa có primary open trước đây không tự bịa backfill.
- Guest multi-tab tested same-item retry; browser restart/replay-new-version,
  owner/reset switch và quota còn cần bổ sung dù helper targeted đã kiểm.
- Giữ giới hạn Android/native, CTA rich lesson, G09 old-tab reset, pilot audio/
  policy/human review/delayed recall/cohort. T04 mới staging-only, chưa restore.
- T02 tiếp theo writing scope/version/provenance và intermediate stages.
  Delta đã thấy: CharactersPage/CharacterForgeSessionPage ghi localStorage
  owner-only không epoch/CAS, parse lỗi có thể thành phiên mới; cần sửa cả
  producer lẫn runner, không chỉ thêm history sau UI. Giữ raw legacy, không tự
  nhận global resume thiếu owner hoặc phục hồi qua reset. Chưa sửa writing ở mốc này.

Preview4325 là source local guest/API503, không phải D1 server hay bản phát hành.
Không migration production/content/IDs, không sửa docs/reports/output/.wrangler,
không commit/push/deploy/APK. Inventory HSK0 4/4 rich0/4; HSK1–4 rich213/213 giữ.

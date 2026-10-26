# T12 · consumer của phiên luyện pilot

22/10/2026 · IN-REVIEW, audit delta của T11; chưa nghiệm thu toàn T12.
Đây là ma trận implementation hiện có, không phải backlog thay mọi module.

| Output → consumer | Hành vi hiện có | Giới hạn / evidence |
| --- | --- | --- |
| Manifest → runner | Ghim graph/unit/source/context/version; practice khác shadow và không chứa grants | Account kiểm lại tại adaptive-unit; guest đã nối `/path/practice`, chỉ nguồn được phép và prerequisite từ state bền vững |
| Draft/IME → workspace primary | Snapshot revision bất biến; autosave trước support/receipt/next; stale CAS giữ bản đầu | Controller v17 kiểm serial writes, reload, stale revision và delayed receipt. Chưa full-device recovery |
| Archive / nháp xung đột → primary/history | Terminal revision giữ mọi bản cũ; nháp giữ riêng immutable trước reload/exit, đọc lại ở entry | Khác session-id có chọn archive; cùng id/revision vẫn fail-closed. Account chờ exact ack trước phiên mới, không grant/FSRS/evidence |
| Support → renderer/history | Lưu trước reveal/Pinyin/translation/TTS; TTS chỉ synthetic support | Ack không đổi workspace chỉ refresh journal, giữ lựa chọn tự đối chiếu; focus/reset vẫn kiểm lại nguồn. Không tự bật microphone hoặc chấm transcript |
| Receipt → history | First response/self-review bất biến; business event và primary trong một transaction | Không có objective correct/incorrect scoring trong pilot này |
| Workspace → D1/outbox | Exact ack; pending chặn next/finished; conflicting revision không LWW overwrite | Unit/repository tests không thay browser account-D1 adaptive end-to-end; release projection409 vẫn chặn |
| History → descriptive model | Exact skill/modality/source; session/draft/visit/preference không là evidence; item lặp không tăng distinct coverage | Independent mastery/sufficiency/skip vẫn unknown/false; chưa có calibrated policy |
| History → Hồ sơ → bài nguồn | Nhãn nháp/mở bước/hỗ trợ/tự đối chiếu dễ hiểu; link sourceLessonIds đầu tiên, thiếu nguồn về Thiên Lộ | Guest fixture thật qua runner→close→history7lượt/link bài; không suy thành account-D1 adaptive end-to-end |
| Receipt → lesson completion / Thiên Lộ | Không có linkage cấp completion; completionLessonIds luôn rỗng | Không gọi submit lesson/page attempt hoặc cập nhật completedLessons từ vài unit |
| Receipt → XP / rewards / streak | Không có lệnh cấp thưởng hay ghi completion | Không dùng số hoạt động, khép phiên hoặc self-review để suy mastery/streak |
| Receipt → mistakes | Cố ý chưa tạo mistake từ tự đối chiếu hoặc exposure | Chưa có scored incorrect receipt; không biến needs-practice thành lỗi đã kiểm chứng |
| FSRS offer → scheduler | Chỉ đóng băng offer/revision/lịch từ scheduler hiện có; execution từ chối | Cần adapter receipt FSRS thật trước khi mở; không grade hoặc reschedule bằng journal adaptive |
| Unit → Reader / dictionary | Giữ ngữ cảnh trong renderer, không tự đánh dấu bài đọc/tra từ | Chưa có điều hướng qua lại và return receipt; không tự ghi read completion/saved word |
| Speech unit → Nói | Self-review với context/model; không raw transcript/IME trong speech receipt | Không pronunciation/tone score, không native audio claim; typing là nhánh modality text riêng |
| Adaptive → Thần Văn Lô | Không thay snapshot hoặc receipt writing hiện có | Không đổi handwriting/stroke provenance hoặc nhân đôi evidence của writing journey |
| Adaptive → assessment / diagnostic / skip | Không có quyền mở/đỗ/skip từ manifest hoặc descriptive model | T14 còn riêng; delayed/holdout candidates chưa đủ review/audio/family policy |
| Draft content → release / authoring | Sáu draft chỉ tooling/author preview; humanReviewed:false | Không phát hành trong runner hoặc nhận là holdout độc lập đã duyệt |

Fullv10:545file/3489test CHECK_EXIT=0, trước delta guest/entry. Delta guestv18
8file/41test, pathv19 7file/29test, conservationv20 2file/21test exit0 (overlap).
Typecheckv62/lintv9 và buildv12 exit0 gồm lifecycle guard mới. Browser fixture4330
đã kiểm autosave/reload/conflict/close và ack giữ radio;4331 dùng adapter guest thật
với prerequisite fixture, entry→resume đúng nháp/IME→close→history7lượt qua.
Real guest4325 không đủ prerequisite thì fallback, mobile390×844 CTA44px không
bị nav che. Không suy ra account/Android/efficacy hoặc performance100k.

Tiếp theo: FSRS receipt thật, nguồn bị thu hồi/branch resolution và consumer
Reader/Nói/Viết/assessment còn thiếu. Giữ quyền và scheduler ở adapter gốc;
không mở thêm vùng điều hướng hoặc thay Thiên Lộ mặc định.

## 26/10 · delta consumer Nói

Source deep-link missing/empty/locked không mở fallback mission hoặc session; kho chọn bài hợp lệ phục hồi đúng nguồn và focus main, reload giữ cùng phiên. Guest IDB thật hash6speech/72workspace/72pending giữ nguyên. Fresh-context E2Ev3 4/4, targeted20test/typecheckv3/lintv3/buildv2 qua. AppShell hoãn invitation trong Nói sau pointer-interception regression thật. Xem T12_SPEECH_SOURCE; chưa thay FSRS/adaptive authority, account/native hoặc các consumer còn lại.

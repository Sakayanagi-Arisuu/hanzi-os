# T05 · mục tiêu và bối cảnh tự khai · 21/10/2026

**IN-REVIEW**, chưa USER-ACCEPTED. Tiếp tục theo quyền chuyển task trong bàn giao.

**Delta phát hiện khi fullv7 đang chạy (đã sửa source sau gate):** probe synthetic
tmp/personalization-preferences-legacy-probe-v1.log exit1: client cũ bỏ optional
field rồi đổi tên làm merge profile mất preferences mới. Lúc phát hiện chưa sửa
source vì gate đang chạy; sau gate đã thêm register/clock riêng cho preference
(kể cả null reset), test omission/permutation/concurrency/tombstone. Không dùng
87test pass hoặc fullv7 để che gap này. Đã thêm learningPreferencesClock độc lập
với profile clock, omission của client cũ không xóa field; null là tombstone,
equal-clock ambiguity chọn reset/opt-out. Evolve không nhận clock do form/import
tự gửi; merge giữ register origin nên sáu thứ tự ba nhánh hội tụ. Parser kiểm
clock, protocol chặn clock vượt profile counter. Probev2 exit0; targetedv3
7file/93test, v4 8file/133test, v5 6file/95test exit0; typecheckv41/lintv2 exit0.
Đây là source sau buildv7, chưa dùng fullv7 thay gate source mới.

Profile.learningPreferences tùy chọn/version1 giữ thời lượng phiên5/10/20 phút,
chủ đề, audio/microphone ask/available/unavailable và allowInference. Mặc định
chưa đồng ý suy luận, chưa xác nhận audio/mic. Goal/dailyMinutes cũ giữ riêng.
Không xin quyền thiết bị hoặc suy năng lực từ lựa chọn. resolveLearningContext
cho phép override từng phiên mà không sửa profile; runner adaptive chưa nối.

Hồ sơ → Hành trình học → Nhịp phiên & bối cảnh học dùng cùng form/save và
recordDocumentMutation hiện có: state/document/history/outbox cùng transaction,
owner/reset fence, account dùng sync document hiện có, không thêm request analytics.
Không migration DB; profiles SQL vẫn là projection các trường cũ, document JSON
là nguồn của preferences mới. Lịch sử chỉ ghi metadata khai báo gọn, không tên.
Reset lựa chọn phiên lưu null, không reset learning. Reset tiến độ giữ riêng
learningPreferences hiện có; các semantics reset profile cũ khác giữ nguyên.
Parser persistence/import/protocol kiểm version/shape; schema lạ fail-closed,
không thay dữ liệu bằng defaults. Profile cũ không field vẫn đọc được.

Đã kiểm:

- tests-v1 5file/53test exit0; tests-v2 7file/87test exit0 gồm coordinator
  guest transaction, preference history, reset riêng và SQLite/account sync
  repository/routes; đây không phải browser account-D1 với field mới.
- Typecheckv40 exit0 ở source trước metadata history và test coordinator cuối;
  lint preferencesv1 exit0; full gate mới phải kiểm source cuối.
- Browser CUA localhost4325, origin riêng với127.0.0.1: lưu5phút/mua sắm/
  không audio/mic/allowInference, reload giữ đúng cả ba select và hai checkbox.
  Reset preferences→save trở lại10/ask/ask/allfalse. Không xin quyền mic.
- 375×667 không tràn ngang; CTA top539/bottom583/h44 trên nav.
  667×375 CTA top246/bottom290/h44, không tràn ngang; viewport đã reset.
  Ảnh tmp/personalization-preferences-mobile.png. Chưa screen reader/device thật.

Dữ liệu: không đổi IDs/nội dung/scoring, giữ HSK0 4/4 rich0/4; HSK1–4
40/40/55/78=213/213rich. Không reset browser người học/.wrangler, không sửa
docs/reports/output, không commit/push/deploy. Origin127.0.0.1 history writing17
vẫn giữ; các thao tác test mới dùng originlocalhost.

Tiếp: gate tích hợp; T04 recovery và graph/units/composer theo dependency.
Preferences mới chưa chứng minh account-D1/native, cold-start dialog/đổi nhanh
trong runner sẽ nối khi T11/T13 có manifest thật. Không gọi toàn T05/toàn kế
hoạch đã hoàn tất từ riêng form profile.

# T18 · protocol đánh giá trước nghiên cứu · bản nháp 20/10/2026

## Delta kỹ thuật 23/10/2026 — IN-REVIEW

`src/personalization/replayPilot.ts` có harness read-only, chỉ nhận scope
`fixture:replay:*` và eligibility synthetic-test. Không đọc DB/browser hoặc gửi
request. Chạy reducer/composer thật tại các cutoff tăng dần, giữ version và
graph/unit bindings, reasons/excluded, first error, pending và support. Thiếu
consent không đọc/copy events; snapshot history ghi null, không tự lấy dữ liệu.

Artifact gồm frozen graph/unit/eligibility/context/events synthetic; input binding
riêng với semantic output binding để nhận diện thay đổi thứ tự raw mà không
nhầm retry thành thay đổi kết quả. Verifier kiểm checksum, tái chạy frozen input
và so output: sửa report rồi tự tính lại hash vẫn không vượt kiểm tái lập.
Timing là process elapsed quan sát tại lượt chạy, không attestation, CPU/device
benchmark hoặc thời gian học. Hiệu quả học và independent recall luôn chưa đo.

```powershell
npx tsx scripts/replay-personalization-pilot.ts --output tmp/personalization-pilot-replay.json
npx tsx scripts/verify-personalization-replay.ts --input tmp/personalization-pilot-replay.json
```

CLI chỉ ghi/đọc artifact dưới tmp, không docs/reports/output hay nguồn learner.
Fixture gồm receipt sync muộn và bốn nhu cầu quantity/listen/produce/transfer,
khác task path thật với budget5phút/no-mic, native-audio và unseen-holdout limits.
Không tạo baseline-arm/cohort giả. Còn thiếu baseline comparator và temporal item
families đã review, recall7/30ngày, power/cohort/human policy, device/navigation
performance, rollback live. Không gọi toàn T18 hoặc kế hoạch đã hoàn tất.

Đã kiểm: replayv3 3file/14test TEST_EXIT0; typecheckv72 và lintv2 exit0.
CLI v2 tạo artifact và verifier v1 tái lập cả timeline+4paths VERIFY_EXIT0.
Test có permutation/retry, first error sau correction, observed-vs-received cutoff,
4path/time/modality, opt-out Proxy không được đọc, scope/clock/source rejection,
JSON round-trip, source tamper và report tamper có hash tự tính lại. Fullv13
550file/3531test là trước tooling này; helper chưa được import vào learner app.

**IN-REVIEW cho phần chuẩn bị protocol**, không có cohort/live experiment hay
bằng chứng hiệu quả học. Chưa hoàn tất T18. Không tự tuyển người, gửi liên hệ,
thu bản ghi giọng hoặc bật A/B. Các trường cần reviewer quyết định vẫn unknown.

## Hai loại kết luận không thay thế nhau

| Kiểm kỹ thuật bằng replay/synthetic | Đánh giá học thật |
| --- | --- |
| Event retry/reorder/late sync không làm đôi evidence/reward | Recall trên item mới sau7/30ngày, khác mức nhớ item đã luyện |
| Owner/reset/version/entitlement và assistance filter đúng | Transfer sang ngữ cảnh chưa gặp và đúng skill/modality |
| Cùng seed+graph+policy+unit snapshot cho cùng manifest | Khác biệt có độ bất định và mức ý nghĩa thực tiễn chốt trước |
| Bốn nhu cầu nhận task/unit/support khác nhau thật | Không suy từ XP/DAU/streak/lesson count/thời gian dùng app |
| Không-candidate/offline/no-mic/5phút fallback an toàn | Không gọi transcript/TTS/self-review là điểm nói/nghe kiểm chứng |

Synthetic không được tính vào cohort, proficiency hay humanReviewed. Benchmark
ChineseSkill là taxonomy/luồng/chất lượng, không phải dữ liệu đối chứng hoặc
chứng cứ vượt đối thủ. Không dùng nội dung/thuật toán đóng của bên khác.

## Đề xuất thiết kế để reviewer chốt trước khi bật

- Đơn vị phân nhóm: người học, không đổi arm theo phiên để tránh carryover.
  Ba arm giữ cùng quyền truy cập và nguồn nội dung đủ điều kiện: planner hiện
  tại; FSRS hiện có+bài tuần tự; composer cá nhân hóa. Không đổi thuật toán FSRS
  cho arm đối chứng. Phân tầng đầu vào theo evidence độc lập có sẵn; self-report
  là biến riêng, không chia nhóm từ avatar/tên/danh tính.
- Outcome chính đề xuất: tỷ lệ đúng trên tập item mới đo recall7ngày, cùng
  competency×skill×modality. Recall30ngày và transfer là secondary; không đổi
  outcome chính sau khi nhìn kết quả. Reviewer cần duyệt cách chấm/cửa sổ thời
  gian/tập mục tiêu trước; hiện chưa có xác nhận.
- Chọn một thời điểm khóa manifest/content/policy cho mỗi cohort. Lưu phiên
  bản và tiêu chí loại item; nội dung bị thu hồi không được silently thay bằng
  item dễ hơn. Authority chấm, hint/reveal/prior exposure và media provenance
  phải được ghi. Đề đang active không đưa answer keys vào client/export.

## Chống leakage và phép đo sai

- Chia item/context families trước khi soạn phiên; holdout7ngày và30ngày không
  trùng item, paraphrase-gần-trùng hoặc audio/văn bản đã lộ trong teach/practice.
  Lưu source/version/context hash và lineage của phép chia, không chỉ text ID.
- Temporal cutoff dựa trên occurredAt hợp lệ và receivedAt/cutoff; event sync
  muộn không được quay ngược làm đặc trưng trước khi hệ thống nhận được nó.
  Replay giữ cả thứ tự thực hiện và thứ tự quan sát, báo hai kết quả riêng.
- Probe dùng hint/reveal/IME trợ giúp hoặc self-rating được phân loại assisted,
  không gộp vào independent recall. Repeated item không tăng distinct coverage.
  Unknown time/version/assistance giữ unknown, không tự điền từ lần import.
- Nói/viết cần rubric/nguồn đo được review/calibration thật. TTS/transcript hoặc
  heuristic hình nét không thay outcome nói/nghe/viết độc lập. Pilot thiếu media
  phù hợp thì loại endpoint đó khỏi claim, không tự chuyển thành đo bằng chữ.
- Tách khóa answer và quyền Premium khỏi artifact learner/replay công khai;
  fixture synthetic không được trở thành nội dung phát hành.

## Cỡ mẫu, attrition và phân tích

Hiện **unknown**: baseline recall, variance/correlation, minimum meaningful
effect, attrition7/30ngày, cluster effect và số người đủ điều kiện. Không tự đưa
ra số mẫu/power hoặc xác suất thành thạo như đã calibrated.

Trước enrollment, reviewer/statistical owner cần ký phiên bản ghi rõ:

1. Population/eligibility/exclusion, arm assignment và allocation seed.
2. Minimum meaningful effect theo outcome chính, alpha/power và điều chỉnh
   nhiều so sánh; mô phỏng power có learner-level clustering/repeated measures.
3. Target sample sau attrition dự kiến; báo enrollment/retention/withdrawal theo
   arm. Không loại người bỏ dở rồi chỉ báo completer tốt nhất.
4. Intention-to-treat chính, completer/per-protocol sensitivity riêng; lý do
   missingness, khoảng bất định và phân tích worst-case/sensitivity định trước.
5. Estimator/CI, covariate đã chốt, luật dừng/guardrails và treatment deviations.
   Không optional stopping hoặc chọn subgroup/outcome sau khi nhìn dữ liệu.

Nếu không có dữ liệu để chốt các mục này: báo thiếu bằng chứng, chỉ chạy harness
kỹ thuật. Không gọi protocol này là preregistration đã được người duyệt ký.

## Guardrails và dữ liệu tối thiểu

- Đo active time từ tương tác có lifecycle pause/resume/visibility, không dùng
  thời gian tab mở. Duration chưa đo vẫn unknown, không lấy event count đổi phút.
- Theo dõi tải ôn, bỏ dở, đổi nhiệm vụ, lỗi/offline, hiểu lý do recommendation
  và opt-out. Các biến này không thay outcome recall; không phạt người nghỉ.
- Lỗi mất dữ liệu/owner leak/đôi thưởng, nội dung chưa đủ quyền hoặc assistance
  sai taxonomy là điều kiện dừng kỹ thuật, khôi phục planner cũ giữ journal.
- Không cần avatar/tên/email/raw audio/transcript cho tập phân tích mặc định.
  Pseudonymous scope vẫn là dữ liệu cần bảo vệ; không export credential, consent
  token, private scoring key hay quyền account. Người học opt-out inference vẫn
  dùng bài truyền thống, FSRS và dữ liệu cá nhân của chính mình.
- Thiếu device/Android thì báo chưa đo startup/memory/native; thiếu cohort thì
  không báo hiệu quả7/30ngày. Live research cần yêu cầu và consent riêng.

## Artifact phải có khi triển khai harness sau dependency

Graph/policy/unit snapshot; seed; event replay input và temporal-item split;
baseline/composer manifests; lý do unit bị loại; actual units/task/support diff;
pending/rejected consumer assertions; performance trace trên máy tham chiếu;
rollback receipt và integrity report. Test kỹ thuật không tự ký review nội dung.

Mốc20/10 trước delta trên mới là chuẩn bị độc lập khi gate tích hợp chạy.
T06–T14 chưa hoàn tất, cohort/recall/power chưa có; không đánh dấu T18 complete.

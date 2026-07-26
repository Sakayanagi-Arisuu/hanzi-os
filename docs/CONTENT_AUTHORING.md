# Quy trình content package bất biến

## Phạm vi của lớp nền WS2

Thư mục `content/` là registry quản trị cho nội dung đang được kiểm tra vào Git. Đây **không phải CMS hoàn chỉnh** và không tự tạo nội dung tiếng Trung, quyền sở hữu, license, audio, phê duyệt bản ngữ hay tuyên bố coverage. Runtime curriculum đọc từ `src/data/curriculum.ts`. Flow anonymous/local dùng item bank answer-exposed tại `src/data/assessment.ts`; flow authenticated chỉ được cấp form từ bank server-confidential tại `src/server/authoritativeAssessmentItemBank.ts` và không được dùng bank phía client làm authority.

Package `foundation-2026.07.3` hiện là ứng viên `closed-alpha`, `productionEligible: false`, chưa có content owner, bằng chứng license hoặc native linguistic review. Package này được tạo mới sau khi assessment server-authoritative và scoring policy được đưa vào tập artifact có hash; approvals và `coverageClaims` cố ý được xóa. Không có tuyên bố HSK, A0 hay goal coverage nào được suy ra từ ID hoặc nhãn giao diện.

## Những gì được khóa bằng hash

`content/registry.json` giữ SHA-256 của manifest. Manifest tiếp tục giữ SHA-256 chuẩn hóa của:

- `runtime-ids.json`: ID từ vựng, unit, lesson, story; word membership; release state; đồ thị prerequisite.
- `coverage-claims.json`: các tuyên bố coverage có bằng chứng, hiện là mảng rỗng.
- `src/data/assessment.ts`: item bank public cho flow anonymous/local, metadata đo lường và eligibility; đây là artifact answer-exposed nên không được phát hành như form authoritative.
- `src/data/curriculum.ts`: toàn bộ source runtime, chuẩn hóa line ending trước khi hash nhưng không sao chép linguistic content vào registry.
- `src/server/authoritativeAssessmentItemBank.ts`: policy phát hành form assessment từ item server-confidential, trạng thái review và điều kiện measurement.
- `src/server/assessmentScoring.ts`: scoring policy và aggregate result không hiệu chuẩn của assessment server-authoritative.

Vì manifest chứa hash của các artifact, review chỉ cần bind đúng manifest hash là bind toàn bộ package. Bất kỳ thay đổi nào ở source, item bank, dependency, metadata hoặc claims đều làm review cũ trở nên stale. Không cập nhật digest của một package đã review để “đuổi theo” thay đổi; phải tạo version mới.

## Lệnh chỉ đọc

Các lệnh dùng Node 22.22 trở lên và không cần package bổ sung:

```powershell
node scripts/content/hash.mjs foundation-2026.07.3
node scripts/content/validate.mjs foundation-2026.07.3
node scripts/content/report.mjs foundation-2026.07.3
node scripts/content/verify-release.mjs foundation-2026.07.3
node scripts/content/promote.mjs foundation-2026.07.3
```

Ý nghĩa exit code:

- `validate`: `0` khi schema, ID graph và mọi hash nhất quán; `1` nếu package bị thay đổi hoặc hỏng.
- `report`: `0` khi có thể tạo báo cáo, kể cả khi còn blocker. Đây là báo cáo chất lượng, không phải release gate.
- `verify-release`: chỉ trả `0` khi mọi gate phát hành có bằng chứng; package hiện tại phải trả `1`.
- `promote` không có `--write`: chỉ kiểm tra policy. Nếu còn blocker, trả `1` và không sửa file.
- Lỗi cú pháp, file hoặc thao tác không an toàn trả `2`.

## Tạo version mới

Chỉ tạo version sau khi runtime source của thay đổi đã ổn định. Lệnh không sửa package nguồn, không sao chép approvals và mặc định xóa coverage claims:

```powershell
node scripts/content/new-version.mjs foundation-2026.08.1 --from foundation-2026.07.3 --created-at 2026-08-01T00:00:00.000Z --audience closed-alpha --write
```

Nếu source runtime đã đổi nhưng IDs/graph/membership/release state không đổi, phải xác nhận rõ:

```powershell
node scripts/content/new-version.mjs foundation-2026.08.1 --from foundation-2026.07.3 --created-at 2026-08-01T00:00:00.000Z --confirm-runtime-ids-unchanged true --write
```

Mỗi version mới luôn hash item bank client/public `src/data/assessment.ts`, item bank server-authoritative và assessment scoring policy đang được check in. Thay đổi item, đáp án, construct, modality, measurement eligibility hoặc scoring policy vì vậy được bind vào manifest mới và không kế thừa approval cũ.

Nếu các ID hoặc dependency đổi, tạo một JSON snapshot mới trong repo rồi truyền `--runtime-ids-file PATH_TRONG_REPO`. Chỉ truyền `--coverage-claims-file PATH_TRONG_REPO` khi từng claim đã có `evidenceRef`; nếu không truyền, artifact mới luôn có `coverageClaims: []`.

Metadata governance có thể được gắn ngay lúc tạo version bằng các cặp flag sau. Không truyền một nửa của cặp:

```text
--owner-id ID --owner-evidence EVIDENCE_REF
--license-id LICENSE_ID --license-evidence EVIDENCE_REF
--includes-audio true --audio-owner-id ID --audio-license-id LICENSE_ID --audio-evidence EVIDENCE_REF
```

Không có flag nào tự phê duyệt metadata này. `new-version` luôn tạo candidate, `productionEligible: false`, review rỗng và không thay `currentContentVersion`.

Sau khi tạo package, cập nhật runtime `CONTENT_VERSION` và manifest readiness trong cùng thay đổi code. Release verification sẽ fail nếu package chưa bind đúng runtime version.

## Gửi review có bằng chứng

Lấy exact manifest digest bằng `hash.mjs`, rồi ghi từng review độc lập. Ví dụ cấu trúc lệnh:

```powershell
node scripts/content/submit-review.mjs VERSION --review-id REVIEW_ID --role native-linguistic --decision approved --reviewer-id REVIEWER_ID --reviewed-at ISO_TIMESTAMP --evidence-ref EVIDENCE_REF --manifest-sha256 SHA256_DIGEST --write
```

Role hợp lệ là `content-owner`, `native-linguistic`, `source-license` và `audio-rights`. Audio role chỉ trở thành gate khi manifest khai báo có audio. Mỗi review cần ID, reviewer, timestamp và evidence ref do người có thẩm quyền cung cấp. Native linguistic reviewer phải độc lập với content owner.

`reviews.json` là file duy nhất bên trong package đã đăng ký mà workflow được phép nối thêm. Review ID không được ghi đè. Nếu review envelope hoặc manifest hash đã stale, lệnh từ chối rebinding và yêu cầu tạo version mới.

## Promotion

Promotion là fail-closed. Policy yêu cầu tối thiểu:

- package có audience `public` và bind đúng runtime version;
- content owner và source license có evidence ref;
- exact-hash approvals mới nhất cho content owner, native linguistic review và source license;
- audio ownership/license và exact-hash approval nếu có audio;
- không có lỗi integrity, schema, ID, dependency hoặc release state.

Chỉ khi dry run không còn blocker mới được ghi promotion provenance vào registry:

```powershell
node scripts/content/promote.mjs VERSION --actor-id ACTOR_ID --promoted-at ISO_TIMESTAMP --write
```

Lệnh chỉ cập nhật registry; không sửa artifact hoặc tự tạo approval. Publish/deploy/Sites là một gate vận hành riêng ở cuối quy trình và không nằm trong lớp authoring này.

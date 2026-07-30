# Walkthrough demo local HSK0 → HSK1

Ngày xác minh: 30 July 2026

Đây là kịch bản bảo vệ đồ án cho lát learner runtime đang phát hành. Nó chứng
minh một người học ẩn danh có thể chọn đích HSK1, hoàn thành bridge HSK0 qua UI
thật và chỉ khi đó mới mở bài HSK1 đầu tiên. Đây không phải seed tiến độ, không
phải chứng nhận hoàn thành HSK1 và không phải bằng chứng production.

## Hợp đồng demo

Artifact checked `content/demo/hsk0-1-local-demo.json` chỉ chứa cấu hình và kỳ
vọng kiểm thử. Nó bind exact runtime catalog bằng catalog/compiler/content
version, import idempotency key, integrity digest và toàn bộ source binding.
Builder và validator tái tạo artifact từ catalog đã kiểm; source drift, sửa
artifact hoặc chèn trạng thái người học đều làm gate thất bại.

Manifest cố ý không chứa seed, answer, evidence, completion, mistake,
knowledge, mastery, FSRS, XP, streak hoặc resume. Onboarding và mọi mutation
trong walkthrough đều đi qua control của ứng dụng. Playwright chỉ đọc frozen
lesson form từ IndexedDB để điều khiển đáp án; test không ghi localStorage hay
IndexedDB nhằm tạo tiến độ.

Boundary hiện được khóa như sau:

| Boundary | Trạng thái đã kiểm |
| --- | --- |
| Target profile | HSK1, mục tiêu HSK, giản thể |
| Bridge bắt buộc | `boot-1` → `boot-2` → `boot-3` → `boot-4` |
| HSK1 mở ở biên | chỉ `survival-1` |
| HSK1 còn khóa | `survival-2`, `survival-3`, `survival-4` |
| Lesson bị prerequisite chặn | `daily-1..4`, `characters-1..2` |
| Path chưa có runtime content | HSK2, HSK3, HSK4 |

## Chạy lại bằng chứng tự động

Từ root repository:

```powershell
npm run demo:hsk01:manifest -- --check
npm run demo:hsk01:manifest:validate
npm exec playwright test -- e2e/hsk01-local-demo.spec.ts --workers=1
```

Hai gate manifest cũng nằm trong `content:graduation:check`, vì vậy
`npm run check` fail closed nếu hợp đồng demo stale hoặc bị chèn tiến độ.

Playwright thực hiện một luồng duy nhất qua production build:

1. Onboarding ẩn danh với target HSK1; state ban đầu có 0 evidence, 0
   completion, 0 mistake, 0 skill mastery, 0 XP và 0 streak.
2. Mở Thiên Lộ và xác nhận tự khai HSK1 không miễn prerequisite: chỉ `boot-1`
   mở, bảy node còn lại khóa.
3. Vào `boot-1`, trả lời câu đầu, reload và tiếp tục đúng session, form, vị trí
   và answer đã chấm mà không sinh evidence trùng.
4. Cố ý sai activity không bắt buộc đầu tiên sau reload, trả lời đúng phần còn
   lại và hoàn tất đúng 10/10 activity ở mức 90%.
5. Đối chiếu 10 answer evidence + 1 completion evidence với exact runtime
   provenance; idempotency key là duy nhất và mỗi row chỉ mang một skill.
6. Mở Nghịch Cảnh Lục từ lỗi vừa tạo và tự gọi đúng hai lần liên tiếp, không
   dùng hint. Hai lượt remediation vẫn `verified: false` và
   `masteryEligible: false`.
7. Hoàn thành `boot-2..4` qua UI thật. `survival-1` mở; ba bài HSK1 kế tiếp vẫn
   khóa. Direct URL tới cả sáu lesson daily/character vẫn bị từ chối.
8. Replay mastery từ đúng các evidence `masteryEligible` và so sánh exact với
   bảy bucket skill, ngăn suy diễn evidence từ kỹ năng này sang kỹ năng khác.

## Ledger kỳ vọng

| Mốc | Lesson evidence | Remediation evidence | Completion local | Mistake |
| --- | ---: | ---: | ---: | --- |
| Sau onboarding | 0 | 0 | 0 | 0 |
| Sau `boot-1` | 11 | 0 | 1 | 1 mở |
| Sau remediation | 11 | 2 | 1 | 1 đã đóng local |
| Sau bridge `boot-1..4` | 44 | 2 | 4 | 1 đã đóng local |

`boot-1` đạt 90%; ba bridge lesson sau đạt 100%. `survival-1` chỉ được mở để
chứng minh boundary và chưa có completion/evidence. Lesson completion là local
prototype unlock; nó không trở thành server authority, calibrated mastery hay
HSK graduation claim.

## Walkthrough thủ công khi bảo vệ

1. Dùng profile trình duyệt mới hoặc thao tác xóa dữ liệu HANZI.OS trong trang
   Hồ sơ; không import backup.
2. Chọn **Hướng tới HSK**, **HSK1** và **Giản thể** trong onboarding.
3. Mở **Thiên Lộ** và chỉ ra thông báo tự khai không miễn prerequisite cùng
   trạng thái khóa của các node.
4. Vào **Bốn thanh điệu**, trả lời câu đầu rồi reload để trình diễn resume.
   Cố ý chọn sai một câu meaning/listening không phải checkpoint thanh điệu,
   hoàn thành các câu khác để đạt 90%.
5. Vào **Nghịch Cảnh Lục**, nhập đáp án đúng hai lần mà không mở gợi ý.
6. Hoàn thành ba bridge lesson còn lại, quay lại Thiên Lộ và chỉ ra
   **Tôi là sinh viên** đã mở trong khi các node HSK1 sau vẫn khóa.

Walkthrough thủ công dùng để trình bày UX; file E2E mới là bằng chứng tái lập
cho counts, provenance, idempotency và trust policy.

## Giới hạn phải nói rõ

- Learner runtime hiện chỉ có 8 lesson đủ prerequisite: 4 HSK0 và 4 HSK1.
- Sáu lesson beta daily/character vẫn bị chặn; HSK2-4 còn learner-hidden dù
  authoring inventory/draft đã sâu hơn nhiều.
- Browser TTS không phải reviewed native audio. Remediation local không phải
  mastery; diagnostic chưa hiệu chuẩn và không cấp waiver.
- Chưa có native linguistic review, pilot/calibration, quyền audio đã duyệt,
  hosted recovery hoặc Sites verification. Không được nói sản phẩm đã “đủ
  HSK1-4” hay production-ready.

Ranh giới kỹ thuật chi tiết nằm trong `docs/ARCHITECTURE.md`, quy tắc release
nội dung nằm trong `docs/CONTENT_SYSTEM.md`, và thước đo tiến độ nằm trong
`docs/HSK4_GRADUATION_PLAN.md`.

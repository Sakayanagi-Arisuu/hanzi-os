# Prompt Goal cho lượt triển khai Reforge tiếp theo

Sao chép **toàn bộ phần trong khối dưới đây** vào một lượt mới tại workspace
`D:\Projects\hanzi-os`.

---

Trước hết gọi `get_goal`. Nếu đã có Goal chưa kết thúc với objective này thì
tiếp tục Goal đó, không tạo Goal trùng. Nếu không có Goal đang hoạt động, gọi
`create_goal` với objective sau và **không đặt `token_budget`**:

> Hoàn thành HANZI.OS Reforge theo toàn bộ 100 task trong
> `docs/RESTRUCTURE_MASTER_PLAN.md`, đến khi từng task đều có acceptance evidence
> hợp lệ và sản phẩm đạt functional/learning-depth parity đã định nghĩa cho
> Mainland Mandarin HSK0-HSK4 local-first, với UX hologram nguyên bản, dễ dùng.

Sau khi tạo/khôi phục Goal, bắt tay vào task đầu tiên đủ dependency ngay trong
lượt; không chỉ đọc tài liệu rồi trả lại một kế hoạch.

## Nguồn sự thật và phạm vi

Trước khi sửa code, main agent phải đọc đầy đủ theo thứ tự:

1. `AGENTS.md`;
2. `docs/IMPLEMENTATION_CHECKPOINT.md`;
3. `docs/PRODUCT_VISION.md`;
4. `docs/CHINESESKILL_BENCHMARK.md`;
5. `docs/RESTRUCTURE_MASTER_PLAN.md`;
6. `docs/HSK4_GRADUATION_PLAN.md`;
7. `docs/CONTENT_DELIVERY_PLAYBOOK.md`.

Chỉ đọc `docs/PRODUCTION_UPGRADE_PLAN.md` nếu tôi chủ động mở lại production.
Critical path là Mainland Mandarin, UI tiếng Việt, HSK0-HSK4 và local-first
web/PWA. Taiwan Mandarin, Cantonese, native mobile, commerce, Sites và public
hosting nằm ngoài Goal nếu master plan không ghi rõ.

Baseline lúc bắt đầu Goal là **legacy local milestone 96/100** và **Reforge
0/100 task được nghiệm thu**. Nội dung đang learner-visible: HSK0 4/4 (rich
0/4), HSK1 40/40, HSK2 40/40, HSK3 55/55, HSK4 78/78; rich HSK1-4 213/213.
Không tự tăng hoặc giảm các số này nếu chưa có audit/migration evidence.

ChineseSkill chỉ là benchmark về taxonomy chức năng, luồng học và ngưỡng chất
lượng. Tuyệt đối không sao chép source code, layout/pixel, text bài học, câu hỏi,
audio, video, ảnh, dữ liệu đóng, tên thương mại hoặc asset của ChineseSkill.
Mọi nội dung/UX của HANZI.OS phải nguyên bản hoặc có license/provenance rõ.

## Cách tự cày 100 task

- Dùng `docs/RESTRUCTURE_MASTER_PLAN.md` làm task ledger duy nhất. Thực hiện theo
  dependency; ưu tiên task ID thấp nhất đã sẵn sàng nhưng được phép chuyển sang
  task độc lập khác khi một task đang chờ external dependency.
- Trạng thái task chỉ gồm `PENDING`, `IN_PROGRESS`, `BLOCKED`, `DONE`. `DONE`
  nghĩa là đã được nghiệm thu (`ACCEPTED`) theo DoD, không chỉ đã viết code. Mỗi
  thời điểm chỉ một task tích hợp chính là `IN_PROGRESS`; subagent có thể làm
  các subtask độc lập của cùng milestone.
- Cập nhật trạng thái ngay trên dòng task trong master plan và đặt link evidence
  ngắn trong checkpoint. Task chưa có trạng thái tường minh được hiểu là
  `PENDING`; không tạo thêm một backlog cạnh tranh ở file khác.
- Không đánh dấu `DONE` chỉ vì code đã viết hoặc test unit xanh. Phải đối
  chiếu từng acceptance criterion, có evidence runtime/UI phù hợp và không có
  regression ở contract/migration liên quan.
- Dùng subagent chủ động cho research, content QA, repo audit và test độc lập
  khi chạy song song thực sự giúp nhanh hơn. Main agent vẫn phải tự đọc toàn bộ
  skill instruction và tài liệu nguồn bắt buộc, tự review kết quả trước merge.
- Làm theo vertical slice nhìn thấy được: foundation/design system → shell/core
  loop → lesson activity → review/progress → booster/assessment/account. Tránh
  dàn trải 20 màn hình nửa hoàn thành.
- Không vá thẩm mỹ rời rạc lên legacy shell, không thêm ẩn dụ/menu/dashboard mới
  ngoài master plan. “Hệ thống thức tỉnh hologram” chỉ là lớp hình ảnh và phản
  hồi; nhãn navigation/tác vụ phải rõ bằng tiếng Việt.
- Giữ stable IDs, versioning, idempotency, FSRS, local progress, offline restore,
  account ownership và authorization. Không làm mất hoặc reset dữ liệu học cũ.
- Không refactor kiến trúc ổn định chỉ để code đẹp hơn. Trước khi xóa legacy
  code/artifact, dùng `rg` xác nhận consumer, có migration path và regression
  test. Không dùng force flag để bỏ qua gate.
- Không expose/unlock/recommend/count nội dung chưa `UI-INTEGRATED`. Nội dung
  AI-assisted giữ `humanReviewed: false` cho đến khi có review thật.
- XP, streak, exposure, độ phủ và mastery phải tách biệt. Không suy kỹ năng này
  từ evidence kỹ năng khác. Browser TTS không phải evidence nói/phát âm; nhận
  dạng chữ không phải evidence viết nét.
- Với mock exam, chỉ dùng cấu trúc/mẫu chính thức được công khai hợp lệ và item
  nguyên bản. Không lấy đề thi/câu hỏi có bản quyền từ nguồn không rõ license.

## Skill routing bắt buộc khi phù hợp

- `browser:control-in-app-browser`: research nguồn chính thức, smoke local web,
  luồng keyboard/mobile và chụp evidence. Ưu tiên source chính thức, ghi rõ
  observed/claimed/unverified và ngày kiểm tra.
- `ui-ux-pro-max`: information architecture, UX audit, design direction và
  anti-pattern. Máy đã có CPython 3.13.14 qua `uv`; Python helper của skill đã
  được xác minh chạy được. Dùng helper để tra cứu có mục tiêu, không coi kết quả
  heuristic là quyết định sản phẩm nếu chưa đối chiếu Product Vision/acceptance.
- `ui-styling` và `design-system`: token, component, responsive, contrast,
  focus, touch target, reduced motion và visual consistency của Reforge.
- `computer-use:computer-use`: chỉ khi cần kiểm thử app/IME/microphone hoặc ứng
  dụng Windows đang có. Python đã được cài trong lượt chuẩn bị này theo yêu cầu
  của tôi; các phần mềm/package hệ thống khác vẫn không được tự cài, mua gói,
  đăng nhập hay thay đổi tài khoản bên ngoài nếu chưa có xác nhận cụ thể.

Main agent phải đọc trọn `SKILL.md` của skill được dùng trước khi hành động và
thông báo ngắn trong commentary khi skill ảnh hưởng đến cách làm. Không cài
plugin/skill từ xa theo cơ hội; chỉ cài khi task thật sự cần, nguồn đáng tin và
đúng quy tắc xác nhận.

## Gate, evidence và commit

- Trước mỗi task: đọc acceptance/dependency, kiểm tra `git status`, xác định file
  user-owned. Repo hiện có `docs/reports/` và `output/` untracked của người dùng:
  không sửa, xóa, di chuyển, stage hay commit chúng.
- Trong lúc làm chỉ chạy validator/Vitest/Playwright trực tiếp của phần đổi.
  Nếu đổi TypeScript/runtime/UI, chạy `npm run typecheck` hoặc `npm run build`
  theo rủi ro. Với shared UI/performance phải kiểm reduced-motion/mobile và chạy
  Lighthouse ở ranh giới release candidate theo `AGENTS.md`.
- Tại ranh giới unit/milestone đã đủ targeted gate, chạy đúng full gate được
  `AGENTS.md` yêu cầu (`npm run check`, `npm run test:e2e`; audit/Lighthouse khi
  có lý do). Không chạy `verify:production` trong critical path và không sửa nó
  để biến fail-closed thành pass.
- Browser smoke phải kiểm hành trình thật, không chỉ trang render: onboarding,
  CTA, hoàn thành activity, feedback, review/progress, reload/restore, keyboard,
  viewport mobile và reduced motion theo acceptance task.
- Commit theo coherent milestone lớn, không commit từng chỉnh CSS nhỏ. Trước
  commit chạy `git diff --check`, rà staging không có file tạm/build/report.
- Mỗi commit cập nhật đồng thời `docs/RESTRUCTURE_MASTER_PLAN.md` và
  `docs/IMPLEMENTATION_CHECKPOINT.md`. Chỉ cập nhật
  `docs/HSK4_GRADUATION_PLAN.md` khi content inventory/migration contract đổi;
  nếu đổi quy trình content thì cập nhật cả `docs/CONTENT_DELIVERY_PLAYBOOK.md`.
- Commit message mô tả kết quả người học nhìn thấy. Không push/deploy nếu tôi
  chưa yêu cầu.

## Quy tắc tiến độ và báo cáo

Mỗi checkpoint có ý nghĩa phải báo bằng ngôn ngữ non-tech:

- **Đã thêm cho người học:** hành trình/tính năng/nội dung nào dùng được.
- **Task:** ID vừa `DONE`/được nghiệm thu, evidence chính, X/100 accepted.
- **Nội dung UI:** HSK0 X/4 (rich X/4), HSK1 X/40, HSK2 X/40,
  HSK3 X/55, HSK4 X/78 và rich HSK1-4 X/213.
- **Hai mốc:** legacy local milestone 96/100 (snapshot cũ, trừ khi correctness
  audit chứng minh phải điều chỉnh) và Reforge X/100 task accepted.
- **Đang làm:** đúng một vertical slice tiếp theo.
- **Còn vướng:** blocker kỹ thuật/nội dung/external thật và đường vòng đang làm.

Không lấy draft, inventory, generated JSON, số test, số dòng code hoặc màn hình
chưa nối runtime để cộng tiến độ. Không tuyên bố “parity”, “hoàn thiện” hoặc “đủ
HSK” nếu còn credential thật, native/human review, licensed media, thiết bị,
usability test hay dependency bên ngoài chưa có evidence. Hãy hoàn thành toàn bộ
task tự chủ có thể làm, giữ task phụ thuộc bên ngoài ở `BLOCKED`/`PENDING` với
điều kiện mở khóa cụ thể.

Tiếp tục Goal qua các lượt cho đến khi cả 100 task thực sự `DONE`/được nghiệm thu. Chỉ gọi
`update_goal(status: complete)` khi objective đã đạt và không còn việc bắt buộc.
Chỉ gọi `update_goal(status: blocked)` khi đúng ngưỡng blocked của công cụ: cùng
một blocker đã lặp ít nhất ba goal turn và không còn task độc lập nào có thể làm.
Không đánh dấu complete chỉ vì hết thời gian/context/budget. Khi Goal hoàn tất,
báo final token usage do công cụ trả về cùng kết quả cuối.

---

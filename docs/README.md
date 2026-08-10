# Bản đồ tài liệu HANZI.OS

Cập nhật: **10/08/2026**.

Repo đang ở giai đoạn **Reforge 2026**. Bộ tài liệu cũ ghi lại một foundation giàu
hạ tầng và 217 bài learner-visible, nhưng không còn được dùng để suy ra rằng trải
nghiệm đã gần hoàn thiện. Hãy dùng bảng dưới đây để tránh lấy nhầm lịch sử làm
spec hiện hành.

## Nguồn sự thật đang hoạt động

Đọc theo thứ tự:

1. [`IMPLEMENTATION_CHECKPOINT.md`](IMPLEMENTATION_CHECKPOINT.md) — trạng thái
   thật, số liệu baseline, freeze và việc đang làm.
2. [`PRODUCT_VISION.md`](PRODUCT_VISION.md) — phạm vi sản phẩm, trải nghiệm đích
   và definition of done.
3. [`CHINESESKILL_BENCHMARK.md`](CHINESESKILL_BENCHMARK.md) — nghiên cứu có nguồn,
   mức tin cậy, gap và ranh giới sở hữu trí tuệ.
4. [`RESTRUCTURE_MASTER_PLAN.md`](RESTRUCTURE_MASTER_PLAN.md) — 100 task,
   dependency, milestone và acceptance.
5. [`HSK4_GRADUATION_PLAN.md`](HSK4_GRADUATION_PLAN.md) — inventory nội dung
   legacy phải bảo toàn trong migration.
6. [`NEXT_GOAL_PROMPT.md`](NEXT_GOAL_PROMPT.md) — prompt bàn giao để bắt đầu Goal
   tự động ở lượt kế tiếp.

`AGENTS.md` ở root quy định cách mọi agent đọc và cập nhật các nguồn trên.

## Tài liệu hỗ trợ còn dùng

| Tài liệu | Vai trò hiện tại |
|---|---|
| [`CONTENT_DELIVERY_PLAYBOOK.md`](CONTENT_DELIVERY_PLAYBOOK.md) | Quy tắc authoring/validation legacy; sẽ được nâng cấp trong master plan. |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Bản đồ implementation hiện hữu, không phải target architecture cuối. |
| [`CONTENT_SYSTEM.md`](CONTENT_SYSTEM.md) | Tham chiếu pipeline/package hiện hữu để migration an toàn. |
| [`MASTERY_SYSTEM.md`](MASTERY_SYSTEM.md) | Tham chiếu evidence/FSRS hiện hữu; không phải công thức parity mới. |
| [`CONTENT_AUTHORING.md`](CONTENT_AUTHORING.md) | Hướng dẫn thao tác authoring hiện hữu. |
| [`THREAT_MODEL.md`](THREAT_MODEL.md) | Ràng buộc bảo mật cần giữ khi giản lược runtime. |

## Tài liệu lịch sử hoặc tạm hoãn

Các file dưới đây được giữ để tra cứu hoặc vì script/release evidence còn tham
chiếu. Chúng **không** được dùng để mở workstream mới nếu master plan không yêu
cầu:

- `FEATURE_RESEARCH.md`, `PRODUCT_REQUIREMENTS.md`: nghiên cứu/PRD trước Reforge;
- `HSK01_LOCAL_DEMO.md`, các file `HSK1_*`: lát cắt demo/review cũ;
- `PHASE1_OPERATIONS.md`, `PHASE2_EVIDENCE_OPERATIONS.md`, `WS9_ABUSE_CONTROLS.md`:
  vận hành foundation;
- `LOCAL_RELEASE_CANDIDATE.md`: quy trình/evidence release cũ đang có drift;
- `PRODUCTION_UPGRADE_PLAN.md`: production/commercial bị hoãn;
- `NEXT_SESSION_PROMPT.md`: con trỏ tương thích từ prompt cũ sang
  `NEXT_GOAL_PROMPT.md`;
- `adr/0001-d1-closed-alpha.md`: quyết định closed-alpha lịch sử.

Chỉ archive/xóa các file này ở task cleanup tương ứng sau khi `rg` xác nhận không
còn consumer và rollback/migration đã được kiểm chứng. Git history là nơi giữ
nhật ký chi tiết; các source of truth phía trên phải luôn ngắn, hiện hành và không
append log theo phiên.

## Cách hiểu tiến độ

- **Reforge parity:** số task `ACCEPTED` trên 100 trong master plan.
- **Content preservation:** số lesson learner-visible HSK0–4 còn mở được sau từng
  migration.
- **External readiness:** native review/audio/video, ASR, AI provider hoặc hosted
  sync được báo riêng; không được suy ra từ số task code.

Mốc foundation `96/100` chỉ là số lịch sử của roadmap cũ và không phải phần trăm
tương đương ChineseSkill.

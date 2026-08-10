# HANZI.OS Reforge

HANZI.OS là ứng dụng tự học Mainland Mandarin cho người Việt từ HSK0 đến HSK4,
chạy local-first trên web/PWA. Dự án đang được tái cấu trúc theo một lộ trình
100 task để biến foundation giàu dữ liệu hiện tại thành trải nghiệm học ngắn,
rõ và có chiều sâu. ChineseSkill chỉ là benchmark về công năng và phương pháp;
toàn bộ nội dung, mã nguồn, media và nhận diện của HANZI.OS phải là nguyên bản
hoặc có quyền sử dụng.

Chủ đề “hệ thống thức tỉnh hologram” là lớp thẩm mỹ tiết chế. Nhãn chức năng,
phản hồi và luồng học vẫn dùng tiếng Việt trực tiếp, dễ hiểu, không flicker hoặc
đưa thông báo kỹ thuật ra cho người học.

## Trạng thái hiện tại

- Baseline learner-visible: 4 bài HSK0 và 213 bài HSK1–HSK4.
- Inventory cần bảo toàn khi migration: 2.016 mục từ, 1.096 chữ và 332 điểm
  ngữ pháp.
- Mốc foundation cũ `96/100` là lịch sử, không phải mức hoàn thiện theo benchmark
  mới.
- Tiến độ Reforge bắt đầu từ `0/100 task ACCEPTED`; tiêu chí thật nằm trong
  [master plan](docs/RESTRUCTURE_MASTER_PLAN.md).
- Native audio/video, human review, chấm phát âm, AI provider và hosted sync được
  theo dõi như dependency riêng; repo không giả vờ đã có các tài sản đó.

## Chạy local

Yêu cầu Node.js **24.16.0** (xem `.node-version`; `package.json` cho phép từ 22.22.0) và
npm đi kèm.

```powershell
npm install
npm run dev
```

Sau đó mở URL localhost được terminal in ra. Lệnh `npm run dev` tự chuẩn bị D1
local cần thiết. Build cục bộ:

```powershell
npm run build
npm run start
```

Build thành công không phải bằng chứng dự án đã deploy hoặc production-ready.

## Bắt đầu làm việc

Đọc [bản đồ tài liệu](docs/README.md) và [AGENTS.md](AGENTS.md) trước khi sửa repo.
Nguồn sự thật hiện hành theo thứ tự:

1. [Implementation checkpoint](docs/IMPLEMENTATION_CHECKPOINT.md)
2. [Product vision](docs/PRODUCT_VISION.md)
3. [ChineseSkill benchmark](docs/CHINESESKILL_BENCHMARK.md)
4. [100-task restructure plan](docs/RESTRUCTURE_MASTER_PLAN.md)
5. [Content preservation plan](docs/HSK4_GRADUATION_PLAN.md)
6. [Prompt chạy Goal ở lượt kế](docs/NEXT_GOAL_PROMPT.md)

Không lấy draft, generated JSON, số test hoặc số dòng code làm tiến độ. Một task
chỉ được tính khi acceptance learner-facing, migration/evidence và kiểm tra liên
quan đều đạt.

## Ranh giới an toàn

- Guest/local phải học đầy đủ; đăng nhập chỉ phục vụ phục hồi và đồng bộ.
- Không sao chép lesson, media, screenshot, mascot, trade dress hoặc thuật toán
  độc quyền từ sản phẩm benchmark.
- Không gọi browser TTS là audio bản ngữ; không suy mastery nói từ transcript;
  không mở luyện nét khi thiếu dữ liệu stroke có provenance.
- Không stage/commit `docs/reports/`, `output/`, build output hoặc secret.
- `.openai/hosting.json`, production, commerce và deploy chỉ được mở lại khi có
  yêu cầu rõ ràng.

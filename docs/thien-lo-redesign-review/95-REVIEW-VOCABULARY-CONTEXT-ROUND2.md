# HSK3 · ngữ liệu và ba nhóm ngữ cảnh, lô 2

01/10/2026 · IN-REVIEW · humanReviewed:false.

Đọc current heads của campus-education, cohesion-reconstruction-01 và
plants-animals. Bổ sung chín trang trong ba bài: 冰箱/方便面 ở sinh hoạt ký túc
xá; 耳朵/耳机/懂得 ở câu chuyện đổi cách theo dõi tin; 常用/以上 ở yêu cầu ghi
chép khu vườn. Mỗi nhóm có mẫu Trung/Pinyin/Việt, giải thích, choice và vận
dụng khác ngữ cảnh bằng rubric. Giữ 217 bài và toàn bộ trang cũ.

Sửa mười mục từ: 冰箱, 方便面, 懂得, 耳朵, 耳机, 常用, 以上, 认得, 牙, 瓶子.
Không giữ mẫu động tai/hiểu ý thiếu tự nhiên; 认得 nhận ra người trong ảnh;
牙 dùng đau răng, không tuyên bố quy tắc dùng đũa tuyệt đối; 瓶子 tách chai vỡ
khỏi lý do cần tới bệnh viện. 以上 giải thích quy định tính cả mốc, đồng thời
phân biệt với lời nói ước lượng; không tự dịch thành “hơn” loại mốc.

AI rà Mandarin/collocation, Pinyin thanh nhẹ, nghĩa Việt, đáp án/rubric và
source word IDs. Chưa là human/native review; không nhận điểm năng lực từ tự
đối chiếu. Ba từ 认得/牙/瓶子 mới sửa ví dụ từ điển, chưa dạy/luyện đủ các nghĩa.

Apply local thành công: 13 revision, validation nội tại, bảo toàn 43 bảng,
immutable parents, heads ngoài lô và foreign keys. Backup:
.wrangler/demo-backups/before-vocabulary-context-round2-2026-10-01T12-20-46-132Z.sqlite.

Lesson heads mới:

- campus-education: 802c044a-afd5-4045-bbb6-21d545de69b0
- cohesion-reconstruction-lesson-01: 5877275e-5fa9-4ab0-ac53-6ae3068343ae
- plants-animals: a9d5f352-718f-4b7b-a948-b0220c14f023

Plan giữ source revisions/hash tại content/drafts/thien-lo-vocabulary-context-round2.json.
Source và release mang hậu tố vocabulary-context-round2. Không replay.

Xuất fallback 16 ví dụ từ published heads: 12 từ hai lô mới và bốn từ đã sửa
ở hồ sơ 27 (有时/过/着/游). Chỉ đọc bản đã phát hành, không replay lô cũ.
LocalReviewPage và AuthenticatedReviewPage lấy từ RELEASED_WORD_BY_ID; chưa
gắn fallback vào curriculum vì versioned delivery còn thiếu. Lỗi cũ giữ prompt/answer snapshot; không sửa
lịch sử người học. Nội dung bài mới giữ source IDs để dùng cơ chế hiện hành.

Không chạy browser, Vitest, typecheck, full check. Cổng 3000 có listener;
chưa dùng điều đó làm bằng chứng đã kiểm giao diện.

## Phát hiện cần xử lý tiếp

Đọc 70 ứng viên HSK4 đầu tiên trong triage: nhiều nghĩa máy dịch sai và ví dụ
meta không dạy cách dùng. Đối chiếu inventory với WORD_BY_ID: cả 1.000 từ HSK4
trong package nền có mẫu “是本课材料中的重点词语”; HSK1/2/3 không có mẫu này.
Ở thời điểm đọc, vocabulary projection chỉ có 18 mục đã phát hành, chưa có
các sửa HSK4 nói trên. Đây là thiếu hụt ví dụ của mục từ, không chứng minh
1.000 từ đều vắng khỏi bài học. Ưu tiên sửa nghĩa và ví dụ thực tế, sau đó
đối chiếu current lesson pages theo chủ đề; không lấy literal coverage làm đủ.

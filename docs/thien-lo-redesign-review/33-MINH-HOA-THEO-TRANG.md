# Minh họa theo bài và tình huống · 21/09/2026

Trạng thái: IN-REVIEW. Người dùng yêu cầu đa dạng ảnh, đúng chủ đề/bối cảnh; không coi năm ảnh chủ đề chung là đủ cho toàn kho.

## Cơ chế đã bổ sung

Mỗi trang có thể lưu `illustration: {src, alt, provenance}`. Reader dùng ảnh đó cho cảnh và header của trang; khi không có vẫn đọc được tài liệu cũ. Xưởng chọn cảnh trong kho, tải/chọn ảnh từ thư viện media, sửa mô tả, bỏ ảnh riêng hoặc nhân bản trang. Ảnh thuộc dữ liệu trang, không gắn cứng vào component của một bài.

Đường dẫn phải là ảnh nội bộ, có mô tả và nguồn sử dụng. Media tải lên tiếp tục qua repository hiện hành; kiểm tham chiếu bằng URL trong payload giữ được quan hệ sử dụng. Không thay revision đã phát hành hoặc reset phiên cũ.

## Ba asset mới

| Tệp trong public/lessons/ngoc-dien | Bối cảnh | Bài nháp dùng |
|---|---|---|
| study-preparation-v1.webp | Chuẩn bị sách vở ở nhà, nghe lời nhắn | hsk2-dictation-lesson-01 |
| station-meeting-v1.webp | Hai bạn gặp nhau ở cửa ga | hsk2-dictation-lesson-02 |
| classroom-change-v1.webp | Giáo viên hướng dẫn chuyển phòng học | hsk2-dictation-lesson-03 |

Nguồn: built-in OpenAI imagegen, sinh mới ngày 21/09/2026; AI-assisted, `humanReviewed:false`. Ảnh gốc giữ trong `.codex/generated_images/01a08f32-76fa-7e41-a05a-022b4803be88`, bản WebP quality 85 nằm trong dự án. Không sử dụng stock hoặc hình đóng từ benchmark. Đây là minh họa bối cảnh, không làm đáp án về giờ, tầng, hướng đi hoặc số đồ vật. Ảnh chuẩn bị có màn hình điện thoại với biểu tượng không chữ; ảnh chuyển lớp thể hiện hành lang và lan can, không có số tầng.

## Prompt sản xuất

Đều yêu cầu illustration-story, landscape 3:2, full bleed, painterly editorial, fine ink lines, muted jade, warm ivory, restrained soft gold; không chữ, logo, watermark, UI overlay, border hoặc panel trống.

1. Station: contemporary Chinese railway-station entrance meeting point; two young adult friends locating each other, one waiting outside checking a phone, other arriving on pedestrian walkway; glass doors, transit canopy, urban trees, travel bags. Visually distinct from university campus. Context only, avoid prominent left/right cues and clocks.
2. Preparation: close three-quarter slightly overhead view of student's hands packing books, notebook and pens in canvas bag beside desk; phone with unreadable voice message, contemporary apartment. Focus preparation/belongings, no numbers or visible clock; quantities are not answer cues.
3. Classroom change: wide architectural interior at staircase landing in contemporary language school; teacher with notebook gestures to adult students moving to another corridor; doorway behind has cleaning equipment/chairs being arranged. Ivory plaster, jade railings, honey wood, afternoon light; no floor labels, clocks, readable signs or arrows.

## Phạm vi còn lại

Ba ảnh này chưa giải quyết minh họa cho toàn bộ 217 bài. Cần rà bối cảnh từng bài đã xuất bản, thêm cảnh tương ứng và phát hành revision mới theo quy trình; không thay ảnh ngẫu nhiên để tăng số lượng. Bài đọc/viết cần ngữ liệu cụ thể; bài vị trí cần sơ đồ đúng; bài không hưởng lợi từ tranh có thể dùng dữ kiện/sơ đồ. Chưa tuyên bố toàn kho đã đa dạng hoặc tất cả asset đã human review.


## Bổ sung ảnh theo bài đã phát hành

Sáu asset nữa trong cùng thư mục: `polite-help-v1.webp` (survival-1), `pets-introduction-v1.webp` (survival-5), `clothes-opinion-v1.webp` (survival-6), `conversation-invitation-v1.webp` (survival-7), `phone-callback-v1.webp` (survival-8), `morning-routine-v1.webp` (survival-9). Prompt đầy đủ và nguồn built-in imagegen lưu tại `content/drafts/lesson-scene-generation-2026-09-21.json`. Tất cả AI-assisted, humanReviewed:false. Ảnh đã xem trực tiếp trước nhập; nét mặt/khung cảnh phục vụ tình huống, không làm bằng chứng quan hệ gia đình, mastery hoặc dữ kiện số.

Sáu bài này đã có revision ảnh riêng phát hành local, chỉ đổi `illustration` tại trang context; các trang hội thoại khác chưa được coi là đã có ảnh riêng. Plan `thien-lo-survival-scene-revisions-v1.json` giữ hash và revision nguồn. Script phát hành từ chối nếu nguồn thay đổi hoặc đã có nháp biên tập mới; fork qua repository, validate, transition và release worker. Không sửa bản đã phát hành tại chỗ. Rehearsal/apply bảo toàn 36 bảng và FK, runtime khớp ảnh. Backup `before-lesson-scene-revisions-2026-09-21T16-41-55-009Z.sqlite`.

Audit toàn 217 bài ở `lesson-visual-audit.json`, tạo bằng `audit-lesson-visuals.mjs`: 78 bài có authored pages, sáu bài có ảnh riêng đã phát hành, còn 142 trang scene/dialogue dùng ảnh chủ đề chung. Mọi bài vẫn cần kết luận biên tập toàn bài; chỉ có một ảnh riêng chưa chứng minh đủ media.

Xưởng đã kiểm browser chọn ba ảnh khác nhau → lưu → reload → preview đúng từng ảnh (25.5 giây). Sau khi xem screenshot, sửa thanh lưu để không đè navigation của preview; đang kiểm lại. Luồng dictation browser đạt 13 giây, các kiểm schema/session/manuscript đạt 13 tests. Chưa phát hành ba bài dictation, không đếm chúng vào 78 authored.


## Ngày 22/09 · ba bài survival còn lại

Đã tạo/gắn/phát hành local `pronoun-group-v1.webp` (survival-2), `fictional-profile-v1.webp` (survival-3), `family-album-v1.webp` (survival-4). Prompt đầy đủ tại `content/drafts/lesson-scene-generation-2026-09-22.json`. Plan nguồn `thien-lo-survival-remaining-scenes-v1.json`. Chín bài survival nay có cảnh mở đầu riêng; lời thoại các trang sau chưa tự đổi ảnh theo một quy tắc ngầm. Hình album chỉ minh họa trao đổi trong gia đình, không dùng suy chính xác quan hệ của tất cả nhân vật từ vẻ ngoài.

Rehearsal/apply ba revision bảo toàn 36 bảng/FK. Audit hiện tại: chín bài có ảnh trang riêng, 139 trang còn dùng ảnh chủ đề. Browser sáu revision trước đã đạt cùng luồng bài tập toàn nhóm và footer Xưởng hết bị thanh lưu che. Đợt ba revision sau cũng đạt browser toàn nhóm chín bài trong 1.1 phút, gồm tải ảnh, payload, bài tập sai→đúng và footer ở ba viewport. Bản gốc 217 bài/78 authored giữ nguyên.

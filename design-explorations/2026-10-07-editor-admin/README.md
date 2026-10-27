# Editor & Admin — bộ ý tưởng giao diện

Trạng thái: **IN-REVIEW — chờ người dùng chọn hướng; chưa code, chưa USER-ACCEPTED.**

Ba hướng mỹ thuật, mỗi hướng có một ảnh Editor và một ảnh Admin. Mỗi ảnh gồm ba trang mẫu. Ảnh do công cụ ImageGen tích hợp tạo; chữ nhỏ và số liệu chỉ minh họa, không phải bằng chứng tính năng đã triển khai hoặc dữ liệu vận hành thật.

| Hướng | Đặc điểm | Phù hợp |
| --- | --- | --- |
| A · Ngọc Lệnh | Shell xanh rừng, nội dung ngà, viền vàng, điểm ngọc | Gần giao diện người học HANZI.OS |
| B · Bạch Ngọc | Nền ngà sáng, xanh celadon, mực xanh đậm | Soạn và đọc nội dung dài |
| C · Thiên Văn | Xanh đêm, bảng xanh đá, lam sáng, nét thiên văn | Cảm giác hệ thống hologram rõ hơn |

## Trang được minh họa

Editor: Bàn làm việc; Soạn bài học; Soạn sách nhiều chương.

Admin: Tổng quan; Duyệt nội dung; Tài khoản & quyền.

## Cấu trúc đề xuất để giữ đủ chức năng

### Editor / Biên Tập Viện

- **Bàn làm việc:** việc được giao, tiếp tục bản nháp, tạo nội dung theo năm nhóm chuyên môn hiện có.
- **Nội dung của tôi:** tìm kiếm, lọc loại/cấp/trạng thái, phân trang, thao tác kiểm tra/gửi duyệt nhiều mục theo quyền. Tách khỏi màn tạo mới.
- **Kho học liệu:** năm nhóm Bài học & kiến thức, Giao tiếp & phát âm, Hán tự, Bài đọc, Luyện đề. Giữ các loại bài học, từ vựng, ngữ pháp, chức năng giao tiếp, phát âm, Hán tự, bài đọc, bộ sách, câu hỏi và bộ đề.
- **Bàn soạn:** thông tin chung → nội dung/hoạt động → xem trước → kiểm tra & gửi duyệt. Bài dài có mục lục trang. Chỉ sửa một khối tại một thời điểm; thêm/sắp xếp bằng nút, không bắt buộc kéo thả.
- **Học liệu trong bàn soạn:** ảnh, âm thanh, sơ đồ; nguồn/quyền sử dụng nằm trong chi tiết học liệu. Nhãn AI hỗ trợ/chưa được người duyệt và nguồn nét viết vẫn được giữ.
- **Sách nhiều chương:** tách bản thảo, bản dịch, thông tin sách; mục lục chương và câu hỏi đọc hiểu. Không dồn toàn bộ chương và mọi biểu mẫu lên một trang dài.
- **Luyện đề:** ngân hàng câu hỏi → ghép bộ đề theo kỹ năng → xem trước/kiểm tra. Quyền miễn phí/Premium là mục riêng và chỉ thao tác theo quyền.
- **Chi tiết hỗ trợ:** mục tiêu kỹ năng, liên kết bài/từ/câu hỏi, phạm vi ảnh hưởng, lịch sử và phản hồi mở khi cần. Không xóa chức năng để giảm độ rối.

### Admin / Cổng Quản Trị

- **Tổng quan:** số liệu vận hành thật khi triển khai, việc cần ưu tiên; một hành động chính đi tới hàng chờ. Không dùng XP/coverage làm mastery.
- **Công việc:** danh sách tìm kiếm/lọc; mở một việc để chọn người phụ trách, người duyệt độc lập và hạn xử lý.
- **Kho nội dung:** nội dung người học đang dùng tách với bản nháp trong Xưởng; không nhầm số bản nháp với inventory.
- **Duyệt:** danh sách chờ → chi tiết xem trước/thay đổi/kiểm định → phê duyệt hoặc yêu cầu sửa. Người duyệt không được giả định là người soạn.
- **Phát hành:** danh sách đã duyệt → xem ảnh hưởng → xác nhận phát hành; theo dõi tình trạng và khôi phục ở trang riêng. Không gộp duyệt và phát hành thành một nút.
- **Tài khoản & quyền:** danh sách → chi tiết tài khoản/quyền. Khóa tài khoản và thao tác nhạy cảm tách khỏi hành động thường ngày; giữ xác nhận danh tính và kiểm quyền máy chủ.
- **Phiên đăng nhập:** thiết bị, phiên và thu hồi phiên theo quyền.
- **Premium thử nghiệm:** tách Gói & giá / Quyền truy cập / Ví & giao dịch / Hỗ trợ. Giữ tính chất local thử nghiệm; không mở thanh toán thật.
- **Cấu hình** và **Nhật ký hoạt động:** giữ trang riêng, nhãn phổ thông, chi tiết kỹ thuật chỉ mở khi cần.

## Nguyên tắc triển khai sau khi chốt

- Giữ bản sắc hệ thống/tu luyện ở tên khu và mỹ thuật, nhãn tác vụ dùng tiếng Việt rõ nghĩa.
- Header và thanh hành động ở trong viewport, chỉ phần giữa cuộn trong bàn soạn/duyệt.
- Mobile dùng điều hướng thu gọn, danh sách thẻ thay bảng rộng, tab xem trước thay cột kép. Chưa có ảnh mobile trong bộ này; cần kiểm riêng khi triển khai.
- Mỗi màn hình một CTA chính; nút tối thiểu 44×44; focus rõ, trạng thái có chữ, tương phản WCAG AA và reduced-motion cần được kiểm bằng giao diện thật.
- Giữ draft/validate/submit/approve/publish riêng; không cấp thêm quyền theo hình mockup.
- Không thay đổi dữ liệu, IDs, completion, streak, saved, FSRS, mistakes, session, outbox, owner/reset hoặc `.wrangler` trong lượt thiết kế này.

## Cơ sở kiểm kê

Đã đọc checkpoint liên quan và đối chiếu `app/studio`, bàn soạn revision, sách nhiều chương, luyện đề; shell Admin và các route Tổng quan, Công việc, Kho nội dung, Duyệt & phát hành, Tài khoản & quyền, Phiên đăng nhập, Cấu hình, Nhật ký, Premium. Tham chiếu hình learner đã lưu tại `design-explorations/2026-09-10-thien-co-kinh-v2/implemented-1440.png` (không coi là ảnh live hiện tại).

Đây là lượt thiết kế hình ảnh, chưa audit browser tương tác hoặc chạy gate runtime. Không sửa mã ứng dụng, checkpoint nghiệm thu, `docs/reports/` hay `output/`.

Tiếp theo: người dùng chọn A/B/C cho từng vai trò hoặc chọn phối hợp; sau đó mới thiết kế chi tiết/triển khai vertical slice được chọn.

## Lưu ý sau khi xem ảnh

- Một số chữ nhỏ, Pinyin, ngày tháng và ví dụ tiếng Trung do ImageGen dựng có thể sai; không nhập chúng vào nội dung học.
- Logo/ấn, avatar và cảnh trong mockup chỉ là ý tưởng. Khi triển khai giữ nhận diện HANZI.OS đã chọn, không tự thay logo theo từng ảnh.
- Dòng “Đã lưu tự động” ở mẫu A là đề xuất hình ảnh, không xác nhận autosave hiện có; nếu triển khai phải gắn đúng trạng thái lưu được xác nhận.
- Nút “Thêm hoạt động” nên là hành động phụ, tránh cạnh tranh với “Lưu bản nháp”.
- Kết quả kiểm tra tự động không đồng nghĩa nội dung đã được người duyệt. Chỉ mở phê duyệt khi các gate và quyền hiện hành cho phép.
- Mẫu C thực tế dùng nền soạn sáng trong khung xanh đêm; đây là biến thể hỗn hợp sáng/tối, không phải toàn bộ giao diện dark mode.
- Ba trang trên mỗi ảnh là bản trình bày thu nhỏ. Chưa kiểm kích thước chữ, touch target, tương phản hay responsive bằng trình duyệt.

Prompt đầy đủ nằm trong `PROMPTS.md` cùng thư mục.

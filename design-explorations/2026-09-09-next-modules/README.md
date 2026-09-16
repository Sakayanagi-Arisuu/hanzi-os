# Chọn mẫu HANZI.OS

13 bảng concept tạo bằng imagegen tích hợp; 29 màn/phác thảo gồm 20 màn Thiên Cơ Kính, 4 màn bài học, 1 trang giới thiệu dài, 4 màn tài khoản. Không đổi code ứng dụng.

- [01-ngoc-lenh](01-ngoc-lenh.png)
- [02-thien-van-dai](02-thien-van-dai.png)
- [03-cong-hoi](03-cong-hoi.png)
- [04-thuy-mac](04-thuy-mac.png)
- [05-luu-ly](05-luu-ly.png)
- [06-tu-vi](06-tu-vi.png)
- [07-thanh-dong](07-thanh-dong.png)
- [08-truc-lam](08-truc-lam.png)
- [09-xich-kim](09-xich-kim.png)
- [10-bang-ngoc](10-bang-ngoc.png)
- [11-thien-lo-bai-hoc](11-thien-lo-bai-hoc.png)
- [12-gioi-thieu](12-gioi-thieu.png)
- [13-tai-khoan](13-tai-khoan.png)

## Lưu ý khi triển khai

- Ảnh là mẫu thẩm mỹ, không phải bằng chứng dữ liệu người dùng. Số liệu, chữ Hán, Pinyin và nhãn trạng thái phải lấy từ nguồn ứng dụng và rà lại.
- Một số ảnh tự thêm phút học, lịch sử hoặc so sánh; phải audit consumer trước khi triển khai, không tạo chỉ số giả.
- Trang giới thiệu vẽ nhầm Văn hoá trong bảy kỹ năng; phải thay bằng Âm/Pinyin, và sửa copy chấm nói theo khả năng thực tế (không tuyên bố chấm thanh điệu độc lập).
- Thiên Lộ: phần giải thích 你好 bị AI diễn giải quá mức thành lời chúc; dùng nghĩa chào hỏi và giải thích đã duyệt, không sao chép nguyên văn.
- Auth: khôi phục qua email là đề xuất, chưa xác nhận backend; đăng ký trong ảnh không có email nên phải thiết kế lại đồng bộ phương thức khôi phục trước triển khai.
- Không cam kết pixel-identical mọi viewport. Dùng ảnh nền riêng, còn chữ, nút, biểu đồ dựng bằng code.

Prompt đầy đủ: [PROMPTS.md](PROMPTS.md).

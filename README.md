# HANZI.OS

**Ứng dụng tự học tiếng Trung dành cho người Việt — từ làm quen chữ Hán đến HSK4.**

HANZI.OS kết hợp bài học, ôn tập ngắt quãng, luyện nghe nói, luyện viết và đọc hiểu trong một giao diện mang phong cách tu luyện. Ứng dụng chạy trên trình duyệt, ưu tiên lưu tiến độ trên thiết bị và hỗ trợ cài dưới dạng PWA.

## Chức năng

| Khu học | Bạn có thể làm gì? |
| --- | --- |
| **Thiên Lộ** | Học theo lộ trình HSK0–HSK4, luyện từ vựng, ngữ pháp và bài tập trong từng bài. |
| **Khảo Nghiệm Căn Cơ** | Làm bài khảo sát để chọn điểm bắt đầu phù hợp. |
| **Ký Ức Trận** | Ôn từ vựng theo lịch FSRS, tiếp tục các thẻ đến hạn. |
| **Nghịch Cảnh Lục** | Xem lại lỗi đã gặp và quay lại nội dung cần luyện. |
| **Vạn Âm Điện** | Luyện Pinyin, thanh điệu, nghe và nói; đánh giá phát âm khi đã cấu hình dịch vụ hỗ trợ. |
| **Thần Văn Lộ** | Tra cấu tạo chữ Hán, xem thứ tự nét và luyện viết với dữ liệu nét có sẵn. |
| **Vạn Quyển Các** | Đọc truyện, tra từ trong ngữ cảnh và luyện đọc hiểu. |
| **Phòng Luyện Đề** | Làm đề luyện tập, theo dõi kết quả và xem lại bài làm. |
| **Tàng Tự Khố** | Tra chữ Hán, Pinyin hoặc nghĩa Việt; nhận gợi ý khi gõ, lưu từ, xem lịch sử tra và tự ôn. |
| **Thiên Cơ Kính** | Theo dõi hoạt động, xem dấu chân luyện tập theo kỹ năng và lọc nhật ký học tập. |
| **Tài khoản & dữ liệu** | Đổi ảnh đại diện, quản lý phiên đăng nhập, đồng bộ, sao lưu và phục hồi dữ liệu. |

Kho bài học gồm 217 bài: HSK0 (4), HSK1 (40), HSK2 (40), HSK3 (55), HSK4 (78). Nội dung và một số chức năng phụ thuộc quyền truy cập tài khoản; số bài hoàn thành không phải chứng nhận trình độ HSK.

## Cài đặt và chạy

### Yêu cầu

- **Node.js 24.16.0**, theo [.node-version](.node-version).
- **npm 11.13.0**, theo `packageManager` trong [package.json](package.json).
- Git và trình duyệt hiện đại như Chrome, Edge hoặc Cốc Cốc.

### Chạy bản local ổn định

Mở terminal tại thư mục bạn muốn lưu dự án. Các lệnh dưới đây dùng được trên Windows, macOS và Linux:

```sh
git clone https://github.com/Sakayanagi-Arisuu/hanzi-os.git
cd hanzi-os
npm ci
npm run build:offline-local
npm run dev:stable
```

Mở **[http://localhost:3000](http://localhost:3000)**.

Lần chạy đầu, ứng dụng tự áp dụng các migration vào cơ sở dữ liệu local. Bạn có thể bắt đầu với hồ sơ khách hoặc tạo tài khoản HANZI.OS local. Không cần tài khoản Cloudflare hay khóa dịch vụ bên ngoài để chạy phần học local cơ bản.

Đây là chế độ dùng bản build, không có hot reload. Khi mở lại dự án, chỉ cần `npm run dev:stable`. Sau khi cập nhật mã nguồn, chạy lại:

```sh
git pull --ff-only
npm ci
npm run build:offline-local
npm run dev:stable
```

Dừng server trước khi build hoặc khởi động lại. Nếu cổng 3000 đã được dùng:

```sh
npm run dev:stable -- --port 3005
```

Sau đó mở `http://localhost:3005`. Hồ sơ khách được lưu theo địa chỉ trình duyệt; dùng lại cùng hostname và cổng để tiếp tục tiến độ cũ.

### Chế độ phát triển

```sh
npm run dev
```

Chế độ này hỗ trợ hot reload và cũng dùng cổng 3000. Nếu gặp lỗi render `Network connection lost` trong môi trường dev, dừng server rồi dùng hai lệnh `build:offline-local` và `dev:stable` ở trên. Không chạy hai server trên cùng cổng.

### Dịch vụ tùy chọn

- **Đánh giá phát âm:** cần cấu hình Azure AI Speech.
- **AI hỗ trợ đọc hiểu:** cần cấu hình Gemini.
- **Đăng nhập Google, GitHub hoặc Facebook:** cần cấu hình nhà cung cấp tương ứng; tài khoản HANZI.OS local không cần các nhà cung cấp này.

Tham khảo [.dev.vars.example](.dev.vars.example) và [hướng dẫn chạy local](docs/TESTING.md). Chỉ thêm thông tin dịch vụ bạn sử dụng vào `.dev.vars`; không đưa khóa bí mật vào Git.

## Tiến độ và sử dụng ngoại tuyến

- Tiến độ khách nằm trong localStorage/IndexedDB của trình duyệt. Tài khoản local sử dụng cơ sở dữ liệu trong `.wrangler/state`.
- Bản clone mới chứa mã nguồn và học liệu, **không chứa tài khoản, khóa API hoặc tiến độ cá nhân** của máy khác.
- Mở ứng dụng khi có mạng để chuẩn bị học liệu. Kiểm tra trạng thái tại **Tài khoản & dữ liệu → Học ngoại tuyến & cập nhật** trước khi học offline.
- Dùng các công cụ sao lưu trong ứng dụng trước khi chuyển máy hoặc xóa dữ liệu trình duyệt. Bản xuất tiến độ và bản sao nhật ký có phạm vi khác nhau; giao diện mô tả rõ dữ liệu được giữ.

## Kiểm tra dự án

```sh
npm run typecheck
npm run test
npm run check
```

`check` gồm kiểm tra kiểu, lint, học liệu, cơ sở dữ liệu, phục hồi dữ liệu, test và build. Hướng dẫn kiểm thử qua trình duyệt nằm trong [docs/TESTING.md](docs/TESTING.md).

## Tài liệu

- [Cách chạy và kiểm thử](docs/TESTING.md)
- [Kiến trúc ứng dụng](docs/ARCHITECTURE.md)
- [Danh mục tài liệu](docs/README.md)

Nội dung có hỗ trợ AI và đang được rà soát. Giọng đọc tổng hợp, tự ôn và số lượt hoạt động hỗ trợ việc học; chúng không thay thế đánh giá phát âm hay chứng nhận năng lực. Bản local dành cho học tập và phát triển, không phải cấu hình triển khai dịch vụ công khai.

# Thiên Cơ Kính · Ngọc Lệnh

Người dùng chốt concept Ngọc Lệnh và yêu cầu triển khai trong nội dung module, giữ nguyên AppShell/header/sidebar. Concept được lưu ở `design-explorations/2026-09-10-thien-co-kinh-v2/01-ngoc-lenh.png`. Các số trong concept chỉ minh họa; runtime dùng dữ liệu hiện hữu.

Hai tranh nguyên bản tạo bằng imagegen tích hợp, không lấy tài sản bên ngoài. Chữ, chỉ số, biểu đồ và nút được dựng bằng HTML/CSS/Lucide, không nhúng ảnh chụp UI. Xuất WebP rộng 1800 px, chất lượng 86 bằng sharp; không chỉnh nội dung tranh sau sinh.

- `public/analytics/oracle-asset-v1.webp`: gương ngọc và sơn thủy, 171646 byte.
- `public/analytics/oracle-gateway-v1.webp`: thư án và cuộn giấy, 157200 byte.

## Prompt tranh đầu trang

Create an original premium Chinese jade scholarly landscape artwork for a website header, panoramic 3:1 composition. Deep emerald and teal lacquer background, delicate misty ink mountains along bottom, bamboo branches along far right and upper corners, very fine champagne gold botanical linework. Main focal point at 68% horizontal: a large luminous milky pale jade circular mirror disc standing among mountain peaks, delicate concentric gold instrument rings surrounding disc. Disc surface subtle stone texture NO text, no letters. Left 45 percent calm very dark emerald negative space for title overlay. Right edge gentle jade clouds. Aesthetic closely matches luxurious Ngọc Lệnh HANZI.OS selected design. Museum quality illustrative Chinese fantasy ink painting, intricate but restrained, luminous jade highlights balanced dark green. Flat artwork only, NO website UI, NO panels, NO borders, NO logos, NO typography, NO mockup.

## Prompt thư án

Original Chinese scholarly jade fantasy panoramic website section banner, 4:1 ultra-wide composition. Deep emerald dark teal background left 60 percent calm dark negative space with faint misty mountains. At far right antique scholarly desk with elegant unfurled cream scrolls, brush stand, carved jade brush pot, bamboo leaves descending, warm delicate champagne gold accents. Intricate original ink-painting illustration, premium Ngọc Lệnh visual style, luminous soft pale jade mist, refined botanical gilded lines, subtle teal mountains bottom. No people, no text, no calligraphy, no letters, no user interface, no panels, no logo. Full bleed artwork only.

## Kiểm chứng

Typecheck, ESLint và test analyticsJourney/learningCoverage; E2E `analytics-jade.spec.ts` so sánh hình học/màu/font sidebar và header giữa Reader và Analytics, 7 trạng thái bằng chứng, 8 link module, mở/đóng chi tiết bằng keyboard, CTA và viewport mobile/desktop. Không sửa dữ liệu, auth, store, phép đo Căn Cơ hoặc quy tắc completion.

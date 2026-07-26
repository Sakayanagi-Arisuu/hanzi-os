# Chân trời thương mại hóa (tài liệu tham khảo)

Tài liệu này mô tả các chân trời sản phẩm dài hạn, không phải phase release có
thẩm quyền. Tên phase cũ đã được bỏ để tránh xung đột với
[`PRODUCTION_UPGRADE_PLAN.md`](./PRODUCTION_UPGRADE_PLAN.md), nguồn chuẩn cho
chín workstream, dependency order và release gate. Không dùng danh sách dưới đây
để mở nội dung, thêm commerce hay tuyên bố production.

## Nền prototype

- Design system và navigation sản phẩm.
- Onboarding, local profile và dashboard.
- Curriculum/lesson vertical slice.
- FSRS review, speech demo, Hanzi Writer, reader, dictionary, analytics.
- PRD, kiến trúc và content model.

## Chân trời A - Closed alpha (phủ Production Phase 1-2)

- Auth, cloud sync và event ingestion.
- Bootcamp + A0 hoàn chỉnh, 300-500 lexeme đã biên tập.
- Native audio, review đa modality, error taxonomy.
- Admin/CMS tối thiểu và content versioning.
- Analytics nội bộ, crash/error monitoring.

**Cổng ra:** 100 người dùng học 14 ngày; review không mất dữ liệu; D7 đủ để đánh giá.

## Chân trời B - Public beta (Production Phase 3)

- HSK sơ cấp, graded reader, placement và mock test đầu tiên.
- Speech scoring server beta, shadowing và tone-pair lab.
- Subscription, entitlement, billing sandbox và support tooling.
- Mobile PWA/offline; push notification có kiểm soát.

**Cổng ra:** retention, learning gain và willingness-to-pay đạt ngưỡng đã định trước.

## Chân trời C - Product-market fit (Production Phase 4)

- AI roleplay có rubric và safety.
- Nội dung theo mục tiêu du lịch/công việc/du học.
- Family plan, referral, season và guild.
- Experimentation platform và recommendation v2.
- iOS/Android nếu PWA không đáp ứng speech/offline.

## Chân trời D - Platform (sau khi Phase 4 có bằng chứng)

- Teacher dashboard, classroom, assignment và institution reporting.
- Author marketplace có review và revenue share.
- OCR/document reader, browser extension và import pipeline.
- Enterprise SSO, tenant controls và compliance.

## Team tối thiểu để đi production

- Product lead, engineering lead.
- 2-3 frontend/mobile, 2 backend/data, 1 ML/speech.
- 1 product designer, 1 QA/automation.
- 1 curriculum lead, 2 Mandarin linguists/content editors.
- Part-time native voice talent, legal/privacy và customer support.

## Mô hình doanh thu

- Free: path nền, review giới hạn hợp lý, dictionary cơ bản.
- Plus: offline, review nâng cao, reader catalog, không quảng cáo.
- Max: pronunciation analytics, AI roleplay, writing feedback.
- Family: nhiều hồ sơ và guardian insights.
- School/Enterprise: classroom, assignment, SSO, admin analytics.

Không bán “điểm”, không cho trả tiền để bỏ qua prerequisite năng lực và không tạo paywall làm người mới mất quyền học phát âm nền tảng.

# Kiến trúc kỹ thuật mục tiêu

## 1. Trạng thái hiện tại

Foundation là React + TypeScript + Vite, dùng local storage để chạy trọn luồng không cần backend. `ts-fsrs` phụ trách scheduling và `hanzi-writer` phụ trách animation/quiz nét.

## 2. Kiến trúc production đề xuất

```text
Web / iOS / Android
        |
API Gateway + BFF
        |
+-------+---------+------------+-------------+
| Identity        | Learning   | Content     |
| Subscription    | Memory     | Assessment  |
| Social          | Speech AI  | Notification|
+-------+---------+------------+-------------+
        |
PostgreSQL + Redis + Object Storage + Search + Event Bus
        |
Warehouse / Experimentation / Model Training / BI
```

## 3. Bounded contexts

- **Identity**: account, profile, consent, devices, guardian/child.
- **Curriculum**: course graph, prerequisites, variants, localization.
- **Content**: lexeme, sense, example, audio, lesson, story, license.
- **Learning**: session, attempt, hint, error taxonomy, mastery evidence.
- **Memory**: FSRS card state, review log, per-skill stability/difficulty.
- **Assessment**: test form, item bank, rubric, score, item statistics.
- **Speech**: upload, ASR, pitch/phoneme features, feedback artifact.
- **Commerce**: product, price, subscription, entitlement and invoice.
- **Social**: guild, league, season, moderation and anti-cheat.

## 4. Data model cốt lõi

```text
User -> Enrollment -> CourseVersion
CourseVersion -> Unit -> Lesson -> Activity
Lexeme -> Sense -> Example -> AudioAsset
Character -> Component -> StrokeData
UserSkillState(user, skill, mastery, confidence)
MemoryCard(user, knowledgeItem, modality, fsrsState)
Attempt(user, activityVersion, response, score, latency, feedback)
ReviewLog(card, rating, scheduledAt, reviewedAt)
```

Mọi activity và content phải versioned. Attempt luôn trỏ vào version đã thấy để giải thích lịch sử sau khi biên tập nội dung.

## 5. Event model

- `lesson.started`, `activity.answered`, `hint.used`.
- `pronunciation.submitted`, `pronunciation.scored`.
- `review.graded`, `lesson.completed`, `mastery.changed`.
- `quest.completed`, `subscription.changed`.

Event được ghi append-only, có idempotency key và schema version. Read models phục vụ dashboard, recommendation và analytics.

## 6. Adaptive learning

`NextBestAction` kết hợp:

1. Review quá hạn và xác suất quên.
2. Prerequisite chưa vững.
3. Mục tiêu và thời lượng còn lại trong ngày.
4. Cân bằng modality để tránh chỉ luyện recognition.
5. Tín hiệu mệt mỏi: latency, bỏ qua, lỗi liên tiếp.

Mô hình phải trả về reason code có thể giải thích cho người học.

## 7. Speech stack

Foundation dùng Web Speech API và luôn có fallback vì `SpeechRecognition` chưa đạt Baseline trên mọi trình duyệt. Production nên dùng pipeline server:

1. Client ghi âm và xin consent.
2. Voice activity detection và noise checks.
3. ASR Mandarin + forced alignment.
4. F0 contour, tone classification, initials/finals confidence.
5. Feedback generator tạo nhận xét hành động được.
6. Audio xóa theo retention policy hoặc lưu khi người dùng opt-in.

## 8. Bảo mật và riêng tư

- OIDC/OAuth 2.1, WebAuthn, rotating refresh token.
- Row-level authorization và tenant isolation cho School.
- Encryption in transit/at rest; secret manager; audit log.
- Consent riêng cho voice, personalization và research data.
- Export/delete account; data minimization cho trẻ em.

## 9. Vận hành

- Feature flags và experiment assignment ổn định.
- Content quality dashboard: item difficulty, distractor health, error rate.
- SLO, tracing, structured logging, replayable dead-letter queue.
- CI gồm typecheck, unit, contract, accessibility, visual regression và load test.

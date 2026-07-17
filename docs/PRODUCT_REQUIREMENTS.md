# Product Requirements Document

## 1. Tầm nhìn

HANZI.OS giúp một người Việt chưa biết tiếng Trung xây được năng lực giao tiếp, đọc và viết có thể đo lường, trong một hệ thống vừa hùng tráng vừa có kỷ luật học thuật.

## 2. Người dùng mục tiêu

- Người mới hoàn toàn cần lộ trình và giải thích bằng tiếng Việt.
- Sinh viên chuẩn bị HSK hoặc học tập tại Trung Quốc.
- Người đi làm cần tiếng Trung giao tiếp, thương mại hoặc kỹ thuật.
- Người học trung cấp cần graded content, shadowing và hội thoại.
- Giáo viên/lớp học cần giao bài, xem tiến độ và can thiệp.

## 3. North-star metric

**Số “năng lực có thể gọi lại và sử dụng” được duy trì sau 30 ngày**, không phải tổng XP hay tổng phút mở ứng dụng.

Các metric phụ:

- D1/D7/D30 learning retention.
- Tỷ lệ hoàn thành phiên học có ít nhất ba kỹ năng.
- Số review đúng hạn và tỷ lệ recall dự báo/thực tế.
- Tăng trưởng mastery theo nghe, nói, đọc, viết, từ, ngữ pháp.
- Tỷ lệ người dùng đạt milestone giao tiếp hoặc HSK đã chọn.

## 4. Luồng cốt lõi

### First-run

1. Chọn mục tiêu: giao tiếp, HSK, du học, công việc hoặc văn hóa.
2. Chọn nhịp 10/20/30 phút.
3. Chọn giản thể/truyền thống và mức pinyin.
4. Người mới đi vào Bootcamp phát âm; người đã học làm placement.

### Daily loop

1. Hệ thống tính `daily prescription` từ review đến hạn, điểm yếu và mục tiêu.
2. Người học hoàn thành một lesson mới, một review block và một output mission.
3. Feedback cập nhật mastery và tạo lịch review mới.
4. Dashboard giải thích rõ vì sao bước tiếp theo được đề xuất.

## 5. Epic sản phẩm

### Curriculum graph

- Chín cấp chuẩn, thêm Pre-HSK bootcamp.
- Prerequisite theo âm, từ, chữ, ngữ pháp và can-do statement.
- Path chính, path theo mục tiêu và personalized repair nodes.

### Lesson engine

- Meaning choice, pinyin reconstruction, tone identification.
- Listen-and-select, dictation, sentence ordering, cloze.
- Read aloud, shadowing, prompted speaking, free response.
- Hanzi tracing, recall writing, radical assembly.
- Explain-my-error và retry queue cuối bài.

### Memory engine

- FSRS cho lịch ôn.
- Memory state riêng theo `lexeme x skill`.
- Confusion graph cho từ gần âm, gần nghĩa hoặc gần hình.
- Interleaving và desirable difficulty có giới hạn.

### Pronunciation engine

- Pinyin bootcamp, initials/finals và four tones.
- Tone-pair matrix, tone sandhi, neutral tone.
- Waveform/pitch visualization, listen-compare-record.
- ASR transcript, phoneme alignment và feedback khẩu hình.

### Hanzi engine

- Stroke order, radicals, components và phonosemantic hints.
- Tracing -> guided recall -> blank recall.
- Simplified/traditional mapping.
- Similar-character discrimination.

### Reader and media

- Graded stories/news/dialogues có human audio.
- Karaoke sentence sync, speed control, AB loop.
- Tap dictionary, sentence mining, one-click SRS.
- Comprehension, retell và writing prompt.

### Conversation

- Scenario roleplay theo mục tiêu.
- AI tutor có memory giới hạn, rubric và guardrails.
- Human tutor marketplace là phase riêng.

### Assessment

- Placement test thích nghi.
- Mastery checks không dùng trợ giúp.
- HSK mock exams, HSKK speaking và writing rubric.
- Confidence interval và item-quality monitoring.

### Social and motivation

- Daily quests, streak với cơ chế repair có giới hạn.
- Ranks, seasons, leagues và study guilds.
- Co-op missions; không dùng public shaming.
- Cosmetic economy tách khỏi quyền học cốt lõi.

### Commercial platform

- Free, Plus, Max, Family, School và Enterprise.
- Entitlements độc lập khỏi UI.
- Billing, refunds, tax, regional price và trial lifecycle.
- Teacher dashboard, classroom assignments và institutional reporting.

## 6. Phi chức năng

- WCAG 2.2 AA, keyboard, reduced motion, captions và transcript.
- P95 interaction dưới 200 ms với thao tác local; API đọc dưới 500 ms mục tiêu.
- Offline queue cho lesson đã tải và review đến hạn.
- Idempotent event ingestion; không mất attempt khi mạng chập chờn.
- Mọi nội dung có version, attribution, license và audit trail.
- Dữ liệu giọng nói cần consent, retention policy và khả năng xóa.

## 7. Không làm trong foundation

- Không tuyên bố ASR trình duyệt là chấm thanh điệu production.
- Không tự tạo hàng nghìn lesson chưa qua biên tập.
- Không khóa kiến thức nền sau paywall ngay từ đầu.
- Không dùng leaderboard làm thước đo năng lực.

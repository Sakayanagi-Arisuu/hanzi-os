# HSK3 · nghĩa và ngữ cảnh từ vựng, lô 1

01/10/2026 · IN-REVIEW · AI-assisted, humanReviewed:false.

Đọc current local heads của bài lễ hội, so sánh phong tục, đi lại, cách học và
khôi phục tham chiếu; dùng bốn bài có liên kết từ đúng nghĩa để bổ sung. Không
coi 阿姨 thiếu toàn kho: giữ kết luận phân biệt occurrence với dạy đủ ở hồ sơ 93.

## Đã biên tập

- 矮: so sánh chiều cao với 高, không suy chiều cao gây sợ độ cao; thêm cách dùng
  với bàn. Câu luyện xếp thứ tự ba người; vận dụng hai số đo mới.
- 爱人: ưu tiên phối ngẫu trong Mainland Mandarin, 人 thanh nhẹ, không gán giới
  tính khi chưa có dữ kiện; phân biệt 男朋友/女朋友. Bỏ mẫu “和爱人决定结婚”.
- 笔记本: đối chiếu sổ giấy/笔记本电脑, 一本/一台, tín hiệu ngữ cảnh. Vận dụng
  từ chuyến đi sang lớp học.
- 比如: ví dụ phải thuộc nhóm đã nêu, phân biệt 比 so sánh. Có câu luyện chọn
  ví dụ hợp lý và vận dụng cuối tuần ngay trong HSK3.

Các mẫu Trung/Pinyin/Việt, đáp án và rubric đã được AI tự rà về ngữ pháp,
thanh nhẹ, nghĩa trong ngữ cảnh và mức độ suy luận. Không thay native review.
Mỗi từ có hai mẫu, ghi chú, choice có source word ID và rubric ở ngữ cảnh mới.
Tổng 12 trang mới/4 bài, 8 activity mới; giữ nguyên toàn bộ trang và ID cũ.

## Phát hành local

Plan: content/drafts/thien-lo-vocabulary-context-round1.json. Không replay.
Source: scripts/content/hsk3-vocabulary-context-round1.mjs.
Release: scripts/demo/release-vocabulary-context-round1.mjs.

| Đích | Revision đã phát hành |
|---|---|
| hsk3-cohesion-reconstruction-lesson-02 | 91ba9c8f-bbbe-4177-8976-49893cc8c8e0 |
| hsk3-culture-tradition-descriptions-festivals-customs | f44bffa6-3f61-4c20-a007-c33d048a4664 |
| hsk3-personal-life-narratives-travel-transport | 20cbdc1c-60da-4715-9df5-24268a1a3dae |
| hsk3-study-work-accounts-courses-learning | 026a809c-97a9-4878-ae61-ac39ac75e96e |
| curriculum-word-hsk-vocab-00502 | a43f6a3a-cdf8-48b9-ad6c-04eee9f0f682 |
| curriculum-word-hsk-vocab-00503 | 8848d22c-9673-4ea3-9ca2-79ee99b949a9 |

Apply exit0, 6 release jobs hoàn tất. Backup:
.wrangler/demo-backups/before-vocabulary-context-round1-2026-10-01T12-13-03-070Z.sqlite.
Validation nội tại giữ 43 bảng ngoài nội dung, parent packages, heads khác,
foreign keys, trang cũ và source IDs. Hai lần rehearsal đầu rollback vì giới
hạn số event mỗi drain và so metadata với learner-safe projection; đã sửa
script rồi rehearsal/apply thành công. Không có lần apply dở dang.

## Consumer và giới hạn

Từ điển ghép theo sourceVocabularyId và giữ ID gốc. Curriculum vẫn được Ôn,
Nói và tra từ trong bài sử dụng trực tiếp. Đã xuất hai ví dụ đã phát hành
vào content/vocabulary-example-fallbacks.json; snapshot chưa gắn vào curriculum
vì cần giữ khả năng tái dựng phiên/đáp án cũ theo phiên bản (xem hồ sơ 96).
Không sửa immutable foundation package, nghĩa gốc, Pinyin headword, FSRS hoặc
attempt/snapshot cũ. Bản trong Xưởng tiếp tục biên tập được; consumer trực tiếp
dùng curriculum còn cần versioned delivery, chưa đồng bộ xong.

Đọc thêm 95 triple từ danh sách HSK3 để chọn lô sau; chưa đối chiếu đủ ngữ cảnh
bài học/cách viết thay thế của toàn bộ 95. Các nhóm cần đọc tiếp gồm nghe/hiểu,
thiết bị, chỉ lượng 以上 và các ví dụ ghép quan hệ nhân quả không hợp lý.
HSK4 và ma trận ngữ pháp/nhiệm vụ/chủ đề chưa hoàn tất.
Không chạy browser, Vitest, typecheck hoặc full check theo yêu cầu mới.

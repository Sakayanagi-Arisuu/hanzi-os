# Audit liên kết nguồn cho đợt cải tiến

Nguồn cti-hsk-syllabus-2026, công bố 2025-11, hiệu lực 2026-07. Chạy lại bằng `node scripts/content/audit-thien-lo-redesign.mjs`.

Đối chiếu ID chính xác trong rich content đã lưu ở repo; không coi có ID là đã dạy đủ, có bài tập đủ sâu hoặc người học thành thạo. Chưa đối chiếu các revision Xưởng đã phát hành trong D1.

| Cấp | Nhóm | ID có liên kết / nguồn | Thiếu liên kết |
| --- | --- | --- | --- |
| HSK1 | Ngữ pháp | 66/66 | Không thiếu ID |
| HSK1 | Nhiệm vụ | 15/15 | Không thiếu ID |
| HSK1 | Chủ đề | 30/30 | Không thiếu ID |
| HSK1 | Chữ nhận dạng | 246/246 | Không thiếu ID |
| HSK2 | Ngữ pháp | 75/75 | Không thiếu ID |
| HSK2 | Nhiệm vụ | 17/17 | Không thiếu ID |
| HSK2 | Chủ đề | 34/34 | Không thiếu ID |
| HSK2 | Chữ nhận dạng | 125/125 | Không thiếu ID |
| HSK3 | Ngữ pháp | 96/96 | Không thiếu ID |
| HSK3 | Nhiệm vụ | 22/22 | Không thiếu ID |
| HSK3 | Chủ đề | 54/54 | Không thiếu ID |
| HSK3 | Chữ nhận dạng | 284/284 | Không thiếu ID |
| HSK4 | Ngữ pháp | 95/95 | Không thiếu ID |
| HSK4 | Nhiệm vụ | 30/30 | Không thiếu ID |
| HSK4 | Chủ đề | 77/77 | Không thiếu ID |
| HSK4 | Chữ nhận dạng | 441/441 | Không thiếu ID |

## Quyết định cho biên soạn

- Giữ các liên kết hiện có khi thay trang/ngữ liệu. Các ID và bài chứa chúng nằm trong coverage-audit.json.
- Rà tiếp độ sâu từng điểm: giải thích, mẫu đúng cấp, luyện có hỗ trợ, tự làm, vận dụng khác ngữ cảnh và ôn trì hoãn. Một mẫu không chứng minh đã phủ mọi cách dùng của một grammar row.
- Từ vựng và HSK0 cần audit riêng; số lesson không thay thế ma trận này. Chưa dùng kết quả hiện tại để tuyên bố phủ HSK0–4 hoặc quyết định số bài mới.
- Cho phép thêm bài sau khi xác định thiếu độ rộng/độ sâu; không giới hạn 217 bài. Không khóa ngược bài đã mở và không thay tiến độ cũ.
- Toàn bộ nội dung AI-assisted vẫn chưa được người biên tập review thật.

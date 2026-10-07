# HSK4 · sửa nghĩa Việt và ví dụ mục từ, lô 3

01/10/2026 · IN-REVIEW · humanReviewed:false.

Rà 70 ứng viên đầu trong danh sách HSK4 chưa có literal occurrence toàn kho;
chọn 40 mục cần sửa nghĩa/cách diễn đạt ưu tiên. Source biên tập cụ thể:
scripts/content/hsk4-lexical-corrections-round3.mjs. Đây là rà mục từ, chưa
phải rà đủ mọi bài, mọi nghĩa hoặc mọi ngữ pháp HSK4.

Nhóm lỗi đáng kể đã sửa:

- 白酒 là rượu trắng chưng cất, không phải “bất kể”; 博士 là tiến sĩ, không phải
  bác sĩ. 大巴 là xe khách lớn, không phải “huấn luyện viên”.
- 感动/感人 là cảm động/làm cảm động, không phải di chuyển/chạm vật lý; 歌声 là
  tiếng hát, không phải “quả sung” do dịch sai nhãn figurative.
- 房租 là tiền thuê, khác hành động thuê; 公路 là đường bộ/đường ô tô, không
  đồng nhất đường cao tốc; 打工 không giới hạn việc sinh viên hoặc việc tạm.
- 报考 là đăng ký dự thi; 打印 in bằng máy khác 复印 sao chụp; 高考 được giải
  thích trong phạm vi Mainland, bỏ nghĩa kỳ thi công chức Taiwan khỏi gloss
  học nền. 大夫 giữ dàifu và nghĩa bác sĩ, khác 博士.
- Bỏ nhiễu dịch máy, nghĩa cổ/hiếm không giúp học nền và cụm lặp ở các mục còn
  lại. Không tuyên bố danh sách nghĩa rút gọn là từ điển mọi cách dùng.

40 câu mẫu mới đều có Hanzi/Pinyin/Việt, dùng từ trong tình huống cụ thể thay
mẫu “X là từ trọng tâm”. AI đã rà nghĩa, lượng từ, collocation, thanh nhẹ,
biến điệu 一/不 trong câu và bản dịch. Không có human/native review.

## Local release và consumer

Plan: content/drafts/thien-lo-hsk4-lexical-round3.json (40 source revision/hash).
Release: scripts/demo/release-hsk4-lexical-round3.mjs. Rehearsal rollback và
apply exit0; 40 jobs complete, 43 bảng được bảo toàn, heads khác/FK giữ nguyên.
Backup: .wrangler/demo-backups/before-hsk4-lexical-round3-2026-10-01T12-28-35-935Z.sqlite.
Các source revision trong plan là imported draft được cập nhật/phát hành cùng
ID; không fork vì đây là draft nguyên bản rowVersion1 chưa biên tập. Script
từ chối trạng thái/rowVersion/content drift. Không replay plan sau apply.

Tiêu đề Xưởng cũng đổi theo nghĩa mới. Export 40 bản đã phát hành vào snapshot
content/vocabulary-example-fallbacks.json, gồm meaning và example triple.
Snapshot **chưa được import vào runtime**. Giữ Hanzi/Pinyin headword, stable ID và immutable package.
Không đổi lịch sử attempt, lỗi/snapshot cũ, FSRS hay tiến độ. Lỗi cũ giữ bằng
chứng lúc làm; không ghi lại lịch sử theo đáp án mới.

Snapshot có tổng 56 mục: 40 HSK4 mới, 12 HSK3 mới, 4 HSK2 đã phát hành trước.
Vocabulary projection Từ điển đọc head mới trực tiếp. Ôn/Nói/tra từ và bài tập
legacy dùng curriculum vẫn chưa đồng bộ: không tuyên bố đã sửa các consumer này.

Audit consumer cho thấy thay trực tiếp WORD_BY_ID sẽ đổi đáp án dưới cùng
activityVersion. Chỉ đổi version cũng chưa đủ: localLessonRuntime tái dựng
form từ sessionId, normalizedLessonRuntime đối chiếu catalog hiện tại; session
cũ/outbox có thể bị từ chối. Đã gỡ toàn bộ thử nghiệm overlay/version khỏi
runtime, giữ nguyên code có trước lượt này và dữ liệu. Cần giao nội dung có
version history đầy đủ cho hai runtime trước khi nối snapshot; không được chỉ
map ví dụ mới lên curriculum. Đây là phần giao nội dung còn thiếu, không phải
lý do chạy lại backlog test người dùng đã bỏ.

## Phần chưa xong

Còn 960/1.000 mục HSK4 trong Từ điển sau khi ghép projection chưa thay câu meta;
package/curriculum nền vẫn giữ 1.000 mẫu meta. Đây là số ví dụ
chưa sửa, không phải số từ hoàn toàn vắng trong bài. 40 mẫu mới chưa chứng
minh dạy đủ mọi nghĩa/cách dùng. Cần tiếp ma trận bài học, ngữ pháp, nhiệm vụ
và chủ đề; không có căn cứ nói hoàn tất HSK0–4. Không chạy kiểm thử kỹ thuật
đã được bỏ; giữ validation nội tại và backup.

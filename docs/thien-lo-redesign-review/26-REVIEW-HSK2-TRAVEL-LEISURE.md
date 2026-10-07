# HSK2 chuyến đi và hoạt động giải trí

20/09/2026 · AI self-review · humanReviewed:false.
Phạm vi: travel-leisure-03/04, 24 trang trong `thien-lo-hsk2-travel-leisure-v2.json`. Đã nhập Xưởng và phát hành local sau rehearsal; import giữ 37 bảng, release giữ 36 bảng và kiểm foreign key đạt.

## Năm pass

1. Mandarin: tách 下周六 khỏi câu 已经买好 để kế hoạch tương lai không bị hiểu là hành động đã xong. 过 là trải nghiệm, phủ định 没去过. Bài giải trí phân biệt 喜欢/会 và dùng 打篮球/踢足球; 拿着 biểu đạt trạng thái cầm. Cảm nhận xe chậm gắn với lần đi cụ thể, không khẳng định về mọi tuyến xe.
2. Pinyin: 过 đọc nhẹ guo, 着 đọc nhẹ zhe trong 拿着; không dùng âm zháo của 着急. 一起 yìqǐ, 一个 yí ge, 不会 bú huì, 不远 bù yuǎn. Mẫu và lời giải có Pinyin cho nhiệm vụ mới.
3. Tiếng Việt: đến sân bay lúc 8:00 không phải giờ cất cánh. Vé đã mua không đồng nghĩa đã đi. Thích bơi không đồng nghĩa biết bơi; so sánh thú vị hơn không nói hoạt động còn lại hoàn toàn chán.
4. Sư phạm: timeline phân biệt trải nghiệm trước đây/chuẩn bị đã xong/kế hoạch tương lai; comparison phân biệt sở thích/khả năng/quyết định chung. Choice có distractor dựa trên nhầm lẫn trong bài. Cloze kiểm 没/不 và 打/踢. Transfer đổi thành Bắc Kinh chưa từng đến, chủ nhật, taxi, 7:00; bài giải trí đổi kỹ năng, môn thể thao, giờ và địa điểm. Rubric chỉ tự đối chiếu, không cấp mastery từ tự khai.
5. Coverage: giữ hai lesson IDs, prerequisite và 34 vocabulary IDs; sáu hoạt động đều có target grammar/task hiện hành. Trang và sơ đồ là dữ liệu Xưởng hỗ trợ, không hardcode bài riêng trong reader. Ba tests kiểm parity, nguồn, đáp án và đúng nghĩa của từ đa âm/đa nghĩa đã đạt sau sửa lookup test để dùng inventory bài thay vì chọn headword toàn kho.

## Phát hiện và giới hạn

- Resolved trong bản nháp: ví dụ `过`, `旅游`, `篮球`, `跑`, `球`, `踢` chỉ là headword hoặc thiếu ngữ cảnh; thay bằng câu trọn nghĩa. `着` trước đó dùng `别着急`, không minh họa trợ từ zhe; `游` dùng `旅游`, không minh họa nghĩa bơi. Đã thay ví dụ trong bài, **chưa sửa các entry từ điển dùng chung**.
- Resolved: mẫu grammar nguồn đặt `下周，我已经买好机票了` ngoài ngữ cảnh hội thoại gây mơ hồ thời điểm; bài mới dùng hai câu phân vai thời gian rõ ràng.
- Browser Xưởng đạt 37.8s: exact document, sơ đồ và phản hồi sai/đúng. Browser learner đạt 46.5s: xác nhận khóa trước tiên quyết, runtime khớp hai bài, đáp án/reload/model vận dụng. Fixture tiên quyết chỉ nằm trong browser guest kiểm thử mới, không sửa tài khoản demo. Typecheck, ESLint và diff check đạt. Art campus vẫn chung; sơ đồ riêng có thể biên tập nhưng không chứng minh đã hoàn thành toàn bộ yêu cầu media.
- Không thay đổi dictionary global, không native audio, không tuyên bố đủ HSK hoặc nắm vững kiến thức từ số trang. Những điểm liên thông từ điển và ôn trì hoãn vẫn cần xử lý trong scope v0.2.

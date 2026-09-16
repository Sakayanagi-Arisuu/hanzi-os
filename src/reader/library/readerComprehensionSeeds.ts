// Original AI-assisted reading checks. Paragraph numbers are one-based and
// refer to the original chapter, before the existing long-form appendix.
// Each row: source paragraph, prompt, correct answer, two plausible distractors.
export type ReaderQuestionSeed = readonly [number, string, string, string, string];
export const READER_AUTHORED_QUESTIONS: Readonly<Record<string, readonly ReaderQuestionSeed[]>> = {
  "jade-lantern-archive-c01": [
    [4, "Bác Hứa dặn Lục Minh điều gì trước mười hai giờ?", "Dù nghe thấy gì cũng không trả lời", "Trả lời ngay khi có người gọi tên", "Đọc mọi cuốn sách vừa trở về bàn"],
    [6, "Nhiệm vụ đầu tiên của Người Giữ Trang là gì?", "Tìm trang đầu tiên đã mất trước tiếng chuông thứ ba", "Tìm bác Hứa trước tiếng chuông thứ nhất", "Đóng thư viện trước khi cô gái xuất hiện"],
  ],
  "jade-lantern-archive-c02": [
    [2, "Lục Minh nhìn thấy cánh cửa bằng cách nào?", "Nhìn qua lỗ nhỏ giữa chìa khóa đồng", "Ghép sáu trang vào các ô trên cửa", "Chiếu ngọn đèn xanh vào nửa bản đồ"],
    [6, "Vì sao Lục Minh chọn lối bên trái?", "Cậu cần tìm trang đã mất, thuộc về quá khứ", "Cậu muốn tới một tương lai chưa được viết", "Cậu biết anh của Tiểu Vũ đang chờ bên trái"],
  ],
  "jade-lantern-archive-c03": [
    [2, "Câu trả lời nào giúp Lục Minh nhận ra Tiểu Vũ thật?", "Cô quên tên anh nhưng nhớ lời dặn đợi dưới đèn xanh", "Cô lập tức nói anh trai tên Tiểu Vũ", "Cô đọc được mọi chữ trên đồng hồ"],
    [4, "Vì sao hai người ngừng nói và viết lên lòng bàn tay?", "Gian phòng lấy đi ký ức được nói thành lời", "Chìa khóa chỉ hoạt động khi không có ánh sáng", "Tiểu Vũ không nghe được tiếng Lục Minh"],
  ],
  "jade-lantern-archive-c04": [
    [3, "Thẩm Chu có quan hệ thật sự thế nào với Tiểu Vũ?", "Là người dạy cô đọc sách", "Là anh ruột của cô", "Là người đầu tiên thuê Lục Minh"],
    [6, "Lựa chọn nào khiến trang thứ ba xuất hiện?", "Tiểu Vũ chọn rời khỏi sự chờ đợi", "Tiểu Vũ quyết định chờ mãi dưới đèn", "Tiểu Vũ nhận lời giao tên cho hệ thống"],
  ],
  "jade-lantern-archive-c05": [
    [5, "Lục Minh bảo vệ cả Tiểu Vũ lẫn bác Hứa bằng cách nào?", "Đặt đèn trên nước và tự bước ra khỏi vòng sáng", "Trao tên Tiểu Vũ để đổi thêm sức cho đèn", "Đợi đèn tự đủ sức bảo vệ cả ba"],
    [7, "Vì sao khôi phục trang khóa mực vẫn chưa chặn được thủy triều?", "Thiếu trang sáu để kết thúc bản ghi sai", "Trang thứ tư chưa được lấy khỏi nước", "Bác Hứa chưa trao đèn cho Lục Minh"],
  ],
  "jade-lantern-archive-c06": [
    [5, "Đáp án thứ ba Lục Minh viết là gì?", "Giữ ký ức, ngừng lấy đi", "Xóa hết ký ức để giữ an toàn", "Khóa Thẩm Chu lại và bỏ nhiệm vụ"],
    [6, "Sau khi trang sáu trở về sách, Thẩm Chu ra sao?", "Trở thành dòng chữ chờ được đọc tới lần sau", "Biến mất hoàn toàn khỏi mọi ký ức", "Lập tức cùng Tiểu Vũ bước ra phố"],
  ],
  "van-menh-nguoc-dong-c01": [
    [1, "Chi tiết nào cho thấy Tạ Ninh đã trở lại quá khứ?", "Đôi tay trẻ và cuốn lịch đúng ngày mất linh căn", "Vết thương ba mươi năm sau vẫn còn", "Sư đệ không còn nhận ra cậu"],
    [3, "Thẻ đen yêu cầu Tạ Ninh làm gì trong bảy ngày?", "Tìm lại thứ thật sự đánh mất", "Rút lại thẻ số một trước mọi người", "Rời sơn môn và quên kiếp trước"],
  ],
  "kiem-lo-muoi-bac-c01": [
    [1, "Trên chuôi thanh kiếm rỉ có gì?", "Mười chấm tròn mờ, không có tên", "Tên Cố Xuyên và hai chấm sáng", "Một bản đồ và một chiếc chìa khóa"],
    [2, "Điều gì xảy ra ngay trước khi chấm tròn đầu tiên sáng?", "Cố Xuyên đỡ ông lão đứng vững", "Cố Xuyên đánh bại đệ tử giữ cổng", "Cố Xuyên chứng minh mình có linh căn"],
  ],
  "dao-mam-giua-tuyet-c01": [
    [2, "Câu hỏi trên lá khiến A Mộc nhận ra điều gì?", "Cậu chỉ nhìn phương pháp trong sách, chưa quan sát đất", "Mảnh đất không thể nuôi bất kỳ hạt giống nào", "Các sư huynh đã âm thầm chăm sóc vườn"],
    [3, "A Mộc thay đổi cách chăm sóc cây thế nào?", "Dời ván chắn nắng và đào rãnh nước", "Che kín ánh sáng và ngừng dẫn nước", "Nhổ mầm cây để chứng minh sách sai"],
  ],
  "tro-lai-truoc-con-mua-c01": [
    [1, "Khi Lâm Hà tỉnh dậy, còn bao lâu tới trận mưa lớn?", "Ba ngày", "Mười ngày", "Một ngày"],
    [3, "Đọc tờ giấy ướt xong, Lâm Hà quyết định làm gì trước?", "Tìm người đã viết lời nhắn", "Lập tức ngăn trận mưa lớn", "Rời nhà mà không nói với gia đình"],
  ],
  "nhat-ky-ngay-mai-c01": [
    [1, "Vì sao những trang nhật ký khiến Châu Dư chú ý?", "Hai lời báo trước đã thật sự xảy ra", "Nhật ký chỉ ghi lại chuyện hôm qua", "Trần Mặc đã nhận mình viết nhật ký"],
    [3, "Dòng mới cảnh báo điều gì nếu Châu Dư đi?", "Người viết câu ấy sẽ biến mất", "Nhà thể chất sẽ được sửa lại", "Bài thi sẽ đổi sang buổi chiều"],
  ],
  "nguoi-canh-giu-lan-hai-c01": [
    [2, "Hứa Kha làm gì để phòng chuyện cũ lặp lại?", "Đổi chìa khóa và chuyển thuốc nổ tới nơi an toàn", "Giao chìa khóa ngay cho người áo đen", "Bỏ cổng thành trước khi mặt trời lặn"],
    [3, "Người áo đen nói sai lầm lần trước là gì?", "Hứa Kha đã đóng nhầm cổng", "Hứa Kha đã quên giờ đổi ca", "Hứa Kha đã đốt tấm bản đồ"],
  ],
  "hoc-vien-bay-ngon-lua-c01": [
    [1, "Ngọn lửa của Diệp Lam khác mọi người ở điểm nào?", "Chỉ là một đốm sáng không màu", "Có đủ sáu màu cùng lúc", "Là ngọn lửa đỏ lớn nhất"],
    [3, "Giọng lạ giao nhiệm vụ đầu tiên nào?", "Tìm kẻ đã sửa pháp trận", "Rời học viện trước khi thi", "Thắp lại sáu đài lửa bằng tay"],
  ],
  "phap-su-ca-dem-c01": [
    [1, "Cuốn sách trong hộp trả sách có điều gì bất thường?", "Ngày mượn từ một trăm năm trước", "Ngày mượn chính là sáng hôm sau", "Tên Tô Nguyên đã có trên mọi trang"],
    [3, "Nội quy mới nói thứ quá hạn thật sự là gì?", "Thời gian bên trong cuốn sách", "Chiếc chìa khóa tầng hầm", "Ca trực đầu tiên của Tô Nguyên"],
  ],
  "thanh-lam-thuc-tinh-c01": [
    [1, "Ai không nghe thấy đèn đường gọi tên An Dịch?", "Chính An Dịch", "Tất cả người đi trên phố", "Chỉ giáo viên trong trường"],
    [2, "Chiếc radio nhờ An Dịch làm gì?", "Tắt tháp trung tâm", "Làm kim loại di chuyển", "Sửa lại toàn bộ đèn đường"],
  ],
  "chuyen-tau-dem-khong-ga-cuoi-c01": [
    [1, "Điều gì lạ trên bản đồ trong toa tàu?", "Không có điểm cuối và ga sau mang tên một ngày đã quên", "Mọi ga đều mang tên người thân của Lý Văn", "Bản đồ chỉ ghi địa chỉ ngôi nhà của cậu"],
    [3, "Loa tàu yêu cầu hành khách tìm gì?", "Ký ức không thuộc về mình", "Tấm vé mới bị mất trên sân ga", "Lối ra khỏi thành phố tuyết"],
  ],
  "can-phong-so-bay-c01": [
    [1, "Vì sao tầng bảy khiến người giao hàng ngạc nhiên?", "Tòa nhà vốn chỉ có sáu tầng", "Thang máy đang ở tầng một", "Anh đã đặt phần cơm trên tầng bảy"],
    [3, "Bản thân trong gương chỉ anh tới đâu?", "Dưới bàn, nơi có chìa khóa và tờ giấy", "Bên ngoài cửa sổ đang mở", "Trong thang máy vừa quay trở lại"],
  ],
  "nguoi-gui-thu-trong-mua-c01": [
    [2, "Những người nhận mười hai lá thư trước có điểm chung gì?", "Đều mất tích trước khi thư tới", "Đều gửi thư lại cho Trần Miên", "Đều từng làm việc ở bưu điện"],
    [3, "Lá thứ mười ba có gì khác thường?", "Gửi cho Trần Miên nhưng đề thời gian gửi là sáng mai", "Gửi cho người đưa thư già từ mười năm trước", "Không có người nhận và đã được mở sẵn"],
  ],
  "tram-khong-gian-so-chin-c01": [
    [2, "Vì sao giọng cầu cứu khiến Giang Lạc bối rối?", "Đó là giọng cô lúc nhỏ dù cô chưa từng lên không gian", "Đó là giọng đội trưởng một trạm khác", "Tín hiệu chỉ phát ra tiếng chuông"],
    [3, "Bản ghi gọi trạm số chín là gì?", "Thời gian bị xóa", "Một hành tinh chưa có tên", "Nơi huấn luyện thủy thủ mới"],
  ],
  "ky-uc-tren-tang-may-c01": [
    [1, "Thư mục ký ức có điểm nào vô lý về thời gian?", "Đã lưu bằng tên Bạch Tân lâu hơn tuổi cô ba năm", "Mới được tạo sau khi cô đóng cửa sổ", "Có tuổi đúng bằng tuổi Bạch Tân"],
    [2, "Điều gì xảy ra khi đoạn video kết thúc?", "Con phố ngoài cửa sổ thật sự biến mất", "Mọi ký ức trong kho đều được khôi phục", "Tấm bản đồ hiện thêm tên một con phố"],
  ],
  "doc-gia-cuoi-cung-c01": [
    [1, "Sau khi chữ điện tử biến mất, Mạc Du còn đọc được gì?", "Chữ trên cuốn sách giấy ông để lại", "Chữ trên tất cả màn hình trong nhà", "Chỉ các tin nhắn mới gửi tới"],
    [2, "Bản đồ trong thư dẫn tới đâu?", "Ga ngầm đã đóng nhiều năm", "Tòa tháp vừa xây giữa thành phố", "Nhà máy sản xuất màn hình"],
  ],
  "kiem-khach-thanh-co-c01": [
    [2, "Chi tiết nào cho thấy danh sách sáu nhân chứng chưa đủ?", "Có bảy loại dấu giày trên đất", "Một nhân chứng thừa nhận nói dối", "Căn phòng có sáu cửa sổ mở"],
    [3, "Kiếm khách kiểm tra giới hạn của quy tắc nói thật bằng câu hỏi nào?", "Người ngoài thành cũng không thể nói dối sao?", "Người trong thành có được rời nhà ban đêm không?", "Huyện quan có biết tên sáu nhân chứng không?"],
  ],
  "y-quan-ao-xam-c01": [
    [1, "Bảy bệnh nhân có biểu hiện chung nào?", "Mơ con sông đen rồi quên mặt người nhà", "Không thể nghe tiếng người thân sau khi ăn", "Cùng mất trí nhớ sau khi qua cây cầu thật"],
    [2, "Bệnh nhân nhỏ nhất bổ sung chi tiết gì?", "Bên kia cây cầu có người liên tục gọi tên mình", "Trong nước và thức ăn có độc", "Người áo xám đã đưa thuốc cho cả làng"],
  ],
  "ban-do-bien-ai-c01": [
    [2, "Thẩm Thanh làm gì dù sư phụ bảo quên chuyện quê nhà?", "Vẽ một con đường mới trong khoảng trắng", "Xóa hết những đường biên còn lại", "Gửi bản đồ đi mà không sửa gì"],
    [3, "Khi mực chưa khô, điều gì xuất hiện trên tường?", "Một cánh cửa có âm thanh quê nhà và trống trận phía ngoài", "Tên ngôi làng hiện lại trên mọi bản đồ", "Một lá thư báo người làng đã trở về"],
  ],
  "quan-tra-ben-song-c01": [
    [2, "Hai chén trà đại diện cho hai khả năng nào?", "Quên đi hoặc nhớ vì sao không thể quên", "Nhìn tương lai hoặc đổi tuổi thơ", "Rời quán hoặc ở lại mãi bên sông"],
    [3, "Cuối cùng vị khách chọn làm gì?", "Không uống chén nào và nói ra vấn đề thật sự", "Uống cả hai chén để xóa ký ức", "Bỏ đi trước khi đặt thư lên bàn"],
  ],
  "nguoi-ban-bong-c01": [
    [2, "Vì sao cô bé khiến thương nhân ngạc nhiên?", "Không có bóng nhưng vẫn nhớ chuyện buồn", "Có hai chiếc bóng nhưng không nhớ tên", "Muốn mua lại mọi chiếc bóng trong hòm"],
    [3, "Thương nhân nhận ra điều gì khi bóng trong hòm chuyển động?", "Nỗi đau ông mang đi chưa thật sự biến mất", "Mọi khách hàng đều đã được chữa lành", "Chiếc hòm chưa từng chứa ký ức của ai"],
  ],
  "ba-cau-hoi-cua-da-c01": [
    [2, "Vì sao cậu bé đi tìm con dê lạc?", "Cậu phải về trước khi trời tối", "Hòn đá hứa thưởng một đồng tiền", "Người lớn nhờ cậu mang dê tới chợ"],
    [3, "Câu trả lời nào khiến hòn đá mở lối nhỏ?", "Nếu không tìm thấy, cậu sẽ mang một con đường mới về nhà", "Cậu sẽ ngừng tìm và không bao giờ trở lại", "Cậu sẽ đợi người lớn trả lời thay mình"],
  ],
  "tiem-com-luc-sau-gio-c01": [
    [1, "Vị khách đầu tiên muốn ăn món gì?", "Món mì mẹ từng nấu", "Bát canh chủ quán vừa sáng tạo", "Món đắt nhất trong thực đơn"],
    [2, "Khi khách kể nguyên liệu, bức ảnh thay đổi thế nào?", "Người mẹ già dần rồi ngồi trước chính chiếc bàn ấy", "Người mẹ biến mất và ảnh chỉ còn quán trống", "Bức ảnh đổi thành thực đơn mới"],
  ],
  "mua-he-o-bac-kinh-c01": [
    [2, "Lời nhắn sau bức ảnh yêu cầu điều gì?", "Đưa máy ảnh về Bắc Hải trước khi hết mùa hè", "Giữ máy ảnh trong kho thêm ba mươi năm", "Gửi cuộn phim tới một tiệm ảnh khác"],
    [3, "Sau tiếng màn trập ở góc ngõ, điều gì xảy ra?", "Một con đường vốn bị chặn hiện ra", "Tiệm ảnh lập tức đóng cửa", "Cuộn phim chưa rửa biến mất"],
  ],
  "buc-thu-chua-gui-c01": [
    [1, "Lá thư cuối khác mười một lá trước ở điểm nào?", "Còn mới và đề ngày tuần sau", "Đã ố vàng và không có chữ", "Do người lạ viết thay cha"],
    [3, "Phương Nghi thấy gì ngoài cửa khi chuông vang?", "Chiếc hộp được nhắc trong thư, không có người", "Cha đang cầm lá thư thứ mười hai", "Mẹ đang chờ cùng một bức ảnh cũ"],
  ],
  "van-menh-nguoc-dong-c02": [
    [1, "Tên Tô Dao trên thẻ đen mâu thuẫn với ký ức nào của Tạ Ninh?", "Kiếp trước phải mười năm sau cô mới vào sơn môn", "Kiếp trước cô đã rời sơn môn từ nhỏ", "Kiếp trước cậu chưa từng biết tên cô"],
    [2, "Sợi chỉ đen buộc chân chim hướng tới đâu?", "Kho kiếm đã đóng nhiều năm", "Đài thử kiếm đang mở hội", "Căn phòng của Tạ Ninh"],
  ],
  "kiem-lo-muoi-bac-c02": [
    [1, "Chữ trên cửa đá đòi Cố Xuyên làm gì?", "Đi qua một mình để kiếm nhận chủ", "Mang hai mẹ con qua cùng thanh kiếm", "Đợi chấm thứ hai sáng mới bước tiếp"],
    [2, "Điều gì xảy ra sau khi Cố Xuyên giúp hai mẹ con?", "Cửa tự mở dù chấm thứ hai không sáng", "Kiếm nhận chủ và chấm thứ hai sáng ngay", "Cửa đóng vĩnh viễn vì cậu bỏ kiếm"],
  ],
  "dao-mam-giua-tuyet-c02": [
    [1, "A Mộc phát hiện gì ở mỗi nơi vệt sáng dừng lại?", "Một loại hạt khác dưới tuyết", "Cùng một mầm cây đã chết", "Một trang sách hướng dẫn chăm cây"],
    [2, "Thay vì đào mọi hạt lên, A Mộc làm gì?", "Vẽ đường đi của nắng và học cách chờ đợi", "Che toàn bộ vườn để ngăn ánh sáng", "Giao hết hạt giống cho các sư huynh"],
  ],
  "tro-lai-truoc-con-mua-c02": [
    [1, "Người phụ nữ ở bến xe cầm vật gì chưa thể có hôm nay?", "Tờ báo sẽ phát hành ngày mai", "Chiếc điện thoại đã nứt từ kiếp trước", "Bức thư Lâm Hà đã gửi hôm qua"],
    [2, "Theo em gái từ tương lai, điều cần đổi là gì?", "Câu ba người nói trước khi đóng cửa", "Thời tiết để trận mưa không tới", "Địa điểm bến xe cũ"],
  ],
  "nhat-ky-ngay-mai-c02": [
    [1, "Châu Dư tìm thấy Trần Mặc ở đâu?", "Giữa sân bóng trong nhà thể chất cũ", "Trước cổng đông của trường", "Trong căn phòng khóa nhật ký"],
    [2, "Hai cuốn sách cùng viết khiến họ nhận ra điều gì?", "Ngày mai có thể có nhiều phiên bản", "Cả hai sách luôn đưa cùng lời khuyên", "Nhật ký chỉ ghi những chuyện đã xảy ra"],
  ],
  "nguoi-canh-giu-lan-hai-c02": [
    [1, "Theo người áo đen, vì sao thành trì tương lai bị hủy hoại?", "Bị cổng đóng vĩnh viễn làm chết ngạt", "Bị quân địch phá từ bên ngoài", "Bị Hứa Kha cố ý đốt toàn bộ"],
    [2, "Hứa Kha phải giải quyết đồng thời hai việc nào?", "Cho người tị nạn vào và tìm kẻ phóng hỏa trong nhóm", "Đóng hết cổng và đuổi mọi người tị nạn", "Tìm đội trưởng và xây lại tường bắc"],
  ],
  "hoc-vien-bay-ngon-lua-c02": [
    [1, "Diệp Lam nhìn thấy gì mà người khác không thấy trên bản đồ?", "Đường ẩn dẫn tới tháp cấm", "Lối ra khỏi học viện đã bị xóa", "Tên giám thị ở tất cả bảy câu"],
    [2, "Khi cô vẽ tuyến đường bị giấu, ngọn lửa đổi ra sao?", "Từ không màu thành bạc", "Từ đỏ thành đen", "Tắt hoàn toàn và không trở lại"],
  ],
  "phap-su-ca-dem-c02": [
    [1, "Mở quyển sách quá hạn, Tô Nguyên thấy thư viện biến thành gì?", "Một con phố tuyết", "Tầng hầm đầy nước", "Một phòng thi sáng đèn"],
    [2, "Điều gì bất ngờ trên thẻ mượn ở trang cuối?", "Người mượn là Tô Nguyên của hôm nay", "Thẻ xác nhận cuốn sách chưa từng được mượn", "Người mượn là cô gái đã trở lại"],
  ],
  "thanh-lam-thuc-tinh-c02": [
    [1, "Màn hình trong trạm điện bỏ hoang hiện tên ai?", "Mẹ An Dịch", "Người sửa radio", "Giáo viên trong trường"],
    [2, "Bản ghi cũ gợi ra khả năng nào về An Dịch?", "Cô chưa từng bị hệ thống của lần thức tỉnh trước thay đổi", "Cô đã quên toàn bộ ký ức do chính mình khóa", "Cô nghe được nguyên tố giống tất cả mọi người"],
  ],
  "chuyen-tau-dem-khong-ga-cuoi-c02": [
    [1, "Vật nào mang cùng tên với ga Ngày 32 tháng Năm?", "Tấm vé cũ trong túi Lý Văn", "Điện thoại của ông lão đối diện", "Chiếc ô đỏ của cậu bé"],
    [2, "Cậu bé đặt Lý Văn trước sự đánh đổi nào?", "Quên một người để có thể về nhà", "Bỏ vé tàu để lấy lại chiếc ô", "Ở lại sân ga để giữ điện thoại"],
  ],
  "can-phong-so-bay-c02": [
    [1, "Căn phòng sau cửa nhỏ khác hiện tại thế nào?", "Đồng hồ nhanh hơn bảy phút", "Đồng hồ chậm hơn bảy giờ", "Không có bất kỳ chiếc điện thoại nào"],
    [2, "Giọng nói trong điện thoại cảnh báo điều gì?", "Không vào thang máy và không để người còn lại ra ngoài", "Lập tức vào thang máy cùng người còn lại", "Tắt điện thoại rồi mở hết cửa phòng"],
  ],
  "nguoi-gui-thu-trong-mua-c02": [
    [1, "Lá thứ mười ba báo người mặc áo mưa vàng tới làm gì?", "Lấy mười hai lá thư trước", "Đưa mẹ Trần Miên về nhà", "Sửa khóa cửa bưu điện"],
    [2, "Người thật sự xuất hiện vào hôm sau là ai?", "Trần Miên thuở nhỏ", "Mẹ Trần Miên đã mất tích", "Người đưa thư già lúc trẻ"],
  ],
  "tram-khong-gian-so-chin-c02": [
    [1, "Máy tính ghi điều gì trái với cảm nhận của đội cứu hộ?", "Họ đã tới trước đó mười hai phút và tự xóa bản ghi", "Họ chưa từng rời Trái Đất", "Họ đã ở trạm suốt mười hai năm"],
    [2, "Vì sao lời nhắn dặn không khôi phục điện?", "Bóng tối là khóa cửa, không phải sự cố", "Trạm không có bất kỳ nguồn điện nào", "Mọi người cần ngủ trước khi cứu hộ"],
  ],
  "ky-uc-tren-tang-may-c02": [
    [1, "Công cụ nào vẫn thấy được nhà trong phố Thanh Hà?", "Máy ảnh cũ của Bạch Tân", "Bản đồ hiện tại của thành phố", "Biển chỉ đường ở giao lộ"],
    [2, "Người phụ nữ sau cánh cửa xanh tự nhận là ai?", "Kỹ sư ký ức đầu tiên và mẹ Bạch Tân", "Đồng nghiệp vừa xóa thư mục ký ức", "Người quản lý phố Thanh Hà hôm nay"],
  ],
  "doc-gia-cuoi-cung-c02": [
    [1, "Muốn mở cửa trong kho lưu trữ, phải làm gì?", "Đọc đúng một câu viết tay", "Kết nối điện thoại với mạng", "Giao nộp cuốn sách giấy"],
    [2, "Người quản lý nói Mạc Du có vai trò nào?", "Người ghi chép mới đầu tiên được sách chọn", "Độc giả cuối cùng còn sống trên thế giới", "Người tạo ra mạng điện tử của thành phố"],
  ],
  "kiem-khach-thanh-co-c02": [
    [1, "Vì sao lời kể thật của ba nhân chứng vẫn gây nhầm lẫn?", "Họ nói về những tiếng chuông khác nhau", "Họ đều nhầm y quan với kiếm khách", "Họ không hề nghe tiếng chuông nào"],
    [2, "Khi tiếng chuông thứ tư vang lên, chuyện gì xảy ra?", "Cả thành quên câu hỏi vừa rồi", "Ba nhân chứng cùng nhận tội", "Chiếc cốc thứ ba vỡ thành bốn mảnh"],
  ],
  "y-quan-ao-xam-c02": [
    [1, "Trong ngôi làng không màu của giấc mơ, thứ gì phát sáng?", "Loài hoa xanh trên núi", "Một con sông đỏ dưới cầu", "Hòm thuốc trước cửa nhà"],
    [2, "Toa thuốc còn thiếu thông tin nào?", "Hướng nước sông trong mơ", "Tên của cả tám bệnh nhân", "Màu áo của người giữ cổng"],
  ],
  "ban-do-bien-ai-c02": [
    [1, "Vì sao mực chưa thể xóa sạch làng của cô bé?", "Ngôi làng không có tên", "Cô bé đã giấu hết mực", "Làng nằm ngoài mọi đường biên"],
    [2, "Đường biên mới sau khi ghép bản đồ có chức năng gì?", "Nối những nơi đã biến mất thành một con đường", "Chia lại hai nước thành hai phần bằng nhau", "Ngăn cô bé trở về vùng trắng"],
  ],
  "quan-tra-ben-song-c02": [
    [1, "Dòng chữ dưới đáy chén hướng vị khách tới nỗi sợ nào?", "Ai vẫn còn nhớ chuyện ấy", "Không còn đủ tiền trả trà", "Không tìm được đường về quán"],
    [2, "Câu hỏi cuối của khách cho thấy hướng thay đổi nào?", "Từ tìm cách quên sang tìm cơ hội gửi lời xin lỗi", "Từ xin lỗi sang muốn xóa mọi ký ức", "Từ muốn rời đi sang ở quán mãi"],
  ],
  "nguoi-ban-bong-c02": [
    [1, "Chiếc bóng vô chủ dẫn thương nhân đi bằng cách nào?", "Viết lặp lại một địa chỉ trên tường", "Nói tên con gái của thương nhân", "Vẽ một cây cầu trên chiếc hòm"],
    [2, "Ai đã mang nỗi buồn thay ông lão sau khi ông bán nó?", "Con gái ông", "Người giữ quán trọ", "Một người khách không quen"],
  ],
  "ba-cau-hoi-cua-da-c02": [
    [1, "Cậu bé biết rõ nhu cầu nào dù chưa biết mình đi đâu?", "Đàn cừu cần nước trước khi trời tối", "Đàn cừu cần tới chợ trước buổi trưa", "Cậu phải mang hòn đá về làng"],
    [2, "Lời cậu bé khiến người đi đường nhìn lại điều gì?", "Lý do khởi hành mà họ đã quên", "Khoảng cách chính xác tới thành phố", "Giá bán của những con cừu"],
  ],
  "tiem-com-luc-sau-gio-c02": [
    [1, "Vì sao vị khách thấy bát canh đầu chưa đúng vị?", "Mẹ anh thường cho ít muối hơn", "Mẹ anh không dùng củ cải", "Canh của mẹ luôn được ăn nguội"],
    [2, "Tấm vé dưới bát canh giúp khách hiểu điều gì?", "Anh nhớ có người đợi mình về ăn cơm", "Anh phải đi mua nguyên liệu cho chủ quán", "Anh chưa trả tiền cho chuyến xe trước"],
  ],
  "mua-he-o-bac-kinh-c02": [
    [1, "Số nhà trong ảnh có gì lạ so với bản đồ hiện tại?", "Là số 42 trong ngõ chỉ có 41 căn", "Là số 41 nhưng ngõ chưa từng có nhà", "Là số 30 trong ngõ chỉ có 12 căn"],
    [2, "Họ thấy gì sau khi cửa sổ trên tường sáng lên?", "Có người đang rửa chính bức ảnh ấy", "Tiệm ảnh cũ đã hoàn toàn biến mất", "Một cuộn phim trống nằm trên đường"],
  ],
  "buc-thu-chua-gui-c02": [
    [1, "Địa chỉ bị cha gạch trong thư từng là nơi nào?", "Một tiệm ảnh", "Một nhà ga", "Một bưu điện"],
    [2, "Lời nhắn sau ảnh đề nghị kể cho Phương Nghi chuyện gì?", "Câu chuyện về người em gái được nhắc trong ảnh", "Lý do cha mua ngôi nhà mới", "Cách sửa chiếc hộp trong ngăn kéo"],
  ],
  "first-day": [
    [3, "Người kể chuyện tự giới thiệu mình là người nước nào?", "Việt Nam", "Trung Quốc", "Nhật Bản"],
    [4, "Vì sao người kể nói cảm ơn giáo viên?", "Được giáo viên đưa một quyển sách", "Được giáo viên đưa một cốc nước", "Được giáo viên cho nghỉ buổi học"],
  ],
};

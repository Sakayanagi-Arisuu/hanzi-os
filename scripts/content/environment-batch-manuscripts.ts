import type {SurvivalManuscript} from './survival-batch-manuscripts';
export const environmentManuscripts:SurvivalManuscript[]=[{
 id:'hsk2-person-events-environment-lesson-03',focus:'So sánh đồ vật rồi xác nhận lựa chọn',
 scene:'Quầy có hai áo cùng cỡ: áo đỏ dài 70 cm giá 120 tệ; áo xanh lá dài 65 cm giá 100 tệ. Bạn cần áo không quá 65 cm và không quá 110 tệ. Dữ kiện nằm trong thẻ so sánh, không suy kích thước từ ảnh trang trí.',
 support:'厘米 límǐ: centimet · 价格 jiàgé: giá · 合适 héshì: phù hợp · 超过 chāoguò: vượt quá. 件 jiàn đếm áo; 元 yuán là tệ.',
 rule:'颜色 hỏi màu. 红色的 có thể thay 红色的衣服 khi hai người đã biết đang nói áo; 的 không tự chỉ một món cụ thể nếu chưa có ngữ cảnh. A比B长 so chiều dài; A比B贵 so giá. Chiều dài và giá là hai tiêu chí khác nhau.\n我觉得…好看 là nhận xét cá nhân; không tự chứng minh món đó phù hợp ngân sách. 那么长 nói dài đến mức đã chỉ; 那样 nói kiểu/cách như thế. Muốn mua rõ ràng cần chốt màu, món và giá, không chỉ nói 那个 khi có nhiều món.',
 pitfall:'Thích màu đỏ không làm áo đỏ ngắn hơn hoặc rẻ hơn. Chọn theo cả hai giới hạn, không chỉ một tiêu chí.',
 dialogue:[
 ['这两件衣服有什么不同？','Zhè liǎng jiàn yīfu yǒu shénme bùtóng?','Hai chiếc áo này khác nhau ở điểm nào?'],
 ['红色的长七十厘米，绿色的长六十五厘米。','Hóngsè de cháng qīshí límǐ, lǜsè de cháng liùshíwǔ límǐ.','Áo đỏ dài 70 cm, áo xanh lá dài 65 cm.'],
 ['红色的比绿色的贵吗？','Hóngsè de bǐ lǜsè de guì ma?','Áo đỏ đắt hơn áo xanh lá không?'],
 ['对，红色的一百二十元，绿色的一百元。','Duì, hóngsè de yì bǎi èrshí yuán, lǜsè de yì bǎi yuán.','Đúng, áo đỏ 120 tệ, áo xanh lá 100 tệ.'],
 ['我喜欢红色，但是不要那么长的。绿色的更合适。','Wǒ xǐhuan hóngsè, dànshì bú yào nàme cháng de. Lǜsè de gèng héshì.','Tôi thích màu đỏ nhưng không muốn áo dài đến thế. Áo xanh lá phù hợp hơn.'],
 ['你要绿色的，对吗？','Nǐ yào lǜsè de, duì ma?','Bạn lấy áo xanh lá, đúng không?'],
 ['对，我要这件绿色的，一百元。','Duì, wǒ yào zhè jiàn lǜsè de, yì bǎi yuán.','Đúng, tôi lấy chiếc xanh lá này, 100 tệ.']],
 question:'Cần áo dài tối đa 65 cm và giá tối đa 110 tệ. Chọn kết luận phù hợp.',
 choices:[['红色的合适，因为我喜欢红色。','Sở thích không đáp ứng hai giới hạn: áo đỏ dài 70 cm và giá 120 tệ.'],['绿色的合适，长度和价格都可以。','Áo xanh lá dài 65 cm, giá 100 tệ nên đáp ứng cả hai điều kiện.'],['两件都一样长。','70 cm khác 65 cm; không cùng chiều dài.']],answer:1,
 transfer:'Đổi quầy: áo trắng 60 cm/90 tệ; áo đen 68 cm/80 tệ. Cần không quá 62 cm và 95 tệ. Viết ít nhất sáu lượt hỏi màu, so độ dài/giá rồi xác nhận mua. Không lấy món rẻ nhất nếu không vừa chiều dài.',
 model:['A：白色的和黑色的，哪件长？ B：黑色的长六十八厘米，白色的长六十厘米。 A：哪件便宜？ B：黑色的八十元，白色的九十元。 A：我要白色的，长度和价格都合适。 B：白色的，九十元，对吗？ A：对。','A: Báisè de hé hēisè de, nǎ jiàn cháng? B: Hēisè de cháng liùshíbā límǐ, báisè de cháng liùshí límǐ. A: Nǎ jiàn piányi? B: Hēisè de bāshí yuán, báisè de jiǔshí yuán. A: Wǒ yào báisè de, chángdù hé jiàgé dōu héshì. B: Báisè de, jiǔshí yuán, duì ma? A: Duì.','Áo đen dài hơn và rẻ hơn; chọn áo trắng 60 cm/90 tệ vì đáp ứng cả hai giới hạn.'],
 criteria:['Giữ đúng màu, chiều dài và giá của từng áo.','So sánh đúng hai tiêu chí, không đồng nhất rẻ với phù hợp.','Chọn áo trắng theo cả hai giới hạn.','Có hỏi tiếp và xác nhận món/giá trong ít nhất sáu lượt.']
},{
 id:'hsk2-person-events-environment-lesson-04',focus:'Đọc dự báo và thống nhất kế hoạch có điều kiện',
 scene:'Hôm nay trời âm u, hơi lạnh. Dự báo sáng mai nắng, chiều có thể mưa. Nhóm muốn ra công viên sáng mai, nhưng sẽ học ở thư viện nếu trời mưa. Dự báo không phải sự kiện đã xảy ra.',
 support:'天气预报 tiānqì yùbào: dự báo thời tiết · 如果 rúguǒ: nếu · 就 jiù: thì · 改 gǎi: đổi · 公园 gōngyuán: công viên · 图书馆 túshūguǎn: thư viện.',
 rule:'晴 nói trời quang/nắng; 阴 nói nhiều mây, không đồng nghĩa đang mưa. 今天是阴天 nêu hiện trạng. 天气预报说明天上午晴 nêu nguồn dự báo, chưa khẳng định ngày mai đã xảy ra.\n可能下雨 là có thể mưa; không bỏ 可能 khi thuật lại. 如果下雨，我们就去图书馆 là kế hoạch có điều kiện. Phải nói rõ thời điểm và phương án thay thế, rồi hỏi người cùng đi có đồng ý không.',
 pitfall:'Trời âm u chưa chắc đang mưa; dự báo chiều có thể mưa không có nghĩa chắc chắn mưa cả ngày.',
 dialogue:[
 ['今天天气怎么样？','Jīntiān tiānqì zěnmeyàng?','Hôm nay thời tiết thế nào?'],
 ['今天是阴天，有点儿冷。','Jīntiān shì yīntiān, yǒudiǎnr lěng.','Hôm nay trời âm u, hơi lạnh.'],
 ['明天呢？我们还能去公园吗？','Míngtiān ne? Wǒmen hái néng qù gōngyuán ma?','Ngày mai thì sao? Chúng ta vẫn có thể ra công viên không?'],
 ['天气预报说明天上午晴，下午可能下雨。','Tiānqì yùbào shuō míngtiān shàngwǔ qíng, xiàwǔ kěnéng xiàyǔ.','Dự báo nói sáng mai nắng, chiều có thể mưa.'],
 ['那我们上午九点去，好吗？','Nà wǒmen shàngwǔ jiǔ diǎn qù, hǎo ma?','Vậy 9 giờ sáng chúng ta đi nhé?'],
 ['好。如果下雨，我们就去图书馆。','Hǎo. Rúguǒ xiàyǔ, wǒmen jiù qù túshūguǎn.','Được. Nếu mưa thì chúng ta đến thư viện.']],
 question:'Câu nào thuật đúng dự báo và giữ phương án dự phòng?',
 choices:[['明天下午一定下雨。','Đề chỉ nói có thể; 一定 biến dự báo thành chắc chắn.'],['今天是阴天，所以现在一定在下雨。','Âm u không chứng minh đang mưa.'],['明天下午可能下雨；如果下雨，我们就去图书馆。','Giữ mức có thể và kế hoạch thay thế khi mưa.']],answer:2,
 transfer:'Hôm nay nắng. Dự báo sáng chủ nhật có thể mưa, chiều quang. Hai bạn định đá bóng lúc 15:00; nếu mưa sẽ học tiếng Trung ở nhà. Viết ít nhất sáu lượt, có câu xác nhận thời gian, phương án thay thế và nguồn dự báo.',
 model:['A：今天天气怎么样？ B：今天是晴天。 A：星期日呢？ B：天气预报说上午可能下雨，下午晴。 A：那我们下午三点去踢足球，好吗？ B：好。如果下雨，我们就在家学汉语。','A: Jīntiān tiānqì zěnmeyàng? B: Jīntiān shì qíngtiān. A: Xīngqīrì ne? B: Tiānqì yùbào shuō shàngwǔ kěnéng xiàyǔ, xiàwǔ qíng. A: Nà wǒmen xiàwǔ sān diǎn qù tī zúqiú, hǎo ma? B: Hǎo. Rúguǒ xiàyǔ, wǒmen jiù zài jiā xué Hànyǔ.','Hôm nay nắng; dự báo chủ nhật sáng có thể mưa, chiều quang. Hẹn đá bóng 15 giờ; nếu mưa thì học tiếng Trung ở nhà.'],
 criteria:['Tách hôm nay với dự báo chủ nhật.','Giữ 可能 và nguồn dự báo.','Chốt 15:00, không đổi sang buổi sáng.','Nêu phương án ở nhà khi mưa và có lượt đồng ý.']
},{
 id:'hsk2-person-events-environment-lesson-05',focus:'Mô tả địa điểm với mốc không gian rõ ràng',
 scene:'Một nhà ở đối diện trường, hai bên đường. Cửa hàng ở cạnh nhà cùng phía đường. Trong phòng có một giường và một bàn; bàn ở cạnh cửa sổ. Mọi vị trí được nêu bằng mốc cụ thể, không dùng ảnh nền để suy đoán.',
 support:'房子 fángzi: ngôi nhà · 窗户 chuānghu: cửa sổ · 旁边 pángbiān: bên cạnh · 对面 duìmiàn: đối diện · 张 zhāng: lượng từ bàn/giường.',
 rule:'Địa điểm + 有 + vật giới thiệu có gì: 房间里有一张床. Vật + 在 + vị trí xác định vật ở đâu: 桌子在窗户旁边. Không đổi 有 thành 在 mà giữ nguyên trật tự câu.\n对面 cần mốc: 房子在学校对面. 旁边 là bên cạnh, không tự bằng đối diện. 里/外面 phân biệt trong và ngoài. 一间房 dùng 间 đếm phòng; 一张床 dùng 张 đếm giường. 面 trong 对面/外面 là thành tố chỉ phía, không phải lượng từ giường.',
 pitfall:'Không lấy nhà làm phòng: cửa hàng cạnh nhà không có nghĩa cửa hàng nằm trong phòng. Giữ đúng mốc trường, nhà và cửa sổ.',
 dialogue:[
 ['你住在哪儿？','Nǐ zhù zài nǎr?','Bạn sống ở đâu?'],
 ['我住在学校对面的房子里。','Wǒ zhù zài xuéxiào duìmiàn de fángzi lǐ.','Tôi sống trong ngôi nhà đối diện trường.'],
 ['房间里有什么？','Fángjiān lǐ yǒu shénme?','Trong phòng có gì?'],
 ['有一张床和一张桌子。桌子在窗户旁边。','Yǒu yì zhāng chuáng hé yì zhāng zhuōzi. Zhuōzi zài chuānghu pángbiān.','Có một giường và một bàn. Bàn ở cạnh cửa sổ.'],
 ['附近有商店吗？','Fùjìn yǒu shāngdiàn ma?','Gần đó có cửa hàng không?'],
 ['有，商店就在房子旁边。','Yǒu, shāngdiàn jiù zài fángzi pángbiān.','Có, cửa hàng ở ngay cạnh nhà.']],
 question:'Câu nào giữ đúng đồ vật, vị trí và mốc trong tình huống?',
 choices:[['桌子在窗户旁边，商店在房子旁边。','Đúng: bàn cạnh cửa sổ, cửa hàng cạnh nhà.'],['商店在房间里。','Đã đưa cửa hàng ngoài nhà vào trong phòng.'],['房间里有一间床。','Giường dùng 张 trong mẫu này, không dùng 间.']],answer:0,
 transfer:'Địa điểm mới: nhà cạnh thư viện; hiệu sách đối diện nhà. Trong phòng có hai giường và một bàn; bàn cạnh cửa ra vào. Viết ít nhất sáu lượt hỏi vị trí nhà, đồ trong phòng và vị trí hiệu sách. Không giữ mốc trường của mẫu cũ.',
 model:['A：房子在哪儿？ B：在图书馆旁边。 A：房间里有什么？ B：有两张床和一张桌子。桌子在门旁边。 A：书店在房子旁边吗？ B：不是，在房子对面。','A: Fángzi zài nǎr? B: Zài túshūguǎn pángbiān. A: Fángjiān lǐ yǒu shénme? B: Yǒu liǎng zhāng chuáng hé yì zhāng zhuōzi. Zhuōzi zài mén pángbiān. A: Shūdiàn zài fángzi pángbiān ma? B: Bú shì, zài fángzi duìmiàn.','Nhà cạnh thư viện; trong phòng có hai giường, một bàn cạnh cửa; hiệu sách đối diện nhà.'],
 criteria:['Dùng thư viện làm mốc nhà, không giữ trường.','Nêu đủ hai giường/một bàn với 张.','Bàn cạnh cửa, không cạnh cửa sổ như mẫu cũ.','Phân biệt hiệu sách đối diện với bên cạnh qua lượt xác nhận.']
}];

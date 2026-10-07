const edits=[
 ['讲师操作得很流利','讲师操作得很熟练'],
 ['Gōngsī shàngxiàn xīn de bàoxiāo xìtǒng hòu, dì yī cì péixùn zhǐ yòngle èrshí fēnzhōng. Jiǎngshī cāozuò dé hěn liúlì, què méiyǒu jǔlì shuōmíng fāpiào bù wánzhěng huò chūchāi qǔxiāo shí zěnme bàn. Yuángōng huí dào bàngōngshì hòu réng bùduàn wèn wèntí, cáiwù rényuán xūyào chóngfù jiěshì. Guǎnlǐ céng zuìchū rènwéi yuángōng bùgòu nàixīn, dàn wènjuàn xiǎnshì, péixùn quēshǎo tèshū qíngkuàng de xiángxì bùzhòu.',
 'Gōngsī shàngxiàn xīn de bàoxiāo xìtǒng hòu, dì yī cì péixùn zhǐ yòng le èrshí fēnzhōng. Jiǎngshī cāozuò de hěn shúliàn, què méiyǒu jǔ lì shuōmíng fāpiào bù wánzhěng huò chūchāi qǔxiāo shí zěnme bàn. Yuángōng huí dào bàngōngshì hòu réng búduàn wèn wèntí, cáiwù rényuán xūyào chóngfù jiěshì. Guǎnlǐcéng zuìchū rènwéi yuángōng bú gòu nàixīn, dàn wènjuàn xiǎnshì, péixùn quēshǎo tèshū qíngkuàng de xiángxì bùzhòu.'],
 ['Công ty đưa hệ thống thanh toán mới lên mạng; buổi đào tạo đầu chỉ hai mươi phút. Giảng viên thao tác trôi chảy nhưng không nêu ví dụ hóa đơn thiếu hay hủy chuyến. Về văn phòng, nhân viên vẫn hỏi liên tục và tài chính phải giải thích lại. Quản lý ban đầu nghĩ nhân viên thiếu kiên nhẫn, nhưng khảo sát chỉ ra đào tạo thiếu bước chi tiết cho tình huống đặc biệt.',
 'Sau khi công ty đưa hệ thống hoàn trả chi phí mới vào sử dụng, buổi đào tạo đầu chỉ kéo dài hai mươi phút. Giảng viên thao tác thành thạo nhưng không nêu ví dụ xử lý khi hóa đơn thiếu thông tin hoặc chuyến công tác bị hủy. Trở về văn phòng, nhân viên vẫn hỏi liên tục, bộ phận tài chính phải giải thích lại. Ban quản lý ban đầu nghĩ nhân viên thiếu kiên nhẫn, nhưng khảo sát cho thấy buổi đào tạo thiếu các bước chi tiết cho trường hợp đặc biệt.'],
 ['Chéngshì kēxué xiǎozǔ fāxiàn, xià yèshì zhōngxīn wēndù zhìshǎo bǐ jiāowài gāo liǎng dù. Tāmen tǎolùn shìfǒu duō zhǒng shù, dàn wèixīng tú xiǎnshì zuì rè dìdiǎn jì quē shù, yěyǒu dàliàng shēn sè wūdǐng. Jǐn zēngjiā yī zhǒng cuòshī kěnéng shāowéi jiàngwēn, què wèibì jiějué bùtóng jiēqū de wèntí.',
 'Chéngshì kēxué xiǎozǔ fāxiàn, xià yè shì zhōngxīn wēndù zhìshǎo bǐ jiāowài gāo liǎng dù. Tāmen tǎolùn shìfǒu duō zhòng shù, dàn wèixīng tú xiǎnshì zuì rè dìdiǎn jì quē shù, yě yǒu dàliàng shēnsè wūdǐng. Jǐn zēngjiā yì zhǒng cuòshī kěnéng shāowéi jiàngwēn, què wèibì jiějué bùtóng jiēqū de wèntí.'],
 ['目标是降低家庭购买和闲置。经济部门把交易次数当成功','目标是减少家庭对工具的重复购买，避免工具长期闲置。经济部门把交易次数作为衡量成功的指标'],
 ['Chéngshì zhèngshì tuīchū gòngxiǎng gōngjù shìchǎng, mùbiāo shì jiàngdī jiātíng gòumǎi hé xiánzhì. Jīngjì bùmén bǎ jiāoyì cìshù dàng chénggōng, huánbǎo zǔzhī kàn zīyuán jiéyuē, shèqū dàibiǎo gèng guānxīn dī shōurù jiātíng shìfǒu cānyù. Sānfāng tǎolùn de shì tóngyī xiàngmù, què yòng bùtóng biāozhǔn.',
 'Chéngshì zhèngshì tuīchū gòngxiǎng gōngjù shìchǎng, mùbiāo shì jiǎnshǎo jiātíng duì gōngjù de chóngfù gòumǎi, bìmiǎn gōngjù chángqī xiánzhì. Jīngjì bùmén bǎ jiāoyì cìshù zuòwéi héngliáng chénggōng de zhǐbiāo, huánbǎo zǔzhī kàn zīyuán jiéyuē, shèqū dàibiǎo gèng guānxīn dī shōurù jiātíng shìfǒu cānyù. Sān fāng tǎolùn de shì tóng yí xiàngmù, què yòng bùtóng biāozhǔn.'],
 ['Thành phố chính thức ra chợ chia sẻ dụng cụ để giảm mua và đồ nhàn. Kinh tế coi số giao dịch là thành công, môi trường nhìn tiết kiệm tài nguyên, cộng đồng quan tâm gia đình thu nhập thấp có tham gia. Cùng dự án, chuẩn khác.',
 'Thành phố chính thức mở thị trường chia sẻ dụng cụ nhằm giảm việc các gia đình mua trùng dụng cụ và tránh để dụng cụ không dùng trong thời gian dài. Cơ quan kinh tế lấy số giao dịch làm chỉ số đánh giá thành công; tổ chức môi trường xem mức tiết kiệm tài nguyên; đại diện cộng đồng quan tâm hơn tới sự tham gia của gia đình thu nhập thấp. Ba bên bàn cùng một dự án nhưng dùng tiêu chuẩn khác nhau.']
];
export function correctSharedText28(source){
 const content=structuredClone(source),changes=[];
 function walk(v,path=[]){if(!v||typeof v!=='object')return;for(const [k,x] of Object.entries(v)){
  if(typeof x==='string'){let next=x;for(const [from,to] of edits)next=next.replaceAll(from,to);if(next!==x){v[k]=next;changes.push({path:[...path,k],before:x,after:next});}}
  else walk(x,[...path,k]);
 }}walk(content);return {content,changes};
}

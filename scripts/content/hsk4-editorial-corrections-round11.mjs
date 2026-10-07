// Reviewed text substitutions, including copies in authored explanations.
// Do not apply generic substitutions of individual Chinese characters.
export const edits11=[
 ['他先观察鸟飞的功夫和速度，把动作画成一片片草图；随后选择能透光的皮料，并把翅膀关节切得很细。','他先观察海鸟飞行的动作和速度，花了不少功夫把这些动作画成一张张草图；随后选择能透光的皮料，仔细裁剪翅膀和关节部分。'],
 ['Lín shīfù zhǔnbèi yī bù guānyú hǎi niǎo de píyǐngxì. Dì yī gè yuè, tā xiān guānchá niǎo fēi de gōngfū hé sùdù, bǎ dòngzuò huà chéng yīpiàn piàn cǎotú; suíhòu xuǎnzé néng tòu guāng de pí liào, bìng bǎ chìbǎng guānjié qiè dé hěn xì. Zhège jiēduàn zhǐ cèshì dòngzuò, bù ānpái gōngkāi yǎnchū.','Lín shīfu zhǔnbèi yí bù guānyú hǎiniǎo de píyǐngxì. Dì yī ge yuè, tā xiān guānchá hǎiniǎo fēixíng de dòngzuò hé sùdù, huā le bù shǎo gōngfu bǎ zhèxiē dòngzuò huà chéng yì zhāng zhāng cǎotú; suíhòu xuǎnzé néng tòu guāng de píliào, zǐxì cáijiǎn chìbǎng hé guānjié bùfen. Zhège jiēduàn zhǐ cèshì dòngzuò, bù ānpái gōngkāi yǎnchū.'],
 ['Tháng đầu ông quan sát công phu và tốc độ bay, vẽ động tác thành từng mảnh phác thảo; sau đó chọn da cho ánh sáng xuyên qua và cắt khớp cánh rất nhỏ.','Tháng đầu ông quan sát động tác và tốc độ bay của chim biển, bỏ nhiều công sức vẽ các động tác thành từng bản phác thảo; sau đó chọn da có thể cho ánh sáng xuyên qua, cẩn thận cắt phần cánh và khớp.'],
 ['林师傅便放大片尺寸','林师傅便放大皮影的尺寸'],
 ['Dì èr gè yuè, dēngguāng shī fāxiàn lánguāng shǐ yǐngzǐ biānyuán bù qīng, lín shīfù biàn fàngdà piàn chǐcùn, jiǎnshǎo guòxì de zhuāngshì. Dì sān gè yuè, yīnyuè zǔ àn dòngzuò chóngxīn xiě jiézòu, xuéxiào guānzhòng cānjiā xiǎoxíng shì yǎn. Háizǐ kàn dǒngle fēixíng, què méi kàn dǒng hǎi niǎo wèishéme líkāi jiā.','Dì èr ge yuè, dēngguāngshī fāxiàn lán guāng shǐ yǐngzi biānyuán bù qīng, Lín shīfu biàn fàngdà píyǐng de chǐcùn, jiǎnshǎo guò xì de zhuāngshì. Dì sān ge yuè, yīnyuè zǔ àn dòngzuò chóngxīn xiě jiézòu, xuéxiào guānzhòng cānjiā xiǎoxíng shìyǎn. Háizi kàn dǒng le fēixíng, què méi kàn dǒng hǎiniǎo wèishénme líkāi jiā.'],
 ['nghệ nhân tăng kích thước mảnh và giảm trang trí quá nhỏ','nghệ nhân tăng kích thước hình rối bóng và giảm trang trí quá nhỏ'],
 ['皮影作品先观察动作','皮影创作团队先观察动作'],
 ['团队放大影片并增加对话','团队放大皮影并增加对话'],
 ['Tác phẩm múa bóng quan sát động tác','Nhóm sáng tạo múa bóng quan sát động tác'],
 ['nên nhóm tăng mảnh và thêm thoại','nên nhóm tăng kích thước hình rối bóng và thêm thoại'],
 ['既然旧游记写于作者访问之后，我们就应把它当作个人记录，而不是现场档案。','既然这篇游记只记录了作者的一次访问，我们就不能用它概括当地所有人的生活。'],
 ["Jìrán jiù yóujì xiě yú zuòzhě fǎngwèn zhīhòu, wǒmen jiù yīng bǎ tā dàng zuò gèrén jìlù, ér bùshì xiànchǎng dǎng'àn.",'Jìrán zhè piān yóujì zhǐ jìlù le zuòzhě de yí cì fǎngwèn, wǒmen jiù bù néng yòng tā gàikuò dāngdì suǒyǒu rén de shēnghuó.'],
 ['Vì du ký cũ được viết sau chuyến thăm, ta nên coi nó là ghi chép cá nhân chứ không phải hồ sơ tại chỗ.','Đã là du ký này chỉ ghi lại một chuyến thăm của tác giả thì không thể dùng nó khái quát đời sống của tất cả người dân địa phương.'],
 ['Dùng 既然……就…… khi tiền đề đã được các bên chấp nhận; không đưa giả thuyết chưa chắc vào vị trí tiền đề.','Dùng 既然……就…… để suy luận hoặc đề nghị từ tiền đề người nói xem là đã biết hoặc đã chấp nhận; không trình bày điều chưa xác nhận như sự thật.'],
 ['táng, yán héshí yòngliàng','táng, yán hé shíyòngliàng'],
];
export function correctEditorial11(source){
 const content=structuredClone(source),changes=[];
 function walk(v,path=[]){if(!v||typeof v!=='object')return;for(const [k,x] of Object.entries(v)){
  if(typeof x==='string'){let next=x;for(const [from,to] of edits11)next=next.replaceAll(from,to);if(next!==x){v[k]=next;changes.push({path:[...path,k],before:x,after:next});}}
  else walk(x,[...path,k]);
 }}walk(content);return {content,changes};
}

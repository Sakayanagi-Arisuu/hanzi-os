const readings=[
 ['青川城更新公共资料，','Qīngchuān chéng gēngxīn gōnggòng zīliào, jièshào jiāotōng, yīliáo hé shǎoshù mínzú wénhuà. Zhèngfǔ bùmén tígōng dìdiǎn yǔ shíjiān, shèhuì zǔzhī jiǎnchá wú zhàng’ài xìnxī, gè mínzú shèqū bǔchōng míngchēng dúfǎ hé jiérì bèijǐng. Sān fāng dōu cānyù, dàn zérèn bùtóng.'],
 ['旧资料把一个节日只写成旅游活动，','Jiù zīliào bǎ yí ge jiérì zhǐ xiě chéng lǚyóu huódòng, shèqū dàibiǎo rènwéi zhè huì hūlüè qí jiātíng hé lìshǐ yìyì. Biānjízǔ xiān bǎocún yuánwén, zài jìlù xiūgǎi lǐyóu, bìng qǐng wénhuà yánjiūzhě héduì. Shèqū yǒu jiěshìquán, què bù néng dāndú gǎibiàn gōngjiāo shíkè; jiāotōng bùmén yě bù néng tì shèqū dìngyì wénhuà.'],
 ['新版分别标明资料来源、更新时间和负责人。','Xīn bǎn fēnbié biāomíng zīliào láiyuán, gēngxīn shíjiān hé fùzérén. Dúzhě kěyǐ kàn jiàn shìshí, jiěshì hé fúwù xìnxī láizì nǎlǐ. Zhè ge juésètú tígāo tòumíngdù, què bù néng bǎozhèng suǒyǒu miáoshù dōu yǐ wánzhěng; wèi cānyù fǎngtán de xiǎo shèqū réng xūyào hòuxù bǔchōng.'],
 ['山区市场用广播发布价格和天气，','Shānqū shìchǎng yòng guǎngbō fābù jiàgé hé tiānqì, fùzérén měi tiān zǎochen héduì. Hùliánwǎng píngtái hòulái jiārù túpiàn hé zàixiàn dìngdān, niánqīng shānghù huānyíng xīn qúdào, lǎorén réng yīkào guǎngbō. Liǎng zhǒng qúdào fúwù tóng yī shìchǎng, què fùgài bùtóng rén.'],
 ['一次价格写错后，','Yí cì jiàgé xiě cuò hòu, wǎngshàng xiāoxi bèi xùnsù zhuǎnfā, guǎngbō què zài xià yì xiǎoshí wánchéng gēngzhèng. Guǎnlǐzǔ guīdìng: shìchǎng bàngōngshì fùzé yuánshǐ shùjù, píngtái fùzé xiǎnshì yǔ xiūgǎi jìlù, guǎngbōyuán fùzé kǒutóu quèrèn. Shānghù jiāoliú yìjiàn, dàn bù néng zhíjiē gǎi guānfāng jiàgé.'],
 ['三个月后，在线订单增加，','Sān ge yuè hòu, zàixiàn dìngdān zēngjiā, guǎngbō shōutīng méiyǒu míngxiǎn xiàjiàng. Jiéguǒ shuōmíng xīn qúdào kěyǐ bǔchōng jiù qúdào, bù zhèngmíng hùliánwǎng shìhé měi ge rén. Piānyuǎn cūnzhuāng de xìnhào shùjù réng bù wánzhěng, xià yí jiēduàn yào fēnbié jìlù liǎng zhǒng qúdào de dàodálǜ.']
];
export function correctInformation50(source){
 const content=structuredClone(source),changes=[];
 function walk(v,path=[]){if(!v||typeof v!=='object')return;
  for(const [hk,pk]of [['hanzi','pinyin'],['modelAnswerHanzi','modelAnswerPinyin'],['answer','answerPinyin']]){if(typeof v[hk]!=='string'||typeof v[pk]!=='string')continue;const e=readings.find(([p])=>v[hk].startsWith(p));if(e&&v[pk]!==e[1]){changes.push({path:[...path,pk],before:v[pk],after:e[1]});v[pk]=e[1];}}
  for(const[k,x]of Object.entries(v))walk(x,[...path,k]);
 }walk(content);
 if(content.targetLessonId==='hsk4-event-agency-voice-lesson-03')for(const b of content.lessonPages.pages.flatMap(p=>p.blocks))if(b.activity){const before=b.activity.explanation;const after=before.replace('管理组的表扬或批评属于评价，修改记录和时间才是可核事实。','如果以后有人表扬或批评某个角色，要分清评价与修改记录等可核事实；本材料没有记载这样的表扬或批评。').replace('Khen/chê của nhóm quản lý là đánh giá; lịch sử sửa và thời gian mới là dữ kiện kiểm được.','Nếu sau này có lời khen/chê một vai trò, hãy phân biệt đánh giá với lịch sử sửa có thể kiểm. Nguồn hiện tại không ghi nhóm quản lý đã khen hay chê.');if(before!==after){changes.push({blockId:b.id,before,after});b.activity.explanation=after;}}
 return {content,changes};
}

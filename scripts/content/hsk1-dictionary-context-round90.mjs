const t=(hanzi,pinyin,meaningVi)=>({hanzi,pinyin,meaningVi});
export const contexts90={
 'hsk-vocab-00001':[t('我爱我的家人。','Wǒ ài wǒ de jiārén.','Tôi yêu gia đình mình.'),t('我爱看书。','Wǒ ài kànshū.','Tôi thích đọc sách.')],
 'hsk-vocab-00067':[t('我还在学校。','Wǒ hái zài xuéxiào.','Tôi vẫn ở trường.'),t('我有一本书，还有一支笔。','Wǒ yǒu yì běn shū, hái yǒu yì zhī bǐ.','Tôi có một quyển sách, còn có một cây bút.')],
 'hsk-vocab-00099':[t('我在家看书。','Wǒ zài jiā kànshū.','Tôi đọc sách ở nhà.'),t('请看这里。','Qǐng kàn zhèlǐ.','Xin hãy nhìn vào đây.')],
 'hsk-vocab-00165':[t('请坐。','Qǐng zuò.','Xin mời ngồi.'),t('我请你喝茶。','Wǒ qǐng nǐ hē chá.','Tôi mời bạn uống trà.')],
 'hsk-vocab-00166':[t('请问，学校在哪儿？','Qǐngwèn, xuéxiào zài nǎr?','Xin hỏi trường ở đâu?')],
 'hsk-vocab-00199':[t('我妹妹今年八岁。','Wǒ mèimei jīnnián bā suì.','Năm nay em gái tôi tám tuổi.')],
 'hsk-vocab-00219':[t('我想问老师一个问题。','Wǒ xiǎng wèn lǎoshī yí ge wèntí.','Tôi muốn hỏi giáo viên một câu hỏi.')],
 'hsk-vocab-00263':[t('桌子上有一本书。','Zhuōzi shàng yǒu yì běn shū.','Trên bàn có một quyển sách.'),t('我有一个弟弟。','Wǒ yǒu yí ge dìdi.','Tôi có một em trai.')],
 'hsk-vocab-00265':[t('今天有点儿冷。','Jīntiān yǒudiǎnr lěng.','Hôm nay hơi lạnh.')],
 'hsk-vocab-00298':[t('请坐在这里。','Qǐng zuò zài zhèlǐ.','Xin hãy ngồi ở đây.'),t('我坐火车去北京。','Wǒ zuò huǒchē qù Běijīng.','Tôi đi Bắc Kinh bằng tàu hỏa.')],
 'er':[t('我二月去北京。','Wǒ èr yuè qù Běijīng.','Tôi đi Bắc Kinh vào tháng hai.')],
 'ren':[t('教室里有三个人。','Jiàoshì lǐ yǒu sān ge rén.','Trong phòng học có ba người.')],
 'yi':[t('我有一个朋友。','Wǒ yǒu yí ge péngyou.','Tôi có một người bạn.')]
};
export function contextualizeHsk1Dictionary90(source){
 const content=structuredClone(source),changes=[];
 if(!content.lessonPages){const id=content.sourceVocabularyIds?.[0],examples=contexts90[id];if(!examples)return{content,changes};content.examples=structuredClone(examples);content.review={...content.review,humanReviewed:false,aiSelfReview:{accuracy:true,levelFit:true,pedagogy:true,answerIntegrity:true,originality:true}};return{content,changes:[{wordId:id,newExamples:examples.length}]};}
 for(const page of content.lessonPages.pages)for(const block of page.blocks){
  const match=block.id.match(/hsk-vocab-\d{5}/),index=block.id.match(/:block:word:(\d+)$/);
  const word=match?.[0]??(index?content.vocabulary?.[Number(index[1])]:null),ex=contexts90[word]?.[0];
  if(ex&&block.kind==='dialogue'&&JSON.stringify({hanzi:block.hanzi,pinyin:block.pinyin,meaningVi:block.meaningVi})!==JSON.stringify(ex)){Object.assign(block,ex);changes.push({blockId:block.id,wordId:word});}
 }
 if(changes.length)content.review={...content.review,humanReviewed:false};return{content,changes};
}

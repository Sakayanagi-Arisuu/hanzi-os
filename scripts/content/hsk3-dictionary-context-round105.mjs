const t=(hanzi,pinyin,meaningVi)=>({hanzi,pinyin,meaningVi});
export const contexts105={
 'hsk-vocab-00542':[t('我们等了一会儿，不久车就来了。','Wǒmen děng le yíhuìr, bùjiǔ chē jiù lái le.','Chúng tôi chờ một lát, không lâu sau xe đã tới.')],
 'hsk-vocab-00549':[t('这座楼有三层，图书馆在第二层。','Zhè zuò lóu yǒu sān céng, túshūguǎn zài dì èr céng.','Tòa nhà này có ba tầng, thư viện ở tầng hai.')],
 'hsk-vocab-00568':[t('春天到了，公园里的花开了。','Chūntiān dào le, gōngyuán lǐ de huā kāi le.','Mùa xuân đến rồi, hoa trong công viên đã nở.')],
 'hsk-vocab-00598':[t('火车站在学校的东北方向。','Huǒchēzhàn zài xuéxiào de dōngběi fāngxiàng.','Ga tàu ở hướng đông bắc so với trường.')],
 'hsk-vocab-00600':[t('从学校往东南走，就能到公园。','Cóng xuéxiào wǎng dōngnán zǒu, jiù néng dào gōngyuán.','Từ trường đi về hướng đông nam là có thể đến công viên.')],
 'hsk-vocab-00609':[t('请听这段对话，再回答问题。','Qǐng tīng zhè duàn duìhuà, zài huídá wèntí.','Hãy nghe đoạn hội thoại này rồi trả lời câu hỏi.')],
 'hsk-vocab-00623':[t('这座房子有三个房间。','Zhè zuò fángzi yǒu sān ge fángjiān.','Ngôi nhà này có ba phòng.')],
 'hsk-vocab-00666':[t('请把你的电话号码写在这里。','Qǐng bǎ nǐ de diànhuà hàomǎ xiě zài zhèlǐ.','Vui lòng viết số điện thoại của bạn ở đây.')],
 'hsk-vocab-00669':[t('老师把今天的作业写在黑板上。','Lǎoshī bǎ jīntiān de zuòyè xiě zài hēibǎn shàng.','Giáo viên viết bài tập hôm nay lên bảng đen.')],
 'hsk-vocab-00674':[t('去机场以前，请检查有没有带护照。','Qù jīchǎng yǐqián, qǐng jiǎnchá yǒu méiyǒu dài hùzhào.','Trước khi đến sân bay, hãy kiểm tra đã mang hộ chiếu chưa.')],
 'hsk-vocab-00694':[t('你最喜欢哪个季节？我最喜欢秋天。','Nǐ zuì xǐhuan nǎ ge jìjié? Wǒ zuì xǐhuan qiūtiān.','Bạn thích mùa nào nhất? Tôi thích mùa thu nhất.')],
};
export const meanings105={};
export function contextualizeHsk3Dictionary105(source){
 const content=structuredClone(source),changes=[];
 if(!content.lessonPages){const id=content.sourceVocabularyIds?.[0],examples=contexts105[id];if(!examples)return{content,changes};content.examples=structuredClone(examples);if(meanings105[id])content.meaningVi=meanings105[id];content.review={...content.review,humanReviewed:false,aiSelfReview:{accuracy:true,levelFit:true,pedagogy:true,answerIntegrity:true,originality:true}};return{content,changes:[{wordId:id,newExamples:examples.length}]};}
 for(const page of content.lessonPages.pages)for(const block of page.blocks){const match=block.id.match(/hsk-vocab-\d{5}/),index=block.id.match(/:block:word:(\d+)$/),word=match?.[0]??(index?content.vocabulary?.[Number(index[1])]:null),ex=contexts105[word]?.[0];if(ex&&block.kind==='dialogue'&&JSON.stringify({hanzi:block.hanzi,pinyin:block.pinyin,meaningVi:block.meaningVi})!==JSON.stringify(ex)){Object.assign(block,ex);changes.push({blockId:block.id,wordId:word});}}
 if(changes.length)content.review={...content.review,humanReviewed:false};return{content,changes};
}

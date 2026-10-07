const t=(hanzi,pinyin,meaningVi)=>({hanzi,pinyin,meaningVi});
export const contexts98={
 'hsk-vocab-00805':[t('前年我住在上海，去年搬到了北京。','Qiánnián wǒ zhù zài Shànghǎi, qùnián bān dào le Běijīng.','Năm kia tôi sống ở Thượng Hải, năm ngoái chuyển đến Bắc Kinh.')],
 'hsk-vocab-00822':[t('爷爷坐在沙发上看报纸。','Yéye zuò zài shāfā shàng kàn bàozhǐ.','Ông ngồi trên ghế sô-pha đọc báo.')],
 'hsk-vocab-00852':[t('多练习可以提高你的汉语水平。','Duō liànxí kěyǐ tígāo nǐ de Hànyǔ shuǐpíng.','Luyện tập nhiều có thể nâng cao trình độ tiếng Trung của bạn.')],
 'hsk-vocab-00854':[t('这场比赛在学校的体育馆举行。','Zhè chǎng bǐsài zài xuéxiào de tǐyùguǎn jǔxíng.','Trận đấu này diễn ra tại nhà thi đấu của trường.')],
 'hsk-vocab-00857':[t('听说你下个月要去北京，是吗？','Tīngshuō nǐ xià ge yuè yào qù Běijīng, shì ma?','Nghe nói tháng sau bạn sẽ đi Bắc Kinh, đúng không?')],
 'hsk-vocab-00861':[t('做饭前，她先把头发扎起来。','Zuò fàn qián, tā xiān bǎ tóufa zā qǐlai.','Trước khi nấu ăn, cô ấy buộc tóc lên.')],
 'hsk-vocab-00863':[t('我每周六去图书馆借书。','Wǒ měi zhōu liù qù túshūguǎn jiè shū.','Thứ Bảy hằng tuần tôi đến thư viện mượn sách.')],
 'hsk-vocab-00865':[t('他在外地工作，只有周末回家。','Tā zài wàidì gōngzuò, zhǐyǒu zhōumò huí jiā.','Anh ấy làm việc ở nơi khác, chỉ cuối tuần mới về nhà.')],
 'hsk-vocab-00869':[t('请给我一个碗，我想盛一点儿汤。','Qǐng gěi wǒ yí ge wǎn, wǒ xiǎng chéng yìdiǎnr tāng.','Vui lòng cho tôi một chiếc bát, tôi muốn múc một ít canh.')],
 'hsk-vocab-00871':[t('学校晚会上，学生们表演了唱歌和跳舞。','Xuéxiào wǎnhuì shàng, xuéshēngmen biǎoyǎn le chànggē hé tiàowǔ.','Trong buổi liên hoan tối của trường, học sinh biểu diễn hát và múa.')],
 'hsk-vocab-00875':[t('谢谢你为我们做了这么多。','Xièxie nǐ wèi wǒmen zuò le zhème duō.','Cảm ơn bạn đã làm nhiều điều như vậy cho chúng tôi.')],
 'hsk-vocab-00876':[t('为了早点儿到学校，我今天六点就起床了。','Wèile zǎo diǎnr dào xuéxiào, wǒ jīntiān liù diǎn jiù qǐchuáng le.','Để đến trường sớm hơn, hôm nay tôi dậy từ sáu giờ.')],
 'hsk-vocab-00878':[t('学外语也能帮助我们了解不同的文化。','Xué wàiyǔ yě néng bāngzhù wǒmen liǎojiě bùtóng de wénhuà.','Học ngoại ngữ cũng có thể giúp chúng ta tìm hiểu các nền văn hóa khác nhau.')],
 'hsk-vocab-00889':[t('这里夏天很热，人们常到河边散步。','Zhèlǐ xiàtiān hěn rè, rénmen cháng dào hébiān sànbù.','Ở đây mùa hè nóng, mọi người thường ra bờ sông đi dạo.')],
 'hsk-vocab-00892':[t('我相信你能完成这个任务。','Wǒ xiāngxìn nǐ néng wánchéng zhè ge rènwu.','Tôi tin bạn có thể hoàn thành nhiệm vụ này.')],
 'hsk-vocab-00894':[t('不明白的时候，可以向老师请教。','Bù míngbai de shíhou, kěyǐ xiàng lǎoshī qǐngjiào.','Khi chưa hiểu, có thể hỏi giáo viên để được hướng dẫn.'),t('请一直向前走。','Qǐng yìzhí xiàng qián zǒu.','Hãy cứ đi thẳng về phía trước.')],
 'hsk-vocab-00895':[t('他长得很像爸爸。','Tā zhǎng de hěn xiàng bàba.','Anh ấy có ngoại hình rất giống bố.')],
 'hsk-vocab-00896':[t('旅行时，我用相机拍了很多照片。','Lǚxíng shí, wǒ yòng xiàngjī pāi le hěn duō zhàopiàn.','Khi đi du lịch, tôi dùng máy ảnh chụp nhiều ảnh.')],
};
export const meanings98={
 'hsk-vocab-00871':'buổi liên hoan, chương trình biểu diễn tổ chức vào buổi tối',
 'hsk-vocab-00894':'hướng về; tới, với (giới từ chỉ hướng hoặc đối tượng, như 向老师请教)',
};
export function contextualizeHsk3Dictionary98(source){
 const content=structuredClone(source),changes=[];
 if(!content.lessonPages){const id=content.sourceVocabularyIds?.[0],examples=contexts98[id];if(!examples)return{content,changes};content.examples=structuredClone(examples);if(meanings98[id])content.meaningVi=meanings98[id];content.review={...content.review,humanReviewed:false,aiSelfReview:{accuracy:true,levelFit:true,pedagogy:true,answerIntegrity:true,originality:true}};return{content,changes:[{wordId:id,newExamples:examples.length}]};}
 for(const page of content.lessonPages.pages)for(const block of page.blocks){const match=block.id.match(/hsk-vocab-\d{5}/),index=block.id.match(/:block:word:(\d+)$/),word=match?.[0]??(index?content.vocabulary?.[Number(index[1])]:null),ex=contexts98[word]?.[0];if(ex&&block.kind==='dialogue'&&JSON.stringify({hanzi:block.hanzi,pinyin:block.pinyin,meaningVi:block.meaningVi})!==JSON.stringify(ex)){Object.assign(block,ex);changes.push({blockId:block.id,wordId:word});}}
 if(changes.length)content.review={...content.review,humanReviewed:false};return{content,changes};
}

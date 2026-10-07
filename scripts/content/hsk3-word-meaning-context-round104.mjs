const meanings={
 'hsk-vocab-00842':'cây (danh từ; trồng cây là 种树)',
 'hsk-vocab-00769':'米 có hai nghĩa cần tách: mét trong mục syllabus HSK3 này; gạo trong văn bản món ăn. 五百米 = 500 mét, 选米 = chọn gạo.',
 'hsk-vocab-00797':'cưỡi; đi xe đạp/xe máy hoặc cưỡi ngựa. Ô tô, tàu dùng 坐, không dùng 骑.',
 'hsk-vocab-00633':'khu vực gần; vùng lân cận (chỉ nơi chốn, không phải thời gian “gần đây”)',
 'hsk-vocab-00962':'chúng ta (bao gồm người nói và người nghe)',
 'hsk-vocab-00871':'buổi liên hoan, chương trình biểu diễn tổ chức vào buổi tối',
};
export function contextualizeWordMeanings104(source){
 const content=structuredClone(source),changes=[];if(!content.lessonPages)return{content,changes};
 for(const p of content.lessonPages.pages)for(const b of p.blocks){const m=b.id.match(/hsk-vocab-\d{5}/),i=b.id.match(/:block:word:(\d+)$/),id=m?.[0]??(i?content.vocabulary?.[Number(i[1])]:null);if(b.kind!=='dialogue'||!meanings[id])continue;const parts=b.body.split('\n');if(parts[0]===meanings[id])continue;const old=parts[0];parts[0]=meanings[id];b.body=parts.join('\n');changes.push({blockId:b.id,wordId:id,previousMeaning:old,meaning:meanings[id]});}
 if(changes.length)content.review={...content.review,humanReviewed:false};return{content,changes};
}

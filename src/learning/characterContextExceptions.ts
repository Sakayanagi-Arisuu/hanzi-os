/** Explicit editorial alignments for legacy contexts whose written form does
 * not map one-to-one to the released dictionary syllables. Exact contexts only;
 * this is not a general polyphone, sandhi or erhua inference rule.
 */
export const CHARACTER_CONTEXT_EXCEPTIONS = [
 {hanzi:'客',contextWord:'不客气',contextPinyin:'bú kèqi',reading:'kè',note:'不 đọc bú trước 客 kè (thanh 4). Âm 客 vẫn là kè; cả cụm đọc bú kèqi.'},
 {hanzi:'气',contextWord:'不客气',contextPinyin:'bú kèqi',reading:'qi',note:'气 đọc nhẹ qi trong cụm 不客气. Âm từ điển của chữ là qì; không áp thanh nhẹ này cho mọi từ chứa 气.'},
 {hanzi:'谁',contextWord:'谁',contextPinyin:'shéi/shuí',reading:'shéi / shuí',note:'谁 có hai cách đọc shéi và shuí. Có thể dùng một trong hai; dấu / biểu thị hai cách đọc thay thế, không đọc nối thành hai âm.'},
 {hanzi:'要',contextWord:'不要',contextPinyin:'búyào',reading:'yào',note:'不 đọc bú trước 要 yào (thanh 4). 要 giữ âm yào trong 不要.'},
 {hanzi:'条',contextWord:'面条儿',contextPinyin:'miàntiáor',reading:'tiáor',note:'Trong 面条儿, 儿 hóa vào âm 条 thành tiáor; không đọc thêm một âm ér riêng. Khi không có 儿化, 条 trong 面条 đọc tiáo.'},
 {hanzi:'玩',contextWord:'好玩儿',contextPinyin:'hǎowánr',reading:'wánr',note:'Trong 好玩儿, 儿 hóa vào âm 玩 thành wánr; không đọc 儿 thành âm tiết riêng. Dạng không 儿化 là 好玩 hǎowán.'},
] as const;

const normalize=(value:string)=>value.normalize('NFC').toLowerCase().replace(/\s/gu,'');
export function characterContextException(character:{hanzi:string;contextWord:string;contextPinyin:string}) {
 return CHARACTER_CONTEXT_EXCEPTIONS.find(item=>item.hanzi===character.hanzi&&item.contextWord===character.contextWord&&normalize(item.contextPinyin)===normalize(character.contextPinyin));
}

import { useEffect, useRef, useState } from "react";
import { ChevronRight, Volume2, X } from "lucide-react";
import type { DictionaryWord } from "../content/publishedStudioVocabulary";
import { speakMandarin } from "../lib/speech";

/** Voluntary exposure practice: emits no recall/mastery/FSRS event. */
export function DictionaryStudyDialog({ words, onClose }: { words: DictionaryWord[]; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const word = words[index];
  useEffect(() => { dialog.current?.showModal(); }, []);
  if (!word) return null;
  return <dialog className="lex-study-dialog" ref={dialog} onClose={onClose} aria-labelledby="lex-study-title">
    <header><div><span>TÀNG TỰ KHỐ · TỰ ÔN</span><h2 id="lex-study-title">Ôn ngọc giản đã chọn</h2></div><button onClick={()=>dialog.current?.close()} aria-label="Đóng lượt tự ôn"><X/></button></header>
    <p className="lex-study-counter">Mục {index+1} / {words.length}</p>
    <div className="lex-study-content"><strong lang="zh-Hans" className="lex-large-hanzi">{word.simplified}</strong><p>Nhớ lại nghĩa trước khi mở ngọc giản.</p>{revealed && <section aria-live="polite"><div className="lex-pronunciation">{word.pinyin}<button className="lex-sound" aria-label={`Nghe ${word.simplified}`} onClick={()=>speakMandarin(word.simplified)}><Volume2/></button></div><h3>{word.meaning}</h3>{word.example && <><p lang="zh-Hans">{word.example}</p><p>{word.exampleMeaning}</p></>}</section>}</div>
    <footer>{revealed ? <button className="lex-primary" onClick={()=>{if(index+1===words.length)dialog.current?.close();else{setIndex(index+1);setRevealed(false);}}}>{index+1===words.length?"Kết thúc lượt tự ôn":"Mục tiếp theo"}<ChevronRight/></button> : <button className="lex-primary" onClick={()=>setRevealed(true)}>Mở nghĩa để tự kiểm tra</button>}<small>Lượt tự ôn không thay đổi lịch ôn tập hay kết luận mức thành thạo.</small></footer>
  </dialog>;
}

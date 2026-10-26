import { useEffect, useRef, useState } from "react";
import { ChevronRight, Volume2, X } from "lucide-react";
import type { DictionaryWord } from "../content/publishedStudioVocabulary";
import { speakMandarin } from "../lib/speech";
import { useLearning } from '../store/LearningStore';
import { currentWorkspaceScope } from '../sync/workspaceSync';
import { saveDictionaryActivity } from '../sync/dictionaryActivity';

export function DictionaryStudyDialog({ words, onClose }: { words: DictionaryWord[]; onClose: () => void }) {
  const { sync } = useLearning();
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const sessionId = useRef(crypto.randomUUID());
  const mounted = useRef(true);
  const word = words[index];
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const act = async (kind: 'reveal' | 'self-review' | 'tts') => {
    if (!word || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const scope = await currentWorkspaceScope(sync.ownerKey);
      if (!scope) throw new Error('Owner changed');
      await saveDictionaryActivity(scope, word, `dictionary-study:${sessionId.current}:${index}:${kind}`, kind);
      if (!mounted.current) return;
      if (kind === 'reveal') setRevealed(true);
      else if (kind === 'tts') speakMandarin(word.simplified);
      else if (index + 1 === words.length) dialog.current?.close();
      else { setIndex(index + 1); setRevealed(false); }
    } catch { if (mounted.current) setError('Chưa lưu được lượt tự ôn. Mục hiện tại và dữ liệu cũ vẫn được giữ; hãy thử lại.'); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  };
  if (!word) return null;
  return <dialog className="lex-study-dialog" ref={dialog} onClose={onClose} aria-labelledby="lex-study-title">
    <header><div><span>TÀNG TỰ KHỐ · TỰ ÔN</span><h2 id="lex-study-title">Ôn ngọc giản đã chọn</h2></div><button onClick={()=>dialog.current?.close()} aria-label="Đóng lượt tự ôn"><X/></button></header>
    <p className="lex-study-counter">Mục {index+1} / {words.length}</p>
    <div className="lex-study-content"><strong lang="zh-Hans" className="lex-large-hanzi">{word.simplified}</strong><p>Nhớ lại nghĩa trước khi mở ngọc giản.</p>{revealed && <section aria-live="polite"><div className="lex-pronunciation">{word.pinyin}<button className="lex-sound" disabled={busy} aria-label={`Nghe ${word.simplified}`} onClick={()=>void act('tts')}><Volume2/></button></div><h3>{word.meaning}</h3>{word.example && <><p lang="zh-Hans">{word.example}</p><p>{word.exampleMeaning}</p></>}</section>}{error && <p role="alert">{error}</p>}</div>
    <footer>{revealed ? <button className="lex-primary" disabled={busy} onClick={()=>void act('self-review')}>{index+1===words.length?"Kết thúc lượt tự ôn":"Mục tiếp theo"}<ChevronRight/></button> : <button className="lex-primary" disabled={busy} onClick={()=>void act('reveal')}>Mở nghĩa để tự kiểm tra</button>}<small>Lượt tự ôn không thay đổi lịch ôn tập hay kết luận mức thành thạo.{sync.session?.authenticated ? ' Lượt trên thiết bị chờ đồng bộ, không phải xác nhận chấm đúng.' : ''}</small></footer>
  </dialog>;
}

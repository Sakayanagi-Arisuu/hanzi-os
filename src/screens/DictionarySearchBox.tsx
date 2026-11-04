import { Search, X, ChevronRight } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { DictionaryWord } from '../content/publishedStudioVocabulary';
import { normalizeDictionaryQuery } from './dictionarySearch';

type Props = {
  query: string; onChange: (value: string) => void; results: DictionaryWord[];
  onPick: (word: DictionaryWord, open: boolean) => void; onAll: () => void;
  onPreview: (word?: DictionaryWord) => void; placeholder: string;
  pending: boolean; incomplete: boolean; surface: (word: DictionaryWord) => string;
  initiallyExpanded?: boolean; restoreScroll?: number;
};

function Match({ text, query }: { text: string; query: string }) {
  const start = normalizeDictionaryQuery(text).indexOf(normalizeDictionaryQuery(query));
  return start < 0 || !query.trim() ? <>{text}</> : <>{text.slice(0, start)}<mark>{text.slice(start, start + query.trim().length)}</mark>{text.slice(start + query.trim().length)}</>;
}

export function DictionarySearchBox({ query, onChange, results, onPick, onAll, onPreview, placeholder, pending, incomplete, surface, initiallyExpanded = false, restoreScroll = 0 }: Props) {
  const id = useId();
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [active, setActive] = useState(-1);
  const composing = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => { if (list.current) list.current.scrollTop = restoreScroll; }, [restoreScroll]);
  const suggestions = results.slice(0, 8);
  const open = expanded && Boolean(query.trim());
  const choose = (index: number) => {
    setActive(index); onPreview(suggestions[index]);
    document.getElementById(`${id}-${index}`)?.scrollIntoView({ block: 'nearest' });
  };
  return <div className="lex-search-box">
    <form className="lex-search" role="search" onSubmit={event => {
      event.preventDefault();
      if (composing.current) return;
      if (open && active >= 0 && suggestions[active]) onPick(suggestions[active], true);
      else { setExpanded(false); onAll(); }
    }}>
      <Search aria-hidden="true"/>
      <input ref={input} role="combobox" aria-label="Tìm trong từ điển" aria-autocomplete="list"
        aria-expanded={open} aria-controls={open ? id : undefined}
        aria-activedescendant={open && active >= 0 && suggestions[active] ? `${id}-${active}` : undefined}
        placeholder={placeholder} value={query} autoComplete="off" spellCheck={false}
        onFocus={() => setExpanded(true)} onChange={event => {
          onChange(event.target.value); setExpanded(true); setActive(-1); onPreview();
        }} onCompositionStart={() => { composing.current = true; }}
        onCompositionEnd={() => { composing.current = false; }}
        onKeyDown={event => {
          if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229) {
            if (event.key === 'Enter') event.preventDefault();
            return;
          }
          if (event.key === 'Escape') { event.preventDefault(); setExpanded(false); setActive(-1); onPreview(); }
          if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && suggestions.length) {
            event.preventDefault(); setExpanded(true);
            choose(event.key === 'ArrowDown' ? (active + 1) % suggestions.length : (active <= 0 ? suggestions.length : active) - 1);
          }
        }}/>
      {query ? <button type="button" aria-label="Xóa từ tìm" onClick={() => {
        onChange(''); setActive(-1); onPreview(); input.current?.focus();
      }}><X/></button> : <button type="button" aria-label="Tra cứu mục từ" onClick={onAll}><ChevronRight/></button>}
    </form>
    {open && <div className="lex-typeahead">
      <div ref={list} id={id} role="listbox" aria-label="Gợi ý mục từ" aria-busy={pending} className="lex-suggestions">
        {suggestions.map((word, index) => <div key={word.id} id={`${id}-${index}`} role="option"
          aria-selected={index === active} className="lex-search-option"
          onMouseDown={event => event.preventDefault()} onClick={() => { choose(index); onPick(word, false); }}>
          <strong lang="zh-Hans"><Match text={surface(word)} query={query}/></strong>
          <span><Match text={word.pinyin} query={query}/></span>
          <span><Match text={word.meaning} query={query}/></span>
        </div>)}
      </div>
      {!suggestions.length && <p role="status">{pending ? 'Đang tìm trong kho từ…' : incomplete ? 'Chưa thấy mục phù hợp trong kho đã tải. Bạn có thể đổi từ tìm hoặc thử lại khi có mạng.' : 'Không có mục phù hợp. Thử chữ Hán, Pinyin hoặc nghĩa Việt khác.'}</p>}
      <button type="button" className="lex-all-results" onClick={() => { setExpanded(false); onAll(); }}>Xem tất cả kết quả <ChevronRight size={18}/></button>
    </div>}
  </div>;
}

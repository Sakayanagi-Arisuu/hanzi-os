import { useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { RELEASED_LESSONS } from "../data/curriculum";
import "./DictionaryLessonPicker.css";

export function DictionaryLessonPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLocaleLowerCase("vi");
  const matches = RELEASED_LESSONS.filter(lesson => normalize(lesson.title).includes(normalize(query.trim())));
  return <>
    <button className="lex-lesson-trigger" type="button" aria-label="Chọn bài để tra cứu" aria-haspopup="dialog" onClick={() => { setQuery(""); dialog.current?.showModal(); }}>
      <span>{RELEASED_LESSONS.find(lesson => lesson.id === value)?.title ?? "Chọn bài để tra cứu"}</span><ChevronDown size={18}/>
    </button>
    <dialog ref={dialog} className="lex-lesson-picker" aria-labelledby="lex-lesson-picker-title">
      <header><h2 id="lex-lesson-picker-title">Chọn bài trong Thiên Lộ</h2><button type="button" aria-label="Đóng chọn bài" onClick={() => dialog.current?.close()}><X/></button></header>
      <label className="lex-lesson-search"><Search size={20}/><input aria-label="Tìm tên bài" placeholder="Tìm tên bài…" value={query} onChange={event => setQuery(event.target.value)}/></label>
      <div className="lex-lesson-options" aria-label="Các bài học">
        {matches.map(lesson => <button key={lesson.id} type="button" aria-current={lesson.id === value ? "true" : undefined} onClick={() => { onChange(lesson.id); dialog.current?.close(); }}><span>{lesson.title}</span>{lesson.id === value && <Check size={18}/>}</button>)}
        {!matches.length && <p role="status">Không tìm thấy bài. Thử một từ khóa khác.</p>}
      </div>
    </dialog>
  </>;
}

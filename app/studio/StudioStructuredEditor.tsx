"use client";

import {
  BookOpenText,
  CheckCircle2,
  ChevronDown,
  FileQuestion,
  LibraryBig,
  ListPlus,
  PenTool,
  Plus,
  Save,
  ScrollText,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  STUDIO_ITEM_PRESENTATION,
  STUDIO_ITEM_TYPES,
  STUDIO_LEVELS,
  studioStarterContent,
  type StudioItemType,
  type StudioLevel,
} from "../../src/content/studioContent";
import {
  HSK_BUILT_IN_EXAM_FORM_KEYS,
  HSK_EXAM_FORM_KEYS,
  HSK_STANDARD_EXAM_STRUCTURE,
  hskStandardItemCount,
  isHskExamFormKey,
  isHskExamLevel,
  type HskExamFormKey,
  type HskExamLevel,
} from "../../src/assessment/hskExamStructure";

type Triple = { hanzi: string; pinyin: string; meaningVi: string };
type GrammarRow = { pattern: string; explanationVi: string };
type ExerciseRow = {
  promptVi: string;
  answer: string;
  distractors: string[];
  explanationVi: string;
};

type EditorMode = "create" | "update";

type StudioStructuredEditorProps = {
  mode: EditorMode;
  draftSeed: string;
  initialItemType?: StudioItemType;
  initialLevel?: StudioLevel;
  initialTitle?: string;
  initialContent?: Record<string, unknown>;
  revisionId?: string;
  expectedRowVersion?: number;
  examFormSuggestions?: Record<
    HskExamLevel,
    Partial<Record<HskExamFormKey, readonly string[]>>
  >;
};

const iconFor: Record<StudioItemType, typeof LibraryBig> = {
  vocabulary: LibraryBig,
  character: PenTool,
  grammar: ScrollText,
  lesson: BookOpenText,
  exam_item: FileQuestion,
  exam_form: ListPlus,
};

const record = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const stringValue = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const numberValue = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const triples = (value: unknown, fallback: Triple[] = []): Triple[] => {
  if (!Array.isArray(value)) return fallback;
  const rows = value.map((entry) => {
    const item = record(entry);
    return item ? {
      hanzi: stringValue(item.hanzi),
      pinyin: stringValue(item.pinyin),
      meaningVi: stringValue(item.meaningVi),
    } : null;
  }).filter((entry): entry is Triple => entry !== null);
  return rows.length ? rows : fallback;
};

const grammarRows = (value: unknown): GrammarRow[] => {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    const item = record(entry);
    return item ? {
      pattern: stringValue(item.pattern),
      explanationVi: stringValue(item.explanationVi),
    } : null;
  }).filter((entry): entry is GrammarRow => entry !== null);
};

const exerciseRows = (value: unknown): ExerciseRow[] => {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    const item = record(entry);
    return item ? {
      promptVi: stringValue(item.promptVi),
      answer: stringValue(item.answer),
      distractors: Array.isArray(item.distractors)
        ? item.distractors.filter((answer): answer is string => typeof answer === "string")
        : [],
      explanationVi: stringValue(item.explanationVi),
    } : null;
  }).filter((entry): entry is ExerciseRow => entry !== null);
};

const asLines = (value: unknown) => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === "string").join("\n")
  : "";

const values = (data: FormData, name: string) =>
  data.getAll(name).map((value) => String(value).trim());

const first = (data: FormData, name: string) =>
  String(data.get(name) ?? "").trim();

const buildTriples = (data: FormData, prefix: string) => {
  const hanzi = values(data, `${prefix}.hanzi`);
  const pinyin = values(data, `${prefix}.pinyin`);
  const meaning = values(data, `${prefix}.meaningVi`);
  return hanzi.map((value, index) => ({
    hanzi: value,
    pinyin: pinyin[index] ?? "",
    meaningVi: meaning[index] ?? "",
  })).filter((entry) => entry.hanzi || entry.pinyin || entry.meaningVi);
};

const buildReview = (data: FormData) => ({
  humanReviewed: false,
  aiSelfReview: {
    accuracy: data.has("review.accuracy"),
    levelFit: data.has("review.levelFit"),
    pedagogy: data.has("review.pedagogy"),
    answerIntegrity: data.has("review.answerIntegrity"),
    originality: data.has("review.originality"),
  },
});

const buildContent = (
  itemType: StudioItemType,
  data: FormData,
  initial: Record<string, unknown>,
) => {
  const shared = { ...initial, review: buildReview(data) };
  if (itemType === "vocabulary") {
    return {
      ...shared,
      hanzi: first(data, "hanzi"),
      pinyin: first(data, "pinyin"),
      meaningVi: first(data, "meaningVi"),
      examples: buildTriples(data, "examples"),
      audioSource: first(data, "audioSource") || undefined,
    };
  }
  if (itemType === "character") {
    const context = buildTriples(data, "context")[0] ?? {
      hanzi: "",
      pinyin: "",
      meaningVi: "",
    };
    return {
      ...shared,
      hanzi: first(data, "hanzi"),
      pinyin: first(data, "pinyin"),
      meaningVi: first(data, "meaningVi"),
      context,
      radical: first(data, "radical") || undefined,
      strokeCount: Number(first(data, "strokeCount")) || undefined,
      strokeSourceRef: first(data, "strokeSourceRef") || undefined,
    };
  }
  if (itemType === "grammar") {
    return {
      ...shared,
      pattern: first(data, "pattern"),
      explanationVi: first(data, "explanationVi"),
      examples: buildTriples(data, "examples"),
    };
  }
  if (itemType === "lesson") {
    const patterns = values(data, "grammar.pattern");
    const explanations = values(data, "grammar.explanationVi");
    const prompts = values(data, "exercises.promptVi");
    const answers = values(data, "exercises.answer");
    const distractors = values(data, "exercises.distractors");
    const exerciseExplanations = values(data, "exercises.explanationVi");
    return {
      ...shared,
      objectiveVi: first(data, "objectiveVi"),
      prerequisites: first(data, "prerequisites").split(/\r?\n|,/u).map((value) => value.trim()).filter(Boolean),
      vocabulary: first(data, "vocabulary").split(/\r?\n|,/u).map((value) => value.trim()).filter(Boolean),
      dialogue: buildTriples(data, "dialogue"),
      grammar: patterns.map((pattern, index) => ({
        pattern,
        explanationVi: explanations[index] ?? "",
      })).filter((entry) => entry.pattern || entry.explanationVi),
      exercises: prompts.map((promptVi, index) => ({
        promptVi,
        answer: answers[index] ?? "",
        distractors: (distractors[index] ?? "").split("|").map((value) => value.trim()).filter(Boolean),
        explanationVi: exerciseExplanations[index] ?? "",
      })).filter((entry) => entry.promptVi || entry.answer),
    };
  }
  if (itemType === "exam_item") {
    const options = first(data, "options").split(/\r?\n/u).map((value) => value.trim()).filter(Boolean);
    return {
      ...shared,
      skill: first(data, "skill"),
      promptVi: first(data, "promptVi"),
      hanzi: first(data, "hanzi") || undefined,
      passageHanzi: first(data, "passageHanzi") || undefined,
      options,
      answerIndex: Math.max(0, Number(first(data, "answerIndex")) - 1),
      explanationVi: first(data, "explanationVi"),
    };
  }
  return {
    ...shared,
    examLevel: first(data, "examLevel"),
    formKey: first(data, "formKey").toLowerCase(),
    timeLimitMinutes: Number(first(data, "timeLimitMinutes")),
    itemStableKeys: first(data, "itemStableKeys").split(/\r?\n|,/u).map((value) => value.trim()).filter(Boolean),
    coverage: {
      listening: Number(first(data, "coverage.listening")),
      reading: Number(first(data, "coverage.reading")),
      writing: Number(first(data, "coverage.writing")),
    },
  };
};

const slug = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/gu, "")
  .toLowerCase()
  .replace(/đ/gu, "d")
  .replace(/[^a-z0-9]+/gu, "-")
  .replace(/^-+|-+$/gu, "")
  .slice(0, 72);

function TripleEditor({
  label,
  prefix,
  initialRows,
  minimum = 1,
}: {
  label: string;
  prefix: string;
  initialRows: Triple[];
  minimum?: number;
}) {
  const [rows, setRows] = useState<Triple[]>(() => initialRows.length
    ? initialRows
    : Array.from({ length: minimum }, () => ({ hanzi: "", pinyin: "", meaningVi: "" })));
  const update = (index: number, key: keyof Triple, value: string) => {
    setRows((current) => current.map((row, rowIndex) =>
      rowIndex === index ? { ...row, [key]: value } : row));
  };
  return (
    <fieldset className="studio-fieldset">
      <legend>{label}</legend>
      <div className="studio-repeat-stack">
        {rows.map((row, index) => (
          <div className="studio-language-row" key={`${prefix}:${index}`}>
            <label><span>Tiếng Trung</span><input name={`${prefix}.hanzi`} required value={row.hanzi} onChange={(event) => update(index, "hanzi", event.target.value)} /></label>
            <label><span>Pinyin</span><input name={`${prefix}.pinyin`} required value={row.pinyin} onChange={(event) => update(index, "pinyin", event.target.value)} /></label>
            <label><span>Nghĩa tiếng Việt</span><input name={`${prefix}.meaningVi`} required value={row.meaningVi} onChange={(event) => update(index, "meaningVi", event.target.value)} /></label>
            <button className="studio-icon-button" type="button" disabled={rows.length <= minimum} onClick={() => setRows((current) => current.filter((_row, rowIndex) => rowIndex !== index))} aria-label={`Xóa ${label.toLowerCase()} ${index + 1}`}><Trash2 size={17} /></button>
          </div>
        ))}
      </div>
      <button className="studio-add-row" type="button" onClick={() => setRows((current) => [...current, { hanzi: "", pinyin: "", meaningVi: "" }])}><Plus size={16} /> Thêm dòng</button>
    </fieldset>
  );
}

function GrammarEditor({ initialRows }: { initialRows: GrammarRow[] }) {
  const [rows, setRows] = useState(() => initialRows.length ? initialRows : [{ pattern: "", explanationVi: "" }]);
  return (
    <fieldset className="studio-fieldset">
      <legend>Điểm ngữ pháp</legend>
      <div className="studio-repeat-stack">
        {rows.map((row, index) => (
          <div className="studio-pair-row" key={`grammar:${index}`}>
            <label><span>Mẫu câu</span><input name="grammar.pattern" required value={row.pattern} onChange={(event) => setRows((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, pattern: event.target.value } : item))} /></label>
            <label><span>Giải thích tiếng Việt</span><textarea name="grammar.explanationVi" required value={row.explanationVi} onChange={(event) => setRows((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, explanationVi: event.target.value } : item))} /></label>
            <button className="studio-icon-button" type="button" disabled={rows.length === 1} onClick={() => setRows((current) => current.filter((_row, rowIndex) => rowIndex !== index))} aria-label={`Xóa điểm ngữ pháp ${index + 1}`}><Trash2 size={17} /></button>
          </div>
        ))}
      </div>
      <button className="studio-add-row" type="button" onClick={() => setRows((current) => [...current, { pattern: "", explanationVi: "" }])}><Plus size={16} /> Thêm điểm ngữ pháp</button>
    </fieldset>
  );
}

function ExerciseEditor({ initialRows }: { initialRows: ExerciseRow[] }) {
  const [rows, setRows] = useState(() => initialRows.length ? initialRows : [{ promptVi: "", answer: "", distractors: ["", ""], explanationVi: "" }]);
  const update = (index: number, patch: Partial<ExerciseRow>) => setRows((current) =>
    current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  return (
    <fieldset className="studio-fieldset">
      <legend>Bài tập tự kiểm</legend>
      <div className="studio-repeat-stack">
        {rows.map((row, index) => (
          <article className="studio-exercise-row" key={`exercise:${index}`}>
            <header><strong>Câu {index + 1}</strong><button className="studio-icon-button" type="button" disabled={rows.length === 1} onClick={() => setRows((current) => current.filter((_row, rowIndex) => rowIndex !== index))} aria-label={`Xóa bài tập ${index + 1}`}><Trash2 size={17} /></button></header>
            <label><span>Yêu cầu</span><input name="exercises.promptVi" required value={row.promptVi} onChange={(event) => update(index, { promptVi: event.target.value })} /></label>
            <div className="studio-two-columns">
              <label><span>Đáp án đúng</span><input name="exercises.answer" required value={row.answer} onChange={(event) => update(index, { answer: event.target.value })} /></label>
              <label><span>Đáp án gây nhiễu</span><input name="exercises.distractors" required value={row.distractors.join(" | ")} onChange={(event) => update(index, { distractors: event.target.value.split("|").map((value) => value.trim()) })} /><small>Ngăn cách ít nhất hai đáp án bằng dấu |</small></label>
            </div>
            <label><span>Giải thích sau khi trả lời</span><textarea name="exercises.explanationVi" required value={row.explanationVi} onChange={(event) => update(index, { explanationVi: event.target.value })} /></label>
          </article>
        ))}
      </div>
      <button className="studio-add-row" type="button" onClick={() => setRows((current) => [...current, { promptVi: "", answer: "", distractors: ["", ""], explanationVi: "" }])}><Plus size={16} /> Thêm bài tập</button>
    </fieldset>
  );
}

function QualityChecklist({ initialContent }: { initialContent: Record<string, unknown> }) {
  const review = record(initialContent.review);
  const passes = record(review?.aiSelfReview);
  const checks = [
    ["accuracy", "Tiếng Trung và Pinyin chính xác"],
    ["levelFit", "Độ khó phù hợp cấp HSK đã chọn"],
    ["pedagogy", "Ví dụ và hướng dẫn dễ hiểu"],
    ["answerIntegrity", "Đáp án và lời giải nhất quán"],
    ["originality", "Nội dung nguyên bản hoặc có nguồn hợp lệ"],
  ] as const;
  return (
    <fieldset className="studio-quality-panel">
      <legend><CheckCircle2 size={18} /> Kiểm tra trước khi lưu</legend>
      <p>Đánh dấu khi bạn đã tự đọc lại. Hệ thống vẫn chạy kiểm định độc lập trước khi cho gửi duyệt.</p>
      <div>
        {checks.map(([key, label]) => (
          <label key={key}>
            <input name={`review.${key}`} type="checkbox" defaultChecked={passes?.[key] === true} />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ExamFormFields({
  content,
  initialLevel,
  suggestions,
}: {
  content: Record<string, unknown>;
  initialLevel: StudioLevel;
  suggestions?: StudioStructuredEditorProps["examFormSuggestions"];
}) {
  const examLevel: HskExamLevel = isHskExamLevel(initialLevel)
    ? initialLevel
    : isHskExamLevel(content.examLevel)
    ? content.examLevel
    : "hsk1";
  const storedFormKey = isHskExamFormKey(content.formKey)
    ? content.formKey.toLowerCase() as HskExamFormKey
    : "g";
  const [formKey, setFormKey] = useState<HskExamFormKey>(storedFormKey);
  const suggestedKeys = suggestions?.[examLevel]?.[storedFormKey];
  const [itemKeys, setItemKeys] = useState(
    suggestedKeys?.join("\n") ?? asLines(content.itemStableKeys),
  );
  const structure = HSK_STANDARD_EXAM_STRUCTURE[examLevel];
  const expectedItemCount = hskStandardItemCount(examLevel);
  const coverage = Object.fromEntries(structure.sections.map((section) => [
    section.skill,
    section.itemCount,
  ])) as Record<string, number>;
  const selectSuggestion = (nextForm: HskExamFormKey) => {
    const nextKeys = suggestions?.[examLevel]?.[nextForm];
    if (nextKeys) setItemKeys(nextKeys.join("\n"));
  };
  return <>
    <section className="studio-form-section"><header><span>01</span><div><h2>Cấu hình cửa dungeon</h2><p>Cửa mới dùng đúng số phần, số câu và thời lượng của cấp HSK; biên tập viên không cần tự tính.</p></div></header><div className="studio-three-columns"><div className="studio-readonly-field"><span>Cấp HSK</span><strong>{examLevel.toUpperCase()}</strong><input name="examLevel" type="hidden" value={examLevel} readOnly /></div><label><span>Ký hiệu cửa</span><select name="formKey" value={formKey} onChange={(event) => {
      const nextForm = event.target.value as HskExamFormKey;
      setFormKey(nextForm);
      selectSuggestion(nextForm);
    }}>{HSK_EXAM_FORM_KEYS.map((key) => {
      const occupied = HSK_BUILT_IN_EXAM_FORM_KEYS.includes(
        key as typeof HSK_BUILT_IN_EXAM_FORM_KEYS[number],
      );
      return <option disabled={occupied} key={key} value={key}>Cửa {key.toUpperCase()}{occupied ? " · đã có sẵn" : ""}</option>;
    })}</select></label><div className="studio-readonly-field"><span>Quy mô chuẩn</span><strong>{expectedItemCount} câu · {structure.timeLimitMinutes} phút</strong></div></div><input name="timeLimitMinutes" type="hidden" value={structure.timeLimitMinutes} readOnly /><div className="studio-exam-structure" aria-label={`Cấu trúc ${examLevel.toUpperCase()}`}>{structure.sections.map((section, index) => <div key={section.skill}><b>{String(index + 1).padStart(2, "0")}</b><span><strong>{section.label}</strong><small>{section.itemCount} câu · {section.minutes} phút</small></span><input name={`coverage.${section.skill}`} type="hidden" value={section.itemCount} readOnly /></div>)}{!structure.sections.some((section) => section.skill === "writing") && <input name="coverage.writing" type="hidden" value="0" readOnly />}</div></section>
    <section className="studio-form-section"><header><span>02</span><div><h2>Danh sách câu hỏi</h2><p>Nhập đúng {expectedItemCount} mã câu đã kiểm định theo thứ tự Nghe → Đọc{coverage.writing ? " → Viết" : ""}. Mỗi mã một dòng và không lặp trong cùng cửa.</p></div></header><label><span>Mã câu hỏi đã kiểm định</span><textarea className="studio-tall-textarea" name="itemStableKeys" required value={itemKeys} onChange={(event) => setItemKeys(event.target.value)} aria-describedby="exam-form-item-count" /></label><p id="exam-form-item-count" className="studio-field-note">Cấu trúc bắt buộc: {structure.sections.map((section) => `${section.label} ${section.itemCount}`).join(" · ")}.</p></section>
  </>;
}

function ContentFields({ itemType, content, level, examFormSuggestions }: { itemType: StudioItemType; content: Record<string, unknown>; level: StudioLevel; examFormSuggestions?: StudioStructuredEditorProps["examFormSuggestions"] }) {
  if (itemType === "vocabulary") {
    return <>
      <section className="studio-form-section"><header><span>01</span><div><h2>Từ mục</h2><p>Nhập đúng một từ hoặc cụm từ, không nhập cả câu vào ô Hán tự.</p></div></header><div className="studio-three-columns"><label><span>Hán tự giản thể</span><input name="hanzi" required defaultValue={stringValue(content.hanzi)} /></label><label><span>Pinyin có dấu thanh</span><input name="pinyin" required defaultValue={stringValue(content.pinyin)} /></label><label><span>Nghĩa tiếng Việt</span><input name="meaningVi" required defaultValue={stringValue(content.meaningVi)} /></label></div></section>
      <section className="studio-form-section"><header><span>02</span><div><h2>Ngữ cảnh sử dụng</h2><p>Mỗi ví dụ phải có đủ tiếng Trung, Pinyin và nghĩa Việt.</p></div></header><TripleEditor label="Câu ví dụ" prefix="examples" initialRows={triples(content.examples)} /></section>
      <details className="studio-advanced"><summary><ChevronDown size={16} /> Thiết lập âm thanh</summary><label><span>Nguồn phát âm</span><select name="audioSource" defaultValue={stringValue(content.audioSource)}><option value="">Chưa gắn âm thanh</option><option value="browser-tts">Giọng tổng hợp của trình duyệt</option><option value="native-audio">Audio bản ngữ đã duyệt</option></select></label></details>
    </>;
  }
  if (itemType === "character") {
    const context = record(content.context);
    return <>
      <section className="studio-form-section"><header><span>01</span><div><h2>Hồ sơ Hán tự</h2><p>Thần Văn Lô tập trung vào một chữ; nghĩa của cả từ thuộc Tàng Tự Khố.</p></div></header><div className="studio-three-columns"><label><span>Hán tự</span><input name="hanzi" required maxLength={4} defaultValue={stringValue(content.hanzi)} /></label><label><span>Pinyin</span><input name="pinyin" required defaultValue={stringValue(content.pinyin)} /></label><label><span>Nghĩa cốt lõi</span><input name="meaningVi" required defaultValue={stringValue(content.meaningVi)} /></label></div></section>
      <section className="studio-form-section"><header><span>02</span><div><h2>Nhận diện trong từ</h2><p>Cho người học thấy chữ này xuất hiện ở đâu trước khi luyện nét.</p></div></header><TripleEditor label="Từ hoặc câu ngữ cảnh" prefix="context" minimum={1} initialRows={context ? triples([context]) : []} /></section>
      <details className="studio-advanced"><summary><ChevronDown size={16} /> Cấu tạo và dữ liệu nét</summary><div className="studio-three-columns"><label><span>Bộ thủ</span><input name="radical" defaultValue={stringValue(content.radical)} /></label><label><span>Số nét</span><input name="strokeCount" type="number" min="1" max="64" defaultValue={numberValue(content.strokeCount) || ""} /></label><label><span>Mã nguồn dữ liệu nét đã duyệt</span><input name="strokeSourceRef" defaultValue={stringValue(content.strokeSourceRef)} placeholder="Chỉ nhập khi đã có provenance" /></label></div><p>Không có nguồn hợp lệ thì giao diện chỉ mở nhận diện chữ, không mở chấm nét.</p></details>
    </>;
  }
  if (itemType === "grammar") {
    return <>
      <section className="studio-form-section"><header><span>01</span><div><h2>Mẫu ngữ pháp</h2><p>Giải thích bằng tiếng Việt ngắn gọn, ưu tiên cách dùng trước thuật ngữ.</p></div></header><div className="studio-two-columns"><label><span>Mẫu câu</span><input name="pattern" required defaultValue={stringValue(content.pattern)} /></label><label><span>Giải thích tiếng Việt</span><textarea name="explanationVi" required defaultValue={stringValue(content.explanationVi)} /></label></div></section>
      <section className="studio-form-section"><header><span>02</span><div><h2>Ví dụ</h2><p>Ví dụ phải đúng cấp độ và thể hiện rõ mẫu vừa giải thích.</p></div></header><TripleEditor label="Ví dụ ngữ pháp" prefix="examples" initialRows={triples(content.examples)} /></section>
    </>;
  }
  if (itemType === "lesson") {
    return <>
      <section className="studio-form-section"><header><span>01</span><div><h2>Mục tiêu và nguyên liệu</h2><p>Người học cần làm được gì sau bài này?</p></div></header><label><span>Mục tiêu bài học</span><textarea name="objectiveVi" required defaultValue={stringValue(content.objectiveVi)} /></label><div className="studio-two-columns"><label><span>Từ vựng dùng trong bài</span><textarea name="vocabulary" required defaultValue={asLines(content.vocabulary)} /><small>Mỗi từ một dòng.</small></label><label><span>Bài học tiên quyết</span><textarea name="prerequisites" defaultValue={asLines(content.prerequisites)} /><small>Mỗi mã bài một dòng; có thể để trống.</small></label></div></section>
      <section className="studio-form-section"><header><span>02</span><div><h2>Hội thoại hoặc bài đọc</h2><p>Tối thiểu hai lượt, đủ Trung–Pinyin–Việt.</p></div></header><TripleEditor label="Lượt nội dung" prefix="dialogue" minimum={2} initialRows={triples(content.dialogue)} /></section>
      <section className="studio-form-section"><header><span>03</span><div><h2>Giải thích và thực hành</h2><p>Đóng vòng học bằng mẫu câu và bài tập có lời giải.</p></div></header><GrammarEditor initialRows={grammarRows(content.grammar)} /><ExerciseEditor initialRows={exerciseRows(content.exercises)} /></section>
    </>;
  }
  if (itemType === "exam_item") {
    const options = Array.isArray(content.options)
      ? content.options.filter((item): item is string => typeof item === "string").join("\n")
      : "";
    return <>
      <section className="studio-form-section"><header><span>01</span><div><h2>Câu hỏi</h2><p>Ngữ liệu và yêu cầu không được hé lộ đáp án.</p></div></header><div className="studio-two-columns"><label><span>Kỹ năng</span><select name="skill" defaultValue={stringValue(content.skill, "reading")}><option value="listening">Nghe</option><option value="reading">Đọc</option><option value="writing">Viết</option><option value="vocabulary">Từ vựng</option><option value="grammar">Ngữ pháp</option></select></label><label><span>Yêu cầu bằng tiếng Việt</span><input name="promptVi" required defaultValue={stringValue(content.promptVi)} /></label></div><div className="studio-two-columns"><label><span>Câu hoặc cụm từ tiếng Trung</span><textarea name="hanzi" defaultValue={stringValue(content.hanzi)} /></label><label><span>Đoạn văn nếu có</span><textarea name="passageHanzi" defaultValue={stringValue(content.passageHanzi)} /></label></div></section>
      <section className="studio-form-section"><header><span>02</span><div><h2>Đáp án và lời giải</h2><p>Nhập mỗi lựa chọn một dòng; vị trí đáp án tính từ 1.</p></div></header><div className="studio-two-columns"><label><span>Các lựa chọn</span><textarea name="options" required defaultValue={options} /></label><label><span>Vị trí đáp án đúng</span><input name="answerIndex" type="number" min="1" max="8" required defaultValue={numberValue(content.answerIndex) + 1} /><span>Lời giải tiếng Việt</span><textarea name="explanationVi" required defaultValue={stringValue(content.explanationVi)} /></label></div></section>
    </>;
  }
  return <ExamFormFields content={content} initialLevel={level} suggestions={examFormSuggestions} />;
}

export function StudioStructuredEditor({
  mode,
  draftSeed,
  initialItemType = "lesson",
  initialLevel = "hsk1",
  initialTitle = "",
  initialContent,
  revisionId,
  expectedRowVersion,
  examFormSuggestions,
}: StudioStructuredEditorProps) {
  const [itemType, setItemType] = useState<StudioItemType>(initialItemType);
  const [level, setLevel] = useState<StudioLevel>(initialLevel);
  const [title, setTitle] = useState(initialTitle);
  const hiddenContent = useRef<HTMLInputElement>(null);
  const content = useMemo(() => mode === "update"
    ? initialContent ?? studioStarterContent(itemType, level)
    : studioStarterContent(itemType, level), [initialContent, itemType, level, mode]);
  const presentation = STUDIO_ITEM_PRESENTATION[itemType];
  const Icon = iconFor[itemType];
  const stableKey = `${level}.${itemType}.${slug(title) || "noi-dung-moi"}-${draftSeed}`;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    if (!hiddenContent.current) {
      event.preventDefault();
      return;
    }
    const data = new FormData(event.currentTarget);
    hiddenContent.current.value = JSON.stringify(buildContent(itemType, data, content));
  };

  return (
    <form className="studio-structured-editor" action="/studio/actions" method="post" onSubmit={submit}>
      <input type="hidden" name="action" value={mode === "create" ? "create" : "update"} />
      <input type="hidden" name="idempotencyKey" value={`studio-${mode}:${draftSeed}`} />
      <input ref={hiddenContent} type="hidden" name="contentJson" value="{}" readOnly />
      {mode === "create" ? <input type="hidden" name="stableKey" value={stableKey} /> : <>
        <input type="hidden" name="revisionId" value={revisionId} />
        <input type="hidden" name="expectedRowVersion" value={expectedRowVersion} />
      </>}

      <div className="studio-editor-heading">
        <span className="studio-editor-icon"><Icon size={26} /></span>
        <div><small>{presentation.module}</small><h2>{mode === "create" ? `Tạo ${presentation.label.toLowerCase()}` : `Biên tập ${presentation.label.toLowerCase()}`}</h2><p>{presentation.description}</p></div>
      </div>

      <section className="studio-form-section studio-identity-section">
        <header><span>00</span><div><h2>Phân loại nội dung</h2><p>Chọn đúng nơi nội dung sẽ xuất hiện với người học.</p></div></header>
        <div className="studio-three-columns">
          {mode === "create" ? <label><span>Phân khu</span><select name="itemType" value={itemType} onChange={(event) => {
            setItemType(event.target.value as StudioItemType);
            setTitle("");
          }}>{STUDIO_ITEM_TYPES.map((type) => <option value={type} key={type}>{STUDIO_ITEM_PRESENTATION[type].module} · {STUDIO_ITEM_PRESENTATION[type].label}</option>)}</select></label> : <div className="studio-readonly-field"><span>Phân khu</span><strong>{presentation.module} · {presentation.label}</strong></div>}
          <label><span>Cấp độ</span><select name="level" value={level} onChange={(event) => setLevel(event.target.value as StudioLevel)}>{STUDIO_LEVELS.filter((value) => itemType !== "exam_form" || isHskExamLevel(value)).map((value) => <option key={value} value={value}>{value.toUpperCase()}</option>)}</select></label>
          <label><span>Tiêu đề hiển thị</span><input name="title" required maxLength={240} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Chào hỏi và giới thiệu" /></label>
        </div>
      </section>

      <div key={`${mode}:${itemType}:${mode === "create" ? level : "stored"}`} className="studio-editor-fields">
        <ContentFields itemType={itemType} content={content} level={level} examFormSuggestions={examFormSuggestions} />
        <QualityChecklist initialContent={content} />
      </div>

      <footer className="studio-editor-footer">
        <div><Sparkles size={18} /><span><strong>{mode === "create" ? "Chỉ tạo bản nháp" : "Lưu vào bản nháp"}</strong><small>Người học chưa thấy nội dung cho tới khi qua kiểm định và phê duyệt.</small></span></div>
        <button type="submit"><Save size={19} /> {mode === "create" ? "Tạo bản nháp" : "Lưu thay đổi"}</button>
      </footer>
    </form>
  );
}

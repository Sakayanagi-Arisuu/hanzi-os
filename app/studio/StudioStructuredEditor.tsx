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
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  STUDIO_ITEM_PRESENTATION,
  STUDIO_ITEM_TYPES,
  STUDIO_LEVELS,
  studioBlankDraftContent,
  type StudioItemType,
  type StudioLevel,
} from "../../src/content/studioContent";
import { studioGradedTextSeriesId } from "../../src/content/gradedTextIdentity";
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
import { RELEASED_LESSONS, RELEASED_VOCABULARY } from "../../src/data/curriculum";
import { studioLessonMatchesLevel } from "../../src/content/studioLessonIdentity";

type Triple = { hanzi: string; pinyin: string; meaningVi: string };
type GrammarRow = { pattern: string; explanationVi: string };
type ExerciseRow = {
  promptVi: string;
  answer: string;
  answerPinyin: string;
  answerMeaningVi: string;
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
  initialStableKey?: string;
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
  pronunciation: Sparkles,
  communicative_function: BookOpenText,
  graded_text: LibraryBig,
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
        answerPinyin: stringValue(item.answerPinyin),
        answerMeaningVi: stringValue(item.answerMeaningVi),
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

const list = (data: FormData, name: string) => first(data, name)
  .split(/\r?\n|,/u)
  .map((value) => value.trim())
  .filter(Boolean);

type PickerOption = { value: string; label: string; detail: string; search: string };

function EditorialPicker({
  name,
  legend,
  help,
  value,
  options,
  minimum = 0,
}: {
  name: string;
  legend: string;
  help: string;
  value: unknown;
  options: PickerOption[];
  minimum?: number;
}) {
  const initial = Array.isArray(value)
    ? value.filter((lessonId): lessonId is string => typeof lessonId === "string")
    : [];
  const [selected, setSelected] = useState(() => new Set(initial));
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("vi");
  const selectedOptions = options.filter((option) => selected.has(option.value));
  const matches = options.filter((option) => !selected.has(option.value)
    && (!normalizedQuery || option.search.includes(normalizedQuery))).slice(0, 60);
  const visibleOptions = [...selectedOptions, ...matches];

  return <fieldset className="studio-fieldset studio-lesson-picker">
    <legend>{legend}</legend>
    {[...selected].map((entry) => <input key={entry} type="hidden" name={name} value={entry} />)}
    <label className="studio-lesson-search">
      <span>Tìm theo tên hoặc nội dung</span>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Gõ từ khóa để lọc…"
      />
    </label>
    <p className="studio-field-note">{help} {minimum > 0 ? `Cần chọn ít nhất ${minimum}.` : "Có thể để trống."} Hệ thống tự lưu liên kết ổn định.</p>
    <div className="studio-lesson-options" aria-label={legend}>
      {visibleOptions.map((option) => <label key={option.value}>
        <input type="checkbox" checked={selected.has(option.value)} onChange={(event) => setSelected((current) => {
          const next = new Set(current);
          if (event.target.checked) next.add(option.value); else next.delete(option.value);
          return next;
        })} />
        <span><strong>{option.label}</strong><small>{option.detail}</small></span>
      </label>)}
      {visibleOptions.length === 0 && <p>Không tìm thấy nội dung phù hợp.</p>}
    </div>
  </fieldset>;
}

function LessonLinkPicker({ value, level, name = "sourceLessonIds", minimum = 1, legend = "Liên kết với bài học nguồn" }: { value: unknown; level: StudioLevel; name?: string; minimum?: number; legend?: string }) {
  const options = RELEASED_LESSONS
    .filter((lesson) => studioLessonMatchesLevel(lesson.unitId, level) || (Array.isArray(value) && value.includes(lesson.id)))
    .map((lesson) => ({
      value: lesson.id,
      label: lesson.title,
      detail: `${lesson.chineseTitle} · ${lesson.objective}`,
      search: `${lesson.title} ${lesson.chineseTitle} ${lesson.objective}`.toLocaleLowerCase("vi"),
    }));
  return <EditorialPicker name={name} legend={legend} help={`Đang hiển thị bài phù hợp ${level.toUpperCase()}.`} value={value} options={options} minimum={minimum} />;
}

const buildExercises = (data: FormData) => {
  const prompts = values(data, "exercises.promptVi");
  const answers = values(data, "exercises.answer");
  const distractors = values(data, "exercises.distractors");
  const explanations = values(data, "exercises.explanationVi");
  const answerPinyin = values(data, "exercises.answerPinyin");
  const answerMeaning = values(data, "exercises.answerMeaningVi");
  return prompts.map((promptVi, index) => ({
    promptVi,
    answer: answers[index] ?? "",
    answerPinyin: answerPinyin[index] ?? "",
    answerMeaningVi: answerMeaning[index] ?? "",
    distractors: (distractors[index] ?? "").split("|").map((value) => value.trim()).filter(Boolean),
    explanationVi: explanations[index] ?? "",
  })).filter((entry) => entry.promptVi || entry.answer);
};

const skillLabel = (skill: string) => ({
  listening: "Nghe",
  speaking: "Nói",
  reading: "Đọc",
  writing: "Viết",
  vocabulary: "Từ vựng",
  grammar: "Ngữ pháp",
  pronunciation: "Phát âm",
}[skill] ?? skill);

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
      sourceLessonIds: values(data, "sourceLessonIds"),
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
      sourceLessonIds: values(data, "sourceLessonIds"),
      radical: first(data, "radical") || undefined,
      strokeCount: Number(first(data, "strokeCount")) || undefined,
      strokeProvenance: first(data, "strokeSourceName")
        || first(data, "strokeSourceUrl")
        || first(data, "strokeLicenseVi")
        ? {
            sourceName: first(data, "strokeSourceName"),
            sourceUrl: first(data, "strokeSourceUrl"),
            licenseVi: first(data, "strokeLicenseVi"),
          }
        : undefined,
    };
  }
  if (itemType === "grammar") {
    return {
      ...shared,
      pattern: first(data, "pattern"),
      explanationVi: first(data, "explanationVi"),
      examples: buildTriples(data, "examples"),
      pitfallVi: first(data, "pitfallVi"),
      checkpointVi: first(data, "checkpointVi"),
      sourceLessonIds: values(data, "sourceLessonIds"),
    };
  }
  if (itemType === "pronunciation") {
    return {
      ...shared,
      targetKind: first(data, "targetKind"),
      targets: list(data, "targets"),
      conceptVi: first(data, "conceptVi"),
      ruleVi: first(data, "ruleVi"),
      examples: buildTriples(data, "examples"),
      pitfallVi: first(data, "pitfallVi"),
      checkpointVi: first(data, "checkpointVi"),
      sourceLessonIds: values(data, "sourceLessonIds"),
      audioSource: first(data, "audioSource") || undefined,
    };
  }
  if (itemType === "communicative_function") {
    return {
      ...shared,
      functionVi: first(data, "functionVi"),
      scenarioVi: first(data, "scenarioVi"),
      outcomeVi: first(data, "outcomeVi"),
      skills: values(data, "skills"),
      sourceLessonIds: values(data, "sourceLessonIds"),
      dialogue: buildTriples(data, "dialogue"),
      tasks: buildExercises(data),
    };
  }
  if (itemType === "graded_text") {
    return {
      ...shared,
      readerSeriesId: first(data, "readerSeriesId"),
      titleZh: first(data, "titleZh"),
      summaryVi: first(data, "summaryVi"),
      estimatedMinutes: Number(first(data, "estimatedMinutes")),
      sourceLessonIds: values(data, "sourceLessonIds"),
      sentences: buildTriples(data, "sentences"),
      comprehension: buildExercises(data),
      rights: {
        sourceKind: first(data, "sourceKind"),
        textProvenanceVi: first(data, "textProvenanceVi"),
        licenseVi: first(data, "licenseVi") || undefined,
        editorAttestsRights: data.has("editorAttestsRights"),
      },
    };
  }
  if (itemType === "lesson") {
    const patterns = values(data, "grammar.pattern");
    const explanations = values(data, "grammar.explanationVi");
    return {
      ...shared,
      targetLessonId: first(data, "targetLessonId"),
      titleZh: first(data, "titleZh"),
      objectiveVi: first(data, "objectiveVi"),
      conceptVi: first(data, "conceptVi"),
      ruleVi: first(data, "ruleVi"),
      pitfallVi: first(data, "pitfallVi"),
      checkpointVi: first(data, "checkpointVi"),
      prerequisites: values(data, "prerequisites"),
      vocabulary: values(data, "vocabulary"),
      skills: values(data, "skills"),
      dialogue: buildTriples(data, "dialogue"),
      grammar: patterns.map((pattern, index) => ({
        pattern,
        explanationVi: explanations[index] ?? "",
      })).filter((entry) => entry.pattern || entry.explanationVi),
      exercises: buildExercises(data),
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
      sourceLessonIds: values(data, "sourceLessonIds"),
    };
  }
  return {
    ...shared,
    examLevel: first(data, "examLevel"),
    formKey: first(data, "formKey").toLowerCase(),
    timeLimitMinutes: Number(first(data, "timeLimitMinutes")),
    itemStableKeys: values(data, "itemStableKeys"),
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

function ExerciseEditor({
  initialRows,
  legend = "Bài tập tự kiểm",
  requireDistractors = true,
  requireAnswerTriple = false,
}: {
  initialRows: ExerciseRow[];
  legend?: string;
  requireDistractors?: boolean;
  requireAnswerTriple?: boolean;
}) {
  const [rows, setRows] = useState(() => initialRows.length ? initialRows : [{ promptVi: "", answer: "", answerPinyin: "", answerMeaningVi: "", distractors: ["", ""], explanationVi: "" }]);
  const update = (index: number, patch: Partial<ExerciseRow>) => setRows((current) =>
    current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  return (
    <fieldset className="studio-fieldset">
      <legend>{legend}</legend>
      <div className="studio-repeat-stack">
        {rows.map((row, index) => (
          <article className="studio-exercise-row" key={`exercise:${index}`}>
            <header><strong>Câu {index + 1}</strong><button className="studio-icon-button" type="button" disabled={rows.length === 1} onClick={() => setRows((current) => current.filter((_row, rowIndex) => rowIndex !== index))} aria-label={`Xóa bài tập ${index + 1}`}><Trash2 size={17} /></button></header>
            <label><span>Yêu cầu</span><input name="exercises.promptVi" required value={row.promptVi} onChange={(event) => update(index, { promptVi: event.target.value })} /></label>
            <div className="studio-two-columns">
              <label><span>Đáp án đúng</span><input name="exercises.answer" required value={row.answer} onChange={(event) => update(index, { answer: event.target.value })} /></label>
              <label><span>{requireDistractors ? "Đáp án gây nhiễu" : "Gợi ý đối chiếu (tùy chọn)"}</span><input name="exercises.distractors" required={requireDistractors} value={row.distractors.join(" | ")} onChange={(event) => update(index, { distractors: event.target.value.split("|").map((value) => value.trim()) })} /><small>{requireDistractors ? "Ngăn cách ít nhất hai đáp án bằng dấu |" : "Có thể nhập nhiều gợi ý, ngăn bằng dấu |"}</small></label>
            </div>
            {requireAnswerTriple && <div className="studio-two-columns">
              <label><span>Pinyin của đáp án</span><input name="exercises.answerPinyin" required value={row.answerPinyin} onChange={(event) => update(index, { answerPinyin: event.target.value })} /></label>
              <label><span>Nghĩa Việt của đáp án</span><input name="exercises.answerMeaningVi" required value={row.answerMeaningVi} onChange={(event) => update(index, { answerMeaningVi: event.target.value })} /></label>
            </div>}
            {!requireAnswerTriple && <>
              <input name="exercises.answerPinyin" type="hidden" value={row.answerPinyin} readOnly />
              <input name="exercises.answerMeaningVi" type="hidden" value={row.answerMeaningVi} readOnly />
            </>}
            <label><span>Giải thích sau khi trả lời</span><textarea name="exercises.explanationVi" required value={row.explanationVi} onChange={(event) => update(index, { explanationVi: event.target.value })} /></label>
          </article>
        ))}
      </div>
      <button className="studio-add-row" type="button" onClick={() => setRows((current) => [...current, { promptVi: "", answer: "", answerPinyin: "", answerMeaningVi: "", distractors: ["", ""], explanationVi: "" }])}><Plus size={16} /> Thêm bài tập</button>
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
  preserveStoredSelection,
}: {
  content: Record<string, unknown>;
  initialLevel: StudioLevel;
  suggestions?: StudioStructuredEditorProps["examFormSuggestions"];
  preserveStoredSelection: boolean;
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
  const storedKeys = Array.isArray(content.itemStableKeys)
    ? content.itemStableKeys.filter((value): value is string => typeof value === "string")
    : [];
  const [itemKeys, setItemKeys] = useState<string[]>(
    preserveStoredSelection && storedKeys.length ? storedKeys : suggestedKeys ? [...suggestedKeys] : [],
  );
  const structure = HSK_STANDARD_EXAM_STRUCTURE[examLevel];
  const expectedItemCount = hskStandardItemCount(examLevel);
  const selectSuggestion = (nextForm: HskExamFormKey) => {
    const nextKeys = suggestions?.[examLevel]?.[nextForm];
    if (nextKeys) setItemKeys([...nextKeys]);
  };
  return <>
    <section className="studio-form-section"><header><span>01</span><div><h2>Cấu trúc cửa Khảo Luyện</h2><p>Cửa mới dùng đúng số phần, số câu và thời lượng của cấp HSK; Biên tập viên không cần tự tính.</p></div></header><div className="studio-three-columns"><div className="studio-readonly-field"><span>Cấp HSK</span><strong>{examLevel.toUpperCase()}</strong><input name="examLevel" type="hidden" value={examLevel} readOnly /></div><label><span>Ký hiệu cửa</span><select name="formKey" value={formKey} onChange={(event) => {
      const nextForm = event.target.value as HskExamFormKey;
      setFormKey(nextForm);
      selectSuggestion(nextForm);
    }}>{HSK_EXAM_FORM_KEYS.map((key) => {
      const occupied = HSK_BUILT_IN_EXAM_FORM_KEYS.includes(
        key as typeof HSK_BUILT_IN_EXAM_FORM_KEYS[number],
      );
      return <option disabled={occupied} key={key} value={key}>Cửa {key.toUpperCase()}{occupied ? " · đã có sẵn" : ""}</option>;
    })}</select></label><div className="studio-readonly-field"><span>Quy mô chuẩn</span><strong>{expectedItemCount} câu · {structure.timeLimitMinutes} phút</strong></div></div><input name="timeLimitMinutes" type="hidden" value={structure.timeLimitMinutes} readOnly /><div className="studio-exam-structure" aria-label={`Cấu trúc ${examLevel.toUpperCase()}`}>{structure.sections.map((section, index) => <div key={section.skill}><b>{String(index + 1).padStart(2, "0")}</b><span><strong>{section.label}</strong><small>{section.itemCount} câu · {section.minutes} phút</small></span><input name={`coverage.${section.skill}`} type="hidden" value={section.itemCount} readOnly /></div>)}{!structure.sections.some((section) => section.skill === "writing") && <input name="coverage.writing" type="hidden" value="0" readOnly />}</div></section>
    <section className="studio-form-section"><header><span>02</span><div><h2>Ngân hàng câu đã kiểm định</h2><p>Hệ thống tự ghép một bộ câu duy nhất, đúng thứ tự và đúng tỷ lệ kỹ năng cho cửa đã chọn. Biên tập viên không phải sao chép mã câu.</p></div></header>{itemKeys.map((key) => <input key={key} type="hidden" name="itemStableKeys" value={key} />)}<div className="studio-exam-selection" role="status"><CheckCircle2 size={20} /><div><strong>{itemKeys.length}/{expectedItemCount} câu đã sắp xếp</strong><p>{structure.sections.map((section) => `${section.label} ${section.itemCount}`).join(" · ")}</p></div></div>{itemKeys.length !== expectedItemCount && <p className="studio-alert error" role="alert">Chưa có bộ câu phù hợp cho cửa này. Hãy chọn một cửa G–L khác hoặc liên hệ Điều Hành Viên bổ sung ngân hàng.</p>}</section>
  </>;
}

function LessonFormFields({
  content,
  level,
  mode,
}: {
  content: Record<string, unknown>;
  level: StudioLevel;
  mode: EditorMode;
}) {
  const availableLessons = RELEASED_LESSONS.filter((lesson) =>
    studioLessonMatchesLevel(lesson.unitId, level)
  );
  const storedTargetId = stringValue(content.targetLessonId);
  const initialTarget = availableLessons.find((lesson) => lesson.id === storedTargetId)
    ?? availableLessons[0];
  const [targetLessonId, setTargetLessonId] = useState(initialTarget?.id ?? "");
  const target = availableLessons.find((lesson) => lesson.id === targetLessonId)
    ?? initialTarget;
  const contentForTarget = targetLessonId === storedTargetId ? content : {};
  const words = target?.wordIds.map((wordId) =>
    RELEASED_VOCABULARY.find((word) => word.id === wordId)
  ).filter((word): word is NonNullable<typeof word> => Boolean(word)) ?? [];
  const changeTarget = (nextTargetId: string, form: HTMLFormElement | null) => {
    if (nextTargetId === targetLessonId) return;
    const authoredFields = form?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>([
      '[name="conceptVi"]',
      '[name="ruleVi"]',
      '[name="pitfallVi"]',
      '[name="checkpointVi"]',
      '[name^="dialogue."]',
      '[name^="grammar."]',
      '[name^="exercises."]',
    ].join(","));
    const hasAuthoredContent = authoredFields
      ? [...authoredFields].some((field) => field.value.trim().length > 0)
      : false;
    if (hasAuthoredContent && !window.confirm(
      "Đổi bài học đích sẽ xóa phần kiến thức, hội thoại, ngữ pháp và thực hành đang nhập để tránh gắn sai nội dung. Bạn có muốn tiếp tục?",
    )) return;
    setTargetLessonId(nextTargetId);
  };
  return <>
    <section className="studio-form-section">
      <header><span>01</span><div><h2>Vị trí trên Thiên Lộ</h2><p>Chọn đúng bài đang phát hành. Hệ thống giữ nguyên mã bài, khóa tiên quyết, XP và tiến độ của người học.</p></div></header>
      {mode === "create"
        ? <label><span>Bài học đích</span><select name="targetLessonId" required value={targetLessonId} onChange={(event) => changeTarget(event.target.value, event.currentTarget.form)}>{availableLessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title} · {lesson.chineseTitle}</option>)}</select><small>{availableLessons.length} bài {level.toUpperCase()} có thể biên soạn; đổi bài sẽ cập nhật lại thông tin định danh và xóa phần soạn chưa lưu.</small></label>
        : <div className="studio-readonly-field"><span>Bài học đích đã khóa</span><strong>{target ? `${target.title} · ${target.chineseTitle}` : targetLessonId}</strong><input name="targetLessonId" type="hidden" value={targetLessonId} readOnly /></div>}
      {target && <>
        {target.prerequisiteIds.map((lessonId) => <input key={lessonId} name="prerequisites" type="hidden" value={lessonId} readOnly />)}
        {target.wordIds.map((wordId) => <input key={wordId} name="vocabulary" type="hidden" value={wordId} readOnly />)}
        {target.skills.map((skill) => <input key={skill} name="skills" type="hidden" value={skill} readOnly />)}
        <div className="studio-three-columns">
          <div className="studio-readonly-field"><span>Khóa mở</span><strong>{target.prerequisiteIds.length ? `${target.prerequisiteIds.length} bài tiên quyết` : "Bài mở đầu cấp"}</strong></div>
          <div className="studio-readonly-field"><span>Từ cốt lõi</span><strong>{words.length} mục · {words.slice(0, 3).map((word) => word.simplified).join(" · ")}</strong></div>
          <div className="studio-readonly-field"><span>Kỹ năng được luyện</span><strong>{target.skills.map(skillLabel).join(" · ")}</strong></div>
        </div>
      </>}
      <div className="studio-draft-guard" role="note"><CheckCircle2 size={18} /><div><strong>Bản nháp thật, không nạp nội dung minh họa</strong><p>Hệ thống chỉ điền dữ liệu định danh của bài. Kiến thức, ví dụ và đáp án phải được biên soạn đúng mục tiêu bên dưới rồi mới có thể qua kiểm định.</p></div></div>
      <div key={`identity:${targetLessonId}`} className="studio-two-columns"><label><span>Tiêu đề tiếng Trung</span><input name="titleZh" lang="zh-Hans" required defaultValue={stringValue(contentForTarget.titleZh, target?.chineseTitle ?? "")} /></label><label><span>Mục tiêu người học</span><textarea name="objectiveVi" required defaultValue={stringValue(contentForTarget.objectiveVi, target?.objective ?? "")} /></label></div>
    </section>
    <div key={`authored:${targetLessonId}`} className="studio-editor-fields studio-lesson-content-fields">
      <details className="studio-form-section studio-collapsible-stage" open>
        <summary><span className="studio-stage-number">02</span><span><strong>Lý thuyết trước Thử Luyện</strong><small>Khái niệm, quy tắc, lỗi thường gặp và bước tự kiểm.</small></span><ChevronDown size={18} aria-hidden="true" /></summary>
        <div className="studio-stage-body"><p className="studio-stage-guidance">Viết ngắn, rõ và giúp người học tự truy hồi trước khi mở bài chấm điểm.</p><div className="studio-two-columns"><label><span>Khái niệm cốt lõi</span><textarea name="conceptVi" required defaultValue={stringValue(contentForTarget.conceptVi)} placeholder="Người học cần hiểu điều gì trước khi luyện?" /></label><label><span>Quy tắc áp dụng</span><textarea name="ruleVi" required defaultValue={stringValue(contentForTarget.ruleVi)} placeholder="Mô tả từng bước áp dụng bằng tiếng Việt dễ hiểu." /></label><label><span>Lỗi thường gặp</span><textarea name="pitfallVi" required defaultValue={stringValue(contentForTarget.pitfallVi)} placeholder="Nêu lỗi người mới dễ mắc và cách tự sửa." /></label><label><span>Bước tự kiểm</span><textarea name="checkpointVi" required defaultValue={stringValue(contentForTarget.checkpointVi)} placeholder="Yêu cầu người học tạo một đầu ra mới mà không nhìn mẫu." /></label></div></div>
      </details>
      <details className="studio-form-section studio-collapsible-stage">
        <summary><span className="studio-stage-number">03</span><span><strong>Hội thoại, ngữ pháp và thực hành</strong><small>Mở khi phần lý thuyết đã rõ và đủ để áp dụng.</small></span><ChevronDown size={18} aria-hidden="true" /></summary>
        <div className="studio-stage-body"><p className="studio-stage-guidance">Nội dung này xuất hiện trong phần lĩnh hội. Ngân hàng câu chấm điểm cốt lõi vẫn được giữ ổn định để không làm mất phiên và bằng chứng học.</p><TripleEditor label="Hội thoại hoặc bài đọc mẫu" prefix="dialogue" minimum={2} initialRows={triples(contentForTarget.dialogue)} /><GrammarEditor initialRows={grammarRows(contentForTarget.grammar)} /><ExerciseEditor legend="Thực hành có đáp án mẫu" requireAnswerTriple initialRows={exerciseRows(contentForTarget.exercises)} /></div>
      </details>
    </div>
  </>;
}

function ContentFields({ itemType, content, level, examFormSuggestions, mode }: { itemType: StudioItemType; content: Record<string, unknown>; level: StudioLevel; examFormSuggestions?: StudioStructuredEditorProps["examFormSuggestions"]; mode: EditorMode }) {
  if (itemType === "vocabulary") {
    return <>
      <section className="studio-form-section"><header><span>01</span><div><h2>Từ mục</h2><p>Nhập đúng một từ hoặc cụm từ, không nhập cả câu vào ô Hán tự.</p></div></header><div className="studio-three-columns"><label><span>Hán tự giản thể</span><input name="hanzi" required defaultValue={stringValue(content.hanzi)} /></label><label><span>Pinyin có dấu thanh</span><input name="pinyin" required defaultValue={stringValue(content.pinyin)} /></label><label><span>Nghĩa tiếng Việt</span><input name="meaningVi" required defaultValue={stringValue(content.meaningVi)} /></label></div></section>
      <section className="studio-form-section"><header><span>02</span><div><h2>Ngữ cảnh sử dụng</h2><p>Mỗi ví dụ phải có đủ tiếng Trung, Pinyin và nghĩa Việt.</p></div></header><LessonLinkPicker value={content.sourceLessonIds} level={level} /><TripleEditor label="Câu ví dụ" prefix="examples" initialRows={triples(content.examples)} /></section>
      <details className="studio-advanced"><summary><ChevronDown size={16} /> Thiết lập âm thanh</summary><label><span>Nguồn phát âm</span><select name="audioSource" defaultValue={stringValue(content.audioSource)}><option value="">Chưa gắn âm thanh</option><option value="browser-tts">Giọng tổng hợp của trình duyệt</option><option value="native-audio">Audio bản ngữ đã duyệt</option></select></label></details>
    </>;
  }
  if (itemType === "character") {
    const context = record(content.context);
    const strokeProvenance = record(content.strokeProvenance);
    return <>
      <section className="studio-form-section"><header><span>01</span><div><h2>Hồ sơ Hán tự</h2><p>Thần Văn Lô tập trung vào một chữ; nghĩa của cả từ thuộc Tàng Tự Khố.</p></div></header><div className="studio-three-columns"><label><span>Hán tự</span><input name="hanzi" required maxLength={4} defaultValue={stringValue(content.hanzi)} /></label><label><span>Pinyin</span><input name="pinyin" required defaultValue={stringValue(content.pinyin)} /></label><label><span>Nghĩa cốt lõi</span><input name="meaningVi" required defaultValue={stringValue(content.meaningVi)} /></label></div></section>
      <section className="studio-form-section"><header><span>02</span><div><h2>Nhận diện trong từ</h2><p>Cho người học thấy chữ này xuất hiện ở đâu trước khi luyện nét.</p></div></header><LessonLinkPicker value={content.sourceLessonIds} level={level} /><TripleEditor label="Từ hoặc câu ngữ cảnh" prefix="context" minimum={1} initialRows={context ? triples([context]) : []} /></section>
      <details className="studio-advanced"><summary><ChevronDown size={16} /> Cấu tạo và dữ liệu nét</summary><div className="studio-three-columns"><label><span>Bộ thủ</span><input name="radical" defaultValue={stringValue(content.radical)} /></label><label><span>Số nét</span><input name="strokeCount" type="number" min="1" max="64" defaultValue={numberValue(content.strokeCount) || ""} /></label><label><span>Tên bộ dữ liệu nét</span><input name="strokeSourceName" defaultValue={stringValue(strokeProvenance?.sourceName)} placeholder="Ví dụ: Hanzi Writer Data" /></label><label><span>Trang nguồn hoặc tệp nội bộ</span><input name="strokeSourceUrl" defaultValue={stringValue(strokeProvenance?.sourceUrl)} placeholder="https://… hoặc /assets/…" /></label><label><span>Giấy phép / quyền sử dụng</span><input name="strokeLicenseVi" defaultValue={stringValue(strokeProvenance?.licenseVi)} placeholder="Tên giấy phép hoặc xác nhận sở hữu" /></label></div><p>Chỉ điền khi có đủ tên nguồn, địa chỉ và quyền sử dụng. Thông tin này không tự mở chấm nét; dữ liệu nét còn phải qua kiểm định nguồn gốc trước khi tích hợp.</p></details>
    </>;
  }
  if (itemType === "grammar") {
    return <>
      <section className="studio-form-section"><header><span>01</span><div><h2>Mẫu ngữ pháp</h2><p>Giải thích bằng tiếng Việt ngắn gọn, ưu tiên cách dùng trước thuật ngữ.</p></div></header><div className="studio-two-columns"><label><span>Mẫu câu</span><input name="pattern" required defaultValue={stringValue(content.pattern)} /></label><label><span>Giải thích tiếng Việt</span><textarea name="explanationVi" required defaultValue={stringValue(content.explanationVi)} /></label></div></section>
      <section className="studio-form-section"><header><span>02</span><div><h2>Ví dụ và tự kiểm</h2><p>Ví dụ phải đúng cấp độ và thể hiện rõ mẫu vừa giải thích.</p></div></header><LessonLinkPicker value={content.sourceLessonIds} level={level} /><TripleEditor label="Ví dụ ngữ pháp" prefix="examples" initialRows={triples(content.examples)} /><div className="studio-two-columns"><label><span>Lỗi thường gặp</span><textarea name="pitfallVi" required defaultValue={stringValue(content.pitfallVi)} /></label><label><span>Bước tự tạo câu</span><textarea name="checkpointVi" required defaultValue={stringValue(content.checkpointVi)} /></label></div></section>
    </>;
  }
  if (itemType === "pronunciation") {
    return <>
      <section className="studio-form-section"><header><span>01</span><div><h2>Mục tiêu luyện âm</h2><p>Chọn loại bài rồi mô tả điều người học cần nghe ra và tự đọc được.</p></div></header><div className="studio-two-columns"><label><span>Loại mục tiêu</span><select name="targetKind" defaultValue={stringValue(content.targetKind, "tone-system")}><option value="tone-system">Hệ thống thanh điệu</option><option value="initial-contrast">Đối chiếu âm đầu</option><option value="tone-sandhi">Biến điệu trong lời nói</option></select></label><label><span>Âm hoặc cặp âm mục tiêu</span><textarea name="targets" required defaultValue={asLines(content.targets)} /><small>Mỗi mục một dòng.</small></label></div><LessonLinkPicker value={content.sourceLessonIds} level={level} /><div className="studio-two-columns"><label><span>Mục tiêu giải thích bằng tiếng Việt</span><textarea name="conceptVi" required defaultValue={stringValue(content.conceptVi)} /></label><label><span>Quy tắc luyện</span><textarea name="ruleVi" required defaultValue={stringValue(content.ruleVi)} /></label></div></section>
      <section className="studio-form-section"><header><span>02</span><div><h2>Mẫu nghe và đối chiếu</h2><p>Cần ít nhất hai mẫu Trung–Pinyin–Việt; giọng tổng hợp luôn được ghi rõ là phương án dự phòng.</p></div></header><TripleEditor label="Mẫu luyện âm" prefix="examples" minimum={2} initialRows={triples(content.examples)} /><div className="studio-two-columns"><label><span>Lỗi thường gặp</span><textarea name="pitfallVi" required defaultValue={stringValue(content.pitfallVi)} /></label><label><span>Bước tự nghe hoặc tự đọc</span><textarea name="checkpointVi" required defaultValue={stringValue(content.checkpointVi)} /></label></div></section>
      <details className="studio-advanced"><summary><ChevronDown size={16} /> Nguồn âm thanh</summary><label><span>Nguồn phát</span><select name="audioSource" defaultValue={stringValue(content.audioSource)}><option value="">Chưa gắn âm thanh</option><option value="browser-tts">Giọng tổng hợp của trình duyệt</option><option value="native-audio">Audio bản ngữ đã duyệt</option></select></label><p>Bản chép lời hoặc giọng máy không tự trở thành điểm phát âm.</p></details>
    </>;
  }
  if (itemType === "communicative_function") {
    const selectedSkills = new Set(Array.isArray(content.skills)
      ? content.skills.filter((skill): skill is string => typeof skill === "string")
      : []);
    return <>
      <section className="studio-form-section"><header><span>01</span><div><h2>Tình huống giao tiếp</h2><p>Viết bằng ngôn ngữ đời thường: người học đang ở đâu và cần làm được việc gì?</p></div></header><div className="studio-two-columns"><label><span>Chức năng giao tiếp</span><input name="functionVi" required defaultValue={stringValue(content.functionVi)} /></label><label><span>Tình huống</span><textarea name="scenarioVi" required defaultValue={stringValue(content.scenarioVi)} /></label><label><span>Đầu ra quan sát được</span><textarea name="outcomeVi" required defaultValue={stringValue(content.outcomeVi)} /></label></div><LessonLinkPicker value={content.sourceLessonIds} level={level} /><fieldset className="studio-fieldset"><legend>Kỹ năng đích</legend><div className="studio-check-grid">{[["listening", "Nghe"], ["speaking", "Nói"], ["reading", "Đọc"]].map(([value, label]) => <label key={value}><input type="checkbox" name="skills" value={value} defaultChecked={selectedSkills.has(value)} /><span>{label}</span></label>)}</div></fieldset></section>
      <section className="studio-form-section"><header><span>02</span><div><h2>Hội thoại và nhiệm vụ</h2><p>Cho mẫu vừa đủ rồi yêu cầu người học tự tạo đầu ra mới.</p></div></header><TripleEditor label="Hội thoại mẫu" prefix="dialogue" minimum={2} initialRows={triples(content.dialogue)} /><ExerciseEditor legend="Nhiệm vụ vận dụng" requireDistractors={false} initialRows={exerciseRows(content.tasks)} /></section>
    </>;
  }
  if (itemType === "graded_text") {
    const rights = record(content.rights);
    return <>
      <section className="studio-form-section"><header><span>01</span><div><h2>Hồ sơ bài đọc</h2><p>Dùng cho một bài đọc ngắn; sách nhiều chương dùng Bàn biên soạn sách.</p></div></header><div className="studio-two-columns"><label><span>Tiêu đề tiếng Trung</span><input name="titleZh" lang="zh-Hans" required defaultValue={stringValue(content.titleZh)} /></label><label><span>Phút đọc ước tính</span><input name="estimatedMinutes" type="number" min="1" max="60" required defaultValue={numberValue(content.estimatedMinutes, 4)} /></label></div><label><span>Tóm tắt tiếng Việt</span><textarea name="summaryVi" required defaultValue={stringValue(content.summaryVi)} /></label><LessonLinkPicker value={content.sourceLessonIds} level={level} /></section>
      <section className="studio-form-section"><header><span>02</span><div><h2>Văn bản và đọc hiểu</h2><p>Căn chỉnh từng đoạn Trung–Pinyin–Việt, sau đó thêm câu hỏi không hé lộ đáp án.</p></div></header><TripleEditor label="Đoạn đọc" prefix="sentences" minimum={2} initialRows={triples(content.sentences)} /><ExerciseEditor legend="Câu hỏi đọc hiểu" initialRows={exerciseRows(content.comprehension)} /></section>
      <section className="studio-form-section"><header><span>03</span><div><h2>Nguồn gốc và quyền sử dụng</h2><p>Thông tin này đi cùng bài đọc tới Vạn Quyển Các và giúp hệ thống chặn nội dung không rõ nguồn.</p></div></header><div className="studio-two-columns"><label><span>Loại nguồn</span><select name="sourceKind" defaultValue={stringValue(rights?.sourceKind, "original-hanzi-os")}><option value="original-hanzi-os">Bản thảo nguyên bản của HANZI.OS</option><option value="licensed-third-party">Nguồn mở hoặc được cấp phép</option></select></label><label><span>Giấy phép nếu dùng nguồn ngoài</span><input name="licenseVi" maxLength={500} defaultValue={stringValue(rights?.licenseVi)} placeholder="Ví dụ: CC BY 4.0 · dùng có ghi nguồn" /></label></div><label><span>Nguồn gốc văn bản</span><textarea name="textProvenanceVi" required maxLength={1000} defaultValue={stringValue(rights?.textProvenanceVi)} placeholder="Ví dụ: Bản thảo nguyên bản do đội nội dung HANZI.OS soạn ngày…" /><small>Nếu dùng nguồn ngoài, ghi rõ tác giả, địa chỉ nguồn và phạm vi được phép sử dụng.</small></label><label className="studio-attestation"><input name="editorAttestsRights" type="checkbox" required defaultChecked={rights?.editorAttestsRights === true} /><span>Tôi xác nhận HANZI.OS có quyền phát hành văn bản này và nội dung không sao chép tài liệu đóng.</span></label></section>
    </>;
  }
  if (itemType === "lesson") {
    return <LessonFormFields content={content} level={level} mode={mode} />;
  }
  if (itemType === "exam_item") {
    const options = Array.isArray(content.options)
      ? content.options.filter((item): item is string => typeof item === "string").join("\n")
      : "";
    return <>
      <section className="studio-form-section"><header><span>01</span><div><h2>Câu hỏi</h2><p>Ngữ liệu và yêu cầu không được hé lộ đáp án.</p></div></header><div className="studio-two-columns"><label><span>Kỹ năng</span><select name="skill" defaultValue={stringValue(content.skill, "reading")}><option value="listening">Nghe</option><option value="reading">Đọc</option><option value="writing">Viết</option><option value="vocabulary">Từ vựng</option><option value="grammar">Ngữ pháp</option></select></label><label><span>Yêu cầu bằng tiếng Việt</span><input name="promptVi" required defaultValue={stringValue(content.promptVi)} /></label></div><LessonLinkPicker value={content.sourceLessonIds} level={level} /><div className="studio-two-columns"><label><span>Câu hoặc cụm từ tiếng Trung</span><textarea name="hanzi" defaultValue={stringValue(content.hanzi)} /></label><label><span>Đoạn văn nếu có</span><textarea name="passageHanzi" defaultValue={stringValue(content.passageHanzi)} /></label></div></section>
      <section className="studio-form-section"><header><span>02</span><div><h2>Đáp án và lời giải</h2><p>Nhập mỗi lựa chọn một dòng; vị trí đáp án tính từ 1.</p></div></header><div className="studio-two-columns"><label><span>Các lựa chọn</span><textarea name="options" required defaultValue={options} /></label><label><span>Vị trí đáp án đúng</span><input name="answerIndex" type="number" min="1" max="8" required defaultValue={numberValue(content.answerIndex) + 1} /><span>Lời giải tiếng Việt</span><textarea name="explanationVi" required defaultValue={stringValue(content.explanationVi)} /></label></div></section>
    </>;
  }
  return <ExamFormFields content={content} initialLevel={level} suggestions={examFormSuggestions} preserveStoredSelection={mode === "update"} />;
}

export function StudioStructuredEditor({
  mode,
  draftSeed,
  initialItemType = "lesson",
  initialLevel = "hsk1",
  initialTitle = "",
  initialStableKey,
  initialContent,
  revisionId,
  expectedRowVersion,
  examFormSuggestions,
}: StudioStructuredEditorProps) {
  const [itemType, setItemType] = useState<StudioItemType>(initialItemType);
  const [level, setLevel] = useState<StudioLevel>(initialLevel);
  const [title, setTitle] = useState(initialTitle);
  const [dirty, setDirty] = useState(false);
  const hiddenContent = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const content = useMemo(() => mode === "update"
    ? initialContent ?? studioBlankDraftContent(itemType, level)
    : studioBlankDraftContent(itemType, level), [initialContent, itemType, level, mode]);
  const presentation = STUDIO_ITEM_PRESENTATION[itemType];
  const Icon = iconFor[itemType];
  const stableKey = mode === "update" && initialStableKey
    ? initialStableKey
    : `${level}.${itemType}.${slug(title) || "noi-dung-moi"}-${draftSeed}`;
  const readerSeriesId = studioGradedTextSeriesId(stableKey);

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (!dirty || submitting.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [dirty]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    if (!hiddenContent.current) {
      event.preventDefault();
      return;
    }
    const data = new FormData(event.currentTarget);
    hiddenContent.current.value = JSON.stringify(buildContent(itemType, data, content));
    submitting.current = true;
  };

  return (
    <form className="studio-structured-editor" action="/studio/actions" method="post" onInput={() => setDirty(true)} onInvalid={(event) => {
      const disclosure = (event.target as HTMLElement).closest<HTMLDetailsElement>("details");
      if (disclosure) disclosure.open = true;
    }} onSubmit={submit}>
      <input type="hidden" name="action" value={mode === "create" ? "create" : "update"} />
      <input type="hidden" name="idempotencyKey" value={`studio-${mode}:${draftSeed}`} />
      <input ref={hiddenContent} type="hidden" name="contentJson" defaultValue="{}" />
      {itemType === "graded_text" && <input type="hidden" name="readerSeriesId" value={readerSeriesId} readOnly />}
      {mode === "create" ? <input type="hidden" name="stableKey" value={stableKey} /> : <>
        <input type="hidden" name="revisionId" value={revisionId} />
        <input type="hidden" name="expectedRowVersion" value={expectedRowVersion} />
      </>}

      <div className="studio-editor-heading">
        <span className="studio-editor-icon"><Icon size={26} /></span>
        <div><small>{mode === "create" ? "ĐANG TẠO BẢN NHÁP" : "ĐANG CHỈNH BẢN NHÁP"} · {presentation.module}</small><h2>{mode === "create" ? `Biểu mẫu ${presentation.label.toLowerCase()}` : `Biên tập ${presentation.label.toLowerCase()}`}</h2><p>{presentation.description} Các ô có dấu * là bắt buộc.</p></div>
      </div>

      <section className="studio-form-section studio-identity-section">
        <header><span>ID</span><div><h2>Định danh bản nháp</h2><p>Chọn cấp độ và đặt tên để dễ tìm lại trong thư khố.</p></div></header>
        <div className="studio-three-columns">
          {mode === "create" ? <label><span>Loại nội dung</span><select name="itemType" value={itemType} onChange={(event) => {
            setItemType(event.target.value as StudioItemType);
            setTitle("");
          }}>{STUDIO_ITEM_TYPES.map((type) => <option value={type} key={type}>{STUDIO_ITEM_PRESENTATION[type].label}</option>)}</select></label> : <div className="studio-readonly-field"><span>Khu vực hiển thị</span><strong>{presentation.module} · {presentation.label}</strong></div>}
          <label><span>Cấp độ HSK</span><select name="level" value={level} onChange={(event) => setLevel(event.target.value as StudioLevel)}>{STUDIO_LEVELS.filter((value) => itemType !== "exam_form" || isHskExamLevel(value)).map((value) => <option key={value} value={value}>{value.toUpperCase()}</option>)}</select></label>
          <label><span>Tên nội dung</span><input name="title" required maxLength={240} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Chào hỏi và giới thiệu" /><small>Dùng tên ngắn để cả đội dễ tìm và duyệt.</small></label>
        </div>
      </section>

      <div key={`${mode}:${itemType}:${level}`} className="studio-editor-fields">
        <ContentFields itemType={itemType} content={content} level={level} examFormSuggestions={examFormSuggestions} mode={mode} />
        <QualityChecklist initialContent={content} />
      </div>

      <footer className="studio-editor-footer">
        <div><Sparkles size={18} /><span><strong>{dirty ? "Có thay đổi chưa lưu" : mode === "create" ? "Bản nháp mới" : "Bản nháp đã đồng bộ"}</strong><small>Người học chưa thấy nội dung cho tới khi qua kiểm định và phê duyệt.</small></span></div>
        <button type="submit"><Save size={19} /> {mode === "create" ? "Tạo bản nháp" : "Lưu thay đổi"}</button>
      </footer>
    </form>
  );
}

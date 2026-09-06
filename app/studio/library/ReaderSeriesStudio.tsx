"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookPlus,
  CheckCircle2,
  ImageIcon,
  LibraryBig,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import type {
  EditorialReaderBook,
  EditorialReaderChapter,
  EditorialReaderParagraph,
} from "../../../src/reader/editorialReaderContent";
import type { StudioRevision } from "../../../src/server/contentStudioRepository";
import styles from "./library.module.css";

const slug = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/gu, "")
  .toLowerCase()
  .replace(/đ/gu, "d")
  .replace(/[^a-z0-9]+/gu, "-")
  .replace(/^-+|-+$/gu, "")
  .slice(0, 72);

const blankParagraph = (zhHans = ""): EditorialReaderParagraph => ({ zhHans, pinyin: "", vi: "" });
const blankChapter = (number: number): EditorialReaderChapter => ({
  titleZh: `第${number}章`,
  titleVi: "",
  hookVi: "",
  estimatedMinutes: 6,
  paragraphs: [blankParagraph(), blankParagraph()],
});
const READER_GENRES = ["Bí ẩn", "Đời sống", "Phiêu lưu", "Học đường", "Gia đình", "Tình bạn", "Chữa lành", "Tu tiên"] as const;

const splitChineseText = (value: string) => {
  const blocks = value.split(/\n\s*\n/gu).map((part) => part.trim()).filter(Boolean);
  if (blocks.length >= 2) return blocks;
  const sentences = value.match(/[^。！？!?]+[。！？!?]?/gu)?.map((part) => part.trim()).filter(Boolean) ?? [];
  return sentences.length >= 2 ? sentences : blocks;
};

const chapterBody = (chapter: EditorialReaderChapter) => chapter.paragraphs
  .map((paragraph) => paragraph.zhHans.trim())
  .filter(Boolean)
  .join("\n\n");

type EnrichmentPayload = {
  titleVi: string;
  synopsisVi: string;
  hookVi: string;
  chapters: Array<{
    titleVi: string;
    hookVi: string;
    estimatedMinutes: number;
    paragraphs: Array<{ pinyin: string; vi: string }>;
  }>;
};

export function ReaderSeriesStudio({
  revisions,
  canDraft,
  aiAvailable,
}: {
  revisions: StudioRevision[];
  canDraft: boolean;
  aiAvailable: boolean;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [titleZh, setTitleZh] = useState("");
  const [titleVi, setTitleVi] = useState("");
  const [synopsisVi, setSynopsisVi] = useState("");
  const [hookVi, setHookVi] = useState("");
  const [coverSrc, setCoverSrc] = useState("");
  const [chapters, setChapters] = useState<EditorialReaderChapter[]>([blankChapter(1)]);
  const [enriching, setEnriching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdRevisionId, setCreatedRevisionId] = useState("");
  const suggestedId = useMemo(() => slug(titleVi), [titleVi]);

  const replaceChapters = (updater: (current: EditorialReaderChapter[]) => EditorialReaderChapter[]) => {
    setChapters(updater);
    setCreatedRevisionId("");
  };

  const updateChapter = (index: number, patch: Partial<EditorialReaderChapter>) => {
    replaceChapters((current) => current.map((chapter, chapterIndex) =>
      chapterIndex === index ? { ...chapter, ...patch } : chapter));
  };

  const updateChapterBody = (index: number, value: string) => {
    const parts = splitChineseText(value);
    updateChapter(index, {
      paragraphs: (parts.length ? parts : [""]).map((zhHans, paragraphIndex) => ({
        zhHans,
        pinyin: chapters[index]?.paragraphs[paragraphIndex]?.pinyin ?? "",
        vi: chapters[index]?.paragraphs[paragraphIndex]?.vi ?? "",
      })),
    });
  };

  const updateParagraph = (
    chapterIndex: number,
    paragraphIndex: number,
    key: "pinyin" | "vi",
    value: string,
  ) => {
    replaceChapters((current) => current.map((chapter, index) => index === chapterIndex
      ? {
          ...chapter,
          paragraphs: chapter.paragraphs.map((paragraph, pIndex) => pIndex === paragraphIndex
            ? { ...paragraph, [key]: value }
            : paragraph),
        }
      : chapter));
  };

  const sourceForAi = () => ({
    titleZh: titleZh.trim(),
    chapters: chapters.map((chapter) => ({
      titleZh: chapter.titleZh.trim(),
      paragraphs: splitChineseText(chapterBody(chapter)),
    })),
  });

  const sourceIsReady = () => {
    if (!/\p{Script=Han}/u.test(titleZh)) {
      setError("Hãy nhập tên sách bằng tiếng Trung.");
      return false;
    }
    const invalidChapter = sourceForAi().chapters.findIndex((chapter) =>
      !/\p{Script=Han}/u.test(chapter.titleZh)
      || chapter.paragraphs.length < 2
      || chapter.paragraphs.some((paragraph) => !/\p{Script=Han}/u.test(paragraph)));
    if (invalidChapter >= 0) {
      setError(`Chương ${invalidChapter + 1} cần tiêu đề và ít nhất 2 đoạn tiếng Trung.`);
      return false;
    }
    return true;
  };

  const enrichWithAi = async () => {
    setError("");
    setCreatedRevisionId("");
    if (!sourceIsReady()) return;
    setEnriching(true);
    try {
      const response = await fetch("/api/studio/reader-series/enrich", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sourceForAi()),
      });
      const payload = await response.json() as {
        enriched?: EnrichmentPayload;
        error?: { message?: string };
      };
      if (!response.ok || !payload.enriched) {
        throw new Error(payload.error?.message ?? "Chưa thể tạo Pinyin và bản dịch.");
      }
      const enriched = payload.enriched;
      setTitleVi(enriched.titleVi);
      setSynopsisVi(enriched.synopsisVi);
      setHookVi(enriched.hookVi);
      replaceChapters((current) => current.map((chapter, chapterIndex) => {
        const translated = enriched.chapters[chapterIndex];
        if (!translated) return chapter;
        return {
          ...chapter,
          titleVi: translated.titleVi,
          hookVi: translated.hookVi,
          estimatedMinutes: translated.estimatedMinutes,
          paragraphs: chapter.paragraphs.map((paragraph, paragraphIndex) => ({
            ...paragraph,
            pinyin: translated.paragraphs[paragraphIndex]?.pinyin ?? "",
            vi: translated.paragraphs[paragraphIndex]?.vi ?? "",
          })),
        };
      }));
      setStep(2);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chưa thể tạo Pinyin và bản dịch.");
    } finally {
      setEnriching(false);
    }
  };

  const openManualReview = () => {
    setError("");
    if (!sourceIsReady()) return;
    setStep(2);
  };

  const translationsAreReady = () => {
    const invalidChapter = chapters.findIndex((chapter) =>
      !chapter.titleVi.trim()
      || !chapter.hookVi.trim()
      || chapter.paragraphs.some((paragraph) => !paragraph.pinyin.trim() || !paragraph.vi.trim()));
    if (!titleVi.trim() || invalidChapter >= 0) {
      setError(invalidChapter >= 0
        ? `Hãy hoàn tất Pinyin và bản dịch của chương ${invalidChapter + 1}.`
        : "Hãy nhập tên sách tiếng Việt.");
      return false;
    }
    return true;
  };

  const continueToDetails = () => {
    setError("");
    if (translationsAreReady()) setStep(3);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setCreatedRevisionId("");
    if (!translationsAreReady()) return;
    const data = new FormData(event.currentTarget);
    const id = suggestedId;
    if (!id) {
      setError("Tên tiếng Việt chưa tạo được định danh sách.");
      return;
    }
    const book: EditorialReaderBook = {
      schemaVersion: 1,
      seriesId: id,
      titleZh,
      titleVi,
      synopsisVi,
      hookVi,
      genreIds: data.getAll("genreIds").map(String),
      shelfId: String(data.get("shelfId") ?? "doi-song") as EditorialReaderBook["shelfId"],
      levelBand: {
        min: String(data.get("levelMin") ?? "HSK2") as EditorialReaderBook["levelBand"]["min"],
        max: String(data.get("levelMax") ?? "HSK3") as EditorialReaderBook["levelBand"]["max"],
        label: `${String(data.get("levelMin") ?? "HSK2")}–${String(data.get("levelMax") ?? "HSK3")} · độ khó gợi ý`,
      },
      cover: {
        src: coverSrc,
        altVi: String(data.get("coverAltVi") ?? ""),
        tone: String(data.get("coverTone") ?? "jade") as EditorialReaderBook["cover"]["tone"],
      },
      chapters,
      rights: {
        textProvenanceVi: String(data.get("textProvenanceVi") ?? ""),
        coverProvenanceVi: String(data.get("coverProvenanceVi") ?? ""),
        editorAttestsRights: true,
      },
      humanReviewed: false,
    };
    setSubmitting(true);
    try {
      const response = await fetch("/api/studio/reader-series", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          book,
          idempotencyKey: `reader-series:${id}:${crypto.randomUUID()}`,
        }),
      });
      const payload = await response.json() as {
        revision?: { id?: string };
        error?: { message?: string };
      };
      if (!response.ok || !payload.revision?.id) {
        throw new Error(payload.error?.message ?? "Chưa thể tạo bản nháp sách.");
      }
      setCreatedRevisionId(payload.revision.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chưa thể tạo bản nháp sách.");
    } finally {
      setSubmitting(false);
    }
  };

  return <div className={styles.workspace}>
    {canDraft && <form className={styles.form} id="new-reader-series" onSubmit={submit}>
      <header className={styles.formHero}>
        <span><BookPlus size={24} /></span>
        <div><small>SÁCH MỚI</small><h2>Soạn sách nhiều chương</h2></div>
      </header>

      <ol className={styles.steps} aria-label="Ba bước soạn sách">
        {["Bản thảo Trung", "Xem bản dịch", "Hoàn tất"].map((label, index) => {
          const number = index + 1 as 1 | 2 | 3;
          return <li className={step === number ? styles.currentStep : step > number ? styles.doneStep : ""} key={label} aria-current={step === number ? "step" : undefined}><b>{step > number ? <CheckCircle2 size={16} /> : number}</b><span>{label}</span></li>;
        })}
      </ol>

      {step === 1 && <section className={styles.stepPanel} aria-labelledby="reader-source-title">
        <header><span>1</span><h3 id="reader-source-title">Dán bản thảo tiếng Trung</h3></header>
        <label className={styles.bookTitle}><span>Tên sách</span><input required lang="zh-Hans" value={titleZh} onChange={(event) => setTitleZh(event.target.value)} placeholder="雨后的城市" /></label>
        <div className={styles.chapterStack}>{chapters.map((chapter, chapterIndex) => <section className={styles.chapterCard} key={chapterIndex}>
          <header><strong>Chương {chapterIndex + 1}</strong>{chapters.length > 1 && <button type="button" onClick={() => replaceChapters((current) => current.filter((_chapter, index) => index !== chapterIndex))} aria-label={`Xóa chương ${chapterIndex + 1}`}><Trash2 size={17} /> Xóa</button>}</header>
          <label><span>Tiêu đề chương</span><input required lang="zh-Hans" value={chapter.titleZh} onChange={(event) => updateChapter(chapterIndex, { titleZh: event.target.value })} /></label>
          <label><span>Nội dung tiếng Trung</span><textarea required lang="zh-Hans" rows={10} value={chapterBody(chapter)} onChange={(event) => updateChapterBody(chapterIndex, event.target.value)} placeholder="Mỗi đoạn cách nhau một dòng trống." /></label>
        </section>)}</div>
        <button className={styles.addChapter} type="button" onClick={() => replaceChapters((current) => [...current, blankChapter(current.length + 1)])}><Plus size={18} /> Thêm chương</button>
        <div className={styles.aiAction}>
          <button type="button" onClick={enrichWithAi} disabled={enriching || !aiAvailable}><Sparkles size={18} /> {enriching ? "Đang tạo bản dịch…" : aiAvailable ? "Tạo Pinyin & bản dịch" : "Gemini chưa kết nối"}</button>
          <button className={styles.textButton} type="button" onClick={openManualReview}>Nhập bản dịch thủ công</button>
        </div>
      </section>}

      {step === 2 && <section className={styles.stepPanel} aria-labelledby="reader-translation-title">
        <header><span>2</span><div><h3 id="reader-translation-title">Xem lại bản dịch</h3><small>AI · chưa duyệt</small></div></header>
        <label className={styles.bookTitle}><span>Tên sách tiếng Việt</span><input required value={titleVi} onChange={(event) => setTitleVi(event.target.value)} /></label>
        <div className={styles.translationStack}>{chapters.map((chapter, chapterIndex) => <details className={styles.translationChapter} open={chapterIndex === 0} key={chapterIndex}>
          <summary><span>Chương {chapterIndex + 1}</span><strong>{chapter.titleVi || "Chưa có bản dịch"}</strong></summary>
          <div className={styles.translationChapterBody}>
            <div className={styles.grid2}>
              <label><span>Tiêu đề Việt</span><input required value={chapter.titleVi} onChange={(event) => updateChapter(chapterIndex, { titleVi: event.target.value })} /></label>
              <label><span>Câu dẫn ngắn</span><input required value={chapter.hookVi} onChange={(event) => updateChapter(chapterIndex, { hookVi: event.target.value })} /></label>
            </div>
            {chapter.paragraphs.map((paragraph, paragraphIndex) => <article className={styles.translationRow} key={paragraphIndex}>
              <p lang="zh-Hans">{paragraph.zhHans}</p>
              <label><span>Pinyin</span><textarea required rows={2} value={paragraph.pinyin} onChange={(event) => updateParagraph(chapterIndex, paragraphIndex, "pinyin", event.target.value)} /></label>
              <label><span>Nghĩa tiếng Việt</span><textarea required rows={2} value={paragraph.vi} onChange={(event) => updateParagraph(chapterIndex, paragraphIndex, "vi", event.target.value)} /></label>
            </article>)}
          </div>
        </details>)}</div>
        <div className={styles.stepActions}><button className={styles.secondary} type="button" onClick={() => setStep(1)}><ArrowLeft size={17} /> Bản thảo</button><button className={styles.primary} type="button" onClick={continueToDetails}>Tiếp tục <ArrowRight size={17} /></button></div>
      </section>}

      {step === 3 && <section className={styles.stepPanel} aria-labelledby="reader-details-title">
        <header><span>3</span><h3 id="reader-details-title">Hoàn tất thông tin sách</h3></header>
        <div className={styles.grid2}>
          <label><span>Tên tiếng Việt</span><input required value={titleVi} onChange={(event) => setTitleVi(event.target.value)} /></label>
          <label><span>Kệ sách</span><select name="shelfId" defaultValue="doi-song"><option value="doi-song">Đời sống</option><option value="bi-an">Bí ẩn</option><option value="tu-tien">Tu tiên</option><option value="light-novel">Light novel</option><option value="vo-hiep">Võ hiệp</option><option value="khoa-huyen">Khoa huyễn</option><option value="triet-ly">Triết lý</option><option value="trung-sinh">Trùng sinh</option></select></label>
        </div>
        <label><span>Mô tả ngắn</span><textarea required rows={3} maxLength={2000} value={synopsisVi} onChange={(event) => setSynopsisVi(event.target.value)} /></label>
        <label><span>Câu giới thiệu</span><textarea required rows={2} maxLength={600} value={hookVi} onChange={(event) => setHookVi(event.target.value)} /></label>
        <div className={styles.grid2}>
          <label><span>Cấp độ từ</span><select name="levelMin" defaultValue="HSK2"><option>HSK1</option><option>HSK2</option><option>HSK3</option><option>HSK4</option></select></label>
          <label><span>Đến</span><select name="levelMax" defaultValue="HSK3"><option>HSK1</option><option>HSK2</option><option>HSK3</option><option>HSK4</option></select></label>
        </div>
        <fieldset className={styles.genrePicker}><legend>Thể loại</legend><div>{READER_GENRES.map((genre, index) => <label key={genre}><input type="checkbox" name="genreIds" value={genre} defaultChecked={index === 1} /><span>{genre}</span></label>)}</div></fieldset>
        <div className={styles.coverEditor}>
          <div className={styles.coverPreview}>{coverSrc ? <img src={coverSrc} alt="Xem trước bìa" /> : <ImageIcon size={38} />}</div>
          <div>
            <label><span>Ảnh bìa</span><input required value={coverSrc} onChange={(event) => setCoverSrc(event.target.value)} placeholder="/reader/covers/ten-sach.webp" /></label>
            <label><span>Mô tả ảnh</span><input required name="coverAltVi" maxLength={300} /></label>
            <label><span>Tông bìa</span><select name="coverTone" defaultValue="jade"><option value="jade">Ngọc</option><option value="ember">Hỏa</option><option value="violet">Tím</option><option value="azure">Lam</option><option value="copper">Đồng</option><option value="indigo">Chàm</option><option value="rose">Hồng</option><option value="slate">Đá</option></select></label>
          </div>
        </div>
        <details className={styles.rightsPanel}>
          <summary>Nguồn và quyền sử dụng</summary>
          <div><label><span>Nguồn bản thảo</span><textarea required name="textProvenanceVi" rows={2} /></label><label><span>Nguồn ảnh bìa</span><textarea required name="coverProvenanceVi" rows={2} /></label><label className={styles.attest}><input required type="checkbox" /><span>Tôi xác nhận có quyền sử dụng nội dung và hình ảnh này.</span></label></div>
        </details>
        <div className={styles.stepActions}><button className={styles.secondary} type="button" onClick={() => setStep(2)}><ArrowLeft size={17} /> Bản dịch</button><button className={styles.primary} type="submit" disabled={submitting}>{submitting ? "Đang lưu…" : <><Save size={18} /> Lưu bản nháp</>}</button></div>
      </section>}

      {error && <p className={styles.error} role="alert">{error}</p>}
      {createdRevisionId && <p className={styles.success} role="status">Đã lưu bản nháp. <a href={`/studio/items/${encodeURIComponent(createdRevisionId)}`}>Mở nội dung</a></p>}
    </form>}

    <details className={styles.inventory}>
      <summary><span><LibraryBig size={19} /> Sách đang xử lý</span><strong>{revisions.length}</strong></summary>
      {revisions.length
        ? <div className={styles.revisionGrid}>{revisions.map((revision) => <article key={revision.id}><span>{revision.workflowState === "published" ? "Đang phát hành" : "Đang biên tập"}</span><h3>{revision.title.replace(/^Vạn Quyển Các · /u, "")}</h3><a href={`/studio/items/${encodeURIComponent(revision.id)}`}>Mở sách <ArrowRight size={15} /></a></article>)}</div>
        : <div className={styles.empty}><LibraryBig size={28} /><p>Chưa có sách.</p></div>}
    </details>
  </div>;
}

"use client";

import {
  BookPlus,
  CheckCircle2,
  ImageIcon,
  LibraryBig,
  Plus,
  Save,
  ScanSearch,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { lookupMegaVocabulary } from "../../../src/content/megaLexicon";
import type {
  EditorialReaderBook,
  EditorialReaderChapter,
} from "../../../src/reader/editorialReaderContent";
import {
  editorialReaderContentFingerprint,
  scanEditorialReaderVocabulary,
  type EditorialReaderLexiconScan,
} from "../../../src/reader/editorialReaderLexiconScan";
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

const blankParagraph = () => ({ zhHans: "", pinyin: "", vi: "" });
const blankChapter = (number: number): EditorialReaderChapter => ({
  titleZh: `第${number}章`,
  titleVi: `Chương ${number}`,
  hookVi: "",
  estimatedMinutes: 6,
  paragraphs: [blankParagraph(), blankParagraph()],
});

export function ReaderSeriesStudio({
  revisions,
  canDraft,
}: {
  revisions: StudioRevision[];
  canDraft: boolean;
}) {
  const [titleVi, setTitleVi] = useState("");
  const [seriesId, setSeriesId] = useState("");
  const [coverSrc, setCoverSrc] = useState("");
  const [chapters, setChapters] = useState<EditorialReaderChapter[]>([blankChapter(1)]);
  const [lexiconScan, setLexiconScan] = useState<EditorialReaderLexiconScan | null>(null);
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdRevisionId, setCreatedRevisionId] = useState("");
  const suggestedId = useMemo(() => slug(titleVi), [titleVi]);

  const replaceChapters = (
    updater: (current: EditorialReaderChapter[]) => EditorialReaderChapter[],
  ) => {
    setChapters(updater);
    setLexiconScan(null);
  };

  const updateChapter = (index: number, patch: Partial<EditorialReaderChapter>) => {
    replaceChapters((current) => current.map((chapter, chapterIndex) =>
      chapterIndex === index ? { ...chapter, ...patch } : chapter));
  };

  const updateParagraph = (
    chapterIndex: number,
    paragraphIndex: number,
    key: "zhHans" | "pinyin" | "vi",
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

  const scanVocabulary = async () => {
    setError("");
    setCreatedRevisionId("");
    if (!chapters.some((chapter) => chapter.paragraphs.some((paragraph) =>
      /\p{Script=Han}/u.test(paragraph.zhHans)))) {
      setError("Hãy nhập nội dung tiếng Trung trước khi quét Tàng Tự Khố.");
      return;
    }
    setScanning(true);
    try {
      const report = await scanEditorialReaderVocabulary(
        chapters,
        async (surface) => Boolean(await lookupMegaVocabulary(surface)),
      );
      setLexiconScan(report);
    } catch {
      setError("Chưa thể đọc Tàng Tự Khố. Hãy kiểm tra lại kết nối nội bộ rồi quét lại.");
    } finally {
      setScanning(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setCreatedRevisionId("");
    if (
      !lexiconScan
      || lexiconScan.contentFingerprint !== editorialReaderContentFingerprint(chapters)
    ) {
      setError("Hãy quét Tàng Tự Khố sau lần chỉnh sửa nội dung gần nhất.");
      return;
    }
    const data = new FormData(event.currentTarget);
    const id = seriesId || suggestedId;
    const book: EditorialReaderBook = {
      schemaVersion: 1,
      seriesId: id,
      titleZh: String(data.get("titleZh") ?? ""),
      titleVi,
      synopsisVi: String(data.get("synopsisVi") ?? ""),
      hookVi: String(data.get("hookVi") ?? ""),
      genreIds: String(data.get("genreIds") ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
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
        backgroundProvenanceVi: String(data.get("backgroundProvenanceVi") ?? ""),
        editorAttestsRights: true,
      },
      lexiconScan,
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
    <section className={styles.inventory} aria-labelledby="reader-studio-inventory">
      <header>
        <div>
          <span>GIAN HÀNG NỘI DUNG</span>
          <h2 id="reader-studio-inventory">Sách đang qua quy trình biên tập</h2>
        </div>
        <strong>{revisions.length} revision</strong>
      </header>
      {revisions.length
        ? <div className={styles.revisionGrid}>{revisions.map((revision) => <article key={revision.id}>
            <span>{revision.workflowState === "published" ? "ĐANG PHÁT HÀNH" : revision.workflowState.toUpperCase()}</span>
            <h3>{revision.title.replace(/^Vạn Quyển Các · /u, "")}</h3>
            <p>{revision.stableKey} · bản {revision.revision}</p>
            <a href={`/studio/items/${encodeURIComponent(revision.id)}`}>Mở revision và quy trình duyệt</a>
          </article>)}</div>
        : <div className={styles.empty}>
            <LibraryBig size={28} />
            <p>Chưa có sách do biên tập viên đưa lên.</p>
          </div>}
    </section>

    {canDraft && <form className={styles.form} onSubmit={submit}>
      <header className={styles.formHero}>
        <span><BookPlus size={25} /></span>
        <div>
          <small>SẢN PHẨM MỚI</small>
          <h2>Thêm sách vào Vạn Quyển Các</h2>
          <p>Tạo draft trước; chỉ revision được phê duyệt và phát hành mới xuất hiện với người học.</p>
        </div>
      </header>

      <fieldset>
        <legend>01 · Hồ sơ sách</legend>
        <div className={styles.grid2}>
          <label>
            <span>Tên tiếng Việt</span>
            <input
              required
              maxLength={120}
              value={titleVi}
              onChange={(event) => {
                setTitleVi(event.target.value);
                if (!seriesId) setSeriesId(slug(event.target.value));
              }}
              placeholder="Ví dụ: Thành Phố Sau Cơn Mưa"
            />
          </label>
          <label>
            <span>Tên tiếng Trung</span>
            <input required name="titleZh" maxLength={80} lang="zh-Hans" placeholder="雨后的城市" />
          </label>
          <label>
            <span>Mã sách ổn định</span>
            <input
              required
              pattern="[a-z0-9][a-z0-9-]{2,71}"
              value={seriesId}
              onChange={(event) => setSeriesId(event.target.value.toLowerCase())}
              placeholder={suggestedId || "thanh-pho-sau-con-mua"}
            />
          </label>
          <label>
            <span>Thể loại, ngăn bằng dấu phẩy</span>
            <input required name="genreIds" placeholder="Bí ẩn, Đô thị, Chữa lành" />
          </label>
          <label>
            <span>Kệ trưng bày</span>
            <select name="shelfId" defaultValue="bi-an">
              <option value="tu-tien">Tu tiên</option>
              <option value="trung-sinh">Trùng sinh</option>
              <option value="light-novel">Light novel</option>
              <option value="bi-an">Bí ẩn</option>
              <option value="khoa-huyen">Khoa huyễn</option>
              <option value="triet-ly">Triết lý</option>
              <option value="vo-hiep">Võ hiệp</option>
              <option value="doi-song">Đời sống</option>
            </select>
          </label>
          <div className={styles.levelPair}>
            <label>
              <span>Từ cấp</span>
              <select name="levelMin" defaultValue="HSK2">
                <option>HSK1</option><option>HSK2</option><option>HSK3</option><option>HSK4</option>
              </select>
            </label>
            <label>
              <span>Đến cấp</span>
              <select name="levelMax" defaultValue="HSK3">
                <option>HSK1</option><option>HSK2</option><option>HSK3</option><option>HSK4</option>
              </select>
            </label>
          </div>
        </div>
        <label><span>Mô tả</span><textarea required name="synopsisVi" rows={4} maxLength={2000} /></label>
        <label><span>Câu dẫn trên gian hàng</span><textarea required name="hookVi" rows={2} maxLength={600} /></label>
      </fieldset>

      <fieldset>
        <legend>02 · Bìa riêng</legend>
        <div className={styles.coverEditor}>
          <div className={styles.coverPreview}>
            {coverSrc ? <img src={coverSrc} alt="Xem trước bìa đang nhập" /> : <ImageIcon size={38} />}
          </div>
          <div>
            <label>
              <span>URL bìa nội bộ hoặc HTTPS</span>
              <input
                required
                value={coverSrc}
                onChange={(event) => setCoverSrc(event.target.value)}
                placeholder="/reader/covers/editorial/ten-sach.webp"
              />
            </label>
            <label><span>Mô tả bìa cho screen reader</span><input required name="coverAltVi" maxLength={300} /></label>
            <label>
              <span>Tông khung</span>
              <select name="coverTone" defaultValue="jade">
                <option value="jade">Ngọc</option><option value="ember">Hỏa</option>
                <option value="violet">Tím</option><option value="azure">Lam</option>
                <option value="copper">Đồng</option><option value="indigo">Chàm</option>
                <option value="rose">Hồng</option><option value="slate">Đá</option>
              </select>
            </label>
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>03 · Chương và nội dung căn chỉnh</legend>
        <div className={styles.chapterStack}>{chapters.map((chapter, chapterIndex) => <section className={styles.chapterCard} key={chapterIndex}>
          <header>
            <strong>Chương {chapterIndex + 1}</strong>
            {chapters.length > 1 && <button
              type="button"
              onClick={() => replaceChapters((current) => current.filter((_item, index) => index !== chapterIndex))}
            >
              <Trash2 size={16} /> Xóa
            </button>}
          </header>
          <div className={styles.grid2}>
            <label><span>Tiêu đề Trung</span><input required lang="zh-Hans" value={chapter.titleZh} onChange={(event) => updateChapter(chapterIndex, { titleZh: event.target.value })} /></label>
            <label><span>Tiêu đề Việt</span><input required value={chapter.titleVi} onChange={(event) => updateChapter(chapterIndex, { titleVi: event.target.value })} /></label>
            <label><span>Câu dẫn chương</span><input required value={chapter.hookVi} onChange={(event) => updateChapter(chapterIndex, { hookVi: event.target.value })} /></label>
            <label><span>Phút đọc ước tính</span><input required type="number" min={1} max={60} value={chapter.estimatedMinutes} onChange={(event) => updateChapter(chapterIndex, { estimatedMinutes: Number(event.target.value) })} /></label>
          </div>
          <div className={styles.backgroundOption}>
            <label className={styles.backgroundToggle}>
              <input
                type="checkbox"
                checked={Boolean(chapter.background)}
                onChange={(event) => updateChapter(chapterIndex, {
                  background: event.target.checked ? { src: "", altVi: "", focalPoint: "center" } : undefined,
                })}
              />
              <span>
                <strong>Nền minh họa riêng cho chương</strong>
                <small>Tùy chọn · ảnh sẽ nằm sau một lớp tối để giữ độ tương phản chữ.</small>
              </span>
            </label>
            {chapter.background && <div className={styles.chapterBackgroundEditor}>
              <div className={styles.chapterBackgroundPreview}>
                {chapter.background.src
                  ? <img src={chapter.background.src} alt="Xem trước nền chương đang nhập" />
                  : <ImageIcon size={32} />}
              </div>
              <label>
                <span>URL nền nội bộ hoặc HTTPS</span>
                <input
                  required
                  value={chapter.background.src}
                  onChange={(event) => updateChapter(chapterIndex, {
                    background: { ...chapter.background!, src: event.target.value },
                  })}
                  placeholder="/reader/backgrounds/editorial/ten-sach-c01.webp"
                />
              </label>
              <label>
                <span>Mô tả cảnh cho screen reader</span>
                <input
                  required
                  maxLength={300}
                  value={chapter.background.altVi}
                  onChange={(event) => updateChapter(chapterIndex, {
                    background: { ...chapter.background!, altVi: event.target.value },
                  })}
                />
              </label>
              <label>
                <span>Điểm lấy nét</span>
                <select
                  value={chapter.background.focalPoint}
                  onChange={(event) => updateChapter(chapterIndex, {
                    background: {
                      ...chapter.background!,
                      focalPoint: event.target.value as "left" | "center" | "right",
                    },
                  })}
                >
                  <option value="left">Trái</option><option value="center">Giữa</option><option value="right">Phải</option>
                </select>
              </label>
            </div>}
          </div>
          {chapter.paragraphs.map((paragraph, paragraphIndex) => <div className={styles.paragraph} key={paragraphIndex}>
            <span>Đoạn {paragraphIndex + 1}</span>
            <textarea required lang="zh-Hans" rows={3} value={paragraph.zhHans} onChange={(event) => updateParagraph(chapterIndex, paragraphIndex, "zhHans", event.target.value)} placeholder="Đoạn tiếng Trung giản thể" />
            <textarea required rows={2} value={paragraph.pinyin} onChange={(event) => updateParagraph(chapterIndex, paragraphIndex, "pinyin", event.target.value)} placeholder="Pinyin căn chỉnh" />
            <textarea required rows={2} value={paragraph.vi} onChange={(event) => updateParagraph(chapterIndex, paragraphIndex, "vi", event.target.value)} placeholder="Nghĩa tiếng Việt" />
          </div>)}
          <button className={styles.secondary} type="button" onClick={() => updateChapter(chapterIndex, { paragraphs: [...chapter.paragraphs, blankParagraph()] })}>
            <Plus size={16} /> Thêm đoạn
          </button>
        </section>)}</div>
        <button className={styles.addChapter} type="button" onClick={() => replaceChapters((current) => [...current, blankChapter(current.length + 1)])}>
          <Plus size={18} /> Thêm chương
        </button>
      </fieldset>

      <fieldset>
        <legend>04 · Kiểm tra tra từ</legend>
        <div className={styles.scanPanel}>
          <div className={styles.scanIntro}>
            <span><ScanSearch size={24} /></span>
            <div>
              <strong>Quét toàn bộ chương bằng Tàng Tự Khố</strong>
              <p>Mỗi chữ Hán sẽ là một điểm tra riêng khi đọc. Hệ thống cũng dò từ ghép để biên tập viên biết mục nào còn thiếu trước khi tạo bản nháp.</p>
            </div>
          </div>
          <button className={styles.scanButton} type="button" onClick={scanVocabulary} disabled={scanning}>
            <ScanSearch size={18} /> {scanning ? "Đang quét toàn bộ chương…" : "Quét Tàng Tự Khố"}
          </button>
          <p className={styles.scanNote}>Máy chỉ đối chiếu và phát hiện mục cần xem lại; không tự viết nghĩa rồi coi như đã được biên tập viên duyệt.</p>
          {lexiconScan && <div className={styles.scanResult} role="status">
            <div className={styles.scanMetrics}>
              <span><small>CHỮ TRA ĐƯỢC</small><strong>{lexiconScan.coveredCharacterCount}/{lexiconScan.uniqueCharacterCount}</strong></span>
              <span><small>TỪ GHÉP ĐÃ CÓ</small><strong>{lexiconScan.coveredWordCount}/{lexiconScan.candidateWordCount}</strong></span>
              <span><small>TỔNG CHỮ TRONG TRUYỆN</small><strong>{lexiconScan.characterCount}</strong></span>
            </div>
            {lexiconScan.missingCharacters.length === 0
              ? <p className={`${styles.scanStatus} ${styles.scanStatusOk}`}>
                  <CheckCircle2 size={19} /> Mọi chữ Hán đều có mục tra cứu.
                </p>
              : <div className={`${styles.scanStatus} ${styles.scanStatusWarning}`}>
                  <TriangleAlert size={19} />
                  <div>
                    <strong>Cần bổ sung {lexiconScan.uniqueCharacterCount - lexiconScan.coveredCharacterCount} chữ trước khi phát hành</strong>
                    <p className={styles.scanMissing} lang="zh-Hans">{lexiconScan.missingCharacters.join(" · ")}</p>
                  </div>
                </div>}
            {lexiconScan.unresolvedWords.length > 0 && <details className={styles.scanDetails}>
              <summary>Các từ ghép cần biên tập xem lại ({lexiconScan.candidateWordCount - lexiconScan.coveredWordCount})</summary>
              <p lang="zh-Hans">{lexiconScan.unresolvedWords.join(" · ")}</p>
            </details>}
          </div>}
        </div>
      </fieldset>

      <fieldset>
        <legend>05 · Quyền sử dụng</legend>
        <label><span>Provenance văn bản</span><textarea required name="textProvenanceVi" rows={2} placeholder="Ai viết, nguồn gốc bản thảo, giấy phép nếu có…" /></label>
        <label><span>Provenance bìa</span><textarea required name="coverProvenanceVi" rows={2} placeholder="Ai minh họa/tạo ảnh, nguồn và quyền sử dụng…" /></label>
        <label><span>Provenance nền chương (bắt buộc nếu dùng nền)</span><textarea name="backgroundProvenanceVi" rows={2} placeholder="Ai minh họa/tạo ảnh, công cụ, nguồn tham chiếu và quyền sử dụng…" /></label>
        <label className={styles.attest}>
          <input required type="checkbox" />
          <span>Tôi xác nhận có quyền đưa văn bản, bìa và mọi nền chương đã chọn vào bản phát hành local; nội dung do máy hỗ trợ vẫn phải qua review ngôn ngữ thật.</span>
        </label>
      </fieldset>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {createdRevisionId && <p className={styles.success} role="status">
        Đã tạo draft. <a href={`/studio/items/${encodeURIComponent(createdRevisionId)}`}>Mở revision để kiểm định và gửi duyệt.</a>
      </p>}
      <footer>
        <div>
          <small>TRẠNG THÁI KHI LƯU</small>
          <strong>{lexiconScan ? "Đã quét · draft chưa hiển thị với người học" : "Chưa quét Tàng Tự Khố"}</strong>
        </div>
        <button type="submit" disabled={submitting || scanning || !lexiconScan}>
          <Save size={18} /> {submitting ? "Đang tạo…" : "Tạo bản nháp sách"}
        </button>
      </footer>
    </form>}
  </div>;
}

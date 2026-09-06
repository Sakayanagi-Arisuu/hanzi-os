import {
  editorialBookToChapter,
  editorialBookToSeries,
  parseEditorialReaderBook,
  type EditorialReaderBook,
} from "../reader/editorialReaderContent";
import {
  parsePublishedGradedText,
  publishedGradedTextToChapter,
  publishedGradedTextToSeries,
  type PublishedGradedTextRecord,
} from "../reader/publishedGradedText";
import { studioGradedTextSeriesId } from "../content/gradedTextIdentity";
import type { D1Database } from "./d1";

type PublishedReaderRow = {
  stableKey: string;
  itemType: "lesson" | "graded_text";
  title: string;
  level: string;
  contentSha256: string;
  contentJson: string;
};

const bookFromRow = (row: PublishedReaderRow): EditorialReaderBook | null => {
  try {
    const content = JSON.parse(row.contentJson) as { contentKind?: unknown; readerSeries?: unknown };
    if (content.contentKind !== "reader-series") return null;
    const parsed = parseEditorialReaderBook(content.readerSeries);
    return parsed.ok ? parsed.book : null;
  } catch {
    return null;
  }
};

const gradedTextFromRow = (row: PublishedReaderRow): PublishedGradedTextRecord | null => {
  if (row.itemType !== "graded_text") return null;
  try {
    const parsed = parsePublishedGradedText({
      stableKey: row.stableKey,
      title: row.title,
      level: row.level,
      contentSha256: row.contentSha256,
      content: JSON.parse(row.contentJson),
    });
    return parsed.ok ? parsed.record : null;
  } catch {
    return null;
  }
};

const seriesFromRow = (row: PublishedReaderRow) => {
  const book = bookFromRow(row);
  if (book) return editorialBookToSeries(book);
  const gradedText = gradedTextFromRow(row);
  return gradedText ? publishedGradedTextToSeries(gradedText) : null;
};

const publishedReaderSelect = `SELECT i.stable_key AS stableKey,
       i.item_type AS itemType,
       r.title,
       r.level,
       r.content_sha256 AS contentSha256,
       r.content_json AS contentJson`;

export class EditorialReaderRepository {
  constructor(private readonly database: D1Database) {}

  async listPublishedSeries() {
    const result = await this.database.prepare(
      `${publishedReaderSelect}
         FROM content_items i
         JOIN content_revisions r ON r.item_id = i.id
        WHERE r.workflow_state = 'published'
          AND ((i.item_type = 'lesson' AND i.stable_key LIKE 'reader.series.%')
            OR i.item_type = 'graded_text')
        ORDER BY r.published_at DESC, r.revision DESC, i.stable_key ASC`,
    ).all<PublishedReaderRow>();
    const seen = new Set<string>();
    return (result.results ?? []).flatMap((row) => {
      const series = seriesFromRow(row);
      if (!series || seen.has(series.seriesId)) return [];
      seen.add(series.seriesId);
      return [series];
    });
  }

  async getPublishedBook(seriesId: string) {
    const row = await this.database.prepare(
      `${publishedReaderSelect}
         FROM content_items i
         JOIN content_revisions r ON r.item_id = i.id
        WHERE i.item_type = 'lesson'
          AND i.stable_key = ?
          AND r.workflow_state = 'published'
        ORDER BY r.published_at DESC, r.revision DESC
        LIMIT 1`,
    ).bind(`reader.series.${seriesId}`).first<PublishedReaderRow>();
    return row ? bookFromRow(row) : null;
  }

  private async getPublishedGradedText(seriesId: string) {
    const direct = await this.database.prepare(
      `${publishedReaderSelect}
         FROM content_items i
         JOIN content_revisions r ON r.item_id = i.id
        WHERE i.item_type = 'graded_text'
          AND r.workflow_state = 'published'
          AND json_extract(r.content_json, '$.readerSeriesId') = ?
        ORDER BY r.published_at DESC, r.revision DESC
        LIMIT 1`,
    ).bind(seriesId).first<PublishedReaderRow>();
    const parsedDirect = direct ? gradedTextFromRow(direct) : null;
    if (parsedDirect && studioGradedTextSeriesId(parsedDirect.stableKey) === seriesId) return parsedDirect;

    // Compatibility path for revisions published before readerSeriesId existed.
    const legacy = await this.database.prepare(
      `${publishedReaderSelect}
         FROM content_items i
         JOIN content_revisions r ON r.item_id = i.id
        WHERE i.item_type = 'graded_text'
          AND r.workflow_state = 'published'
          AND json_extract(r.content_json, '$.readerSeriesId') IS NULL
        ORDER BY r.published_at DESC, r.revision DESC`,
    ).all<PublishedReaderRow>();
    return (legacy.results ?? [])
      .map(gradedTextFromRow)
      .find((record): record is PublishedGradedTextRecord => Boolean(
        record && studioGradedTextSeriesId(record.stableKey) === seriesId,
      )) ?? null;
  }

  async getPublishedChapter(seriesId: string, chapterId: string) {
    const book = await this.getPublishedBook(seriesId);
    if (book) return editorialBookToChapter(book, chapterId);
    const gradedText = await this.getPublishedGradedText(seriesId);
    return gradedText ? publishedGradedTextToChapter(gradedText, chapterId) : null;
  }
}

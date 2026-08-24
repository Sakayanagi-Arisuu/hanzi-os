import {
  editorialBookToChapter,
  editorialBookToSeries,
  parseEditorialReaderBook,
  type EditorialReaderBook,
} from "../reader/editorialReaderContent";
import type { D1Database } from "./d1";

type PublishedReaderRow = {
  stableKey: string;
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

export class EditorialReaderRepository {
  constructor(private readonly database: D1Database) {}

  async listPublishedSeries() {
    const result = await this.database.prepare(
      `SELECT i.stable_key AS stableKey, r.content_json AS contentJson
         FROM content_items i
         JOIN content_revisions r ON r.item_id = i.id
        WHERE i.item_type = 'lesson'
          AND i.stable_key LIKE 'reader.series.%'
          AND r.workflow_state = 'published'
        ORDER BY r.published_at DESC, i.stable_key ASC`,
    ).all<PublishedReaderRow>();
    return (result.results ?? [])
      .map(bookFromRow)
      .filter((book): book is EditorialReaderBook => Boolean(book))
      .map(editorialBookToSeries);
  }

  async getPublishedBook(seriesId: string) {
    const row = await this.database.prepare(
      `SELECT i.stable_key AS stableKey, r.content_json AS contentJson
         FROM content_items i
         JOIN content_revisions r ON r.item_id = i.id
        WHERE i.item_type = 'lesson'
          AND i.stable_key = ?
          AND r.workflow_state = 'published'
        LIMIT 1`,
    ).bind(`reader.series.${seriesId}`).first<PublishedReaderRow>();
    return row ? bookFromRow(row) : null;
  }

  async getPublishedChapter(seriesId: string, chapterId: string) {
    const book = await this.getPublishedBook(seriesId);
    return book ? editorialBookToChapter(book, chapterId) : null;
  }
}

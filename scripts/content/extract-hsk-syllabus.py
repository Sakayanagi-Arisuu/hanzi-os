#!/usr/bin/env python3
"""Extract a bounded HSK1-4 index from the pinned official CTI syllabus PDF."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any

try:
    import pdfplumber
    from pypdf import PdfReader
except ImportError as error:  # pragma: no cover - environment diagnostic
    raise SystemExit(
        "HSK extraction requires pypdf and pdfplumber. "
        "Use the Codex workspace Python runtime or install those packages."
    ) from error


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE = ROOT / "tmp" / "pdfs" / "hsk-syllabus-2026.pdf"
DEFAULT_DESCRIPTOR = (
    ROOT / "content" / "sources" / "hsk-syllabus-2026" / "source.json"
)
DEFAULT_OUTPUT = (
    ROOT / "content" / "sources" / "hsk-syllabus-2026" / "inventory.json"
)

LEVELS = (1, 2, 3, 4)
CHINESE_NUMERALS = set("\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341")
WATERMARK = "\u6c49\u8003\u56fd\u9645"
WATERMARK_LINES = {
    "\u6c49",
    "\u8003",
    "\u56fd",
    "\u9645",
    "\u56fd\u9645",
    WATERMARK,
}
# pdfplumber can merge one glyph from the vertical 汉考国际 watermark into a
# neighboring table label. These exact source-specific corrections were
# visually checked against PDF pages 64, 65, 386 and 394. Keep the allowlist
# narrow so legitimate labels such as 国粹 remain untouched.
WATERMARK_PREFIX_CORRECTIONS = {
    "\u56fd\u5b66\u4e60\u60c5\u51b5": "\u5b66\u4e60\u60c5\u51b5",
    "\u56fd\u81ea\u7136\u4e0e\u73af\u5883": "\u81ea\u7136\u4e0e\u73af\u5883",
    "\u56fd\u98ce\u4fd7\u4f20\u7edf": "\u98ce\u4fd7\u4f20\u7edf",
    "\u8003\u52a8\u8bcd": "\u52a8\u8bcd",
    "\u9645\u201c\u628a\u201d\u5b57\u53e51": "\u201c\u628a\u201d\u5b57\u53e51",
}
TASK_BULLET = "\uf0d8"
IDEOGRAPHIC_COMMA = "\u3001"


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return f"sha256:{digest.hexdigest()}"


def level_ranges(descriptor: dict[str, Any], section: str) -> dict[int, tuple[int, int]]:
    return {
        level: tuple(descriptor["pdfPageRanges"][section][str(level)])
        for level in LEVELS
    }


def clean_page_line(value: str) -> str:
    line = value.strip()
    if line == WATERMARK or re.fullmatch(r"\d+", line):
        return ""
    return line


def clean_table_cell(value: str | None) -> str | None:
    if not value:
        return None
    lines = [
        line.strip()
        for line in value.splitlines()
        if line.strip() and line.strip() not in WATERMARK_LINES
    ]
    cleaned = " / ".join(lines) or None
    return WATERMARK_PREFIX_CORRECTIONS.get(cleaned, cleaned)


def parse_vocabulary(
    reader: PdfReader,
    ranges: dict[int, tuple[int, int]],
) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    seen_pages: set[int] = set()
    for first_page, last_page in ranges.values():
        for page_number in range(first_page, last_page + 1):
            if page_number in seen_pages:
                continue
            seen_pages.add(page_number)
            text = reader.pages[page_number - 1].extract_text() or ""
            for raw_line in text.splitlines():
                match = re.match(
                    r"^\s*(\d+)\s+([1-4]\S*)\s+(\S+)\s+(.+?)\s*$",
                    raw_line,
                )
                if not match:
                    continue
                sequence = int(match.group(1))
                level_marker = match.group(2)
                level = int(level_marker[0])
                display_word = match.group(3)
                remainder = match.group(4).strip()
                split = remainder.rsplit(maxsplit=1)
                if len(split) == 2 and re.search(r"[\u3400-\u9fff]", split[1]):
                    pinyin, part_of_speech = split
                else:
                    pinyin, part_of_speech = remainder, None
                cross_references: list[int | str] = []
                for token in re.findall(r"7-9|[1-6]", level_marker[1:]):
                    value: int | str = token if token == "7-9" else int(token)
                    if value not in cross_references:
                        cross_references.append(value)
                entries.append(
                    {
                        "id": f"hsk-vocab-{sequence:05d}",
                        "sequence": sequence,
                        "level": level,
                        "crossReferencedLevels": cross_references,
                        "word": re.sub(r"(?<=[^\d])[1-9]$", "", display_word),
                        "displayWord": display_word,
                        "pinyin": pinyin,
                        "partOfSpeech": part_of_speech,
                        "sourcePage": page_number,
                    }
                )
    return sorted(entries, key=lambda item: item["sequence"])


def parse_tasks(
    reader: PdfReader,
    ranges: dict[int, tuple[int, int]],
) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for level, (first_page, last_page) in ranges.items():
        current: dict[str, Any] | None = None
        for page_number in range(first_page, last_page + 1):
            text = reader.pages[page_number - 1].extract_text() or ""
            for raw_line in text.splitlines():
                line = clean_page_line(raw_line)
                if not line or line.startswith("HSK"):
                    continue
                title_parts = line.split(IDEOGRAPHIC_COMMA, 1)
                if (
                    len(title_parts) == 2
                    and title_parts[0]
                    and len(title_parts[0]) <= 5
                    and set(title_parts[0]) <= CHINESE_NUMERALS
                ):
                    ordinal = len(
                        [item for item in entries if item["level"] == level]
                    ) + 1
                    current = {
                        "id": f"hsk{level}-task-{ordinal:02d}",
                        "level": level,
                        "ordinal": ordinal,
                        "title": title_parts[1],
                        "bulletCount": 0,
                        "sourcePage": page_number,
                    }
                    entries.append(current)
                elif line.startswith(TASK_BULLET) and current:
                    current["bulletCount"] += 1
    return entries


def parse_topics(
    pdf: pdfplumber.PDF,
    ranges: dict[int, tuple[int, int]],
) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for level, (first_page, last_page) in ranges.items():
        current_domain: str | None = None
        current_group: str | None = None
        ordinal = 0
        for page_number in range(first_page, last_page + 1):
            if page_number == first_page:
                lines = [
                    clean_page_line(line)
                    for line in (pdf.pages[page_number - 1].extract_text() or "").splitlines()
                ]
                for index, line in enumerate(lines):
                    if "\u4e00\u7ea7\u8bdd\u9898" in line and index + 1 < len(lines):
                        current_domain = next(
                            (
                                candidate
                                for candidate in lines[index + 1 :]
                                if candidate
                            ),
                            current_domain,
                        )
                        break
            for table in pdf.pages[page_number - 1].extract_tables():
                for raw_row in table[1:]:
                    cells = [clean_table_cell(cell) for cell in raw_row]
                    if len(cells) < 3 or not cells[2]:
                        continue
                    if re.fullmatch(r"\d+\s*\u4e2a", cells[2]):
                        continue
                    if cells[0]:
                        current_domain = cells[0]
                        current_group = None
                    if cells[1]:
                        current_group = cells[1]
                    ordinal += 1
                    entries.append(
                        {
                            "id": f"hsk{level}-topic-{ordinal:03d}",
                            "level": level,
                            "ordinal": ordinal,
                            "domain": current_domain,
                            "group": current_group,
                            "topic": cells[2],
                            "sourcePage": page_number,
                        }
                    )
    return entries


def parse_recognition_characters(
    reader: PdfReader,
    ranges: dict[int, tuple[int, int]],
) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for level, (first_page, last_page) in ranges.items():
        for page_number in range(first_page, last_page + 1):
            text = reader.pages[page_number - 1].extract_text() or ""
            for line in text.splitlines():
                match = re.match(r"^\s*(\d+)\.\s*(\S)\s*$", line)
                if not match:
                    continue
                sequence = int(match.group(1))
                entries.append(
                    {
                        "id": f"hsk{level}-character-{sequence:03d}",
                        "level": level,
                        "sequence": sequence,
                        "character": match.group(2),
                        "sourcePage": page_number,
                    }
                )
    return entries


def parse_grammar_rows(
    pdf: pdfplumber.PDF,
    ranges: dict[int, tuple[int, int]],
) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for level, (first_page, last_page) in ranges.items():
        current_category: str | None = None
        current_name: str | None = None
        current_detail: str | None = None
        ordinal = 0
        for page_number in range(first_page, last_page + 1):
            for table in pdf.pages[page_number - 1].extract_tables():
                for raw_row in table[1:]:
                    cells = [clean_table_cell(cell) for cell in raw_row]
                    if len(cells) < 4 or not cells[3]:
                        continue
                    if cells[0]:
                        current_category = cells[0]
                        current_name = None
                        current_detail = None
                    if cells[1]:
                        current_name = cells[1]
                        current_detail = None
                    if cells[2]:
                        current_detail = cells[2]
                    ordinal += 1
                    entries.append(
                        {
                            "id": f"hsk{level}-grammar-row-{ordinal:03d}",
                            "level": level,
                            "ordinal": ordinal,
                            "category": current_category,
                            "categoryName": current_name,
                            "detail": current_detail,
                            "content": cells[3],
                            "sourcePage": page_number,
                        }
                    )
    return entries


def count_by_level(entries: list[dict[str, Any]]) -> dict[str, int]:
    return {
        str(level): len([item for item in entries if item["level"] == level])
        for level in LEVELS
    }


def require_expected_counts(
    descriptor: dict[str, Any],
    section: str,
    entries: list[dict[str, Any]],
) -> None:
    actual = count_by_level(entries)
    expected = descriptor["expectedCounts"][section]
    if actual != expected:
        raise ValueError(
            f"{section} count drift: expected {expected}, extracted {actual}"
        )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--descriptor", type=Path, default=DEFAULT_DESCRIPTOR)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    descriptor = read_json(args.descriptor)
    actual_digest = sha256(args.source)
    if actual_digest != descriptor["pdfSha256"]:
        raise ValueError(
            f"HSK syllabus PDF hash mismatch: expected "
            f"{descriptor['pdfSha256']}, received {actual_digest}"
        )

    reader = PdfReader(str(args.source))
    if len(reader.pages) != descriptor["pdfPages"]:
        raise ValueError(
            f"HSK syllabus page-count drift: expected "
            f"{descriptor['pdfPages']}, received {len(reader.pages)}"
        )

    with pdfplumber.open(args.source) as pdf:
        tasks = parse_tasks(reader, level_ranges(descriptor, "tasks"))
        topics = parse_topics(pdf, level_ranges(descriptor, "topics"))
        vocabulary = parse_vocabulary(
            reader,
            level_ranges(descriptor, "vocabulary"),
        )
        characters = parse_recognition_characters(
            reader,
            level_ranges(descriptor, "recognitionCharacters"),
        )
        grammar_rows = parse_grammar_rows(
            pdf,
            level_ranges(descriptor, "grammar"),
        )

    require_expected_counts(descriptor, "tasks", tasks)
    require_expected_counts(descriptor, "topics", topics)
    require_expected_counts(descriptor, "vocabulary", vocabulary)
    require_expected_counts(
        descriptor,
        "recognitionCharacters",
        characters,
    )
    require_expected_counts(descriptor, "grammarRows", grammar_rows)
    if [item["sequence"] for item in vocabulary] != list(range(1, 2001)):
        raise ValueError("HSK1-4 vocabulary sequence is not exactly 1..2000")

    inventory = {
        "schemaVersion": 1,
        "sourceId": descriptor["sourceId"],
        "sourcePdfSha256": descriptor["pdfSha256"],
        "sourcePublished": descriptor["published"],
        "sourceEffective": descriptor["effective"],
        "counts": {
            "tasks": count_by_level(tasks),
            "topics": count_by_level(topics),
            "vocabulary": count_by_level(vocabulary),
            "recognitionCharacters": count_by_level(characters),
            "grammarRows": count_by_level(grammar_rows),
        },
        "tasks": tasks,
        "topics": topics,
        "vocabulary": vocabulary,
        "recognitionCharacters": characters,
        "grammarRows": grammar_rows,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(
            inventory,
            ensure_ascii=False,
            separators=(",", ":"),
        )
        + "\n",
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "output": str(args.output),
                "counts": inventory["counts"],
                "sourcePdfSha256": actual_digest,
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
